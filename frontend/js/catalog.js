/**
 * VulnTrack Vulnerability Catalog Controller
 * 
 * Manages the standard CVE/CWE dictionary and master vulnerability definitions.
 */

(function() {
  let allCatalog = [];
  let currentPage = 1;
  const pageSize = CONFIG.DEFAULT_PAGE_SIZE;

  document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    loadCatalog();
  });

  function initEvents() {
    // Search with debounce
    const searchInput = document.getElementById('catalog-search');
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          currentPage = 1;
          loadCatalog();
        }, 250);
      });
    }

    // Severity filter
    const sevFilter = document.getElementById('catalog-filter-sev');
    if (sevFilter) {
      sevFilter.addEventListener('change', () => {
        currentPage = 1;
        loadCatalog();
      });
    }

    // Reset button
    const resetBtn = document.getElementById('reset-catalog-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (sevFilter) sevFilter.value = '';
        currentPage = 1;
        loadCatalog();
      });
    }

    // Open Add Modal
    const openAddBtn = document.getElementById('open-add-catalog-modal');
    if (openAddBtn) {
      openAddBtn.addEventListener('click', () => {
        const form = document.getElementById('form-add-catalog');
        if (form) form.reset();
        UI.openModal('modal-add-catalog');
      });
    }

    // Submit Add Form
    const addForm = document.getElementById('form-add-catalog');
    if (addForm) {
      addForm.addEventListener('submit', handleAddCatalog);
    }
  }

  async function loadCatalog() {
    const search = document.getElementById('catalog-search')?.value.trim();
    const severity = document.getElementById('catalog-filter-sev')?.value;

    const tbody = document.getElementById('catalog-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr><td colspan="6" style="text-align: center; padding: 25px;">
          <div class="skeleton-row"></div>
          <div class="skeleton-row"></div>
        </td></tr>
      `;
    }

    try {
      const res = await API.catalog.list({ search, severity });
      allCatalog = res.data || [];
      renderTable();
    } catch (err) {
      UI.showToast(`Failed to load catalog: ${err.message}`, 'error');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 25px; color: #f87171;">Failed to load catalog: ${UI.escapeHTML(err.message)}</td></tr>`;
      }
    }
  }

  function renderTable() {
    const tbody = document.getElementById('catalog-table-body');
    const paginationContainer = document.getElementById('catalog-pagination');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (allCatalog.length === 0) {
      const emptyRow = UI.createElement('tr', {
        children: [
          UI.createElement('td', {
            attributes: { colspan: '6' },
            children: [
              UI.createElement('div', {
                className: 'empty-state',
                children: [
                  UI.createElement('h3', { textContent: 'No catalog definitions found' }),
                  UI.createElement('p', { textContent: 'No matching vulnerability templates found.' }),
                  UI.createElement('button', {
                    className: 'btn btn-primary btn-sm',
                    textContent: '+ Add CVE Definition',
                    events: { click: () => UI.openModal('modal-add-catalog') }
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

    const pState = UI.paginate(allCatalog, currentPage, pageSize);

    pState.pagedItems.forEach(item => {
      const tr = UI.createElement('tr');

      // 1. CVE Identifier
      const cveTd = UI.createElement('td');
      if (item.cveId) {
        cveTd.appendChild(UI.createElement('span', {
          className: 'badge badge-outline text-mono',
          style: 'border-color: #38bdf8; color: #38bdf8;',
          textContent: item.cveId
        }));
      } else {
        cveTd.textContent = 'Custom / Zero-Day';
      }

      // 2. CWE Identifier
      const cweTd = UI.createElement('td', {
        className: 'text-mono',
        style: 'font-size: 0.8rem;',
        textContent: item.cweId || '—'
      });

      // 3. Title & Description
      const descTd = UI.createElement('td');
      const titleEl = UI.createElement('div', {
        className: 'table-cell-title',
        textContent: item.title
      });
      const descEl = UI.createElement('p', {
        style: 'font-size: 0.8rem; color: var(--color-text-muted); margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;',
        textContent: item.description
      });
      descTd.appendChild(titleEl);
      descTd.appendChild(descEl);

      // 4. Default Severity
      const sevTd = UI.createElement('td');
      sevTd.appendChild(UI.renderSeverityBadge(item.defaultSeverity));

      // 5. CVSS Base Score
      const cvssTd = UI.createElement('td');
      const score = parseFloat(item.cvssBaseScore) || 0.0;
      let scoreColor = '#38bdf8';
      if (score >= 9.0) scoreColor = '#ef4444';
      else if (score >= 7.0) scoreColor = '#f97316';
      else if (score >= 4.0) scoreColor = '#eab308';

      cvssTd.appendChild(UI.createElement('span', {
        className: 'text-mono',
        style: `font-weight: 700; color: ${scoreColor};`,
        textContent: score.toFixed(1)
      }));

      // 6. Remediation Advisory
      const remTd = UI.createElement('td', {
        style: 'font-size: 0.82rem; color: var(--color-text-secondary); max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
        textContent: item.remediationGuidance || 'No specific vendor advisory recorded.'
      });

      tr.appendChild(cveTd);
      tr.appendChild(cweTd);
      tr.appendChild(descTd);
      tr.appendChild(sevTd);
      tr.appendChild(cvssTd);
      tr.appendChild(remTd);

      tbody.appendChild(tr);
    });

    UI.renderPagination(paginationContainer, pState, (newPage) => {
      currentPage = newPage;
      renderTable();
    });
  }

  async function handleAddCatalog(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('btn-save-catalog');
    if (saveBtn) saveBtn.disabled = true;

    const data = {
      cveId: document.getElementById('catalog-cve')?.value.trim() || null,
      cweId: document.getElementById('catalog-cwe')?.value.trim() || null,
      title: document.getElementById('catalog-title')?.value.trim(),
      defaultSeverity: document.getElementById('catalog-sev')?.value,
      cvssBaseScore: parseFloat(document.getElementById('catalog-cvss')?.value) || 5.0,
      description: document.getElementById('catalog-desc')?.value.trim(),
      remediationGuidance: document.getElementById('catalog-remediation')?.value.trim() || null
    };

    try {
      await API.catalog.create(data);
      UI.showToast(`Catalog item "${data.title}" added successfully.`, 'success');
      UI.closeModal('modal-add-catalog');
      await loadCatalog();
    } catch (err) {
      UI.showToast(`Failed to add definition: ${err.message}`, 'error');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }
})();
