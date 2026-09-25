(function () {
  function getToken() {
    // No localStorage. Use sessionStorage for persistence during tab, not across browser restarts.
    // (Requirement: Jangan memakai LocalStorage untuk data admin)
    return sessionStorage.getItem('admin_jwt') || '';
  }

  function setToken(token) {
    sessionStorage.setItem('admin_jwt', token || '');
  }

  function clearToken() {
    sessionStorage.removeItem('admin_jwt');
  }

  async function adminFetch(endpoint, options = {}) {
    const cfg = window.GHOTHYS_NOTIFY_CONFIG || {};
    const API_BASE_URL = String(cfg.relayUrl || '').replace(/\/+$/, '');
    if (!API_BASE_URL) {
      throw new Error('relayUrl belum diatur di js/notify-config.js');
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const token = getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchOptions = {
      ...options,
      headers,
      // Kirim cookie login admin (HttpOnly di domain Worker) juga, supaya
      // panel tetap jalan walau token sessionStorage tidak ada.
      credentials: 'include',
    };

    const resp = await fetch(url, fetchOptions);
    let data = null;
    try {
      data = await resp.json();
    } catch (e) {
      data = null;
    }

    if (!resp.ok) {
      const message = (data && data.message) ? data.message : `Request failed (${resp.status})`;
      const err = new Error(message);
      err.status = resp.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  window.AdminAPI = {
    getToken,
    setToken,
    clearToken,
    adminFetch,
  };
})();
