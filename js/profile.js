/* Profile: avatar, stats, account settings (Backend) */
(function(){
  window.updateUI = function(){
    if(window.currentUser){
      document.getElementById('user-info').style.display='flex';
      document.getElementById('auth-buttons').style.display='none';
      document.getElementById('user-points-nav').textContent=window.currentUser.points||0;
      document.getElementById('profile-nickname').textContent=window.currentUser.nickname||window.currentUser.name;
      document.getElementById('profile-username').textContent='@'+window.currentUser.username;
      document.getElementById('profile-email').textContent=window.currentUser.email;
      if(window.currentUser.avatar)document.getElementById('avatar-display').innerHTML='<img src="'+window.currentUser.avatar+'" alt="Avatar">';
      window.updateProfileStats();
    } else {document.getElementById('user-info').style.display='none';document.getElementById('auth-buttons').style.display='flex';}
  };

  window.updateProfileStats = function(){if(!window.currentUser)return;const tx=window.getTransactions();document.getElementById('total-transactions').textContent=tx.length;document.getElementById('total-spending').textContent='Rp '+tx.reduce((s,t)=>s+(t.amount||0),0).toLocaleString('id-ID');const pts=window.currentUser.points||0;document.getElementById('member-points').textContent=pts+' Points';let lvl='Bronze';if(pts>=5000)lvl='Platinum';else if(pts>=2000)lvl='Gold';else if(pts>=500)lvl='Silver';document.getElementById('member-level').textContent=lvl;const badge=document.getElementById('transaction-count-badge');if(tx.length>0){badge.style.display='inline';badge.textContent=tx.length;}else{badge.style.display='none';}};

  window.handleAvatarUpload = async function(event){
    if(!window.currentUser)return;
    const file=event.target.files[0];if(!file)return;
    if(file.size>2*1024*1024){window.showErrorToast('Terlalu Besar','Max 2MB');return;}
    const r=new FileReader();
    r.onload=async function(e){
      const avatar=e.target.result;
      try {
        await window.API.updateProfile({ avatar });
        window.currentUser.avatar=avatar;
        window.saveCurrentUser();
        document.getElementById('avatar-display').innerHTML='<img src="'+avatar+'" alt="Avatar">';
        window.showToast('Berhasil','Foto diperbarui');
      } catch(err) {
        window.showErrorToast('Gagal',err.message||'Gagal upload avatar');
      }
    };
    r.readAsDataURL(file);
  };

  window.openChangePasswordModal = function(){document.getElementById('change-password-modal').style.display='block';document.body.style.overflow='hidden';};
  window.closeChangePasswordModal = function(){document.getElementById('change-password-modal').style.display='none';document.body.style.overflow='auto';};
  window.handleChangePassword = async function(e){
    e.preventDefault();
    const old=document.getElementById('old-password').value,np=document.getElementById('new-password').value,cp=document.getElementById('confirm-password').value;
    if(np!==cp){window.showErrorToast('Tidak Cocok','Password baru tidak cocok');return;}
    try {
      await window.API.changePassword({ oldPassword: old, newPassword: np });
      window.showToast('Berhasil','Password diubah');
      window.closeChangePasswordModal();
    } catch(err) {
      window.showErrorToast('Gagal',err.message||'Gagal ganti password');
    }
  };

  window.openForgotPasswordModal = function(e){e.preventDefault();window.closeLoginModal();setTimeout(()=>{document.getElementById('forgot-password-modal').style.display='block';document.body.style.overflow='hidden';},200);};
  window.closeForgotPasswordModal = function(){document.getElementById('forgot-password-modal').style.display='none';document.body.style.overflow='auto';};
  window.handleForgotPassword = async function(e){
    e.preventDefault();
    const email=document.getElementById('forgot-email')?.value||'';
    try {
      const res=await window.API.forgotPassword({ email });
      window.showToast('Email Terkirim',res.message||'Link reset dikirim ke email Anda');
      window.closeForgotPasswordModal();
    } catch(err) {
      window.showErrorToast('Gagal',err.message||'Gagal kirim email');
    }
  };

  window.openChangePhoneModal = function(){document.getElementById('change-phone-modal').style.display='block';document.body.style.overflow='hidden';document.getElementById('phone-step-1').style.display='block';document.getElementById('phone-step-2').style.display='none';};
  window.closeChangePhoneModal = function(){document.getElementById('change-phone-modal').style.display='none';document.body.style.overflow='auto';};
  window.sendPhoneVerification = async function(e){
    e.preventDefault();
    const em=document.getElementById('phone-verify-email').value;
    if(em!==window.currentUser.email){window.showErrorToast('Salah','Email tidak sesuai');return;}
    window.newPhoneNumber=document.getElementById('new-phone').value;
    window.verificationCode=Math.floor(100000+Math.random()*900000).toString();
    document.getElementById('phone-step-1').style.display='none';document.getElementById('phone-step-2').style.display='block';
    document.getElementById('email-display').textContent=em;
    window.showToast('Kode Terkirim','Kode: '+window.verificationCode);
  };
  window.verifyPhoneCode = async function(e){
    e.preventDefault();
    if(document.getElementById('verification-code').value===window.verificationCode){
      try {
        await window.API.updateProfile({ phone: window.newPhoneNumber });
        window.currentUser.phone=window.newPhoneNumber;
        window.saveCurrentUser();
        window.showToast('Berhasil','Nomor diubah');
        window.closeChangePhoneModal();
      } catch(err) {
        window.showErrorToast('Gagal',err.message||'Gagal simpan nomor');
      }
    } else window.showErrorToast('Salah','Kode tidak valid');
  };
  window.backToPhoneStep1 = function(){document.getElementById('phone-step-1').style.display='block';document.getElementById('phone-step-2').style.display='none';};

  window.openChangeUsernameModal = function(){if(!window.currentUser){window.openLoginModal();return;}if(window.currentUser.username_last_changed){const diff=Date.now()-new Date(window.currentUser.username_last_changed).getTime();if(diff<7*24*60*60*1000){window.showErrorToast('Cooldown','Tunggu 7 hari');return;}}document.getElementById('change-username-modal').style.display='block';document.body.style.overflow='hidden';};
  window.closeChangeUsernameModal = function(){document.getElementById('change-username-modal').style.display='none';document.body.style.overflow='auto';};
  window.handleChangeUsername = async function(e){
    e.preventDefault();
    const newU=document.getElementById('new-username').value;
    try {
      const res=await window.API.changeUsername({ username: newU });
      window.currentUser=res.data;
      localStorage.setItem('ghothys_current_user',JSON.stringify(res.data));
      window.updateUI();
      window.showToast('Berhasil','Username diubah');
      window.closeChangeUsernameModal();
    } catch(err) {
      window.showErrorToast('Gagal',err.message||'Username sudah digunakan');
    }
  };

  window.openTopUpPointsModal = function(){if(!window.currentUser){window.openLoginModal();return;}document.getElementById('current-points-display').textContent=window.currentUser.points||0;document.getElementById('topup-points-modal').style.display='block';document.body.style.overflow='hidden';};
  window.closeTopUpPointsModal = function(){document.getElementById('topup-points-modal').style.display='none';document.body.style.overflow='auto';};
  window.handleTopUpPoints = async function(e){
    e.preventDefault();
    const v=document.querySelector('input[name="points-package"]:checked')?.value?.split('|');
    if(!v){window.showErrorToast('Pilih Paket','Pilih jumlah points');return;}
    const pts=parseInt(v[0]);
    try {
      const res=await window.API.addPoints({ points: pts });
      window.currentUser.points=(window.currentUser.points||0)+pts;
      window.saveCurrentUser();
      window.updateUI();
      window.showToast('Berhasil',pts+' points ditambahkan');
      window.closeTopUpPointsModal();
    } catch(err) {
      window.showErrorToast('Gagal',err.message||'Gagal topup points');
    }
  };
})();