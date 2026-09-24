/* ═══════════════════════════════════════════════════════
   GHOTHYS STORE — Polling Section (Visual Enhancements)
   Search, Filters, Progress Bars, Counters, Vote Simulation
   ═══════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── Animated Counters ── */
  function setupCounters(){
    var els = document.querySelectorAll('.pl-anim-counter');
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
    var start = 0, duration = 1500, steps = 60;
    var increment = target / steps, stepTime = duration / steps;
    function tick(){
      start += increment;
      if(start >= target){ el.textContent = target.toLocaleString(); return; }
      el.textContent = Math.floor(start).toLocaleString();
      setTimeout(tick, stepTime);
    }
    tick();
  }

  /* ── Progress Bar Animation ── */
  function animateProgressBars(){
    document.querySelectorAll('.pl-option-fill').forEach(function(bar){
      var w = bar.dataset.width || bar.style.width || '0%';
      bar.style.width = '0%';
      setTimeout(function(){ bar.style.width = w; }, 200);
    });
  }

  /* ── Vote Simulation ── */
  function setupVoteButtons(){
    document.querySelectorAll('.pl-btn-vote').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var option = btn.closest('.pl-poll-option');
        if(!option) return;
        var card = option.closest('.pl-poll-card');
        if(card && card.classList.contains('closed')) return;

        /* Reset others in same card */
        var parent = option.closest('.pl-card-options') || option.parentNode;
        if(parent){
          parent.querySelectorAll('.pl-poll-option.voted').forEach(function(el){ el.classList.remove('voted'); });
        }
        option.classList.add('voted');

        /* Animate bar up slightly */
        var fill = option.querySelector('.pl-option-fill');
        if(fill){
          var cur = parseFloat(fill.style.width) || 0;
          var newW = Math.min(100, cur + 5);
          fill.style.width = newW + '%';
          var pct = option.querySelector('.pl-option-pct');
          if(pct) pct.textContent = Math.round(newW) + '%';
          var votes = option.querySelector('.pl-option-votes');
          if(votes){
            var v = parseInt(votes.textContent, 10) || 0;
            votes.textContent = (v + 1) + ' votes';
          }
        }

        var toast = typeof window.showToast === 'function';
        if(toast) window.showToast('Suara terkirim!', 'Terima kasih atas partisipasi Anda!');
      });
    });
  }

  /* ── Search & Filter ── */
  function setupSearch(){
    var input = document.getElementById('pl-search-input');
    var catEl = document.getElementById('pl-cat-filter');
    var sortEl = document.getElementById('pl-sort-filter');
    var cards = document.querySelectorAll('.pl-poll-card');
    var noResult = document.getElementById('pl-no-result');
    var countEl = document.getElementById('pl-search-count');
    if(!input) return;

    function filterAll(){
      var q = input.value.trim().toLowerCase();
      var cat = catEl ? catEl.value : 'all';
      var visible = 0;
      cards.forEach(function(card){
        var text = (card.dataset.title || '').toLowerCase();
        var catVal = card.dataset.category || 'general';
        var matchSearch = !q || text.indexOf(q) !== -1;
        var matchCat = cat === 'all' || catVal === cat;
        var show = matchSearch && matchCat;
        card.classList.toggle('hidden', !show);
        if(show) visible++;
      });
      if(noResult) noResult.classList.toggle('visible', visible === 0);
      if(countEl) countEl.textContent = visible + ' polling ditemukan';
    }

    input.addEventListener('input', filterAll);
    if(catEl) catEl.addEventListener('change', filterAll);
    if(sortEl){
      sortEl.addEventListener('change', function(){
        var grid = document.querySelector('.pl-poll-grid');
        if(!grid) return;
        var arr = Array.from(grid.querySelectorAll('.pl-poll-card:not(.hidden)'));
        var val = this.value;
        arr.sort(function(a, b){
          if(val === 'popular') return parseInt(b.dataset.votes||0) - parseInt(a.dataset.votes||0);
          if(val === 'newest') return new Date(b.dataset.date||0) - new Date(a.dataset.date||0);
          if(val === 'ending'){
            var aEnd = a.dataset.end ? parseInt(a.dataset.end) : Infinity;
            var bEnd = b.dataset.end ? parseInt(b.dataset.end) : Infinity;
            return aEnd - bEnd;
          }
          return 0;
        });
        arr.forEach(function(el){ grid.appendChild(el); });
      });
    }
  }

  /* ── Tab switching within polls (Active/Closed/Upcoming) ── */
  function setupPollTabs(){
    var tabs = document.querySelectorAll('.pl-block-tab');
    var cards = document.querySelectorAll('.pl-poll-card');
    tabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        tabs.forEach(function(t){ t.classList.remove('active'); });
        tab.classList.add('active');
        var filter = tab.dataset.filter || 'all';
        cards.forEach(function(card){
          var status = card.dataset.status || 'active';
          if(filter === 'all') card.classList.remove('hidden');
          else card.classList.toggle('hidden', status !== filter);
        });
      });
    });
  }

  /* ── Init ── */
  window.initPolling = function(){
    setTimeout(function(){
      animateProgressBars();
      setupCounters();
      setupSearch();
      setupVoteButtons();
      setupPollTabs();
    }, 100);
  };

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(window.initPolling, 200);
  });
  if(document.readyState !== 'loading'){
    setTimeout(window.initPolling, 200);
  }
})();
