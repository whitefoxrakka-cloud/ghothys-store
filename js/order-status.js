/* ============================================================
   FRONTEND #3 - Cek Status Pesanan (Customer -> Status)
   ------------------------------------------------------------
   Fitur publik: customer masukkan Order ID (INV-...-...) miliknya
   untuk melihat status pesanan (Pending/Diproses/Selesai/
   Dibatalkan/Refund) + ringkasan order.

   Alur:
   1) Form publik "Cek Status Pesanan" (Order ID + tombol Cek).
   2) GET {relayUrl}/order-status?order_id=INV-...  -> PUBLIK,
      tanpa secret. Relay baca status dari tabel Airtable
      "Orders" (baris/kolom Status yang ditulis saat order
      dibuat, di-update owner di Airtable/panel owner).
   3) Parse { ok, found, order:{ orderId, game, uid, server,
      item, price, payment, status, time } } -> render kartu
      status; fallback pesan ramah bila relay mati / order
      tidak ketemu.

   Keamanan (mengikuti aturan site):
   - TANPA secret, TANPA localStorage admin. Form ini murni
     publik (Order ID milik customer sendiri). Hash/validasi
     Order ID minimal (INV-XXXXXXXX-XXXX) biar nggak ngirim
     string sembarang ke relay.
   - Kalau fetch gagal (relay down / CORS / 500) -> tampilkan
     pesan fallback, jangan kirim ulang berulang.
   ============================================================ */
(function () {
	'use strict';

	var RELAY_URL = '';
	var RELAY_SECRET = '';

	function loadRelayConfig() {
		var cfg = window.GHOTHYS_NOTIFY_CONFIG || {};
		RELAY_URL = (cfg.relayUrl || '').replace(/\/+$/, '');
		RELAY_SECRET = cfg.relaySecret || '';
	}

	function normalizeOrderId(raw) {
		return (raw || '').replace(/^https?:\/\/[^/]+\//, '').trim();
	}

	function isValidOrderId(value) {
		return /^INV-\d{8}-\d{4,8}$/.test(value);
	}

	function escapeHtml(s) {
		return String(s == null ? '' : s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function rupiah(n) {
		var v = parseInt(n, 10);
		return (isFinite(v) && v > 0) ? ('Rp ' + v.toLocaleString('id-ID')) : '-';
	}

	function statusBadge(status) {
		var s = (status || '').toLowerCase();
		var label = status || '-';
		var cls = 'os-badge os-badge-pending';
		var dot = 'rgba(245,158,11,0.9)';
		if (s.indexOf('selesai') === 0 || s.indexOf('success') === 0 || s.indexOf('complete') === 0) {
			cls = 'os-badge os-badge-done';
			dot = 'rgba(16,185,129,0.9)';
		} else if (s.indexOf('proses') === 0 || s.indexOf('diproses') === 0 || s.indexOf('process') === 0) {
			cls = 'os-badge os-badge-working';
			dot = 'rgba(59,130,246,0.9)';
		} else if (s.indexOf('batal') === 0 || s.indexOf('dibatalkan') === 0 || s.indexOf('cancel') === 0 || s.indexOf('refund') === 0) {
			cls = 'os-badge os-badge-cancel';
			dot = 'rgba(239,68,68,0.9)';
		}
		return '<span class="' + cls + '"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + dot + ';margin-right:6px;"></span>' + escapeHtml(label) + '</span>';
	}

	function renderOrderCard(order) {
		return [
			'<div class="os-card">',
			'<div class="os-card-head">',
			'<div>',
			'<div class="os-card-title">' + escapeHtml(order.orderId || '-') + '</div>',
			'<div class="os-card-sub">' + escapeHtml(order.game || '-') + ' \u2022 ' + escapeHtml(order.uid || '-') + (order.server ? ' \u2022 ' + escapeHtml(order.server) : '') + '</div>',
			'</div>',
			statusBadge(order.status),
			'</div>',
			'<div class="os-divider"></div>',
			'<div class="os-grid">',
			'<div class="os-field"><span class="os-label">Item</span><span class="os-value">' + escapeHtml(order.item || '-') + '</span></div>',
			'<div class="os-field"><span class="os-label">Harga</span><span class="os-value">' + rupiah(order.price) + '</span></div>',
			'<div class="os-field"><span class="os-label">Pembayaran</span><span class="os-value">' + escapeHtml(order.payment || '-') + '</span></div>',
			'<div class="os-field"><span class="os-label">Waktu</span><span class="os-value">' + escapeHtml(order.time || '-') + '</span></div>',
			'</div>',
			'<div class="os-note">Simpan Order ID ini. Hubungi CS Ghothys Store kalau butuh bantuan.</div>',
			'</div>'
		].join('');
	}

	function renderLayout(innerHtml) {
		return [
			'<section class="os-section" id="order-status-section">',
			'<div class="os-container">',
			'<div class="os-heading">',
			'<h2>Cek Status Pesanan</h2>',
			'<p>Masukkan Order ID kamu (contoh: <code>INV-26012026-0001</code>) untuk melihat status pesanan.</p>',
			'</div>',
			'<form class="os-form" id="order-status-form" novalidate>',
			'<div class="os-form-row">',
			'<input type="text" id="order-status-input" class="os-input" placeholder="Order ID (INV-...)" inputmode="text" autocomplete="off" maxlength="32" required>',
			'<button type="submit" class="os-btn" id="order-status-btn">Cek Status</button>',
			'</div>',
			'<div class="os-hint" id="order-status-hint"></div>',
			'</form>',
			'<div id="order-status-result">',
			innerHtml,
			'</div>',
			'</div>',
			'</section>'
		].join('');
	}

	function findInsertPoint() {
		var best = document.querySelector('#faq-section, #footer, footer, .faq-section, [id*="faq" i], [class*="faq" i]');
		if (best) return best;
		return document.body;
	}

	function injectSection() {
		if (document.getElementById('order-status-section')) return;
		var placeholder = '<div class="os-placeholder"><div class="os-pc-title">Belum ada form cek status.</div></div>';
		var sectionHtml = renderLayout(placeholder);
		var insertPoint = findInsertPoint();
		if (insertPoint === document.body) {
			insertPoint.insertAdjacentHTML('beforeend', sectionHtml);
		} else {
			insertPoint.insertAdjacentHTML('beforebegin', sectionHtml);
		}
	}

	function setBusy(busy) {
		var btn = document.getElementById('order-status-btn');
		if (!btn) return;
		btn.disabled = busy;
		btn.textContent = busy ? 'Mengecek...' : 'Cek Status';
	}

	function showHint(msg, isError) {
		var el = document.getElementById('order-status-hint');
		if (el) {
			el.textContent = msg || '';
			el.style.color = isError ? 'rgba(239,68,68,0.9)' : 'rgba(100,116,139,0.9)';
		}
	}

	function renderResult(html) {
		var el = document.getElementById('order-status-result');
		if (el) el.innerHTML = html;
	}

	async function cekStatusOrder(orderIdRaw) {
		var orderId = normalizeOrderId(orderIdRaw);
		loadRelayConfig();

		if (!RELAY_URL) {
			renderResult([
				'<div class="os-empty">',
				'<div class="os-empty-title">Layanan cek status belum aktif.</div>',
				'<div class="os-empty-sub">Relay belum dikonfigurasi. Coba lagi beberapa saat atau hubungi CS.</div>',
				'</div>'
			].join(''));
			return;
		}

		if (!orderId) {
			showHint('Masukkan Order ID dulu.', true);
			return;
		}
		if (!isValidOrderId(orderId)) {
			showHint('Format Order ID tidak valid. Contoh: INV-26012026-0001', true);
			return;
		}

		setBusy(true);
		showHint('');
		renderResult('<div class="os-empty"><div class="os-empty-title">Mengecek status pesanan\u2026</div></div>');

		var url = RELAY_URL + '/order-status?order_id=' + encodeURIComponent(orderId);
		try {
			var res = await fetch(urlTransfer(url));
			var data = await res.json().catch(function () { return null; });
			if (!data || typeof data !== 'object') {
				throw new Error('Respons relay tidak terbaca');
			}
			if (!data.ok) {
				throw new Error(data.error ? String(data.error) : 'Gagal memuat status');
			}
			if (!data.found || !data.order) {
				renderResult([
					'<div class="os-empty">',
					'<div class="os-empty-title">Order tidak ditemukan.</div>',
					'<div class="os-empty-sub">Periksa kembali Order ID kamu, atau hubungi CS kalau yakin sudah benar.</div>',
					'</div>'
				].join(''));
				return;
			}
			renderResult(renderOrderCard(data.order));
		} catch (e) {
			renderResult([
				'<div class="os-empty">',
				'<div class="os-empty-title">Gagal memuat status pesanan.</div>',
				'<div class="os-empty-sub">' + escapeHtml(e && e.message ? e.message : 'Terjadi kesalahan.') + '</div>',
				'<div class="os-empty-sub">Kalau terus gagal, hubungi CS Ghothys Store (WhatsApp/Telegram/Email di bawah).</div>',
				'</div>'
			].join(''));
		} finally {
			setBusy(false);
		}
	}

	function urlTransfer(u) {
		return u;
	}

	function bindForm() {
		var form = document.getElementById('order-status-form');
		var input = document.getElementById('order-status-input');
		if (!form || !input) return;
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			cekStatusOrder(input.value);
		});
	}

	function init() {
		loadRelayConfig();
		injectSection();
		bindForm();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

	window.cekStatusOrder = cekStatusOrder;
})();
