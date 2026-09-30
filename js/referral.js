/* ============================================================
   PROGRAM REFERRAL
   ------------------------------------------------------------
   Setiap akun punya satu kode referral. Teman yang memakai kode
   itu saat mendaftar dapat bonus poin. Kalau teman itu melakukan
   order pertama, pengundang dapat persentase dari nilai order.

   Aturan main
     - poin untuk teman      : 150 poin, sekali saat daftar
     - reward untuk pengundang: 5 persen dari order pertama teman
     - order pertama minimal  : Rp 25.000
     - reward per teman       : maksimal Rp 20.000
     - satu akun hanya boleh memakai satu kode, selamanya
     - kode sendiri tidak boleh dipakai untuk mengunda diri sendiri

   Semua kode dimulai dengan awalan GH, misalnya GH7K2M9QX.

   CATATAN PENTING
   Data disimpan di localStorage browser, sama seperti sistem promo.
   Artinya daftar teman dan reward hanya terlihat di perangkat tempat
   datanya disimpan. Tautan yang dibuka teman di perangkat lain tetap
   mencatat kode, tapi reward-nya belum bisa dikirim balik ke perangkat
   pengundang. Sebelum dipakai sebagai rujukan tagihan sungguhan,
   pencatatan kode dan reward harus ikut diverifikasi di worker.
   ============================================================ */

(function () {
  'use strict';

  const KUNCI_SIMPAN = 'ghothys_referral';
  const KUNCI_TERTUNDA = 'ghothys_referral_tertunda';
  const AWALAN = 'GH';
  const PANJANG_KODE = 8;
  const BATAS_PERSEN = 5;
  const PLAFON_REWARD = 20000;
  const ORDER_MINIMAL = 25000;
  const POIN_TEMAN = 150;

  /* ============================================================
     PENYIMPANAN
     ============================================================ */

  function dataKosong() {
    return { versi: 1, kode: {}, pakai: {}, tertunda: '' };
  }

  // Bentuk data bisa rusak kalau localStorage diisi manual atau dari
  // versi lama. Semua lapis lain mengira bentuknya sudah rapi, jadi
  // rapikan sekali di sini.
  function rapikan(data) {
    if (!data.kode || typeof data.kode !== 'object' || Array.isArray(data.kode)) {
      data.kode = {};
    }
    const nama = Object.keys(data.kode);
    for (let i = 0; i < nama.length; i++) {
      const entri = data.kode[nama[i]];
      if (!entri || typeof entri !== 'object') {
        data.kode[nama[i]] = {
          kode: nama[i],
          email: '',
          username: '',
          dibuat: '',
          totalUndang: 0,
          totalReward: 0,
          daftar: [],
        };
        continue;
      }
      if (typeof entri.kode !== 'string' || !entri.kode) entri.kode = nama[i];
      if (typeof entri.email !== 'string') entri.email = '';
      if (typeof entri.username !== 'string') entri.username = '';
      if (!Array.isArray(entri.daftar)) entri.daftar = [];
      if (typeof entri.totalUndang !== 'number' || isNaN(entri.totalUndang)) {
        entri.totalUndang = entri.daftar.length;
      }
      if (typeof entri.totalReward !== 'number' || isNaN(entri.totalReward)) {
        entri.totalReward = 0;
      }
    }
    if (!data.pakai || typeof data.pakai !== 'object' || Array.isArray(data.pakai)) {
      data.pakai = {};
    } else {
      const kunciPakai = Object.keys(data.pakai);
      for (let i = 0; i < kunciPakai.length; i++) {
        if (typeof data.pakai[kunciPakai[i]] !== 'string') delete data.pakai[kunciPakai[i]];
      }
    }
    if (typeof data.tertunda !== 'string') data.tertunda = '';
    return data;
  }

  function muatData() {
    try {
      const mentah = JSON.parse(localStorage.getItem(KUNCI_SIMPAN) || 'null');
      if (!mentah || typeof mentah !== 'object') return dataKosong();
      const data = dataKosong();
      if (mentah.kode && typeof mentah.kode === 'object') data.kode = mentah.kode;
      if (mentah.pakai && typeof mentah.pakai === 'object') data.pakai = mentah.pakai;
      if (typeof mentah.tertunda === 'string') data.tertunda = mentah.tertunda;
      return rapikan(data);
    } catch (e) {
      return dataKosong();
    }
  }

  function simpanData(data) {
    try {
      localStorage.setItem(KUNCI_SIMPAN, JSON.stringify(data));
    } catch (e) {
      /* penyimpanan penuh atau ditolak browser, abaikan saja */
    }
  }

  /* ============================================================
     UTILITAS
     ============================================================ */

  function baru() {
    return new Date();
  }

  function rupiah(angka) {
    return 'Rp ' + Math.floor(Number(angka) || 0).toLocaleString('id-ID');
  }

  function tanggalPendek(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function aman(teks) {
    return String(teks == null ? '' : teks)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Hash sederhana yang hasilnya selalu sama untuk masukan yang sama.
  // Cukup untuk membuat kode unik per akun, bukan untuk keamanan.
  function cincin(teks) {
    let h = 2166136261;
    for (let i = 0; i < teks.length; i++) {
      h ^= teks.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function normalisasiKode(kode) {
    return String(kode || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 24);
  }

  /* ============================================================
     KODE
     ============================================================ */

  function susunKode(email, username, tabrakan) {
    const panjangIsi = PANJANG_KODE - AWALAN.length;
    const dasar = AWALAN + (cincin(email + '|' + username).toUpperCase() + '0000000000').slice(0, panjangIsi);
    if (!tabrakan) return dasar;
    return (dasar + (tabrakan % 36).toString(36).toUpperCase()).slice(0, PANJANG_KODE);
  }

  // Pastikan akun punya satu entri kode. Mengembalikan kode itu.
  function pastikanKode(user) {
    if (!user || !user.email) return '';
    const data = muatData();
    const email = String(user.email).toLowerCase();
    const username = String(user.username || '').toLowerCase();

    for (let i = 0; i < 36; i++) {
      const kandidat = susunKode(email, username, i);
      const ada = data.kode[kandidat];
      if (!ada) {
        data.kode[kandidat] = {
          kode: kandidat,
          email: email,
          username: username,
          dibuat: baru().toISOString(),
          totalUndang: 0,
          totalReward: 0,
          daftar: [],
        };
        simpanData(data);
        return kandidat;
      }
      if (ada.email === email) return kandidat;
    }
    return '';
  }

  function cariKode(kode) {
    const data = muatData();
    return data.kode[normalisasiKode(kode)] || null;
  }

  function ambilKodePengguna() {
    return window.currentUser ? pastikanKode(window.currentUser) : '';
  }

  function tautanUndangan(kode) {
    const dasar = window.location.origin + window.location.pathname;
    return dasar + '?ref=' + encodeURIComponent(kode);
  }

  /* ============================================================
     TERTUNDA DARI TAUTAN
     ============================================================ */

  function pasangDariUrl() {
    let kodeDariUrl = '';
    try {
      const p = new URLSearchParams(window.location.search);
      kodeDariUrl = normalisasiKode(p.get('ref') || '');
    } catch (e) {
      kodeDariUrl = '';
    }
    if (!kodeDariUrl) return '';

    // Bersihkan parameter supaya saat halaman dimuat ulang kode tidak
    // ikut terbawa lagi.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      /* abaikan, tautan tetap jalan */
    }

    const data = muatData();
    data.tertunda = kodeDariUrl;
    simpanData(data);
    try {
      localStorage.setItem(KUNCI_TERTUNDA, kodeDariUrl);
    } catch (e) {
      /* abaikan */
    }

    const pengundang = data.kode[kodeDariUrl];
    if (pengundang) {
      window.showToast && window.showToast(
        'Kode Referral Ditemukan',
        kalimat('Bonus {poin} poin menunggu Anda daftar', { poin: POIN_TEMAN })
      );
    } else {
      window.showToast && window.showToast(
        'Kode Referral Disimpan',
        kalimat('Kode {kode} akan dipakai saat Anda daftar', { kode: kodeDariUrl })
      );
    }
    return kodeDariUrl;
  }

  function ambilTertunda() {
    const data = muatData();
    if (data.tertunda) return data.tertunda;
    try {
      return normalisasiKode(localStorage.getItem(KUNCI_TERTUNDA) || '');
    } catch (e) {
      return '';
    }
  }

  function bersihkanTertunda() {
    const data = muatData();
    data.tertunda = '';
    simpanData(data);
    try {
      localStorage.removeItem(KUNCI_TERTUNDA);
    } catch (e) {
      /* abaikan */
    }
  }

  /* ============================================================
     PENGGUNAAN KODE
     ============================================================ */

  /**
   * Pasang kode referral ke sebuah akun.
   * Dipanggil setelah pendaftaran berhasil, atau saat akun lama
   * pertama kali memakai kode.
   */
  function gunakanKode(kode, user) {
    const target = user || window.currentUser;
    if (!target || !target.email) return { ok: false, error: 'Login dulu' };

    const bersih = normalisasiKode(kode);
    if (!bersih) return { ok: false, error: 'Kode referral belum diisi' };

    const email = String(target.email).toLowerCase();
    const data = muatData();

    if (data.pakai[email]) {
      return {
        ok: false,
        error: kalimat('Akun ini sudah memakai kode {kode}', { kode: data.pakai[email] }),
      };
    }

    const pengundang = data.kode[bersih];
    if (!pengundang) {
      return { ok: false, error: kalimat('Kode {kode} tidak dikenal', { kode: bersih }) };
    }
    if (pengundang.email === email) {
      return { ok: false, error: 'Kode sendiri tidak bisa dipakai' };
    }

    const username = String(target.username || '').toLowerCase();
    data.pakai[email] = bersih;

    // Pengundang harus punya entri, kalau-kalau kodenya dibuat di
    // perangkat lain lalu dipakai di perangkat ini.
    if (!Array.isArray(data.kode[bersih].daftar)) data.kode[bersih].daftar = [];
    const sudahAda = data.kode[bersih].daftar.some(function (d) { return d.email === email; });
    if (!sudahAda) {
      data.kode[bersih].daftar.push({
        email: email,
        username: username,
        tanggal: baru().toISOString(),
        status: 'daftar',
        orderId: '',
        nominal: 0,
        reward: 0,
      });
      data.kode[bersih].totalUndang = (data.kode[bersih].totalUndang || 0) + 1;
    }

    simpanData(data);
    bersihkanTertunda();

    // Bonus poin untuk teman. Kalau kode dipakai oleh akun yang sedang
    // login, poinnya langsung ditambahkan ke akun itu.
    if (window.currentUser && String(window.currentUser.email).toLowerCase() === email) {
      window.currentUser.points = (window.currentUser.points || 0) + POIN_TEMAN;
      if (typeof window.saveCurrentUser === 'function') window.saveCurrentUser();
    } else {
      target.points = (target.points || 0) + POIN_TEMAN;
    }

    return { ok: true, kode: bersih, poin: POIN_TEMAN, pengundang: pengundang.username || '' };
  }

  /**
   * Pakai kode yang tertunda dari tautan undangan, kalau ada dan
   * akun ini belum pernah memakai kode lain.
   */
  function pakaiKodeTertunda() {
    const kode = ambilTertunda();
    if (!kode) return { ok: false, alasan: 'tidak ada kode tertunda' };
    if (!window.currentUser) return { ok: false, alasan: 'belum login' };

    const hasil = gunakanKode(kode, window.currentUser);
    if (!hasil.ok) {
      // Kode yang sudah dipakai atau tidak dikenal tidak perlu disimpan lagi.
      bersihkanTertunda();
      return hasil;
    }
    if (typeof window.updateUI === 'function') window.updateUI();
    pasangPanel();
    return hasil;
  }

  /**
   * Catat order pertama seorang teman dan hitung reward pengundang.
   */
  function catatPesanan(rincian) {
    const info = rincian || {};
    if (!window.currentUser) return { ok: false, alasan: 'belum login' };

    const email = String(window.currentUser.email).toLowerCase();
    const data = muatData();
    const kode = data.pakai[email] || '';
    if (!kode) return { ok: false, alasan: 'tidak memakai kode referral' };

    const pengundang = data.kode[kode];
    if (!pengundang) return { ok: false, alasan: 'kode pengundang tidak ada di perangkat ini' };
    if (!Array.isArray(pengundang.daftar)) pengundang.daftar = [];

    const catatan = pengundang.daftar.find(function (d) { return d.email === email; });
    if (!catatan) return { ok: false, alasan: 'belum tercatat sebagai tamu' };
    if (catatan.status === 'order') return { ok: false, alasan: 'order pertama sudah dihitung' };

    const nominal = Math.max(0, Math.floor(Number(info.nominal) || 0));
    catatan.nominal = nominal;

    if (nominal < ORDER_MINIMAL) {
      catatan.status = 'kurang';
      simpanData(data);
      return {
        ok: false,
        alasan: 'order pertama di bawah ' + rupiah(ORDER_MINIMAL) + ', reward belum diberikan',
        kode: kode,
        nominal: nominal,
      };
    }

    const reward = Math.min(PLAFON_REWARD, Math.floor((nominal * BATAS_PERSEN) / 100));
    catatan.status = 'order';
    catatan.orderId = String(info.orderId || '');
    catatan.reward = reward;
    catatan.tanggalOrder = baru().toISOString();
    pengundang.totalReward = (pengundang.totalReward || 0) + reward;

    simpanData(data);
    return { ok: true, reward: reward, kode: kode, pengundang: pengundang.username || '' };
  }

  /* ============================================================
     RINGKASAN UNTUK PANEL
     ============================================================ */

  function ringkasan() {
    const data = muatData();
    const kode = ambilKodePengguna();
    const saya = kode ? data.kode[kode] : null;
    return {
      kode: kode,
      data: data,
      tertunda: ambilTertunda(),
      sudahPakai: window.currentUser ? (data.pakai[String(window.currentUser.email).toLowerCase()] || '') : '',
      totalUndang: saya ? (saya.totalUndang || 0) : 0,
      totalReward: saya ? (saya.totalReward || 0) : 0,
      daftar: saya && Array.isArray(saya.daftar) ? saya.daftar.slice().reverse() : [],
    };
  }

  /* ============================================================
     PANEL DI HALAMAN PROFIL
     ============================================================ */

  // Kalimat yang memuat kode atau angka dibuat dari pola. Pola lebih
  // dulu diterjemahkan, baru isinya disisipkan, supaya angka rupiah
  // dan kode tidak ikut diterjemahkan.
  function kalimat(pola, isi) {
    const dasar = typeof window.t === 'function' ? window.t(pola) : pola;
    return String(dasar).replace(/\{(\w+)\}/g, function (penanda, nama) {
      return isi && isi[nama] !== undefined ? String(isi[nama]) : penanda;
    });
  }

  function statusCatatan(catatan) {
    if (catatan.status === 'order') {
      return '<span class="ref-pill bagus">Reward ' + rupiah(catatan.reward) + '</span>';
    }
    if (catatan.status === 'kurang') {
      return '<span class="ref-pill netral">Belum memenuhi syarat</span>';
    }
    return '<span class="ref-pill menunggu">Menunggu order pertama</span>';
  }

  function gambarDaftar(daftar) {
    if (!daftar.length) {
      return '<p class="ref-kosong">Belum ada teman yang memakai kode Anda.</p>';
    }
    return daftar
      .map(function (d) {
        return (
          '<li class="ref-item">' +
          '<div class="ref-item-kiri">' +
          '<div class="ref-item-nama">@' + aman(d.username || d.email) + '</div>' +
          '<div class="ref-item-meta">' + aman(tanggalPendek(d.tanggal)) + '</div>' +
          '</div>' +
          '<div class="ref-item-kanan">' + statusCatatan(d) + '</div>' +
          '</li>'
        );
      })
      .join('');
  }

  function pasangPanel() {
    const wadah = document.getElementById('referral-container');
    if (!wadah) return;

    if (!window.currentUser) {
      wadah.innerHTML =
        '<p class="ref-kosong">Login dulu untuk mendapat kode referral Anda.</p>';
      return;
    }

    const r = ringkasan();
    if (!r.kode) {
      wadah.innerHTML = '<p class="ref-kosong">Kode referral belum bisa dibuat untuk akun ini.</p>';
      return;
    }

    const tautan = tautanUndangan(r.kode);
    const barisTertunda = r.tertunda
      ? '<p class="ref-info">' +
        aman(kalimat('Kode {kode} akan dipakai otomatis saat Anda daftar atau login.', { kode: r.tertunda })) +
        '</p>'
      : '';
    const barisDipakai = r.sudahPakai
      ? '<p class="ref-info">' +
        aman(kalimat('Akun Anda memakai kode {kode}. Kode hanya bisa dipakai satu kali.', { kode: r.sudahPakai })) +
        '</p>'
      : '';

    wadah.innerHTML =
      '<div class="ref-kartu">' +
      '<div class="ref-baris">' +
      '<div class="ref-kolom">' +
      '<label class="ref-label">Kode Anda</label>' +
      '<div class="ref-baris-salin">' +
      '<input type="text" id="ref-kode-saya" class="ref-input-kode" readonly value="' + aman(r.kode) + '">' +
      '<button type="button" id="ref-btn-salin-kode" class="ref-tombol">Salin</button>' +
      '</div>' +
      '</div>' +
      '<div class="ref-kolom">' +
      '<label class="ref-label">Tautan undangan</label>' +
      '<div class="ref-baris-salin">' +
      '<input type="text" id="ref-tautan" class="ref-input-tautan" readonly value="' + aman(tautan) + '">' +
      '<button type="button" id="ref-btn-salin-tautan" class="ref-tombol">Salin</button>' +
      '</div>' +
      '<a id="ref-btn-wa" class="ref-tombol hijau" href="https://wa.me/?text=' +
      encodeURIComponent(
        kalimat('Halo, aku punya kode referral {kode} di Ghothys Store. Daftar di sini: {tautan}', {
          kode: r.kode,
          tautan: tautan,
        })
      ) +
      '" target="_blank" rel="noopener noreferrer">Bagikan ke WhatsApp</a>' +
      '</div>' +
      '</div>' +

      '<div class="ref-statistik">' +
      '<div class="ref-stat"><div class="ref-stat-angka">' + r.totalUndang + '</div><div class="ref-stat-label">Teman Diundang</div></div>' +
      '<div class="ref-stat"><div class="ref-stat-angka">' + rupiah(r.totalReward) + '</div><div class="ref-stat-label">Total Reward</div></div>' +
      '<div class="ref-stat"><div class="ref-stat-angka">' + POIN_TEMAN + '</div><div class="ref-stat-label">Poin Untuk Teman</div></div>' +
      '</div>' +

      barisTertunda + barisDipakai +

      '<div class="ref-form">' +
      '<label class="ref-label">Punya kode teman?</label>' +
      '<div class="ref-baris-salin">' +
      '<input type="text" id="ref-input-kode" class="ref-input-kode" placeholder="' +
      aman(kalimat('Masukkan kode, contoh {kode}', { kode: r.kode })) +
      '" autocomplete="off">' +
      '<button type="button" id="ref-btn-gunakan" class="ref-tombol">Gunakan</button>' +
      '</div>' +
      '<p id="ref-status-kode" class="ref-status"></p>' +
      '</div>' +

      '<div class="ref-block">' +
      '<label class="ref-label">Aturan dan daftar teman</label>' +
      '<p class="ref-petunjuk">' +
      kalimat('Teman yang daftar memakai kode Anda dapat {poin} poin.', { poin: POIN_TEMAN }) +
      ' ' +
      kalimat(
        'Anda mendapat {persen} persen dari order pertama teman, minimal order {minimal} dan maksimal reward {plafon} per teman.',
        { persen: BATAS_PERSEN, minimal: rupiah(ORDER_MINIMAL), plafon: rupiah(PLAFON_REWARD) }
      ) +
      '</p>' +
      '<ul class="ref-daftar">' + gambarDaftar(r.daftar) + '</ul>' +
      '<p class="ref-kaki">' +
      kalimat(
        'Reward dihitung di perangkat ini. Kalau teman mendaftar di perangkat lain, reward-nya belum bisa muncul sampai sistemnya dipakai lewat worker.',
        {}
      ) +
      '</p>' +
      '</div>' +
      '</div>';

    ikatTombol(r);
  }

  function ikatTombol(r) {
    const tombolKode = document.getElementById('ref-btn-salin-kode');
    const tombolTautan = document.getElementById('ref-btn-salin-tautan');
    const tombolGunakan = document.getElementById('ref-btn-gunakan');
    const isiKode = document.getElementById('ref-input-kode');
    const statusKode = document.getElementById('ref-status-kode');

    if (tombolKode) {
      tombolKode.addEventListener('click', function () {
        salin(r.kode, 'Kode referral disalin');
      });
    }
    if (tombolTautan) {
      tombolTautan.addEventListener('click', function () {
        salin(tautanUndangan(r.kode), 'Tautan undangan disalin');
      });
    }
    if (tombolGunakan && isiKode && statusKode) {
      const pakai = function () {
        const hasil = gunakanKode(isiKode.value, window.currentUser);
        if (!hasil.ok) {
          statusKode.textContent = hasil.error;
          statusKode.className = 'ref-status buruk';
          window.showErrorToast && window.showErrorToast('Kode Referral Ditolak', hasil.error);
          return;
        }
        statusKode.textContent = kalimat('Kode {kode} dipakai. Bonus {poin} poin ditambahkan.', {
          kode: hasil.kode,
          poin: hasil.poin,
        });
        statusKode.className = 'ref-status bagus';
        window.showToast &&
          window.showToast(
            'Kode Referral Dipakai',
            kalimat('Bonus {poin} poin ditambahkan', { poin: hasil.poin })
          );
        if (typeof window.updateUI === 'function') window.updateUI();
        pasangPanel();
      };
      tombolGunakan.addEventListener('click', pakai);
      isiKode.addEventListener('keydown', function (kejadian) {
        if (kejadian.key === 'Enter') {
          kejadian.preventDefault();
          pakai();
        }
      });
    }
  }

  function salin(teks, pesan) {
    const berhasil = function () {
      window.showToast && window.showToast('Tersalin', pesan);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(teks).then(berhasil).catch(function () {
        salinCadangan(teks, pesan);
      });
    } else {
      salinCadangan(teks, pesan);
    }
  }

  function salinCadangan(teks, pesan) {
    const area = document.createElement('textarea');
    area.value = teks;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let berhasil = false;
    try {
      berhasil = document.execCommand('copy');
    } catch (e) {
      berhasil = false;
    }
    document.body.removeChild(area);
    if (berhasil) {
      window.showToast && window.showToast('Tersalin', pesan);
    } else {
      window.prompt('Salin manual teks berikut:', teks);
    }
  }

  /* ============================================================
     PASANG OTOMATIS
     ============================================================ */

  function pasang() {
    pasangDariUrl();
    pasangPanel();
  }

  window.pakaiKodeTertunda = pakaiKodeTertunda;

  window.Referral = {
    pasangDariUrl: pasangDariUrl,
    pasangPanel: pasangPanel,
    pastikanKode: pastikanKode,
    ambilKodePengguna: ambilKodePengguna,
    cariKode: cariKode,
    tautanUndangan: tautanUndangan,
    gunakanKode: gunakanKode,
    pakaiKodeTertunda: pakaiKodeTertunda,
    catatPesanan: catatPesanan,
    ringkasan: ringkasan,
    normalisasiKode: normalisasiKode,
    ambilTertunda: ambilTertunda,
    bersihkanTertunda: bersihkanTertunda,
    ATURAN: {
      AWALAN: AWALAN,
      BATAS_PERSEN: BATAS_PERSEN,
      PLAFON_REWARD: PLAFON_REWARD,
      ORDER_MINIMAL: ORDER_MINIMAL,
      POIN_TEMAN: POIN_TEMAN,
    },
    KUNCI_SIMPAN: KUNCI_SIMPAN,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pasang);
  } else {
    pasang();
  }
})();
