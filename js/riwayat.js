/* ============================================================
   FASE 3 - RIWAYAT PESANAN
   ------------------------------------------------------------
   Satu halaman rapi untuk pengguna yang sudah login:
   - daftar order milik akun itu (dari localStorage order)
   - badge status ASLI dari server (relay /order-status), bukan
     status lokal yang selalu "Pending"
   - filter status (Semua/Pending/Diproses/Selesai/Dibatalkan)
   - cari berdasarkan Order ID atau nama game
   - tombol salin Order ID, buka di Cek Status, dan tautkan
     order lama yang belum punya data akun

   Catatan keamanan: endpoint /order-status sudah PUBLIK dan
   tanpa secret (sama seperti fitur Cek Status yang ada). Tidak
   ada token/kunci yang ditulis di file ini.
   ============================================================ */
(function () {
	'use strict';

	var KUNCI_CACHE = 'ghothys_riwayat_status';
	var TTL_DETIK = 90;          /* status dianggap segar 90 detik */
	var MAKS_SINKRON = 15;      /* paling banyak order dicek per sinkron */
	var JEDA_MS = 350;          /* jeda antar permintaan ke relay */
	var AUTO_MS = 60000;        /* jeda sinkron otomatis */

	var state = {
		filter: 'semua',
		cari: '',
		sinkron: false,
		relayHidup: true,
		terakhirSinkron: 0,
		timer: null
	};

	/* ---------- alat bantu ---------- */

	function escapeHtml(s) {
		return String(s == null ? '' : s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function rp(n) {
		var v = Number(n);
		return isFinite(v) && v > 0 ? ('Rp ' + Math.floor(v).toLocaleString('id-ID')) : '-';
	}

	function waktuPakai(iso, cadangan) {
		var d = iso ? new Date(iso) : null;
		if (!d || isNaN(d.getTime())) return String(caduan || '-');
		try {
			return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
		} catch (e) {
			return String(caduan || '-');
		}
	}

	/* Ubah status server (Pending/Diproses/Success/Selesai/Cancel/
	   Dibatalkan/Refund) menjadi 4 kelompok yang dipakai filter. */
	function kelompokStatus(s) {
		var t = String(s == null ? '' : s).toLowerCase().trim();
		if (t.indexOf('selesai') === 0 || t.indexOf('success') === 0 || t.indexOf('complete') === 0 || t.indexOf('berhasil') === 0) return 'selesai';
		if (t.indexOf('proses') === 0 || t.indexOf('diproses') === 0 || t.indexOf('process') === 0) return 'diproses';
		if (t.indexOf('batal') === 0 || t.indexOf('dibatalkan') === 0 || t.indexOf('cancel') === 0 || t.indexOf('refund') === 0) return 'batal';
		return 'pending';
	}

	/* Peta kelompok -> kelas CSS yang sudah dipakai order-status.css,
	   supaya badge riwayat dan badge Cek Status terlihat sama. */
	var KELAS_BADGE = {
		pending: 'os-badge-pending',
		diproses: 'os-badge-working',
		selesai: 'os-badge-done',
		batal: 'os-badge-cancel'
	};

	function badgeStatus(s) {
		var teks = String(s == null ? '' : s).trim() || 'Pending';
		var kelas = KELAS_BADGE[kelompokStatus(teks)] || 'os-badge-pending';
		return '<span class="os-badge ' + kelas + '"><span class="os-dot-tebal"></span>' + escapeHtml(teks) + '</span>';
	}

	function relayUrl() {
		var cfg = window.GHOTHYS_NOTIFY_CONFIG || {};
		return String(cfg.relayUrl || '').replace(/\/+$/, '');
	}

	/* ---------- data ---------- */

	function semuaOrder() {
		if (typeof window.getAllOrders === 'function') {
			try { return window.getAllOrders() || []; } catch (e) { /* lanjut ke localStorage */ }
		}
		var kunci = window.NOTIFICATION_STORAGE_KEY || 'ghothys_orders';
		try { return JSON.parse(localStorage.getItem(kunci) || '[]'); } catch (e) { return []; }
	}

	function orderMilikSaya() {
		var u = window.currentUser;
		if (!u) return [];
		var email = String(u.email || '').toLowerCase();
		return semuaOrder()
			.filter(function (o) {
				if (!o || !o.id) return false;
				var e = String(o.ownerEmail || '').toLowerCase();
				/* Order lama (sebelum ada ownerEmail) tetap ditampilkan,
				   tapi ditandai supaya bisa ditautkan ke akun. */
				return e ? e === email : true;
			})
			.sort(function (a, b) {
				var ta = new Date(a.createdAt || 0).getTime() || 0;
				var tb = new Date(b.createdAt || 0).getTime() || 0;
				return tb - ta;
			});
	}

	function bacaCache() {
		try {
			var c = JSON.parse(localStorage.getItem(KUNCI_CACHE) || '{}');
			return (c && typeof c === 'object') ? c : {};
		} catch (e) { return {}; }
	}

	function tulisCache(cache) {
		try { localStorage.setItem(KUNCI_CACHE, JSON.stringify(cache)); } catch (e) { /* abaikan */ }
	}

	function statusOrder(order, cache) {
		var c = cache && cache[order.id];
		if (c && c.status) return c.status;
		return order.status || 'Pending';
	}

	function perluSinkron(order, cache) {
		var c = cache && cache[order.id];
		if (!c || !c.status) return true;
		var umur = (Date.now() - (c.pada || 0)) / 1000;
		if (umur < TTL_DETIK) return false;
		/* Cache masih segar -> jangan tanya lagi. Status final juga
		   tidak perlu ditanyakan. Order yang belum terdaftar di
		   server tetap berstatus Pending, jadi otomatis dicoba lagi. */
		return kelompokStatus(c.status) === 'pending' || kelompokStatus(c.status) === 'diproses';
	}

	/* ---------- penyaringan ---------- */

	function daftarTersaring(daftar) {
		var q = state.cari.toLowerCase().trim();
		return daftar.filter(function (o) {
			if (state.filter !== 'semua' && kelompokStatus(statusOrder(o, bacaCache())) !== state.filter) return false;
			if (!q) return true;
			var kolom = [o.id, o.game, o.item, o.uid, o.server, o.payment].join(' ').toLowerCase();
			return kolom.indexOf(q) > -1;
		});
	}

	/* ---------- tampilan ---------- */

	function chipFilter(grup, label, jumlah) {
		return '<button type="button" class="filter-chip' + (state.filter === grup ? ' aktif' : '') + '" data-rg-filter="' + grup + '">' +
			escapeHtml(label) + ' <span class="rg-chip-angka">' + jumlah + '</span></button>';
	}

	function hitungKelompok(daftar, cache) {
		var k = { pending: 0, diproses: 0, selesai: 0, batal: 0 };
		daftar.forEach(function (o) {
			var g = kelompokStatus(statusOrder(o, cache));
			if (k[g] === undefined) k[g] = 0;
			k[g] += 1;
		});
		return k;
	}

	function kartuOrder(o, cache) {
		var tanpaAkun = !o.ownerEmail;
		var status = statusOrder(o, cache);
		var aksi = [
			'<button type="button" class="rg-btn" data-rg-salin="' + escapeHtml(o.id) + '">Salin ID</button>',
			'<button type="button" class="rg-btn" data-rg-buka="' + escapeHtml(o.id) + '">Buka status</button>'
		];
		if (tanpaAkun) {
			aksi.push('<button type="button" class="rg-btn rg-btn-utama" data-rg-tautkan="' + escapeHtml(o.id) + '">Tautkan ke akun</button>');
		}
		return [
			'<div class="rg-item">',
			'<div class="rg-item-atas">',
			'<div class="rg-item-id">' + escapeHtml(o.id) + '</div>',
			badgeStatus(status),
			'</div>',
			'<div class="rg-item-judul">' + escapeHtml(o.game || '-') + '</div>',
			'<div class="rg-item-detail">Item: ' + escapeHtml(o.item || '-') +
			(o.uid ? ' &middot; ID: ' + escapeHtml(o.uid) : '') +
			(o.server ? ' &middot; Server: ' + escapeHtml(o.server) : '') + '</div>',
			'<div class="rg-item-detail">Bayar: ' + escapeHtml(o.payment || '-') + ' &middot; ' + escapeHtml(waktuPakai(o.createdAt, o.timestamp)) + '</div>',
			(tanpaAkun ? '<div class="rg-item-catatan">Order ini dibuat sebelum ada pencatatan akun, jadi ditampilkan untuk semua akun di perangkat ini.</div>' : ''),
			'<div class="rg-item-bawah">',
			'<div class="rg-item-harga">' + rp(o.price) + '</div>',
			'<div class="rg-aksi">' + aksi.join('') + '</div>',
			'</div>',
			'</div>'
		].join('');
	}

	function barisRingkas(daftar, cache) {
		var k = hitungKelompok(daftar, cache);
		var aktif = k.pending + k.diproses;
		var total = daftar.reduce(function (s, o) { return s + (Number(o.price) || 0); }, 0);
		return [
			'<div class="rg-ringkas">',
			'<div class="rg-ringkas-kotak"><span class="rg-ringkas-angka">' + daftar.length + '</span><span class="rg-ringkas-label">Total order</span></div>',
			'<div class="rg-ringkas-kotak"><span class="rg-ringkas-angka">' + aktif + '</span><span class="rg-ringkas-label">Sedang berjalan</span></div>',
			'<div class="rg-ringkas-kotak"><span class="rg-ringkas-angka">' + k.selesai + '</span><span class="rg-ringkas-label">Selesai</span></div>',
			'<div class="rg-ringkas-kotak"><span class="rg-ringkas-angka rg-ringkas-angka-kecil">' + rp(total) + '</span><span class="rg-ringkas-label">Total belanja</span></div>',
			'</div>'
		].join('');
	}

	function barisSinkron() {
		var teks;
		if (state.sinkron) {
			teks = 'Mengambil status terbaru dari server...';
		} else if (!state.relayHidup) {
			teks = 'Status dari server tidak bisa dimuat. Status di bawah memakai catatan terakhir di perangkat ini.';
		} else if (state.terakhirSinkron) {
			teks = 'Status terakhir diperiksa ' + waktuPakai(new Date(state.terakhirSinkron).toISOString(), '') + '.';
		} else {
			teks = 'Status diambil dari server. Tekan "Perbarui status" untuk memeriksa ulang.';
		}
		return '<div class="rg-sinkron"><span class="rg-sinkron-teks">' + escapeHtml(teks) + '</span>' +
			'<button type="button" class="rg-link" data-rg-perbarui' + (state.sinkron ? ' disabled' : '') + '>Perbarui status</button></div>';
	}

	/* Isi daftar + chip + ringkasan. Dipakai ulang saat searching
	   supaya kotak pencarian tidak ikut terpasang ulang (fokus &
	   posisi kursor tetap utuh). */
	function perbaruiBagianDinamis() {
		var wadahDaftar = document.getElementById('rg-daftar-wadah');
		var wadahChip = document.getElementById('rg-chip-wadah');
		var wadahRingkas = document.getElementById('rg-ringkas-wadah');
		if (!wadahDaftar || !wadahChip || !wadahRingkas) return false;

		var semua = orderMilikSaya();
		var cache = bacaCache();
		var k = hitungKelompok(semua, cache);

		wadahRingkas.innerHTML = barisRingkas(semua, cache);
		wadahChip.innerHTML = [
			chipFilter('semua', 'Semua', semua.length),
			chipFilter('pending', 'Pending', k.pending),
			chipFilter('diproses', 'Diproses', k.diproses),
			chipFilter('selesai', 'Selesai', k.selesai),
			chipFilter('batal', 'Dibatalkan', k.batal)
		].join('');

		var tampil = daftarTersaring(semua);
		wadahDaftar.innerHTML = tampil.length
			? '<div class="rg-daftar">' + tampil.map(function (o) { return kartuOrder(o, cache); }).join('') + '</div>'
			: '<div class="rg-kosong"><div class="rg-kosong-judul">Tidak ada yang cocok</div>' +
				'<div class="rg-kosong-sub">Ubah kata kunci pencarian atau pilih filter lain.</div></div>';
		return true;
	}

	/* Kosongkan wadah dinamis supaya tidak ada sisa order lama
	   yang masih tertinggal di layar. */
	function kosongkanWadahDinamis() {
		['rg-daftar-wadah', 'rg-chip-wadah', 'rg-ringkas-wadah'].forEach(function (id) {
			var w = document.getElementById(id);
			if (w) w.innerHTML = '';
		});
	}

	function render() {
		var wadah = document.getElementById('transactions-container');
		if (!wadah) return;

		if (!window.currentUser) {
			kosongkanWadahDinamis();
			wadah.innerHTML = '<div class="rg-kosong"><div class="rg-kosong-judul">Login diperlukan</div>' +
				'<div class="rg-kosong-sub">Silakan login untuk melihat riwayat pesanan Anda.</div>' +
				'<button type="button" class="rg-btn rg-btn-utama" data-rg-login="1">Login</button></div>';
			return;
		}

		if (!orderMilikSaya().length) {
			kosongkanWadahDinamis();
			wadah.innerHTML = '<div class="rg-kosong"><div class="rg-kosong-judul">Belum ada pesanan</div>' +
				'<div class="rg-kosong-sub">Semua order yang Anda buat akan muncul di sini lengkap dengan statusnya.</div>' +
				'<button type="button" class="rg-btn rg-btn-utama" data-rg-beranda="1">Mulai top up</button></div>';
			return;
		}

		wadah.innerHTML = [
			'<div class="rg-kartu">',
			'<div class="rg-kartu-kepala">',
			'<div><h3 class="rg-judul">Riwayat Pesanan</h3>',
			'<p class="rg-subjudul">Status dibaca langsung dari server, jadi selalu yang terbaru.</p></div>',
			barisSinkron(),
			'</div>',
			'<div id="rg-ringkas-wadah"></div>',
			'<div class="rg-kendali">',
			'<div class="rg-chip" id="rg-chip-wadah"></div>',
			'<div class="rg-cari"><input type="search" id="rg-cari-input" class="rg-input" placeholder="Cari Order ID atau nama game..." value="' + escapeHtml(state.cari) + '" autocomplete="off"></div>',
			'</div>',
			'<div id="rg-daftar-wadah"></div>',
			'</div>'
		].join('');

		perbaruiBagianDinamis();
	}

	/* ---------- status dari server ---------- */

	function jeda(ms) {
		return new Promise(function (res) { setTimeout(res, ms); });
	}

	async function sinkron(paksa) {
		if (state.sinkron) return;
		var base = relayUrl();
		var daftar = orderMilikSaya().slice(0, MAKS_SINKRON);
		if (!base || !daftar.length) return;

		var cache = bacaCache();
		var target = paksa ? daftar : daftar.filter(function (o) { return perluSinkron(o, cache); });
		if (!target.length) { render(); return; }

		state.sinkron = true;
		render();
		var berubah = false;

		for (var i = 0; i < target.length; i++) {
			var id = target[i].id;
			var uidSinkron = String(target[i].uid == null ? '' : target[i].uid).trim();
			try {
				var res = await fetch(base + '/order-status?order_id=' + encodeURIComponent(id) + '&uid=' + encodeURIComponent(uidSinkron));
				var data = await res.json().catch(function () { return null; });
				if (data && data.ok === true && data.skipped) {
					/* Relay hidup tapi Airtable belum dikonfigurasi. */
					state.relayHidup = false;
					break;
				}
				if (data && data.ok && data.found && data.order) {
					var baru = String(data.order.status || '').trim() || 'Pending';
					var lama = cache[id];
					if (!lama || lama.status !== baru) berubah = true;
					cache[id] = { status: baru, pada: Date.now() };
				} else if (data && data.ok && data.found === false) {
					/* Order belum masuk ke Airtable (mis. relay gagal saat order dibuat).
					   Tandai supaya dicoba lagi nanti, dan tetap simpan penandanya. */
					if (!cache[id]) {
						cache[id] = { status: statusOrder(target[i], cache), pada: Date.now(), belum: true };
						berubah = true;
					}
				}
			} catch (e) {
				state.relayHidup = false;
				break;
			}
			await jeda(JEDA_MS);
		}

		if (berubah) tulisCache(cache);
		state.sinkron = false;
		state.terakhirSinkron = Date.now();
		render();
	}

	/* ---------- tindakan ---------- */

	function salin(teks) {
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(teks).then(function () {
				window.showToast ? window.showToast('Order ID disalin', teks) : null;
			}).catch(function () { salinCadangan(teks); });
			return;
		}
		salinCadangan(teks);
	}

	function salinCadangan(teks) {
		var s = document.createElement('textarea');
		s.value = teks;
		s.setAttribute('readonly', 'readonly');
		s.style.position = 'fixed';
		s.style.opacity = '0';
		document.body.appendChild(s);
		s.select();
		try { document.execCommand('copy'); } catch (e) { /* abaikan */ }
		document.body.removeChild(s);
		if (window.showToast) window.showToast('Order ID disalin', teks);
	}

	function bukaDiStatus(id) {
		var daftar = semuaOrder();
		var pesanan = null;
		for (var i = 0; i < daftar.length; i++) {
			if (daftar[i] && daftar[i].id === id) { pesanan = daftar[i]; break; }
		}
		var uid = (pesanan && pesanan.uid) ? String(pesanan.uid) : '';
		var kolom = document.getElementById('order-status-input');
		if (kolom) kolom.value = id;
		var kolomUid = document.getElementById('order-status-uid');
		if (kolomUid) kolomUid.value = uid;
		if (typeof window.cekStatusOrder === 'function') {
			window.cekStatusOrder(id, uid, false);
		}
		var bagian = document.getElementById('order-status-section');
		if (bagian) bagian.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	function tautkan(id) {
		var u = window.currentUser;
		if (!u) return;
		var kunci = window.NOTIFICATION_STORAGE_KEY || 'ghothys_orders';
		var daftar = semuaOrder();
		var ketemu = false;
		daftar = daftar.map(function (o) {
			if (o && o.id === id && !o.ownerEmail) {
				ketemu = true;
				o.ownerEmail = u.email;
				o.ownerUsername = u.username || '';
			}
			return o;
		});
		if (!ketemu) return;
		try { localStorage.setItem(kunci, JSON.stringify(daftar)); } catch (e) { /* abaikan */ }
		if (window.showToast) window.showToast('Order ditautkan', id + ' kini tercatat di akun ' + (u.username || u.email));
		render();
	}

	/* ---------- pemasangan ---------- */

	function pasangPeristiwa() {
		var wadah = document.getElementById('transactions-container');
		if (!wadah || wadah.dataset.rgPasang === '1') return;
		wadah.dataset.rgPasang = '1';

		wadah.addEventListener('click', function (e) {
			var t = e.target;
			if (!t || !t.getAttribute) return;

			var f = t.getAttribute('data-rg-filter');
			if (f) { state.filter = f; perbaruiBagianDinamis(); return; }

			if (t.getAttribute('data-rg-perbarui') !== null) { sinkron(true); return; }
			if (t.getAttribute('data-rg-salin')) { salin(t.getAttribute('data-rg-salin')); return; }
			if (t.getAttribute('data-rg-buka')) { bukaDiStatus(t.getAttribute('data-rg-buka')); return; }
			if (t.getAttribute('data-rg-tautkan')) { tautkan(t.getAttribute('data-rg-tautkan')); return; }
			if (t.getAttribute('data-rg-login')) { window.openLoginModal(); return; }
			if (t.getAttribute('data-rg-beranda')) { window.navigateTo('home-page'); return; }
		});

		wadah.addEventListener('input', function (e) {
			if (!e.target || e.target.id !== 'rg-cari-input') return;
			state.cari = e.target.value || '';
			/* Hanya daftar/chip/ringkasan yang diperbarui, jadi
			   kotak pencarian tidak loses focus saat mengetik. */
			perbaruiBagianDinamis();
		});
	}

	function halamanAktif() {
		var p = document.getElementById('transactions-page');
		return !!(p && p.classList.contains('active'));
	}

	function mulaiAuto() {
		if (state.timer !== null) return;
		state.timer = setInterval(function () {
			if (document.hidden) return;
			if (state.sinkron) return;
			if (!halamanAktif()) return;
			if (!window.currentUser) return;
			var adaYangBerjalan = orderMilikSaya().some(function (o) {
				return perluSinkron(o, bacaCache());
			});
			if (adaYangBerjalan) sinkron(false);
		}, AUTO_MS);
	}

	function init() {
		pasangPeristiwa();
		mulaiAuto();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

	/* Dipakai router untuk membuka halaman riwayat. */
	window.renderRiwayat = function () {
		pasangPeristiwa();
		state.sinkron = false;
		render();
		/* Ambil status terbaru dari server saat halaman dibuka. */
		sinkron(false);
	};
})();
