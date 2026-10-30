/**
 * VulnTrack Mock Data Adapter (Development & Offline Testing Only)
 * 
 * Provides an isolated, in-memory relational simulation of the MySQL database.
 * Matches all schemas, status values, and state machine constraints defined in
 * docs/api-contract.md and docs/database-design.md.
 */

const MockDatabase = (function() {
  // Simulated initial users
  let users = [
    { id: 1, username: 'admin', email: 'admin@corp.local', fullName: 'System Administrator', role: 'admin', isActive: true },
    { id: 2, username: 'analyst1', email: 'analyst1@corp.local', fullName: 'Alice Analyst', role: 'analyst', isActive: true },
    { id: 3, username: 'dev_bob', email: 'bob@corp.local', fullName: 'Bob Builder', role: 'developer', isActive: true }
  ];

  let currentUser = users[1]; // Default active user in mock mode: Alice Analyst

  // Simulated initial assets (includes operatingSystem and isArchived)
  let assets = [
    {
      id: 1,
      name: 'Production Core Database',
      assetType: 'DATABASE',
      ipAddress: '10.0.1.20',
      hostname: 'db-prod-01.corp.internal',
      operatingSystem: 'Ubuntu 22.04 LTS',
      environment: 'PRODUCTION',
      criticality: 'CRITICAL',
      ownerTeam: 'Data Infrastructure',
      isArchived: false,
      activeFindingsCount: 3,
      createdAt: '2026-10-15T09:00:00.000Z'
    },
    {
      id: 2,
      name: 'Payment Gateway API',
      assetType: 'SERVER',
      ipAddress: '10.0.2.14',
      hostname: 'api-gateway-01.corp.internal',
      operatingSystem: 'Red Hat Enterprise Linux 9',
      environment: 'PRODUCTION',
      criticality: 'CRITICAL',
      ownerTeam: 'Core Payments',
      isArchived: false,
      activeFindingsCount: 2,
      createdAt: '2026-10-16T11:30:00.000Z'
    },
    {
      id: 3,
      name: 'Customer Portal Web App',
      assetType: 'WEB_APP',
      ipAddress: '10.0.3.50',
      hostname: 'portal.corp.internal',
      operatingSystem: 'Debian 12 Bookworm',
      environment: 'STAGING',
      criticality: 'HIGH',
      ownerTeam: 'Frontend Engineering',
      isArchived: false,
      activeFindingsCount: 1,
      createdAt: '2026-10-18T14:15:00.000Z'
    },
    {
      id: 4,
      name: 'Legacy LDAP Directory',
      assetType: 'SERVER',
      ipAddress: '10.0.9.12',
      hostname: 'ldap-old-01.corp.internal',
      operatingSystem: 'CentOS 7 (Deprecated)',
      environment: 'DEVELOPMENT',
      criticality: 'LOW',
      ownerTeam: 'Identity Team',
      isArchived: true,
      activeFindingsCount: 0,
      createdAt: '2026-09-01T08:00:00.000Z'
    }
  ];

  // Vulnerability Catalog Master Templates
  let catalog = [
    {
      id: 1,
      cveId: 'CVE-2021-44228',
      cweId: 'CWE-502',
      title: 'Apache Log4j2 JNDI Remote Code Execution (Log4Shell)',
      description: 'Apache Log4j2 versions 2.0-beta9 through 2.15.0 JNDI features do not protect against attacker controlled LDAP.',
      defaultSeverity: 'CRITICAL',
      cvssBaseScore: 10.0,
      remediationGuidance: 'Upgrade log4j-core to version 2.17.1 or higher and disable message lookups.'
    },
    {
      id: 2,
      cveId: 'CVE-2023-38606',
      cweId: 'CWE-287',
      title: 'Kernel State Modification Vulnerability',
      description: 'Improper state validation allows local users to modify sensitive kernel state.',
      defaultSeverity: 'HIGH',
      cvssBaseScore: 7.8,
      remediationGuidance: 'Apply operating system security patch immediately and reboot target host.'
    },
    {
      id: 3,
      cveId: 'CVE-2022-22965',
      cweId: 'CWE-94',
      title: 'Spring Framework RCE (Spring4Shell)',
      description: 'Spring Framework vulnerability that allows unauthenticated attackers to execute arbitrary code via DataBinder.',
      defaultSeverity: 'CRITICAL',
      cvssBaseScore: 9.8,
      remediationGuidance: 'Upgrade Spring Framework to version 5.3.18 or 5.2.20 or newer.'
    },
    {
      id: 4,
      cveId: 'CVE-2023-4863',
      cweId: 'CWE-787',
      title: 'Heap Buffer Overflow in libwebp',
      description: 'Heap buffer overflow in libwebp in Google Chrome and other software allows remote attacker to execute arbitrary code.',
      defaultSeverity: 'HIGH',
      cvssBaseScore: 8.8,
      remediationGuidance: 'Update libwebp library packages across container base images.'
    },
    {
      id: 5,
      cveId: 'CVE-2022-31160',
      cweId: 'CWE-79',
      title: 'Stored Cross-Site Scripting in Admin UI',
      description: 'Improper neutralization of input during web page generation allows stored script injection in dashboard widgets.',
      defaultSeverity: 'MEDIUM',
      cvssBaseScore: 6.1,
      remediationGuidance: 'Ensure all user input is sanitized and encode HTML entities before rendering in DOM.'
    }
  ];

  // Concrete Findings Instances
  let findings = [
    {
      id: 101,
      assetId: 1,
      catalogId: 1,
      title: 'Log4Shell in Authentication Microservice',
      description: 'Vulnerable log4j-core-2.14.1.jar detected in classpath on port 8080.',
      severity: 'CRITICAL',
      priority: 'P1',
      status: 'OPEN',
      discoveredDate: '2026-10-20',
      dueDate: '2026-10-25', // Overdue relative to current date (2026-10-30)
      resolvedAt: null,
      reporterId: 2,
      assigneeId: 3,
      remediationNotes: 'Awaiting scheduled maintenance window to redeploy updated container.',
      createdAt: '2026-10-20T10:00:00.000Z',
      updatedAt: '2026-10-20T10:00:00.000Z'
    },
    {
      id: 102,
      assetId: 2,
      catalogId: 3,
      title: 'Spring4Shell in Payment Dispatcher',
      description: 'Spring DataBinder binding parameter vulnerability exposed on public endpoint.',
      severity: 'CRITICAL',
      priority: 'P1',
      status: 'IN_PROGRESS',
      discoveredDate: '2026-10-22',
      dueDate: '2026-11-02',
      resolvedAt: null,
      reporterId: 2,
      assigneeId: 3,
      remediationNotes: 'Branch created in repo to bump spring-web dependency.',
      createdAt: '2026-10-22T14:30:00.000Z',
      updatedAt: '2026-10-24T09:00:00.000Z'
    },
    {
      id: 103,
      assetId: 3,
      catalogId: 5,
      title: 'Stored XSS in User Profile Bio',
      description: 'Input parameter bio does not sanitize script tags before rendering on profile card.',
      severity: 'MEDIUM',
      priority: 'P3',
      status: 'UNDER_REVIEW',
      discoveredDate: '2026-10-25',
      dueDate: '2026-11-15',
      resolvedAt: null,
      reporterId: 2,
      assigneeId: 3,
      remediationNotes: 'Implemented DOMPurify and textContent rendering in staging build v1.4.2.',
      createdAt: '2026-10-25T11:00:00.000Z',
      updatedAt: '2026-10-28T16:20:00.000Z'
    },
    {
      id: 104,
      assetId: 1,
      catalogId: 2,
      title: 'Unpatched Linux Kernel on DB Primary',
      description: 'Running kernel 5.15.0-72-generic susceptible to local privilege escalation.',
      severity: 'HIGH',
      priority: 'P2',
      status: 'CLOSED',
      discoveredDate: '2026-10-10',
      dueDate: '2026-10-24',
      resolvedAt: '2026-10-23T18:00:00.000Z',
      reporterId: 2,
      assigneeId: 1,
      remediationNotes: 'Patched kernel to 5.15.0-88-generic during Sunday maintenance and verified with reboot.',
      createdAt: '2026-10-10T08:00:00.000Z',
      updatedAt: '2026-10-23T18:00:00.000Z'
    }
  ];

  // Audit Log Entries
  let auditLogs = [
    {
      id: 1,
      findingId: 104,
      oldStatus: 'OPEN',
      newStatus: 'IN_PROGRESS',
      changedBy: 1,
      changeReason: 'Admin initiated kernel maintenance patching schedule.',
      createdAt: '2026-10-12T10:00:00.000Z'
    },
    {
      id: 2,
      findingId: 104,
      oldStatus: 'IN_PROGRESS',
      newStatus: 'UNDER_REVIEW',
      changedBy: 1,
      changeReason: 'Kernel packages updated; reboot scheduled.',
      createdAt: '2026-10-23T15:00:00.000Z'
    },
    {
      id: 3,
      findingId: 104,
      oldStatus: 'UNDER_REVIEW',
      newStatus: 'CLOSED',
      changedBy: 2,
      changeReason: 'Verified uname -r returns patched version; vulnerability no longer present.',
      createdAt: '2026-10-23T18:00:00.000Z'
    },
    {
      id: 4,
      findingId: 102,
      oldStatus: 'OPEN',
      newStatus: 'IN_PROGRESS',
      changedBy: 3,
      changeReason: 'Assigned to Dev Bob; dependency upgrade underway.',
      createdAt: '2026-10-24T09:00:00.000Z'
    },
    {
      id: 5,
      findingId: 103,
      oldStatus: 'OPEN',
      newStatus: 'IN_PROGRESS',
      changedBy: 3,
      changeReason: 'Working on frontend sanitization pull request.',
      createdAt: '2026-10-26T10:00:00.000Z'
    },
    {
      id: 6,
      findingId: 103,
      oldStatus: 'IN_PROGRESS',
      newStatus: 'UNDER_REVIEW',
      changedBy: 3,
      changeReason: 'PR merged to staging; requested security analyst review.',
      createdAt: '2026-10-28T16:20:00.000Z'
    }
  ];

  // Comments Thread
  let comments = [
    {
      id: 1,
      findingId: 101,
      userId: 2,
      commentText: 'This is on our primary database cluster. SLA requires closure within 7 days.',
      createdAt: '2026-10-20T10:05:00.000Z'
    },
    {
      id: 2,
      findingId: 101,
      userId: 3,
      commentText: 'Container base image rebuilt. Staging testing tomorrow.',
      createdAt: '2026-10-21T16:00:00.000Z'
    }
  ];

  // Helper: check if date string is overdue relative to today
  function isOverdueCheck(dueDateStr, status) {
    if (['CLOSED', 'FALSE_POSITIVE', 'RISK_ACCEPTED'].includes(status)) return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDateStr < today;
  }

  // Helper: calculate days overdue
  function daysOverdueCalc(dueDateStr) {
    const today = new Date();
    const due = new Date(dueDateStr);
    const diffTime = today - due;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  // Public Mock Interface
  return {
    getCurrentUser: () => currentUser,
    setCurrentUser: (user) => { currentUser = user; },
    getUsers: () => [...users],

    // Assets
    getAssets: (filters = {}) => {
      let list = assets.filter(a => {
        if (!filters.includeArchived && a.isArchived) return false;
        if (filters.environment && a.environment !== filters.environment) return false;
        if (filters.criticality && a.criticality !== filters.criticality) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const match = a.name.toLowerCase().includes(q) ||
                        (a.hostname && a.hostname.toLowerCase().includes(q)) ||
                        (a.ipAddress && a.ipAddress.toLowerCase().includes(q)) ||
                        (a.operatingSystem && a.operatingSystem.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      });

      // Recalculate active findings count for each asset
      return list.map(a => {
        const count = findings.filter(f => f.assetId === a.id && !['CLOSED', 'FALSE_POSITIVE', 'RISK_ACCEPTED'].includes(f.status)).length;
        return { ...a, activeFindingsCount: count };
      });
    },

    getAssetById: (id) => {
      const asset = assets.find(a => a.id === Number(id));
      if (!asset) return null;
      const linkedFindings = findings.filter(f => f.assetId === asset.id);
      return { ...asset, findings: linkedFindings };
    },

    createAsset: (data) => {
      const newId = assets.length ? Math.max(...assets.map(a => a.id)) + 1 : 1;
      const newAsset = {
        id: newId,
        name: data.name,
        assetType: data.assetType,
        ipAddress: data.ipAddress || null,
        hostname: data.hostname || null,
        operatingSystem: data.operatingSystem || null,
        environment: data.environment || 'DEVELOPMENT',
        criticality: data.criticality || 'MEDIUM',
        ownerTeam: data.ownerTeam,
        isArchived: false,
        activeFindingsCount: 0,
        createdAt: new Date().toISOString()
      };
      assets.push(newAsset);
      return newAsset;
    },

    updateAsset: (id, data) => {
      const idx = assets.findIndex(a => a.id === Number(id));
      if (idx === -1) return null;
      assets[idx] = { ...assets[idx], ...data, updatedAt: new Date().toISOString() };
      return assets[idx];
    },

    archiveAsset: (id, isArchived = true) => {
      const asset = assets.find(a => a.id === Number(id));
      if (!asset) return null;
      asset.isArchived = isArchived;
      asset.updatedAt = new Date().toISOString();
      return asset;
    },

    deleteAsset: (id) => {
      const numId = Number(id);
      const hasFindings = findings.some(f => f.assetId === numId);
      if (hasFindings) {
        throw new Error('Cannot delete asset with linked findings (ON DELETE RESTRICT). Archive it instead.');
      }
      const idx = assets.findIndex(a => a.id === numId);
      if (idx !== -1) assets.splice(idx, 1);
      return true;
    },

    // Catalog
    getCatalog: (filters = {}) => {
      return catalog.filter(c => {
        if (filters.severity && c.defaultSeverity !== filters.severity) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const match = (c.cveId && c.cveId.toLowerCase().includes(q)) ||
                        (c.cweId && c.cweId.toLowerCase().includes(q)) ||
                        c.title.toLowerCase().includes(q) ||
                        c.description.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      });
    },

    getCatalogById: (id) => catalog.find(c => c.id === Number(id)) || null,

    createCatalogItem: (data) => {
      const newId = catalog.length ? Math.max(...catalog.map(c => c.id)) + 1 : 1;
      const newItem = {
        id: newId,
        cveId: data.cveId || null,
        cweId: data.cweId || null,
        title: data.title,
        description: data.description,
        defaultSeverity: data.defaultSeverity,
        cvssBaseScore: parseFloat(data.cvssBaseScore) || 5.0,
        remediationGuidance: data.remediationGuidance || null,
        createdAt: new Date().toISOString()
      };
      catalog.push(newItem);
      return newItem;
    },

    // Findings
    getFindings: (filters = {}) => {
      let list = findings.filter(f => {
        if (filters.status && f.status !== filters.status) return false;
        if (filters.severity && f.severity !== filters.severity) return false;
        if (filters.priority && f.priority !== filters.priority) return false;
        if (filters.assetId && f.assetId !== Number(filters.assetId)) return false;
        if (filters.assigneeId && f.assigneeId !== Number(filters.assigneeId)) return false;
        if (filters.isOverdue === true && !isOverdueCheck(f.dueDate, f.status)) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const asset = assets.find(a => a.id === f.assetId);
          const cat = catalog.find(c => c.id === f.catalogId);
          const match = f.title.toLowerCase().includes(q) ||
                        (asset && asset.name.toLowerCase().includes(q)) ||
                        (cat && cat.cveId && cat.cveId.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      });

      // Hydrate relational fields
      return list.map(f => {
        const asset = assets.find(a => a.id === f.assetId) || { id: f.assetId, name: 'Unknown Asset', environment: 'UNKNOWN', criticality: 'LOW' };
        const cat = catalog.find(c => c.id === f.catalogId) || { id: f.catalogId, cveId: 'N/A', cweId: 'N/A' };
        const reporter = users.find(u => u.id === f.reporterId) || { id: f.reporterId, fullName: 'Unknown' };
        const assignee = users.find(u => u.id === f.assigneeId) || (f.assigneeId ? { id: f.assigneeId, fullName: 'Unassigned' } : null);
        const overdue = isOverdueCheck(f.dueDate, f.status);
        const days = overdue ? daysOverdueCalc(f.dueDate) : 0;

        return {
          ...f,
          isOverdue: overdue,
          daysOverdue: days,
          asset,
          catalog: cat,
          reporter,
          assignee
        };
      });
    },

    getFindingById: (id) => {
      const f = findings.find(item => item.id === Number(id));
      if (!f) return null;
      const asset = assets.find(a => a.id === f.assetId);
      const cat = catalog.find(c => c.id === f.catalogId);
      const reporter = users.find(u => u.id === f.reporterId);
      const assignee = users.find(u => u.id === f.assigneeId);
      const fComments = comments.filter(c => c.findingId === f.id).map(c => {
        const author = users.find(u => u.id === c.userId) || { fullName: 'User' };
        return { ...c, authorName: author.fullName };
      });
      const fAudit = auditLogs.filter(a => a.findingId === f.id).map(a => {
        const author = users.find(u => u.id === a.changedBy) || { fullName: 'User' };
        return { ...a, changedByName: author.fullName };
      });

      return {
        ...f,
        isOverdue: isOverdueCheck(f.dueDate, f.status),
        daysOverdue: isOverdueCheck(f.dueDate, f.status) ? daysOverdueCalc(f.dueDate) : 0,
        asset,
        catalog: cat,
        reporter,
        assignee,
        comments: fComments,
        history: fAudit
      };
    },

    createFinding: (data) => {
      const newId = findings.length ? Math.max(...findings.map(f => f.id)) + 1 : 101;
      const newFinding = {
        id: newId,
        assetId: Number(data.assetId),
        catalogId: Number(data.catalogId),
        title: data.title,
        description: data.description || '',
        severity: data.severity,
        priority: data.priority || 'P3',
        status: 'OPEN',
        discoveredDate: data.discoveredDate || new Date().toISOString().split('T')[0],
        dueDate: data.dueDate,
        resolvedAt: null,
        reporterId: currentUser.id,
        assigneeId: data.assigneeId ? Number(data.assigneeId) : null,
        remediationNotes: data.remediationNotes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      findings.push(newFinding);

      // Audit log entry for creation
      auditLogs.push({
        id: auditLogs.length + 1,
        findingId: newId,
        oldStatus: null,
        newStatus: 'OPEN',
        changedBy: currentUser.id,
        changeReason: 'Finding logged into inventory.',
        createdAt: new Date().toISOString()
      });

      return newFinding;
    },

    transitionFindingStatus: (id, newStatus, reason) => {
      const numId = Number(id);
      const finding = findings.find(f => f.id === numId);
      if (!finding) throw new Error('Finding not found');

      const oldStatus = finding.status;

      // Validate State Machine Transition
      const validTransitions = {
        'OPEN': ['IN_PROGRESS', 'FALSE_POSITIVE', 'RISK_ACCEPTED'],
        'IN_PROGRESS': ['UNDER_REVIEW', 'OPEN'],
        'UNDER_REVIEW': ['CLOSED', 'IN_PROGRESS'],
        'CLOSED': ['REOPENED'],
        'REOPENED': ['IN_PROGRESS', 'FALSE_POSITIVE', 'RISK_ACCEPTED'],
        'FALSE_POSITIVE': ['OPEN'],
        'RISK_ACCEPTED': ['OPEN']
      };

      if (!validTransitions[oldStatus] || !validTransitions[oldStatus].includes(newStatus)) {
        throw new Error(`Invalid state transition from ${oldStatus} to ${newStatus}. Transition rejected by state machine.`);
      }

      // Role check enforcement simulation
      if (['CLOSED', 'FALSE_POSITIVE', 'REOPENED'].includes(newStatus) && currentUser.role === 'developer') {
        throw new Error(`Permission denied: Only Analysts or Admins can transition to ${newStatus}.`);
      }
      if (newStatus === 'RISK_ACCEPTED' && currentUser.role !== 'admin') {
        throw new Error('Permission denied: Only Admins can approve Risk Acceptance.');
      }

      // Update finding
      finding.status = newStatus;
      finding.updatedAt = new Date().toISOString();
      if (newStatus === 'CLOSED') {
        finding.resolvedAt = new Date().toISOString();
      } else {
        finding.resolvedAt = null;
      }

      // Record Audit Log Entry
      const newAuditId = auditLogs.length ? Math.max(...auditLogs.map(a => a.id)) + 1 : 1;
      auditLogs.push({
        id: newAuditId,
        findingId: numId,
        oldStatus,
        newStatus,
        changedBy: currentUser.id,
        changeReason: reason || 'Status transition requested.',
        createdAt: new Date().toISOString()
      });

      return { id: numId, oldStatus, newStatus, updatedAt: finding.updatedAt };
    },

    addComment: (findingId, commentText) => {
      const numId = Number(findingId);
      const newCommentId = comments.length ? Math.max(...comments.map(c => c.id)) + 1 : 1;
      const entry = {
        id: newCommentId,
        findingId: numId,
        userId: currentUser.id,
        commentText,
        createdAt: new Date().toISOString()
      };
      comments.push(entry);
      return { ...entry, authorName: currentUser.fullName };
    },

    // Dashboard Aggregation Statistics (matches exact SQL queries)
    getDashboardStats: () => {
      const activeFindings = findings.filter(f => !['CLOSED', 'FALSE_POSITIVE', 'RISK_ACCEPTED'].includes(f.status));
      const criticalCount = activeFindings.filter(f => f.severity === 'CRITICAL').length;
      const highCount = activeFindings.filter(f => f.severity === 'HIGH').length;
      const overdueCount = activeFindings.filter(f => isOverdueCheck(f.dueDate, f.status)).length;

      const closedFindings = findings.filter(f => f.status === 'CLOSED' && f.resolvedAt);
      let mttrDays = 0;
      if (closedFindings.length > 0) {
        const totalDays = closedFindings.reduce((acc, f) => {
          const disc = new Date(f.discoveredDate);
          const res = new Date(f.resolvedAt);
          const diff = Math.max(0, Math.floor((res - disc) / (1000 * 60 * 60 * 24)));
          return acc + diff;
        }, 0);
        mttrDays = parseFloat((totalDays / closedFindings.length).toFixed(1));
      }

      return {
        totalActive: activeFindings.length,
        criticalCount,
        highCount,
        overdueCount,
        mttrDays,
        totalClosed: closedFindings.length
      };
    },

    getSeverityBreakdown: () => {
      const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
      const active = findings.filter(f => !['CLOSED', 'FALSE_POSITIVE'].includes(f.status));
      return order.map(sev => ({
        severity: sev,
        count: active.filter(f => f.severity === sev).length
      }));
    },

    getStatusBreakdown: () => {
      const statuses = ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'CLOSED', 'FALSE_POSITIVE', 'RISK_ACCEPTED', 'REOPENED'];
      return statuses.map(st => ({
        status: st,
        count: findings.filter(f => f.status === st).length
      }));
    },

    getTopAssets: (limit = 5) => {
      const active = findings.filter(f => !['CLOSED', 'FALSE_POSITIVE', 'RISK_ACCEPTED'].includes(f.status));
      const summary = assets.filter(a => !a.isArchived).map(a => {
        const assetFindings = active.filter(f => f.assetId === a.id);
        const criticalCount = assetFindings.filter(f => f.severity === 'CRITICAL').length;
        const highCount = assetFindings.filter(f => f.severity === 'HIGH').length;
        return {
          assetId: a.id,
          assetName: a.name,
          environment: a.environment,
          criticality: a.criticality,
          openFindingsCount: assetFindings.length,
          criticalFindingsCount: criticalCount,
          highFindingsCount: highCount
        };
      });

      return summary
        .filter(s => s.openFindingsCount > 0)
        .sort((a, b) => b.criticalFindingsCount - a.criticalFindingsCount || b.openFindingsCount - a.openFindingsCount)
        .slice(0, limit);
    },

    getOverdueFindings: () => {
      const active = findings.filter(f => !['CLOSED', 'FALSE_POSITIVE', 'RISK_ACCEPTED'].includes(f.status));
      return active
        .filter(f => isOverdueCheck(f.dueDate, f.status))
        .map(f => {
          const asset = assets.find(a => a.id === f.assetId) || { name: 'Unknown' };
          return {
            id: f.id,
            title: f.title,
            severity: f.severity,
            priority: f.priority,
            dueDate: f.dueDate,
            daysOverdue: daysOverdueCalc(f.dueDate),
            assetName: asset.name
          };
        })
        .sort((a, b) => b.daysOverdue - a.daysOverdue);
    }
  };
})();
