(function(){
  /* ── Countdown Timer ── */
  function evUpdateCountdown(id, targetDate){
    const el = document.getElementById(id);
    if(!el) return;
    function tick(){
      const now = new Date().getTime();
      const diff = targetDate - now;
      if(diff <= 0){
        el.innerHTML = '<div class="ev-cd-item"><span class="ev-cd-num" style="color:#ef4444">00:00:00</span><span class="ev-cd-label">Selesai</span></div>';
        return;
      }
      const days = Math.floor(diff / (1000*60*60*24));
      const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
      const mins = Math.floor((diff % (1000*60*60)) / (1000*60));
      const secs = Math.floor((diff % (1000*60)) / 1000);
      el.innerHTML = `
        <div class="ev-cd-item"><span class="ev-cd-num">${String(days).padStart(2,'0')}</span><span class="ev-cd-label">Hari</span></div>
        <span class="ev-cd-sep">:</span>
        <div class="ev-cd-item"><span class="ev-cd-num">${String(hours).padStart(2,'0')}</span><span class="ev-cd-label">Jam</span></div>
        <span class="ev-cd-sep">:</span>
        <div class="ev-cd-item"><span class="ev-cd-num">${String(mins).padStart(2,'0')}</span><span class="ev-cd-label">Menit</span></div>
        <span class="ev-cd-sep">:</span>
        <div class="ev-cd-item"><span class="ev-cd-num">${String(secs).padStart(2,'0')}</span><span class="ev-cd-label">Detik</span></div>
      `;
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ── Animated Counters (Intersection Observer) ── */
  function evAnimateCounters(){
    const els = document.querySelectorAll('.ev-counter-anim');
    if(!els.length) return;
    function animate(el){
      const target = parseFloat(el.dataset.target) || 0;
      const isCurrency = el.dataset.currency === 'true';
      const duration = 1500;
      const start = performance.now();
      function update(now){
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        let val = target * eased;
        if(isCurrency){
          val = 'Rp ' + Math.round(val).toLocaleString('id-ID');
        } else {
          val = Math.round(val).toLocaleString('id-ID');
        }
        el.textContent = val;
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
  function evSetupFilters(){
    const searchInput = document.getElementById('ev-search-input');
    const statusFilter = document.getElementById('ev-status-filter');
    const catFilter = document.getElementById('ev-cat-filter');
    const sortFilter = document.getElementById('ev-sort-filter');
    const cards = document.querySelectorAll('.ev-card');

    function filterCards(){
      const q = (searchInput ? searchInput.value : '').toLowerCase();
      const status = statusFilter ? statusFilter.value : 'all';
      const category = catFilter ? catFilter.value : 'all';
      const sort = sortFilter ? sortFilter.value : 'newest';

      cards.forEach(card => {
        const title = (card.dataset.title || '').toLowerCase();
        const cat = card.dataset.category || '';
        const s = card.dataset.status || '';

        const matchSearch = !q || title.includes(q);
        const matchStatus = status === 'all' || cat.includes(status) || s.includes(status);
        const matchCat = category === 'all' || cat === category;

        card.style.display = (matchSearch && matchStatus && matchCat) ? '' : 'none';
      });
    }
    if(searchInput) searchInput.addEventListener('input', filterCards);
    if(statusFilter) statusFilter.addEventListener('change', filterCards);
    if(catFilter) catFilter.addEventListener('change', filterCards);
    if(sortFilter) sortFilter.addEventListener('change', filterCards);
  }

  /* ── Accordion ── */
  function evSetupAccordion(){
    document.querySelectorAll('.ev-accordion-header').forEach(header => {
      header.addEventListener('click', function(){
        const item = this.closest('.ev-accordion-item');
        if(!item) return;
        item.closest('.ev-accordion')?.querySelectorAll('.ev-accordion-item.open').forEach(i => {
          if(i !== item) i.classList.remove('open');
        });
        item.classList.toggle('open');
      });
    });
  }

  /* ── Filter Tabs ── */
  function evSetupFilterTabs(){
    document.querySelectorAll('.ev-filter-tab').forEach(tab => {
      tab.addEventListener('click', function(){
        this.closest('.ev-filter-tabs')?.querySelectorAll('.ev-filter-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const filter = document.getElementById('ev-status-filter');
        if(filter){ filter.value = this.dataset.filter || 'all'; filter.dispatchEvent(new Event('change')); }
      });
    });
  }

  /* ── Init ── */
  window.initEvent = function(){
    evSetupFilters();
    evSetupAccordion();
    evSetupFilterTabs();
    evAnimateCounters();
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(window.initEvent, 100); });
  } else {
    setTimeout(window.initEvent, 100);
  }

  /* ── Hero countdown auto-start ── */
  const heroTarget = new Date();
  heroTarget.setDate(heroTarget.getDate() + 7);
  heroTarget.setHours(20, 0, 0, 0);
  evUpdateCountdown('ev-hero-countdown', heroTarget.getTime());
})();
