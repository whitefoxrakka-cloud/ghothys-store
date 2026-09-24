/* ═══════════════════════════════════════════════════════
   GHOTHYS STORE — Leaderboard Section (Visual Enhancements)
   Search, Confetti, Counters, XP Animations, Filters
   ═══════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── Confetti ── */
  function fireConfetti(duration){
    var container = document.createElement('div');
    container.className = 'lb-confetti-container';
    document.body.appendChild(container);
    var colors = ['#8B5CF6','#FBBF24','#22C55E','#3B82F6','#EF4444','#A78BFA','#F59E0B','#EC4899'];
    var end = Date.now() + duration;
    function burst(){
      if(Date.now() > end){ container.remove(); return; }
      for(var i=0;i<8;i++){
        var piece = document.createElement('div');
        piece.className = 'lb-confetti-piece';
        piece.style.left = (Math.random() * 100) + '%';
        piece.style.top = '-10px';
        piece.style.background = colors[Math.floor(Math.random()*colors.length)];
        piece.style.width = (4 + Math.random()*6) + 'px';
        piece.style.height = (4 + Math.random()*6) + 'px';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.animationDuration = (1.5 + Math.random()*2) + 's';
        piece.style.animationDelay = (Math.random()*0.5) + 's';
        container.appendChild(piece);
        setTimeout(function(){ if(piece.parentNode) piece.remove(); }, 4000);
      }
      setTimeout(burst, 200 + Math.random()*300);
    }
    burst();
  }

  /* ── Animated Counters ── */
  function setupCounters(){
    var els = document.querySelectorAll('.lb-anim-counter');
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

  /* ── XP Bar Animation ── */
  function animateXpBars(){
    document.querySelectorAll('.lb-td-xp-fill').forEach(function(bar){
      var w = bar.dataset.width || bar.style.width || '0%';
      bar.style.width = '0%';
      setTimeout(function(){ bar.style.width = w; }, 200);
    });
    document.querySelectorAll('.lb-podium-bar-fill').forEach(function(bar){
      var w = bar.dataset.width || bar.style.width || '0%';
      bar.style.width = '0%';
      setTimeout(function(){ bar.style.width = w; }, 300);
    });
  }

  /* ── Search & Filter ── */
  function setupSearch(){
    var input = document.getElementById('lb-search-input');
    var roleEl = document.getElementById('lb-role-filter');
    var sortEl = document.getElementById('lb-sort-filter');
    var rows = document.querySelectorAll('.lb-table tbody tr');
    var noResult = document.getElementById('lb-no-result');
    if(!input) return;

    function filterRows(){
      var q = input.value.trim().toLowerCase();
      var role = roleEl ? roleEl.value : 'all';
      var visible = 0;
      rows.forEach(function(row){
        var text = (row.dataset.name || '').toLowerCase();
        var rowRole = row.dataset.role || 'member';
        var matchSearch = !q || text.indexOf(q) !== -1;
        var matchRole = role === 'all' || rowRole === role;
        var show = matchSearch && matchRole;
        row.classList.toggle('lb-row-hidden', !show);
        if(show) visible++;
      });
      if(noResult) noResult.classList.toggle('visible', visible === 0);
    }

    input.addEventListener('input', filterRows);
    if(roleEl) roleEl.addEventListener('change', filterRows);
    if(sortEl){
      sortEl.addEventListener('change', function(){
        var tbody = document.querySelector('.lb-table tbody');
        if(!tbody) return;
        var arr = Array.from(tbody.querySelectorAll('tr:not(.lb-row-hidden)'));
        var val = this.value;
        arr.sort(function(a, b){
          if(val === 'xp') return parseInt(b.dataset.xp||0) - parseInt(a.dataset.xp||0);
          if(val === 'level') return parseInt(b.dataset.level||0) - parseInt(a.dataset.level||0);
          if(val === 'achievement') return parseInt(b.dataset.ach||0) - parseInt(a.dataset.ach||0);
          return 0;
        });
        arr.forEach(function(el){ tbody.appendChild(el); });
      });
    }
  }

  /* ── Init ── */
  window.initLeaderboard = function(){
    /* Confetti once per session */
    if(!window._lbConfettiFired){
      fireConfetti(3000);
      window._lbConfettiFired = true;
    }
    setTimeout(function(){
      animateXpBars();
      setupCounters();
      setupSearch();
    }, 100);
  };

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(window.initLeaderboard, 200);
  });
  if(document.readyState !== 'loading'){
    setTimeout(window.initLeaderboard, 200);
  }
})();
