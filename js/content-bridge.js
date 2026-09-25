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
     SISI PUBLIK -> GET /content + render ke grid
     ------------------------------------------------------------ */
  function buildAnnCard(ann, idx){
    var pinned = ann.pinned ? '<div class="an-cc-badges"><span class="an-badge pinned">Pinned</span><span class="an-badge official">Official</span></div>'
      : '<div class="an-cc-badges"><span class="an-badge ' + (ann.category==='event'?'event':'info') + '">' + escapeHtml(ann.category || 'Info') + '</span></div>';
    var cover = (ann.imageUrl)
      ? '<img src="' + escapeHtml(ann.imageUrl) + '" alt="' + escapeHtml(ann.title) + '" loading="lazy">'
      : '<div class="an-cc-grad" style="background:linear-gradient(135deg,#1f2937,#7c3aed)"></div>';
    return '' +
      '<div class="an-card" data-title="' + escapeHtml(ann.title) + '" data-category="' + escapeHtml(ann.category || 'info') + '">' +
        '<div class="an-card-cover">' +
          cover +
          '<div class="an-cc-overlay"></div>' +
          pinned +
          '<button class="an-cc-bookmark">🔖</button>' +
        '</div>' +
        '<div class="an-card-body">' +
          '<div class="an-card-cat">' + escapeHtml(ann.category === 'event' ? '🎉 Event' : '📢 ' + (ann.category || 'Pengumuman')) + '</div>' +
          '<div class="an-card-title">' + escapeHtml(ann.title) + '</div>' +
          '<div class="an-card-desc">' + escapeHtml(ann.content) + '</div>' +
          '<div class="an-card-footer">' +
            '<span class="an-cf-author"><span class="an-cf-avatar">👑</span> Owner</span>' +
            '<span class="an-cf-date">' + escapeHtml(ann.date || ann.createdAt ? new Date(ann.date || ann.createdAt).toLocaleDateString('id-ID') : '—') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function buildEventCard(ev, idx){
    var badges = ev.status==='live'
      ? '<div class="ev-cc-badges"><span class="ev-badge live">● Live</span><span class="ev-badge featured-sm">Featured</span></div>'
      : '<div class="ev-cc-badges"><span class="ev-badge ' + escapeHtml(ev.status || 'upcoming') + '">' + escapeHtml(ev.status || 'Upcoming') + '</span></div>';
    var cover = (ev.imageUrl)
      ? '<img src="' + escapeHtml(ev.imageUrl) + '" alt="' + escapeHtml(ev.title) + '" loading="lazy">'
      : '<div class="ev-cc-grad" style="background:linear-gradient(135deg,#1e3a8a,#7c3aed)"></div>';
    return '' +
      '<div class="ev-card" data-title="' + escapeHtml(ev.title) + '" data-category="' + escapeHtml(ev.category || 'event') + '" data-status="' + escapeHtml(ev.status || 'upcoming') + '">' +
        '<div class="ev-card-cover">' +
          cover +
          '<div class="ev-cc-overlay"></div>' +
          badges +
          '<button class="ev-cc-bookmark">🔖</button>' +
        '</div>' +
        '<div class="ev-card-body">' +
          '<div class="ev-card-cat">' + escapeHtml(ev.category ? ev.categoryLabel || ev.category : '🎪 Event') + '</div>' +
          '<div class="ev-card-title">' + escapeHtml(ev.title) + '</div>' +
          '<div class="ev-card-desc">' + escapeHtml(ev.description || '') + '</div>' +
          '<div class="ev-card-meta"><span class="ev-cm-item">' + escapeHtml(ev.date ? new Date(ev.date).toLocaleDateString('id-ID') : '—') + '</span><span class="ev-cm-item">' + escapeHtml(ev.location || '') + '</span></div>' +
        '</div>' +
      '</div>';
  }

  function buildBanner(b, idx){
    return '<div class="pb-banner-item">' +
      '<div class="pb-banner-cover"><img src="' + escapeHtml(b.imageUrl) + '" alt="' + escapeHtml(b.title || 'Banner') + '" loading="lazy"></div>' +
      (b.title ? '<div class="pb-banner-title">' + escapeHtml(b.title) + '</div>' : '') +
      (b.link ? '<a class="pb-banner-link" href="' + escapeHtml(b.link) + '">Lihat Detail →</a>' : '') +
    '</div>';
  }

  function renderContent(content){
    if(!content) return;
    /* Pengumuman -> grid publik */
    var annGrid = document.querySelector('#an-announcement-grid');
    if(annGrid && content.announcements && content.announcements.length){
      var html = content.announcements.map(buildAnnCard).join('');
      /* simpan static cards sbg fallback kalau relay mati nanti */
      if(!annGrid.getAttribute('data-static-cards')){
        annGrid.setAttribute('data-static-cards', annGrid.innerHTML);
      }
      annGrid.innerHTML = html;
      if(typeof window.bindInteractionCards === 'function') window.bindInteractionCards(annGrid);
    }
    /* Event -> grid event */
    var evGrid = document.querySelector('#ev-event-grid');
    if(evGrid && content.events && content.events.length){
      if(!evGrid.getAttribute('data-static-cards')){
        evGrid.setAttribute('data-static-cards', evGrid.innerHTML);
      }
      evGrid.innerHTML = content.events.map(buildEventCard).join('');
      if(typeof window.bindInteractionCards === 'function') window.bindInteractionCards(evGrid);
    }
    /* Banner -> area banner publik */
    var bannerArea = document.querySelector('#banner-viewer, .pb-banner-track, [id*="banner"][class*="track"]');
    if(bannerArea && content.banners && content.banners.length){
      if(!bannerArea.getAttribute('data-static-cards')){
        bannerArea.setAttribute('data-static-cards', bannerArea.innerHTML);
      }
      bannerArea.innerHTML = content.banners.map(buildBanner).join('');
      if(typeof window.initSlider === 'function') window.initSlider(bannerArea);
    }
    /* Pinned announcement -> teks di sidebar publika bila ada */
    if(content.pinnedAnnouncement){
      var pinEl = document.querySelector('[id*="pinned"]');
      if(pinEl && typeof pinEl !== 'function'){
        pinEl.textContent = content.pinnedAnnouncement;
      }
    }
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
