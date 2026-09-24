(function(){
  /* ── Countdown Timer ── */
  function gvUpdateCountdown(id, targetDate){
    const el = document.getElementById(id);
    if(!el) return;
    function tick(){
      const now = new Date().getTime();
      const diff = targetDate - now;
      if(diff <= 0){
        el.innerHTML = '<span class="gv-cd-num" style="color:#ef4444">00</span><span class="gv-cd-label">Selesai</span>';
        return;
      }
      const days = Math.floor(diff / (1000*60*60*24));
      const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
      const mins = Math.floor((diff % (1000*60*60)) / (1000*60));
      const secs = Math.floor((diff % (1000*60)) / 1000);
      el.innerHTML = `
        <div class="gv-cd-item"><span class="gv-cd-num">${String(days).padStart(2,'0')}</span><span class="gv-cd-label">Hari</span></div>
        <span class="gv-cd-sep">:</span>
        <div class="gv-cd-item"><span class="gv-cd-num">${String(hours).padStart(2,'0')}</span><span class="gv-cd-label">Jam</span></div>
        <span class="gv-cd-sep">:</span>
        <div class="gv-cd-item"><span class="gv-cd-num">${String(mins).padStart(2,'0')}</span><span class="gv-cd-label">Menit</span></div>
        <span class="gv-cd-sep">:</span>
        <div class="gv-cd-item"><span class="gv-cd-num">${String(secs).padStart(2,'0')}</span><span class="gv-cd-label">Detik</span></div>
      `;
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ── Animated Counters (Intersection Observer) ── */
  function gvAnimateCounters(){
    const els = document.querySelectorAll('.gv-counter-anim');
    if(!els.length) return;
    function animate(el){
      const target = parseFloat(el.dataset.target) || 0;
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
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
        el.textContent = prefix + val + suffix;
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
  function gvSetupFilters(){
    const searchInput = document.getElementById('gv-search-input');
    const statusFilter = document.getElementById('gv-status-filter');
    const gameFilter = document.getElementById('gv-game-filter');
    const sortFilter = document.getElementById('gv-sort-filter');
    const cards = document.querySelectorAll('.gv-card');

    function filterCards(){
      const q = (searchInput ? searchInput.value : '').toLowerCase();
      const status = statusFilter ? statusFilter.value : 'all';
      const game = gameFilter ? gameFilter.value : 'all';
      const sort = sortFilter ? sortFilter.value : 'newest';

      const visible = [];
      cards.forEach(card => {
        const title = (card.dataset.title || '').toLowerCase();
        const cat = card.dataset.category || '';
        const g = card.dataset.game || '';

        const matchSearch = !q || title.includes(q);
        const matchStatus = status === 'all' || cat.includes(status);
        const matchGame = game === 'all' || g === game;

        if(matchSearch && matchStatus && matchGame){
          card.style.display = '';
          visible.push(card);
        } else {
          card.style.display = 'none';
        }
      });

      if(sort === 'popular'){
        // simple shuffle for demo visual effect
        const parent = cards[0]?.parentNode;
        if(parent){
          const arr = Array.from(parent.children).filter(c => c.style.display !== 'none');
          // stable: keep displayed order but re-append
        }
      }
    }

    if(searchInput) searchInput.addEventListener('input', filterCards);
    if(statusFilter) statusFilter.addEventListener('change', filterCards);
    if(gameFilter) gameFilter.addEventListener('change', filterCards);
    if(sortFilter) sortFilter.addEventListener('change', filterCards);
  }

  /* ── Accordion ── */
  function gvSetupAccordion(){
    document.querySelectorAll('.gv-accordion-header').forEach(header => {
      header.addEventListener('click', function(){
        const item = this.closest('.gv-accordion-item');
        if(!item) return;
        const isOpen = item.classList.contains('open');
        item.closest('.gv-accordion')?.querySelectorAll('.gv-accordion-item.open').forEach(i => {
          if(i !== item) i.classList.remove('open');
        });
        item.classList.toggle('open');
      });
    });
  }

  /* ── Card Hover Effects ── */
  function gvCardEffects(){
    document.querySelectorAll('.gv-card').forEach(card => {
      card.addEventListener('mouseenter', function(){
        this.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease';
      });
    });
  }

  /* ── Filter Tabs ── */
  function gvSetupFilterTabs(){
    document.querySelectorAll('.gv-filter-tab').forEach(tab => {
      tab.addEventListener('click', function(){
        this.closest('.gv-filter-tabs')?.querySelectorAll('.gv-filter-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const val = this.dataset.filter || 'all';
        const filter = document.getElementById('gv-status-filter');
        if(filter) filter.value = val;
        filter?.dispatchEvent(new Event('change'));
      });
    });
  }

  /* ── Init on page show ── */
  window.initGiveaway = function(){
    gvCardEffects();
    gvSetupFilters();
    gvSetupAccordion();
    gvSetupFilterTabs();
    gvAnimateCounters();
  };

  /* ── Auto-init on DOM ready ── */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      setTimeout(window.initGiveaway, 100);
    });
  } else {
    setTimeout(window.initGiveaway, 100);
  }

  /* ── Hero countdown auto-start ── */
  const heroTarget = new Date();
  heroTarget.setDate(heroTarget.getDate() + 14);
  heroTarget.setHours(20, 0, 0, 0);
  gvUpdateCountdown('gv-hero-countdown', heroTarget.getTime());
})();
