/* ═══════════════════════════════════════════════════════
   GHOTHYS STORE — Media Gallery Interactions
   Search, filters, lightbox, carousel, counters
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const DATA = [
    {
      id: 'm1', title: 'Neon Nights — Official Trailer', cat: 'Trailer',
      duration: '2:31', creator: 'GhothysPro', creatorAv: 'G', type: 'video',
      views: '12.4K', likes: '1.8K',
      featured: true,
      images: { thumb: 'https://placehold.co/400x225/0F142D/8B5CF6?text=Trailer', full: 'https://placehold.co/900x506/0F142D/8B5CF6?text=Neon+Nights' },
      tags: ['trending', 'popular', 'official'],
      date: '2026-07-15'
    },
    {
      id: 'm2', title: 'Character Concept: Valkyrie', cat: 'Artwork',
      duration: null, creator: 'ArtByZara', creatorAv: 'Z', type: 'image',
      views: '8.7K', likes: '2.3K',
      featured: true,
      images: { thumb: 'https://placehold.co/400x225/1A1040/FBBF24?text=Art', full: 'https://placehold.co/900x506/1A1040/FBBF24?text=Valkyrie' },
      tags: ['artwork', 'popular', 'featured'],
      date: '2026-07-18'
    },
    {
      id: 'm3', title: 'Behind the Scenes — Devlog #7', cat: 'Devlog',
      duration: '8:15', creator: 'GhothysPro', creatorAv: 'G', type: 'video',
      views: '6.2K', likes: '1.1K',
      featured: true,
      images: { thumb: 'https://placehold.co/400x225/0D1B2A/22C55E?text=Devlog', full: 'https://placehold.co/900x506/0D1B2A/22C55E?text=Devlog+7' },
      tags: ['development', 'behind-the-scenes'],
      date: '2026-07-12'
    },
    {
      id: 'm4', title: 'Fan Art: Cyber City', cat: 'Artwork',
      duration: null, creator: 'PixelWitch', creatorAv: 'P', type: 'image',
      views: '3.1K', likes: '892',
      featured: false,
      images: { thumb: 'https://placehold.co/400x225/0F142D/3B82F6?text=Fan+Art', full: 'https://placehold.co/900x506/0F142D/3B82F6?text=Cyber+City' },
      tags: ['artwork', 'fan-art'],
      date: '2026-07-16'
    },
    {
      id: 'm5', title: 'Gameplay Preview — Boss Fight', cat: 'Gameplay',
      duration: '4:42', creator: 'SpeedRunnerX', creatorAv: 'S', type: 'video',
      views: '15.2K', likes: '3.4K',
      featured: false,
      images: { thumb: 'https://placehold.co/400x225/1A1040/EF4444?text=Gameplay', full: 'https://placehold.co/900x506/1A1040/EF4444?text=Boss+Fight' },
      tags: ['gameplay', 'popular', 'trending'],
      date: '2026-07-19'
    },
    {
      id: 'm6', title: 'UI Design — HUD Showcase', cat: 'Design',
      duration: null, creator: 'GhothysPro', creatorAv: 'G', type: 'image',
      views: '5.8K', likes: '1.4K',
      featured: false,
      images: { thumb: 'https://placehold.co/400x225/0D1B2A/A78BFA?text=UI+Design', full: 'https://placehold.co/900x506/0D1B2A/A78BFA?text=HUD+Showcase' },
      tags: ['design', 'ui', 'featured'],
      date: '2026-07-14'
    },
    {
      id: 'm7', title: 'Animation Reel 2026', cat: 'Animation',
      duration: '3:10', creator: 'Animatrix', creatorAv: 'A', type: 'video',
      views: '9.5K', likes: '2.1K',
      featured: false,
      images: { thumb: 'https://placehold.co/400x225/0F142D/22C55E?text=Animation', full: 'https://placehold.co/900x506/0F142D/22C55E?text=Reel+2026' },
      tags: ['animation', 'popular'],
      date: '2026-07-10'
    },
    {
      id: 'm8', title: 'Comic Strip: Episode 1', cat: 'Comic',
      duration: null, creator: 'StoryBird', creatorAv: 'S', type: 'image',
      views: '2.8K', likes: '743',
      featured: false,
      images: { thumb: 'https://placehold.co/400x225/1A1040/FBBF24?text=Comic', full: 'https://placehold.co/900x506/1A1040/FBBF24?text=Episode+1' },
      tags: ['comic', 'story'],
      date: '2026-07-08'
    },
    {
      id: 'm9', title: 'Environment Design — Abyss', cat: 'Design',
      duration: null, creator: 'VoidArtist', creatorAv: 'V', type: 'image',
      views: '4.3K', likes: '967',
      featured: false,
      images: { thumb: 'https://placehold.co/400x225/0D1B2A/8B5CF6?text=Abyss', full: 'https://placehold.co/900x506/0D1B2A/8B5CF6?text=Environment' },
      tags: ['design', 'environment'],
      date: '2026-07-13'
    },
    {
      id: 'm10', title: 'Multiplayer Montage', cat: 'Gameplay',
      duration: '6:22', creator: 'ClutchKing', creatorAv: 'C', type: 'video',
      views: '18.6K', likes: '4.7K',
      featured: false,
      images: { thumb: 'https://placehold.co/400x225/0F142D/EF4444?text=Montage', full: 'https://placehold.co/900x506/0F142D/EF4444?text=Multiplayer' },
      tags: ['gameplay', 'trending', 'popular'],
      date: '2026-07-17'
    },
    {
      id: 'm11', title: 'Music Track: Synthwave', cat: 'Audio',
      duration: '3:54', creator: 'DJPhantom', creatorAv: 'D', type: 'video',
      views: '7.1K', likes: '1.9K',
      featured: false,
      images: { thumb: 'https://placehold.co/400x225/1A1040/3B82F6?text=Music', full: 'https://placehold.co/900x506/1A1040/3B82F6?text=Synthwave' },
      tags: ['audio', 'music'],
      date: '2026-07-11'
    },
    {
      id: 'm12', title: 'Speed Paint: Dragon Lord', cat: 'Artwork',
      duration: '1:28', creator: 'ArtByZara', creatorAv: 'Z', type: 'video',
      views: '4.9K', likes: '1.2K',
      featured: false,
      images: { thumb: 'https://placehold.co/400x225/0D1B2A/FBBF24?text=Speedpaint', full: 'https://placehold.co/900x506/0D1B2A/FBBF24?text=Dragon+Lord' },
      tags: ['artwork', 'speedpaint'],
      date: '2026-07-09'
    },
    {
      id: 'm13', title: 'Wallpaper Pack — Night City', cat: 'Artwork',
      duration: null, creator: 'PixelWitch', creatorAv: 'P', type: 'image',
      views: '2.2K', likes: '634',
      featured: false,
      images: { thumb: 'https://placehold.co/400x225/0F142D/A78BFA?text=Wallpaper', full: 'https://placehold.co/900x506/0F142D/A78BFA?text=Night+City' },
      tags: ['artwork', 'wallpaper'],
      date: '2026-07-07'
    },
    {
      id: 'm14', title: 'Dev Talk — Roadmap 2027', cat: 'Devlog',
      duration: '12:08', creator: 'GhothysPro', creatorAv: 'G', type: 'video',
      views: '11.3K', likes: '2.8K',
      featured: false,
      images: { thumb: 'https://placehold.co/400x225/1A1040/22C55E?text=Roadmap', full: 'https://placehold.co/900x506/1A1040/22C55E?text=Roadmap+2027' },
      tags: ['development', 'devlog'],
      date: '2026-07-06'
    },
    {
      id: 'm15', title: 'Fan Fiction: Origins', cat: 'Comic',
      duration: null, creator: 'StoryBird', creatorAv: 'S', type: 'image',
      views: '1.9K', likes: '521',
      featured: false,
      images: { thumb: 'https://placehold.co/400x225/0D1B2A/8B5CF6?text=Fan+Fic', full: 'https://placehold.co/900x506/0D1B2A/8B5CF6?text=Origins' },
      tags: ['comic', 'fan-fiction'],
      date: '2026-07-05'
    }
  ];

  const CREATORS = [
    { id: 'c1', name: 'GhothysPro', role: 'Developer', avatar: 'G', mediaCount: 47, followers: '12.3K', color: '#8B5CF6', featured: true },
    { id: 'c2', name: 'ArtByZara', role: 'Artist', avatar: 'Z', mediaCount: 31, followers: '8.9K', color: '#FBBF24', featured: true },
    { id: 'c3', name: 'PixelWitch', role: 'Digital Artist', avatar: 'P', mediaCount: 24, followers: '6.1K', color: '#3B82F6', featured: false },
    { id: 'c4', name: 'SpeedRunnerX', role: 'Streamer', avatar: 'S', mediaCount: 18, followers: '5.4K', color: '#EF4444', featured: false },
    { id: 'c5', name: 'Animatrix', role: 'Animator', avatar: 'A', mediaCount: 15, followers: '4.7K', color: '#22C55E', featured: false },
    { id: 'c6', name: 'StoryBird', role: 'Writer', avatar: 'S', mediaCount: 12, followers: '3.2K', color: '#F59E0B', featured: false },
    { id: 'c7', name: 'VoidArtist', role: 'Concept Artist', avatar: 'V', mediaCount: 9, followers: '2.8K', color: '#A78BFA', featured: false },
    { id: 'c8', name: 'DJPhantom', role: 'Composer', avatar: 'D', mediaCount: 7, followers: '2.1K', color: '#6366F1', featured: false },
  ];

  const TRENDING = [
    { title: 'Boss Fight Montage', meta: '18.6K views', thumb: 'https://placehold.co/200x110/1A1040/EF4444?text=Boss' },
    { title: 'Neon Nights Trailer', meta: '12.4K views', thumb: 'https://placehold.co/200x110/0F142D/8B5CF6?text=Trailer' },
    { title: 'Devlog Roadmap', meta: '11.3K views', thumb: 'https://placehold.co/200x110/0D1B2A/22C55E?text=Devlog' },
    { title: 'Animation Reel', meta: '9.5K views', thumb: 'https://placehold.co/200x110/0F142D/22C55E?text=Reel' },
    { title: 'Valkyrie Art', meta: '8.7K views', thumb: 'https://placehold.co/200x110/1A1040/FBBF24?text=Art' },
    { title: 'Synthwave Track', meta: '7.1K views', thumb: 'https://placehold.co/200x110/0F142D/3B82F6?text=Music' },
    { title: 'Devlog #7', meta: '6.2K views', thumb: 'https://placehold.co/200x110/0D1B2A/22C55E?text=Devlog+7' },
    { title: 'UI HUD Showcase', meta: '5.8K views', thumb: 'https://placehold.co/200x110/0D1B2A/A78BFA?text=HUD' },
    { title: 'Speedpaint Dragon', meta: '4.9K views', thumb: 'https://placehold.co/200x110/1A1040/FBBF24?text=Dragon' },
    { title: 'Abyss Environment', meta: '4.3K views', thumb: 'https://placehold.co/200x110/0D1B2A/8B5CF6?text=Abyss' },
    { title: 'Cyber City Fan Art', meta: '3.1K views', thumb: 'https://placehold.co/200x110/0F142D/3B82F6?text=Cyber' },
    { title: 'Comic Episode 1', meta: '2.8K views', thumb: 'https://placehold.co/200x110/1A1040/FBBF24?text=Comic' },
  ];

  const CAT_COLORS = {
    Trailer: '#8B5CF6', Artwork: '#FBBF24', Devlog: '#22C55E',
    Gameplay: '#EF4444', Design: '#A78BFA', Animation: '#22C55E',
    Comic: '#F59E0B', Audio: '#3B82F6'
  };

  let currentFilter = 'All';
  let searchQuery = '';
  let lightboxIndex = -1;
  let filteredItems = [...DATA];

  function renderStats () {
    const total = DATA.length;
    const videos = DATA.filter(d => d.type === 'video').length;
    const images = total - videos;
    const topCreator = [...CREATORS].sort((a,b) => parseInt(b.followers) - parseInt(a.followers))[0];
    document.getElementById('md-total-media').textContent = total;
    document.getElementById('md-total-videos').textContent = videos;
    document.getElementById('md-total-images').textContent = images;
    document.getElementById('md-top-creator').textContent = topCreator.name;
    const totalViews = DATA.reduce((s, d) => s + parseInt(d.views), 0);
    document.getElementById('md-total-views').innerHTML = (totalViews / 1000).toFixed(1) + 'K';
    document.getElementById('md-total-likes').innerHTML = DATA.reduce((s, d) => s + parseInt(d.likes), 0) > 1000
      ? (DATA.reduce((s, d) => s + parseInt(d.likes), 0) / 1000).toFixed(1) + 'K'
      : DATA.reduce((s, d) => s + parseInt(d.likes), 0);
    document.getElementById('md-total-creators').textContent = CREATORS.length;
  }

  function renderGrid () {
    const grid = document.getElementById('md-grid');
    const noResult = document.getElementById('md-no-result');
    const count = document.getElementById('md-search-count');

    const items = DATA.filter(d => {
      const catMatch = currentFilter === 'All' || d.cat === currentFilter;
      const searchMatch = !searchQuery ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.tags.some(t => t.includes(searchQuery.toLowerCase()));
      return catMatch && searchMatch;
    });

    filteredItems = items;

    if (count) {
      count.textContent = items.length === DATA.length
        ? `${items.length} items`
        : `${items.length} of ${DATA.length} items`;
    }

    if (items.length === 0) {
      grid.innerHTML = '';
      noResult.classList.add('visible');
      return;
    }
    noResult.classList.remove('visible');

    grid.innerHTML = items.map(d => {
      const catColor = CAT_COLORS[d.cat] || '#8B5CF6';
      return `
<div class="md-card" data-id="${d.id}" data-cat="${d.cat}" data-type="${d.type}" data-creator="${d.creator.toLowerCase()}" data-tags="${d.tags.join(',')}">
  <div class="md-card-thumb">
    <img src="${d.images.thumb}" alt="${d.title}" loading="lazy" onerror="this.src='https://placehold.co/400x225/0F142D/8B5CF6?text=?'">
    <div class="md-card-overlay"></div>
    ${d.duration ? `<span class="md-card-duration">${d.duration}</span>` : ''}
    <span class="md-card-cat" style="background:${catColor}22;color:${catColor}">${d.cat}</span>
    <div class="md-card-actions-overlay">
      <button class="md-card-action" onclick="event.stopPropagation();alert('❤️ Liked!')" title="Like">❤</button>
      <button class="md-card-action" onclick="event.stopPropagation();alert('💾 Saved!')" title="Save">💾</button>
      <button class="md-card-action" onclick="event.stopPropagation();alert('🔗 Copied!')" title="Share">🔗</button>
    </div>
  </div>
  <div class="md-card-body">
    <div class="md-card-title">${d.title}</div>
    <div class="md-card-meta">
      <span class="md-card-creator">
        <span class="md-card-creator-avatar">${d.creatorAv}</span>
        ${d.creator}
      </span>
      <span class="md-card-stats">👁 ${d.views} · ❤ ${d.likes}</span>
    </div>
  </div>
</div>`;
    }).join('');
  }

  function renderFeatured () {
    const featured = DATA.filter(d => d.featured).slice(0, 3);
    if (featured.length === 0) return;

    const main = featured[0];
    document.querySelector('.md-fm-img').src = main.images.thumb;
    document.querySelector('.md-fm-title').textContent = main.title;
    document.querySelector('.md-fm-meta').innerHTML = `<span>👁 ${main.views}</span><span>❤ ${main.likes}</span><span>${main.creator}</span>`;
    document.querySelector('.md-fm-badges').innerHTML = `<span class="md-fm-badge featured">Featured</span>${main.tags.includes('official') ? '<span class="md-fm-badge official">Official</span>' : ''}`;
    document.querySelector('.md-featured-main').onclick = () => openLightbox(DATA.indexOf(main));

    const sideCont = document.querySelector('.md-featured-side');
    const rest = featured.slice(1);
    sideCont.innerHTML = rest.map(d => `
<div class="md-fs-item" onclick="openLightbox(${DATA.indexOf(d)})">
  <img class="md-fs-img" src="${d.images.thumb}" alt="${d.title}" onerror="this.src='https://placehold.co/400x225/0F142D/8B5CF6?text=?'">
  <div class="md-fs-overlay"></div>
  <div class="md-fs-content">
    <div class="md-fs-title">${d.title}</div>
    <div class="md-fs-meta">👁 ${d.views} · ${d.creator}</div>
  </div>
</div>`;
    ).join('');
  }

  function renderCreators () {
    const cont = document.getElementById('md-creator-grid');
    cont.innerHTML = CREATORS.map(c => `
<div class="md-spotlight-card${c.featured ? ' featured' : ''}">
  <div class="md-spotlight-avatar" style="background:${c.color}11;color:${c.color}">${c.avatar}</div>
  <div class="md-spotlight-info">
    <div class="md-spotlight-name">${c.name} ${c.featured ? '<span class="md-spotlight-featured-badge">✦ Featured</span>' : ''}</div>
    <div class="md-spotlight-role">${c.role} · ${c.mediaCount} media</div>
  </div>
  <div class="md-spotlight-stat">${c.followers}</div>
</div>`;
    ).join('');
  }

  function renderTrending () {
    const track = document.querySelector('.md-trending-track');
    const doubled = [...TRENDING, ...TRENDING];
    track.innerHTML = doubled.map(d => `
<div class="md-trending-item">
  <img class="md-trending-thumb" src="${d.thumb}" alt="${d.title}" onerror="this.src='https://placehold.co/200x110/0F142D/8B5CF6?text=?'">
  <div class="md-trending-info">
    <div class="md-trending-title">${d.title}</div>
    <div class="md-trending-meta">👁 ${d.meta}</div>
  </div>
</div>`;
    ).join('');
  }

  function renderSidebar () {
    const recent = [...DATA].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
    const popular = [...DATA].sort((a,b) => parseInt(b.views) - parseInt(a.views)).slice(0, 4);
    const cats = Object.entries(CAT_COLORS).slice(0, 4);

    document.getElementById('md-recent-list').innerHTML = recent.map(d => `
<div class="md-side-item" onclick="openLightbox(${DATA.indexOf(d)})">
  <img class="md-si-thumb" src="${d.images.thumb}" alt="" onerror="this.src='https://placehold.co/36x36/0F142D/8B5CF6?text=?'">
  <div class="md-si-text">
    <div class="md-si-title">${d.title}</div>
    <div class="md-si-meta">👁 ${d.views} · ${d.creator}</div>
  </div>
</div>`;
    ).join('');

    document.getElementById('md-popular-list').innerHTML = popular.map(d => `
<div class="md-side-item" onclick="openLightbox(${DATA.indexOf(d)})">
  <div class="md-si-icon">${d.type === 'video' ? '🎬' : '🖼'}</div>
  <div class="md-si-text">
    <div class="md-si-title">${d.title}</div>
    <div class="md-si-meta">👁 ${d.views} · ❤ ${d.likes}</div>
  </div>
</div>`;
    ).join('');

    document.getElementById('md-categories-list').innerHTML = cats.map(([name, color]) => {
      const count = DATA.filter(d => d.cat === name).length;
      return `
<div class="md-side-item" onclick="setFilter('${name}')">
  <div class="md-si-icon" style="color:${color}">●</div>
  <div class="md-si-text">
    <div class="md-si-title">${name}</div>
    <div class="md-si-meta">${count} items</div>
  </div>
</div>`;
    }).join('');
  }

  function setFilter (cat) {
    currentFilter = cat;
    document.querySelectorAll('.md-filter-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.cat === cat);
    });
    renderGrid();
  }

  function initFilters () {
    const cats = ['All', ...new Set(DATA.map(d => d.cat))];
    const cont = document.getElementById('md-filter-tabs');
    cont.innerHTML = cats.map(c => `
<button class="md-filter-tab ${c === 'All' ? 'active' : ''}" data-cat="${c}" onclick="setFilter('${c}')">${c}</button>`
    ).join('');
  }

  function openLightbox (idx) {
    if (idx < 0 || idx >= DATA.length) return;
    lightboxIndex = idx;
    const item = DATA[idx];
    const lb = document.getElementById('md-lightbox');
    document.getElementById('md-lb-img').src = item.images.full;
    document.getElementById('md-lb-title').textContent = item.title;
    document.getElementById('md-lb-desc').innerHTML = `<span>👁 ${item.views}</span> · <span>❤ ${item.likes}</span> · <span>${item.creator}</span>`;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  window.openLightbox = openLightbox;

  function closeLightbox () {
    document.getElementById('md-lightbox').classList.remove('open');
    document.body.style.overflow = '';
  }

  function navLightbox (dir) {
    const newIdx = lightboxIndex + dir;
    if (newIdx < 0 || newIdx >= DATA.length) return;
    openLightbox(newIdx);
  }

  function initLightbox () {
    document.getElementById('md-lb-close').addEventListener('click', closeLightbox);
    document.getElementById('md-lightbox').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeLightbox();
    });
    document.querySelector('.md-lb-prev').addEventListener('click', () => navLightbox(-1));
    document.querySelector('.md-lb-next').addEventListener('click', () => navLightbox(1));
    document.addEventListener('keydown', e => {
      if (!document.getElementById('md-lightbox').classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navLightbox(-1);
      if (e.key === 'ArrowRight') navLightbox(1);
    });
  }

  function initSearch () {
    const input = document.getElementById('md-search-input');
    input.addEventListener('input', function () {
      searchQuery = this.value.trim();
      renderGrid();
    });
  }

  function initSelectFilters () {
    document.getElementById('md-sort-type').addEventListener('change', function () {
      const val = this.value;
      if (val === 'all') currentFilter = 'All';
      else {
        const map = {
          videos: 'Video',
          images: 'Image',
          artwork: 'Artwork',
          gameplay: 'Gameplay',
          devlog: 'Devlog',
          design: 'Design'
        };
        currentFilter = map[val] || 'All';
      }
      document.querySelectorAll('.md-filter-tab').forEach(el => {
        el.classList.toggle('active', el.dataset.cat === currentFilter);
      });
      renderGrid();
    });

    document.getElementById('md-sort-order').addEventListener('change', function () {
      const val = this.value;
      const grid = document.getElementById('md-grid');
      const items = [...grid.querySelectorAll('.md-card')];
      const sorter = {
        newest: (a,b) => DATA.findIndex(d => d.id === b.dataset.id) - DATA.findIndex(d => d.id === a.dataset.id),
        oldest: (a,b) => DATA.findIndex(d => d.id === a.dataset.id) - DATA.findIndex(d => d.id === b.dataset.id),
        popular: (a,b) => parseInt(DATA.find(d => d.id === b.dataset.id)?.views || 0) - parseInt(DATA.find(d => d.id === a.dataset.id)?.views || 0),
        name: (a,b) => (DATA.find(d => d.id === a.dataset.id)?.title || '').localeCompare(DATA.find(d => d.id === b.dataset.id)?.title || '')
      };
      items.sort(sorter[val] || sorter.newest);
      items.forEach(el => grid.appendChild(el));
    });
  }

  let _initialized = false;

  function init () {
    if (!document.getElementById('md-section')) return;
    if (_initialized) {
      renderStats();
      renderGrid();
      renderFeatured();
      renderCreators();
      renderTrending();
      renderSidebar();
      return;
    }
    _initialized = true;
    renderStats();
    renderGrid();
    renderFeatured();
    renderCreators();
    renderTrending();
    renderSidebar();
    initFilters();
    initLightbox();
    initSearch();
    initSelectFilters();
  }

  window.initMedia = init;

  document.addEventListener('DOMContentLoaded', function () {
    const section = document.getElementById('md-section');
    if (section && section.classList.contains('active')) {
      init();
    }
  });

  document.addEventListener('commTabChange', function (e) {
    if (e.detail === 'media') {
      if (!document.getElementById('md-section')) return;
      renderStats();
      renderGrid();
      renderFeatured();
      renderCreators();
      renderTrending();
      renderSidebar();
    }
  });
})();
