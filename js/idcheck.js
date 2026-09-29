/* Pengecekan ID user per game - upgrade fase 2 (2026-09-29)
   Cek format lokal (di peramban) + panduan cara menemukan ID.
   Tidak memanggil API luar, tidak mengirim data ke mana pun. */
(function () {
  var E = function (id) { return document.getElementById(id); };

  var ATURAN = {
    'mobile legends': {
      pola: /^\d{6,12}$/,
      pesan: 'UID Mobile Legends berupa 6-12 angka. Contoh: 8877123456',
      cara: 'Buka Mobile Legends, ketuk avatar di kiri atas -> UID ada di bawah foto profil.'
    },
    'valorant': {
      pola: /^[A-Za-z0-9_]{3,16}#[A-Za-z0-9_-]{2,5}$/,
      pesan: 'Riot ID berformat Nama#Tag. Contoh: RajaRimuru#NA1',
      cara: 'Di Valorant, Riot ID tampil di pojok kanan bawah layar utama.'
    },
    'free fire': {
      pola: /^\d{8,12}$/,
      pesan: 'ID Free Fire berupa 8-12 angka. Contoh: 2512345678',
      cara: 'Di Free Fire, ketuk avatar -> ID tertera di bawah nickname.'
    },
    'pubg mobile': {
      pola: /^\d{9,10}$/,
      pesan: 'ID PUBG Mobile berupa 9-10 angka. Contoh: 512345678',
      cara: 'Di lobby PUBG, ID akun tampil di kiri bawah layar.'
    },
    'genshin impact': {
      pola: /^\d{9}$/,
      pesan: 'UID Genshin Impact berupa 9 angka. Contoh: 851234567',
      cara: 'Buka Paimon Menu -> kiri bawah layar ada UID Anda.'
    },
    'honkai star rail': {
      pola: /^\d{9}$/,
      pesan: 'UID Honkai Star Rail berupa 9 angka. Contoh: 801234567',
      cara: 'Ubah nama Trailblazer di profil -> UID tampil di sana.'
    },
    'robux': {
      pola: /^[A-Za-z0-9_]{3,20}$/,
      pesan: 'Username Roblox berupa 3-20 huruf/angka/underscore. Contoh: Ghothys2026',
      cara: 'Masukkan username Roblox (bukan nomor). Tampil di kiri atas situs Roblox.'
    }
  };

  var STREAMING = /disney|hbo max|iqiyi|loklok|netflix|prime video|vidio|viu|wetv|youku|youtube|bstation/;
  var MUSIK = /spotify|apple music/;

  function cariAturan(game) {
    if (!game) return null;
    var kunci = String(game.searchKey || '').toLowerCase();
    var nama = String(game.name || '').toLowerCase();
    if (ATURAN[kunci]) return ATURAN[kunci];
    if (STREAMING.test(kunci) || STREAMING.test(nama)) {
      return {
        pola: null,
        pesan: 'Masukkan email login akun streaming Anda.',
        cara: 'Gunakan email yang sama dengan akun berlangganan (mis. email Netflix/Disney+).'
      };
    }
    if (MUSIK.test(kunci) || MUSIK.test(nama)) {
      return {
        pola: null,
        pesan: 'Masukkan email login akun musik Anda.',
        cara: 'Gunakan email yang sama dengan akun Spotify/Apple Music.'
      };
    }
    return null;
  }

  function cek(nilai, game) {
    nilai = String(nilai || '').trim();
    var aturan = cariAturan(game);
    if (!aturan) {
      return { wajib: false, ok: true, pesan: '', pesanTampil: nilai ? 'Tidak ada aturan khusus untuk game ini.' : '' };
    }
    if (!nilai) {
      return { wajib: true, ok: false, pesan: aturan.pesan, pesanTampil: aturan.pesan };
    }
    if (!aturan.pola) {
      return { wajib: false, ok: true, pesan: aturan.pesan, pesanTampil: aturan.pesan };
    }
    var ok = aturan.pola.test(nilai);
    return {
      wajib: true,
      ok: ok,
      pesan: aturan.pesan,
      pesanTampil: ok ? 'Format ID benar.' : 'Format ID belum sesuai. ' + aturan.pesan
    };
  }

  function muatPanduan(game) {
    var hint = E('id-hint');
    var input = E('user-id');
    if (hint) {
      hint.textContent = '';
      hint.className = 'id-hint';
    }
    if (input) input.value = '';
    var aturan = cariAturan(game);
    if (aturan && input) {
      input.placeholder = aturan.contoh || 'Masukkan User ID';
      if (hint) hint.textContent = aturan.cara;
    }
  }

  function pasangListener() {
    var input = E('user-id');
    var hint = E('id-hint');
    if (!input || !hint) return;
    input.addEventListener('input', function () {
      var hasil = cek(input.value, window.currentGame);
      hint.textContent = hasil.pesanTampil || '';
      if (hasil.wajib && !hasil.ok && hasil.pesanTampil) {
        hint.className = 'id-hint buruk';
      } else if (hasil.wajib && hasil.ok) {
        hint.className = 'id-hint ok';
      } else {
        hint.className = 'id-hint';
      }
    });
  }

  window.ID_CHECK = {
    cek: cek,
    cariAturan: cariAturan,
    muatPanduan: muatPanduan,
    pasangListener: pasangListener
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pasangListener);
  } else {
    pasangListener();
  }
})();