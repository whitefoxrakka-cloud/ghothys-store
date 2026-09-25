/* ============================================================
   GHOTHYS STORE - RELAY NOTIFIKASI (Cloudflare Worker)
   ------------------------------------------------------------
   Tugas:
   - Menyembunyikan Discord webhook & token Telegram dari repo.
   - Hanya meneruskan payload yang bentuknya ORDER.
   - Menyimpan order ke Airtable (database order-an owner).
   - Menyimpan konten owner (pengumuman/event/banner) ke Airtable
     dan membacanya kembali untuk semua pengunjung (fitur #2).

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
        AIRTABLE_CONTENT_TABLE_NAME = <nama tabel konten, mis. Content>
   4) Save and deploy.

   TABEL AIRTABLE "Content" (buat sekali, impor file
   relay/airtable-content-template.csv):
     ORDER_ID (text)  |  PAYLOAD (long text / JSON)  |  UPDATED_AT (datetime)
   Gunakan ORDER_ID 'content_owner_1' sebagai baris konten tunggal.
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

/* ============================================================
   KONTEN OWNER -> PUBLIK (fitur #2)
   ------------------------------------------------------------
   Konten owner (pengumuman/event/banner/pinned) disimpan sebagai
   SATU baris JSON di tabel Airtable "Content" dengan ORDER ID =
   'content_owner_1'. Semua pengunjung membaca baris ini lewat
   GET /content; owner menulisnya lewat POST /content (dengan
   X-Ghothys-Secret).

   Tabel Airtable "Content" (buat SEKALI lewat impor
   relay/airtable-content-template.csv):
     ORDER_ID (text) | PAYLOAD (long text) | UPDATED_AT (datetime)
   ============================================================ */

async function getContentFromAirtable(env) {
	if (!env.AIRTABLE_PAT || !cfgValue(env, 'AIRTABLE_BASE_ID') || !env.AIRTABLE_CONTENT_TABLE_NAME) {
		return { ok: true, skipped: true, content: null };
	}
	const url = 'https://api.airtable.com/v0/' + cfgValue(env, 'AIRTABLE_BASE_ID') + '/' +
		encodeURIComponent(env.AIRTABLE_CONTENT_TABLE_NAME) +
		'?filterByFormula=' + encodeURIComponent("ORDER_ID='content_owner_1'") +
		'&maxRecords=1';
	const res = await fetch(url, {
		headers: { 'Authorization': 'Bearer ' + env.AIRTABLE_PAT }
	});
	if (!res.ok) throw new Error('Airtable GET content HTTP ' + res.status);
	const body = await res.json();
	const rec = body.records && body.records[0];
	if (!rec || !rec.fields || !rec.fields.PAYLOAD) return { ok: true, content: null };
	let content = null;
	try { content = JSON.parse(rec.fields.PAYLOAD); } catch (e) { content = null; }
	return { ok: true, content: content, updatedAt: rec.fields.UPDATED_AT || null };
}

/* ============================================================
   HELPER: BACA STATUS ORDER DARI AIRTABLE (fitur #3)
   ------------------------------------------------------------
   Mencari satu order di tabel Airtable "Orders" — env
   AIRTABLE_TABLE_NAME (nama tabel default). Field yang dipakai
   adalah yang DITULIS saveToAirtable() saat order dibuat:
     'Order ID' (mis. 'INV-26072026-001'),
     'Game', 'UID', 'Server', 'Item', 'Price', 'Payment',
     'Customer', 'Time', 'Status' ('Pending' saat dibuat).

   Endpoint /order-status hanya mengembalikan field aman untuk
   publik (tanpa Customer/Phone): Order ID, Game, UID, Item,
   Price, Payment, Status, Time. Data sensitif customer TIDAK
   pernah ikut terkirim.
   ============================================================ */
async function getOrderStatusFromAirtable(env, orderId) {
	if (!env.AIRTABLE_PAT || !cfgValue(env, 'AIRTABLE_BASE_ID') || !env.AIRTABLE_TABLE_NAME) {
		return { ok: true, skipped: true, order: null };
	}
	if (!/^INV-\d{8}-\d+$/.test(orderId)) {
		return { ok: false, error: 'Format Order ID tidak valid' };
	}
	const url = 'https://api.airtable.com/v0/' + cfgValue(env, 'AIRTABLE_BASE_ID') + '/' +
		encodeURIComponent(env.AIRTABLE_TABLE_NAME) +
		'?filterByFormula=' + encodeURIComponent("{Order ID}='" + orderId + "'") +
		'&maxRecords=1';
	const res = await fetch(url, {
		headers: { 'Authorization': 'Bearer ' + env.AIRTABLE_PAT }
	});
	if (!res.ok) throw new Error('Airtable get order HTTP ' + res.status);
	const body = await res.json();
	const rec = body.records && body.records[0];
	if (!rec || !rec.fields) return { ok: true, found: false, order: null };
	const f = rec.fields;
	return {
		ok: true,
		found: true,
		order: {
			orderId: f['Order ID'] || orderId,
			game: f.Game || '-',
			uid: f.UID || '-',
			server: f.Server || '-',
			item: f.Item || '-',
			price: f.Price || 0,
			payment: f.Payment || '-',
			status: f.Status || 'Pending',
			time: f.Time || null
		}
	};
}

async function saveContentToAirtable(env, content) {
	if (!env.AIRTABLE_PAT || !cfgValue(env, 'AIRTABLE_BASE_ID') || !env.AIRTABLE_CONTENT_TABLE_NAME) {
		return { ok: true, skipped: true };
	}
	if (!content || typeof content !== 'object') throw new Error('Content must be an object');
	const fields = {
		'ORDER_ID': 'content_owner_1',
		'PAYLOAD': JSON.stringify(content),
		'UPDATED_AT': new Date().toISOString()
	};
	const url = 'https://api.airtable.com/v0/' + cfgValue(env, 'AIRTABLE_BASE_ID') + '/' +
		encodeURIComponent(env.AIRTABLE_CONTENT_TABLE_NAME) +
		'?filterByFormula=' + encodeURIComponent("ORDER_ID='content_owner_1'");
	const listRes = await fetch(url, {
		headers: { 'Authorization': 'Bearer ' + env.AIRTABLE_PAT }
	});
	if (!listRes.ok) throw new Error('Airtable find content HTTP ' + listRes.status);
	const listBody = await listRes.json();
	const existing = listBody.records && listBody.records[0];

	const saveUrl = 'https://api.airtable.com/v0/' + cfgValue(env, 'AIRTABLE_BASE_ID') + '/' +
		encodeURIComponent(env.AIRTABLE_CONTENT_TABLE_NAME) + (existing ? ('/' + existing.id) : '');
	const res = await fetch(saveUrl, {
		method: existing ? 'PATCH' : 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + env.AIRTABLE_PAT
		},
		body: JSON.stringify({ fields: fields })
	});
	if (!res.ok) throw new Error('Airtable save content HTTP ' + res.status);
	return { ok: true, method: existing ? 'update' : 'create' };
}

async function saveToAirtable(env, p) {
	if (!env.AIRTABLE_PAT || !cfgValue(env, 'AIRTABLE_BASE_ID') || !env.AIRTABLE_TABLE_NAME) {
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
	const url = 'https://api.airtable.com/v0/' + cfgValue(env, 'AIRTABLE_BASE_ID') + '/' +
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

function cfgValue(env, name) {
	return env[name + '_SECRET'] || env[name] || '';
}

function parseList(value) {
	return String(value || '')
		.split(',')
		.map(function (s) { return s.trim(); })
		.filter(function (s) { return !!s; });
}

function isWriteRequest(request) {
	const m = request.method;
	return m !== 'GET' && m !== 'HEAD';
}

function isOriginAllowed(request, env) {
	const origin = (request.headers.get('Origin') || '').trim();
	const allowed = parseList(env.ALLOWED_ORIGINS);
	if (!origin) return true;
	return allowed.indexOf(origin) > -1;
}

function corsHeaders(request, env) {
	const origin = (request.headers.get('Origin') || '').trim();
	const allowed = parseList(env.ALLOWED_ORIGINS);
	let allowOrigin = '*';
	if (isWriteRequest(request)) {
		allowOrigin = (!origin || allowed.indexOf(origin) > -1) ? origin || '*' : '';
	} else if (origin && allowed.indexOf(origin) > -1) {
		allowOrigin = origin;
	}
	const headers = {
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, X-Ghothys-Secret',
		'Content-Type': 'application/json',
		'Vary': 'Origin',
		'X-Content-Type-Options': 'nosniff',
		'Referrer-Policy': 'no-referrer'
	};
	if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin;
	return headers;
}

function isOwnerAuthorized(request, env) {
	const sent = request.headers.get('X-Ghothys-Secret');
	if (env.SECRET && sent && sent === env.SECRET) return true;
	const email = (request.headers.get('Cf-Access-Authenticated-User-Email') || '').trim().toLowerCase();
	const owner = (env.OWNER_EMAIL || '').trim().toLowerCase();
	if (email && owner && email === owner) return true;
	return false;
}

export default {
	async fetch(request, env) {
		const headers = corsHeaders(request, env);
		if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
		if (isWriteRequest(request) && !isOriginAllowed(request, env)) {
			return new Response(JSON.stringify({ ok: false, error: 'Origin not allowed' }), { status: 403, headers });
		}

        /* ============================================================
           ENDPOINT KONTEN OWNER (fitur #2 - Owner -> Publik)
           ------------------------------------------------------------
           - GET  /content  -> publik, tanpa secret. Membaca konten
             owner (pengumuman/event/banner/pinned) dari tabel
             Airtable "Content" dan mengembalikannya sebagai JSON.
           - POST /content  -> owner, WAJIB X-Ghothys-Secret.
             Menyimpan/memperbarui konten owner ke tabel "Content"
             (satu baris tunggal, ORDER_ID='content_owner_1').

           Tabel Airtable "Content" (buat sekali via impor
           relay/airtable-content-template.csv):
             ORDER_ID (text)  |  PAYLOAD (long text/JSON)  |  UPDATED_AT (datetime)
        ============================================================ */

		if (request.method === 'GET' && new URL(request.url).pathname === '/content') {
			const contentJson = await getContentFromAirtable(env);
			return new Response(JSON.stringify(contentJson), {
				status: contentJson.ok ? 200 : 500,
				headers
			});
		}

		/* ============================================================
		   ENDPOINT CEK STATUS ORDER (fitur #3 - Customer -> Status)
		   ------------------------------------------------------------
		   - GET /order-status?order_id=INV-XXXXX  -> PUBLIK, tanpa
		     secret. Customer memasukkan Order ID miliknya untuk
		     melihat status pesanan (Pending/Diproses/Selesai/
		     Dibatalkan/Refund). Status dibaca dari tabel Airtable
		     "Orders" (kolom Status yang ditulis saat order dibuat,
		     di-update owner di Airtable/panel owner).
		   ============================================================ */
		if (request.method === 'GET' && new URL(request.url).pathname === '/order-status') {
			try {
				const orderId = (new URL(request.url).searchParams.get('order_id') || '').trim();
				const result = await getOrderStatusFromAirtable(env, orderId);
				return new Response(JSON.stringify(result), {
					status: result.ok ? 200 : 404,
					headers
				});
			} catch (e) {
				return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
			}
		}

        if (request.method !== 'POST') {
			return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405, headers });
		}

        if (request.url.includes('/content')) {
            if (!isOwnerAuthorized(request, env)) {
                return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 403, headers });
            }
            try {
                const bodyJson = await request.json();
                const result = await saveContentToAirtable(env, bodyJson);
                return new Response(JSON.stringify({ ok: true, ...result }), { status: 200, headers });
            } catch (e) {
                return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
            }
        }

		if (!isOwnerAuthorized(request, env)) {
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
			results.push(await sendToDiscord(cfgValue(env, 'DISCORD_WEBHOOK_URL'), text));
		} catch (e) {
			results.push({ channel: 'discord', error: e.message });
		}
		try {
			results.push(await sendToTelegram(env.TELEGRAM_BOT_TOKEN, cfgValue(env, 'TELEGRAM_CHAT_ID'), text));
		} catch (e) {
			results.push({ channel: 'telegram', error: e.message });
		}

		const delivered = results.filter(r => r.ok).length;
		const status = delivered > 0 ? 200 : 502;
		return new Response(JSON.stringify({ ok: delivered > 0, results }), { status, headers });
	}
};