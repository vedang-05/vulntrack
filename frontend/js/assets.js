/**
 * VulnTrack Asset Inventory Controller
 * 
 * Handles listing, client-side pagination, searching, filtering,
 * registering new assets, editing attributes, and safe archiving.
 */

(function() {
  let allAssets = [];
  let currentPage = 1;
  const pageSize = CONFIG.DEFAULT_PAGE_SIZE;
  let targetAssetForArchive = null;

  document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    loadAssets();
  });

  function initEvents() {
    // Search with 250ms debounce
    const searchInput = document.getElementById('asset-search');
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          currentPage = 1;
          loadAssets();
        }, 250);
      });
    }

    // Filter dropdowns
    const envFilter = document.getElementById('asset-filter-env');
    const critFilter = document.getElementById('asset-filter-crit');
    const archivedFilter = document.getElementById('asset-filter-archived');
    const resetBtn = document.getElementById('reset-asset-filters');

    if (envFilter) envFilter.addEventListener('change', () => { currentPage = 1; loadAssets(); });
    if (critFilter) critFilter.addEventListener('change', () => { currentPage = 1; loadAssets(); });
    if (archivedFilter) archivedFilter.addEventListener('change', () => { currentPage = 1; loadAssets(); });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (envFilter) envFilter.value = '';
        if (critFilter) critFilter.value = '';
        if (archivedFilter) archivedFilter.checked = false;
        currentPage = 1;
        loadAssets();
      });
    }

    // Register Asset Modal Button
    const openCreateBtn = document.getElementById('open-register-asset-modal');
    if (openCreateBtn) {
      openCreateBtn.addEventListener('click', () => {
        const form = document.getElementById('form-create-asset');
        if (form) form.reset();
        UI.openModal('modal-create-asset');
      });
    }

    // Form: Create Asset
    const createForm = document.getElementById('form-create-asset');
    if (createForm) {
      createForm.addEventListener('submit', handleCreateAsset);
    }

    // Form: Edit Asset
    const editForm = document.getElementById('form-edit-asset');
    if (editForm) {
      editForm.addEventListener('submit', handleUpdateAsset);
    }

    // Confirm Archive Button
    const confirmArchiveBtn = document.getElementById('btn-confirm-archive');
    if (confirmArchiveBtn) {
      confirmArchiveBtn.addEventListener('click', handleConfirmArchive);
    }
  }

  /**
   * Load Assets from API with active filters
   */
  async function loadAssets() {
    const search = document.getElementById('asset-search')?.value.trim();
    const env = document.getElementById('asset-filter-env')?.value;
    const crit = document.getElementById('asset-filter-crit')?.value;
    const includeArchived = document.getElementById('asset-filter-archived')?.checked;

    const tbody = document.getElementById('assets-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr><td colspan="9" style="text-align: center; padding: 25px;">
          <div class="skeleton-row"></div>
          <div class="skeleton-row"></div>
        </td></tr>
      `;
    }

    try {
      const res = await API.assets.list({
        search,
        environment: env,
        criticality: crit,
        includeArchived
      });

      allAssets = res.data || [];
      renderTable();
    } catch (err) {
      UI.showToast(`Failed to load assets: ${err.message}`, 'error');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 25px; color: #f87171;">Failed to load assets: ${UI.escapeHTML(err.message)}</td></tr>`;
      }
    }
  }

  /**
   * Render Asset rows with client-side pagination
   */
  function renderTable() {
    const tbody = document.getElementById('assets-table-body');
    const paginationContainer = document.getElementById('assets-pagination');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (allAssets.length === 0) {
      const emptyRow = UI.createElement('tr', {
        children: [
          UI.createElement('td', {
            attributes: { colspan: '9' },
            children: [
              UI.createElement('div', {
                className: 'empty-state',
                children: [
                  UI.createElement('h3', { textContent: 'No assets found' }),
                  UI.createElement('p', { textContent: 'No matching IT infrastructure assets found for the specified filters.' }),
                  UI.createElement('button', {
                    className: 'btn btn-primary btn-sm',
                    textContent: '+ Register New Asset',
                    events: { click: () => UI.openModal('modal-create-asset') }
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

    const pState = UI.paginate(allAssets, currentPage, pageSize);

    pState.pagedItems.forEach(asset => {
      const tr = UI.createElement('tr');
      if (asset.isArchived) tr.style.opacity = '0.65';

      // 1. Asset Name (+ archive badge if archived)
      const nameTd = UI.createElement('td');
      const nameWrap = UI.createElement('div', { style: 'display: flex; align-items: center; gap: 8px;' });
      const nameText = UI.createElement('span', { className: 'table-cell-title', textContent: asset.name });
      nameWrap.appendChild(nameText);
      if (asset.isArchived) {
        nameWrap.appendChild(UI.createElement('span', { className: 'badge badge-archived', textContent: 'Archived' }));
      }
      nameTd.appendChild(nameWrap);

      // 2. Asset Type
      const typeTd = UI.createElement('td', {
        className: 'text-mono',
        style: 'font-size: 0.78rem;',
        textContent: asset.assetType
      });

      // 3. IP / Hostname
      const netTd = UI.createElement('td', {
        className: 'text-mono',
        style: 'font-size: 0.78rem;',
        textContent: [asset.ipAddress, asset.hostname].filter(Boolean).join(' / ') || '—'
      });

      // 4. Operating System
      const osTd = UI.createElement('td', {
        textContent: asset.operatingSystem || '—'
      });

      // 5. Environment
      const envTd = UI.createElement('td');
      envTd.appendChild(UI.renderEnvironmentBadge(asset.environment));

      // 6. Criticality
      const critTd = UI.createElement('td');
      critTd.appendChild(UI.renderCriticalityBadge(asset.criticality));

      // 7. Owner Team
      const ownerTd = UI.createElement('td', { textContent: asset.ownerTeam || '—' });

      // 8. Linked Active Findings count
      const findingsTd = UI.createElement('td');
      const count = asset.activeFindingsCount || 0;
      if (count > 0) {
        const link = UI.createElement('a', {
          className: 'badge badge-sev-high',
          attributes: { href: `findings.html?assetId=${asset.id}`, title: 'View active findings for this asset' },
          textContent: `${count} Active`
        });
        findingsTd.appendChild(link);
      } else {
        findingsTd.appendChild(UI.createElement('span', { className: 'text-muted', textContent: '0' }));
      }

      // 9. Actions Column
      const actionsTd = UI.createElement('td', { style: 'text-align: right;' });
      const actionWrap = UI.createElement('div', { className: 'table-actions', style: 'justify-content: flex-end;' });

      // Edit Button
      const editBtn = UI.createElement('button', {
        className: 'btn btn-outline btn-sm',
        textContent: 'Edit',
        events: { click: () => openEditModal(asset) }
      });

      // Archive / Restore Button
      const archiveBtn = UI.createElement('button', {
        className: asset.isArchived ? 'btn btn-secondary btn-sm' : 'btn btn-outline btn-sm',
        textContent: asset.isArchived ? 'Restore' : 'Archive',
        events: { click: () => promptArchive(asset) }
      });

      actionWrap.appendChild(editBtn);
      actionWrap.appendChild(archiveBtn);
      actionsTd.appendChild(actionWrap);

      tr.appendChild(nameTd);
      tr.appendChild(typeTd);
      tr.appendChild(netTd);
      tr.appendChild(osTd);
      tr.appendChild(envTd);
      tr.appendChild(critTd);
      tr.appendChild(ownerTd);
      tr.appendChild(findingsTd);
      tr.appendChild(actionsTd);

      tbody.appendChild(tr);
    });

    UI.renderPagination(paginationContainer, pState, (newPage) => {
      currentPage = newPage;
      renderTable();
    });
  }

  /**
   * Handle Create Asset Form Submission
   */
  async function handleCreateAsset(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('btn-save-new-asset');
    if (saveBtn) saveBtn.disabled = true;

    const data = {
      name: document.getElementById('create-asset-name')?.value.trim(),
      assetType: document.getElementById('create-asset-type')?.value,
      environment: document.getElementById('create-asset-env')?.value,
      ipAddress: document.getElementById('create-asset-ip')?.value.trim() || null,
      hostname: document.getElementById('create-asset-host')?.value.trim() || null,
      operatingSystem: document.getElementById('create-asset-os')?.value.trim() || null,
      criticality: document.getElementById('create-asset-crit')?.value,
      ownerTeam: document.getElementById('create-asset-owner')?.value.trim()
    };

    try {
      await API.assets.create(data);
      UI.showToast(`Asset "${data.name}" registered successfully.`, 'success');
      UI.closeModal('modal-create-asset');
      await loadAssets();
    } catch (err) {
      UI.showToast(`Failed to register asset: ${err.message}`, 'error');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  /**
   * Open Edit Modal & Populate Fields
   */
  function openEditModal(asset) {
    document.getElementById('edit-asset-id').value = asset.id;
    document.getElementById('edit-asset-name').value = asset.name || '';
    document.getElementById('edit-asset-type').value = asset.assetType || 'SERVER';
    document.getElementById('edit-asset-env').value = asset.environment || 'DEVELOPMENT';
    document.getElementById('edit-asset-ip').value = asset.ipAddress || '';
    document.getElementById('edit-asset-host').value = asset.hostname || '';
    document.getElementById('edit-asset-os').value = asset.operatingSystem || '';
    document.getElementById('edit-asset-crit').value = asset.criticality || 'MEDIUM';
    document.getElementById('edit-asset-owner').value = asset.ownerTeam || '';

    UI.openModal('modal-edit-asset');
  }

  /**
   * Handle Update Asset Form Submission
   */
  async function handleUpdateAsset(e) {
    e.preventDefault();
    const updateBtn = document.getElementById('btn-update-asset');
    if (updateBtn) updateBtn.disabled = true;

    const id = document.getElementById('edit-asset-id')?.value;
    const data = {
      name: document.getElementById('edit-asset-name')?.value.trim(),
      assetType: document.getElementById('edit-asset-type')?.value,
      environment: document.getElementById('edit-asset-env')?.value,
      ipAddress: document.getElementById('edit-asset-ip')?.value.trim() || null,
      hostname: document.getElementById('edit-asset-host')?.value.trim() || null,
      operatingSystem: document.getElementById('edit-asset-os')?.value.trim() || null,
      criticality: document.getElementById('edit-asset-crit')?.value,
      ownerTeam: document.getElementById('edit-asset-owner')?.value.trim()
    };

    try {
      await API.assets.update(id, data);
      UI.showToast(`Asset "${data.name}" updated successfully.`, 'success');
      UI.closeModal('modal-edit-asset');
      await loadAssets();
    } catch (err) {
      UI.showToast(`Failed to update asset: ${err.message}`, 'error');
    } finally {
      if (updateBtn) updateBtn.disabled = false;
    }
  }

  /**
   * Open Archive/Restore Confirmation Modal
   */
  function promptArchive(asset) {
    targetAssetForArchive = asset;
    const titleEl = document.getElementById('archive-modal-title');
    const textEl = document.getElementById('archive-modal-text');
    const confirmBtn = document.getElementById('btn-confirm-archive');

    const willArchive = !asset.isArchived;

    if (titleEl) titleEl.textContent = willArchive ? 'Archive Asset' : 'Restore Asset';
    if (textEl) {
      textEl.textContent = willArchive
        ? `Are you sure you want to archive "${asset.name}"?`
        : `Are you sure you want to restore "${asset.name}" back to the active inventory?`;
    }
    if (confirmBtn) {
      confirmBtn.textContent = willArchive ? 'Confirm Archive' : 'Confirm Restore';
      confirmBtn.className = willArchive ? 'btn btn-danger' : 'btn btn-primary';
    }

    UI.openModal('modal-archive-asset');
  }

  /**
   * Handle Archive/Restore Execution
   */
  async function handleConfirmArchive() {
    if (!targetAssetForArchive) return;
    const willArchive = !targetAssetForArchive.isArchived;

    try {
      await API.assets.archive(targetAssetForArchive.id, willArchive);
      UI.showToast(`Asset "${targetAssetForArchive.name}" ${willArchive ? 'archived' : 'restored'}.`, 'success');
      UI.closeModal('modal-archive-asset');
      targetAssetForArchive = null;
      await loadAssets();
    } catch (err) {
      UI.showToast(`Archive operation failed: ${err.message}`, 'error');
    }
  }
})();
