/* ============================================================
   GHOTHYS STORE - RELAY NOTIFIKASI (Cloudflare Worker)
   ------------------------------------------------------------
   Tugas:
   - Menyembunyikan Discord webhook & token Telegram dari repo.
   - Hanya meneruskan payload yang bentuknya ORDER.
   - Menyimpan order ke Airtable (database order-an owner).

   Deploy:
   1) Buka https://dash.cloudflare.com -> Workers & Pages
      -> pilih worker kamu -> Edit Code.
   2) Hapus kode lama, tempel seluruh isi file ini, Deploy.
   3) Settings -> Runtime variables and secrets:
        DISCORD_WEBHOOK_URL  = <URL webhook Discord>
        SECRET               = <kata sandi acak panjang>
        TELEGRAM_BOT_TOKEN   = <token bot Telegram>
        TELEGRAM_CHAT_ID     = <chat ID kamu>
        AIRTABLE_PAT         = <Personal Access Token Airtable>
        AIRTABLE_BASE_ID     = <ID base, mis. appXLcZqRnd9Lx7Xe>
        AIRTABLE_TABLE_NAME  = <nama tabel, mis. Orders>
   4) Save and deploy.
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

async function saveToAirtable(env, p) {
	if (!env.AIRTABLE_PAT || !env.AIRTABLE_BASE_ID || !env.AIRTABLE_TABLE_NAME) {
		return { ok: true, skipped: true, channel: 'airtable' };
	}
	const numericPrice = parseInt(p.price, 10);
	const fields = {
		'Order ID': p.order_id,
		'Game': p.game,
		'UID': p.uid,
		'Server': p.server || '-',
		'Item': p.item || '-',
		'Price': (isFinite(numericPrice) && numericPrice > 0) ? numericPrice : 0,
		'Payment': p.payment || '-',
		'Customer': p.customer || '-',
		'Time': p.time || '',
		'Status': 'Pending'
	};
	const url = 'https://api.airtable.com/v0/' + env.AIRTABLE_BASE_ID + '/' +
		encodeURIComponent(env.AIRTABLE_TABLE_NAME);
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + env.AIRTABLE_PAT
		},
		body: JSON.stringify({ fields: fields })
	});
	if (!res.ok) {
		let detail = '';
		try { const j = await res.json(); detail = (j.error && j.error.message) || ''; } catch (e) {}
		throw new Error('Airtable HTTP ' + res.status + (detail ? ' ' + detail : ''));
	}
	return { ok: true, channel: 'airtable' };
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
		const headers = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, X-Ghothys-Secret',
			'Content-Type': 'application/json'
		};
		if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

		if (request.method !== 'POST') {
			return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405, headers });
		}

		if (env.SECRET && request.headers.get('X-Ghothys-Secret') !== env.SECRET) {
			return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 403, headers });
		}

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
			results.push(await saveToAirtable(env, payload));
		} catch (e) {
			results.push({ channel: 'airtable', error: e.message });
		}
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