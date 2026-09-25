/* ============================================================
   GHOTHYS STORE - SINKRONISASI KONTEN OWNER
   ------------------------------------------------------------
   Menampilkan status "konten sudah masuk server atau belum" di
   panel owner, plus form login singkat.

   CARA KERJA:
   - Semua request memakai credentials:'include', jadi Worker
     mengirim cookie login HttpOnly (ghothys_admin) secara otomatis.
   - Status dicek dengan GET /admin/profile (butuh cookie valid).
   - Kalau belum login, panel menampilkan form email + password.
     Setelah berhasil, konten yang tadi gagal langsung dikirim ulang
     tanpa owner harus 저장 ulang.
   - Tidak ada token yang disimpan di localStorage/sessionStorage,
     dan tidak ada password yang disimpan di mana pun.
   ============================================================ */

(function(){
  var CONFIG = (window.GHOTHYS_NOTIFY_CONFIG) ? window.GHOTHYS_NOTIFY_CONFIG : {};
  var relayUrl = String(CONFIG.relayUrl || '').replace(/\/+$/, '');
  var sedangCek = false;
  var terakhirDicek = 0;

  function el(id){ return document.getElementById(id); }

  function setStatus(teks, warna){
    var b = el('owner-sync-status');
    if(!b) return;
    b.textContent = teks;
    b.style.color = warna || '#9ca3af';
  }

  function tampilkanLogin(boleh){
    var blok = el('owner-sync-login');
    if(!blok) return;
    blok.style.display = boleh ? 'block' : 'none';
    var tombol = el('owner-sync-retry');
    if(tombol) tombol.style.display = boleh ? 'none' : 'inline-flex';
  }

  function cekStatus(paksa){
    if(!relayUrl) return;
    if(!paksa && (Date.now() - terakhirDicek) < 20000) return;
    terakhirDicek = Date.now();
    if(sedangCek) return;
    sedangCek = true;
    fetch(relayUrl + '/admin/profile', { method: 'GET', credentials: 'include' })
      .then(function(res){
        if(res.status === 401 || res.status === 403) return { login: false };
        if(!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(j){
        sedangCek = false;
        if(j && j.success && j.data){
          setStatus('Tersambung sebagai ' + j.data.email + ' - konten otomatis masuk server.', '#34d399');
          tampilkanLogin(false);
          return;
        }
        setStatus('Belum login - konten hanya tersimpan di browser ini.', '#fbbf24');
        tampilkanLogin(true);
      })
      .catch(function(e){
        sedangCek = false;
        setStatus('Tidak bisa menghubungi server: ' + ((e && e.message) || 'error'), '#f87171');
      });
  }

  function kirimUlang(){
    if(typeof window.retryOwnerContentSync === 'function'){
      setStatus('Mengirim ulang ke server...', '#9ca3af');
      window.retryOwnerContentSync();
    }
  }

  function login(event){
    event.preventDefault();
    if(!relayUrl) return;
    var email = (el('owner-sync-email') ? el('owner-sync-email').value : '').trim();
    var password = el('owner-sync-password') ? el('owner-sync-password').value : '';
    if(!email || !password){
      setStatus('Email dan password harus diisi.', '#fbbf24');
      return;
    }
    var tombol = el('owner-sync-login-btn');
    if(tombol){ tombol.disabled = true; tombol.textContent = 'Memproses...'; }
    setStatus('Memeriksa login...', '#9ca3af');
    fetch(relayUrl + '/admin/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    }).then(function(res){
      return res.json().catch(function(){ return {}; }).then(function(j){
        return { ok: res.ok, status: res.status, json: j };
      });
    }).then(function(r){
      if(tombol){ tombol.disabled = false; tombol.textContent = 'Login & Simpan Otomatis'; }
      if(!r.ok){
        setStatus('Login gagal: ' + ((r.json && r.json.message) || ('HTTP ' + r.status)), '#f87171');
        return;
      }
      if(el('owner-sync-password')) el('owner-sync-password').value = '';
      setStatus('Berhasil. Mengirim konten ke server...', '#34d399');
      tampilkanLogin(false);
      if(typeof window.showToast === 'function'){
        window.showToast('Login tersimpan', 'Berlaku di semua tab sampai 8 jam. Konten dikirim ulang otomatis.');
      }
      kirimUlang();
    }).catch(function(e){
      if(tombol){ tombol.disabled = false; tombol.textContent = 'Login & Simpan Otomatis'; }
      setStatus('Login gagal: ' + ((e && e.message) || 'error'), '#f87171');
    });
  }

  function pasang(){
    var form = el('owner-sync-form');
    if(form && !form.dataset.terpasang){
      form.dataset.terpasang = '1';
      form.addEventListener('submit', login);
    }
    var tombolRetry = el('owner-sync-retry');
    if(tombolRetry && !tombolRetry.dataset.terpasang){
      tombolRetry.dataset.terpasang = '1';
      tombolRetry.addEventListener('click', kirimUlang);
    }
    document.addEventListener('ghothys-sync', function(e){
      var s = e && e.detail ? e.detail : {};
      if(s.status === 'ok'){
        setStatus('Konten tersimpan di server.', '#34d399');
        tampilkanLogin(false);
      } else if(s.status === 'perlu-login'){
        setStatus('Login dulu supaya konten bisa masuk server (sekali saja, berlaku di semua tab).', '#fbbf24');
        tampilkanLogin(true);
      } else {
        setStatus('Gagal: ' + (s.message || 'tidak diketahui'), '#f87171');
      }
    });
  }

  function init(){
    if(!relayUrl) return;
    pasang();
    cekStatus(true);
    setInterval(function(){ cekStatus(false); }, 60000);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
