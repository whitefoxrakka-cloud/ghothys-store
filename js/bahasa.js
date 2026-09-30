/* ============================================================
   MULTI-BAHASA
   ------------------------------------------------------------
   Bahasa sumber halaman ini adalah bahasa Indonesia. Kamus hanya
   memuat arah Indonesia ke Inggris, jadi teks asli setiap simpul
   DOM disimpan di memori saat pertama kali dibaca. Kalau bahasa
   diganti bolak-balik, teks diturunkan dari teks asli, bukan dari
   hasil terjemahan sebelumnya. Tanpa begitu, terjemahan bisa
   tertimpa dua kali lalu rusak.

   Yang ikut diterjemahkan
     - semua simpul teks di dalam halaman
     - atribut placeholder, title, dan aria-label
     - judul tab peramban
     - pesan toast, lewat pembungkus showToast
     - panel referral, karena digambar ulang dari kode

   Yang TIDAK ikut diterjemahkan
     - nama game dan nama paket, itu milik penyedia
     - angka rupiah, nomor telepon, dan nama merek pembayaran
     - nama toko sendiri
   ============================================================ */

(function () {
  'use strict';

  const KUNCI = 'ghothys_bahasa';
  const BAWAAN = 'id';
  const PILIHAN = [
    { kode: 'id', label: 'ID', nama: 'Bahasa Indonesia' },
    { kode: 'en', label: 'EN', nama: 'English' },
  ];

  /* ============================================================
     KAMUS
     Kunci harus sama persis dengan teks di halaman, termasuk huruf
     besar-kecil dan tanda baca.
     ============================================================ */

  const KAMUS = {
    en: {
      // Navigasi dan pencarian
      'Beranda': 'Home',
      'Transaksi': 'Orders',
      'Profil': 'Profile',
      'Keluar': 'Log out',
      'Masuk': 'Log in',
      'Daftar': 'Sign up',
      'Cari game...': 'Search games...',
      'Panel Owner': 'Owner Panel',
      'Pilih Game': 'Choose Game',
      'Semua': 'All',
      'Urut Termurah': 'Cheapest First',
      'Game Populer': 'Popular Games',
      'Top Up Sekarang': 'Top Up Now',
      'Beli Sekarang': 'Buy Now',
      'List Top Up': 'Top Up List',
      'Cek Status Pesanan': 'Check Order Status',
      'Riwayat Pesanan': 'Order History',
      'Semua order Anda lengkap dengan status terbaru dari server':
        'All your orders with the latest status from the server',
      'Masukkan Order ID untuk melihat status pesanan Anda':
        'Enter an Order ID to see your order status',

      // Halaman depan
      'Kenapa Pilih Kami?': 'Why Choose Us?',
      'Harga Terbaik': 'Best Prices',
      'Dapatkan harga paling kompetitif': 'Get the most competitive prices',
      'Proses Cepat': 'Fast Processing',
      'Top up otomatis dalam hitungan detik': 'Top up completes within seconds',
      'Item masuk dalam hitungan menit': 'Items delivered within minutes',
      'Aman & Terpercaya': 'Safe & Trusted',
      'Transaksi dijamin 100% aman': 'Transactions guaranteed 100% secure',
      'Testimoni': 'Testimonials',
      'Terpecaya': 'Trusted',
      'Musik': 'Music',
      'Cari game atau paket — mis. diamond, free fire, netflix, spotify...':
        'Search for a game or package — e.g. diamond, free fire, netflix, spotify...',
      'Game Top Up Banner dengan karakter mascot': 'Game top up banner with mascot character',
      'Roblox Games Banner dengan karakter mascot': 'Roblox games banner with mascot character',
      'Voucher Murah Banner dengan karakter mascot': 'Cheap voucher banner with mascot character',

      // Profil
      'Pengaturan Akun': 'Account Settings',
      'Ubah Password': 'Change Password',
      'Nomor Telepon': 'Phone Number',
      'Notifikasi': 'Notifications',
      'Bantuan & Support': 'Help & Support',
      'Ubah (Rp 10.000)': 'Change (Rp 10.000)',
      'Ubah username dengan biaya Rp 10.000 ke DANA: 082137499434':
        'Change username for Rp 10.000 via DANA: 082137499434',
      'Total Transaksi': 'Total Orders',
      'Total Pengeluaran': 'Total Spending',
      'Tidak bisa diubah': 'Cannot be changed',
      'Ubah Foto': 'Change Photo',
      'Ubah Nomor Telepon': 'Change Phone Number',
      'Ubah Username': 'Change Username',
      'Username Baru': 'New Username',
      'Username baru': 'New username',
      'Nomor Baru': 'New Number',
      'Masukkan nickname': 'Enter nickname',
      'Pilih username': 'Choose a username',
      '3-20 karakter, huruf, angka, underscore': '3-20 characters, letters, numbers, underscore',
      'Min. 6 karakter': 'Min. 6 characters',
      'Lupa Password': 'Forgot Password',
      'Lupa Password?': 'Forgot password?',
      'Kirim Link Reset': 'Send Reset Link',
      'Masukkan email terdaftar untuk reset password.':
        'Enter your registered email to reset the password.',
      'Masukkan email': 'Enter email',
      'Masukkan email atau username': 'Enter email or username',
      'Masukkan password': 'Enter password',
      'Password Lama': 'Old Password',
      'Password Baru': 'New Password',
      'Password lama': 'Old password',
      'Ketik ulang': 'Retype',
      'Kirim Kode': 'Send Code',
      'Kode Verifikasi': 'Verification Code',
      'Kode dikirim ke': 'Code sent to',
      'Kirim ulang sekarang': 'Resend now',
      'Belum punya akun?': "Don't have an account?",
      'Sudah punya akun?': 'Already have an account?',
      'Login & Simpan Otomatis': 'Log In & Auto Save',
      'Login sekali di sini. Berlaku di semua tab sampai 8 jam, lalu setiap klik Simpan langsung masuk server tanpa langkah tambahan.':
        'Log in once here. It applies to every tab for up to 8 hours, then each Save click goes straight to the server with no extra steps.',
      'Simpan': 'Save',
      'Konfirmasi': 'Confirm',
      'Pilih': 'Select',

      // Top up
      'Pilih Paket & Bayar': 'Choose Package & Pay',
      'Masukkan Data': 'Enter Details',
      'Masukkan detail untuk top up': 'Enter the top up details',
      'Masukkan User ID': 'Enter User ID',
      'Masukkan Server/Zone ID': 'Enter Server/Zone ID',
      'Isi User ID dan Server/Zone': 'Fill in User ID and Server/Zone',
      'Pilih Paket': 'Choose Package',
      'Pilih paket, metode pembayaran, lalu konfirmasi':
        'Choose a package and payment method, then confirm',
      'Metode Pembayaran': 'Payment Method',
      'Metode': 'Method',
      'Total Bayar': 'Total Payment',
      'Silakan lakukan pembayaran di bawah ini.': 'Please make the payment below.',
      'Transfer ke nomor berikut:': 'Transfer to the following number:',
      'Salin Nomor': 'Copy Number',
      'Lihat Detail Pesanan': 'View Order Details',
      'Sembunyikan Detail': 'Hide Details',
      'Konfirmasi via WhatsApp': 'Confirm via WhatsApp',
      'Chat WhatsApp': 'Chat on WhatsApp',
      'Nomor WhatsApp': 'WhatsApp Number',
      'Tutup': 'Close',
      'Kembali': 'Back',
      'Pesanan Dibuat!': 'Order Created!',
      'Selesai!': 'Done!',

      // Notifikasi
      'Notifikasi langsung': 'Direct notifications',
      'Notifikasi transaksi via email': 'Order notifications by email',
      'Notifikasi via WhatsApp': 'Notifications via WhatsApp',
      'Gunakan points Anda': 'Use your points',
      'Points Anda': 'Your Points',

      // Pertanyaan umum
      'Apakah aman?': 'Is it safe?',
      'Berapa lama proses top up?': 'How long does top up take?',
      'Bagaimana cara menggunakan Points?': 'How do I use Points?',
      'Bisa refund?': 'Can I get a refund?',
      'Refund hanya jika ada kesalahan dari pihak kami.':
        'Refunds are only given if the mistake is on our side.',
      'Sangat aman! Kami tidak meminta password game Anda.':
        'Completely safe! We never ask for your game password.',
      'Proses biasanya 1-5 menit setelah pembayaran dikonfirmasi.':
        'Processing usually takes 1-5 minutes after payment is confirmed.',
      'Pilih metode pembayaran "Points" saat checkout.':
        'Choose the "Points" payment method at checkout.',
      '1. Bayar sesuai total di atas ke nomor yang tertera.':
        '1. Pay the total above to the listed number.',
      '2. Klik tombol di bawah untuk konfirmasi via WhatsApp.':
        '2. Click the button below to confirm via WhatsApp.',
      '3. Kirim screenshot bukti transfer di chat WhatsApp.':
        '3. Send a screenshot of the payment receipt in the WhatsApp chat.',
      '4. Pesanan diproses 1-5 menit setelah pembayaran dikonfirmasi.':
        '4. The order is processed 1-5 minutes after payment is confirmed.',
      'Cara Top Up': 'How to Top Up',
      'Pilih game dari halaman beranda': 'Pick a game from the home page',

      // Kaki halaman
      'Hubungi Kami': 'Contact Us',
      'Ikuti Kami': 'Follow Us',
      'Produk': 'Products',
      'Bantuan': 'Help',
      'Platform top up game dan voucher digital terpercaya di Indonesia':
        'A trusted Indonesian platform for game top ups and digital vouchers',
      'Platform yang menyediakan kebutuhan Item - Item game seperti Roblox dan Mobile Legend, disini kami juga menyediakan tempat untuk berkomunikasi antar member.':
        'A platform for game items such as Roblox and Mobile Legends, and a place for members to talk to each other.',
      '© 2024 Ghothys Store. Semua hak dilindungi.':
        '© 2024 Ghothys Store. All rights reserved.',

      // Panel pemilik
      'Sinkronisasi Konten ke Server': 'Sync Content to Server',
      'Memeriksa status sinkronisasi...': 'Checking sync status...',

      // Promo
      'Info promo & diskon': 'Promo and discount info',
      'Punya Kode Promo?': 'Have a Promo Code?',
      'Masukkan kode untuk memotong harga. Satu order hanya memakai satu kode.':
        'Enter a code to reduce the price. One order can only use one code.',
      'Contoh: HEMAT10': 'Example: HEMAT10',
      'Kode Tersedia': 'Available Codes',
      'Kode': 'Code',
      'Lepas': 'Remove',

      // Referral
      'Program Referral': 'Referral Program',
      'Kode Anda': 'Your Code',
      'Tautan undangan': 'Invitation link',
      'Salin': 'Copy',
      'Bagikan ke WhatsApp': 'Share on WhatsApp',
      'Teman Diundang': 'Friends Invited',
      'Poin Untuk Teman': 'Points for Friend',
      'Punya kode teman?': "Have a friend's code?",
      'Gunakan': 'Use',
      'Aturan dan daftar teman': 'Rules and friend list',
      'Belum ada teman yang memakai kode Anda.': 'No friends have used your code yet.',
      'Menunggu order pertama': 'Waiting for first order',
      'Belum memenuhi syarat': 'Not eligible yet',
      'Login dulu untuk mendapat kode referral Anda.': 'Log in first to get your referral code.',
      'Kode referral belum bisa dibuat untuk akun ini.':
        'A referral code cannot be made for this account.',
      // Kalimat referral yang memuat kode atau angka, memakai pola
      // {nama}. Isinya disisipkan setelah penerjemahan.
      'Kode {kode} akan dipakai otomatis saat Anda daftar atau login.':
        'Code {kode} will be applied automatically when you sign up or log in.',
      'Akun Anda memakai kode {kode}. Kode hanya bisa dipakai satu kali.':
        'Your account uses code {kode}. A code can only be used once.',
      'Halo, aku punya kode referral {kode} di Ghothys Store. Daftar di sini: {tautan}':
        "Hi, I have referral code {kode} on Ghothys Store. Sign up here: {tautan}",
      'Masukkan kode, contoh {kode}': 'Enter a code, for example {kode}',
      'Teman yang daftar memakai kode Anda dapat {poin} poin.':
        'A friend who signs up with your code gets {poin} points.',
      'Anda mendapat {persen} persen dari order pertama teman, minimal order {minimal} dan maksimal reward {plafon} per teman.':
        "You get {persen} percent of your friend's first order, minimum {minimal}, and a maximum reward of {plafon} per friend.",
      'Reward dihitung di perangkat ini. Kalau teman mendaftar di perangkat lain, reward-nya belum bisa muncul sampai sistemnya dipakai lewat worker.':
        'Rewards are counted on this device. If a friend signs up on another device, their reward cannot show up yet, until the system is put to use through the worker.',
      'Kode {kode} dipakai. Bonus {poin} poin ditambahkan.': 'Code {kode} applied. {poin} bonus points added.',
      'Bonus {poin} poin ditambahkan': '{poin} bonus points added',
      'Bonus {poin} poin menunggu Anda daftar': '{poin} points waiting for you to sign up',
      'Kode {kode} akan dipakai saat Anda daftar': 'Code {kode} will be applied when you sign up',
      'Akun ini sudah memakai kode {kode}': 'This account already uses code {kode}',
      'Kode {kode} tidak dikenal': 'Code {kode} is not known',
      'Kode sendiri tidak bisa dipakai': 'You cannot use your own code',
      'Kode referral belum diisi': 'The referral code is empty',
      'Login dulu': 'Log in first',
      'Kode Referral Ditolak': 'Referral Code Rejected',
      'Kode referral disalin': 'Referral code copied',
      'Tautan undangan disalin': 'Invitation link copied',
      'Tersalin': 'Copied',

      // Ekspor
      'Ekspor CSV': 'Export CSV',
      'Ekspor PDF': 'Export PDF',
      '📄 Ekspor CSV': '📄 Export CSV',
      '📑 Ekspor PDF': '📑 Export PDF',
      'Ekspor CSV Riwayat': 'Export order history as CSV',
      'Ekspor PDF Riwayat': 'Export order history as PDF',
      'Riwayat Transaksi Ghothys Store': 'Ghothys Store Order History',
      'Dicetak pada:': 'Printed on:',
      'Tanggal': 'Date',
      'Paket': 'Package',
      'Harga': 'Price',
      'Jumlah': 'Amount',
      'Metode Bayar': 'Payment Method',
      'Poin Diperoleh': 'Points Earned',
      'Kode Promo': 'Promo Code',
      'Potongan Promo': 'Promo Discount',

      // Judul tab
      'Ghothys Store - Top Up Game & Voucher': 'Ghothys Store - Game Top Up & Vouchers',

      // Pesan toast
      'Bahasa': 'Language',
      'Pilihan bahasa': 'Language choice',
      'Berhasil': 'Success',
      'Berhasil!': 'Success!',
      'Gagal': 'Failed',
      'Gagal kirim ke server': 'Failed to send to the server',
      'Konten tersimpan': 'Content saved',
      'Konten hanya ada di browser ini. Periksa koneksi lalu coba lagi.':
        'Content only exists in this browser. Check your connection and try again.',
      'Berlaku di semua tab sampai 8 jam. Konten dikirim ulang otomatis.':
        'Applies to every tab for up to 8 hours. Content is re-sent automatically.',
      'Perubahan sudah terkirim ke server dan tampil untuk pengunjung.':
        'Changes have been sent to the server and are now visible to visitors.',
      'Login Berhasil!': 'Logged In!',
      'Registrasi Berhasil!': 'Registered!',
      'Logout': 'Logged Out',
      'Sampai jumpa!': 'See you!',
      'Selamat datang': 'Welcome',
      'Login Diperlukan': 'Login Required',
      'Silakan login dulu': 'Please log in first',
      'Silakan login terlebih dahulu': 'Please log in first',
      'Login tersimpan': 'Login saved',
      'Akses Ditolak': 'Access Denied',
      'Hanya pemilik toko yang dapat mengakses panel ini':
        'Only the store owner can open this panel',
      'Tidak Cocok': 'Does Not Match',
      'Password baru tidak cocok': 'The new passwords do not match',
      'Password diubah': 'Password changed',
      'Username diubah': 'Username changed',
      'Nomor diubah': 'Number changed',
      'Foto diperbarui': 'Photo updated',
      'Kode Terkirim': 'Code Sent',
      'Kode tidak valid': 'Invalid Code',
      'Tunggu 7 hari': 'Wait 7 days',
      '⏰ Cooldown: 7 Hari': '⏰ Cooldown: 7 Days',
      'Pilih Paket': 'Choose Package',
      'Pilih jumlah points': 'Choose a points package',
      'Terlalu Besar': 'Too Large',
      'Email tidak sesuai': 'Email does not match',
      'Salah': 'Wrong',
      'Validasi': 'Validation',
      'Field tidak lengkap:': 'Missing fields:',
      'Pesanan Berhasil Dibuat': 'Order Created',
      '✅ Pesanan Berhasil Dibuat': '✅ Order Created',
      '✅ Tersalin': '✅ Copied',
      'Tersalin': 'Copied',
      'Detail pesanan disalin': 'Order details copied',
      'Status Pesanan Diperbarui': 'Order Status Updated',
      'Tidak bisa diubah': 'Cannot be changed',
      'Belum punya akun?': "Don't have an account?",
      'Title & content required': 'Title and content are required',
      'Title & date required': 'Title and date are required',
      'Notifikasi Owner terkirim (': 'Owner notification sent (',
      'Namun notifikasi Owner gagal dikirim': 'The owner notification could not be sent',
      'Notifikasi belum dikonfigurasi': 'Notifications are not configured yet',
      'Kode Referral Dipakai': 'Referral Code Applied',
      'Kode Referral Disimpan': 'Referral Code Saved',
      'Kode Referral Ditemukan': 'Referral Code Found',
      'Kode Promo Tidak Berlaku': 'Promo Code Not Valid',
      'Points Tidak Cukup': 'Not Enough Points',
      'ID Tidak Valid': 'Invalid ID',
      'Belum ada transaksi untuk diekspor': 'No transactions to export',
      'Ekspor Gagal': 'Export Failed',
      'Ekspor PDF Gagal': 'PDF Export Failed',
      'Gagal memuat library jsPDF': 'Could not load the jsPDF library',
      'Daftar akun': 'Account list',
    },
  };

  // Teks asli per simpul, supaya penerjemahan bisa diulang.
  const asalTeks = new WeakMap();
  const asalAtrib = new WeakMap();
  const asalJudul = { ada: false, teks: '' };

  /* ============================================================
     KEADAAN BAHASA
     ============================================================ */

  function adaKode(kode) {
    for (let i = 0; i < PILIHAN.length; i++) {
      if (PILIHAN[i].kode === kode) return true;
    }
    return false;
  }

  function ambil() {
    let kode = '';
    try {
      kode = localStorage.getItem(KUNCI) || '';
    } catch (e) {
      kode = '';
    }
    if (!adaKode(kode)) kode = BAWAAN;
    return kode;
  }

  function simpan(kode) {
    const bersih = adaKode(kode) ? kode : BAWAAN;
    try {
      localStorage.setItem(KUNCI, bersih);
    } catch (e) {
      /* penyimpanan ditolak, bahasa tetap berlaku untuk sesi ini */
    }
    return bersih;
  }

  function peta() {
    const kode = ambil();
    return KAMUS[kode] || {};
  }

  /**
   * Terjemahkan satu kalimat. Kalau kalimatnya tidak ada di kamus,
   * kalimat aslinya dikembalikan apa adanya.
   */
  function terjemahkan(teks) {
    if (teks == null) return teks;
    const p = peta();
    if (!p) return teks;
    return Object.prototype.hasOwnProperty.call(p, teks) ? p[teks] : teks;
  }

  /* ============================================================
     MENERJEMAKAN HALAMAN
     ============================================================ */

  function adaKunci(p, kunci) {
    return Object.prototype.hasOwnProperty.call(p, kunci);
  }

  /**
   * Terjemahkan satu simpul teks.
   *
   * Teks asli dicatat setiap kali, dan teks yang ditampilkan juga
   * disimpan. Kalau nilai di simpul sama dengan hasil terjemahan
   * sebelumnya, berarti simpul itu belum disentuh kode lain, jadi
   * teks asli yang lama masih boleh dipakai. Kalau berbeda, berarti
   * kode baru menimpanya, dan nilai sekarang yang jadi teks asli.
   * Tanpa pemisahan ini, simpul yang ditimpa berkali-kali akan
   * kehilangan teks aslinya.
   *
   * Kalau kalimatnya tidak ada di kamus, teks asli dikembalikan,
   * bukan hasil terjemahan sebelumnya. Itulah yang membuat halaman
   * bisa kembali ke bahasa Indonesia dengan utuh.
   */
  function terjemahkanSatuTeks(simpul, p) {
    const sekarang = simpul.nodeValue;
    if (typeof sekarang !== 'string') return false;

    let asal = sekarang;
    const rekaman = asalTeks.get(simpul);
    if (rekaman && rekaman.hasil === sekarang) asal = rekaman.asal;

    const bagianAsli = asal.trim();
    if (!bagianAsli) return false;

    const baru = adaKunci(p, bagianAsli) ? asal.replace(bagianAsli, p[bagianAsli]) : asal;
    if (baru !== sekarang) simpul.nodeValue = baru;
    asalTeks.set(simpul, { asal: asal, hasil: baru });
    return baru !== sekarang;
  }

  function terjemahkanSatuAtrib(elemen, nama, p) {
    if (!elemen.hasAttribute || !elemen.hasAttribute(nama)) return false;
    const nilai = elemen.getAttribute(nama);
    if (!nilai || !nilai.trim()) return false;

    let simpanan = asalAtrib.get(elemen);
    if (!simpanan) {
      simpanan = {};
      asalAtrib.set(elemen, simpanan);
    }

    let asal = nilai;
    if (simpanan[nama] && simpanan[nama].hasil === nilai) asal = simpanan[nama].asal;

    const bagianAsli = asal.trim();
    if (!bagianAsli) return false;

    const baru = adaKunci(p, bagianAsli) ? asal.replace(bagianAsli, p[bagianAsli]) : asal;
    if (baru !== nilai) elemen.setAttribute(nama, baru);
    simpanan[nama] = { asal: asal, hasil: baru };
    return baru !== nilai;
  }

  function terjemahkanTeks() {
    const p = peta();
    if (!p) return 0;
    let jumlah = 0;

    const penyaring = function (simpul) {
      // Lewati isi skrip dan gaya, itu bukan teks yang dilihat pengguna.
      const induk = simpul.parentNode;
      if (!induk) return true;
      const nama = String(induk.nodeName || '').toUpperCase();
      return nama !== 'SCRIPT' && nama !== 'STYLE' && nama !== 'NOSCRIPT';
    };

    if (typeof document.createTreeWalker === 'function') {
      const jelajah = document.createTreeWalker(document.body, 4 /* SHOW_TEXT */, penyaring, false);
      let simpul = jelajah.nextNode();
      while (simpul) {
        if (terjemahkanSatuTeks(simpul, p)) jumlah++;
        simpul = jelajah.nextNode();
      }
    }

    // Atribut yang terbaca pengguna.
    const ATRIBUT = ['placeholder', 'title', 'aria-label'];
    const simpulAtrib = document.querySelectorAll('[' + ATRIBUT.join('],[') + ']');
    for (let i = 0; i < simpulAtrib.length; i++) {
      for (let j = 0; j < ATRIBUT.length; j++) {
        if (terjemahkanSatuAtrib(simpulAtrib[i], ATRIBUT[j], p)) jumlah++;
      }
    }

    return jumlah;
  }

  function terjemahkanJudul() {
    if (!document.title) return 0;
    if (!asalJudul.ada) {
      asalJudul.ada = true;
      asalJudul.teks = document.title;
    }
    document.title = terjemahkan(asalJudul.teks);
    return 1;
  }

  /**
   * Bagian halaman yang digambar ulang dari kode perlu digambar
   * ulang setelah ganti bahasa, supaya teks barunya ikut diterjemahkan.
   */
  function segarkanIsiDinamis() {
    if (window.Referral && typeof window.Referral.pasangPanel === 'function') {
      try {
        window.Referral.pasangPanel();
      } catch (e) {
        console.warn('[BAHASA] panel referral gagal digambar ulang', e);
      }
    }
    const aktif = document.querySelector('.page-content.active');
    if (!aktif) return;
    if (aktif.id === 'profile-page' && typeof window.updateProfileStats === 'function') {
      try {
        window.updateProfileStats();
      } catch (e) {
        console.warn('[BAHASA] statistik profil gagal diperbarui', e);
      }
    }
    if (aktif.id === 'transactions-page' && typeof window.renderRiwayat === 'function') {
      try {
        window.renderRiwayat();
      } catch (e) {
        console.warn('[BAHASA] riwayat gagal digambar ulang', e);
      }
    }
  }

  function terapkan() {
    segarkanIsiDinamis();
    terjemahkanJudul();
    return terjemahkanTeks();
  }

  /* ============================================================
     PENGAMAT PERUBAHAN
     Banyak bagian halaman digambar dari kode setelah halaman siap,
     misalnya daftar riwayat, panel promo, dan layar pembayaran.
     Pengamat ini menerjemahkan teks yang baru muncul itu, supaya
     tidak perlu memanggil penerjemahan manual di setiap tempat.
     Banyak perubahan digabung jadi satu kali jalan lewat penundaan
     pendek, supaya tidak berat.
     ============================================================ */

  let sedangMenerjemahkan = false;
  let penunda = null;

  function pengamatJalan() {
    if (sedangMenerjemahkan) return;
    if (penunda !== null) return;
    penunda = window.setTimeout(function () {
      penunda = null;
      sedangMenerjemahkan = true;
      try {
        terjemahkanTeks();
      } catch (e) {
        console.warn('[BAHASA] penerjemahan otomatis gagal', e);
      }
      sedangMenerjemahkan = false;
    }, 80);
  }

  function pasangPengamat() {
    if (window.__bahasaPengamat) return;
    if (typeof MutationObserver !== 'function' || !document.body) return;
    try {
      const pengamat = new MutationObserver(pengamatJalan);
      pengamat.observe(document.body, { childList: true, subtree: true, characterData: true });
      window.__bahasaPengamat = pengamat;
    } catch (e) {
      console.warn('[BAHASA] pengamat perubahan tidak aktif', e);
    }
  }

  /* ============================================================
     PESAN TOAST
     Pembungkus ini mencari kalimat di kamus saat toast dipanggil,
     jadi ganti bahasa tidak perlu memasang ulang pembungkus.
     ============================================================ */

  function bungkusToast() {
    if (window.__bahasaToastBungkus) return;
    const showToast = window.showToast;
    const showErrorToast = window.showErrorToast;
    if (typeof showToast === 'function') {
      window.showToast = function (judul, pesan) {
        return showToast.call(this, terjemahkan(judul), terjemahkan(pesan));
      };
    }
    if (typeof showErrorToast === 'function') {
      window.showErrorToast = function (judul, pesan) {
        return showErrorToast.call(this, terjemahkan(judul), terjemahkan(pesan));
      };
    }
    window.__bahasaToastBungkus = true;
  }

  /* ============================================================
     PEMILIH BAHASA
     Kotak dibuat dari kode lalu disisipkan sebelum tombol mode
     gelap, jadi halaman tidak perlu tambahan tag baru.
     ============================================================ */

  function gambarPemilih() {
    let kotak = document.getElementById('language-switch');
    if (!kotak) {
      kotak = document.createElement('div');
      kotak.id = 'language-switch';
      kotak.className = 'bahasa-pilih';
      kotak.setAttribute('role', 'group');
      kotak.setAttribute('aria-label', 'Pilihan bahasa');
      for (let i = 0; i < PILIHAN.length; i++) {
        const tombol = document.createElement('button');
        tombol.type = 'button';
        tombol.className = 'bahasa-tombol';
        tombol.setAttribute('data-lang', PILIHAN[i].kode);
        tombol.title = PILIHAN[i].nama;
        tombol.textContent = PILIHAN[i].label;
        kotak.appendChild(tombol);
      }

      const gelap = document.getElementById('dark-mode-btn');
      if (gelap && gelap.parentNode) gelap.parentNode.insertBefore(kotak, gelap);
      else document.body.appendChild(kotak);

      kotak.addEventListener('click', function (kejadian) {
        const tombol = kejadian.target.closest ? kejadian.target.closest('.bahasa-tombol') : null;
        if (!tombol) return;
        kejadian.preventDefault();
        ganti(tombol.getAttribute('data-lang'));
      });
    }
    return kotak;
  }

  function segarkanPemilih() {
    const kotak = gambarPemilih();
    const kode = ambil();
    const tombol = kotak.querySelectorAll('.bahasa-tombol');
    for (let i = 0; i < tombol.length; i++) {
      const milik = tombol[i].getAttribute('data-lang');
      if (milik === kode) tombol[i].classList.add('aktif');
      else tombol[i].classList.remove('aktif');
      tombol[i].setAttribute('aria-pressed', milik === kode ? 'true' : 'false');
    }
  }

  /* ============================================================
     GANTI BAHASA
     ============================================================ */

  // Pesan singkat setelah bahasa diganti. Kuncinya ditulis langsung
  // per bahasa, karena dua-duanya adalah kalimat utuh, bukan terjemahan
  // dari satu kalimat yang sama.
  const PESAN_GANTI = {
    id: 'Bahasa diubah ke Indonesia',
    en: 'Language switched to English',
  };

  function ganti(kode) {
    const dipakai = simpan(kode);
    segarkanPemilih();
    terapkan();
    if (window.showToast) {
      window.showToast(terjemahkan('Bahasa'), PESAN_GANTI[dipakai] || PESAN_GANTI.id);
    }
    return dipakai;
  }

  /* ============================================================
     PASANG
     ============================================================ */

  function pasang() {
    bungkusToast();
    segarkanPemilih();
    terapkan();
    pasangPengamat();
  }

  // Dipakai berkas lain untuk menerjemahkan kalimat yang dibangun dari
  // kode, misalnya panel referral dan judul kolom ekspor.
  window.t = terjemahkan;

  window.Bahasa = {
    ambil: ambil,
    simpan: simpan,
    adaKode: adaKode,
    terjemahkan: terjemahkan,
    terjemahkanHalaman: terjemahkanTeks,
    terapkan: terapkan,
    ganti: ganti,
    pasang: pasang,
    PILIHAN: PILIHAN,
    KAMUS: KAMUS,
    KUNCI: KUNCI,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pasang);
  } else {
    pasang();
  }
})();