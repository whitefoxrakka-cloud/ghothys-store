/* Order Notification System - multi-channel (Discord, Email via Formspree, Telegram via relay) */
(function(){
	// Storage key for orders
	window.NOTIFICATION_STORAGE_KEY = 'ghothys_orders';

	/**
	 * Generate Order ID in format: INV-YYYYMMDD-XXXX
	 * @returns {string} Order ID
	 */
	function generateOrderId() {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const dateStr = `${year}${month}${day}`;

		// Get today's order count
		const orders = getOrdersFromStorage();
		const todayOrders = orders.filter(o => {
			const createdAt = new Date(o.createdAt);
			const createdDate = `${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}`;
			return createdDate === dateStr;
		});

		const sequence = String(todayOrders.length + 1).padStart(4, '0');
		return `INV-${dateStr}-${sequence}`;
	}

	/**
	 * Generate Indonesian formatted timestamp
	 * @returns {string} Formatted timestamp (e.g., "17 Juli 2026 20:35 WIB")
	 */
	function generateTimestamp() {
		const now = new Date();
		const months = [
			'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
			'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
		];

		const day = now.getDate();
		const month = months[now.getMonth()];
		const year = now.getFullYear();
		const hour = String(now.getHours()).padStart(2, '0');
		const minute = String(now.getMinutes()).padStart(2, '0');

		return `${day} ${month} ${year} ${hour}:${minute} WIB`;
	}

	/**
	 * Validate form fields
	 * @param {Object} formData Form data to validate
	 * @returns {Object} Validation result {valid: boolean, error: string}
	 */
	function validateFormData(formData) {
		if (!formData.game || formData.game.trim() === '') {
			return { valid: false, error: 'Game harus dipilih' };
		}
		if (!formData.uid || formData.uid.trim() === '') {
			return { valid: false, error: 'User ID harus diisi' };
		}
		if (!formData.server || formData.server.trim() === '') {
			return { valid: false, error: 'Server/Zone ID harus diisi' };
		}
		if (!formData.item || formData.item.trim() === '') {
			return { valid: false, error: 'Paket harus dipilih' };
		}
		if (!formData.payment || formData.payment.trim() === '') {
			return { valid: false, error: 'Metode Pembayaran harus dipilih' };
		}
		return { valid: true };
	}

	/**
	 * Get all orders from localStorage
	 * @returns {Array} Array of orders
	 */
	function getOrdersFromStorage() {
		try {
			const stored = localStorage.getItem(window.NOTIFICATION_STORAGE_KEY);
			return stored ? JSON.parse(stored) : [];
		} catch (e) {
			console.error('[ORDERS] Error reading from localStorage:', e);
			return [];
		}
	}

	/**
	 * Save orders to localStorage
	 * @param {Array} orders Array of orders to save
	 */
	function saveOrdersToStorage(orders) {
		try {
			localStorage.setItem(window.NOTIFICATION_STORAGE_KEY, JSON.stringify(orders));
		} catch (e) {
			console.error('[ORDERS] Error writing to localStorage:', e);
		}
	}

	/**
	 * Create and save order object
	 * @param {Object} orderData Order data
	 * @returns {Object} Created order with ID and timestamp
	 */
	window.createOrder = function(orderData) {
		const order = {
			id: generateOrderId(),
			game: orderData.game,
			uid: orderData.uid,
			server: orderData.server,
			item: orderData.item || orderData.product || '',
			price: orderData.price,
			payment: orderData.payment,
			customerName: orderData.customerName || window.currentUser?.nickname || 'Customer',
			customerPhone: orderData.customerPhone || '',
			createdAt: new Date().toISOString(),
			timestamp: generateTimestamp(),
			status: 'Pending'
		};

		const orders = getOrdersFromStorage();
		orders.push(order);
		saveOrdersToStorage(orders);

		console.log('[ORDER CREATED]', order.id, order);
		return order;
	};

	/**
	 * Format order summary into a plain multiline message
	 * @param {Object} order Order object
	 * @returns {string} Formatted message
	 */
	function formatOrderSummary(order) {
		const lines = [
			'ORDER BARU - GHOTHYS STORE',
			'--------------------------------',
			`Order ID : ${order.id}`,
			`Game     : ${order.game}`,
			`UID      : ${order.uid}`,
			`Server   : ${order.server}`,
			`Item     : ${order.item}`,
			`Harga    : ${order.price ? ('Rp ' + Number(order.price).toLocaleString('id-ID')) : '-'}`,
			`Bayar    : ${order.payment}`,
			`Nama     : ${order.customerName || '-'}`,
			`Waktu    : ${order.timestamp}`,
			'Status   : Pending',
			'--------------------------------',
			'Ghothys Store'
		];
		return lines.join('\n');
	}

	/**
	 * Send to Discord webhook
	 * @param {Object} order Order object
	 * @param {string} webhookUrl Discord webhook URL
	 * @returns {Promise<Object>} Result
	 */
	async function sendToDiscord(order, webhookUrl) {
		if (!webhookUrl || !/^https:\/\//.test(webhookUrl)) {
			return { success: false, skipped: true, channel: 'discord', reason: 'no webhook configured' };
		}
		try {
			const content = formatOrderSummary(order);
			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content, username: 'Ghothys Store - Order' })
			});
			if (!response.ok) throw new Error('Discord HTTP ' + response.status);
			console.log('[DISCORD SENT]', order.id);
			return { success: true, channel: 'discord' };
		} catch (error) {
			console.error('[DISCORD FAILED]', order.id, error);
			return { success: false, channel: 'discord', error: error.message };
		}
	}

	/**
	 * Send order to the secure relay (keeps Discord webhook &
	 * Telegram token server-side; relay only forwards valid orders)
	 * @param {Object} order Order object
	 * @param {string} relayUrl Relay URL (Cloudflare Worker)
	 * @param {boolean} retry true untuk percobaan kedua
	 * @returns {Promise<Object>} Result
	 */
	async function sendToRelay(order, relayUrl, retry) {
		if (!relayUrl || !/^https:\/\//.test(relayUrl)) {
			return { success: false, skipped: true, channel: 'relay', reason: 'no relay configured' };
		}
		try {
			const guard = window.__ghothysOrderGuard || {};
			const honeypotField = document.querySelector('#topup-form input[name="website"]');
			const payload = {
				source: 'ghothys-store',
				order_id: order.id,
				game: order.game,
				uid: order.uid,
				server: order.server,
				item: order.item,
				price: Number(order.price) || 0,
				payment: order.payment,
				customer: order.customerName || '-',
				time: order.timestamp,
				summary: formatOrderSummary(order),
				/* Anti-spam: kolom jebakan (bot biasa mengisinya) + waktu
				   form dibuka, supaya order instan ditolak worker. */
				hp: honeypotField ? String(honeypotField.value || '') : '',
				t: guard.t || 0
			};
			const headers = { 'Content-Type': 'application/json' };
			const response = await fetch(relayUrl, {
				method: 'POST',
				headers: headers,
				body: JSON.stringify(payload)
			});
			if (!response.ok) {
				let detail = '';
				try { const j = await response.json(); detail = j.error || ''; } catch (e) {}
				/* Kena rate limit atau terkirim terlalu cepat: coba lagi
				   sekali setelah jeda (kasus pembeli asli, bukan bot). */
				if (!retry && (response.status === 429 || /terlalu cepat/i.test(detail))) {
					await new Promise((resolve) => setTimeout(resolve, 3200));
					payload.t = Date.now() - 4000;
					const second = await fetch(relayUrl, {
						method: 'POST',
						headers: headers,
						body: JSON.stringify(payload)
					});
					if (second.ok) {
						console.log('[RELAY SENT setelah percobaan ulang]', order.id);
						return { success: true, channel: 'relay' };
					}
				}
				throw new Error('Relay HTTP ' + response.status + (detail ? ' (' + detail + ')' : ''));
			}
			console.log('[RELAY SENT]', order.id);
			return { success: true, channel: 'relay' };
		} catch (error) {
			console.error('[RELAY FAILED]', order.id, error);
			return { success: false, channel: 'relay', error: error.message };
		}
	}

	/**
	 * Send to email via Formspree
	 * @param {Object} order Order object
	 * @param {string} formspreeId Formspree form ID (e.g. "xxxxxabc")
	 * @returns {Promise<Object>} Result
	 */
	async function sendToEmail(order, formspreeId) {
		if (!formspreeId) {
			return { success: false, skipped: true, channel: 'email', reason: 'no formspree id configured' };
		}
		try {
			const endpoint = 'https://formspree.io/f/' + formspreeId;
			const payload = {
				_subject: 'Order Baru ' + order.id,
				order_id: order.id,
				game: order.game,
				uid: order.uid,
				server: order.server,
				item: order.item,
				price: order.price ? ('Rp ' + Number(order.price).toLocaleString('id-ID')) : '-',
				payment: order.payment,
				customer: order.customerName || '-',
				time: order.timestamp,
				message: formatOrderSummary(order)
			};
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!response.ok) throw new Error('Formspree HTTP ' + response.status);
			console.log('[EMAIL SENT]', order.id);
			return { success: true, channel: 'email' };
		} catch (error) {
			console.error('[EMAIL FAILED]', order.id, error);
			return { success: false, channel: 'email', error: error.message };
		}
	}

	/**
	 * Send to Telegram via secure relay
	 * @param {Object} order Order object
	 * @param {string} relayUrl Relay URL (keeps bot token server-side)
	 * @returns {Promise<Object>} Result
	 */
	async function sendToTelegram(order, relayUrl) {
		if (!relayUrl || !/^https:\/\//.test(relayUrl)) {
			return { success: false, skipped: true, channel: 'telegram', reason: 'no telegram relay configured' };
		}
		try {
			const payload = {
				source: 'ghothys-store',
				order_id: order.id,
				game: order.game,
				uid: order.uid,
				server: order.server,
				item: order.item,
				price: Number(order.price) || 0,
				payment: order.payment,
				customer: order.customerName || '-',
				time: order.timestamp,
				summary: formatOrderSummary(order)
			};
			const response = await fetch(relayUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!response.ok) throw new Error('Relay HTTP ' + response.status);
			console.log('[TELEGRAM SENT]', order.id);
			return { success: true, channel: 'telegram' };
		} catch (error) {
			console.error('[TELEGRAM FAILED]', order.id, error);
			return { success: false, channel: 'telegram', error: error.message };
		}
	}

	/**
	 * Multicast an order to every configured notification channel.
	 * Never blocks the checkout flow; runs fire-and-forget.
	 * @param {Object} order Order object
	 * @returns {Promise<Array>} Channel results
	 */
	window.sendOrderNotifications = async function(order) {
		if (!order) return [];
		const cfg = (window.GHOTHYS_NOTIFY_CONFIG) ? window.GHOTHYS_NOTIFY_CONFIG : {};
		const results = [];
		// Preferred: secure relay (menyembunyikan webhook/token; hanya order valid yang diteruskan)
		if (cfg.relayUrl && /^https:\/\//.test(cfg.relayUrl)) {
			results.push(await sendToRelay(order, cfg.relayUrl, false));
		} else {
			// Fallback: direct channels (webhook stays in the repo, less safe)
			results.push(await sendToDiscord(order, cfg.discordWebhook));
			results.push(await sendToTelegram(order, cfg.telegramRelay));
		}
		// Email via Formspree works alongside the relay (form ID is public-safe)
		results.push(await sendToEmail(order, cfg.formspreeId));
		const delivered = results.filter(r => r.success).length;
		const skipped = results.filter(r => r.skipped).length;
		console.log(`[NOTIFY] order ${order.id}: delivered=${delivered} skipped=${skipped} results=`, results);
		return results;
	};

	/**
	 * Legacy entry point kept for backward compatibility.
	 * Validates, creates the order and broadcasts notifications.
	 * @param {Object} formData Form data from the order form
	 * @param {HTMLElement} submitBtn Submit button element for loading state
	 * @returns {Promise} Result of the operation
	 */
	window.sendOrderNotification = async function(formData, submitBtn) {
		console.log('[NOTIFY] sendOrderNotification called', formData);
		try {
			// Validate form data
			const validation = validateFormData(formData);
			if (!validation.valid) {
				window.showErrorToast('Validasi Gagal', validation.error);
				return { success: false, error: validation.error };
			}

			// Set loading state
			let originalText;
			if (submitBtn) {
				originalText = submitBtn.textContent;
				submitBtn.disabled = true;
				submitBtn.textContent = 'Mengirim...';
			}

			// Create order
			const order = window.createOrder(formData);

			// Send notifications (fire and forget)
			const results = await window.sendOrderNotifications(order);
			const delivered = results.filter(r => r.success).length;
			const skipped = results.filter(r => r.skipped).length;

			// Reset button
			if (submitBtn) {
				submitBtn.disabled = false;
				submitBtn.textContent = originalText || 'Bayar';
			}

			if (delivered > 0) {
				console.log('[NOTIFICATION SUCCESS] Order:', order.id);
				window.showToast(
					'? Pesanan berhasil dibuat',
					'Notifikasi Owner terkirim (' + delivered + ' kanal)'
				);
			} else if (skipped > 0) {
				window.showToast(
					'? Pesanan berhasil dibuat',
					'Notifikasi belum dikonfigurasi'
				);
			} else {
				window.showToast(
					'? Pesanan berhasil dibuat',
					'Namun notifikasi Owner gagal dikirim'
				);
			}
			return { success: true, order };
		} catch (error) {
			console.error('[NOTIFICATION ERROR]', error);
			if (submitBtn) {
				submitBtn.disabled = false;
			}
			window.showErrorToast('Error', error.message);
			return { success: false, error: error.message };
		}
	};

	/**
	 * Get all orders (for admin/owner panel)
	 * @returns {Array} All orders from storage
	 */
	window.getAllOrders = function() {
		return getOrdersFromStorage();
	};

	/**
	 * Get orders by date
	 * @param {string} date Date in format YYYY-MM-DD
	 * @returns {Array} Orders from that date
	 */
	window.getOrdersByDate = function(date) {
		const orders = getOrdersFromStorage();
		return orders.filter(o => {
			const createdAt = new Date(o.createdAt);
			const orderDate = createdAt.toISOString().split('T')[0];
			return orderDate === date;
		});
	};

	/**
	 * Update order status (for admin/owner)
	 * @param {string} orderId Order ID
	 * @param {string} newStatus New status
	 * @returns {boolean} Success status
	 */
	window.updateOrderStatus = function(orderId, newStatus) {
		const orders = getOrdersFromStorage();
		const order = orders.find(o => o.id === orderId);
		if (order) {
			order.status = newStatus;
			order.updatedAt = new Date().toISOString();
			saveOrdersToStorage(orders);
			console.log('[ORDER STATUS UPDATED]', orderId, newStatus);
			return true;
		}
		return false;
	};

	// Legacy notification settings handler (keep for backward compatibility)
	window.handleNotificationChange = function(type,enabled){window.showToast('Notifikasi',type+(enabled?' diaktifkan':' dinonaktifkan'));};

	console.log('[NOTIFICATION SYSTEM] Initialized (multi-channel)');
})();