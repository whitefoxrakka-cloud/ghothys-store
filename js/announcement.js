(function () {
  /* ------------------------------------------------------------
     PENGUMUMAN - penyaringan, pencarian, dan pengurutan.
     ------------------------------------------------------------
     Dua perbaikan penting dari versi lama:

     1. Dulu daftar kartu diambil SEKALI saat inisialisasi. Padahal
        content-bridge.js menyuntik kartu setelah fetch relay
        selesai, sehingga daftar itu selalu kosong dan penyaringan
        tidak pernah bekerja pada kartu asli. Sekarang kartu dicari
        ulang setiap kali penyaringan dijalankan.

     2. Dropdown pengurutan dulu dibaca tapi tidak pernah dipakai.
        Sekarang pengurutan benar-benar memindahkan kartu.

     Inisialisasi aman dipanggil berkali-kali: setiap elemen
     penanda dirinya sekali saja supaya pendengar tidak menumpuk.
     */

  /* ── Penghitung angka beranimasi (Intersection Observer) ── */
  function anAnimateCounters() {
    const els = document.querySelectorAll('.an-counter-anim');
    if (!els.length) return;
    function animate(el) {
      const target = parseFloat(el.dataset.target) || 0;
      const duration = 1500;
      const start = performance.now();
      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased).toLocaleString('id-ID');
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    els.forEach(el => observer.observe(el));
  }

  /* ── Kartu yang sedang tampil di grid pengumuman ── */
  function kartuSekarang() {
    const grid = document.getElementById('an-announcement-grid');
    if (grid) return Array.from(grid.querySelectorAll('.an-card'));
    return Array.from(document.querySelectorAll('.an-card'));
  }

  /* ── Nilai waktu sebuah kartu ── */
  function waktuKartu(kartu) {
    const mentah = kartu.getAttribute('data-created') || '';
    const angka = Date.parse(mentah);
    return isFinite(angka) ? angka : null;
  }

  /* ── Pencarian + penyaringan + pengurutan ── */
  function filterCards() {
    const searchInput = document.getElementById('an-search-input');
    const catFilter = document.getElementById('an-cat-filter');
    const sortFilter = document.getElementById('an-sort-filter');
    const grid = document.getElementById('an-announcement-grid');

    const semua = kartuSekarang();
    if (!semua.length) return;

    /* Posisi awal dipakai sebagai pembanding setara agar kartu
       tanpa tanggal tidak saling bertukar tempat setiap kali diurutkan. */
    const urutanAwal = new Map();
    semua.forEach((kartu, nomor) => urutanAwal.set(kartu, nomor));

    const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const cat = catFilter ? catFilter.value : 'all';
    const urutan = sortFilter ? sortFilter.value : 'terbaru';

    const lolos = semua.filter((kartu) => {
      const judul = (kartu.dataset.title || '').toLowerCase();
      const kategori = (kartu.dataset.category || '').toLowerCase();
      const cocokCari = !q || judul.includes(q);
      const cocokKategori = cat === 'all' || kategori.includes(cat);
      return cocokCari && cocokKategori;
    });

    /* Pengurutan. Semua kartu diurutkan lebih dulu, baru disaring,
       supaya urutan kartu yang lolos tetap benar. */
    const urut = semua.slice().sort((a, b) => {
      if (urutan === 'judul') {
        const beda = (a.dataset.title || '').localeCompare(b.dataset.title || '', 'id');
        if (beda !== 0) return beda;
      } else if (urutan === 'terlama') {
        const ta = waktuKartu(a);
        const tb = waktuKartu(b);
        if (ta !== null && tb !== null && ta !== tb) return ta - tb;
      } else {
        const ta = waktuKartu(a);
        const tb = waktuKartu(b);
        if (ta !== null && tb !== null && ta !== tb) return tb - ta;
      }
      return urutanAwal.get(a) - urutanAwal.get(b);
    });

    /* Susun ulang kartu di grid sesuai urutan, lalu tandai
       yang tidak lolos sebagai tersembunyi. */
    const lolosSatu = new Set(lolos);
    if (grid) {
      const fragmen = document.createDocumentFragment();
      urut.forEach(kartu => fragmen.appendChild(kartu));
      grid.appendChild(fragmen);
    }
    urut.forEach(kartu => { kartu.hidden = !lolosSatu.has(kartu); });

    /* Beri tahu halaman komunitas kalau ada yang tersembunyi. */
    perbaruiStatusKosong();
  }

  /* Status kosong hanya ditampilkan kalau grid benar-benar tidak
     punya satu pun kartu. Kalau isinya ada tapi sedang tersaring,
     grid yang bicara, jadi panel kosong disembunyikan. */
  function perbaruiStatusKosong() {
    const kosong = document.getElementById('an-announcement-kosong');
    const grid = document.getElementById('an-announcement-grid');
    if (!kosong || !grid) return;
    const total = grid.querySelectorAll('.an-card').length;
    kosong.style.display = total === 0 ? '' : 'none';
  }

  /* Pasang satu kali saja per elemen. */
  function sekali(element, kunci, pasang) {
    if (!element) return false;
    if (element.dataset[kunci] === '1') return false;
    element.dataset[kunci] = '1';
    pasang(element);
    return true;
  }

  function anSetupFilters() {
    const searchInput = document.getElementById('an-search-input');
    const catFilter = document.getElementById('an-cat-filter');
    const sortFilter = document.getElementById('an-sort-filter');

    sekali(searchInput, 'anPasang', (el) => el.addEventListener('input', filterCards));
    sekali(catFilter, 'anPasang', (el) => el.addEventListener('change', filterCards));
    sekali(sortFilter, 'anPasang', (el) => el.addEventListener('change', filterCards));

    /* Nilai awal dropdown urut mengikuti apa yang ada di markup. */
    if (sortFilter && !sortFilter.dataset.anDefault) {
      sortFilter.dataset.anDefault = sortFilter.value || 'terbaru';
    }
  }

  /* ── Tab kategori ── */
  function anSetupFilterTabs() {
    document.querySelectorAll('.an-filter-tab').forEach((tab) => {
      if (tab.dataset.anPasang === '1') return;
      tab.dataset.anPasang = '1';
      tab.setAttribute('role', 'tab');
      tab.addEventListener('click', function () {
        this.closest('.an-filter-tabs')?.querySelectorAll('.an-filter-tab')
          .forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
        this.classList.add('active');
        this.setAttribute('aria-selected', 'true');
        const filter = document.getElementById('an-cat-filter');
        if (filter) {
          filter.value = this.dataset.filter || 'all';
          filterCards();
        }
      });
    });
  }

  /* ── Init ── */
  window.initAnnouncement = function () {
    anSetupFilters();
    anSetupFilterTabs();
    anAnimateCounters();
    filterCards();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(window.initAnnouncement, 100);
    });
  } else {
    setTimeout(window.initAnnouncement, 100);
  }
})();