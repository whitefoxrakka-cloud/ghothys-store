/* ============================================================
   GHOTHYS STORE - RELAY NOTIFIKASI (Cloudflare Worker)
   ------------------------------------------------------------
   Tugas: menyembunyikan Discord webhook & token Telegram dari
   file publik, dan hanya meneruskan pesan yang bentuknya ORDER.

   Deploy:
   1) Buka https://dash.cloudflare.com -> Workers & Pages
      -> Create -> Worker.
   2) Hapus kode bawaan, tempel seluruh isi file ini.
   3) Klik Settings -> Variables, tambahkan variabel:
        DISCORD_WEBHOOK_URL = <URL webhook Discord kamu>
        SECRET              = <kata sandi acak yang panjang>
      (opsional Telegram: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
   4) Klik Save & Deploy. Salin URL worker (mis.
      https://ghothys-notif.<kamu>.workers.dev)
   5) Isi URL + SECRET yang sama ke js/notify-config.js di situs.
   ============================================================ */

async function sendToDiscord(webhookUrl, text) {
	if (!webhookUrl) return { ok: true, skipped: true, channel: 'discord' };
	const res = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ content: text, username: 'Ghothys Store - Order' })
	});
	if (!res.ok) throw new Error('Discord HTTP ' + res.status);
	return { ok: true, channel: 'discord' };
}

async function sendToTelegram(token, chatId, text) {
	if (!token || !chatId) return { ok: true, skipped: true, channel: 'telegram' };
	const res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ chat_id: parseInt(chatId, 10), text: text })
	});
	const body = await res.json();
	if (!res.ok || !body.ok) throw new Error('Telegram: ' + (body.description || ('HTTP ' + res.status)));
	return { ok: true, channel: 'telegram' };
}

function isValidOrder(p) {
	if (!p || typeof p !== 'object') return false;
	if (typeof p.order_id !== 'string' || !/^INV-\d{8}-\d+$/.test(p.order_id)) return false;
	if (typeof p.game !== 'string' || !p.game) return false;
	if (typeof p.uid !== 'string' || !p.uid) return false;
	return true;
}

function formatOrder(p) {
	const rupiah = function(n) {
		const v = parseInt(n, 10);
		return (isFinite(v) && v > 0) ? ('Rp ' + v.toLocaleString('id-ID')) : '-';
	};
	return [
		'ORDER BARU - GHOTHYS STORE',
		'--------------------------------',
		'Order ID : ' + p.order_id,
		'Game     : ' + p.game,
		'UID      : ' + p.uid,
		'Server   : ' + (p.server || '-'),
		'Item     : ' + (p.item || '-'),
		'Harga    : ' + rupiah(p.price),
		'Bayar    : ' + (p.payment || '-'),
		'Nama     : ' + (p.customer || '-'),
		'Waktu    : ' + (p.time || '-'),
		'Status   : Pending',
		'--------------------------------',
		'Ghothys Store'
	].join('\n');
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const isCorsPreflight = request.method === 'OPTIONS';
		const headers = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, X-Ghothys-Secret',
			'Content-Type': 'application/json'
		};
		if (isCorsPreflight) return new Response(null, { status: 204, headers });

		if (request.method !== 'POST') {
			return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405, headers });
		}

		// 1) Cek secret agar hanya situs Ghothys yang sah yang bisa kirim.
		if (env.SECRET && request.headers.get('X-Ghothys-Secret') !== env.SECRET) {
			return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 403, headers });
		}

		// 2) Parsing & validasi: TOLAK jika bukan payload order.
		let payload;
		try {
			payload = await request.json();
		} catch (e) {
			return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers });
		}
		if (!isValidOrder(payload)) {
			return new Response(JSON.stringify({ ok: false, error: 'Not an order payload' }), { status: 400, headers });
		}

		const text = formatOrder(payload);
		const results = [];
		try {
			results.push(await sendToDiscord(env.DISCORD_WEBHOOK_URL, text));
		} catch (e) {
			results.push({ channel: 'discord', error: e.message });
		}
		try {
			results.push(await sendToTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, text));
		} catch (e) {
			results.push({ channel: 'telegram', error: e.message });
		}

		const delivered = results.filter(r => r.ok).length;
		const status = delivered > 0 ? 200 : 502;
		return new Response(JSON.stringify({ ok: delivered > 0, results }), { status, headers });
	}
};