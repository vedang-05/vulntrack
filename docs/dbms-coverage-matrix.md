# VulnTrack: DBMS Syllabus Coverage Matrix & Viva Preparation Guide

**Academic Context:** University Database Management Systems (DBMS) Laboratory & Course Project  
**Target Audience:** Evaluators, Examiners, and Student Developers (Student A & Student B)  
**System:** VulnTrack (Relational Vulnerability Tracking & Remediation System)  

---

## 1. Syllabus Topic Mapping: Implementation vs. Theory

The table below delineates which DBMS syllabus topics are implemented natively in the VulnTrack codebase versus topics prepared for theoretical evaluation and viva voce defense.

| Syllabus Area | Topic / Concept | Coverage Category | Codebase Artifact / Implementation Location | Viva Discussion Focus |
| :--- | :--- | :--- | :--- | :--- |
| **1. Data Modeling** | Entity-Relationship (ER) Modeling | **Real Implementation** | `docs/database-design.md#L10-L75` | Identifying entities, cardinalities ($1:N$, $M:N$), weak vs strong entities. |
| **1. Data Modeling** | Relational Mapping & Schema Design | **Real Implementation** | `backend/sql/schema.sql` (Tables: `users`, `assets`, `findings`, etc.) | Surrogate vs Natural keys; Foreign key relationships. |
| **2. Integrity** | Entity Integrity (Primary Keys) | **Real Implementation** | `id INT AUTO_INCREMENT PRIMARY KEY` across all tables | Auto-increment mechanics, surrogate key trade-offs. |
| **2. Integrity** | Referential Integrity & Cascades | **Real Implementation** | `FOREIGN KEY ... ON DELETE RESTRICT` / `CASCADE` / `SET NULL` | Preventing orphaned records; explaining why `RESTRICT` protects historic CVE audits. |
| **2. Integrity** | Domain & Check Constraints | **Real Implementation** | `CHECK (cvss_base_score BETWEEN 0.0 AND 10.0)`, `ENUM` for severity/status | Server-side validation vs DBMS domain enforcement. |
| **3. Normalization** | 1NF, 2NF, 3NF, BCNF | **Real Implementation & Theory** | Separation of `vulnerability_catalog` from `findings` | Proving absence of transitive and partial dependencies; update/delete anomalies. |
| **4. Core SQL** | DDL (Data Definition Language) | **Real Implementation** | `CREATE TABLE`, `ALTER TABLE`, `DROP VIEW`, `INDEX` statements | Schema definition, constraint modifications. |
| **4. Core SQL** | DML (Data Manipulation Language)| **Real Implementation** | `INSERT`, `UPDATE`, `DELETE` via `mysql2/promise` in Express controllers | Safe parameter binding, row-level mutations. |
| **5. Advanced SQL** | Multi-Table JOINs | **Real Implementation** | `INNER JOIN assets`, `LEFT JOIN users assignee`, `INNER JOIN catalog` | Cartesian product optimization, Hash vs Nested Loop joins. |
| **5. Advanced SQL** | Aggregations & `GROUP BY` | **Real Implementation** | `COUNT(*)`, `SUM()`, `AVG(DATEDIFF())` in `dashboardController.js` | Grouping criteria, `HAVING` clause vs `WHERE` filtering. |
| **5. Advanced SQL** | Temporal / Date Functions | **Real Implementation** | `DATEDIFF(resolved_at, discovered_date)`, `CURDATE()` for SLA breach | Server timezone handling, date arithmetic. |
| **6. Views** | Virtual Tables & Security | **Real Implementation** | `v_active_findings_detail`, `v_asset_risk_summary` in `schema.sql` | Query abstraction, performance implications (Materialized vs Virtual). |
| **7. Active DB** | Database Triggers | **Real Implementation** | `trg_finding_status_audit` in `schema.sql` | `BEFORE` vs `AFTER` triggers; avoiding recursive trigger loops. |
| **8. Stored Logic** | Stored Procedures & Flow Control| **Real Implementation** | `sp_transition_finding_status` in `schema.sql` | Precompiled execution plans, procedural SQL (`IF-THEN-ELSE`). |
| **9. Transactions** | ACID Properties | **Real Implementation & Theory** | `START TRANSACTION ... COMMIT / ROLLBACK` in Stored Procedure | Guaranteed state transitions; atomicity of status update + audit logging. |
| **10. Concurrency** | Isolation Levels & Anomalies | **Theory & Viva** | MySQL InnoDB default (`REPEATABLE READ`) | Dirty Read, Non-Repeatable Read, Phantom Read; Row-level locking (`SELECT ... FOR UPDATE`). |
| **11. Indexing** | B-Tree Indexes & Query Tuning | **Real Implementation & Theory** | `CREATE INDEX idx_findings_status_severity`, `EXPLAIN SELECT ...` | B+ Tree structure, composite index column order, index cardinality. |
| **12. DB Security** | SQL Injection Defense | **Real Implementation** | Parameterized queries (`pool.query('SELECT ... WHERE id = ?', [id])`) | Prepared statements, lexical query separation, principle of least privilege. |
| **13. Recovery** | Logging & Crash Recovery | **Theory & Viva** | InnoDB Write-Ahead Logging (WAL / Redo Log, Undo Log) | ARIES recovery algorithm, check-pointing, system crash resilience. |
| **14. Architecture**| Relational vs NoSQL & CAP | **Theory & Viva** | Architectural evaluation in `docs/architecture.md` | ACID vs BASE, strict consistency vs horizontal partition tolerance. |

---

## 2. In-Depth Technical Justifications for Examiners

### 2.1 Why Separate the Vulnerability Catalog from Findings? (Normalization in Practice)
- **The Pitfall of Denormalization:** If vulnerability descriptions, CVE identifiers, CWE classifications, and suggested remediation steps were stored directly inside the `findings` table:
  1. **Redundancy:** If 50 servers are vulnerable to `CVE-2021-44228` (Log4Shell), the identical description and CVE data would be replicated 50 times.
  2. **Update Anomaly:** If the vendor updates the remediation advisory for Log4Shell, the DBA or application would need to update 50 distinct rows. If one fails, data becomes inconsistent.
  3. **Deletion Anomaly:** If all 50 servers remediate the issue and the findings are deleted, the company loses all historic intelligence and documentation regarding Log4Shell.
  4. **Insertion Anomaly:** A security team cannot add a newly discovered zero-day advisory to the system unless it has already affected at least one server.
- **The Normalized 3NF Solution:**
  - `vulnerability_catalog` stores master templates ($CVE \to Title, Description, DefaultSeverity$).
  - `findings` stores only a foreign key (`catalog_id`) linking the vulnerability definition to a specific `asset_id`.

---

### 2.2 How ACID Properties are Guaranteed in VulnTrack
During a vulnerability remediation transition (e.g., from `UNDER_REVIEW` to `CLOSED`):

1. **Atomicity:**
   - Both the update to the finding (`status = 'CLOSED'`, `resolved_at = NOW()`) and the insertion into `finding_audit_log` must occur together.
   - Handled via `START TRANSACTION ... COMMIT` inside `sp_transition_finding_status`. If the audit insert fails (e.g., disk full or foreign key failure), the `SQLEXCEPTION` handler executes `ROLLBACK`, leaving the finding in its original state.
2. **Consistency:**
   - Database constraints enforce consistency: `status` must match the `ENUM`, `changed_by` must reference a valid user ID (`FOREIGN KEY`), and the transition logic validates that `CLOSED` can only be reached from `UNDER_REVIEW`.
3. **Isolation:**
   - In MySQL InnoDB, row-level locks are acquired using `SELECT ... FOR UPDATE` on the finding row.
   - If two analysts simultaneously attempt to change the status of the same finding, the second transaction is queued until the first commits, preventing lost updates or race conditions.
4. **Durability:**
   - Once `COMMIT` completes, changes are written to InnoDB's Write-Ahead Log (WAL / redo log) on non-volatile storage. Even if the server suffers an abrupt power loss a millisecond later, the database recovers the committed state upon restart.

---

### 2.3 Indexing Mechanics: Why `(status, severity)` Matters
- **The Problem:** The executive dashboard frequently executes:
  ```sql
  SELECT severity, COUNT(*) FROM findings WHERE status NOT IN ('CLOSED', 'FALSE_POSITIVE') GROUP BY severity;
  ```
- **Without Indexing (Full Table Scan):** The database engine must scan every single row on disk in the `findings` table ($O(N)$), inspect the status column, and aggregate in memory.
- **With Composite B+ Tree Index `idx_findings_status_severity (status, severity)`:**
  - The B+ tree organizes records first by `status`, and within each status, ordered by `severity`.
  - The query optimizer performs an **index range scan** covering only active statuses ($O(\log N + K)$).
  - Furthermore, this is a **Covering Index** because all columns required to satisfy the query (`status` and `severity`) reside directly within the leaf nodes of the index tree, eliminating the secondary lookup (bookmark lookup) into the clustered primary key table.

---

## 3. High-Scoring Model Answers for University Viva Voce

### Q1: "What isolation level does MySQL use by default, and what anomaly does it prevent?"
> **Model Answer:**  
> "MySQL InnoDB uses **`REPEATABLE READ`** by default. At this level, it uses Multi-Version Concurrency Control (MVCC) to ensure that if a transaction reads a row multiple times, it always sees the exact same data as of its first read snapshot. This prevents **Dirty Reads** (reading uncommitted changes from another transaction) and **Non-Repeatable Reads** (where another transaction updates and commits a row in between our reads). Furthermore, InnoDB uses Next-Key Locking (record locks combined with gap locks) which also prevents **Phantom Reads** under standard transactional execution."

---

### Q2: "How did your project prevent SQL Injection attacks?"
> **Model Answer:**  
> "We prevented SQL Injection by strictly avoiding dynamic string concatenation (`SELECT * FROM users WHERE username = '` + input + `'`). Instead, our Node.js Express backend utilizes parameterized queries provided by the `mysql2/promise` driver (`pool.query('SELECT * FROM users WHERE username = ?', [username])`).  
> 
> Under the hood, this communicates with the MySQL server using prepared statement protocols. The SQL query structure is parsed, compiled, and optimized by the database engine **before** the parameters are bound. As a result, even if an attacker inputs `' OR '1'='1`, the database treats the entire input string purely as literal data rather than executable SQL syntax."

---

### Q3: "What is the difference between a Clustered Index and a Non-Clustered (Secondary) Index in InnoDB?"
> **Model Answer:**  
> "In MySQL InnoDB, the table **is** the **Clustered Index**. The leaf pages of the clustered index contain the actual data rows of the table, sorted physically by the Primary Key (`id`). There can only be one clustered index per table.  
> 
> A **Secondary (Non-Clustered) Index** (such as our index on `asset_id` or `status`) is a separate B+ tree whose leaf pages do not store the full row data; instead, they store the indexed column values alongside the corresponding row's Primary Key. When a query searches via a secondary index, it searches the secondary index tree to find the primary key, and then traverses the clustered index tree to retrieve the full row—a process known as an index lookup or bookmark lookup."

---

### Q4: "What is the purpose of Database Views in VulnTrack?"
> **Model Answer:**  
> "We implemented views such as `v_active_findings_detail` and `v_asset_risk_summary` for three specific engineering benefits:
> 1. **Query Simplification & Abstraction:** It hides the complex 4-table relational `INNER` and `LEFT JOIN` logic from the application controllers. The backend simply runs `SELECT * FROM v_active_findings_detail WHERE severity = ?`.
> 2. **Security & Least Privilege:** Views allow granting access to aggregated or sanitized columns without exposing sensitive underlying tables directly.
> 3. **Consistent Business Logic:** Ensures that calculation of derived columns—such as `is_overdue` and `days_overdue`—is calculated uniformly across all reports."

---

### Q5: "Explain the trade-offs of using Database Triggers in an enterprise web application."
> **Model Answer:**  
> "In VulnTrack, we use a database trigger (`trg_finding_status_audit`) to guarantee that any modification to a finding's status immediately logs an audit row in `finding_audit_log`.  
> 
> **Advantages:**
> - Enforces audit compliance at the data tier. Even if a sysadmin directly updates the database via MySQL CLI or phpMyAdmin without going through the Express API, the audit trail is preserved.
> - Reduces repetitive boilerplate logging code in application controllers.
> 
> **Trade-offs / Disadvantages:**
> - **Hidden side effects:** Application developers cannot easily observe triggered operations by reading application source code alone.
> - **Performance overhead:** Triggers run synchronously inside the same transaction as the `UPDATE`, increasing lock duration under high write concurrency.
> - **Debugging difficulty:** Debugging stored trigger logic requires specialized database profiling tools rather than standard Node.js debuggers."
