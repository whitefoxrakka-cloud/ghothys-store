/* ============================================================
   GHOTHYS STORE - CONTENT BRIDGE (fitur #2 - Owner -> Publik)
   ------------------------------------------------------------
   Menghubungkan konten owner (pengumuman/event/banner/pinned)
   yang disimpan owner di panel Owner dengan tabel Airtable
   "Content" melalui relay Cloudflare Worker.

   ALUR:
   - Owner menyimpan data (js/owner.js -> saveOwnerData):
        window.syncOwnerContent(data) dipanggil -> POST {relayUrl}/content
        dengan credentials:'include'. Login cukup SEKALI di panel
        /admin/: Worker membalas Set-Cookie HttpOnly (ghothys_admin,
        8 jam) di domain Worker sendiri, lalu browser mengirimkannya
        otomatis untuk semua tab. Tidak ada token di file publik dan
        halaman toko tidak perlu menyimpan apa pun.
        Non-blocking / fire-and-forget; gagal TIDAK mengganggu panel.
   - Pengunjung membuka toko:
       bridge ini membaca {relayUrl}/content (GET, publik, tanpa token).
       Kalau ada konten -> render pengumuman/event/banner dinamis ke
       grid publik (an-grid / ev-grid / banner area).
       Kalau relay belum aktif / kosong -> biarkan grid statis yang
       sudah ada (fallback aman).

   KONFIGURASI:
   Baca dari js/notify-config.js -> window.GHOTHYS_NOTIFY_CONFIG
   (hanya relayUrl). Tidak ada secret di file publik anymore.
   ============================================================ */

(function(){
  var CONFIG = (window.GHOTHYS_NOTIFY_CONFIG) ? window.GHOTHYS_NOTIFY_CONFIG : {};
  var relayUrl = CONFIG.relayUrl || '';
  var lastPushWarned = false;

  function escapeHtml(s){
    if(!s) return '';
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function rupiah(v){
    var n = parseInt(v, 10);
    return (isFinite(n) && n>0) ? ('Rp ' + n.toLocaleString('id-ID')) : '-';
  }

  /* ------------------------------------------------------------
     SISI OWNER -> Relay POST /content
     ------------------------------------------------------------ */
  window.syncOwnerContent = function(data){
    if(!relayUrl || !/^https:\/\//.test(relayUrl)) return { ok: true, skipped: true };

    /* Tidak ada token di file publik, dan halaman toko tidak perlu
       menyimpan apa pun. Login cukup sekali di panel /admin/: Worker
       memberi cookie HttpOnly di domainnya sendiri, lalu browser
       mengirimkannya otomatis untuk semua tab. */
    var payload = {
      announcements: (data && data.announcements) || [],
      events: (data && data.events) || [],
      banners: (data && data.banners) || [],
      pinnedAnnouncement: (data && data.pinnedAnnouncement) || null,
      settings: (data && data.settings) || {}
    };
    var url = relayUrl.replace(/\/+$/,'') + '/content';
    fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(res){
      return res.json().catch(function(){ return {}; }).then(function(j){
        return { ok: res.ok, status: res.status, json: j };
      });
    }).then(function(r){
      var perluLogin = (r.status === 401 || r.status === 403);
      window.__ghothysSyncState = {
        status: r.ok ? 'ok' : (perluLogin ? 'perlu-login' : 'gagal'),
        message: r.ok ? 'Tersimpan di server' : ((r.json && r.json.error) || ('HTTP ' + r.status)),
        at: Date.now()
      };
      document.dispatchEvent(new CustomEvent('ghothys-sync', { detail: window.__ghothysSyncState }));
      if(r.ok){
        lastPushWarned = false;
        if(typeof window.showToast === 'function'){
          window.showToast('Konten tersimpan', 'Perubahan sudah terkirim ke server dan tampil untuk pengunjung.');
        }
        return;
      }
      if(r.status === 409){
        if(typeof window.showErrorToast === 'function'){
          window.showErrorToast('Server menolak', r.json && r.json.error ? r.json.error : 'Payload ditolak.');
        }
        return;
      }
      if(!lastPushWarned){
        lastPushWarned = true;
        console.warn('[content-bridge] Relay /content POST gagal', r.status, r.json);
        if(typeof window.showErrorToast === 'function'){
          window.showErrorToast('Konten belum ke server', perluLogin
            ? 'Login dulu di panel /admin/ (sekali saja, berlaku di semua tab), lalu Simpan lagi.'
            : 'Konten hanya ada di browser ini. Coba lagi beberapa saat lagi.');
        }
      }
    }).catch(function(e){
      window.__ghothysSyncState = { status: 'gagal', message: (e && e.message) || 'network error', at: Date.now() };
      document.dispatchEvent(new CustomEvent('ghothys-sync', { detail: window.__ghothysSyncState }));
      if(!lastPushWarned){
        lastPushWarned = true;
        console.warn('[content-bridge] Relay /content POST error', e && e.message);
        if(typeof window.showErrorToast === 'function'){
          window.showErrorToast('Gagal kirim ke server', 'Konten hanya ada di browser ini. Periksa koneksi lalu coba lagi.');
        }
      }
    });
    return { ok: true, sent: true };
  };

  /* Login sekali di panel /admin/ (atau lewat form di panel owner) lalu
     otomatis kirim ulang konten yang tadi gagal. */
  window.retryOwnerContentSync = function(){
    if(typeof window.getOwnerData === 'function'){
      window.syncOwnerContent(window.getOwnerData());
    } else {
      window.__ghothysSyncState = { status: 'gagal', message: 'data owner tidak terbaca', at: Date.now() };
    }
  };


/* ------------------------------------------------------------
     KARTU PUBLIK
     ------------------------------------------------------------
     Bagian ini dulu menulis ke wadah yang sudah tidak ada:
     #an-announcement-grid, #ev-event-grid, dan #banner-viewer.
     Sekarang wadahnya dibuat ulang di halaman Komunitas.

     Dua perbaikan isi:
     - Setiap kartu kini membawa data tanggal dan status di
       atributnya, supaya penyaringan dan hitung mundur punya
       sumber yang jujur.
     - Status acara dihitung dari tanggal, bukan dikarang.
  */

  /* Owner Panel tidak punya kolom kategori, jadi satu-satunya
     pembeda yang jujur adalah "disematkan" dan "biasa". */
  function kategoriPengumuman(ann){
    if (ann.category) return String(ann.category).toLowerCase();
    return ann.pinned ? 'pinned' : 'info';
  }

  /* Owner Panel hanya punya tanggal. Status dihitung dari tanggal:
     waktu yang sudah lewat berarti selesai. Kalau tanggalnya tidak
     terbaca, dianggap mendatang karena itu keadaan bawaan. */
  function statusAcara(ev){
    if (ev.status) return String(ev.status).toLowerCase();
    const waktu = Date.parse(ev.date || ev.tanggal || '');
    if (!isFinite(waktu)) return 'upcoming';
    return waktu < Date.now() ? 'finished' : 'upcoming';
  }

  function labelStatus(status){
    if (status === 'live') return 'Berlangsung';
    if (status === 'finished') return 'Selesai';
    if (status === 'cancelled') return 'Dibatalkan';
    return 'Mendatang';
  }

  function tanggalRingkas(mentah){
    const waktu = Date.parse(mentah || '');
    if (!isFinite(waktu)) return '-';
    return new Date(waktu).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  /* Gambar sampul, atau kotak gradien bila owner tidak mengunggah. */
  function sampul(src, kelasGradien){
    if (src) {
      return '<img src="' + escapeHtml(src) + '" alt="" loading="lazy" decoding="async">';
    }
    return '<div class="' + kelasGradien + '"></div>';
  }

  function buildAnnCard(ann, idx){
    const disematkan = !!ann.pinned;
    const kategori = kategoriPengumuman(ann);
    const kelas = disematkan ? 'an-card pinned' : 'an-card';
    const waktu = ann.createdAt || ann.date || '';

    const lencana = disematkan
      ? '<div class="an-cc-badges"><span class="an-badge pinned">Disematkan</span><span class="an-badge official">Resmi</span></div>'
      : '<div class="an-cc-badges"><span class="an-badge info">Info</span></div>';

    return '' +
      '<div class="' + kelas + '" data-index="' + idx + '"' +
        ' data-title="' + escapeHtml(ann.title || '') + '"' +
        ' data-category="' + escapeHtml(kategori) + '"' +
        ' data-created="' + escapeHtml(waktu) + '">' +
        '<div class="an-card-cover">' +
          sampul(ann.imageUrl, 'an-cc-grad') +
          '<div class="an-cc-overlay"></div>' +
          lencana +
          '<button type="button" class="an-cc-bookmark" aria-pressed="false"' +
            ' aria-label="Tandai pengumuman ini untuk dibaca nanti">&#128278;</button>' +
        '</div>' +
        '<div class="an-card-body">' +
          '<div class="an-card-cat">' + (disematkan ? 'Disematkan' : 'Pengumuman') + '</div>' +
          '<div class="an-card-title">' + escapeHtml(ann.title || '') + '</div>' +
          '<div class="an-card-desc">' + escapeHtml(ann.content || '') + '</div>' +
          '<div class="an-card-footer">' +
            '<span class="an-cf-author"><span class="an-cf-avatar">&#9813;</span> Owner</span>' +
            '<span class="an-cf-date">' + tanggalRingkas(waktu) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function buildEventCard(ev, idx){
    const status = statusAcara(ev);
    const tanggal = ev.date || ev.tanggal || '';
    const waktu = ev.createdAt || tanggal;

    return '' +
      '<div class="ev-card" data-index="' + idx + '"' +
        ' data-title="' + escapeHtml(ev.title || '') + '"' +
        ' data-status="' + escapeHtml(status) + '"' +
        ' data-tanggal="' + escapeHtml(tanggal) + '"' +
        ' data-created="' + escapeHtml(waktu) + '">' +
        '<div class="ev-card-cover">' +
          sampul(ev.imageUrl, 'ev-cc-grad') +
          '<div class="ev-cc-overlay"></div>' +
          '<div class="ev-cc-badges">' +
            '<span class="ev-badge ' + escapeHtml(status) + '">' + escapeHtml(labelStatus(status)) + '</span>' +
          '</div>' +
          '<button type="button" class="ev-cc-bookmark" aria-pressed="false"' +
            ' aria-label="Tandai acara ini untuk dibaca nanti">&#128278;</button>' +
        '</div>' +
        '<div class="ev-card-body">' +
          '<div class="ev-card-cat">Acara</div>' +
          '<div class="ev-card-title">' + escapeHtml(ev.title || '') + '</div>' +
          '<div class="ev-card-desc">' + escapeHtml(ev.description || '') + '</div>' +
          '<div class="ev-card-meta">' +
            '<span class="ev-cm-item">' + tanggalRingkas(tanggal) + '</span>' +
            (ev.location ? '<span class="ev-cm-item">' + escapeHtml(ev.location) + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function buildBanner(b, idx){
    return '<div class="pb-banner-item" data-index="' + idx + '">' +
        '<div class="pb-banner-cover">' + sampul(b.imageUrl, 'an-cc-grad') + '</div>' +
        '<div class="pb-banner-keterangan">' +
          (b.title ? '<div class="pb-banner-title">' + escapeHtml(b.title) + '</div>' : '<div></div>') +
          (b.link ? '<a class="pb-banner-link" target="_blank" rel="noopener noreferrer" href="' +
            escapeHtml(b.link) + '">Lihat detail</a>' : '') +
        '</div>' +
      '</div>';
  }

  /* Simpan isi kartu cadangan dari markup statis supaya masih ada
     kalau relay mati. */
  function simpanStatis(grid){
    if (!grid.getAttribute('data-static-cards')){
      grid.setAttribute('data-static-cards', grid.innerHTML);
    }
  }

  /* Kalau Owner Panel menghapus semua isinya, daftar harus ikut
     kosong dan panel "belum ada konten" yang muncul. Tapi kalau
     bidangnya tidak ada sama sekali, biarkan kartu cadangan. */
  function isiAtauKosong(konten, nama){
    if (!konten || !Array.isArray(konten[nama])) return null;
    return konten[nama];
  }

  function pasangPinned(judul){
    if (typeof window.pasangPinnedBar === 'function'){
      window.pasangPinnedBar(judul || '');
      return;
    }
    /* Cadangan kalau community.js belum termuat. Baris dan
       judulnya tetap diisi supaya tampilan tidak setengah jadi. */
    const bar = document.getElementById('an-pinned-bar');
    if (bar){
      const isi = (judul || '').trim();
      bar.hidden = isi === '';
      const target = document.getElementById('an-pinned-title');
      if (target && isi) target.textContent = isi;
    }
  }

  function renderContent(content){
    if (!content) return;

    const anGrid = document.getElementById('an-announcement-grid');
    const anIsi = isiAtauKosong(content, 'announcements');
    if (anGrid && anIsi){
      simpanStatis(anGrid);
      anGrid.innerHTML = anIsi.map(buildAnnCard).join('');
    }

    const evGrid = document.getElementById('ev-event-grid');
    const evIsi = isiAtauKosong(content, 'events');
    if (evGrid && evIsi){
      simpanStatis(evGrid);
      evGrid.innerHTML = evIsi.map(buildEventCard).join('');
    }

    const bannerArea = document.getElementById('banner-viewer');
    const bannerIsi = isiAtauKosong(content, 'banners');
    if (bannerArea && bannerIsi){
      simpanStatis(bannerArea);
      bannerArea.innerHTML = bannerIsi.map(buildBanner).join('');
    }

    pasangPinned(content.pinnedAnnouncement);

    /* Kabari halaman Komunitas supaya penyaringan, status kosong,
       titik banner, dan angka ringkasan ikut dihitung ulang. */
    document.dispatchEvent(new CustomEvent('ghothys-konten-masuk', {
      detail: {
        pengumuman: anIsi ? anIsi.length : 0,
        acara: evIsi ? evIsi.length : 0,
        banner: bannerIsi ? bannerIsi.length : 0
      }
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
        /* relay belum aktif / mati -> biarkan kartu statis */
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