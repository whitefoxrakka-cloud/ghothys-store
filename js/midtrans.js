/* ============================================================
   GHOTHYS STORE - Pembayaran Online (Midtrans Snap)
   ------------------------------------------------------------
   Saklar pembayaran online sepenuhnya di server (worker). Endpoint
   GET /midtrans/config memberi tahu apakah aktif, mode sandbox atau
   produksi, dan Client Key yang dipakai Snap.js. Server Key TIDAK
   pernah sampai ke halaman ini.

   Kalau pembayaran online belum aktif, semua fungsi di sini aman
   dipanggil: tombol tidak muncul dan alur transfer manual (bukti
   bayar) tetap jalan seperti biasa.
   ============================================================ */
(function () {
	'use strict';

	var SNAP_PRODUKSI = 'https://app.midtrans.com/snap/snap.js';
	var SNAP_SANDBOX = 'https://app.sandbox.midtrans.com/snap/snap.js';

	var keadaan = { siap: false, aktif: false, produksi: false, clientKey: '' };
	var janjiConfig = null;

	function cfg() {
		return window.GHOTHYS_NOTIFY_CONFIG || {};
	}

	function relayUrl() {
		return String(cfg().relayUrl || '').replace(/\/+$/, '');
	}

	function muatConfig() {
		if (janjiConfig) return janjiConfig;
		var base = relayUrl();
		if (!base) {
			keadaan.siap = true;
			janjiConfig = Promise.resolve(keadaan);
			return janjiConfig;
		}
		janjiConfig = fetch(base + '/midtrans/config', { cache: 'no-store' })
			.then(function (r) { return r.json().catch(function () { return null; }); })
			.then(function (j) {
				if (j && j.ok) {
					keadaan.aktif = !!j.aktif;
					keadaan.produksi = !!j.produksi;
					keadaan.clientKey = String(j.clientKey || '');
				}
				keadaan.siap = true;
				return keadaan;
			})
			.catch(function () {
				keadaan.siap = true;
				return keadaan;
			});
		return janjiConfig;
	}

	function tersedia() {
		return keadaan.siap && keadaan.aktif && !!keadaan.clientKey;
	}

	function muatSnap() {
		return new Promise(function (resolve, reject) {
			if (window.snap && typeof window.snap.pay === 'function') { resolve(); return; }
			if (!keadaan.clientKey) { reject(new Error('Client Key Midtrans belum tersedia')); return; }
			var s = document.createElement('script');
			s.setAttribute('data-client-key', keadaan.clientKey);
			s.src = keadaan.produksi ? SNAP_PRODUKSI : SNAP_SANDBOX;
			s.onload = function () { resolve(); };
			s.onerror = function () { reject(new Error('Gagal memuat Snap.js Midtrans')); };
			document.head.appendChild(s);
		});
	}

	function mintaToken(orderId, uid) {
		var base = relayUrl();
		if (!base) return Promise.reject(new Error('Relay belum dikonfigurasi'));
		return fetch(base + '/midtrans/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ order_id: orderId, uid: uid })
		}).then(function (r) {
			return r.json().catch(function () { return null; });
		}).then(function (j) {
			if (!j || !j.ok || !j.token) {
				throw new Error((j && j.error) || 'Gagal membuat transaksi pembayaran');
			}
			return j;
		});
	}

	/* Buka popup Snap. Selalu selesai (resolve) apa pun hasilnya,
	   supaya pemanggil bisa mengaktifkan tombolnya kembali. */
	function bayar(orderId, uid, opsi) {
		opsi = opsi || {};
		return muatConfig().then(function () {
			if (!tersedia()) throw new Error('Pembayaran online belum aktif');
			return mintaToken(orderId, uid);
		}).then(function (j) {
			return muatSnap().then(function () {
				return new Promise(function (resolve) {
					window.snap.pay(j.token, {
						onSuccess: function (res) { if (opsi.onSuccess) opsi.onSuccess(res, j); resolve({ ok: true, hasil: res }); },
						onPending: function (res) { if (opsi.onPending) opsi.onPending(res, j); resolve({ ok: true, pending: true, hasil: res }); },
						onError: function (res) { if (opsi.onError) opsi.onError(res, j); resolve({ ok: false, hasil: res }); },
						onClose: function () { if (opsi.onClose) opsi.onClose(j); resolve({ ok: false, ditutup: true }); }
					});
				});
			});
		});
	}

	/* Sisipkan kotak "Bayar Online" di layar pembayaran. Kotak
	   transfer manual dicari lewat #pay-account (ada di dalamnya),
	   jadi tidak perlu mengubah struktur halaman. */
	function sisipkanTombolBayar(opsi) {
		opsi = opsi || {};
		var acct = document.getElementById('pay-account');
		var box = acct ? acct.parentElement : null;
		if (!box || !box.parentElement) return;
		if (document.getElementById('pay-midtrans-box')) return;
		var wrap = document.createElement('div');
		wrap.id = 'pay-midtrans-box';
		wrap.style.cssText = 'background:rgba(109,40,217,.08); border:1px solid var(--border-color); border-radius:14px; padding:16px; margin-bottom:14px; text-align:center;';
		var btn = document.createElement('button');
		btn.type = 'button';
		btn.id = 'pay-midtrans-btn';
		btn.textContent = 'Bayar Online (QRIS / E-Wallet)';
		btn.style.cssText = 'width:100%; padding:14px; border:none; border-radius:10px; background:#6d28d9; color:#fff; font-weight:800; cursor:pointer;';
		var note = document.createElement('div');
		note.className = 'text-xs mt-2';
		note.style.color = 'var(--text-secondary)';
		note.textContent = 'Otomatis dan langsung terverifikasi. Atau transfer manual di bawah.';
		var statusEl = document.createElement('div');
		statusEl.id = 'pay-midtrans-status';
		statusEl.className = 'text-xs mt-2';
		statusEl.style.color = 'var(--text-secondary)';
		btn.onclick = function () {
			btn.disabled = true;
			statusEl.textContent = 'Menyiapkan pembayaran...';
			bayar(opsi.orderId, opsi.uid, {
				onSuccess: function () {
					statusEl.textContent = 'Pembayaran berhasil. Status pesanan akan diperbarui.';
					if (opsi.onSukses) opsi.onSukses();
				},
				onPending: function () { statusEl.textContent = 'Menunggu pembayaran diselesaikan.'; },
				onError: function () { statusEl.textContent = 'Pembayaran gagal. Coba lagi atau transfer manual.'; },
				onClose: function () { statusEl.textContent = 'Pembayaran ditutup. Bisa dibuka lagi kapan saja.'; }
			}).catch(function (e) {
				statusEl.textContent = (e && e.message) || 'Gagal menyiapkan pembayaran.';
			}).then(function () {
				btn.disabled = false;
			});
		};
		wrap.appendChild(btn);
		wrap.appendChild(note);
		wrap.appendChild(statusEl);
		box.parentElement.insertBefore(wrap, box);
	}

	window.MidtransBayar = {
		muatConfig: muatConfig,
		tersedia: tersedia,
		keadaan: keadaan,
		mintaToken: mintaToken,
		bayar: bayar,
		sisipkanTombolBayar: sisipkanTombolBayar
	};

	muatConfig();
})();
