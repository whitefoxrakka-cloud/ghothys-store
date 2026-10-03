/* ============================================================
   GHOTHYS STORE - CONTENT BRIDGE (Owner -> Publik)
   ------------------------------------------------------------
   Owner Panel tidak lagi mengelola pengumuman, acara, atau
   banner komunitas. Yang tersisa dua hal yang benar-benar
   dipakai pengunjung: gambar banner utama beranda, dan daftar
   game yang tampil beserta paket dan harganya.

   ALUR:
   - Owner menyimpan (js/owner.js -> saveOwnerData):
        window.syncOwnerContent(data) dipanggil -> POST {relayUrl}/content
        dengan credentials:'include'. Login cukup SEKALI di panel
        Owner: Worker membalas Set-Cookie HttpOnly (ghothys_admin,
        8 jam) di domain Worker sendiri, lalu browser mengirimkannya
        otomatis untuk semua tab. Tidak ada token di file publik.
        Non-blocking; gagal TIDAK mengganggu panel. Kalau worker
        menjawab 409 karena masih ada isi lama, panel menanyakan ke
        owner lebih dulu. force:true hanya dikirim kalau owner
        menyetujui penghapusan isi lama itu.
   - Pengunjung membuka toko:
        bridge ini membaca {relayUrl}/content (GET, publik, tanpa
        token) lalu memasang gambarnya ke tiga slide banner beranda
        dan menimpa daftar game sebelum katalog digambar.
        Kalau relay mati atau kosong -> berkas bawaan tetap dipakai.

   CATATAN KESELAMATAN:
        Harga paket di sini sama seperti sebelumnya, yaitu dikirim
        dari browser dan tidak dibandingkan worker dengan katalog
        server. Panel owner memberi peringatan soal ini, tapi
        pengverifikasinya belum ada di sisi server.

   KONFIGURASI:
   window.GHOTHYS_NOTIFY_CONFIG (hanya relayUrl) dari
   js/notify-config.js. Tidak ada secret di file publik.
   ============================================================ */

(function(){
  var CONFIG = (window.GHOTHYS_NOTIFY_CONFIG) ? window.GHOTHYS_NOTIFY_CONFIG : {};
  var relayUrl = CONFIG.relayUrl || '';
  var lastPushWarned = false;

  /* Jumlah slide banner beranda. Tetap tiga, sama seperti bawaan,
     supaya tombol dan titik slider tidak perlu berubah. */
  var JUMLAH_SLIDE = 3;

  /* ------------------------------------------------------------
     SISI OWNER -> Relay POST /content
     ------------------------------------------------------------ */

  function catatStatus(status, pesan){
    window.__ghothysSyncState = { status: status, message: pesan, at: Date.now() };
    document.dispatchEvent(new CustomEvent('ghothys-sync', { detail: window.__ghothysSyncState }));
  }

  function laporkanSukses(){
    lastPushWarned = false;
    catatStatus('ok', 'Tersimpan di server');
    if(typeof window.showToast === 'function'){
      window.showToast('Tersimpan di server', 'Perubahan sudah terkirim dan tampil untuk pengunjung.');
    }
  }

  /* Satu kali kirim. paksa hanya dipakai kalau owner sudah menyetujui
     penghapusan isi lama, dan worker menghapus perintah kendali itu
     sebelum menyimpan, jadi tidak pernah tersimpan di server. */
  function kirim(payload, paksa){
    var badan = {};
    for(var k in payload){
      if(Object.prototype.hasOwnProperty.call(payload, k)) badan[k] = payload[k];
    }
    if(paksa) badan.force = true;

    var url = relayUrl.replace(/\/+$/,'') + '/content';
    return fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(badan)
    }).then(function(res){
      return res.json().catch(function(){ return {}; }).then(function(j){
        return { ok: res.ok, status: res.status, json: j };
      });
    });
  }

  /* Worker yang sedang berjalan di Cloudflare masih memakai kode lama
     yang menghitung isi dari kunci pengumuman, acara, dan banner.
     Kunci itu sudah tidak lagi dikirim, jadi worker lama mengira
     payload kosong lalu menolak dengan 409 selama masih ada isi lama.

     Worker lama itu sendiri menyediakan jalan keluar lewat force:true.
     Jadi panel menanyakan dulu ke owner, dan hanya mengirim ulang dengan
     force:true kalau owner menyetujui. Karena isi lama hilang begitu
     disimpan, simpanan berikutnya tidak lagi ditolak. */
  function tanyaBolehKosongkan(){
    var pertanyaan = 'Server masih menyimpan isi lama yang sudah tidak dipakai toko ini.\n'
      + 'Isi lama itu akan dihapus, lalu diganti Banner Utama dan Game Populer yang baru.\n\n'
      + 'Lanjutkan?';
    try { return window.confirm(pertanyaan) === true; } catch(e){ return false; }
  }

  /* Susun pengaturan game yang dikirim ke server. Catatan perubahan
     harga hanya untuk panel owner di browser ini, jadi tidak ikut
     dikirim supaya muatan tetap ringkas. */
  function gamePopulerUntukServer(gp){
    var asal = gp || {};
    return {
      semuaTampil: !!asal.semuaTampil,
      tampil: Array.isArray(asal.tampil) ? asal.tampil : [],
      paket: (asal.paket && typeof asal.paket === 'object') ? asal.paket : {},
      estimasi: (asal.estimasi && typeof asal.estimasi === 'object'
        && !Array.isArray(asal.estimasi)) ? asal.estimasi : {}
    };
  }

  /* Daftar kode promo yang ditetapkan owner. null berarti owner belum
     menetapkan daftar (kode bawaan tetap dipakai); array, termasuk
     kosong, berarti daftar owner yang berlaku. Bentuk yang tidak sah
     dibuang supaya data rusak tidak ikut naik ke server. */
  function promoUntukServer(list){
    if(!Array.isArray(list)) return null;
    var hasil = [];
    for(var i = 0; i < list.length; i++){
      var p = list[i];
      if(!p || typeof p !== 'object') continue;
      var kode = String(p.kode == null ? '' : p.kode).trim();
      if(!kode) continue;
      if(p.tipe !== 'persen' && p.tipe !== 'nominal') continue;
      var nilai = Number(p.nilai);
      if(!isFinite(nilai) || nilai <= 0) continue;
      var bersih = { kode: kode.toUpperCase(), tipe: p.tipe };
      bersih.nilai = p.tipe === 'persen' ? Math.min(Math.floor(nilai), 90) : Math.floor(nilai);
      bersih.catatan = String(p.catatan == null ? '' : p.catatan).trim();
      var berlaku = String(p.berlaku == null ? '' : p.berlaku).trim();
      if(/^\d{4}-\d{2}-\d{2}$/.test(berlaku)) bersih.berlaku = berlaku;
      if(p.khususPoints === true) bersih.khususPoints = true;
      if(p.aktif === false) bersih.aktif = false;
      hasil.push(bersih);
    }
    return hasil;
  }

  window.syncOwnerContent = function(data){
    if(!relayUrl || !/^https:\/\//.test(relayUrl)) return { ok: true, skipped: true };

    var payload = {
      bannerUtama: Array.isArray(data && data.bannerUtama) ? data.bannerUtama : [],
      gamePopuler: gamePopulerUntukServer(data && data.gamePopuler),
      promo: promoUntukServer(data && data.promo)
    };

    kirim(payload, false).then(function(r){
      if(r.ok){ laporkanSukses(); return; }

      var perluLogin = (r.status === 401 || r.status === 403);

      if(r.status === 409){
        if(!tanyaBolehKosongkan()){
          catatStatus('gagal', (r.json && r.json.error) || 'Server menolak payload kosong.');
          if(typeof window.showErrorToast === 'function'){
            window.showErrorToast('Server menolak', 'Penghapusan isi lama dibatalkan, jadi perubahan belum masuk server.');
          }
          return;
        }
        return kirim(payload, true).then(function(r2){
          if(r2.ok){ laporkanSukses(); return; }
          catatStatus('gagal', (r2.json && r2.json.error) || ('HTTP ' + r2.status));
          if(typeof window.showErrorToast === 'function'){
            window.showErrorToast('Server menolak', 'Penghapusan isi lama gagal. Periksa login di kotak Sinkronisasi Konten.');
          }
        });
      }

      catatStatus(perluLogin ? 'perlu-login' : 'gagal', (r.json && r.json.error) || ('HTTP ' + r.status));
      if(!lastPushWarned){
        lastPushWarned = true;
        console.warn('[content-bridge] Relay /content POST gagal', r.status, r.json);
        if(typeof window.showErrorToast === 'function'){
          window.showErrorToast('Belum ke server', perluLogin
            ? 'Login dulu di kotak Sinkronisasi Konten, lalu Simpan lagi.'
            : 'Perubahan hanya ada di browser ini. Coba lagi beberapa saat lagi.');
        }
      }
    }).catch(function(e){
      catatStatus('gagal', (e && e.message) || 'network error');
      if(!lastPushWarned){
        lastPushWarned = true;
        console.warn('[content-bridge] Relay /content POST error', e && e.message);
        if(typeof window.showErrorToast === 'function'){
          window.showErrorToast('Gagal kirim ke server', 'Perubahan hanya ada di browser ini. Periksa koneksi lalu coba lagi.');
        }
      }
    });
    return { ok: true, sent: true };
  };

  /* Login sekali di panel Owner, lalu otomatis kirim ulang
     perubahan yang tadi gagal. */
  window.retryOwnerContentSync = function(){
    if(typeof window.getOwnerData !== 'function'){
      window.__ghothysSyncState = { status: 'gagal', message: 'data owner tidak terbaca', at: Date.now() };
      return;
    }
    window.syncOwnerContent(window.getOwnerData());
  };

  /* ------------------------------------------------------------
     SISI PENGUNJUNG -> pasang ke halaman
     ------------------------------------------------------------ */

  /* Banner beranda: tiga <img class="slider-slide"> diset berurutan
     sesuai slot owner. Slot kosong berarti pakai gambar bawaan,
     jadi panel tidak pernah bisa membuat beranda kosong. */
  function pasangBannerUtama(list){
    if(!Array.isArray(list)) return 0;
    var terpasang = 0;
    for(var i = 0; i < JUMLAH_SLIDE; i++){
      var img = document.querySelector('.slider-slide[data-template-id="hero-banner-' + (i+1) + '"]');
      if(!img) continue;
      var slot = list[i] || {};
      var bawaan = img.getAttribute('data-src-bawaan') || img.getAttribute('src') || '';
      var alamat = String(slot.url || '').trim();
      if(!alamat){
        /* Kembalikan ke bawaan kalau owner mengosongkan slot. */
        img.setAttribute('src', bawaan);
        img.setAttribute('alt', img.getAttribute('data-alt-bawaan') || '');
      } else {
        img.setAttribute('src', alamat);
        if(slot.alt) img.setAttribute('alt', String(slot.alt));
        terpasang++;
      }
    }
    return terpasang;
  }

  /* Daftar game. Owner menentukan game mana yang tampil dan paket apa
     yang dipakai di dalamnya. Bentuk data dari owner:
       semuaTampil : belum ada berarti semua game tampil (bawaan).
                     false berarti hanya isi "tampil" yang dipakai.
       tampil      : daftar kunci game yang tampil, urut = urutan
                     di beranda.
       paket       : kunci game -> daftar paket hasil editan owner.
     Game yang tidak disebut owner tetap ikut tampil dengan paket
     bawaan, jadi satu baris yang belum diisi tidak membuat katalog
     kosong. */
  function pasangGamePopuler(konfigurasi){
    if(!konfigurasi || typeof konfigurasi !== 'object') return 0;
    var asal = Array.isArray(window.gamesData) ? window.gamesData : [];
    if(!asal.length) return 0;

    var semuaTampil = konfigurasi.semuaTampil !== false;
    var tampil = Array.isArray(konfigurasi.tampil) ? konfigurasi.tampil : [];
    var paket = (konfigurasi.paket && typeof konfigurasi.paket === 'object') ? konfigurasi.paket : {};
    var estimasi = (konfigurasi.estimasi && typeof konfigurasi.estimasi === 'object'
      && !Array.isArray(konfigurasi.estimasi)) ? konfigurasi.estimasi : {};

    var hasil = asal.slice();

    if(!semuaTampil){
      var urutan = {};
      tampil.forEach(function(kunci, nomor){ urutan[String(kunci)] = nomor; });
      hasil = asal.filter(function(g){
        return Object.prototype.hasOwnProperty.call(urutan, String(g.searchKey));
      });
      /* Urutan di panel yang menentukan urutan di beranda. */
      hasil.sort(function(a, b){
        return urutan[String(a.searchKey)] - urutan[String(b.searchKey)];
      });
    }

    /* Paket dan estimasi owner menimpa nilai bawaan game itu.
       Game yang tidak punya setelan owner tetap memakai bawaan. */
    hasil = hasil.map(function(g){
      var kunciOwner = String(g.searchKey);
      var milikOwner = paket[kunciOwner];
      var adaPaket = Array.isArray(milikOwner) && milikOwner.length > 0;
      var estOwner = estimasi[kunciOwner];
      var adaEstimasi = typeof estOwner === 'string' && estOwner.trim() !== '';
      if(!adaPaket && !adaEstimasi) return g;
      var salinan = {};
      for(var k in g){ if(Object.prototype.hasOwnProperty.call(g, k)) salinan[k] = g[k]; }
      if(adaPaket) salinan.packages = milikOwner;
      if(adaEstimasi) salinan.estimasi = estOwner.trim();
      return salinan;
    });

    window.gamesData = hasil;
    if(typeof window.renderGames === 'function') window.renderGames();
    return hasil.length;
  }

  /* Kode promo dari owner dipasang ke modul Promo. null atau tidak
     ada berarti owner belum menetapkan daftar, jadi kode bawaan tetap
     dipakai. Array (boleh kosong) menggantikan kode bawaan. */
  function pasangPromo(list){
    if(!window.Promo || typeof window.Promo.setServerPromo !== 'function') return 0;
    var bersih = promoUntukServer(list);
    window.Promo.setServerPromo(bersih);
    return bersih === null ? 0 : bersih.length;
  }

  function renderContent(content){
    if(!content || typeof content !== 'object') return;

    var jumlahBanner = pasangBannerUtama(content.bannerUtama);
    var jumlahGame = pasangGamePopuler(content.gamePopuler);
    var jumlahPromo = pasangPromo(content.promo);

    /* Beri tahu halaman supaya katalog digambar ulang kalau
       gamesData sempat terisi lebih dulu. */
    document.dispatchEvent(new CustomEvent('ghothys-konten-masuk', {
      detail: { banner: jumlahBanner, game: jumlahGame, promo: jumlahPromo }
    }));
  }

  function loadPublicContent(){
    if(!relayUrl || !/^https:\/\//.test(relayUrl)) return;
    var url = relayUrl.replace(/\/+$/,'') + '/content';
    fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } })
      .then(function(res){
        if(!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(body){
        if(body && body.ok !== false && body.content){
          renderContent(body.content);
        }
      })
      .catch(function(e){
        /* relay mati -> berkas bawaan tetap dipakai */
      });
  }

  /* ------------------------------------------------------------
     INIT
     ------------------------------------------------------------ */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadPublicContent);
  } else {
    loadPublicContent();
  }
})();
