/**
 * VulnTrack Login View Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('submit-btn');
  const errorAlert = document.getElementById('login-error-alert');
  const errorMsg = document.getElementById('login-error-msg');

  // Quick Preset buttons
  document.querySelectorAll('.cred-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      usernameInput.value = btn.dataset.user;
      passwordInput.value = 'Password123!';
      hideError();
      usernameInput.focus();
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const usernameOrEmail = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!usernameOrEmail || !password) {
      showError('Please enter both your username/email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await API.auth.login(usernameOrEmail, password);
      if (res && res.success) {
        UI.showToast('Login successful. Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 300);
      } else {
        showError((res && res.message) || 'Invalid credentials.');
      }
    } catch (err) {
      showError(err.message || 'Unable to sign in. Please verify your credentials or server status.');
    } finally {
      setLoading(false);
    }
  });

  function showError(msg) {
    if (errorAlert && errorMsg) {
      errorMsg.textContent = msg;
      errorAlert.style.display = 'block';
    }
  }

  function hideError() {
    if (errorAlert) {
      errorAlert.style.display = 'none';
    }
  }

  function setLoading(loading) {
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? 'Signing In...' : 'Sign In';
    }
  }
});
