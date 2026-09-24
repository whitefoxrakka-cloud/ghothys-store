(function(){
  /* ── Animated Counters (Intersection Observer) ── */
  function anAnimateCounters(){
    const els = document.querySelectorAll('.an-counter-anim');
    if(!els.length) return;
    function animate(el){
      const target = parseFloat(el.dataset.target) || 0;
      const duration = 1500;
      const start = performance.now();
      function update(now){
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased).toLocaleString('id-ID');
        if(progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    els.forEach(el => observer.observe(el));
  }

  /* ── Filter/Search ── */
  function anSetupFilters(){
    const searchInput = document.getElementById('an-search-input');
    const catFilter = document.getElementById('an-cat-filter');
    const sortFilter = document.getElementById('an-sort-filter');
    const cards = document.querySelectorAll('.an-card');

    function filterCards(){
      const q = (searchInput ? searchInput.value : '').toLowerCase();
      const cat = catFilter ? catFilter.value : 'all';
      cards.forEach(card => {
        const title = (card.dataset.title || '').toLowerCase();
        const c = card.dataset.category || '';
        const matchSearch = !q || title.includes(q);
        const matchCat = cat === 'all' || c.includes(cat);
        card.style.display = (matchSearch && matchCat) ? '' : 'none';
      });
    }
    if(searchInput) searchInput.addEventListener('input', filterCards);
    if(catFilter) catFilter.addEventListener('change', filterCards);
    if(sortFilter) sortFilter.addEventListener('change', filterCards);
  }

  /* ── Filter Tabs ── */
  function anSetupFilterTabs(){
    document.querySelectorAll('.an-filter-tab').forEach(tab => {
      tab.addEventListener('click', function(){
        this.closest('.an-filter-tabs')?.querySelectorAll('.an-filter-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const filter = document.getElementById('an-cat-filter');
        if(filter){ filter.value = this.dataset.filter || 'all'; filter.dispatchEvent(new Event('change')); }
      });
    });
  }

  /* ── Init ── */
  window.initAnnouncement = function(){
    anSetupFilters();
    anSetupFilterTabs();
    anAnimateCounters();
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(window.initAnnouncement, 100); });
  } else {
    setTimeout(window.initAnnouncement, 100);
  }
})();
