/**
 * VulnTrack Authentication & Session Bootstrap Module
 * 
 * Manages active user session verification, role-aware navbar display,
 * environment indicators, and user logout.
 */

const Auth = (function() {
  let currentUser = null;

  async function init() {
    const isLoginPage = window.location.pathname.endsWith('login.html');

    try {
      const res = await API.auth.me();
      currentUser = (res && res.data && res.data.user) ? res.data.user : null;

      if (!currentUser && !isLoginPage) {
        window.location.href = 'login.html';
        return;
      }

      if (currentUser && isLoginPage) {
        window.location.href = 'index.html';
        return;
      }

      if (currentUser) {
        renderUserSessionUI(currentUser);
      }
    } catch (err) {
      if (!isLoginPage) {
        window.location.href = 'login.html';
      }
    }

    updateEnvironmentIndicator();
    setupMobileMenu();
  }

  function renderUserSessionUI(user) {
    // Populate user profile widgets if present on current page
    const nameEl = document.querySelector('.user-name');
    const roleEl = document.querySelector('.user-role-badge');
    const avatarEl = document.querySelector('.user-avatar');

    if (nameEl) nameEl.textContent = user.fullName || user.username;
    if (roleEl) roleEl.textContent = user.role ? user.role.toUpperCase() : 'USER';
    if (avatarEl) {
      const initials = (user.fullName || user.username || 'U')
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
      avatarEl.textContent = initials;
    }

    // Role-aware visibility: mark body with role class for CSS hooks if needed
    if (user.role) {
      document.body.classList.add(`role-${user.role.toLowerCase()}`);
    }

    // Bind logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await API.auth.logout();
        } catch {
          // Continue redirect even if network fails
        }
        window.location.href = 'login.html';
      });
    }
  }

  function updateEnvironmentIndicator() {
    const indicator = document.querySelector('.env-indicator');
    if (!indicator) return;

    if (API.isMock()) {
      indicator.className = 'env-indicator mock';
      indicator.innerHTML = '<span class="env-dot"></span><span>Dev Mock Mode</span>';
      indicator.title = 'Running on isolated in-memory test data. Boot Express on :3000 to connect to live MySQL.';
    } else {
      indicator.className = 'env-indicator';
      indicator.innerHTML = '<span class="env-dot"></span><span>Live API</span>';
      indicator.title = 'Connected to Node.js/Express backend on :3000.';
    }
  }

  function setupMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.app-sidebar');
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });

      // Close when clicking outside
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }
  }

  return {
    init,
    getUser: () => currentUser,
    isAdmin: () => currentUser && currentUser.role === 'admin',
    isAnalyst: () => currentUser && (currentUser.role === 'analyst' || currentUser.role === 'admin'),
    isDeveloper: () => currentUser && currentUser.role === 'developer'
  };
})();

// Auto-run session bootstrap when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
