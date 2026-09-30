/* ============================================================
   GHOTHYS STORE - MODUL KOMUNITAS
   ------------------------------------------------------------
   Menghidupkan kembali halaman Komunitas yang dulu dihapus.
   Isi modul ini:

   1. bindInteractionCards - tombol bookmark di kartu pengumuman
      dan kartu acara. Dulunya dipanggil content-bridge.js tapi
      tidak pernah ada definisinya, jadi tombolnya mati diam-diam.
   2. initSlider - titik penanda untuk banner owner. Jalur geser
      memakai snapan CSS, jadi modul ini hanya menjaga titik
      penanda tetap sinkron dengan posisi gulir.
   3. Status "belum ada konten" untuk tiap blok.
   4. Angka ringkasan di bagian atas halaman.
   5. Menerima pemberitahuan dari content-bridge.js lalu
      menjalankan ulang penyaringan agar kartu yang baru masuk
      ikut Difilter.

   Semua isi modul ini hanya(additif). Modul tidak menimpa
   definisi yang sudah ada; ia memakai yang ada bila ada.
   ============================================================ */

(function () {
  'use strict';

  var KUNCI_TANDA = 'ghothys_tandai_kartu';

  /* Pengaman: jangan jalan dua kali. */
  if (window.Komunitas) return;

  /* ------------------------------------------------------------
     PENYIMPANAN TANDA BACA
     ------------------------------------------------------------ */
  /* Kalimat yang memuat angka dibuat dari pola. Pola lebih dulu
     diterjemahkan, baru angka disisipkan, supaya angka tidak ikut
     diterjemahan. Nama polanya mengikuti referral.js. */
  function kalimat(pola, isi) {
    var dasar = typeof window.t === 'function' ? window.t(pola) : pola;
    return String(dasar).replace(/\{(\w+)\}/g, function (penanda, nama) {
      return isi && isi[nama] !== undefined ? String(isi[nama]) : penanda;
    });
  }

  function bacaTanda() {
    try {
      var mentah = localStorage.getItem(KUNCI_TANDA);
      var hasil = JSON.parse(mentah || '{}');
      return (hasil && typeof hasil === 'object') ? hasil : {};
    } catch (e) {
      return {};
    }
  }

  function tulisTanda(data) {
    try {
      localStorage.setItem(KUNCI_TANDA, JSON.stringify(data));
    } catch (e) {
      /* Kuota penuh atau mode penyamaran: tanda baca dilewati saja. */
    }
  }

  /* Kartu yang sama bisa muncul lebih dari sekali setelah
     penyaringan. Kunci tanda dibaca dari jenis, judul, dan waktu. */
  function kunciKartu(kartu) {
    var judul = '';
    var elemen = kartu.querySelector('.an-card-title, .ev-card-title');
    if (elemen) judul = (elemen.textContent || '').trim();
    var jenis = kartu.classList.contains('ev-card') ? 'ev' : 'an';
    var waktu = kartu.getAttribute('data-created') || '';
    return jenis + '|' + judul + '|' + waktu;
  }

  /* ------------------------------------------------------------
     TOMBOL BOOKMARK
     ------------------------------------------------------------ */
  function pasangBookmark(kartu) {
    var tombol = kartu.querySelector('.an-cc-bookmark, .ev-cc-bookmark');
    if (!tombol || tombol.dataset.terpasang === '1') return;
    tombol.dataset.terpasang = '1';
    tombol.type = 'button';
    tombol.title = 'Tandai untuk dibaca nanti';
    tombol.setAttribute('aria-pressed', 'false');

    tombol.addEventListener('click', function (kejadian) {
      kejadian.preventDefault();
      kejadian.stopPropagation();

      var tanda = bacaTanda();
      var kunci = kunciKartu(kartu);
      var sudahAda = Object.prototype.hasOwnProperty.call(tanda, kunci);

      if (sudahAda) {
        delete tanda[kunci];
      } else {
        tanda[kunci] = { waktu: new Date().toISOString() };
      }
      tulisTanda(tanda);

      /* Perbarui semua kartu yang punya kunci sama, bukan cuma
         kartu yang diklik, supaya tampilan tetap sinkron. */
      var aktif = !sudahAda;
      var semua = kartu.closest('.an-grid, .ev-grid') ||
                  document.getElementById('an-announcement-grid') ||
                  document.getElementById('ev-event-grid');
      if (semua) {
        semua.querySelectorAll('.an-cc-bookmark, .ev-cc-bookmark').forEach(function (lain) {
          var kartuLain = lain.closest('.an-card, .ev-card');
          if (!kartuLain) return;
          var sama = kunciKartu(kartuLain) === kunci;
          lain.classList.toggle('aktif', sama && aktif);
          lain.setAttribute('aria-pressed', (sama && aktif) ? 'true' : 'false');
        });
      }
    });
  }

  function terapkanTanda() {
    var tanda = bacaTanda();
    var kunciAda = Object.keys(tanda);
    if (!kunciAda.length) return;

    document.querySelectorAll('#community-page .an-card, #community-page .ev-card')
      .forEach(function (kartu) {
        if (kunciKartu(kartu) in tanda) pasangBookmark(kartu);
      });

    document.querySelectorAll('#community-page .an-cc-bookmark, #community-page .ev-cc-bookmark')
      .forEach(function (tombol) {
        var kartu = tombol.closest('.an-card, .ev-card');
        if (!kartu) return;
        if (kunciKartu(kartu) in tanda) {
          tombol.classList.add('aktif');
          tombol.setAttribute('aria-pressed', 'true');
        }
      });
  }

  /* ------------------------------------------------------------
     IKATAN KARTU (dipanggil content-bridge.js)
     ------------------------------------------------------------ */
  window.bindInteractionCards = function (akar) {
    var wadah = (akar && typeof akar.querySelectorAll === 'function')
      ? akar
      : document.getElementById('community-page');
    if (!wadah) return;

    wadah.querySelectorAll('.an-card, .ev-card').forEach(pasangBookmark);

    /* Buka atau tutup deskripsi kartu yang terpotong. */
    wadah.querySelectorAll('.an-card-desc, .ev-card-desc').forEach(function (paragraf) {
      if (paragraf.dataset.terpasang === '1') return;
      paragraf.dataset.terpasang = '1';
      paragraf.title = 'Klik untuk baca penuh';
      paragraf.style.cursor = 'pointer';
      paragraf.addEventListener('click', function () {
        paragraf.classList.toggle('kartu-buka');
        var buka = paragraf.classList.contains('kartu-buka');
        paragraf.title = buka ? 'Klik untuk ciutkan' : 'Klik untuk baca penuh';
      });
    });

    terapkanTanda();
  };

  /* ------------------------------------------------------------
     BANNER OWNER
     ------------------------------------------------------------ */
  window.initSlider = function (akar) {
    var jalur = akar || document.getElementById('banner-viewer');
    if (!jalur) return;

    var penanda = document.getElementById('pb-banner-indikator');
    if (!penanda) return;

    function gambarTitik() {
      var jumlah = jalur.children.length;
      penanda.innerHTML = '';
      penanda.style.display = (jumlah > 1) ? 'flex' : 'none';
      for (var i = 0; i < jumlah; i++) {
        var titik = document.createElement('span');
        titik.className = 'pb-banner-titik';
        titik.setAttribute('data-index', String(i));
        penanda.appendChild(titik);
      }
    }

    function aktifkanTitik() {
      if (!jalur.children.length) return;
      /* Titik aktif = banner yang paling dekat di tengah layar. */
      var tengah = jalur.scrollLeft + (jalur.clientWidth / 2);
      var terbaik = 0;
      var jarakTerdekat = Infinity;
      Array.prototype.forEach.call(jalur.children, function (anak, nomor) {
        var tengahAnak = anak.offsetLeft + (anak.offsetWidth / 2);
        var jarak = Math.abs(tengahAnak - tengah);
        if (jarak < jarakTerdekat) {
          jarakTerdekat = jarak;
          terbaik = nomor;
        }
      });
      penanda.querySelectorAll('.pb-banner-titik').forEach(function (titik, nomor) {
        titik.classList.toggle('aktif', nomor === terbaik);
      });
    }

    /* Titik digambar ulang setiap kali dipanggil, karena banner bisa
       saja baru saja masuk dari server. */
    gambarTitik();
    aktifkanTitik();

    /* Pendengar cukup dipasang sekali. */
    if (jalur.dataset.sliderPasang === '1') return;
    jalur.dataset.sliderPasang = '1';

    jalur.addEventListener('scroll', aktifkanTitik, { passive: true });
    window.addEventListener('resize', aktifkanTitik);

    penanda.addEventListener('click', function (kejadian) {
      var titik = kejadian.target.closest('.pb-banner-titik');
      if (!titik) return;
      var anak = jalur.children[Number(titik.dataset.index)];
      if (!anak) return;
      jalur.scrollTo({
        left: anak.offsetLeft - ((jalur.clientWidth - anak.offsetWidth) / 2),
        behavior: 'smooth'
      });
    });
  };

  /* ------------------------------------------------------------
     STATUS BELUM ADA KONTEN
     ------------------------------------------------------------ */
  function pasangKosong(idGrid, idKosong) {
    var grid = document.getElementById(idGrid);
    var kosong = document.getElementById(idKosong);
    if (!grid || !kosong) return;

    /* Kartu statik di index.html dipakai sebagai cadangan saat
       relay mati. Kalau isinya kartu statik, jangan sentuh. */
    var isiStatis = grid.getAttribute('data-static-cards');
    if (isiStatis === null) {
      grid.setAttribute('data-static-cards', grid.innerHTML);
      isiStatis = grid.innerHTML;
    }

    var jumlahKartu = grid.querySelectorAll('.an-card, .ev-card').length;
    grid.style.display = jumlahKartu ? '' : 'none';
    kosong.style.display = jumlahKartu ? 'none' : '';
  }

  window.pasangStatusKosong = function () {
    pasangKosong('an-announcement-grid', 'an-announcement-kosong');
    pasangKosong('ev-event-grid', 'ev-event-kosong');
    pasangBanner();
    /* Angka ringkasan ikut di sini, bukan hanya di komunitasSegarkan,
       supaya siapa pun yang memanggil fungsi ini mendapat angka yang
       sama. */
    perbaruiAngka();
  };

  function pasangBanner() {
    var jalur = document.getElementById('banner-viewer');
    var kosong = document.getElementById('banner-kosong');
    if (!jalur) return;

    var ada = jalur.querySelectorAll('.pb-banner-item').length > 0;
    jalur.style.display = ada ? '' : 'none';
    if (kosong) kosong.style.display = ada ? 'none' : '';

    /* Titik penanda tidak boleh tertinggal dari banner yang sudah
       diambil owner. */
    var penanda = document.getElementById('pb-banner-indikator');
    if (penanda && !ada) penanda.innerHTML = '';

    if (ada) window.initSlider(jalur);
  }

  /* ------------------------------------------------------------
     PENGUMUMAN YANG DISEMATKAN
     ------------------------------------------------------------ */
  window.pasangPinnedBar = function (judul) {
    var bar = document.getElementById('an-pinned-bar');
    var target = document.getElementById('an-pinned-title');
    if (!bar || !target) return;
    var isi = (judul || '').trim();
    bar.hidden = isi === '';
    if (isi) target.textContent = isi;
  };

  /* ------------------------------------------------------------
     ANGKA RINGKASAN DI BAGIAN ATAS
     ------------------------------------------------------------ */
  function hitungAngka() {
    return {
      pengumuman: document.querySelectorAll('#an-announcement-grid .an-card').length,
      acara: document.querySelectorAll('#ev-event-grid .ev-card').length,
      banner: document.querySelectorAll('#banner-viewer .pb-banner-item').length
    };
  }

  function perbaruiAngka() {
    var angka = hitungAngka();
    var sasaran = [
      { id: 'komunitas-angka-pengumuman', nilai: angka.pengumuman },
      { id: 'komunitas-angka-acara', nilai: angka.acara },
      { id: 'komunitas-angka-banner', nilai: angka.banner }
    ];
    sasaran.forEach(function (butir) {
      var elemen = document.getElementById(butir.id);
      if (elemen) elemen.textContent = String(butir.nilai);
    });

    var jumlah = document.getElementById('komunitas-angka-total');
    if (jumlah) jumlah.textContent = String(angka.pengumuman + angka.acara + angka.banner);

    /* Lencana jumlah di judul blok. */
    var lencanaAn = document.getElementById('komunitas-jumlah-pengumuman');
    if (lencanaAn) lencanaAn.textContent = kalimat('{n} pengumuman', { n: angka.pengumuman });
    var lencanaEv = document.getElementById('komunitas-jumlah-acara');
    if (lencanaEv) lencanaEv.textContent = kalimat('{n} acara', { n: angka.acara });
  }

  /* ------------------------------------------------------------
     SETELAH CONTENT-BRIDGE MENERIMA KONTEN
     ------------------------------------------------------------ */
  window.komunitasSegarkan = function () {
    try {
      if (typeof window.pasangStatusKosong === 'function') window.pasangStatusKosong();
      perbaruiAngka();
      if (typeof window.bindInteractionCards === 'function') {
        window.bindInteractionCards(document.getElementById('community-page'));
      }
      /* Kartu baru masuk setelah penyaringan pertama jalan, jadi
         filter harus dijalankan ulang agar tetap berlaku. */
      if (typeof window.initAnnouncement === 'function') window.initAnnouncement();
      if (typeof window.initEvent === 'function') window.initEvent();
      if (typeof window.perbaruiHitungMundur === 'function') window.perbaruiHitungMundur();
      terapkanTanda();
    } catch (e) {
      console.warn('[komunitas] gagal menyegarkan', e);
    }
  };

  /* content-bridge.js memberitahukan bahwa konten sudah masuk
     lewat peristiwa ghothys-konten-masuk (lihat baris di atas).
     Modul ini cukup mendengarkan, tidak perlu saling memanggil
     secara langsung. */
  window.daftarkanPenyegaran = function () {
    if (typeof window.komunitasSegarkan !== 'function') return;
    if (window.__komunitasSegarkanTerpasang) return;
    window.__komunitasSegarkanTerpasang = true;
    document.addEventListener('ghothys-konten-masuk', window.komunitasSegarkan);
  };

  /* ------------------------------------------------------------
     AWAL
     ------------------------------------------------------------ */
  function mulai() {
    window.daftarkanPenyegaran();
    window.pasangStatusKosong();
    perbaruiAngka();
    terapkanTanda();

    /* Navigasi cepat: lompat ke bagian dalam halaman ini. */
    document.querySelectorAll('#community-page .an-quick-link').forEach(function (tautan) {
      tautan.addEventListener('click', function (kejadian) {
        kejadian.preventDefault();
        var tujuan = document.getElementById(tautan.dataset.ke);
        if (tujuan) tujuan.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  window.Komunitas = {
    pasangPinnedBar: window.pasangPinnedBar,
    pasangStatusKosong: window.pasangStatusKosong,
    segarkan: window.komunitasSegarkan
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    mulai();
  }
})();