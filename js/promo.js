/* ============================================================
   PROMO / VOUCHER (fase 4)
   ------------------------------------------------------------
   Kode diskon yang bisa didaftarkan. Untuk pengujian ada daftar
   kode bawaan; kode yang didaftarkan disimpan di localStorage
   dan menimpa kode bawaan dengan nama yang sama.

   Bentuk kode yang didukung:
     - persen  : memotong sejumlah persen dari subtotal
     - nominal : memotong sejumlah rupiah
     - berlaku : ada tanggal akhir (TAHUN-BULAN-HARI), opsional
     - points  : hanya berlaku untuk metode pembayaran Points

   Satu order hanya boleh memakai satu kode. Potongan tidak boleh
   membuat total bayar jadi nol atau negatif.

   CATATAN PENTING
   Perhitungan di sini berjalan di browser. Nilainya belum
   diverifikasi server, jadi pembeli tetap bisa memanipulasi
   angka lewat konsol. Sebelum dipakai sebagai rujukan tagihan
   sungguhan, kode harus ikut dicek di worker.
   ============================================================ */

(function () {
  'use strict';

  const KUNCI_SIMPAN = 'ghothys_promo';

  // Persentase dibatasi supaya total tidak pernah habis total.
  const BATAS_PERSEN = 90;

  // Daftar kode bawaan untuk pengujian.
  const BAWAAN = [
    { kode: 'HEMAT10', tipe: 'persen', nilai: 10, catatan: 'Diskon 10 persen' },
    { kode: 'HEMAT25', tipe: 'persen', nilai: 25, catatan: 'Diskon 25 persen' },
    { kode: 'POTONG5K', tipe: 'nominal', nilai: 5000, catatan: 'Potong Rp 5.000' },
    {
      kode: 'DISKONPOIN',
      tipe: 'nominal',
      nilai: 2000,
      khususPoints: true,
      catatan: 'Potong Rp 2.000, khusus Points',
    },
    {
      kode: 'HEMAT15',
      tipe: 'persen',
      nilai: 15,
      berlaku: '2026-12-31',
      catatan: 'Diskon 15 persen sampai 31 Desember 2026',
    },
    {
      kode: 'KEDALUWARSA',
      tipe: 'persen',
      nilai: 50,
      berlaku: '2020-01-01',
      catatan: 'Kode kedaluwarsa, untuk menguji penolakan',
    },
  ];

  /* ============================================================
     BANTUAN
     ============================================================ */

  // Samakan bentuk penulisan kode: spasi dibuang, huruf besar.
  function kunci(teks) {
    return String(teks == null ? '' : teks).trim().toUpperCase();
  }

  function salin(objek) {
    const hasil = {};
    const kunciObjek = Object.keys(objek || {});
    for (let i = 0; i < kunciObjek.length; i++) {
      hasil[kunciObjek[i]] = objek[kunciObjek[i]];
    }
    return hasil;
  }

  function angka(nilai) {
    const hasil = Number(nilai);
    return isFinite(hasil) ? hasil : 0;
  }

  // Tanggal berakhir dianggap habis pada akhir hari tersebut.
  function sudahLewat(teksTanggal) {
    const pola = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(teksTanggal || '').trim());
    if (!pola) return false;
    const batas = new Date(
      Number(pola[1]),
      Number(pola[2]) - 1,
      Number(pola[3]),
      23,
      59,
      59,
      999
    );
    if (isNaN(batas.getTime())) return false;
    return new Date().getTime() > batas.getTime();
  }

  // Tolak bentuk kode yang tidak lengkap atau rusak.
  function bentukSah(objek) {
    if (!objek || typeof objek !== 'object') return false;
    if (!kunci(objek.kode)) return false;
    if (objek.tipe !== 'persen' && objek.tipe !== 'nominal') return false;
    if (angka(objek.nilai) <= 0) return false;
    return true;
  }

  /* ============================================================
     PENYIMPANAN KODE YANG DIDAFTARKAN
     ============================================================ */

  function bacaTersimpan() {
    try {
      const mentah = window.localStorage.getItem(KUNCI_SIMPAN);
      if (!mentah) return [];
      const data = JSON.parse(mentah);
      if (!Array.isArray(data)) return [];
      const hasil = [];
      for (let i = 0; i < data.length; i++) {
        if (bentukSah(data[i])) hasil.push(salin(data[i]));
      }
      return hasil;
    } catch (e) {
      return [];
    }
  }

  function tulisTersimpan(daftar) {
    try {
      window.localStorage.setItem(KUNCI_SIMPAN, JSON.stringify(daftar || []));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ============================================================
     DAFTAR GABUNGAN: BAWAAN + YANG DIDAFTARKAN
     Kode terdaftar dengan nama yang sama menimpa kode bawaan.
     ============================================================ */

  function daftar() {
    const gabungan = [];
    const sudahAda = {};
    const tersimpan = bacaTersimpan();

    for (let i = 0; i < tersimpan.length; i++) {
      const nama = kunci(tersimpan[i].kode);
      gabungan.push(tersimpan[i]);
      sudahAda[nama] = true;
    }

    for (let i = 0; i < BAWAAN.length; i++) {
      const nama = kunci(BAWAAN[i].kode);
      if (sudahAda[nama]) continue;
      gabungan.push(salin(BAWAAN[i]));
    }

    return gabungan;
  }

  function cari(teksKode) {
    const nama = kunci(teksKode);
    if (!nama) return null;
    const semua = daftar();
    for (let i = 0; i < semua.length; i++) {
      if (kunci(semua[i].kode) === nama) return semua[i];
    }
    return null;
  }

  /* ============================================================
     TERAPKAN KODE
     Fungsi ini tidak mengubah apa pun, hanya menghitung.
     ============================================================ */

  function terapkan(teksKode, subtotal, opsi) {
    const pengaturan = opsi || {};
    const dasar = Math.max(0, Math.floor(angka(subtotal)));

    const hasil = {
      ok: false,
      terpakai: false,
      kode: '',
      tipe: '',
      nilai: 0,
      potong: 0,
      sisaBayar: dasar,
      catatan: '',
      error: '',
    };

    const nama = kunci(teksKode);
    if (!nama) {
      hasil.error = 'Kode promo belum diisi';
      return hasil;
    }

    const data = cari(nama);
    if (!data) {
      hasil.error = 'Kode promo ' + nama + ' tidak dikenal';
      return hasil;
    }

    if (data.aktif === false) {
      hasil.error = 'Kode promo ' + nama + ' sudah tidak aktif';
      return hasil;
    }

    if (data.khususPoints === true && pengaturan.payment !== 'Points') {
      hasil.error = 'Kode promo ' + nama + ' hanya berlaku untuk metode pembayaran Points';
      return hasil;
    }

    if (data.berlaku && sudahLewat(data.berlaku)) {
      hasil.error = 'Kode promo ' + nama + ' sudah kedaluwarsa';
      return hasil;
    }

    let potong = 0;
    if (data.tipe === 'persen') {
      const persen = Math.min(angka(data.nilai), BATAS_PERSEN);
      potong = Math.floor(dasar * (persen / 100));
    } else {
      potong = Math.max(0, Math.floor(angka(data.nilai)));
    }

    if (potong <= 0) {
      hasil.error = 'Kode promo ' + nama + ' tidak memberi potongan';
      return hasil;
    }

    if (potong >= dasar) {
      hasil.error = 'Nilai order terlalu kecil untuk kode promo ' + nama;
      return hasil;
    }

    hasil.ok = true;
    hasil.terpakai = true;
    hasil.kode = kunci(data.kode);
    hasil.tipe = data.tipe;
    hasil.nilai = angka(data.nilai);
    hasil.potong = potong;
    hasil.sisaBayar = dasar - potong;
    hasil.catatan = data.catatan || '';
    return hasil;
  }

  /* ============================================================
     PENDAFTARAN KODE BARU
     ============================================================ */

  function daftarkan(data) {
    if (!bentukSah(data)) {
      return { ok: false, error: 'Bentuk kode tidak lengkap: butuh kode, tipe persen atau nominal, dan nilai di atas nol' };
    }

    const baru = salin(data);
    baru.kode = kunci(baru.kode);
    baru.catatan = String(baru.catatan || '').trim();
    if (baru.tipe === 'persen') {
      baru.nilai = Math.min(angka(baru.nilai), BATAS_PERSEN);
    } else {
      baru.nilai = Math.max(0, Math.floor(angka(baru.nilai)));
    }

    const tersimpan = bacaTersimpan();
    let diganti = false;
    for (let i = 0; i < tersimpan.length; i++) {
      if (kunci(tersimpan[i].kode) === baru.kode) {
        tersimpan[i] = baru;
        diganti = true;
        break;
      }
    }
    if (!diganti) tersimpan.push(baru);

    if (!tulisTersimpan(tersimpan)) {
      return { ok: false, error: 'Gagal menyimpan kode, penyimpanan browser penuh atau ditolak' };
    }
    return { ok: true, kode: baru.kode, menimpa: diganti };
  }

  function hapus(teksKode) {
    const nama = kunci(teksKode);
    const tersimpan = bacaTersimpan();
    const sisa = [];
    let ketemu = false;
    for (let i = 0; i < tersimpan.length; i++) {
      if (kunci(tersimpan[i].kode) === nama) {
        ketemu = true;
        continue;
      }
      sisa.push(tersimpan[i]);
    }
    if (!ketemu) return { ok: false, error: 'Kode ' + nama + ' tidak ada di daftar terdaftar' };
    if (!tulisTersimpan(sisa)) {
      return { ok: false, error: 'Gagal menyimpan perubahan' };
    }
    return { ok: true, kode: nama };
  }

  // Buang semua kode terdaftar, kode bawaan tetap ada.
  function kosongkan() {
    return tulisTersimpan([]);
  }

  /* ============================================================
     KODE YANG SEDANG DIPAKAI
     Disimpan di modul agar topup.js bisa membacanya saat
     menghitung total.
     ============================================================ */

  let aktif = null;

  function terapkanDanSimpan(teksKode, subtotal, opsi) {
    const hasil = terapkan(teksKode, subtotal, opsi);
    aktif = hasil.terpakai ? hasil : null;
    return hasil;
  }

  function ambilAktif() {
    return aktif ? salin(aktif) : null;
  }

  function lepasAktif() {
    aktif = null;
  }

  /* ============================================================
     ANTARMUKA KOTAK KODE PROMO
     ============================================================ */

  function setStatus(elemen, pesan, jenis) {
    if (!elemen) return;
    elemen.textContent = pesan || '';
    elemen.className = 'promo-status' + (jenis ? ' ' + jenis : '');
  }

  function rupiah(nilai) {
    return 'Rp ' + Math.max(0, Math.floor(angka(nilai))).toLocaleString('id-ID');
  }

  // Gambar daftar kode yang tersedia, supaya mudah diuji.
  // Kode yang diklik langsung masuk ke kotak input.
  function gambarDaftar(kotak, input) {
    const judul = document.getElementById('promo-daftar-judul');
    const wadah = document.getElementById('promo-daftar');
    if (!wadah) return;

    const semua = daftar();
    while (wadah.firstChild) wadah.removeChild(wadah.firstChild);

    if (!semua.length) {
      if (judul) judul.style.display = 'none';
      wadah.style.display = 'none';
      return;
    }

    for (let i = 0; i < semua.length; i++) {
      const kode = semua[i];
      const butir = document.createElement('li');
      butir.className = 'promo-daftar-item';

      const tombolKode = document.createElement('button');
      tombolKode.type = 'button';
      tombolKode.className = 'promo-daftar-kode';
      tombolKode.textContent = kunci(kode.kode);
      tombolKode.addEventListener('click', function () {
        if (input) {
          input.value = kunci(kode.kode);
          input.focus();
        }
      });

      const keterangan = document.createElement('span');
      keterangan.className = 'promo-daftar-keterangan';
      let teks = kode.catatan || '';
      if (kode.berlaku) teks += ' (sampai ' + kode.berlaku + ')';
      keterangan.textContent = teks;

      butir.appendChild(tombolKode);
      butir.appendChild(keterangan);
      wadah.appendChild(butir);
    }

    if (judul) judul.style.display = 'block';
    wadah.style.display = 'flex';
  }

  function pasang() {
    const kotak = document.getElementById('promo-box');
    if (!kotak) return;

    const input = document.getElementById('promo-input');
    const tombolPakai = document.getElementById('promo-pakai-btn');
    const tombolHapus = document.getElementById('promo-hapus-btn');
    const status = document.getElementById('promo-status');
    const ringkas = document.getElementById('promo-ringkas');

    function pembayaranTerpilih() {
      const terpilih = document.querySelector('input[name="payment"]:checked');
      return terpilih ? terpilih.value : '';
    }

    function nilaiPaket() {
      const terpilih = document.querySelector('input[name="package"]:checked');
      if (!terpilih) return 0;
      try {
        const paket = JSON.parse(terpilih.value);
        const harga = angka(paket.price);
        const diskon = angka(paket.discount);
        return Math.floor(diskon > 0 ? harga * (1 - diskon / 100) : harga);
      } catch (e) {
        return 0;
      }
    }

    function segarkan() {
      if (!ringkas) return;
      const voucher = ambilAktif();

      while (ringkas.firstChild) ringkas.removeChild(ringkas.firstChild);

      if (!voucher) {
        ringkas.className = 'promo-ringkas';
        if (tombolHapus) tombolHapus.style.display = 'none';
        return;
      }

      ringkas.className = 'promo-ringkas aktif';
      const bagianKode = document.createElement('span');
      bagianKode.className = 'promo-ringkas-kode';
      bagianKode.textContent = 'promo ' + voucher.kode;
      const bagianPotong = document.createElement('span');
      bagianPotong.className = 'promo-ringkas-potong';
      bagianPotong.textContent = '- ' + rupiah(voucher.potong);
      ringkas.appendChild(bagianKode);
      ringkas.appendChild(document.createTextNode(' '));
      ringkas.appendChild(bagianPotong);

      if (tombolHapus) tombolHapus.style.display = 'inline-block';
    }

    function jalankan() {
      const kode = input ? input.value : '';

      if (!kode.trim()) {
        setStatus(status, 'Kode promo belum diisi', 'buruk');
        return;
      }

      const voucher = terapkanDanSimpan(kode, nilaiPaket(), {
        payment: pembayaranTerpilih(),
      });

      if (!voucher.ok) {
        setStatus(status, voucher.error, 'buruk');
        segarkan();
        return;
      }

      setStatus(
        status,
        'Kode ' + voucher.kode + ' dipakai. Potongan ' + rupiah(voucher.potong) + '.',
        'bagus'
      );
      segarkan();
    }

    if (tombolPakai) tombolPakai.addEventListener('click', jalankan);

    if (input) {
      input.addEventListener('keydown', function (kejadian) {
        if (kejadian.key === 'Enter') {
          kejadian.preventDefault();
          jalankan();
        }
      });
      input.addEventListener('input', function () {
        setStatus(status, '', '');
      });
    }

    if (tombolHapus) {
      tombolHapus.addEventListener('click', function () {
        lepasAktif();
        if (input) input.value = '';
        setStatus(status, 'Kode promo dilepas', '');
        segarkan();
      });
    }

    // Kalau metode bayar atau paket berubah, kode khusus Points
    // bisa saja tidak lagi berlaku, jadi periksa ulang.
    document.addEventListener('change', function (kejadian) {
      const target = kejadian.target;
      const nama = target && target.name;
      if (nama !== 'payment' && nama !== 'package') return;
      const voucher = ambilAktif();
      if (!voucher) return;
      const cek = terapkan(voucher.kode, nilaiPaket(), { payment: pembayaranTerpilih() });
      if (!cek.ok) {
        lepasAktif();
        setStatus(status, cek.error, 'buruk');
      } else {
        setStatus(
          status,
          'Kode ' + cek.kode + ' dipakai. Potongan ' + rupiah(cek.potong) + '.',
          'bagus'
        );
        terapkanDanSimpan(cek.kode, nilaiPaket(), { payment: pembayaranTerpilih() });
      }
      segarkan();
    });

    segarkan();
    gambarDaftar(kotak, input);
  }

  /* ============================================================
     PUBLIKASI KE HALAMAN
     ============================================================ */

  window.Promo = {
    daftar: daftar,
    cari: cari,
    terapkan: terapkan,
    daftarkan: daftarkan,
    hapus: hapus,
    kosongkan: kosongkan,
    ambilAktif: ambilAktif,
    terapkanDanSimpan: terapkanDanSimpan,
    lepasAktif: lepasAktif,
    pasang: pasang,
    KUNCI_SIMPAN: KUNCI_SIMPAN,
    BAWAAN: BAWAAN,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pasang);
  } else {
    pasang();
  }
})();
