/* ============================================================
   GHOTHYS STORE - Konfigurasi Notifikasi Order Baru
   ------------------------------------------------------------
   Cara AMAN (disarankan):
   Biarkan webhook Discord & token Telegram DISEMBUNYIKAN
   di belakang relay Cloudflare Worker (file: relay/worker.js).
   Situs TIDAK pernah menyimpan token — hanya URL relay + secret.
   Kolom yang dikosongkan ('') berarti kanal tersebut nonaktif.

   Setup relay (sekali saja, ~5 menit):
   1) Buka https://dash.cloudflare.com -> Workers & Pages -> Create
      -> Worker -> tempel isi relay/worker.js -> Save & Deploy.
   2) Settings -> Variables:
        DISCORD_WEBHOOK_URL = <URL webhook Discord kamu>
        SECRET              = <kata sandi acak panjang (bebas)>
        (opsional nanti) TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
   3) Copy URL worker (mis. https://ghothys-notif.xxx.workers.dev)
      isi ke relayUrl di bawah, dan SECRET yang sama ke relaySecret.

   FALLBACK (jika relay belum dibuat, KURANG AMAN):
   Bisa diisi sementara di kolom 'discordWebhook'/'formspreeId'
   langsung, tapi webhook akan terekspos siapa pun yang lihat repo.
   Setelah relay aktif, kosongkan kolom fallback ini.
   ============================================================ */
window.GHOTHYS_NOTIFY_CONFIG = {
	// === GAYA AMAN (prioritas utama) ===

	// Contoh: 'https://ghothys-notif.xxx.workers.dev'
	relayUrl: '',

	// Kata sandi acak panjang yang sama dengan variabel SECRET di worker.
	relaySecret: '',

	// === FALLBACK LANGSUNG (hanya jika relay belum dibuat) ===

	// Contoh: 'https://discord.com/api/webhooks/1234567890/AbCdEfGhIjKl'
	discordWebhook: '',

	// Contoh: 'mzngqvwy'
	formspreeId: '',

	// Contoh: 'https://ghothys-relay.example.com/notify'
	telegramRelay: ''
};