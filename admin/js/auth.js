(function () {
  function showLoading(isLoading) {
    const btn = document.getElementById('login-btn');
    const spinner = document.getElementById('login-spinner');
    if (!btn) return;

    if (isLoading) {
      btn.disabled = true;
      if (spinner) spinner.style.display = 'inline-block';
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Login...';
    } else {
      btn.disabled = false;
      if (spinner) spinner.style.display = 'none';
      if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
    }
  }

  function getFieldValue(id) {
    const el = document.getElementById(id);
    return el ? (el.value || '').trim() : '';
  }

  async function doLogin(email, password) {
    const res = await window.AdminAPI.adminFetch('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return res;
  }

  function redirectToDashboard() {
    window.location.href = './dashboard.html';
  }

  function ensureUtils() {
    // Reuse existing toast helpers if present globally in the website.
    // If not present, fallback to alerts so admin still works.
    if (typeof window.showToast !== 'function') {
      window.showToast = (title, msg) => alert(`${title}\n\n${msg || ''}`);
    }
    if (typeof window.showErrorToast !== 'function') {
      window.showErrorToast = (title, msg) => alert(`${title}\n\n${msg || ''}`);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureUtils();

    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = getFieldValue('admin-email');
      const password = getFieldValue('admin-password');

      if (!email || !password) {
        window.showErrorToast('Login Gagal', 'Email dan password harus diisi');
        return;
      }

      try {
        showLoading(true);
        const res = await doLogin(email, password);

        if (!res || !res.data || !res.data.token) {
          throw new Error('Token tidak diterima dari server');
        }

        window.AdminAPI.setToken(res.data.token);
        window.showToast('✅ Login Berhasil', 'Selamat datang, admin!');
        redirectToDashboard();
      } catch (err) {
        const msg = err && err.message ? err.message : 'Terjadi kesalahan saat login';
        window.showErrorToast('❌ Login Gagal', msg);
      } finally {
        showLoading(false);
      }
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await window.AdminAPI.adminFetch('/admin/logout', { method: 'POST' });
        } catch (e) {
          // ignore
        } finally {
          window.AdminAPI.clearToken();
          window.location.href = './login.html';
        }
      });
    }
  });
})();
