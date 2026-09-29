/* Katalog game: pencarian live, filter kategori, urut harga, info hasil
   (upgrade fase 1, 2026-09-29) */
(function () {
  var state = { q: '', kat: 'semua' };

  function norm(s) {
    return String(s || '').toLowerCase().trim();
  }

  function hargaAngka(g) {
    var n = parseInt(String(g.basePrice || '').replace(/[^0-9]/g, ''), 10);
    return isFinite(n) ? n : 999999999;
  }

  function cocokCari(g, q) {
    if (!q) return true;
    if (norm(g.searchKey).indexOf(q) >= 0) return true;
    if (norm(g.name).indexOf(q) >= 0) return true;
    return (g.packages || []).some(function (p) { return norm(p.name).indexOf(q) >= 0; });
  }

  function cocokKategori(g, kat) {
    if (kat === 'semua' || kat === 'termurah' || !kat) return true;
    var s = norm(g.name) + ' ' + norm(g.searchKey);
    if (kat === 'game') return /mobile legends|valorant|free fire|pubg|genshin|honkai|robux/.test(s);
    if (kat === 'streaming') return /disney|hbo max|iqiyi|loklok|netflix|prime video|vidio|viu|wetv|youku|youtube|bstation/.test(s);
    if (kat === 'musik') return /spotify|apple music/.test(s);
    return true;
  }

  function kartuHtml(g) {
    var json = JSON.stringify(g).replace(/'/g, '&#39;');
    return '<div class="card-hover rounded-xl p-6 cursor-pointer game-card" data-game="' + g.searchKey + '" onclick=\'openGameDetail(' + json + ')\' style="background:var(--bg-card);box-shadow:var(--shadow);"><div class="game-icon mx-auto mb-4"><img src="' + g.icon + '" alt="' + g.name + '" onerror="this.style.display=\'none\';this.parentElement.textContent=\'&#127918;\';"></div><h3 class="text-xl font-bold text-center mb-2" style="color:var(--text-primary)">' + g.name + '</h3><p class="text-center text-sm" style="color:var(--text-secondary)">Top up ' + g.name + '</p><div class="mt-4 pt-4 text-center" style="border-top:1px solid var(--border-color);"><span class="text-sm font-semibold" style="color:var(--text-primary)">Mulai dari ' + g.basePrice + '</span></div></div>';
  }

  function renderKatalog() {
    var container = document.getElementById('games-container');
    if (!container) return;
    var q = norm(state.q);
    var kat = state.kat;
    var data = (window.gamesData || []).slice();
    var hasil = data.filter(function (g) { return cocokCari(g, q) && cocokKategori(g, kat); });
    if (kat === 'termurah') {
      hasil.sort(function (a, b) { return hargaAngka(a) - hargaAngka(b); });
    }
    if (hasil.length === 0) {
      container.innerHTML = '<div class="col-span-full py-12 text-center"><p class="text-lg" style="color:var(--text-primary)">Tidak ada game yang cocok</p><p class="text-sm mt-1" style="color:var(--text-secondary)">Coba kata lain atau ganti filter.</p></div>';
    } else {
      container.innerHTML = hasil.map(kartuHtml).join('');
    }
    var info = document.getElementById('katalog-info');
    if (info) {
      if (q || kat !== 'semua') {
        info.textContent = 'Menampilkan ' + hasil.length + ' dari ' + data.length + ' game.';
      } else {
        info.textContent = '';
      }
    }
  }

  window.renderGames = function () { renderKatalog(); };

  window.performSearch = function () {
    var el = document.getElementById('search-input');
    if (el) {
      state.q = el.value;
      var k = document.getElementById('search-katalog');
      if (k) k.value = el.value;
    }
    renderKatalog();
  };

  window.setupSearchFunction = function () {
    ['search-input', 'search-katalog'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () { state.q = el.value; renderKatalog(); });
      el.addEventListener('keypress', function (e) { if (e.key === 'Enter') e.preventDefault(); });
    });
    var chips = document.getElementById('filter-chips');
    if (chips) {
      chips.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-kat]') : null;
        if (!b) return;
        state.kat = b.getAttribute('data-kat');
        var semua = chips.querySelectorAll('.filter-chip');
        for (var i = 0; i < semua.length; i++) {
          semua[i].classList.toggle('aktif', semua[i] === b);
        }
        renderKatalog();
      });
    }
  };
})();