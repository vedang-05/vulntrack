/**
 * VulnTrack Findings Management & Remediation State Machine Controller
 */

(function() {
  let allFindings = [];
  let availableAssets = [];
  let availableCatalog = [];
  let availableUsers = [];
  let currentPage = 1;
  const pageSize = CONFIG.DEFAULT_PAGE_SIZE;
  let activeDrawerFindingId = null;

  document.addEventListener('DOMContentLoaded', async () => {
    initEvents();
    await loadDropdownDependencies();
    checkURLParameters();
    await loadFindings();
  });

  function initEvents() {
    // Search with debounce
    const searchInput = document.getElementById('finding-search');
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          currentPage = 1;
          loadFindings();
        }, 250);
      });
    }

    // Filter controls
    const statusFilter = document.getElementById('finding-filter-status');
    const sevFilter = document.getElementById('finding-filter-sev');
    const prioFilter = document.getElementById('finding-filter-prio');
    const assetFilter = document.getElementById('finding-filter-asset');
    const overdueFilter = document.getElementById('finding-filter-overdue');
    const resetBtn = document.getElementById('reset-finding-filters');

    if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; loadFindings(); });
    if (sevFilter) sevFilter.addEventListener('change', () => { currentPage = 1; loadFindings(); });
    if (prioFilter) prioFilter.addEventListener('change', () => { currentPage = 1; loadFindings(); });
    if (assetFilter) assetFilter.addEventListener('change', () => { currentPage = 1; loadFindings(); });
    if (overdueFilter) overdueFilter.addEventListener('change', () => { currentPage = 1; loadFindings(); });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (sevFilter) sevFilter.value = '';
        if (prioFilter) prioFilter.value = '';
        if (assetFilter) assetFilter.value = '';
        if (overdueFilter) overdueFilter.checked = false;
        currentPage = 1;
        loadFindings();
      });
    }

    // Log Finding Modal trigger
    const openLogBtn = document.getElementById('open-log-finding-modal');
    if (openLogBtn) {
      openLogBtn.addEventListener('click', openCreateFindingModal);
    }

    // Create Finding Form Submission
    const createForm = document.getElementById('form-create-finding');
    if (createForm) {
      createForm.addEventListener('submit', handleCreateFinding);
    }

    // Catalog selection auto-fill title & severity
    const catalogSelect = document.getElementById('create-f-catalog');
    if (catalogSelect) {
      catalogSelect.addEventListener('change', () => {
        const selectedId = Number(catalogSelect.value);
        const item = availableCatalog.find(c => c.id === selectedId);
        if (item) {
          const titleInput = document.getElementById('create-f-title');
          const sevSelect = document.getElementById('create-f-sev');
          const notesText = document.getElementById('create-f-notes');
          if (titleInput && !titleInput.value) titleInput.value = item.title;
          if (sevSelect && item.defaultSeverity) sevSelect.value = item.defaultSeverity;
          if (notesText && item.remediationGuidance) notesText.value = item.remediationGuidance;
          updateDefaultDueDate(item.defaultSeverity);
        }
      });
    }

    // Transition Form Submission
    const transForm = document.getElementById('form-transition-finding');
    if (transForm) {
      transForm.addEventListener('submit', handleTransitionSubmit);
    }

    // Add Comment Form Submission in Drawer
    const commentForm = document.getElementById('form-add-comment');
    if (commentForm) {
      commentForm.addEventListener('submit', handleAddComment);
    }
  }

  /**
   * Preload dependencies for modals and dropdowns
   */
  async function loadDropdownDependencies() {
    try {
      const [assetsRes, catalogRes, usersRes] = await Promise.all([
        API.assets.list(),
        API.catalog.list(),
        API.users.list()
      ]);

      availableAssets = assetsRes.data || [];
      availableCatalog = catalogRes.data || [];
      availableUsers = usersRes.data || [];

      // Populate filter dropdown
      const filterAssetSelect = document.getElementById('finding-filter-asset');
      if (filterAssetSelect) {
        availableAssets.forEach(a => {
          const opt = UI.createElement('option', {
            attributes: { value: String(a.id) },
            textContent: a.name
          });
          filterAssetSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.warn('Failed to load dropdown dependencies', err);
    }
  }

  /**
   * Check URL params for deep linking (e.g. ?assetId=1, ?isOverdue=true, ?action=new)
   */
  function checkURLParameters() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      setTimeout(openCreateFindingModal, 150);
    }
    if (params.get('isOverdue') === 'true') {
      const el = document.getElementById('finding-filter-overdue');
      if (el) el.checked = true;
    }
    if (params.get('assetId')) {
      const el = document.getElementById('finding-filter-asset');
      if (el) el.value = params.get('assetId');
    }
    if (params.get('search')) {
      const el = document.getElementById('finding-search');
      if (el) el.value = params.get('search');
    }
  }

  /**
   * Load Findings List
   */
  async function loadFindings() {
    const search = document.getElementById('finding-search')?.value.trim();
    const status = document.getElementById('finding-filter-status')?.value;
    const severity = document.getElementById('finding-filter-sev')?.value;
    const priority = document.getElementById('finding-filter-prio')?.value;
    const assetId = document.getElementById('finding-filter-asset')?.value;
    const isOverdue = document.getElementById('finding-filter-overdue')?.checked;

    const tbody = document.getElementById('findings-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr><td colspan="9" style="text-align: center; padding: 25px;">
          <div class="skeleton-row"></div>
          <div class="skeleton-row"></div>
        </td></tr>
      `;
    }

    try {
      const res = await API.findings.list({
        search,
        status,
        severity,
        priority,
        assetId,
        isOverdue
      });

      allFindings = res.data || [];
      renderTable();

      // Update sidebar counter
      const activeCount = allFindings.filter(f => !['CLOSED', 'FALSE_POSITIVE', 'RISK_ACCEPTED'].includes(f.status)).length;
      const navCnt = document.getElementById('nav-active-cnt');
      if (navCnt) navCnt.textContent = String(activeCount);
    } catch (err) {
      UI.showToast(`Failed to load findings: ${err.message}`, 'error');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 25px; color: #f87171;">Failed to load findings: ${UI.escapeHTML(err.message)}</td></tr>`;
      }
    }
  }

  /**
   * Render Findings Table
   */
  function renderTable() {
    const tbody = document.getElementById('findings-table-body');
    const paginationContainer = document.getElementById('findings-pagination');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (allFindings.length === 0) {
      const emptyRow = UI.createElement('tr', {
        children: [
          UI.createElement('td', {
            attributes: { colspan: '9' },
            children: [
              UI.createElement('div', {
                className: 'empty-state',
                children: [
                  UI.createElement('h3', { textContent: 'No findings match your criteria' }),
                  UI.createElement('p', { textContent: 'Try clearing filters or log a newly discovered vulnerability finding.' }),
                  UI.createElement('button', {
                    className: 'btn btn-primary btn-sm',
                    textContent: '+ Log Finding',
                    events: { click: openCreateFindingModal }
                  })
                ]
              })
            ]
          })
        ]
      });
      tbody.appendChild(emptyRow);
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    const pState = UI.paginate(allFindings, currentPage, pageSize);

    pState.pagedItems.forEach(finding => {
      const tr = UI.createElement('tr');

      // 1. Finding ID
      const idTd = UI.createElement('td', {
        className: 'text-mono',
        style: 'font-weight: 600; font-size: 0.8rem; color: var(--color-text-muted);',
        textContent: `#${finding.id}`
      });

      // 2. Title & Catalog CVE
      const titleTd = UI.createElement('td');
      const titleWrap = UI.createElement('div');
      const titleLink = UI.createElement('a', {
        className: 'table-cell-title',
        attributes: { href: '#', title: 'Open details drawer' },
        textContent: finding.title,
        events: {
          click: (e) => {
            e.preventDefault();
            openFindingDrawer(finding.id);
          }
        }
      });
      titleWrap.appendChild(titleLink);

      if (finding.catalog && finding.catalog.cveId) {
        const cveBadge = UI.createElement('span', {
          className: 'badge text-mono',
          style: 'margin-left: 6px; font-size: 0.7rem; border-color: #0284c7; color: #38bdf8;',
          textContent: finding.catalog.cveId
        });
        titleWrap.appendChild(cveBadge);
      }
      titleTd.appendChild(titleWrap);

      // 3. Target Asset
      const assetTd = UI.createElement('td');
      if (finding.asset) {
        const assetName = UI.createElement('span', {
          style: 'font-weight: 500; color: var(--color-text-primary); display: block;',
          textContent: finding.asset.name
        });
        const assetEnv = UI.renderEnvironmentBadge(finding.asset.environment);
        assetTd.appendChild(assetName);
        assetTd.appendChild(assetEnv);
      } else {
        assetTd.textContent = '—';
      }

      // 4. Severity
      const sevTd = UI.createElement('td');
      sevTd.appendChild(UI.renderSeverityBadge(finding.severity));

      // 5. Priority (P1 - P4)
      const prioTd = UI.createElement('td');
      prioTd.appendChild(UI.renderPriorityBadge(finding.priority));

      // 6. Status
      const statusTd = UI.createElement('td');
      statusTd.appendChild(UI.renderStatusBadge(finding.status));

      // 7. Due Date / Overdue SLA
      const dueTd = UI.createElement('td');
      const dueText = UI.createElement('div', { textContent: UI.formatDate(finding.dueDate) });
      dueTd.appendChild(dueText);

      if (finding.isOverdue) {
        const overdueBadge = UI.createElement('span', {
          className: 'badge badge-sev-critical',
          style: 'font-size: 0.68rem; margin-top: 2px;',
          textContent: `Overdue (+${finding.daysOverdue}d)`
        });
        dueTd.appendChild(overdueBadge);
      }

      // 8. Assignee
      const assigneeTd = UI.createElement('td', {
        style: 'font-size: 0.82rem;',
        textContent: finding.assignee ? finding.assignee.fullName : 'Unassigned'
      });

      // 9. Actions Column
      const actionsTd = UI.createElement('td', { style: 'text-align: right;' });
      const actionWrap = UI.createElement('div', { className: 'table-actions', style: 'justify-content: flex-end;' });

      // View Detail Button
      const viewBtn = UI.createElement('button', {
        className: 'btn btn-outline btn-sm',
        textContent: 'View',
        events: { click: () => openFindingDrawer(finding.id) }
      });

      // Transition Button
      const transBtn = UI.createElement('button', {
        className: 'btn btn-secondary btn-sm',
        textContent: 'Transition',
        events: { click: () => openTransitionModal(finding) }
      });

      actionWrap.appendChild(viewBtn);
      actionWrap.appendChild(transBtn);
      actionsTd.appendChild(actionWrap);

      tr.appendChild(idTd);
      tr.appendChild(titleTd);
      tr.appendChild(assetTd);
      tr.appendChild(sevTd);
      tr.appendChild(prioTd);
      tr.appendChild(statusTd);
      tr.appendChild(dueTd);
      tr.appendChild(assigneeTd);
      tr.appendChild(actionsTd);

      tbody.appendChild(tr);
    });

    UI.renderPagination(paginationContainer, pState, (newPage) => {
      currentPage = newPage;
      renderTable();
    });
  }

  /**
   * Open "Log Finding" modal and populate asset/catalog select dropdowns
   */
  function openCreateFindingModal() {
    const assetSelect = document.getElementById('create-f-asset');
    const catalogSelect = document.getElementById('create-f-catalog');
    const assigneeSelect = document.getElementById('create-f-assignee');

    if (assetSelect) {
      assetSelect.innerHTML = '<option value="">Select Target Asset...</option>';
      availableAssets.filter(a => !a.isArchived).forEach(a => {
        assetSelect.appendChild(UI.createElement('option', {
          attributes: { value: String(a.id) },
          textContent: `${a.name} (${a.environment})`
        }));
      });
    }

    if (catalogSelect) {
      catalogSelect.innerHTML = '<option value="">Select Vulnerability Definition...</option>';
      availableCatalog.forEach(c => {
        catalogSelect.appendChild(UI.createElement('option', {
          attributes: { value: String(c.id) },
          textContent: `${c.cveId || 'Custom'} — ${c.title}`
        }));
      });
    }

    if (assigneeSelect) {
      assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
      availableUsers.forEach(u => {
        assigneeSelect.appendChild(UI.createElement('option', {
          attributes: { value: String(u.id) },
          textContent: `${u.fullName} (${u.role})`
        }));
      });
    }

    updateDefaultDueDate('MEDIUM');
    UI.openModal('modal-create-finding');
  }

  function updateDefaultDueDate(severity) {
    const dueInput = document.getElementById('create-f-due');
    if (!dueInput) return;
    const daysToAdd = severity === 'CRITICAL' ? 3 : (severity === 'HIGH' ? 7 : (severity === 'MEDIUM' ? 14 : 30));
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    dueInput.value = target.toISOString().split('T')[0];
  }

  /**
   * Handle Create Finding Submission
   */
  async function handleCreateFinding(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('btn-save-finding');
    if (saveBtn) saveBtn.disabled = true;

    const data = {
      assetId: document.getElementById('create-f-asset')?.value,
      catalogId: document.getElementById('create-f-catalog')?.value,
      title: document.getElementById('create-f-title')?.value.trim(),
      severity: document.getElementById('create-f-sev')?.value,
      priority: document.getElementById('create-f-prio')?.value,
      dueDate: document.getElementById('create-f-due')?.value,
      assigneeId: document.getElementById('create-f-assignee')?.value || null,
      description: document.getElementById('create-f-desc')?.value.trim() || '',
      remediationNotes: document.getElementById('create-f-notes')?.value.trim() || ''
    };

    try {
      await API.findings.create(data);
      UI.showToast(`Finding "${data.title}" logged successfully.`, 'success');
      UI.closeModal('modal-create-finding');
      await loadFindings();
    } catch (err) {
      UI.showToast(`Failed to log finding: ${err.message}`, 'error');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  /**
   * Open Transition Modal & Dynamically calculate allowed next states
   */
  function openTransitionModal(finding) {
    document.getElementById('trans-finding-id').value = finding.id;

    const curStatusEl = document.getElementById('trans-current-status');
    if (curStatusEl) {
      curStatusEl.innerHTML = '';
      curStatusEl.appendChild(UI.renderStatusBadge(finding.status));
    }

    const newStatusSelect = document.getElementById('trans-new-status');
    const reasonInput = document.getElementById('trans-reason');
    if (reasonInput) reasonInput.value = '';

    if (newStatusSelect) {
      newStatusSelect.innerHTML = '';

      // State Machine Transition Matrix
      const transitionMap = {
        'OPEN': [
          { status: 'IN_PROGRESS', label: 'IN_PROGRESS (Begin Remediation)' },
          { status: 'FALSE_POSITIVE', label: 'FALSE_POSITIVE (Dismiss Non-Issue)' },
          { status: 'RISK_ACCEPTED', label: 'RISK_ACCEPTED (Formal Business Exception)' }
        ],
        'IN_PROGRESS': [
          { status: 'UNDER_REVIEW', label: 'UNDER_REVIEW (Submit Fix for Verification)' },
          { status: 'OPEN', label: 'OPEN (Abandon Work / Reassign)' }
        ],
        'UNDER_REVIEW': [
          { status: 'CLOSED', label: 'CLOSED (Verify Fix & Mitigate)' },
          { status: 'IN_PROGRESS', label: 'IN_PROGRESS (Reject Fix / Request Rework)' }
        ],
        'CLOSED': [
          { status: 'REOPENED', label: 'REOPENED (Regression Detected)' }
        ],
        'REOPENED': [
          { status: 'IN_PROGRESS', label: 'IN_PROGRESS (Resume Remediation)' },
          { status: 'FALSE_POSITIVE', label: 'FALSE_POSITIVE (Dismiss)' },
          { status: 'RISK_ACCEPTED', label: 'RISK_ACCEPTED (Exception Granted)' }
        ],
        'FALSE_POSITIVE': [
          { status: 'OPEN', label: 'OPEN (Re-evaluate as Real Finding)' }
        ],
        'RISK_ACCEPTED': [
          { status: 'OPEN', label: 'OPEN (Exception Expired / Revoked)' }
        ]
      };

      const allowed = transitionMap[finding.status] || [];

      if (allowed.length === 0) {
        newStatusSelect.appendChild(UI.createElement('option', {
          textContent: 'No transitions available from current state'
        }));
      } else {
        allowed.forEach(opt => {
          newStatusSelect.appendChild(UI.createElement('option', {
            attributes: { value: opt.status },
            textContent: opt.label
          }));
        });
      }
    }

    UI.openModal('modal-transition-finding');
  }

  /**
   * Handle Status Transition Submission
   */
  async function handleTransitionSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-transition');
    if (btn) btn.disabled = true;

    const id = document.getElementById('trans-finding-id')?.value;
    const newStatus = document.getElementById('trans-new-status')?.value;
    const reason = document.getElementById('trans-reason')?.value.trim();

    if (!reason || reason.length < 10) {
      UI.showToast('Please provide a justification of at least 10 characters for auditability.', 'warning');
      if (btn) btn.disabled = false;
      return;
    }

    try {
      await API.findings.transitionStatus(id, newStatus, reason);
      UI.showToast(`Status updated to ${newStatus}.`, 'success');
      UI.closeModal('modal-transition-finding');
      await loadFindings();

      if (activeDrawerFindingId === Number(id)) {
        await openFindingDrawer(id);
      }
    } catch (err) {
      UI.showToast(`State transition failed: ${err.message}`, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Open Finding Slide-over Drawer
   */
  async function openFindingDrawer(findingId) {
    activeDrawerFindingId = Number(findingId);
    UI.openDrawer('drawer-finding-detail');

    try {
      const res = await API.findings.get(findingId);
      const f = res.data;
      if (!f) return;

      document.getElementById('drawer-finding-id').textContent = `FINDING #${f.id}`;
      document.getElementById('drawer-finding-title').textContent = f.title;

      const badgeStatus = document.getElementById('drawer-badge-status');
      const badgeSev = document.getElementById('drawer-badge-sev');
      const badgePrio = document.getElementById('drawer-badge-prio');
      const badgeSla = document.getElementById('drawer-badge-sla');

      if (badgeStatus) { badgeStatus.innerHTML = ''; badgeStatus.appendChild(UI.renderStatusBadge(f.status)); }
      if (badgeSev) { badgeSev.innerHTML = ''; badgeSev.appendChild(UI.renderSeverityBadge(f.severity)); }
      if (badgePrio) { badgePrio.innerHTML = ''; badgePrio.appendChild(UI.renderPriorityBadge(f.priority)); }
      if (badgeSla) {
        badgeSla.innerHTML = '';
        if (f.isOverdue) {
          badgeSla.appendChild(UI.createElement('span', { className: 'badge badge-sev-critical', textContent: `SLA Overdue (+${f.daysOverdue}d)` }));
        } else {
          badgeSla.appendChild(UI.createElement('span', { className: 'badge badge-outline', textContent: `Due: ${UI.formatDate(f.dueDate)}` }));
        }
      }

      document.getElementById('drawer-asset-name').textContent = f.asset ? `${f.asset.name} (${f.asset.environment})` : '—';
      document.getElementById('drawer-catalog-cve').textContent = f.catalog ? (f.catalog.cveId || 'Custom Advisory') : '—';
      document.getElementById('drawer-assignee-name').textContent = f.assignee ? f.assignee.fullName : 'Unassigned';
      document.getElementById('drawer-discovered-date').textContent = UI.formatDate(f.discoveredDate);
      document.getElementById('drawer-description').textContent = f.description || 'No discovery notes recorded.';
      document.getElementById('drawer-remediation').textContent = f.remediationNotes || 'No specific guidance attached.';

      // Render History Timeline
      renderTimeline(f.history || []);

      // Render Comments
      renderComments(f.comments || []);
    } catch (err) {
      UI.showToast(`Failed to load finding detail: ${err.message}`, 'error');
    }
  }

  function renderTimeline(history) {
    const container = document.getElementById('drawer-timeline');
    if (!container) return;
    container.innerHTML = '';

    if (history.length === 0) {
      container.innerHTML = '<p class="text-muted" style="font-size: 0.8rem;">No status transitions recorded yet.</p>';
      return;
    }

    history.forEach(item => {
      const itemEl = UI.createElement('div', { className: 'timeline-item' });
      const dot = UI.createElement('div', { className: 'timeline-dot' });

      const meta = UI.createElement('div', {
        className: 'timeline-meta',
        textContent: `${UI.formatDateTime(item.createdAt)} by ${item.changedByName || 'System'}`
      });

      const content = UI.createElement('div', { className: 'timeline-content' });
      const titleSpan = UI.createElement('div', {
        style: 'font-weight: 600; font-size: 0.82rem; margin-bottom: 2px;',
        textContent: item.oldStatus ? `${item.oldStatus} → ${item.newStatus}` : `Created as ${item.newStatus}`
      });
      const reasonSpan = UI.createElement('div', {
        style: 'font-size: 0.8rem; color: var(--color-text-secondary);',
        textContent: item.changeReason
      });

      content.appendChild(titleSpan);
      content.appendChild(reasonSpan);

      itemEl.appendChild(dot);
      itemEl.appendChild(meta);
      itemEl.appendChild(content);
      container.appendChild(itemEl);
    });
  }

  function renderComments(comments) {
    const list = document.getElementById('drawer-comments-list');
    if (!list) return;
    list.innerHTML = '';

    if (comments.length === 0) {
      list.innerHTML = '<p class="text-muted" style="font-size: 0.8rem; padding: 4px 0;">No comments on this finding yet.</p>';
      return;
    }

    comments.forEach(c => {
      const item = UI.createElement('div', {
        style: 'background-color: var(--color-bg-app); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: 8px 12px; font-size: 0.85rem;'
      });
      const header = UI.createElement('div', {
        style: 'display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 4px;'
      });
      header.appendChild(UI.createElement('strong', { textContent: c.authorName || 'User' }));
      header.appendChild(UI.createElement('span', { textContent: UI.formatDateTime(c.createdAt) }));

      const text = UI.createElement('div', { textContent: c.commentText });

      item.appendChild(header);
      item.appendChild(text);
      list.appendChild(item);
    });
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!activeDrawerFindingId) return;

    const input = document.getElementById('input-comment-text');
    const text = input?.value.trim();
    if (!text) return;

    try {
      await API.findings.addComment(activeDrawerFindingId, text);
      input.value = '';
      UI.showToast('Comment added.', 'info');
      // Refresh drawer
      await openFindingDrawer(activeDrawerFindingId);
    } catch (err) {
      UI.showToast(`Failed to post comment: ${err.message}`, 'error');
    }
  }
})();
