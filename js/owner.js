(function(){
  // Ensure owner panel data exists
  window.initializeOwnerData = function(){
    const key = window.STORAGE_KEYS.OWNER_PANEL;
    if(!localStorage.getItem(key)){
      const seed = { bannerUtama: [], gamePopuler: { semuaTampil: true, tampil: [], paket: {} }, posts: [], settings: {}, stats: {} };
      localStorage.setItem(key, JSON.stringify(seed));
    }
  };

  window.getOwnerData = function(){
    return JSON.parse(localStorage.getItem(window.STORAGE_KEYS.OWNER_PANEL) || '{}');
  };

  /* ------------------------------------------------------------
     TARIK ISI KONTEN DARI SERVER
     ------------------------------------------------------------
     Dulu Owner Panel hanya bisa mendorong isi ke server, tidak
     pernah menarik. Kalau data lokal hilang - browser dibersihkan,
     ganti perangkat, atau pengumuman terhapus di panel - panel
     tampil kosong sementara server masih menyimpan isinya.

     Keadaan itu berbahaya, bukan cuma cosmetic. Seluruh konten owner
     disimpan sebagai satu baris di Airtable dan tiap simpanan
     menimpanya utuh. Jadi begitu owner menambah satu pengumuman di
     panel yang tampil kosong, payload-nya berisi satu item, lolos
     dari pengaman payload kosong, dan semua isi lain yang ada di
     server terhapus tanpa pesan.

     Fungsi di bawah menutup celah itu: kalau data lokal kosong dan
     server masih punya isi, isi server itulah yang dipakai sebagai
     isi lokal. Data lokal yang sudah ada tidak pernah ditimpa, jadi
     ini bukan penyinkronan dua arah yang bisa menimpa pekerjaan
     owner. */
  function relayAlamat(){
    const cfg = window.GHOTHYS_NOTIFY_CONFIG || {};
    const url = String(cfg.relayUrl || '').replace(/\/+$/, '');
    return /^https:\/\//.test(url) ? url : '';
  }

  /* Kosong berarti panel belum pernah diisi owner di browser ini.
     Yang dihitung hanya isi yang benar-benar dipakai pengunjung:
     gambar banner yang dipasang dan game yang dipilih. */
  function isiLokalKosong(){
    const data = window.getOwnerData() || {};
    const banner = Array.isArray(data.bannerUtama) ? data.bannerUtama : [];
    const game = data.gamePopuler || {};
    const adaBanner = banner.some(s => String((s && s.url) || '').trim() !== '');
    const adaTampil = Array.isArray(game.tampil) ? game.tampil.length : 0;
    const adaPaket  = Object.keys(game.paket || {}).length;
    return !adaBanner && !adaTampil && !adaPaket;
  }

  window.sinkronkanKontenOwner = function(){
    const alamat = relayAlamat();
    if(!alamat) return Promise.resolve(null);
    /* Sudah ada isi lokal: tidak ada yang perlu diambil, dan isi
       owner tidak boleh ditimpa. */
    if(!isiLokalKosong()) return Promise.resolve(null);

    return fetch(alamat + '/content', { headers: { 'Accept': 'application/json' } })
      .then(function(res){ return res.ok ? res.json() : null; })
      .then(function(body){
        const isi = (body && body.ok !== false) ? body.content : null;
        if(!isi) return null;

        /* Yang dipakai pengunjung cuma banner utama dan daftar game,
           jadi hanya dua itu yang diambil dari server. */
        const ada = (Array.isArray(isi.bannerUtama) && isi.bannerUtama.length > 0)
                 || (isi.gamePopuler && typeof isi.gamePopuler === 'object'
                     && Object.keys(isi.gamePopuler).length > 0);
        if(!ada) return null;

        /* Bentuk datanya sama persis dengan bentuk yang dipakai
           panel owner, jadi apa adanya yang dipakai. posts,
           stats, dan bidang lain milik lokal tetap utuh. */
        const data = window.getOwnerData() || {};
        data.bannerUtama = Array.isArray(isi.bannerUtama) ? isi.bannerUtama : [];
        if(isi.gamePopuler && typeof isi.gamePopuler === 'object'){
          data.gamePopuler = isi.gamePopuler;
        }

        localStorage.setItem(window.STORAGE_KEYS.OWNER_PANEL, JSON.stringify(data));
        return data;
      })
      .catch(function(){ return null; });
  };

  window.openOwnerPanel = function(){
    if(!requireLoggedIn()) return;
    const modal = document.getElementById('owner-panel-modal');
    if(modal){ modal.style.display='block'; document.body.style.overflow='hidden'; }

    /* Panel digambar lagi setelah pengambilan isi selesai, supaya
       owner tidak sempat melihat panel kosong lalu menekan simpan.
       Kalau isinya sudah ada, tidak ada pengambilan sama sekali. */
    if(isiLokalKosong() && typeof window.sinkronkanKontenOwner === 'function'){
      window.sinkronkanKontenOwner().then(function(){
        if(typeof window.renderOwnerDashboard === 'function') window.renderOwnerDashboard();
        if(typeof window.renderBannerUtama === 'function') window.renderBannerUtama();
        if(typeof window.renderGamePopuler === 'function') window.renderGamePopuler();
      });
    }
    if(typeof window.renderOwnerDashboard === 'function') window.renderOwnerDashboard();
  };

  window.closeOwnerPanel = function(){
    const modal = document.getElementById('owner-panel-modal');
    if(modal){ modal.style.display='none'; document.body.style.overflow='auto'; }
  };

  /* ============================================================
     RINGKASAN PANEL
     ============================================================ */
  window.renderOwnerDashboard = function(){
    const data = window.getOwnerData();
    const anggota = (typeof window.getAllUsers === 'function') ? window.getAllUsers().length : 0;
    const banner = Array.isArray(data.bannerUtama) ? data.bannerUtama : [];
    const terisi = banner.filter(s => String((s && s.url) || '').trim() !== '').length;
    const konfigurasi = data.gamePopuler || {};
    const dipilih = Array.isArray(konfigurasi.tampil) ? konfigurasi.tampil.length : 0;
    const totalKatalog = Array.isArray(window.gamesData) ? window.gamesData.length : 0;

    const setText = (id, teks) => { const el = document.getElementById(id); if (el) el.textContent = teks; };
    setText('owner-total-members', anggota);
    setText('owner-total-banner', terisi + ' / ' + JUMLAH_SLIDE);
    setText('owner-total-game', dipilih + ' / ' + totalKatalog);
  };

  /* ============================================================
     PENYIMPANAN
     ============================================================ */
  function saveOwnerData(data){
    localStorage.setItem(window.STORAGE_KEYS.OWNER_PANEL, JSON.stringify(data));
    /* Best-effort: kirim ke relay kalau sudah login admin. Gagal di
       sini tidak pernah menggagalkan penyimpanan lokal. */
    if(window.syncOwnerContent) window.syncOwnerContent(data);
    if(typeof window.renderOwnerDashboard === 'function') window.renderOwnerDashboard();
  }

  function escapeTeks(s){
    if(s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function(c){
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
    });
  }

  /* Selalu dipanggil lewat window, supaya this di dalam fungsi asal
     tidak hilang. */
  function tampilkanPesan(pesan, galat){
    if(galat){
      if(typeof window.showErrorToast === 'function') window.showErrorToast(pesan);
      return;
    }
    if(typeof window.showToast === 'function') window.showToast(pesan);
  }

  /* ============================================================
     BANNER UTAMA - tiga gambar beranda
     ============================================================ */
  const JUMLAH_SLIDE = 3;

  function bannerOwner(){
    const data = window.getOwnerData();
    const list = Array.isArray(data.bannerUtama) ? data.bannerUtama : [];
    const hasil = [];
    for(let i = 0; i < JUMLAH_SLIDE; i++) hasil.push(list[i] || {});
    return hasil;
  }

  window.openBannerUtamaManager = function(){
    if(!requireLoggedIn()) return;
    const section = document.getElementById('owner-banner-utama-section');
    if(section) section.style.display = 'block';
    window.renderBannerUtama();
  };

  window.closeBannerUtamaManager = function(){
    const section = document.getElementById('owner-banner-utama-section');
    if(section) section.style.display = 'none';
  };

  window.renderBannerUtama = function(){
    const list = bannerOwner();
    for(let i = 0; i < JUMLAH_SLIDE; i++){
      const nomor = i + 1;
      const slot = list[i];
      const inUrl = document.getElementById('owner-banner-' + nomor + '-url');
      const inAlt = document.getElementById('owner-banner-' + nomor + '-alt');
      const img   = document.getElementById('owner-banner-' + nomor + '-pratinjau');
      if(inUrl) inUrl.value = String(slot.url || '');
      if(inAlt) inAlt.value = String(slot.alt || '');
      if(img) img.setAttribute('src', String(slot.url || '').trim());
    }
  };

  window.simpanBannerUtama = function(){
    if(!requireLoggedIn()) return;
    const data = window.getOwnerData();
    const isi = [];
    for(let i = 0; i < JUMLAH_SLIDE; i++){
      const nomor = i + 1;
      const inUrl = document.getElementById('owner-banner-' + nomor + '-url');
      const inAlt = document.getElementById('owner-banner-' + nomor + '-alt');
      isi.push({
        slot: nomor,
        url: inUrl ? String(inUrl.value || '').trim() : '',
        alt: inAlt ? String(inAlt.value || '').trim() : ''
      });
    }
    data.bannerUtama = isi;
    saveOwnerData(data);
    tampilkanPesan('Banner tersimpan', false);
  };

  window.kembalikanBannerBawaan = function(){
    if(!requireLoggedIn()) return;
    if(!confirm('Kembalikan tiga banner ke gambar bawaan di beranda?')) return;
    const data = window.getOwnerData();
    data.bannerUtama = [];
    saveOwnerData(data);
    window.renderBannerUtama();
  };

  /* ============================================================
     GAME POPULER - pilih game, edit paket dan harga
     ============================================================ */

  /* Bentuk data yang disimpan owner:
       semuaTampil : belum ada berarti semua game tampil (bawaan).
                    false berarti hanya isi "tampil" yang dipakai.
       tampil      : daftar kunci game yang tampil, urut = urutan
                    di beranda.
       paket       : kunci game -> daftar paket hasil editan owner.
     Paket yang tidak ada di "paket" memakai paket bawaan katalog. */
  function gamePopulerOwner(){
    const data = window.getOwnerData();
    const konfigurasi = data.gamePopuler || {};
    return {
      semuaTampil: konfigurasi.semuaTampil !== false,
      tampil: Array.isArray(konfigurasi.tampil) ? konfigurasi.tampil.slice() : [],
      paket: (konfigurasi.paket && typeof konfigurasi.paket === 'object') ? konfigurasi.paket : {}
    };
  }

  function katalog(){
    return Array.isArray(window.gamesData) ? window.gamesData : [];
  }

  function cariGame(kunci){
    return katalog().filter(g => String(g.searchKey) === String(kunci))[0] || null;
  }

  /* Urutan di panel mengikuti urutan tampil yang tersimpan, game yang
     tidak dipilih menyusul di bawah supaya owner tidak perlu menggulir. */
  function urutanPanel(konfigurasi){
    const semua = katalog();
    if(konfigurasi.semuaTampil) return semua.slice();
    const sudah = {};
    const depan = [];
    konfigurasi.tampil.forEach(function(kunci){
      const k = String(kunci);
      if(sudah[k]) return;
      sudah[k] = true;
      const g = cariGame(k);
      if(g) depan.push(g);
    });
    return depan.concat(semua.filter(g => !sudah[String(g.searchKey)]));
  }

  window.openGamePopulerManager = function(){
    if(!requireLoggedIn()) return;
    const section = document.getElementById('owner-game-populer-section');
    if(section) section.style.display = 'block';
    window.renderGamePopuler();
    window.renderRiwayatHarga();
  };

  window.closeGamePopulerManager = function(){
    const section = document.getElementById('owner-game-populer-section');
    if(section) section.style.display = 'none';
  };

  function kolomPaket(peran, nomor, nilai, tipe){
    return '<td class="p-1"><input data-peran="' + peran + '" data-no="' + nomor + '" '
      + 'type="' + tipe + '" '
      + 'min="0" step="1" value="' + escapeTeks(nilai) + '" '
      + 'class="w-full p-1 rounded text-xs" '
      + 'style="background:var(--bg-card);color:var(--text-primary);" /></td>';
  }

  function kolomStock(nomor, nilai){
    return '<td class="p-1"><input data-peran="stock" data-no="' + nomor + '" '
      + 'type="number" min="-1" step="1" value="' + escapeTeks(nilai) + '" '
      + 'class="w-full p-1 rounded text-xs" '
      + 'style="background:var(--bg-card);color:var(--text-primary);" title="-1 = unlimited" /></td>';
  }

  function tombolHapusPaket(){
    return '<td class="p-1 text-center">'
      + '<button type="button" class="owner-paket-hapus px-2 py-1 rounded text-xs text-white" '
      + 'style="background:#b91c1c;" title="Hapus baris paket ini">hapus</button></td>';
  }

  function barisPaketKosong(){
    return '<tr>' + kolomPaket('nama', 0, '', 'text') + kolomPaket('detail', 0, '', 'text')
      + kolomPaket('harga', 0, 0, 'number') + kolomPaket('points', 0, 0, 'number')
      + kolomPaket('discount', 0, 0, 'number') + kolomStock(0, -1) + tombolHapusPaket() + '</tr>';
  }

  function barisPaketIsi(p, nomor){
    return '<tr>' + kolomPaket('nama', nomor, p.name, 'text')
      + kolomPaket('detail', nomor, p.detail, 'text')
      + kolomPaket('harga', nomor, p.price, 'number')
      + kolomPaket('points', nomor, p.points, 'number')
      + kolomPaket('discount', nomor, p.discount, 'number')
      + kolomStock(nomor, (typeof p.stock === 'number' ? p.stock : -1))
      + tombolHapusPaket() + '</tr>';
  }

  window.renderGamePopuler = function(){
    const wadah = document.getElementById('owner-game-list');
    if(!wadah) return;
    const konfigurasi = gamePopulerOwner();
    const urutan = urutanPanel(konfigurasi);
    if(!urutan.length){
      wadah.innerHTML = '<p class="text-sm" style="color:var(--text-secondary);">'
        + 'Katalog game belum termuat. Muat ulang halaman lalu buka bagian ini lagi.</p>';
      return;
    }
    const tampil = {};
    if(konfigurasi.semuaTampil){
      urutan.forEach(function(g){ tampil[String(g.searchKey)] = true; });
    } else {
      konfigurasi.tampil.forEach(function(k){ tampil[String(k)] = true; });
    }

    wadah.innerHTML = urutan.map(function(g){
      const kunci = String(g.searchKey);
      const dicentang = !!tampil[kunci];
      const bawaan = Array.isArray(g.packages) ? g.packages : [];
      const milik = konfigurasi.paket[kunci];
      const diubah = Array.isArray(milik) && milik.length > 0;
      const paket = diubah ? milik : bawaan;
      const estimasiBawaan = g.estimasi || '5-15 menit';
      const estimasiOwner = (konfigurasi.estimasi && konfigurasi.estimasi[kunci]) || '';
      const estimasiTampil = estimasiOwner || estimasiBawaan;

      const baris = paket.map(barisPaketIsi).join('');

      return ''
        + '<div class="rounded border" style="border-color:var(--border-color);min-width:0;" data-game-key="' + escapeTeks(kunci) + '">'
        + '  <div class="flex items-center gap-2 p-2 flex-wrap">'
        + '    <label class="flex items-center gap-2 flex-1 cursor-pointer" style="min-width:180px;">'
        + '      <input type="checkbox" class="owner-game-centang" ' + (dicentang ? 'checked' : '') + ' />'
        + '      <span class="font-semibold text-sm">' + escapeTeks(g.name) + '</span>'
        + '      <span class="text-xs" style="color:var(--text-secondary);">' + escapeTeks(kunci) + '</span>'
        + '    </label>'
        + '    <span class="text-xs" style="color:var(--text-secondary);">' + (diubah ? 'paket hasil editan owner' : 'paket bawaan') + '</span>'
        + '    <label class="flex items-center gap-1 text-xs" style="color:var(--text-secondary);">'
        + '      Estimasi: <input type="text" class="owner-game-estimasi px-1 py-0.5 rounded text-xs" style="background:var(--bg-card);color:var(--text-primary);width:100px;" value="' + escapeTeks(estimasiTampil) + '" data-bawaan="' + escapeTeks(estimasiBawaan) + '" />'
        + '    </label>'
        + '    <button type="button" class="owner-game-simpan px-3 py-1 rounded text-xs text-white" style="background:#4f46e5;">Simpan</button>'
        + '    <button type="button" class="owner-game-kembalikan px-3 py-1 rounded text-xs" style="background:var(--bg-card);color:var(--text-primary);">Kembalikan</button>'
        + '  </div>'
        + '  <div class="owner-game-detail px-2 pb-2" style="display:' + (dicentang ? 'block' : 'none') + '">'
        + '    <p class="text-xs mb-1" style="color:var(--text-secondary);">'
        + '      Harga ditulis angka saja, tanpa tanda rupiah dan tanpa titik. Bawaan '
        + Math.max(0, bawaan.length) + ' paket, sedang dipakai ' + paket.length + ' paket.'
        + '    </p>'
        + '    <div class="overflow-auto" style="max-height:28rem;"><table class="w-full text-xs">'
        + '      <thead><tr style="color:var(--text-secondary);">'
        + '        <th class="p-1 text-left">Nama paket</th>'
        + '        <th class="p-1 text-left">Keterangan</th>'
        + '        <th class="p-1 text-left">Harga</th>'
        + '        <th class="p-1 text-left">Jumlah diamond</th>'
        + '        <th class="p-1 text-left">Diskon persen</th>'
        + '        <th class="p-1 text-left">Stok</th>'
        + '        <th class="p-1"></th>'
        + '      </tr></thead>'
        + '      <tbody>' + baris + '</tbody>'
        + '    </table></div>'
        + '    <button type="button" class="owner-paket-tambah mt-2 px-3 py-1 rounded text-xs text-white" style="background:#16a34a;">Tambah paket</button>'
        + '  </div>'
        + '</div>';
    }).join('');
  };

  /* Baca baris paket yang sedang diedit di layar. Baris tanpa nama
     dilewati, karena paket tanpa nama tidak bisa dijual. */
  function kumpulkanPaket(baris){
    const hasil = [];
    baris.querySelectorAll('tbody tr').forEach(function(tr){
      const ambil = function(peran){
        const kolom = tr.querySelector('input[data-peran="' + peran + '"]');
        return kolom ? String(kolom.value || '').trim() : '';
      };
      const nama = ambil('nama');
      if(!nama) return;
      const harga  = parseInt(ambil('harga').replace(/\D/g, ''), 10);
      const poin   = parseInt(ambil('points').replace(/\D/g, ''), 10);
      const diskon = parseInt(ambil('discount').replace(/\D/g, ''), 10);
      const stok   = parseInt(ambil('stock').replace(/\D/g, ''), 10);
      hasil.push({
        name: nama,
        detail: ambil('detail'),
        price: isFinite(harga) ? harga : 0,
        points: isFinite(poin) ? poin : 0,
        discount: isFinite(diskon) ? diskon : 0,
        stock: isFinite(stok) ? stok : -1
      });
    });
    return hasil;
  }

  window.simpanPaketGame = function(kunci, baris){
    if(!requireLoggedIn()) return;
    if(!baris) return;
    const paket = kumpulkanPaket(baris);
    if(!paket.length){
      tampilkanPesan('Belum ada paket yang bisa disimpan', true);
      return;
    }
    /* Peringatan harga. Angka yang salah ketik langsung terlihat
       pembeli, jadi perubahan daftar paket dicek dulu. */
    const g = cariGame(kunci);
    const namaGame = g ? g.name : String(kunci);
    const bawaan = (g && Array.isArray(g.packages)) ? g.packages : [];
    const namaBawaan = {};
    bawaan.forEach(function(p){ namaBawaan[String(p.name)] = true; });
    const hilang = bawaan.filter(function(p){
      return !paket.some(function(x){ return String(x.name) === String(p.name); });
    });
    const baru = paket.filter(function(p){ return !namaBawaan[String(p.name)]; });
    if(hilang.length || baru.length){
      const rincian = [];
      hilang.forEach(function(p){ rincian.push('hilang: ' + p.name); });
      baru.forEach(function(p){ rincian.push('baru: ' + p.name); });
      const pesan = 'Daftar paket ' + namaGame + ' berubah.\n'
        + rincian.join('\n') + '\n\n'
        + 'Harga ikut tersimpan dan langsung dilihat pembeli. Lanjutkan?';
      if(!confirm(pesan)) return;
    }
    /* Baca estimasi dari input di header game */
    const inpEst = baris.querySelector('.owner-game-estimasi');
    const estimasiBaru = inpEst ? inpEst.value.trim() : '';
    const data = window.getOwnerData();
    data.gamePopuler = data.gamePopuler || {};
    data.gamePopuler.paket = data.gamePopuler.paket || {};
    data.gamePopuler.estimasi = data.gamePopuler.estimasi || {};
    const kunciSimpan = String(kunci);
    const tersimpanSebelum = data.gamePopuler.paket[kunciSimpan];
    const adaSebelum = Array.isArray(tersimpanSebelum) && tersimpanSebelum.length > 0;
    const sebelum = adaSebelum ? salinPaket(tersimpanSebelum) : salinPaket(bawaan);
    const berubah = window.ringkasPerubahanPaket(sebelum, paket);
    if(berubah.length){
      catatRiwayatHarga(data, {
        waktu: new Date().toISOString(),
        kunci: kunciSimpan,
        nama: namaGame,
        aksi: 'simpan',
        pulihKeAda: adaSebelum,
        pulihKePaket: sebelum,
        berubah: berubah
      });
    }
    data.gamePopuler.paket[kunciSimpan] = paket;
    if(estimasiBaru) data.gamePopuler.estimasi[kunciSimpan] = estimasiBaru;
    else delete data.gamePopuler.estimasi[kunciSimpan];
    saveOwnerData(data);
    window.renderGamePopuler();
    window.renderRiwayatHarga();
    tampilkanPesan(namaGame + ' tersimpan', false);
  };

  window.kembalikanGameBawaan = function(kunci){
    if(!requireLoggedIn()) return;
    if(!confirm('Kembalikan paket game ini ke bawaan katalog?')) return;
    const data = window.getOwnerData();
    const kunciKembali = String(kunci);
    const tersimpan = (data.gamePopuler && data.gamePopuler.paket)
      ? data.gamePopuler.paket[kunciKembali] : null;
    if(Array.isArray(tersimpan) && tersimpan.length > 0){
      const g = cariGame(kunci);
      const bawaan = (g && Array.isArray(g.packages)) ? g.packages : [];
      catatRiwayatHarga(data, {
        waktu: new Date().toISOString(),
        kunci: kunciKembali,
        nama: g ? g.name : kunciKembali,
        aksi: 'kembalikan',
        pulihKeAda: true,
        pulihKePaket: salinPaket(tersimpan),
        berubah: window.ringkasPerubahanPaket(salinPaket(tersimpan), salinPaket(bawaan))
      });
    }
    if(data.gamePopuler && data.gamePopuler.paket){
      delete data.gamePopuler.paket[kunciKembali];
    }
    saveOwnerData(data);
    window.renderGamePopuler();
    window.renderRiwayatHarga();
  };

  window.tambahPaketGame = function(baris){
    if(!requireLoggedIn()) return;
    const tbody = baris ? baris.querySelector('tbody') : null;
    if(!tbody) return;
    tbody.insertAdjacentHTML('beforeend', barisPaketKosong());
  };

  window.hapusPaketGame = function(tombol){
    if(!requireLoggedIn()) return;
    if(!confirm('Hapus baris paket ini dari daftar?')) return;
    const tr = tombol ? tombol.closest('tr') : null;
    if(tr && tr.parentNode) tr.parentNode.removeChild(tr);
  };

  /* Perubahan centang langsung tersimpan, jadi owner tidak perlu
     menekan Simpan hanya untuk menyetel game mana yang tampil. */
  function pasangPanelGame(){
    const wadah = document.getElementById('owner-game-list');
    if(!wadah || wadah.dataset.terpasang === '1') return;
    wadah.dataset.terpasang = '1';

    wadah.addEventListener('change', function(ev){
      const centang = ev.target.closest('.owner-game-centang');
      if(!centang) return;
      const baris = centang.closest('[data-game-key]');
      if(!baris) return;
      const kunci = String(baris.dataset.gameKey);
      const detail = baris.querySelector('.owner-game-detail');
      if(detail) detail.style.display = centang.checked ? 'block' : 'none';

      const konfigurasi = gamePopulerOwner();
      const set = {};
      konfigurasi.tampil.forEach(function(k){ set[String(k)] = true; });
      if(centang.checked) set[kunci] = true; else delete set[kunci];

      /* Urutan tampil mengikuti urutan daftar di panel, supaya urutan
         di beranda sama dengan yang dilihat owner. */
      const urutan = urutanPanel(konfigurasi).map(function(g){ return String(g.searchKey); });
      const tampil = urutan.filter(function(k){ return !!set[k]; });
      /* Game yang tidak ada di katalog ikut dipertahankan. */
      konfigurasi.tampil.forEach(function(k){
        if(urutan.indexOf(String(k)) < 0 && set[String(k)]) tampil.push(String(k));
      });

      const data = window.getOwnerData();
      data.gamePopuler = data.gamePopuler || {};
      data.gamePopuler.semuaTampil = false;
      data.gamePopuler.tampil = tampil;
      saveOwnerData(data);
    });

    wadah.addEventListener('click', function(ev){
      const tombol = ev.target.closest('button');
      if(!tombol) return;
      const baris = tombol.closest('[data-game-key]');
      if(!baris) return;
      if(tombol.classList.contains('owner-game-simpan')){
        window.simpanPaketGame(baris.dataset.gameKey, baris);
      } else if(tombol.classList.contains('owner-game-kembalikan')){
        window.kembalikanGameBawaan(baris.dataset.gameKey);
      } else if(tombol.classList.contains('owner-paket-tambah')){
        window.tambahPaketGame(baris);
      } else if(tombol.classList.contains('owner-paket-hapus')){
        window.hapusPaketGame(tombol);
      }
    });
  }

  window.setSemuaGame = function(tampilkanSemua){
    if(!requireLoggedIn()) return;
    const data = window.getOwnerData();
    data.gamePopuler = data.gamePopuler || {};
    if(tampilkanSemua){
      data.gamePopuler.semuaTampil = true;
      data.gamePopuler.tampil = [];
    } else {
      if(!confirm('Menyembunyikan semua game akan membuat katalog kosong untuk pembeli. Lanjutkan?')) return;
      data.gamePopuler.semuaTampil = false;
      data.gamePopuler.tampil = [];
    }
    saveOwnerData(data);
    window.renderGamePopuler();
  };

  /* ============================================================
     CATATAN PERUBAHAN HARGA
     ------------------------------------------------------------
     Setiap kali daftar paket satu game disimpan (atau dikembalikan
     ke bawaan), keadaan sebelumnya dicatat. Owner bisa melihat
     harga lama lalu harga baru, dan memulihkannya kalau salah
     ketik. Catatan hidup di browser ini saja, tidak ikut ke server.
     ============================================================ */
  const BATAS_RIWAYAT_HARGA = 15;

  function salinPaket(list){
    return (Array.isArray(list) ? list : []).map(function(p){
      return { name: p.name, detail: p.detail, price: p.price, points: p.points, discount: p.discount };
    });
  }

  window.riwayatHargaOwner = function(){
    const data = window.getOwnerData();
    const r = data.gamePopuler && data.gamePopuler.riwayatHarga;
    return Array.isArray(r) ? r : [];
  };

  /* Bandingkan dua daftar paket, kembalikan baris yang berubah,
     ditambah, atau dihapus. Dipakai untuk catatan dan tampilan. */
  window.ringkasPerubahanPaket = function(sebelum, sesudah){
    const a = Array.isArray(sebelum) ? sebelum : [];
    const b = Array.isArray(sesudah) ? sesudah : [];
    const petaA = {};
    const petaB = {};
    a.forEach(function(p){ petaA[String(p.name)] = p; });
    b.forEach(function(p){ petaB[String(p.name)] = p; });
    const hasil = [];
    a.forEach(function(p){
      const n = String(p.name);
      const s = petaB[n];
      if(!s){
        hasil.push({ nama: n, lama: salinPaket([p])[0], baru: null });
        return;
      }
      if(String(p.price) !== String(s.price)
        || String(p.points) !== String(s.points)
        || String(p.discount) !== String(s.discount)){
        hasil.push({ nama: n, lama: salinPaket([p])[0], baru: salinPaket([s])[0] });
      }
    });
    b.forEach(function(p){
      const n = String(p.name);
      if(!petaA[n]) hasil.push({ nama: n, lama: null, baru: salinPaket([p])[0] });
    });
    return hasil;
  };

  function catatRiwayatHarga(data, catatan){
    data.gamePopuler = data.gamePopuler || {};
    const lama = Array.isArray(data.gamePopuler.riwayatHarga) ? data.gamePopuler.riwayatHarga : [];
    lama.unshift(catatan);
    data.gamePopuler.riwayatHarga = lama.slice(0, BATAS_RIWAYAT_HARGA);
  }

  function waktuRingkas(iso){
    const d = new Date(iso);
    if(isNaN(d.getTime())) return String(iso == null ? '' : iso);
    try {
      return d.toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch(e){
      return d.toISOString();
    }
  }

  function rupiahRingkas(n){
    const angka = Number(n);
    if(!isFinite(angka)) return '-';
    return 'Rp ' + angka.toLocaleString('id-ID');
  }

  window.renderRiwayatHarga = function(){
    const wadah = document.getElementById('owner-riwayat-harga');
    if(!wadah) return;
    const riwayat = window.riwayatHargaOwner();
    if(!riwayat.length){
      wadah.innerHTML = '<p class="text-xs" style="color:var(--text-secondary);">Belum ada catatan perubahan harga.</p>';
      return;
    }
    wadah.innerHTML = riwayat.map(function(c, i){
      const berubah = Array.isArray(c.berubah) ? c.berubah : [];
      const rincian = berubah.slice(0, 5).map(function(b){
        const lama = b.lama ? rupiahRingkas(b.lama.price) : 'belum ada';
        const baru = b.baru ? rupiahRingkas(b.baru.price) : 'dihapus';
        return escapeTeks(b.nama) + ': ' + lama + ' → ' + baru;
      }).join(' · ');
      const sisa = berubah.length > 5 ? ' · +' + (berubah.length - 5) + ' lagi' : '';
      const judul = c.aksi === 'kembalikan' ? 'dikembalikan ke bawaan' : 'disimpan';
      return ''
        + '<div class="rounded p-2 mb-1 flex items-start justify-between gap-2" style="background:var(--bg-card);">'
        + '  <div style="min-width:0;">'
        + '    <div class="text-xs font-semibold">' + escapeTeks(c.nama) + ' — ' + judul + '</div>'
        + '    <div class="text-xs" style="color:var(--text-secondary);">' + escapeTeks(waktuRingkas(c.waktu)) + '</div>'
        + '    <div class="text-xs" style="color:var(--text-secondary);">'
        + (rincian ? rincian + sisa : 'tanpa perubahan angka') + '</div>'
        + '  </div>'
        + '  <button type="button" class="owner-riwayat-pulihkan px-2 py-1 rounded text-xs text-white"'
        + ' style="background:#4f46e5;" data-pulihkan="' + i + '">Pulihkan</button>'
        + '</div>';
    }).join('');
  };

  window.pulihkanRiwayatHarga = function(indeks){
    if(!requireLoggedIn()) return;
    const catatan = window.riwayatHargaOwner()[Number(indeks)];
    if(!catatan) return;
    if(!confirm('Pulihkan paket ' + catatan.nama + ' ke keadaan sebelum '
      + waktuRingkas(catatan.waktu) + '?')) return;
    const data = window.getOwnerData();
    data.gamePopuler = data.gamePopuler || {};
    data.gamePopuler.paket = data.gamePopuler.paket || {};
    const kunci = String(catatan.kunci);
    if(catatan.pulihKeAda){
      data.gamePopuler.paket[kunci] = catatan.pulihKePaket;
    } else {
      delete data.gamePopuler.paket[kunci];
    }
    saveOwnerData(data);
    window.renderGamePopuler();
    window.renderRiwayatHarga();
    tampilkanPesan(catatan.nama + ' dipulihkan', false);
  };

  window.bersihkanRiwayatHarga = function(){
    if(!requireLoggedIn()) return;
    if(!window.riwayatHargaOwner().length) return;
    if(!confirm('Hapus seluruh catatan perubahan harga? Paket tidak dihapus, hanya catatannya.')) return;
    const data = window.getOwnerData();
    if(data.gamePopuler) data.gamePopuler.riwayatHarga = [];
    saveOwnerData(data);
    window.renderRiwayatHarga();
    tampilkanPesan('Catatan perubahan harga dihapus', false);
  };

  /* ============================================================
     CADANGAN & PULIHKAN KONTEN
     ------------------------------------------------------------
     Menyimpan banner dan pengaturan game ke satu berkas JSON di
     komputer owner, lalu bisa dimuat kembali. Berguna sebelum
     mengubah banyak harga atau saat pindah perangkat. Berkas
     ditandai aplikasi dan format supaya berkas asing ditolak.
     ============================================================ */
  const FORMAT_CADANGAN = 1;

  window.bangunCadanganKonten = function(){
    const data = window.getOwnerData();
    const gp = data.gamePopuler || {};
    const isi = {
      aplikasi: 'ghothys-store',
      format: FORMAT_CADANGAN,
      waktu: new Date().toISOString(),
      bannerUtama: Array.isArray(data.bannerUtama) ? data.bannerUtama : [],
      gamePopuler: {
        semuaTampil: !!gp.semuaTampil,
        tampil: Array.isArray(gp.tampil) ? gp.tampil : [],
        paket: (gp.paket && typeof gp.paket === 'object') ? gp.paket : {}
      }
    };
    return JSON.stringify(isi, null, 2);
  };

  window.terapkanCadanganKonten = function(teks){
    let isi;
    try {
      isi = JSON.parse(String(teks == null ? '' : teks));
    } catch(e){
      return { ok: false, pesan: 'Berkas bukan JSON yang sah.' };
    }
    if(!isi || typeof isi !== 'object'){
      return { ok: false, pesan: 'Isi berkas kosong.' };
    }
    if(isi.aplikasi !== 'ghothys-store' || Number(isi.format) !== FORMAT_CADANGAN){
      return { ok: false, pesan: 'Berkas ini bukan cadangan Ghothys Store.' };
    }
    if(!Array.isArray(isi.bannerUtama)
      && !(isi.gamePopuler && typeof isi.gamePopuler === 'object')){
      return { ok: false, pesan: 'Cadangan tidak memuat konten yang dikenal.' };
    }
    const data = window.getOwnerData();
    if(Array.isArray(isi.bannerUtama)) data.bannerUtama = isi.bannerUtama;
    if(isi.gamePopuler && typeof isi.gamePopuler === 'object'){
      data.gamePopuler = data.gamePopuler || {};
      if(typeof isi.gamePopuler.semuaTampil === 'boolean') data.gamePopuler.semuaTampil = isi.gamePopuler.semuaTampil;
      if(Array.isArray(isi.gamePopuler.tampil)) data.gamePopuler.tampil = isi.gamePopuler.tampil;
      if(isi.gamePopuler.paket && typeof isi.gamePopuler.paket === 'object') data.gamePopuler.paket = isi.gamePopuler.paket;
    }
    saveOwnerData(data);
    if(typeof window.renderBannerUtama === 'function') window.renderBannerUtama();
    if(typeof window.renderGamePopuler === 'function') window.renderGamePopuler();
    if(typeof window.renderRiwayatHarga === 'function') window.renderRiwayatHarga();
    return { ok: true, pesan: 'Cadangan diterapkan.' };
  };

  window.cadangkanKontenOwner = function(){
    if(!requireLoggedIn()) return;
    try {
      const teks = window.bangunCadanganKonten();
      const blob = new Blob([teks], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const tombol = document.createElement('a');
      const d = new Date();
      const cap = d.getFullYear()
        + String(d.getMonth() + 1).padStart(2, '0')
        + String(d.getDate()).padStart(2, '0');
      tombol.href = url;
      tombol.download = 'ghothys-konten-' + cap + '.json';
      document.body.appendChild(tombol);
      tombol.click();
      document.body.removeChild(tombol);
      URL.revokeObjectURL(url);
      tampilkanPesan('Cadangan konten diunduh', false);
    } catch(e){
      tampilkanPesan('Gagal membuat cadangan', true);
    }
  };

  window.pulihkanKontenOwnerDariBerkas = function(berkas){
    if(!requireLoggedIn()) return;
    if(!berkas) return;
    if(!confirm('Muat cadangan ini dan ganti pengaturan konten yang sekarang?')) return;
    const pembaca = new FileReader();
    pembaca.onload = function(){
      const hasil = window.terapkanCadanganKonten(pembaca.result);
      if(hasil.ok) tampilkanPesan(hasil.pesan, false);
      else tampilkanPesan(hasil.pesan, true);
    };
    pembaca.onerror = function(){ tampilkanPesan('Gagal membaca berkas', true); };
    pembaca.readAsText(berkas);
  };

  /* ============================================================
     RINGKASAN PESANAN
     ------------------------------------------------------------
     Angka diambil dari panel admin di server lewat cookie login
     yang sudah dipakai Sinkronisasi Konten. Kalau belum login atau
     server tak menjawab, panel hanya menampilkan keterangan, tidak
     mengganggu fungsi lain.
     ============================================================ */
  function relayDasar(){
    const c = window.GHOTHYS_NOTIFY_CONFIG || {};
    return String(c.relayUrl || '').replace(/\/+$/, '');
  }

  function setTeks(id, teks){
    const el = document.getElementById(id);
    if(el) el.textContent = String(teks);
  }

  window.formatRingkasanPesanan = function(data){
    const t = (data && data.totals) || {};
    const s = (data && data.statusCounts) || {};
    return {
      hariIni: Number(t.totalOrdersToday || 0),
      omzetHariIni: Number(t.totalRevenueToday || 0),
      total: Number(t.totalOrders || 0),
      pending: Number(s.Pending || 0)
    };
  };

  window.muatRingkasanPesanan = function(){
    const status = document.getElementById('owner-pesanan-status');
    const dasar = relayDasar();
    if(!dasar){
      if(status) status.textContent = 'Alamat server belum diatur.';
      return Promise.resolve(false);
    }
    if(status) status.textContent = 'Memuat ringkasan...';
    return fetch(dasar + '/admin/dashboard', { method: 'GET', credentials: 'include' })
      .then(function(res){
        if(res.status === 401) return { belumLogin: true };
        if(!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(j){
        if(j && j.belumLogin){
          if(status) status.textContent = 'Belum login. Masuk lewat kotak Sinkronisasi Konten di atas, lalu muat ulang.';
          return false;
        }
        const isi = (j && j.data) ? j.data : j;
        const r = window.formatRingkasanPesanan(isi);
        setTeks('owner-pesanan-hari-ini', r.hariIni);
        setTeks('owner-pesanan-omzet', rupiahRingkas(r.omzetHariIni));
        setTeks('owner-pesanan-pending', r.pending);
        setTeks('owner-pesanan-total', r.total);
        if(status) status.textContent = 'Terakhir dimuat ' + waktuRingkas(new Date().toISOString());
        return true;
      })
      .catch(function(e){
        if(status) status.textContent = 'Gagal memuat: ' + ((e && e.message) || 'error');
        return false;
      });
  };

  document.addEventListener('DOMContentLoaded', function(){
    const simpanBanner = document.getElementById('owner-banner-utama-simpan');
    if(simpanBanner) simpanBanner.addEventListener('click', function(){ window.simpanBannerUtama(); });

    const kembaliBanner = document.getElementById('owner-banner-utama-kembalikan');
    if(kembaliBanner) kembaliBanner.addEventListener('click', function(){ window.kembalikanBannerBawaan(); });

    const tombolSemua = document.getElementById('owner-game-semua');
    if(tombolSemua) tombolSemua.addEventListener('click', function(){ window.setSemuaGame(true); });

    const tombolTidak = document.getElementById('owner-game-tidak');
    if(tombolTidak) tombolTidak.addEventListener('click', function(){ window.setSemuaGame(false); });

    const bersihkanRiwayat = document.getElementById('owner-riwayat-bersihkan');
    if(bersihkanRiwayat) bersihkanRiwayat.addEventListener('click', function(){ window.bersihkanRiwayatHarga(); });

    const wadahRiwayat = document.getElementById('owner-riwayat-harga');
    if(wadahRiwayat && wadahRiwayat.dataset.terpasang !== '1'){
      wadahRiwayat.dataset.terpasang = '1';
      wadahRiwayat.addEventListener('click', function(ev){
        const tombol = ev.target.closest('.owner-riwayat-pulihkan');
        if(!tombol) return;
        window.pulihkanRiwayatHarga(tombol.getAttribute('data-pulihkan'));
      });
    }

    const unduhCadangan = document.getElementById('owner-cadangan-unduh');
    if(unduhCadangan) unduhCadangan.addEventListener('click', function(){ window.cadangkanKontenOwner(); });

    const muatCadangan = document.getElementById('owner-cadangan-berkas');
    if(muatCadangan) muatCadangan.addEventListener('change', function(){
      const berkas = muatCadangan.files && muatCadangan.files[0];
      window.pulihkanKontenOwnerDariBerkas(berkas);
      muatCadangan.value = '';
    });

    const muatPesanan = document.getElementById('owner-pesanan-muat');
    if(muatPesanan) muatPesanan.addEventListener('click', function(){ window.muatRingkasanPesanan(); });

    document.querySelectorAll('.owner-panel-open').forEach(function(btn){
      btn.addEventListener('click', function(){ window.muatRingkasanPesanan(); });
    });

    window.renderRiwayatHarga();

    pasangPanelGame();
  });

/* Tombol OWNER PANEL hanya muncul untuk user yang sudah login di toko
     DAN email-nya sama dengan ownerEmail di GHOTHYS_NOTIFY_CONFIG.
     Owner email = admin email (ADMIN_EMAIL di Worker).
     Di dalam panel, hak simpan ke server tetap butuh login admin
     lewat kotak Sinkronisasi Konten. */
  function showOwnerButtonIfAllowed(){
    const list = document.querySelectorAll('.owner-panel-open');
    if(!list.length) return;
    const ownerEmail = (window.GHOTHYS_NOTIFY_CONFIG?.ownerEmail || '').toLowerCase();
    const userEmail = (window.currentUser?.email || '').toLowerCase();
    const isOwner = !!window.currentUser && userEmail === ownerEmail && ownerEmail !== '';
    list.forEach(function(btn){ btn.style.display = isOwner ? 'inline-block' : 'none'; });
  }
  window.refreshOwnerButton = showOwnerButtonIfAllowed;

  /* requireLoggedIn dipakai handler internal panel (buka manajer announc/event/banner).
     Cukup login toko + email owner. Hak simpan ke server dicek terpisah via owner-sync.js. */
  function requireLoggedIn(){
    const ownerEmail = (window.GHOTHYS_NOTIFY_CONFIG?.ownerEmail || '').toLowerCase();
    const userEmail = (window.currentUser?.email || '').toLowerCase();
    if(window.currentUser && userEmail === ownerEmail) return true;
    window.showErrorToast('Akses Ditolak','Hanya pemilik toko yang dapat mengakses panel ini');
    if(typeof window.openLoginModal==='function') window.openLoginModal();
    return false;
  }

  document.addEventListener('DOMContentLoaded', function(){
    if(typeof window.STORAGE_KEYS==='undefined') window.STORAGE_KEYS = {};
    window.initializeOwnerData();
    showOwnerButtonIfAllowed();

    // ensure the close button inside modal works
    const closeBtn = document.querySelector('#owner-panel-modal .owner-close');
    if(closeBtn) closeBtn.addEventListener('click', () => window.closeOwnerPanel());

    // re-render whenever UI updates (best-effort): hook into updateUI by wrapping if exists
    if(typeof window.updateUI === 'function'){
      const orig = window.updateUI;
      window.updateUI = function(){ orig(); showOwnerButtonIfAllowed(); };
    }
  });
})();
