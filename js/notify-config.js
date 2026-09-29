/* ============================================================
   GHOTHYS STORE - Konfigurasi Notifikasi Order Baru
   ------------------------------------------------------------
   Cara AMAN (sudah dipakai):
   Webhook Discord & token Telegram disembunyikan di belakang relay
   Cloudflare Worker (file: relay/worker.js). Situs tidak pernah
   menyimpan token webhook, hanya URL relay.
   Kolom yang dikosongkan ('') berarti kanal tersebut nonaktif.

   PENTING: relaySecret DIKOSONGKAN dengan sengaja.
   Endpoint order harus bisa dipanggil browser pembeli yang tidak
   punya akun, jadi tidak ada secret yang boleh tersimpan di file
   publik (siapa pun bisa melihatnya lewat View Source). Worker
   Worker melindungi endpoint order dengan: honeypot, durasi pengisian
   form, batas 5 order/10 menit per IP, cek duplikat Order ID, dan
   validasi ketat payload.
   Untuk menulis konten owner (POST /content), pakai token panel
   admin (login di /admin/) - bukan secret di file ini.

   Setup relay (sekali saja, ~5 menit):
   1) Buka https://dash.cloudflare.com -> Workers & Pages -> Create
      -> Worker -> tempel isi relay/worker.js -> Save & Deploy.
   2) Settings -> Variables and Secrets (semua JANGAN di publik):
        DISCORD_WEBHOOK_URL_SECRET = <URL webhook Discord kamu>
        SECRET                     = <kata sandi acak panjang>
        AIRTABLE_PAT, AIRTABLE_BASE_ID_SECRET
        ADMIN_EMAIL, ADMIN_PASSWORD_HASH, JWT_SECRET
        (opsional nanti) TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID_SECRET
   3) Copy URL worker (mis. https://ghothys-notif.xxx.workers.dev)
      isi ke relayUrl di bawah.

   FALLBACK (jika relay belum dibuat, KURANG AMAN):
   Bisa diisi sementara di kolom 'discordWebhook'/'formspreeId'
   langsung, tapi webhook akan terekspos siapa pun yang lihat repo.
   Setelah relay aktif, kosongkan kolom fallback ini.
   ============================================================ */
window.GHOTHYS_NOTIFY_CONFIG = {
	// === GAYA AMAN (prioritas utama) ===

	// Contoh: 'https://ghothys-notif.xxx.workers.dev'
	relayUrl: 'https://empty-snow-7e64ghothys-notif.whitefox-rakka.workers.dev',

	// Sengaja kosong. Secret TIDAK BOLEH ada di file publik.
	relaySecret: '',

	// === FALLBACK LANGSUNG (hanya jika relay belum dibuat) ===
	// Relay sudah aktif -> kosongkan semua fallback di bawah ini.
	// Contoh: 'https://discord.com/api/webhooks/1234567890/AbCdEfGhIjKl'
	discordWebhook: '',

	// Contoh: 'mzngqvwy'
	formspreeId: 'mdekddgg',

	// Contoh: 'https://ghothys-relay.example.com/notify'
	telegramRelay: '',

	// Nama toko yang dipakai di template pesan WA/bukti pesanan.
	storeName: 'Ghothys Store',

	// === NOMER TUJUAN PEMBAYARAN (ditampilkan ke customer) ===
	// Key harus SAMA dengan value opsi payment di form checkout.
	payments: {
		DANA: { number: '082137499434', atasNama: 'Ghothys Store' },
		GoPay: { number: '082137499434', atasNama: 'Ghothys Store' }
	},

	// Nomor WhatsApp customer untuk konfirmasi setelah bayar (format 62...).
	waNumber: '6282137499434',

	// Email pemilik toko (hanya email ini yang bisa lihat & buka Owner Panel).
	// Harus SAMA dengan email yang dipakai login admin (ADMIN_EMAIL di Worker).
	ownerEmail: 'whitefox.rakka@gmail.com'
};