/* Authentication: login, register, logout, forgot password (Backend) */
(function(){
  window.openLoginModal = function(){document.getElementById('login-modal').style.display='block';document.body.style.overflow='hidden';};
  window.closeLoginModal = function(){document.getElementById('login-modal').style.display='none';document.body.style.overflow='auto';};
  window.openRegisterModal = function(){document.getElementById('register-modal').style.display='block';document.body.style.overflow='hidden';};
  window.closeRegisterModal = function(){document.getElementById('register-modal').style.display='none';document.body.style.overflow='auto';};
  window.switchToRegister = function(e){e.preventDefault();window.closeLoginModal();setTimeout(window.openRegisterModal,200);};
  window.switchToLogin = function(e){e.preventDefault();window.closeRegisterModal();setTimeout(window.openLoginModal,200);};

  window.handleLogin = async function(event){
    event.preventDefault();
    const loginId = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
      const res = await window.API.login({ login: loginId, password: password });
      const { token, user } = res.data;
      localStorage.setItem('ghothys_token', token);
      window.currentUser = user;
      localStorage.setItem('ghothys_current_user', JSON.stringify(user));
      window.updateUI();
      window.showToast('Login Berhasil!', 'Selamat datang ' + (user.nickname || user.name));
      window.closeLoginModal();
      if (typeof window.connectSocket === 'function') window.connectSocket(token);
    } catch (err) {
      window.showErrorToast('Login Gagal', err.message || 'Email/Username atau password salah');
    }
  };

  window.handleRegister = async function(event){
    event.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const username = document.getElementById('register-username').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    try {
      const res = await window.API.register({ name, email, username, phone, password });
      const { token, user } = res.data;
      localStorage.setItem('ghothys_token', token);
      window.currentUser = user;
      localStorage.setItem('ghothys_current_user', JSON.stringify(user));
      window.updateUI();
      window.showToast('Registrasi Berhasil!', 'Selamat datang ' + (user.nickname || user.name));
      window.closeRegisterModal();
      if (typeof window.connectSocket === 'function') window.connectSocket(token);
    } catch (err) {
      window.showErrorToast('Registrasi Gagal', err.message || 'Terjadi kesalahan');
    }
  };

  window.handleLogout = function(){
    localStorage.removeItem('ghothys_token');
    localStorage.removeItem('ghothys_current_user');
    window.currentUser = null;
    if (typeof window.disconnectSocket === 'function') window.disconnectSocket();
    window.updateUI();
    window.showToast('Logout', 'Sampai jumpa!');
    window.navigateTo('home-page');
  };

  window.restoreSession = async function(){
    const token = localStorage.getItem('ghothys_token');
    const cached = localStorage.getItem('ghothys_current_user');
    if (!token) {
      window.currentUser = null;
      window.updateUI();
      return;
    }
    if (cached) {
      window.currentUser = JSON.parse(cached);
      window.updateUI();
    }
    if (typeof window.API !== 'undefined' && window.API.getProfile) {
      try {
        const res = await window.API.getProfile();
        const user = res.data;
        window.currentUser = user;
        localStorage.setItem('ghothys_current_user', JSON.stringify(user));
        window.updateUI();
        if (typeof window.connectSocket === 'function') window.connectSocket(token);
      } catch (err) {
        if (err.statusCode === 401) {
          localStorage.removeItem('ghothys_token');
          localStorage.removeItem('ghothys_current_user');
          window.currentUser = null;
          window.updateUI();
        }
      }
    }
  };
})();