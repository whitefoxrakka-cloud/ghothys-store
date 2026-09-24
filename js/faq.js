/* ═══════════════════════════════════════════════════════
   GHOTHYS STORE — FAQ Section (Visual Enhancements)
   Search, Accordion, Counters, Reactions, Filters
   ═══════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── Skeleton loader ── */
  function showSkeleton(container, count){
    if(!container) return;
    const items = Array.from({length: count}, function(){ return '<div class="fq-skeleton-item"></div>'; }).join('');
    container.innerHTML = '<div class="fq-skeleton">' + items + '</div>';
  }

  /* ── Accordion Toggle ── */
  function setupAccordion(){
    document.querySelectorAll('.fq-item').forEach(function(item){
      var q = item.querySelector('.fq-question');
      if(!q) return;
      q.removeEventListener('click', toggleAccordion);
      q.addEventListener('click', toggleAccordion);
    });
    document.querySelectorAll('.fq-guide-item').forEach(function(item){
      var h = item.querySelector('.fq-guide-header');
      if(!h) return;
      h.removeEventListener('click', toggleGuide);
      h.addEventListener('click', toggleGuide);
    });
  }

  function toggleAccordion(e){
    var item = e.currentTarget.closest('.fq-item');
    if(!item) return;
    var isOpen = item.classList.contains('open');
    /* close others in same list */
    var list = item.closest('.fq-list');
    if(list){
      list.querySelectorAll('.fq-item.open').forEach(function(el){
        if(el !== item) el.classList.remove('open');
      });
    }
    item.classList.toggle('open', !isOpen);
  }

  function toggleGuide(e){
    var item = e.currentTarget.closest('.fq-guide-item');
    if(!item) return;
    item.classList.toggle('open');
  }

  /* ── Search & Filter ── */
  function setupSearch(){
    var input = document.getElementById('fq-search-input');
    var cats = document.querySelectorAll('.fq-quick-cat, .fq-cat-card');
    var items = document.querySelectorAll('.fq-item');
    var noResult = document.getElementById('fq-no-result');
    var countEl = document.getElementById('fq-search-count');
    if(!input) return;

    function filterAll(){
      var q = input.value.trim().toLowerCase();
      var activeCat = document.querySelector('.fq-quick-cat.active') || document.querySelector('.fq-cat-card.active');
      var catVal = activeCat ? activeCat.dataset.cat || 'all' : 'all';

      var visible = 0;
      items.forEach(function(item){
        var text = (item.dataset.title || item.querySelector('.fq-q-text')?.textContent || '').toLowerCase();
        var itemCat = item.dataset.category || 'general';
        var matchSearch = !q || text.indexOf(q) !== -1;
        var matchCat = catVal === 'all' || itemCat === catVal;
        var show = matchSearch && matchCat;
        item.classList.toggle('hidden', !show);
        if(show) visible++;
      });

      if(noResult){
        noResult.classList.toggle('visible', visible === 0);
      }
      if(countEl){
        countEl.textContent = visible + ' pertanyaan ditemukan';
      }
    }

    input.addEventListener('input', filterAll);

    cats.forEach(function(el){
      el.addEventListener('click', function(){
        cats.forEach(function(c){ c.classList.remove('active'); });
        el.classList.add('active');
        filterAll();
      });
    });

    /* Sort filter */
    var sortEl = document.getElementById('fq-sort-filter');
    if(sortEl){
      sortEl.addEventListener('change', function(){
        var val = this.value;
        var list = document.querySelector('.fq-list');
        if(!list) return;
        var arr = Array.from(list.querySelectorAll('.fq-item:not(.hidden)'));
        if(val === 'popular'){
          arr.sort(function(a, b){
            var aPop = a.classList.contains('popular') ? 0 : 1;
            var bPop = b.classList.contains('popular') ? 0 : 1;
            return aPop - bPop;
          });
        } else if(val === 'newest'){
          arr.reverse();
        }
        arr.forEach(function(el){ list.appendChild(el); });
      });
    }
  }

  /* ── Animated Counters ── */
  function setupCounters(){
    var counters = document.querySelectorAll('.fq-anim-counter');
    if(!counters.length) return;
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          var el = entry.target;
          var target = parseInt(el.dataset.target, 10);
          if(isNaN(target)) return;
          animateCounter(el, target);
          obs.unobserve(el);
        }
      });
    }, {threshold: 0.3});
    counters.forEach(function(el){ obs.observe(el); });
  }

  function animateCounter(el, target){
    var start = 0;
    var duration = 1500;
    var steps = 60;
    var increment = target / steps;
    var stepTime = duration / steps;
    function tick(){
      start += increment;
      if(start >= target){
        el.textContent = target.toLocaleString();
        return;
      }
      el.textContent = Math.floor(start).toLocaleString();
      setTimeout(tick, stepTime);
    }
    tick();
  }

  /* ── Helpful Reactions ── */
  function setupReactions(){
    document.querySelectorAll('.fq-helpful-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var group = btn.closest('.fq-helpful');
        if(!group) return;
        group.querySelectorAll('.fq-helpful-btn').forEach(function(b){ b.classList.remove('selected'); });
        btn.classList.add('selected');
        var countEl = btn.querySelector('.fq-hb-count');
        if(countEl){
          var val = parseInt(countEl.textContent, 10) || 0;
          countEl.textContent = (val + 1);
        }
      });
    });
  }

  /* ── Category filter from card click (scroll to list) ── */
  function setupCatScroll(){
    document.querySelectorAll('.fq-cat-card').forEach(function(card){
      card.addEventListener('click', function(){
        var list = document.getElementById('fq-accordion-list');
        if(list) list.scrollIntoView({behavior:'smooth', block:'start'});
      });
    });
  }

  /* ── Init ── */
  window.initFaq = function(){
    var container = document.getElementById('fq-accordion-list');
    if(container){
      var items = container.querySelectorAll('.fq-item');
      if(items.length > 3){
        showSkeleton(container, items.length);
        setTimeout(function(){
          container.querySelector('.fq-skeleton')?.remove();
          items.forEach(function(el){ el.style.display = ''; });
          setupAccordion();
          setupSearch();
          setupCounters();
          setupReactions();
          setupCatScroll();
        }, 400);
      } else {
        setupAccordion();
        setupSearch();
        setupCounters();
        setupReactions();
        setupCatScroll();
      }
    } else {
      setupAccordion();
      setupSearch();
      setupCounters();
      setupReactions();
      setupCatScroll();
    }
  };

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(window.initFaq, 150);
  });

  if(document.readyState !== 'loading'){
    setTimeout(window.initFaq, 150);
  }
})();
