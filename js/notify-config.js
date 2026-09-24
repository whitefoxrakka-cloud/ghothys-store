/* ============================================================
   GHOTHYS STORE - Konfigurasi Notifikasi Order Baru
   ------------------------------------------------------------
   Isi di bawah ini dengan data punyamu sendiri. Kolom yang
   dikosongkan ('') berarti kanal tersebut nonaktif.

   1) DISCORD  -> buka server Discord -> Settings -> Integrations
      -> Webhooks -> New Webhook -> salin URL Webhook ke sini.
   2) EMAIL    -> buat form gratis di https://formspree.io
      -> salin ID form (yang terlihat di https://formspree.io/f/XXXX)
      -> isi hanya 4 huruf/angka terakhir XXXX.
   3) TELEGRAM -> dibuat menyusul lewat relay (bagus untuk keamanan);
      biarkan kosong sampai relay siap, lalu isi URL relay-nya.
   ============================================================ */
window.GHOTHYS_NOTIFY_CONFIG = {
	// Example: 'https://discord.com/api/webhooks/1234567890/AbCdEfGhIjKl'
	discordWebhook: 'https://discord.com/api/webhooks/1552713520380907540/gRRB5lNhg24jxjrRtrljCdPH-opgdhhAiErDcZXvtqHrAWjzBGSXK7D7qx7oTGG1rob-',

	// Contoh: 'mzngqvwy'
	formspreeId: '',

	// Contoh: 'https://ghothys-relay.example.com/notify'
	telegramRelay: ''
};