(function(){
  // Ensure owner panel data exists
  window.initializeOwnerData = function(){
    const key = window.STORAGE_KEYS.OWNER_PANEL;
    if(!localStorage.getItem(key)){
      const seed = { announcements: [], events: [], posts: [], pinnedAnnouncement: null, settings: {}, stats: {} };
      localStorage.setItem(key, JSON.stringify(seed));
    }
  };

  window.getOwnerData = function(){
    return JSON.parse(localStorage.getItem(window.STORAGE_KEYS.OWNER_PANEL) || '{}');
  };

  window.openOwnerPanel = function(){
    if(!requireLoggedIn()) return;
    const modal = document.getElementById('owner-panel-modal');
    if(modal){ modal.style.display='block'; document.body.style.overflow='hidden'; }
    if(typeof window.renderOwnerDashboard === 'function') window.renderOwnerDashboard();
  };

  window.closeOwnerPanel = function(){
    const modal = document.getElementById('owner-panel-modal');
    if(modal){ modal.style.display='none'; document.body.style.overflow='auto'; }
  };

  window.renderOwnerDashboard = function(){
    const data = window.getOwnerData();
    const totalMembers = (typeof window.getAllUsers==='function')? window.getAllUsers().length : 0;
    const membersOnline = Math.min(totalMembers, 12); // placeholder; presence not tracked
    const totalPosts = (data.posts && data.posts.length) || 0;
    const pinned = data.pinnedAnnouncement || '—';
    const upcoming = (data.events && data.events.length)? data.events[0].title || '—' : '—';
    const communityActivity = (window.communityMessages && window.communityMessages.length) || 0;
    const latestAnnouncement = (data.announcements && data.announcements.length)? data.announcements[data.announcements.length-1].title || '—' : '—';
    const latestEvent = (data.events && data.events.length)? data.events[data.events.length-1].title || '—' : '—';

    const setText = (id, text)=>{ const el=document.getElementById(id); if(el) el.textContent = text; };
    setText('owner-total-members', totalMembers);
    setText('owner-members-online', membersOnline);
    setText('owner-total-posts', totalPosts);
    setText('owner-pinned-announcement', pinned);
    setText('owner-upcoming-event', upcoming);
    setText('owner-community-activity', communityActivity);
    setText('owner-latest-announcement', latestAnnouncement);
    setText('owner-latest-event', latestEvent);
  };

  /* Announcement Manager (Phase 2) */
  function saveOwnerData(data){
    localStorage.setItem(window.STORAGE_KEYS.OWNER_PANEL, JSON.stringify(data));
    /* Fitur #2: sinkronkan konten owner ke relay (best-effort, tidak blokir). */
    if(window.syncOwnerContent) window.syncOwnerContent(data);
  }

  window.openAnnouncementManager = function(){
    if(!requireLoggedIn()) return;
    const section = document.getElementById('owner-announcements-section');
    if(section){ section.style.display='block'; }
    if(typeof window.renderAnnouncements === 'function') window.renderAnnouncements();
  };

  window.closeAnnouncementManager = function(){
    const section = document.getElementById('owner-announcements-section');
    if(section) section.style.display='none';
  };

  window.renderAnnouncements = function(){
    const data = window.getOwnerData();
    const list = document.getElementById('owner-announcements-list');
    if(!list) return;
    list.innerHTML = '';
    const anns = (data.announcements && data.announcements.slice().reverse()) || [];
    if(anns.length === 0){ list.textContent = 'No announcements yet.'; return; }
    anns.forEach((a, idx) => {
      const id = a.id || ('ann_' + idx + '_' + Date.now());
      const el = document.createElement('div');
      el.className = 'p-3 rounded border';
      el.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <div class="font-semibold">${escapeHtml(a.title)}</div>
            <div class="text-sm text-muted">${escapeHtml(a.content)}</div>
            <div class="text-xs text-gray-400 mt-1">${new Date(a.createdAt).toLocaleString()}</div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <div>${a.pinned? '<span class="text-yellow-400">Pinned</span>':''}</div>
            <div class="flex gap-2">
              <button data-action="owner-edit-ann" data-ann-id="${id}" class="px-2 py-1 bg-blue-500 text-white rounded text-sm">Edit</button>
              <button data-action="owner-del-ann" data-ann-id="${id}" class="px-2 py-1 bg-red-500 text-white rounded text-sm">Delete</button>
            </div>
          </div>
        </div>
      `;
      el.dataset.annId = id;
      list.appendChild(el);
    });
  };

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  function generateId(){ return 'ann_' + Math.random().toString(36).slice(2,9); }

  window.addOwnerAnnouncement = function(title, content, pinned){
    const data = window.getOwnerData();
    if(!data.announcements) data.announcements = [];
    const ann = { id: generateId(), title: title, content: content, pinned: !!pinned, createdAt: new Date().toISOString() };
    if(ann.pinned) data.pinnedAnnouncement = ann.title;
    data.announcements.push(ann);
    saveOwnerData(data);
    if(typeof window.renderAnnouncements === 'function') window.renderAnnouncements();
    if(typeof window.renderOwnerDashboard === 'function') window.renderOwnerDashboard();
  };

  window.deleteOwnerAnnouncement = function(id){
    const data = window.getOwnerData();
    if(!data.announcements) return;
    data.announcements = data.announcements.filter(a => a.id !== id);
    if(data.pinnedAnnouncement && !data.announcements.find(a=>a.title===data.pinnedAnnouncement)) data.pinnedAnnouncement = null;
    saveOwnerData(data);
    if(typeof window.renderAnnouncements === 'function') window.renderAnnouncements();
    if(typeof window.renderOwnerDashboard === 'function') window.renderOwnerDashboard();
  };

  // wire announcement form and delegated buttons
  document.addEventListener('DOMContentLoaded', function(){
    const form = document.getElementById('owner-announcement-form');
    if(form){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        const title = document.getElementById('announcement-title').value.trim();
        const content = document.getElementById('announcement-content').value.trim();
        const pinned = document.getElementById('announcement-pin').checked;
        if(!title || !content) return window.showErrorToast('Invalid','Title & content required');
        window.addOwnerAnnouncement(title, content, pinned);
        form.reset();
      });
    }

    const list = document.getElementById('owner-announcements-list');

  /* Event Manager (Phase 3) */
  window.openEventManager = function(){
    if(!requireLoggedIn()) return;
    const section = document.getElementById('owner-events-section');
    if(section){ section.style.display='block'; }
    if(typeof window.renderEvents === 'function') window.renderEvents();
  };

  window.closeEventManager = function(){
    const section = document.getElementById('owner-events-section');
    if(section) section.style.display='none';
  };

  window.renderEvents = function(){
    const data = window.getOwnerData();
    const list = document.getElementById('owner-events-list');
    if(!list) return;
    list.innerHTML = '';
    const events = (data.events && data.events.slice().sort((a,b)=> new Date(a.date) - new Date(b.date))) || [];
    if(events.length === 0){ list.textContent = 'No events yet.'; return; }
    events.forEach((ev, idx) => {
      const id = ev.id || ('ev_' + idx + '_' + Date.now());
      const el = document.createElement('div');
      el.className = 'p-3 rounded border';
      el.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <div class="font-semibold">${escapeHtml(ev.title)}</div>
            <div class="text-sm text-muted">${escapeHtml(ev.description||'')}</div>
            <div class="text-xs text-gray-400 mt-1">${new Date(ev.date).toLocaleString()}</div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <div class="flex gap-2">
              <button data-action="owner-edit-ev" data-ev-id="${id}" class="px-2 py-1 bg-blue-500 text-white rounded text-sm">Edit</button>
              <button data-action="owner-del-ev" data-ev-id="${id}" class="px-2 py-1 bg-red-500 text-white rounded text-sm">Delete</button>
            </div>
          </div>
        </div>
      `;
      el.dataset.evId = id;
      list.appendChild(el);
    });
  };

  window.addOwnerEvent = function(title, date, description){
    const data = window.getOwnerData();
    if(!data.events) data.events = [];
    const ev = { id: generateId(), title: title, date: date, description: description||'', createdAt: new Date().toISOString() };
    data.events.push(ev);
    saveOwnerData(data);
    if(typeof window.renderEvents === 'function') window.renderEvents();
    if(typeof window.renderOwnerDashboard === 'function') window.renderOwnerDashboard();
  };

  window.deleteOwnerEvent = function(id){
    const data = window.getOwnerData();
    if(!data.events) return;
    data.events = data.events.filter(a => a.id !== id);
    saveOwnerData(data);
    if(typeof window.renderEvents === 'function') window.renderEvents();
    if(typeof window.renderOwnerDashboard === 'function') window.renderOwnerDashboard();
  };

  // wire event form and delegated buttons
  document.addEventListener('DOMContentLoaded', function(){
    const form = document.getElementById('owner-event-form');
    if(form){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        const title = document.getElementById('event-title').value.trim();
        const date = document.getElementById('event-date').value;
        const description = document.getElementById('event-description').value.trim();
        if(!title || !date) return window.showErrorToast('Invalid','Title & date required');
        window.addOwnerEvent(title, date, description);
        form.reset();
      });
    }

    const list = document.getElementById('owner-events-list');
    if(list){
      list.addEventListener('click', function(e){
        const btn = e.target.closest('button[data-action]');
        if(!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.evId;
        if(action === 'owner-del-ev'){
          if(confirm('Hapus event ini?')) window.deleteOwnerEvent(id);
        } else if(action === 'owner-edit-ev'){
          const data = window.getOwnerData();
          const ev = data.events.find(a=>a.id===id);
          if(!ev) return;
          const newTitle = prompt('Edit title', ev.title) || ev.title;
          const newDate = prompt('Edit date (ISO)', ev.date) || ev.date;
          const newDesc = prompt('Edit description', ev.description) || ev.description;
          ev.title = newTitle; ev.date = newDate; ev.description = newDesc;
          saveOwnerData(data);
          if(typeof window.renderEvents === 'function') window.renderEvents();
          if(typeof window.renderOwnerDashboard === 'function') window.renderOwnerDashboard();
        }
      });
    }
  });

  /* Banner / Gallery Manager (Phase 4) */
  window.openBannerManager = function(){
    if(!requireLoggedIn()) return;
    const section = document.getElementById('owner-banners-section');
    if(section){ section.style.display='block'; }
    if(typeof window.renderBanners === 'function') window.renderBanners();
  };

  window.closeBannerManager = function(){
    const section = document.getElementById('owner-banners-section');
    if(section) section.style.display='none';
  };

  window.renderBanners = function(){
    const data = window.getOwnerData();
    const list = document.getElementById('owner-banners-list');
    if(!list) return;
    list.innerHTML = '';
    const banners = (data.banners && data.banners.slice().reverse()) || [];
    if(banners.length === 0){ list.textContent = 'No banners yet.'; return; }
    banners.forEach((b, idx) => {
      const id = b.id || ('bn_' + idx + '_' + Date.now());
      const el = document.createElement('div');
      el.className = 'rounded overflow-hidden border p-1';
      el.style.minHeight = '80px';
      el.innerHTML = `
        <div class="relative">
          <img src="${b.data}" alt="banner" style="width:100%;height:100px;object-fit:cover;display:block;" />
          <div class="absolute top-1 right-1">
            <button data-action="owner-del-banner" data-banner-id="${id}" class="px-2 py-1 bg-red-600 text-white rounded text-xs">Delete</button>
          </div>
        </div>
      `;
      el.dataset.bannerId = id;
      list.appendChild(el);
    });
  };

  window.addOwnerBanner = function(dataUrl){
    const data = window.getOwnerData();
    if(!data.banners) data.banners = [];
    const banner = { id: generateId(), data: dataUrl, createdAt: new Date().toISOString() };
    data.banners.push(banner);
    saveOwnerData(data);
    if(typeof window.renderBanners === 'function') window.renderBanners();
  };

  window.deleteOwnerBanner = function(id){
    const data = window.getOwnerData();
    if(!data.banners) return;
    data.banners = data.banners.filter(b => b.id !== id);
    saveOwnerData(data);
    if(typeof window.renderBanners === 'function') window.renderBanners();
  };

  // wire banner upload and delete
  document.addEventListener('DOMContentLoaded', function(){
    const uplBtn = document.getElementById('owner-banner-upload-btn');
    const input = document.getElementById('owner-banner-input');
    if(uplBtn && input){
      uplBtn.addEventListener('click', function(){ input.click(); });
      input.addEventListener('change', function(e){
        const f = input.files && input.files[0];
        if(!f) return;
        if(f.size > 2 * 1024 * 1024) {
          if(!confirm('File besar—lanjutkan?')) return;
        }
        const reader = new FileReader();
        reader.onload = function(ev){
          const dataUrl = ev.target.result;
          window.addOwnerBanner(dataUrl);
        };
        reader.readAsDataURL(f);
      });
    }

    const list = document.getElementById('owner-banners-list');
    if(list){
      list.addEventListener('click', function(e){
        const btn = e.target.closest('button[data-action]');
        if(!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.bannerId;
        if(action === 'owner-del-banner'){
          if(confirm('Hapus banner ini?')) window.deleteOwnerBanner(id);
        }
      });
    }
  });
    if(list){
      list.addEventListener('click', function(e){
        const btn = e.target.closest('button[data-action]');
        if(!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.annId;
        if(action === 'owner-del-ann'){
          if(confirm('Hapus pengumuman ini?')) window.deleteOwnerAnnouncement(id);
        } else if(action === 'owner-edit-ann'){
          // simple edit prompt for now
          const data = window.getOwnerData();
          const ann = data.announcements.find(a=>a.id===id);
          if(!ann) return;
          const newTitle = prompt('Edit title', ann.title) || ann.title;
          const newContent = prompt('Edit content', ann.content) || ann.content;
          ann.title = newTitle; ann.content = newContent;
          saveOwnerData(data);
          if(typeof window.renderAnnouncements === 'function') window.renderAnnouncements();
          if(typeof window.renderOwnerDashboard === 'function') window.renderOwnerDashboard();
        }
      });
    }
  });

/* Tombol OWNER PANEL hanya muncul untuk user yang sudah login di toko
     DAN email-nya sama dengan ownerEmail di GHOTHYS_NOTIFY_CONFIG.
     Owner email = admin email (ADMIN_EMAIL di Worker).
     Di dalam panel, hak simpan ke server tetap butuh login admin
     lewat kotak Sinkronisasi Konten. */
  function showOwnerButtonIfAllowed(){
    const list = document.querySelectorAll('.owner-panel-open');
    if(!list.length) return;
    const ownerEmail = (window.GHOTHYS_NOTIFY_CONFIG?.ownerEmail || '').toLowerCase();
    const userEmail = (window.currentUser?.email || '').toLowerCase();
    const isOwner = !!window.currentUser && userEmail === ownerEmail && ownerEmail !== '';
    list.forEach(function(btn){ btn.style.display = isOwner ? 'inline-block' : 'none'; });
  }
  window.refreshOwnerButton = showOwnerButtonIfAllowed;

  /* requireLoggedIn dipakai handler internal panel (buka manajer announc/event/banner).
     Cukup login toko + email owner. Hak simpan ke server dicek terpisah via owner-sync.js. */
  function requireLoggedIn(){
    const ownerEmail = (window.GHOTHYS_NOTIFY_CONFIG?.ownerEmail || '').toLowerCase();
    const userEmail = (window.currentUser?.email || '').toLowerCase();
    if(window.currentUser && userEmail === ownerEmail) return true;
    window.showErrorToast('Akses Ditolak','Hanya pemilik toko yang dapat mengakses panel ini');
    if(typeof window.openLoginModal==='function') window.openLoginModal();
    return false;
  }

  document.addEventListener('DOMContentLoaded', function(){
    if(typeof window.STORAGE_KEYS==='undefined') window.STORAGE_KEYS = {};
    window.initializeOwnerData();
    showOwnerButtonIfAllowed();

    // ensure the close button inside modal works
    const closeBtn = document.querySelector('#owner-panel-modal .owner-close');
    if(closeBtn) closeBtn.addEventListener('click', () => window.closeOwnerPanel());

    // re-render whenever UI updates (best-effort): hook into updateUI by wrapping if exists
    if(typeof window.updateUI === 'function'){
      const orig = window.updateUI;
      window.updateUI = function(){ orig(); showOwnerButtonIfAllowed(); };
    }
  });
})();
