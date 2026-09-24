/* API Client - Client-side implementation (works on static hosting / GitHub Pages) */
(function () {
  const API_BASE_URL = ''; // backend optional; all flows run locally

  function getAuthHeaders() {
    const token = localStorage.getItem('ghothys_token');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }

  /* ---- local utilities ---- */

  function uid() {
    return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getAllUsers() {
    try { return JSON.parse(localStorage.getItem(window.STORAGE_KEYS.USERS) || '[]'); }
    catch (e) { return []; }
  }

  function saveAllUsers(users) {
    localStorage.setItem(window.STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  function makeSafeString(str) {
    return String(str || '').replace(/[^\x20-\x7E]/g, '').trim();
  }

  async function hashPassword(password) {
    const pwd = String(password || '');
    try {
      if (window.crypto && window.crypto.subtle) {
        const buf = new TextEncoder().encode('ghothys:' + pwd);
        const digest = await window.crypto.subtle.digest('SHA-256', buf);
        const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
        return hex;
      }
    } catch (e) { /* fall through */ }
    return 'local:' + pwd;
  }

  function buildUser(profile) {
    const phone = makeSafeString(profile.phone);
    return {
      id: uid(),
      name: makeSafeString(profile.name) || 'Member',
      nickname: makeSafeString(profile.name) || 'Member',
      email: makeSafeString(profile.email).toLowerCase(),
      username: makeSafeString(profile.username).toLowerCase(),
      phone: phone,
      points: 0,
      avatar: '',
      passwordHash: profile.passwordHash || '',
      createdAt: new Date().toISOString(),
      username_last_changed: null
    };
  }

  async function findUserByLogin(login) {
    const users = getAllUsers();
    const l = makeSafeString(login).toLowerCase();
    return users.find(u => u.email === l || (u.username && u.username.toLowerCase() === l)) || null;
  }

  function sign(user) {
    return 'ghothys.' + btoa(JSON.stringify({ id: user.id, email: user.email, ts: Date.now() }));
  }

  function toClientUser(u) {
    const copy = Object.assign({}, u);
    delete copy.passwordHash;
    return copy;
  }

  /* ---- auth ---- */

  const register = async (data) => {
    const name = makeSafeString(data.name);
    const email = makeSafeString(data.email).toLowerCase();
    const username = makeSafeString(data.username).toLowerCase();
    const phone = makeSafeString(data.phone);
    if (!name || !email || !username) throw { statusCode: 400, message: 'Nama, email dan username wajib diisi' };
    if (!/^\S+@\S+\.\S+$/.test(email)) throw { statusCode: 400, message: 'Email tidak valid' };
    const users = getAllUsers();
    if (users.some(u => u.email === email)) throw { statusCode: 409, message: 'Email sudah terdaftar' };
    if (users.some(u => u.username === username)) throw { statusCode: 409, message: 'Username sudah digunakan' };

    const passwordHash = await hashPassword(data.password);
    const user = buildUser({ name, email, username, phone, passwordHash });
    users.push(user);
    saveAllUsers(users);
    const token = sign(user);
    localStorage.setItem('ghothys_token', token);
    return { success: true, data: { token, user: toClientUser(user) } };
  };

  const login = async (data) => {
    const loginId = makeSafeString(data.login);
    if (!loginId) throw { statusCode: 400, message: 'Email/Username wajib diisi' };
    const user = await findUserByLogin(loginId);
    if (!user) throw { statusCode: 401, message: 'Email/Username atau password salah' };
    const hash = await hashPassword(data.password);
    if (hash !== user.passwordHash) throw { statusCode: 401, message: 'Email/Username atau password salah' };
    const token = sign(user);
    localStorage.setItem('ghothys_token', token);
    return { success: true, data: { token, user: toClientUser(user) } };
  };

  const getProfile = async () => {
    const token = localStorage.getItem('ghothys_token');
    if (!token) throw { statusCode: 401, message: 'Tidak terautentikasi' };
    const cached = localStorage.getItem(window.STORAGE_KEYS.CURRENT_USER);
    if (cached) return { success: true, data: JSON.parse(cached) };
    throw { statusCode: 401, message: 'Sesi tidak ditemukan' };
  };

  const updateProfile = async (data) => {
    if (!window.currentUser) throw { statusCode: 401, message: 'Login dulu' };
    const users = getAllUsers();
    const i = users.findIndex(u => u.email === window.currentUser.email);
    if (i === -1) throw { statusCode: 404, message: 'User tidak ditemukan' };
    if (data.avatar !== undefined) users[i].avatar = data.avatar;
    if (data.phone !== undefined) users[i].phone = makeSafeString(data.phone);
    saveAllUsers(users);
    window.currentUser = toClientUser(users[i]);
    localStorage.setItem(window.STORAGE_KEYS.CURRENT_USER, JSON.stringify(window.currentUser));
    return { success: true, data: toClientUser(users[i]) };
  };

  const changePassword = async (data) => {
    if (!window.currentUser) throw { statusCode: 401, message: 'Login dulu' };
    const users = getAllUsers();
    const i = users.findIndex(u => u.email === window.currentUser.email);
    if (i === -1) throw { statusCode: 404, message: 'User tidak ditemukan' };
    const oldHash = await hashPassword(data.oldPassword);
    if (oldHash !== users[i].passwordHash) throw { statusCode: 400, message: 'Password lama salah' };
    users[i].passwordHash = await hashPassword(data.newPassword);
    saveAllUsers(users);
    return { success: true, data: { success: true } };
  };

  const changeUsername = async (data) => {
    if (!window.currentUser) throw { statusCode: 401, message: 'Login dulu' };
    const newU = makeSafeString(data.username).toLowerCase();
    if (!newU) throw { statusCode: 400, message: 'Username wajib diisi' };
    const users = getAllUsers();
    if (users.some(u => u.email !== window.currentUser.email && u.username === newU)) {
      throw { statusCode: 409, message: 'Username sudah digunakan' };
    }
    const i = users.findIndex(u => u.email === window.currentUser.email);
    users[i].username = newU;
    users[i].username_last_changed = new Date().toISOString();
    saveAllUsers(users);
    const client = toClientUser(users[i]);
    window.currentUser = client;
    localStorage.setItem(window.STORAGE_KEYS.CURRENT_USER, JSON.stringify(client));
    return { success: true, data: client };
  };

  const addPoints = async (data) => {
    if (!window.currentUser) throw { statusCode: 401, message: 'Login dulu' };
    const pts = parseInt(data.points);
    if (isNaN(pts) || pts <= 0) throw { statusCode: 400, message: 'Jumlah points tidak valid' };
    const users = getAllUsers();
    const i = users.findIndex(u => u.email === window.currentUser.email);
    users[i].points = (users[i].points || 0) + pts;
    saveAllUsers(users);
    window.currentUser = toClientUser(users[i]);
    localStorage.setItem(window.STORAGE_KEYS.CURRENT_USER, JSON.stringify(window.currentUser));
    return { success: true, data: { points: users[i].points } };
  };

  const forgotPassword = async () => {
    // No SMTP available on static hosting; guide user instead.
    return { success: true, data: { ok: true }, message: 'Pada versi statis, hubungi Owner untuk reset password' };
  };

  /* ---- orders ---- */

  const createOrder = async (orderData) => {
    const order = window.createOrder({
      game: orderData.game,
      uid: orderData.uid,
      server: orderData.server,
      item: orderData.product || orderData.item,
      price: orderData.price,
      payment: orderData.payment,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone || ''
    });
    // Broadcast notifications, never throw on channel failure
    try { await window.sendOrderNotifications(order); } catch (e) { console.error('[NOTIFY]', e); }
    return { success: true, data: { orderId: order.id } };
  };

  const getOrders = async () => {
    return { success: true, data: window.getAllOrders ? window.getAllOrders() : [] };
  };

  const getOrderById = async (orderId) => {
    const orders = window.getAllOrders ? window.getAllOrders() : [];
    const order = orders.find(o => o.id === orderId);
    if (!order) throw { statusCode: 404, message: 'Order tidak ditemukan' };
    return { success: true, data: order };
  };

  const sendWhatsAppNotification = async () => {
    return { success: false, message: 'WhatsApp (Fonnte) telah dihapus. Gunakan Discord/Email/Telegram.' };
  };

  const sendDiscordNotification = async (message) => {
    const cfg = window.GHOTHYS_NOTIFY_CONFIG || {};
    if (cfg.discordWebhook) {
      try {
        const res = await fetch(cfg.discordWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: String(message || '').slice(0, 2000), username: 'Ghothys Store' })
        });
        return { success: res.ok };
      } catch (e) { return { success: false, message: e.message }; }
    }
    return { success: false, message: 'Discord webhook belum dikonfigurasi' };
  };

  const healthCheck = async () => {
    return { status: 'online', version: '1.1.0', mode: 'static' };
  };

  // Export all API functions (backward compatible with old callers)
  window.API = {
    createOrder,
    getOrders,
    getOrderById,
    sendWhatsAppNotification,
    sendDiscordNotification,
    healthCheck,
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    changeUsername,
    addPoints,
    forgotPassword
  };

  // Legacy fetch wrapper kept for backward compatibility
  window.apiFetch = async (endpoint, options = {}) => {
    const fn = { '/order': createOrder, '/health': healthCheck }[endpoint];
    if (fn) return fn(options.body ? JSON.parse(options.body) : {});
    throw { statusCode: 404, message: 'Endpoint tidak tersedia', data: {} };
  };
})();