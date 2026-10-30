/**
 * VulnTrack Dashboard Controller
 * Fetches real API metrics and renders KPI statistics, visual progress bars,
 * top vulnerable assets, and overdue findings.
 */

document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboardData();
});

async function loadDashboardData() {
  try {
    // Parallel fetch of all dashboard endpoints
    const [statsRes, sevRes, statusRes, topAssetsRes, overdueRes] = await Promise.all([
      API.dashboard.getStats(),
      API.dashboard.getBySeverity(),
      API.dashboard.getByStatus(),
      API.dashboard.getTopAssets(5),
      API.dashboard.getOverdue()
    ]);

    renderKPIStats(statsRes.data || {});
    renderSeverityDistribution(sevRes.data || []);
    renderStatusPipeline(statusRes.data || []);
    renderTopAssets(topAssetsRes.data || []);
    renderOverdueQueue(overdueRes.data || []);
  } catch (err) {
    UI.showToast(`Failed to load dashboard metrics: ${err.message}`, 'error');
  }
}

/**
 * 1. Render Top KPI Metric Cards
 */
function renderKPIStats(stats) {
  const activeEl = document.getElementById('stat-active');
  const critHighEl = document.getElementById('stat-critical-high');
  const overdueEl = document.getElementById('stat-overdue');
  const mttrEl = document.getElementById('stat-mttr');
  const navCnt = document.getElementById('nav-active-findings-cnt');

  const totalActive = stats.totalActive || 0;
  const criticalHigh = (stats.criticalCount || 0) + (stats.highCount || 0);
  const overdue = stats.overdueCount || 0;
  const mttr = stats.mttrDays !== undefined ? stats.mttrDays : '—';

  if (activeEl) activeEl.textContent = totalActive;
  if (critHighEl) critHighEl.textContent = criticalHigh;
  if (overdueEl) overdueEl.textContent = overdue;
  if (mttrEl) mttrEl.textContent = mttr;
  if (navCnt) navCnt.textContent = totalActive;
}

/**
 * 2. Render Severity Breakdown Progress Bars
 */
function renderSeverityDistribution(items) {
  const container = document.getElementById('severity-dist-container');
  if (!container) return;
  container.innerHTML = '';

  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    container.innerHTML = '<p class="text-muted" style="padding: 10px 0;">No active findings recorded in database.</p>';
    return;
  }

  const colorMap = {
    'CRITICAL': '#dc2626',
    'HIGH': '#ea580c',
    'MEDIUM': '#ca8a04',
    'LOW': '#2563eb',
    'INFO': '#0d9488'
  };

  items.forEach(item => {
    const pct = total > 0 ? ((item.count / total) * 100).toFixed(0) : 0;
    const color = colorMap[item.severity] || '#64748b';

    const itemEl = UI.createElement('div', { className: 'dist-item' });

    const meta = UI.createElement('div', { className: 'dist-meta' });
    const labelWrap = UI.createElement('span', {
      className: 'text-mono',
      textContent: `${item.severity}`
    });
    const countWrap = UI.createElement('span', {
      textContent: `${item.count} (${pct}%)`
    });
    meta.appendChild(labelWrap);
    meta.appendChild(countWrap);

    const track = UI.createElement('div', { className: 'dist-bar-track' });
    const fill = UI.createElement('div', {
      className: 'dist-bar-fill',
      attributes: {
        style: `width: ${pct}%; background-color: ${color};`
      }
    });
    track.appendChild(fill);

    itemEl.appendChild(meta);
    itemEl.appendChild(track);
    container.appendChild(itemEl);
  });
}

/**
 * 3. Render Status Pipeline Progress
 */
function renderStatusPipeline(items) {
  const container = document.getElementById('status-dist-container');
  if (!container) return;
  container.innerHTML = '';

  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    container.innerHTML = '<p class="text-muted" style="padding: 10px 0;">No findings recorded in pipeline.</p>';
    return;
  }

  const statusLabelMap = {
    'OPEN': { label: 'Open / Triaging', color: '#38bdf8' },
    'IN_PROGRESS': { label: 'Remediation In Progress', color: '#c084fc' },
    'UNDER_REVIEW': { label: 'Under Review / Verification', color: '#fb923c' },
    'CLOSED': { label: 'Verified & Closed', color: '#4ade80' },
    'FALSE_POSITIVE': { label: 'False Positive', color: '#a1a1aa' },
    'RISK_ACCEPTED': { label: 'Risk Accepted', color: '#818cf8' },
    'REOPENED': { label: 'Reopened Regression', color: '#f472b6' }
  };

  items.forEach(item => {
    const info = statusLabelMap[item.status] || { label: item.status, color: '#64748b' };
    const pct = total > 0 ? ((item.count / total) * 100).toFixed(0) : 0;

    const itemEl = UI.createElement('div', { className: 'dist-item' });

    const meta = UI.createElement('div', { className: 'dist-meta' });
    const labelSpan = UI.createElement('span', { textContent: info.label });
    const countSpan = UI.createElement('span', { textContent: `${item.count} (${pct}%)` });
    meta.appendChild(labelSpan);
    meta.appendChild(countSpan);

    const track = UI.createElement('div', { className: 'dist-bar-track' });
    const fill = UI.createElement('div', {
      className: 'dist-bar-fill',
      attributes: {
        style: `width: ${pct}%; background-color: ${info.color};`
      }
    });
    track.appendChild(fill);

    itemEl.appendChild(meta);
    itemEl.appendChild(track);
    container.appendChild(itemEl);
  });
}

/**
 * 4. Render Top Vulnerable Assets Table
 */
function renderTopAssets(assets) {
  const tbody = document.getElementById('top-assets-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!assets || assets.length === 0) {
    const row = UI.createElement('tr', {
      children: [
        UI.createElement('td', {
          attributes: { colspan: '4', style: 'text-align: center; color: var(--color-text-muted); padding: 18px;' },
          textContent: 'No assets with active vulnerabilities found.'
        })
      ]
    });
    tbody.appendChild(row);
    return;
  }

  assets.forEach(a => {
    const tr = UI.createElement('tr');

    const nameTd = UI.createElement('td');
    const assetLink = UI.createElement('a', {
      className: 'table-cell-title',
      attributes: { href: `findings.html?assetId=${a.assetId}`, title: 'Filter findings for this asset' },
      textContent: a.assetName
    });
    nameTd.appendChild(assetLink);

    const envTd = UI.createElement('td');
    envTd.appendChild(UI.renderEnvironmentBadge(a.environment));

    const totalTd = UI.createElement('td', {
      textContent: String(a.openFindingsCount)
    });

    const critTd = UI.createElement('td');
    if (a.criticalFindingsCount > 0) {
      critTd.appendChild(UI.createElement('span', {
        className: 'badge badge-sev-critical',
        textContent: `${a.criticalFindingsCount} Critical`
      }));
    } else {
      critTd.textContent = '0';
    }

    tr.appendChild(nameTd);
    tr.appendChild(envTd);
    tr.appendChild(totalTd);
    tr.appendChild(critTd);
    tbody.appendChild(tr);
  });
}

/**
 * 5. Render Overdue SLA Queue Table
 */
function renderOverdueQueue(overdueList) {
  const tbody = document.getElementById('overdue-findings-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!overdueList || overdueList.length === 0) {
    const row = UI.createElement('tr', {
      children: [
        UI.createElement('td', {
          attributes: { colspan: '4', style: 'text-align: center; color: var(--color-text-muted); padding: 18px;' },
          textContent: 'All active vulnerabilities are within SLA deadlines.'
        })
      ]
    });
    tbody.appendChild(row);
    return;
  }

  overdueList.slice(0, 5).forEach(f => {
    const tr = UI.createElement('tr');

    const titleTd = UI.createElement('td');
    const link = UI.createElement('a', {
      className: 'table-cell-title',
      attributes: { href: `findings.html?search=${encodeURIComponent(f.title)}` },
      textContent: f.title
    });
    titleTd.appendChild(link);

    const sevTd = UI.createElement('td');
    sevTd.appendChild(UI.renderSeverityBadge(f.severity));

    const dueTd = UI.createElement('td', {
      textContent: UI.formatDate(f.dueDate)
    });

    const overdueTd = UI.createElement('td');
    overdueTd.appendChild(UI.createElement('span', {
      className: 'badge badge-sev-critical',
      textContent: `+${f.daysOverdue} days`
    }));

    tr.appendChild(titleTd);
    tr.appendChild(sevTd);
    tr.appendChild(dueTd);
    tr.appendChild(overdueTd);
    tbody.appendChild(tr);
  });
}
