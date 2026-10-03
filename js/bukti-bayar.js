/* ============================================================
   BUKTI BAYAR - unggah dari sisi pembeli
   ------------------------------------------------------------
   Modul kecil yang dipakai dua tempat:
     - layar pembayaran setelah pesanan dibuat (topup.js)
     - kartu Cek Status Pesanan (order-status.js)

   Mengirim gambar ke {relayUrl}/bukti-bayar sebagai
   multipart/form-data berisi order_id dan file, lalu menyusun
   tautan gambar untuk ditampilkan.

   Tidak ada secret di sini. Server yang memvalidasi Order ID,
   jenis gambar, ukuran, dan membatasi jumlah unggahan per IP.
   ============================================================ */
(function(){
  'use strict';

  /* Batas ukuran sama dengan server, dicek lebih dulu supaya
     pengunjung tidak menunggu unggahan besar hanya untuk ditolak. */
  var MAKS_BYTES = 3 * 1024 * 1024;

  function relayUrl(){
    var cfg = window.GHOTHYS_NOTIFY_CONFIG || {};
    return String(cfg.relayUrl || '').replace(/\/+$/, '');
  }

  function urlBukti(orderId){
    var base = relayUrl();
    if(!base) return '';
    return base + '/bukti-bayar?order_id=' + encodeURIComponent(String(orderId || '').trim());
  }

  function tipeDiterima(file){
    var t = String((file && file.type) || '').toLowerCase();
    return t === 'image/jpeg' || t === 'image/png' || t === 'image/webp';
  }

  function kirim(orderId, file){
    return new Promise(function(resolve){
      var base = relayUrl();
      if(!base){ resolve({ ok: false, error: 'Layanan belum dikonfigurasi' }); return; }
      var id = String(orderId || '').trim();
      if(!/^INV-\d{8}-\d+$/.test(id)){ resolve({ ok: false, error: 'Order ID tidak valid' }); return; }
      if(!file){ resolve({ ok: false, error: 'Pilih gambar bukti dulu' }); return; }
      if(!tipeDiterima(file)){ resolve({ ok: false, error: 'Format gambar harus JPG, PNG, atau WebP' }); return; }
      if(file.size > MAKS_BYTES){ resolve({ ok: false, error: 'Ukuran gambar maksimal 3 MB' }); return; }

      var body = new FormData();
      body.append('order_id', id);
      body.append('file', file, file.name || 'bukti.jpg');

      fetch(base + '/bukti-bayar', { method: 'POST', body: body })
        .then(function(res){
          return res.json().catch(function(){ return {}; }).then(function(j){
            resolve({
              ok: res.ok && !!(j && j.ok !== false),
              status: res.status,
              error: (j && j.error) || ''
            });
          });
        })
        .catch(function(e){
          resolve({ ok: false, error: (e && e.message) || 'Gagal mengunggah bukti' });
        });
    });
  }

  /* Pasang kendali unggah ke sekumpulan elemen yang sudah ada.
     Dipakai oleh layar pembayaran dan kartu cek status. */
  function pasangForm(o){
    o = o || {};
    var wadah = document.getElementById(o.wadahId);
    var input = document.getElementById(o.inputId);
    var tombol = document.getElementById(o.tombolId);
    var status = document.getElementById(o.statusId);
    var preview = document.getElementById(o.previewId);
    var gambar = document.getElementById(o.gambarId);
    if(!wadah || !input || !tombol) return;

    wadah.style.display = 'block';

    function setStatus(teks, jenis){
      if(!status) return;
      status.textContent = teks || '';
      status.style.color = jenis === 'ok'
        ? '#16a34a'
        : (jenis === 'salah' ? '#dc2626' : 'var(--text-secondary)');
    }

    function tampilkanBukti(){
      var u = urlBukti(o.orderId);
      if(!u || !gambar || !preview) return;
      gambar.src = u + '&t=' + Date.now();
      preview.style.display = 'block';
    }

    tombol.onclick = function(){
      var file = input.files && input.files[0];
      if(!file){ setStatus('Pilih gambar bukti dulu.', 'salah'); return; }
      var teksAsli = tombol.textContent;
      tombol.disabled = true;
      tombol.textContent = 'Mengunggah...';
      setStatus('Sedang mengunggah...', '');
      kirim(o.orderId, file).then(function(hasil){
        tombol.disabled = false;
        tombol.textContent = teksAsli;
        if(hasil.ok){
          setStatus('Bukti pembayaran sudah diunggah. Terima kasih.', 'ok');
          tampilkanBukti();
        } else {
          setStatus(hasil.error || 'Gagal mengunggah bukti.', 'salah');
        }
      });
    };

    if(o.tampilkanAwal) tampilkanBukti();
  }

  window.BuktiBayar = {
    kirim: kirim,
    url: urlBukti,
    pasangForm: pasangForm,
    MAKS_BYTES: MAKS_BYTES
  };
})();
