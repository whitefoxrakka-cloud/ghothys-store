/* Anti-clickjacking untuk halaman panel admin.
   GitHub Pages tidak bisa mengirim header X-Frame-Options, jadi
   pemeriksaan dilakukan di sisi halaman: kalau dokumen ini dibingkai
   situs lain, halaman keluar dari bingkai itu dan isinya dikosongkan
   supaya tidak ada tombol yang bisa diklik tanpa sengaja.

   Dimuat paling awal di <head> setiap halaman admin. */
(function () {
  function diBingkai() {
    try {
      return window.top !== window.self;
    } catch (e) {
      /* Browser yang memblokir akses ke window.top dianggap membingkai. */
      return true;
    }
  }

  if (!diBingkai()) return;

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('peringatan-bingkai')) return;
    var kotak = document.createElement('div');
    kotak.id = 'peringatan-bingkai';
    kotak.textContent = 'Halaman ini tidak boleh dibuka di dalam situs lain. '
      + 'Mohon buka langsung di alamat resminya.';
    kotak.style.cssText = 'position:fixed;inset:0;z-index:2147483647;'
      + 'display:flex;align-items:center;justify-content:center;padding:24px;'
      + 'background:#0b0b0f;color:#f3f4f6;font:600 16px/1.6 system-ui,sans-serif;'
      + 'text-align:center;';
    document.body.appendChild(kotak);
  });
}());