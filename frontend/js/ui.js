/**
 * VulnTrack UI Utilities & Safe DOM Rendering Helpers
 * 
 * Enforces safe rendering (avoiding raw innerHTML for untrusted strings),
 * accessible modal/drawer controls, high-contrast badges, toasts, and pagination.
 */

const UI = (function() {
  /**
   * Safely create a DOM element without innerHTML injection risks
   */
  function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) el.className = options.className;
    if (options.textContent !== undefined) el.textContent = options.textContent;
    if (options.attributes) {
      for (const [key, val] of Object.entries(options.attributes)) {
        if (val !== null && val !== undefined) el.setAttribute(key, val);
      }
    }
    if (options.children && Array.isArray(options.children)) {
      options.children.forEach(child => {
        if (typeof child === 'string') el.appendChild(document.createTextNode(child));
        else if (child instanceof Node) el.appendChild(child);
      });
    }
    if (options.events) {
      for (const [evt, handler] of Object.entries(options.events)) {
        el.addEventListener(evt, handler);
      }
    }
    return el;
  }

  /**
   * Escape HTML entities when text must be rendered in string contexts
   */
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Date formatting (e.g. "Oct 24, 2026")
   */
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return String(dateStr);
    }
  }

  /**
   * Date & time formatting
   */
  function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(dateStr);
    }
  }

  /**
   * Badge Rendering Helpers
   */
  function renderSeverityBadge(severity) {
    const sev = (severity || 'INFO').toUpperCase();
    const map = {
      'CRITICAL': 'badge-sev-critical',
      'HIGH': 'badge-sev-high',
      'MEDIUM': 'badge-sev-medium',
      'LOW': 'badge-sev-low',
      'INFO': 'badge-sev-info'
    };
    return createElement('span', {
      className: `badge ${map[sev] || 'badge-sev-info'}`,
      textContent: sev
    });
  }

  function renderPriorityBadge(priority) {
    const p = (priority || 'P3').toUpperCase();
    const map = {
      'P1': 'badge-prio-p1',
      'P2': 'badge-prio-p2',
      'P3': 'badge-prio-p3',
      'P4': 'badge-prio-p4'
    };
    return createElement('span', {
      className: `badge ${map[p] || 'badge-prio-p3'}`,
      textContent: p
    });
  }

  function renderStatusBadge(status) {
    const st = (status || 'OPEN').toUpperCase();
    const map = {
      'OPEN': { class: 'badge-status-open', label: 'Open' },
      'IN_PROGRESS': { class: 'badge-status-in_progress', label: 'In Progress' },
      'UNDER_REVIEW': { class: 'badge-status-under_review', label: 'Under Review' },
      'CLOSED': { class: 'badge-status-closed', label: 'Closed' },
      'FALSE_POSITIVE': { class: 'badge-status-false_positive', label: 'False Positive' },
      'RISK_ACCEPTED': { class: 'badge-status-risk_accepted', label: 'Risk Accepted' },
      'REOPENED': { class: 'badge-status-reopened', label: 'Reopened' }
    };
    const conf = map[st] || { class: 'badge-status-open', label: st };
    return createElement('span', {
      className: `badge ${conf.class}`,
      textContent: conf.label
    });
  }

  function renderEnvironmentBadge(env) {
    const e = (env || 'DEV').toUpperCase();
    let cls = 'badge-env-dev';
    if (e.includes('PROD')) cls = 'badge-env-prod';
    else if (e.includes('STAG')) cls = 'badge-env-staging';
    return createElement('span', {
      className: `badge ${cls}`,
      textContent: e
    });
  }

  function renderCriticalityBadge(crit) {
    const c = (crit || 'MEDIUM').toUpperCase();
    const map = {
      'CRITICAL': 'badge-sev-critical',
      'HIGH': 'badge-sev-high',
      'MEDIUM': 'badge-sev-medium',
      'LOW': 'badge-sev-low'
    };
    return createElement('span', {
      className: `badge ${map[c] || 'badge-sev-medium'}`,
      textContent: c
    });
  }

  /**
   * Toast Notification System
   */
  let toastContainer = null;
  function ensureToastContainer() {
    if (!toastContainer) {
      toastContainer = document.querySelector('.toast-container');
      if (!toastContainer) {
        toastContainer = createElement('div', { className: 'toast-container', attributes: { 'aria-live': 'polite' } });
        document.body.appendChild(toastContainer);
      }
    }
  }

  function showToast(message, type = 'info', duration = 3500) {
    ensureToastContainer();
    const toast = createElement('div', {
      className: `toast toast-${type}`,
      textContent: message
    });
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  /**
   * Modal Dialog Controls
   */
  function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Focus first focusable element
    const focusable = el.querySelector('input, select, textarea, button:not([disabled])');
    if (focusable) focusable.focus();
  }

  function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Slide-over Drawer Controls
   */
  function openDrawer(drawerId) {
    const el = document.getElementById(drawerId);
    if (!el) return;
    el.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModalOrDrawer(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Client-Side Pagination Controller
   */
  function paginate(items = [], currentPage = 1, pageSize = CONFIG.DEFAULT_PAGE_SIZE) {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, currentPage), totalPages);
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const pagedItems = items.slice(startIdx, endIdx);

    return {
      pagedItems,
      total,
      totalPages,
      page,
      pageSize,
      startIdx: total === 0 ? 0 : startIdx + 1,
      endIdx: Math.min(endIdx, total)
    };
  }

  function renderPagination(container, pState, onPageChange) {
    if (!container) return;
    container.innerHTML = '';

    const info = createElement('div', {
      className: 'pagination-info',
      textContent: `Showing ${pState.startIdx} to ${pState.endIdx} of ${pState.total} records`
    });

    const controls = createElement('div', { className: 'pagination-controls' });

    const prevBtn = createElement('button', {
      className: 'btn btn-secondary btn-sm',
      textContent: '← Previous',
      attributes: pState.page <= 1 ? { disabled: 'true' } : {},
      events: {
        click: () => onPageChange(pState.page - 1)
      }
    });

    const pageIndicator = createElement('span', {
      className: 'pagination-page-indicator',
      textContent: `Page ${pState.page} of ${pState.totalPages}`
    });

    const nextBtn = createElement('button', {
      className: 'btn btn-secondary btn-sm',
      textContent: 'Next →',
      attributes: pState.page >= pState.totalPages ? { disabled: 'true' } : {},
      events: {
        click: () => onPageChange(pState.page + 1)
      }
    });

    controls.appendChild(prevBtn);
    controls.appendChild(pageIndicator);
    controls.appendChild(nextBtn);

    container.appendChild(info);
    container.appendChild(controls);
  }

  return {
    createElement,
    escapeHTML,
    formatDate,
    formatDateTime,
    renderSeverityBadge,
    renderPriorityBadge,
    renderStatusBadge,
    renderEnvironmentBadge,
    renderCriticalityBadge,
    showToast,
    openModal,
    closeModal,
    openDrawer,
    closeModalOrDrawer,
    paginate,
    renderPagination
  };
})();
