/* ═══════════════════════════════════════════════════════
   GHOTHYS STORE — Achievement Section (Visual)
   Search, Filters, Counters, Progress Ring Animation
   ═══════════════════════════════════════════════════════ */
(function(){
  'use strict';

  function setupCounters(){
    var els = document.querySelectorAll('.ac-anim-counter');
    if(!els.length) return;
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
    els.forEach(function(el){ obs.observe(el); });
  }

  function animateCounter(el, target){
    var start = 0, dur = 1500, steps = 60;
    var inc = target / steps, st = dur / steps;
    function tick(){
      start += inc;
      if(start >= target){ el.textContent = target.toLocaleString(); return; }
      el.textContent = Math.floor(start).toLocaleString();
      setTimeout(tick, st);
    }
    tick();
  }

  /* ── Progress bars ── */
  function animateBars(){
    document.querySelectorAll('.ac-card-fill, .ac-ring-fill').forEach(function(bar){
      var w = bar.dataset.width || bar.style.width || '0%';
      if(bar.classList.contains('ac-ring-fill')){
        var offset = parseFloat(bar.dataset.offset) || 157.08;
        bar.style.strokeDashoffset = 157.08;
        setTimeout(function(){ bar.style.strokeDashoffset = offset; }, 300);
      } else {
        bar.style.width = '0%';
        setTimeout(function(){ bar.style.width = w; }, 200);
      }
    });
  }

  /* ── Search & Filter ── */
  function setupSearch(){
    var input = document.getElementById('ac-search-input');
    var rarityEl = document.getElementById('ac-rarity-filter');
    var statusEl = document.getElementById('ac-status-filter');
    var cards = document.querySelectorAll('.ac-card');
    var noResult = document.getElementById('ac-no-result');
    var countEl = document.getElementById('ac-search-count');
    if(!input) return;

    function filterAll(){
      var q = input.value.trim().toLowerCase();
      var rarity = rarityEl ? rarityEl.value : 'all';
      var status = statusEl ? statusEl.value : 'all';
      var visible = 0;
      cards.forEach(function(card){
        var text = (card.dataset.title || '').toLowerCase();
        var cardRarity = card.dataset.rarity || 'common';
        var cardStatus = card.dataset.status || 'locked';
        var matchSearch = !q || text.indexOf(q) !== -1;
        var matchRarity = rarity === 'all' || cardRarity === rarity;
        var matchStatus = status === 'all' || cardStatus === status;
        var show = matchSearch && matchRarity && matchStatus;
        card.classList.toggle('hidden', !show);
        if(show) visible++;
      });
      if(noResult) noResult.classList.toggle('visible', visible === 0);
      if(countEl) countEl.textContent = visible + ' achievement ditemukan';
    }

    input.addEventListener('input', filterAll);
    if(rarityEl) rarityEl.addEventListener('change', filterAll);
    if(statusEl) statusEl.addEventListener('change', filterAll);
  }

  /* ── Init ── */
  window.initAchievement = function(){
    setTimeout(function(){
      animateBars();
      setupCounters();
      setupSearch();
    }, 100);
  };

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(window.initAchievement, 200);
  });
  if(document.readyState !== 'loading'){
    setTimeout(window.initAchievement, 200);
  }
})();
