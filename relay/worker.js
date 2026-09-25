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
		'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Ghothys-Secret',
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

/* ============================================================
   ADMIN: LOGIN + KELOLA ORDER (untuk panel /admin)
   ------------------------------------------------------------
   Kredensial owner TIDAK ada di kode/repo, tapi di Worker secrets:
     ADMIN_EMAIL         = email owner
     ADMIN_PASSWORD_HASH = pbkdf2$<iterations>$<saltB64url>$<hashB64url>
     JWT_SECRET          = kunci acak panjang untuk menandatangani token

   Endpoint (semua perlu header "Authorization: Bearer <token>",
   kecuali /admin/login):
     POST  /admin/login                 -> { success, data: { token, user } }
     POST  /admin/logout                -> { success: true }
     GET   /admin/profile               -> { success, data: { email, role } }
     GET   /admin/dashboard             -> statistik + grafik 7 hari
     GET   /admin/orders?page&limit     -> daftar order (punya data customer)
     GET   /admin/orders/<recId>        -> detail satu order
     PATCH /admin/orders/<recId>/status -> ubah status order

   Sumber data tetap tabel Airtable (env AIRTABLE_TABLE_NAME),
   jadi status yang diubah di panel langsung terlihat pelanggan
   di halaman cek status publik.
   ============================================================ */

const ADMIN_STATUSES = ['Pending', 'Diproses', 'Success', 'Selesai', 'Cancel', 'Dibatalkan', 'Refund'];
const loginAttempts = new Map();

function jsonResponse(obj, status, headers) {
	return new Response(JSON.stringify(obj), { status: status, headers: headers });
}

function b64urlFromBytes(bytes) {
	let bin = '';
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesFromB64url(value) {
	const s = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
	const pad = (s.length % 4) ? ('='.repeat(4 - (s.length % 4))) : '';
	const bin = atob(s + pad);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

async function verifyPassword(password, stored) {
	const parts = String(stored || '').split('$');
	if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
	const iterations = parseInt(parts[1], 10);
	/* Cloudflare Workers membatasi iterasi PBKDF2 maksimal 100.000
	   (Web Crypto: deriveBits melempar error di atas batas itu). */
	if (!isFinite(iterations) || iterations < 10000 || iterations > 100000) return false;
	const salt = bytesFromB64url(parts[2]);
	const expected = bytesFromB64url(parts[3]);
	if (!salt.length || !expected.length) return false;
	try {
		const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password || '')), { name: 'PBKDF2' }, false, ['deriveBits']);
		const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' }, material, expected.length * 8);
		const got = new Uint8Array(bits);
		let diff = (got.length === expected.length) ? 0 : 1;
		for (let i = 0; i < expected.length; i++) diff |= (got[i] || 0) ^ expected[i];
		return diff === 0;
	} catch (e) {
		return false;
	}
}

async function hmacKey(secret) {
	return crypto.subtle.importKey('raw', new TextEncoder().encode(String(secret || '')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signJwt(secret, payload) {
	const head = b64urlFromBytes(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
	const body = b64urlFromBytes(new TextEncoder().encode(JSON.stringify(payload)));
	const data = head + '.' + body;
	const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(data)));
	return data + '.' + b64urlFromBytes(sig);
}

async function verifyJwt(secret, token) {
	const parts = String(token || '').split('.');
	if (parts.length !== 3) return null;
	const data = parts[0] + '.' + parts[1];
	let ok = false;
	try {
		ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), bytesFromB64url(parts[2]), new TextEncoder().encode(data));
	} catch (e) {
		ok = false;
	}
	if (!ok) return null;
	try {
		const payload = JSON.parse(new TextDecoder().decode(bytesFromB64url(parts[1])));
		if (!payload || typeof payload.exp !== 'number') return null;
		if (payload.exp * 1000 < Date.now()) return null;
		return payload;
	} catch (e) {
		return null;
	}
}

function loginThrottle(key) {
	const now = Date.now();
	const max = 8;
	const span = 10 * 60 * 1000;
	const list = (loginAttempts.get(key) || []).filter(function (t) { return now - t < span; });
	list.push(now);
	loginAttempts.set(key, list);
	return { blocked: list.length > max };
}

function ordersUrl(env) {
	return 'https://api.airtable.com/v0/' + cfgValue(env, 'AIRTABLE_BASE_ID') + '/' + encodeURIComponent(env.AIRTABLE_TABLE_NAME);
}

function airtableHeaders(env) {
	return { 'Authorization': 'Bearer ' + env.AIRTABLE_PAT, 'Content-Type': 'application/json' };
}

async function fetchOrdersRecords(env, maxRecords) {
	if (!env.AIRTABLE_PAT || !cfgValue(env, 'AIRTABLE_BASE_ID') || !env.AIRTABLE_TABLE_NAME) {
		throw new Error('Airtable belum dikonfigurasi (AIRTABLE_PAT / base / tabel)');
	}
	const cap = Math.min(Math.max(parseInt(maxRecords, 10) || 300, 1), 1000);
	const records = [];
	let offset = '';
	while (records.length < cap) {
		const pageSize = Math.min(100, cap - records.length);
		const qs = new URLSearchParams();
		qs.set('pageSize', String(pageSize));
		qs.set('sort[0][field]', 'Time');
		qs.set('sort[0][direction]', 'desc');
		if (offset) qs.set('offset', offset);
		let res = await fetch(ordersUrl(env) + '?' + qs.toString(), { headers: airtableHeaders(env) });
		if (!res.ok && res.status === 400) {
			const retry = new URLSearchParams();
			retry.set('pageSize', String(pageSize));
			if (offset) retry.set('offset', offset);
			res = await fetch(ordersUrl(env) + '?' + retry.toString(), { headers: airtableHeaders(env) });
		}
		if (!res.ok) {
			let detail = '';
			try { const j = await res.json(); detail = (j.error && j.error.message) || ''; } catch (e) {}
			throw new Error('Airtable orders HTTP ' + res.status + (detail ? ' ' + detail : ''));
		}
		const body = await res.json();
		const batch = body.records || [];
		for (const rec of batch) records.push(rec);
		offset = body.offset || '';
		if (!offset || batch.length === 0) break;
	}
	return records;
}

function mapOrderRecord(rec) {
	const f = (rec && rec.fields) || {};
	return {
		id: (rec && rec.id) || '',
		order_id: f['Order ID'] || '',
		customer_name: f.Customer || '-',
		user_uid: f.UID || '-',
		game: f.Game || '-',
		server: f.Server || '-',
		product: f.Item || '-',
		price: Number(f.Price || 0) || 0,
		payment: f.Payment || '-',
		status: f.Status || 'Pending',
		created_at: (rec && rec.createdTime) || f.Time || ''
	};
}

/* Bucket "hari ini" memakai waktu Indonesia (WIB = UTC+7, tanpa DST),
   karena itu yang dibaca pemilik toko saat melihat dashboard. */
const WIB_OFFSET_MIN = 420;

function dayKeyOf(value, offsetMin) {
	if (!value) return '';
	const d = new Date(value);
	if (isNaN(d.getTime())) return '';
	return new Date(d.getTime() + ((offsetMin || 0) * 60000)).toISOString().slice(0, 10);
}

async function buildDashboard(env) {
	const records = await fetchOrdersRecords(env, 500);
	const orders = records.map(mapOrderRecord);
	const todayKey = dayKeyOf(new Date().toISOString(), WIB_OFFSET_MIN);
	let totalOrdersToday = 0;
	let totalRevenueToday = 0;
	const statusCounts = { Pending: 0, Diproses: 0, Success: 0, Cancel: 0 };
	const labels = [];
	const dayKeys = [];
	for (let i = 6; i >= 0; i--) {
		const d = new Date(Date.now() - (i * 86400000));
		const key = dayKeyOf(d.toISOString(), WIB_OFFSET_MIN);
		dayKeys.push(key);
		labels.push(key.slice(8, 10));
	}
	const perDay = [0, 0, 0, 0, 0, 0, 0];
	for (const o of orders) {
		const key = dayKeyOf(o.created_at, WIB_OFFSET_MIN);
		if (key && key === todayKey) {
			totalOrdersToday++;
			totalRevenueToday += o.price;
		}
		const idx = dayKeys.indexOf(key);
		if (idx > -1) perDay[idx]++;
		const st = (o.status || '').toLowerCase();
		if (statusCounts[o.status] !== undefined) statusCounts[o.status]++;
		else if (st === 'selesai' || st === 'success') statusCounts.Success++;
		else if (st === 'diproses' || st === 'proses') statusCounts.Diproses++;
		else if (st === 'cancel' || st === 'dibatalkan') statusCounts.Cancel++;
		else if (st === 'pending') statusCounts.Pending++;
	}
	return {
		success: true,
		data: {
			totals: { totalOrdersToday: totalOrdersToday, totalRevenueToday: totalRevenueToday, totalOrders: orders.length },
			totalMembers: null,
			statusCounts: statusCounts,
			chart: { days: labels, orders: perDay }
		}
	};
}

async function handleListOrders(request, env, url) {
	const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10) || 1, 1);
	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 1), 100);
	const search = (url.searchParams.get('search') || '').trim().toLowerCase();
	const status = (url.searchParams.get('status') || '').trim();
	const sortBy = url.searchParams.get('sortBy') || 'created_at';
	const sortOrder = (url.searchParams.get('sortOrder') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
	const records = await fetchOrdersRecords(env, 500);
	let rows = records.map(mapOrderRecord);
	if (status) {
		rows = rows.filter(function (o) { return (o.status || '').toLowerCase() === status.toLowerCase(); });
	}
	if (search) {
		rows = rows.filter(function (o) {
			return [o.order_id, o.customer_name, o.user_uid, o.game, o.payment, o.product].join(' ').toLowerCase().indexOf(search) > -1;
		});
	}
	const dir = (sortOrder === 'asc') ? 1 : -1;
	rows.sort(function (a, b) {
		const x = a[sortBy];
		const y = b[sortBy];
		if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
		return String(x || '').localeCompare(String(y || ''), 'id-ID') * dir;
	});
	const totalRows = rows.length;
	const totalPages = Math.max(1, Math.ceil(totalRows / limit));
	const safePage = Math.min(page, totalPages);
	const start = (safePage - 1) * limit;
	return {
		success: true,
		data: { data: rows.slice(start, start + limit), totalRows: totalRows, page: safePage, totalPages: totalPages, limit: limit }
	};
}

async function handleAdminRoute(request, env, url, headers) {
	const path = url.pathname;
	const method = request.method;

	if (path === '/admin/login' && method === 'POST') {
		const ip = (request.headers.get('CF-Connecting-IP') || 'tidak-known').trim();
		let body = null;
		try { body = await request.json(); } catch (e) { body = null; }
		const email = String((body && body.email) || '').trim().toLowerCase();
		const password = String((body && body.password) || '');
		const throttleKey = ip + '|' + email;
		if (loginThrottle(throttleKey).blocked) {
			return jsonResponse({ success: false, message: 'Terlalu banyak percobaan login. Tunggu beberapa menit lalu coba lagi.' }, 429, headers);
		}
		const adminEmail = (env.ADMIN_EMAIL || '').trim().toLowerCase();
		if (!adminEmail || !env.ADMIN_PASSWORD_HASH || !env.JWT_SECRET) {
			return jsonResponse({ success: false, message: 'Admin belum dikonfigurasi di Worker (ADMIN_EMAIL, ADMIN_PASSWORD_HASH, JWT_SECRET).' }, 503, headers);
		}
		const emailOk = !!email && email === adminEmail;
		const passOk = emailOk ? await verifyPassword(password, env.ADMIN_PASSWORD_HASH) : false;
		if (!emailOk || !passOk) {
			return jsonResponse({ success: false, message: 'Email atau password salah.' }, 401, headers);
		}
		loginAttempts.delete(throttleKey);
		const nowSec = Math.floor(Date.now() / 1000);
		const token = await signJwt(env.JWT_SECRET, { sub: email, role: 'admin', iat: nowSec, exp: nowSec + (8 * 3600) });
		return jsonResponse({ success: true, data: { token: token, user: { email: email, role: 'admin' } } }, 200, headers);
	}

	const authHeader = (request.headers.get('Authorization') || '').trim();
	const token = authHeader.replace(/^Bearer\s+/i, '').trim();
	const payload = await verifyJwt(env.JWT_SECRET, token);
	if (!payload) {
		return jsonResponse({ success: false, message: 'Sesi tidak valid atau sudah habis. Silakan login ulang.' }, 401, headers);
	}

	if (path === '/admin/logout' && (method === 'POST' || method === 'GET')) {
		return jsonResponse({ success: true, data: { loggedOut: true } }, 200, headers);
	}

	if (path === '/admin/profile' && method === 'GET') {
		return jsonResponse({ success: true, data: { email: payload.sub, role: payload.role } }, 200, headers);
	}

	if (path === '/admin/dashboard' && method === 'GET') {
		try {
			return jsonResponse(await buildDashboard(env), 200, headers);
		} catch (e) {
			return jsonResponse({ success: false, message: e.message }, 500, headers);
		}
	}

	if (path === '/admin/orders' && method === 'GET') {
		try {
			return jsonResponse(await handleListOrders(request, env, url), 200, headers);
		} catch (e) {
			return jsonResponse({ success: false, message: e.message }, 500, headers);
		}
	}

	const detailMatch = path.match(/^\/admin\/orders\/([^/]+)$/);
	if (detailMatch && method === 'GET') {
		try {
			const res = await fetch(ordersUrl(env) + '/' + encodeURIComponent(detailMatch[1]), { headers: airtableHeaders(env) });
			if (res.status === 404) {
				return jsonResponse({ success: false, message: 'Order tidak ditemukan.' }, 404, headers);
			}
			if (!res.ok) throw new Error('Airtable order HTTP ' + res.status);
			const body = await res.json();
			return jsonResponse({ success: true, data: mapOrderRecord(body) }, 200, headers);
		} catch (e) {
			return jsonResponse({ success: false, message: e.message }, 500, headers);
		}
	}

	const statusMatch = path.match(/^\/admin\/orders\/([^/]+)\/status$/);
	if (statusMatch && (method === 'PATCH' || method === 'POST')) {
		let body = null;
		try { body = await request.json(); } catch (e) { body = null; }
		const nextStatus = String((body && body.status) || '').trim();
		if (ADMIN_STATUSES.indexOf(nextStatus) === -1) {
			return jsonResponse({ success: false, message: 'Status tidak dikenal. Pilihan: ' + ADMIN_STATUSES.join(', ') + '.' }, 400, headers);
		}
		try {
			const res = await fetch(ordersUrl(env) + '/' + encodeURIComponent(statusMatch[1]), {
				method: 'PATCH',
				headers: airtableHeaders(env),
				body: JSON.stringify({ fields: { 'Status': nextStatus } })
			});
			if (res.status === 404) {
				return jsonResponse({ success: false, message: 'Order tidak ditemukan.' }, 404, headers);
			}
			if (!res.ok) {
				let detail = '';
				try { const j = await res.json(); detail = (j.error && j.error.message) || ''; } catch (e) {}
				throw new Error('Airtable update HTTP ' + res.status + (detail ? ' ' + detail : ''));
			}
			const body2 = await res.json();
			return jsonResponse({ success: true, data: mapOrderRecord(body2) }, 200, headers);
		} catch (e) {
			return jsonResponse({ success: false, message: e.message }, 500, headers);
		}
	}

	return jsonResponse({ success: false, message: 'Endpoint admin tidak dikenal.' }, 404, headers);
}

export default {
	async fetch(request, env) {
		const headers = corsHeaders(request, env);
		if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
		if (isWriteRequest(request) && !isOriginAllowed(request, env)) {
			return new Response(JSON.stringify({ ok: false, error: 'Origin not allowed' }), { status: 403, headers });
		}

		/* Semua endpoint /admin/* (login, dashboard, orders) melewati
		   gerbang authenticate di handleAdminRoute, dan asal request-nya
		   tetap harus masuk daftar ALLOWED_ORIGINS. */
		const requestUrl = new URL(request.url);
		if (requestUrl.pathname.indexOf('/admin/') === 0) {
			if (!isOriginAllowed(request, env)) {
				return new Response(JSON.stringify({ ok: false, error: 'Origin not allowed' }), { status: 403, headers });
			}
			return handleAdminRoute(request, env, requestUrl, headers);
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