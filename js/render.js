/* Rendering helpers for games and search */
(function(){
  window.renderGames = function(){
    const container=document.getElementById('games-container');
    if(!container)return;
    container.innerHTML = window.gamesData.map(g=>`<div class="card-hover rounded-xl p-6 cursor-pointer game-card" data-game="${g.searchKey}" onclick='openGameDetail(${JSON.stringify(g).replace(/'/g,"&#39;")})' style="background:var(--bg-card);box-shadow:var(--shadow);"><div class="game-icon mx-auto mb-4"><img src="${g.icon}" alt="${g.name}" onerror="this.style.display='none';this.parentElement.textContent='🎮';"></div><h3 class="text-xl font-bold text-center mb-2" style="color:var(--text-primary)">${g.name}</h3><p class="text-center text-sm" style="color:var(--text-secondary)">Top up ${g.name}</p><div class="mt-4 pt-4 text-center" style="border-top:1px solid var(--border-color);"><span class="text-sm font-semibold" style="color:var(--text-primary)">Mulai dari ${g.basePrice}</span></div></div>`).join('');
  };

  window.setupSearchFunction = function(){
    const el = document.getElementById('search-input');
    if(!el) return;
    el.addEventListener('keypress',e=>{if(e.key==='Enter'){e.preventDefault();window.performSearch();}});
  };

  window.performSearch = function(){
    const t=(document.getElementById('search-input')||{value:''}).value.toLowerCase().trim();
    document.querySelectorAll('.game-card').forEach(c=>{c.style.display=(!t||c.dataset.game.includes(t))?'':'none';});
  };
})();
