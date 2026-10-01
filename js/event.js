(function () {
  /* ------------------------------------------------------------
     ACARA - penyaringan, pencarian, pengurutan, dan hitung mundur.
     ------------------------------------------------------------
     Perbaikan dari versi lama:

     1. Dulu daftar kartu diambil SEKALI saat inisialisasi, padahal
        content-bridge.js menyuntik kartu setelah fetch relay selesai.
        Penyaringan karena itu tidak pernah bekerja pada kartu asli.

     2. Dropdown pengurutan dulu dibaca tapi tidak pernah dipakai.

     3. Hitung mundur lama selalu mengarah ke "sekarang ditambah
        tujuh hari". Itu angka rekaan, bukan acara sungguhan.
        Sekarang ia menghitung mundur ke acara terdekat yang belum
        lewat, dan disembunyikan kalau memang tidak ada.

     Inisialisasi aman dipanggil berkali-kali: setiap elemen
     menandai dirinya sekali saja supaya pendengar tidak menumpuk.
     */

  var penghitungInterval = null;

  /* ── Kartu yang sedang tampil di grid acara ── */
  function kartuSekarang() {
    const grid = document.getElementById('ev-event-grid');
    if (grid) return Array.from(grid.querySelectorAll('.ev-card'));
    return Array.from(document.querySelectorAll('.ev-card'));
  }

  function waktuKartu(kartu) {
    const angka = Date.parse(kartu.getAttribute('data-tanggal') || '');
    return isFinite(angka) ? angka : null;
  }

  /* ── Hitung mundur ── */
  function evUpdateCountdown(id, targetDate) {
    const el = document.getElementById(id);
    if (!el) return;
    function tick() {
      const now = new Date().getTime();
      const diff = targetDate - now;
      if (diff <= 0) {
        el.innerHTML = '<div class="ev-cd-item"><span class="ev-cd-num" style="color:#ef4444">00:00:00</span><span class="ev-cd-label">Selesai</span></div>';
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      el.innerHTML = `
        <div class="ev-cd-item"><span class="ev-cd-num">${String(days).padStart(2, '0')}</span><span class="ev-cd-label">Hari</span></div>
        <span class="ev-cd-sep">:</span>
        <div class="ev-cd-item"><span class="ev-cd-num">${String(hours).padStart(2, '0')}</span><span class="ev-cd-label">Jam</span></div>
        <span class="ev-cd-sep">:</span>
        <div class="ev-cd-item"><span class="ev-cd-num">${String(mins).padStart(2, '0')}</span><span class="ev-cd-label">Menit</span></div>
        <span class="ev-cd-sep">:</span>
        <div class="ev-cd-item"><span class="ev-cd-num">${String(secs).padStart(2, '0')}</span><span class="ev-cd-label">Detik</span></div>
      `;
    }
    tick();
    if (penghitungInterval) clearInterval(penghitungInterval);
    penghitungInterval = setInterval(tick, 1000);
  }

  /* ── Hitung mundur ke acara terdekat yang belum lewat ── */
  window.perbaruiHitungMundur = function () {
    const wadah = document.getElementById('ev-hero-countdown');
    const blok = document.getElementById('komunitas-acara-hitung-mundur');
    if (!wadah) return;

    const sekarang = new Date().getTime();
    const akanDatang = kartuSekarang()
      .map(waktuKartu)
      .filter((waktu) => waktu !== null && waktu > sekarang)
      .sort((a, b) => a - b);

    if (!akanDatang.length) {
      /* Tidak ada acara mendatang. Sembunyikan, jangan tampilkan
         angka rekaan. */
      wadah.innerHTML = '';
      if (blok) blok.hidden = true;
      if (penghitungInterval) {
        clearInterval(penghitungInterval);
        penghitungInterval = null;
      }
      return;
    }

    if (blok) blok.hidden = false;
    evUpdateCountdown('ev-hero-countdown', akanDatang[0]);
  };

  /* ── Penghitung angka beranimasi (Intersection Observer) ── */
  function evAnimateCounters() {
    const els = document.querySelectorAll('.ev-counter-anim');
    if (!els.length) return;
    function animate(el) {
      const target = parseFloat(el.dataset.target) || 0;
      const isCurrency = el.dataset.currency === 'true';
      const duration = 1500;
      const start = performance.now();
      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        let val = target * eased;
        if (isCurrency) {
          val = 'Rp ' + Math.round(val).toLocaleString('id-ID');
        } else {
          val = Math.round(val).toLocaleString('id-ID');
        }
        el.textContent = val;
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

  /* ── Pencarian + penyaringan + pengurutan ── */
  function filterCards() {
    const searchInput = document.getElementById('ev-search-input');
    const statusFilter = document.getElementById('ev-status-filter');
    const sortFilter = document.getElementById('ev-sort-filter');
    const grid = document.getElementById('ev-event-grid');

    const semua = kartuSekarang();
    if (!semua.length) return;

    /* Posisi awal dipakai sebagai pembanding setara agar acara
       tanpa tanggal tidak saling bertukar tempat setiap diurutkan. */
    const urutanAwal = new Map();
    semua.forEach((kartu, nomor) => urutanAwal.set(kartu, nomor));

    const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const status = statusFilter ? statusFilter.value : 'all';
    /* Nilai dropdown bisa saja tidak dikenal kalau markup berubah.
       Diamkan ke bawaan supaya kartu tidak tertinggal tanpa urutan. */
    const urutanYangAda = ['terdekat', 'terlama', 'judul'];
    const nilaiUrutan = sortFilter ? sortFilter.value : 'terdekat';
    const urutan = urutanYangAda.indexOf(nilaiUrutan) === -1 ? 'terdekat' : nilaiUrutan;

    const lolos = semua.filter((kartu) => {
      const judul = (kartu.dataset.title || '').toLowerCase();
      const s = (kartu.dataset.status || '').toLowerCase();
      const cocokCari = !q || judul.includes(q);
      const cocokStatus = status === 'all' || s === status.toLowerCase();
      return cocokCari && cocokStatus;
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
        /* Terdekat: yang belum lewat paling atas (paling dekat
           dahulu), lalu yang sudah lewat (paling baru selesai
           dahulu), lalu acara tanpa tanggal.
           Versi lama memakai Math.abs(waktu - sekarang), yang
           membuat acara lama ikut naik ke atas bersama acara
           mendatang sehingga mana yang akan datang jadi kabur. */
        const sekarang = new Date().getTime();
        const nilai = (kartu) => {
          const waktu = waktuKartu(kartu);
          if (waktu === null) return [2, 0];
          if (waktu >= sekarang) return [0, waktu];
          return [1, -waktu];
        };
        const na = nilai(a);
        const nb = nilai(b);
        if (na[0] !== nb[0]) return na[0] - nb[0];
        if (na[1] !== nb[1]) return na[1] - nb[1];
      }
      return urutanAwal.get(a) - urutanAwal.get(b);
    });

    const lolosSatu = new Set(lolos);
    if (grid) {
      const fragmen = document.createDocumentFragment();
      urut.forEach(kartu => fragmen.appendChild(kartu));
      grid.appendChild(fragmen);
    }
    urut.forEach(kartu => { kartu.hidden = !lolosSatu.has(kartu); });

    /* Pengumuman punya perbaruiStatusKosong sendiri; acara belum,
       sehingga menyaring sampai nol hasil meninggalkan area kosong
       tanpa pesan. Dipanggil setelah hidden diurus supaya
       community.js menghitung kartu yang benar-benar terlihat. */
    if (typeof window.pasangStatusKosong === 'function') {
      window.pasangStatusKosong();
    }
  }

  /* ── Akordeon ── */
  function evSetupAccordion() {
    document.querySelectorAll('.ev-accordion-header').forEach(header => {
      if (header.dataset.evPasang === '1') return;
      header.dataset.evPasang = '1';
      header.addEventListener('click', function () {
        const item = this.closest('.ev-accordion-item');
        if (!item) return;
        item.closest('.ev-accordion')?.querySelectorAll('.ev-accordion-item.open').forEach(i => {
          if (i !== item) i.classList.remove('open');
        });
        item.classList.toggle('open');
      });
    });
  }

  /* Pasang satu kali saja per elemen. */
  function sekali(element, kunci, pasang) {
    if (!element) return false;
    if (element.dataset[kunci] === '1') return false;
    element.dataset[kunci] = '1';
    pasang(element);
    return true;
  }

  function evSetupFilters() {
    const searchInput = document.getElementById('ev-search-input');
    const statusFilter = document.getElementById('ev-status-filter');
    const sortFilter = document.getElementById('ev-sort-filter');

    sekali(searchInput, 'evPasang', (el) => el.addEventListener('input', filterCards));
    sekali(statusFilter, 'evPasang', (el) => el.addEventListener('change', filterCards));
    sekali(sortFilter, 'evPasang', (el) => el.addEventListener('change', filterCards));
  }

  /* ── Tab status ── */
  function evSetupFilterTabs() {
    document.querySelectorAll('.ev-filter-tab').forEach(tab => {
      if (tab.dataset.evPasang === '1') return;
      tab.dataset.evPasang = '1';
      tab.setAttribute('role', 'tab');
      tab.addEventListener('click', function () {
        this.closest('.ev-filter-tabs')?.querySelectorAll('.ev-filter-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        this.classList.add('active');
        this.setAttribute('aria-selected', 'true');
        const filter = document.getElementById('ev-status-filter');
        if (filter) {
          filter.value = this.dataset.filter || 'all';
          filterCards();
        }
      });
    });
  }

  /* ── Init ── */
  window.initEvent = function () {
    evSetupFilters();
    evSetupAccordion();
    evSetupFilterTabs();
    evAnimateCounters();
    filterCards();
    window.perbaruiHitungMundur();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(window.initEvent, 100);
    });
  } else {
    setTimeout(window.initEvent, 100);
  }
})();