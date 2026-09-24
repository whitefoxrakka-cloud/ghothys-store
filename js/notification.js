/* WhatsApp Notification System using Fonnte API */
(function(){
	// Configuration
	const FONNTE_API_KEY = '5UyLU4EZ2kLnH4PX4PLd';
	const FONNTE_API_ENDPOINT = 'https://api.fonnte.com/send';
	const OWNER_PHONE = '6282137499434';

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
			item: orderData.item,
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
	 * Format order message for WhatsApp
	 * @param {Object} order Order object
	 * @returns {string} Formatted message
	 */
	function formatWhatsAppMessage(order) {
		const message = `🛒 ORDER BARU

━━━━━━━━━━━━━━

📦 Order ID
${order.id}

🎮 Game
${order.game}

👤 UID
${order.uid}

🌐 Server
${order.server}

💎 Item
${order.item}

💰 Harga
${order.price}

💳 Pembayaran
${order.payment}

📅 Waktu
${order.timestamp}

Status:
Pending

Silakan segera diproses.

━━━━━━━━━━━━━━

Ghothys Store`;
		return message;
	}

	/**
	 * Send WhatsApp notification via Fonnte API
	 * @param {Object} order Order object
	 * @returns {Promise} API response
	 */
	async function sendWhatsAppViaFonnte(order) {
		try {
			const message = formatWhatsAppMessage(order);

			const payload = { target: OWNER_PHONE, message };
			console.log('[5] Mengirim request ke Fonnte', FONNTE_API_ENDPOINT, payload);

			const response = await fetch(FONNTE_API_ENDPOINT, {
				method: 'POST',
				headers: {
					'Authorization': FONNTE_API_KEY,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			console.log('[6] Response status from Fonnte', response.status);

			let data = null;
			try {
				data = await response.json();
				console.log('[WHATSAPP SENT]', order.id, data);
			} catch (parseErr) {
				const text = await response.text();
				console.warn('[WHATSAPP] Response parse failed, raw text:', text);
				// keep data as null
			}

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			return { success: true, data };
		} catch (error) {
			console.error('[WHATSAPP FAILED]', order.id, error);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Main function to handle order submission
	 * Validates form, creates order, sends WhatsApp notification
	 * @param {Object} formData Form data from the order form
	 * @param {HTMLElement} submitBtn Submit button element for loading state
	 * @returns {Promise} Result of the operation
	 */
	window.sendWhatsAppNotification = async function(formData, submitBtn) {
		console.log('[3] sendWhatsAppNotification called', formData);
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

			console.log('[4] Mengirim notifikasi WhatsApp...', order.id);
			// Send WhatsApp notification
			const whatsappResult = await sendWhatsAppViaFonnte(order);

			// Reset button
			if (submitBtn) {
				submitBtn.disabled = false;
				submitBtn.textContent = originalText || 'Bayar';
			}

			if (whatsappResult.success) {
				console.log('[7] Notifikasi berhasil dikirim', order.id);
				console.log('[NOTIFICATION SUCCESS] Order:', order.id);
				window.showToast(
					'✅ Pesanan berhasil dibuat',
					'Notifikasi Owner berhasil dikirim'
				);
				return { success: true, order };
			} else {
				console.warn('[NOTIFICATION WARNING] Order created but WhatsApp failed:', order.id);
				window.showToast(
					'⚠ Pesanan berhasil dibuat',
					'Namun WhatsApp gagal dikirim'
				);
				return { success: true, order, whatsappWarning: true };
			}
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

	console.log('[NOTIFICATION SYSTEM] Initialized with Fonnte API');
})();
