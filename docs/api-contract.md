# VulnTrack: REST API Contract Specification

**Specification Version:** 1.0.0  
**Base URL:** `/api`  
**Content-Type:** `application/json`  
**Authentication Scheme:** Signed HTTP-only Cookie (`Cookie: vulntrack_sid=...`)  
**Status:** Agreed Baseline Contract  

---

## 1. Global API Standards & Conventions

### 1.1 Envelope Formats
Every response from the VulnTrack API is wrapped in a standard JSON envelope to guarantee predictable parsing for the frontend.

#### Success Envelope (HTTP 200, 201)
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully.",
  "timestamp": "2026-10-29T16:00:00.000Z"
}
```

#### Error Envelope (HTTP 400, 401, 403, 404, 409, 422, 500)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request payload failed validation.",
    "details": [
      {
        "field": "due_date",
        "message": "due_date must be an ISO8601 date string formatted as YYYY-MM-DD"
      }
    ]
  },
  "timestamp": "2026-10-29T16:00:00.000Z"
}
```

### 1.2 Standard HTTP Status Codes

| Code | Meaning | When Used |
| :--- | :--- | :--- |
| `200 OK` | Request succeeded | Standard read or successful update response |
| `201 Created` | Resource created | Successful `POST` resulting in a new entity |
| `204 No Content`| Resource deleted | Successful `DELETE` operation |
| `400 Bad Request`| Client error | Malformed JSON or invalid parameter format |
| `401 Unauthorized`| Authentication required | Missing, expired, or invalid session cookie |
| `403 Forbidden` | Access denied | User authenticated, but role lacks permission |
| `404 Not Found` | Resource missing | Requested entity ID does not exist |
| `409 Conflict` | Constraint violation | Unique duplicate (e.g., duplicate username, email, CVE ID) |
| `422 Unprocessable`| Business rule failure | Invalid state transition or foreign key constraint violation |
| `500 Server Error`| Internal failure | Unhandled backend exception or database downtime |

### 1.3 Role Hierarchy & Permissions

| Role | Description & Typical Permissions |
| :--- | :--- |
| `admin` | Full control: user management, asset deletion, system configuration, risk acceptance override. |
| `analyst` | Security analyst: create/edit assets, catalog entries, findings, verify fixes (`UNDER_REVIEW` -> `CLOSED`), mark `FALSE_POSITIVE`. |
| `developer` | Remediator: view assigned findings, transition `OPEN` -> `IN_PROGRESS`, submit fix `IN_PROGRESS` -> `UNDER_REVIEW`, post comments. |

---

## 2. Authentication Endpoints

### 2.1 Login
- **Method & Route:** `POST /api/auth/login`
- **Required Role:** Public
- **Description:** Verifies username/email and password; initializes an authenticated session.
- **Request Body:**
  ```json
  {
    "usernameOrEmail": "analyst1",
    "password": "Password123!"
  }
  ```
  - `usernameOrEmail`: `string`, required, non-empty, max 100 chars.
  - `password`: `string`, required, min 8 chars.
- **Response `200 OK`:**
  - Header: `Set-Cookie: vulntrack_sid=...; HttpOnly; SameSite=Lax; Path=/`
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": 2,
        "username": "analyst1",
        "email": "analyst1@corp.local",
        "fullName": "Alice Analyst",
        "role": "analyst"
      }
    },
    "message": "Login successful.",
    "timestamp": "2026-10-29T16:00:00.000Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `{"error": {"code": "VALIDATION_ERROR", "message": "usernameOrEmail and password are required."}}`
  - `401 Unauthorized`: `{"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid username or password."}}`

---

### 2.2 Get Current Authenticated User
- **Method & Route:** `GET /api/auth/me`
- **Required Role:** Authenticated (`admin`, `analyst`, `developer`)
- **Description:** Returns the active session user identity on page load/app bootstrap.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": 2,
        "username": "analyst1",
        "email": "analyst1@corp.local",
        "fullName": "Alice Analyst",
        "role": "analyst"
      }
    },
    "timestamp": "2026-10-29T16:00:00.000Z"
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: `{"error": {"code": "UNAUTHENTICATED", "message": "No active session found."}}`

---

### 2.3 Logout
- **Method & Route:** `POST /api/auth/logout`
- **Required Role:** Authenticated
- **Description:** Destroys server-side session in MySQL and instructs browser to clear cookie.
- **Response `200 OK`:**
  - Header: `Set-Cookie: vulntrack_sid=; Max-Age=0; Path=/`
  ```json
  {
    "success": true,
    "data": null,
    "message": "Logged out successfully.",
    "timestamp": "2026-10-29T16:00:00.000Z"
  }
  ```

---

## 3. Users Endpoints

### 3.1 List Users
- **Method & Route:** `GET /api/users`
- **Required Role:** Authenticated
- **Query Parameters:**
  - `role`: (Optional) Filter by `'admin'`, `'analyst'`, `'developer'`.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "username": "admin",
        "email": "admin@corp.local",
        "fullName": "System Administrator",
        "role": "admin",
        "isActive": true
      },
      {
        "id": 3,
        "username": "dev_bob",
        "email": "bob@corp.local",
        "fullName": "Bob Builder",
        "role": "developer",
        "isActive": true
      }
    ],
    "timestamp": "2026-10-29T16:00:00.000Z"
  }
  ```

---

### 3.2 Create User (Admin Only)
- **Method & Route:** `POST /api/users`
- **Required Role:** `admin`
- **Request Body:**
  ```json
  {
    "username": "charlie_analyst",
    "email": "charlie@corp.local",
    "password": "Password123!",
    "fullName": "Charlie Security",
    "role": "analyst"
  }
  ```
  - `username`: `string`, 3-50 chars, regex `^[a-zA-Z0-9_-]+$`.
  - `email`: `string`, valid email format.
  - `password`: `string`, min 8 characters.
  - `fullName`: `string`, 2-100 characters.
  - `role`: `enum` (`admin`, `analyst`, `developer`).
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": { "id": 4, "username": "charlie_analyst", "email": "charlie@corp.local", "role": "analyst" },
    "message": "User created successfully."
  }
  ```
- **Error Responses:**
  - `409 Conflict`: `{"error": {"code": "DUPLICATE_USER", "message": "Username or email already in use."}}`

---

## 4. Assets Endpoints

### 4.1 List Assets
- **Method & Route:** `GET /api/assets`
- **Required Role:** Authenticated
- **Query Parameters:**
  - `environment`: `enum` (`PRODUCTION`, `STAGING`, `DEVELOPMENT`).
  - `criticality`: `enum` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  - `search`: `string` (Matches against name, hostname, or IP address).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "name": "Production Database Primary",
        "assetType": "DATABASE",
        "ipAddress": "10.0.1.20",
        "hostname": "db-prod-01.corp.internal",
        "environment": "PRODUCTION",
        "criticality": "CRITICAL",
        "ownerTeam": "Data Platform",
        "activeFindingsCount": 3,
        "createdAt": "2026-10-15T09:00:00.000Z"
      }
    ],
    "timestamp": "2026-10-29T16:00:00.000Z"
  }
  ```

---

### 4.2 Get Asset by ID
- **Method & Route:** `GET /api/assets/:id`
- **Required Role:** Authenticated
- **Response `200 OK`:** Returns full asset object including list of linked active findings.
- **Error Responses:**
  - `404 Not Found`: Asset not found.

---

### 4.3 Create Asset
- **Method & Route:** `POST /api/assets`
- **Required Role:** `admin`, `analyst`
- **Request Body:**
  ```json
  {
    "name": "Payment Gateway API Server",
    "assetType": "SERVER",
    "ipAddress": "10.0.2.14",
    "hostname": "api-gateway-01.corp.internal",
    "environment": "PRODUCTION",
    "criticality": "CRITICAL",
    "ownerTeam": "Core Payments"
  }
  ```
  - `name`: `string`, required, 2-100 chars.
  - `assetType`: `enum` (`SERVER`, `WEB_APP`, `DATABASE`, `NETWORK`, `CLOUD_RESOURCE`), required.
  - `ipAddress`: `string`, valid IPv4/IPv6 format or null.
  - `hostname`: `string`, valid hostname or null.
  - `environment`: `enum` (`PRODUCTION`, `STAGING`, `DEVELOPMENT`), required.
  - `criticality`: `enum` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), required.
  - `ownerTeam`: `string`, required, 2-100 chars.
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": { "id": 2, "name": "Payment Gateway API Server" },
    "message": "Asset created successfully."
  }
  ```

---

### 4.4 Update Asset
- **Method & Route:** `PUT /api/assets/:id`
- **Required Role:** `admin`, `analyst`
- **Request Body:** Same schema as `POST /api/assets`.
- **Response `200 OK`:** Updated asset record.

---

### 4.5 Delete Asset
- **Method & Route:** `DELETE /api/assets/:id`
- **Required Role:** `admin`
- **Response `200 OK` or `204 No Content`**
- **Error Responses:**
  - `422 Unprocessable Entity`: Asset has associated findings (`ON DELETE RESTRICT` violated). Cannot delete until findings are re-assigned or removed.

---

## 5. Vulnerability Catalog Endpoints

### 5.1 List Catalog Definitions
- **Method & Route:** `GET /api/catalog`
- **Required Role:** Authenticated
- **Query Parameters:**
  - `severity`: `enum` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`).
  - `search`: `string` (Searches CVE ID, CWE ID, or title).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "cveId": "CVE-2021-44228",
        "cweId": "CWE-502",
        "title": "Apache Log4j2 JNDI Remote Code Execution (Log4Shell)",
        "description": "Apache Log4j2 versions 2.0-beta9 through 2.15.0 JNDI features do not protect against attacker controlled LDAP.",
        "defaultSeverity": "CRITICAL",
        "cvssBaseScore": 10.0,
        "remediationGuidance": "Upgrade log4j-core to version 2.17.1 or higher."
      }
    ],
    "timestamp": "2026-10-29T16:00:00.000Z"
  }
  ```

---

### 5.2 Create Catalog Definition
- **Method & Route:** `POST /api/catalog`
- **Required Role:** `admin`, `analyst`
- **Request Body:**
  ```json
  {
    "cveId": "CVE-2023-38606",
    "cweId": "CWE-287",
    "title": "Kernel Memory Corruption",
    "description": "Improper state validation allows local users to modify sensitive kernel state.",
    "defaultSeverity": "HIGH",
    "cvssBaseScore": 7.8,
    "remediationGuidance": "Apply security patch KB5029244."
  }
  ```
  - `cveId`: `string`, optional, format `CVE-YYYY-NNNNN`.
  - `cweId`: `string`, optional, format `CWE-NNN`.
  - `title`: `string`, required, 5-200 chars.
  - `description`: `string`, required.
  - `defaultSeverity`: `enum` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`), required.
  - `cvssBaseScore`: `number`, required, between `0.0` and `10.0`.
  - `remediationGuidance`: `string`, optional.
- **Response `201 Created`**

---

### 5.3 Update Catalog Definition
- **Method & Route:** `PUT /api/catalog/:id`
- **Required Role:** `admin`, `analyst`
- **Request Body:** Same schema as `POST /api/catalog`.
- **Response `200 OK`**

---

### 5.4 Delete Catalog Definition
- **Method & Route:** `DELETE /api/catalog/:id`
- **Required Role:** `admin`
- **Error Responses:**
  - `422 Unprocessable Entity`: Catalog item is referenced by existing findings.

---

## 6. Findings Endpoints

### 6.1 List Findings (With Filtering)
- **Method & Route:** `GET /api/findings`
- **Required Role:** Authenticated
- **Query Parameters:**
  - `status`: `enum` (`OPEN`, `IN_PROGRESS`, `UNDER_REVIEW`, `CLOSED`, `FALSE_POSITIVE`, `RISK_ACCEPTED`, `REOPENED`).
  - `severity`: `enum` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`).
  - `assetId`: `number`
  - `assigneeId`: `number`
  - `isOverdue`: `boolean` (`true` or `false`)
  - `search`: `string` (Searches finding title, asset name, or CVE ID)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 101,
        "title": "Log4Shell in Authentication Microservice",
        "severity": "CRITICAL",
        "status": "OPEN",
        "discoveredDate": "2026-10-20",
        "dueDate": "2026-10-27",
        "isOverdue": true,
        "daysOverdue": 2,
        "asset": {
          "id": 1,
          "name": "Production Database Primary",
          "environment": "PRODUCTION",
          "criticality": "CRITICAL"
        },
        "catalog": {
          "id": 1,
          "cveId": "CVE-2021-44228",
          "cweId": "CWE-502"
        },
        "reporter": {
          "id": 2,
          "fullName": "Alice Analyst"
        },
        "assignee": {
          "id": 3,
          "fullName": "Bob Builder"
        }
      }
    ],
    "timestamp": "2026-10-29T16:00:00.000Z"
  }
  ```

---

### 6.2 Get Finding by ID
- **Method & Route:** `GET /api/findings/:id`
- **Required Role:** Authenticated
- **Response `200 OK`:** Full finding details including asset details, catalog details, recent comments, and audit history.

---

### 6.3 Create Finding
- **Method & Route:** `POST /api/findings`
- **Required Role:** `admin`, `analyst`
- **Request Body:**
  ```json
  {
    "assetId": 1,
    "catalogId": 1,
    "title": "Log4Shell detected on port 8080 auth service",
    "description": "Vulnerable library log4j-core-2.14.1.jar detected in classpath.",
    "severity": "CRITICAL",
    "dueDate": "2026-11-05",
    "assigneeId": 3,
    "remediationNotes": "Plan maintenance window to deploy patch."
  }
  ```
  - `assetId`: `number`, required, must reference valid `assets.id`.
  - `catalogId`: `number`, required, must reference valid `vulnerability_catalog.id`.
  - `title`: `string`, required, 5-200 chars.
  - `description`: `string`, optional.
  - `severity`: `enum` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`), required.
  - `dueDate`: `string`, required, format `YYYY-MM-DD`.
  - `assigneeId`: `number`, optional, must reference valid `users.id`.
  - `remediationNotes`: `string`, optional.
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": { "id": 102, "status": "OPEN", "title": "Log4Shell detected on port 8080 auth service" },
    "message": "Finding created successfully."
  }
  ```

---

### 6.4 Update Finding Attributes
- **Method & Route:** `PUT /api/findings/:id`
- **Required Role:** `admin`, `analyst`, or the assigned `developer`
- **Description:** Updates non-status attributes (e.g., due date, assignee, remediation notes).
- **Request Body:**
  ```json
  {
    "title": "Updated Finding Title",
    "description": "Updated discovery details",
    "severity": "HIGH",
    "dueDate": "2026-11-10",
    "assigneeId": 3,
    "remediationNotes": "Upgraded dependency in staging."
  }
  ```
- **Response `200 OK`**

---

### 6.5 Transition Finding Status (Remediation State Machine)
- **Method & Route:** `PATCH /api/findings/:id/status`
- **Required Role:** Enforced conditionally based on transition:
  - `OPEN -> IN_PROGRESS`: Any authenticated (`admin`, `analyst`, `developer`)
  - `IN_PROGRESS -> UNDER_REVIEW`: Any authenticated (`developer`, `analyst`, `admin`)
  - `UNDER_REVIEW -> CLOSED`: `admin`, `analyst` only (Verification step)
  - `UNDER_REVIEW -> IN_PROGRESS`: `admin`, `analyst` only (Rejection of fix)
  - `* -> FALSE_POSITIVE`: `admin`, `analyst` only
  - `* -> RISK_ACCEPTED`: `admin` only
  - `CLOSED -> REOPENED`: `admin`, `analyst` only
- **Request Body:**
  ```json
  {
    "newStatus": "UNDER_REVIEW",
    "reason": "Applied log4j 2.17.1 patch and verified clean container build."
  }
  ```
  - `newStatus`: `enum`, required.
  - `reason`: `string`, required (minimum 10 characters for auditability).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": 101,
      "oldStatus": "IN_PROGRESS",
      "newStatus": "UNDER_REVIEW",
      "updatedAt": "2026-10-29T16:15:00.000Z"
    },
    "message": "Status transitioned successfully."
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: `{"error": {"code": "FORBIDDEN", "message": "Only Analysts or Admins can mark findings as CLOSED or FALSE_POSITIVE."}}`
  - `422 Unprocessable Entity`: `{"error": {"code": "INVALID_STATE_TRANSITION", "message": "Cannot transition finding from OPEN directly to CLOSED."}}`

---

### 6.6 Delete Finding
- **Method & Route:** `DELETE /api/findings/:id`
- **Required Role:** `admin` only
- **Response `200 OK` or `204 No Content`**

---

## 7. Comments & Audit Endpoints

### 7.1 List Comments on Finding
- **Method & Route:** `GET /api/findings/:id/comments`
- **Required Role:** Authenticated
- **Response `200 OK`:** Returns list of comments ordered chronologically ascending.

### 7.2 Post Comment to Finding
- **Method & Route:** `POST /api/findings/:id/comments`
- **Required Role:** Authenticated
- **Request Body:**
  ```json
  {
    "commentText": "Patch deployed to staging server; ready for verification."
  }
  ```
- **Response `201 Created`**

### 7.3 Get Finding Audit Log History
- **Method & Route:** `GET /api/findings/:id/history`
- **Required Role:** Authenticated
- **Response `200 OK`:** Returns chronological list of state transitions, who executed them, timestamps, and provided reasons.

---

## 8. Dashboard & Analytics Endpoints

### 8.1 Summary KPI Statistics
- **Method & Route:** `GET /api/dashboard/stats`
- **Required Role:** Authenticated
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "totalActive": 24,
      "criticalCount": 5,
      "highCount": 8,
      "overdueCount": 3,
      "mttrDays": 6.4,
      "totalClosed": 42
    },
    "timestamp": "2026-10-29T16:00:00.000Z"
  }
  ```

---

### 8.2 Breakdown by Severity
- **Method & Route:** `GET /api/dashboard/by-severity`
- **Required Role:** Authenticated
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      { "severity": "CRITICAL", "count": 5 },
      { "severity": "HIGH", "count": 8 },
      { "severity": "MEDIUM", "count": 7 },
      { "severity": "LOW", "count": 4 },
      { "severity": "INFO", "count": 0 }
    ],
    "timestamp": "2026-10-29T16:00:00.000Z"
  }
  ```

---

### 8.3 Breakdown by Status
- **Method & Route:** `GET /api/dashboard/by-status`
- **Required Role:** Authenticated
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      { "status": "OPEN", "count": 10 },
      { "status": "IN_PROGRESS", "count": 8 },
      { "status": "UNDER_REVIEW", "count": 6 },
      { "status": "CLOSED", "count": 42 },
      { "status": "FALSE_POSITIVE", "count": 3 },
      { "status": "RISK_ACCEPTED", "count": 2 },
      { "status": "REOPENED", "count": 1 }
    ],
    "timestamp": "2026-10-29T16:00:00.000Z"
  }
  ```

---

### 8.4 Top Vulnerable Assets
- **Method & Route:** `GET /api/dashboard/top-assets`
- **Required Role:** Authenticated
- **Query Parameters:**
  - `limit`: `number` (Default: 5, Max: 20)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "assetId": 1,
        "assetName": "Production Database Primary",
        "environment": "PRODUCTION",
        "criticality": "CRITICAL",
        "openFindingsCount": 6,
        "criticalFindingsCount": 2
      }
    ],
    "timestamp": "2026-10-29T16:00:00.000Z"
  }
  ```

---

### 8.5 Overdue SLA Breached Findings
- **Method & Route:** `GET /api/dashboard/overdue`
- **Required Role:** Authenticated
- **Response `200 OK`:** Returns list of active findings whose `dueDate < CURDATE()`.
