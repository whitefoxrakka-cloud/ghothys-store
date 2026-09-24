/* API Client - Frontend to Backend Integration */

const API_BASE_URL = 'http://localhost:3000/api';

function getAuthHeaders() {
  const token = localStorage.getItem('ghothys_token');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

/**
 * Generic fetch wrapper with error handling
 * @param {string} endpoint - API endpoint (e.g., '/order')
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 */
const apiFetch = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const authHeaders = getAuthHeaders();
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('ghothys_token');
        if (typeof window.handleLogout === 'function' && window.currentUser) {
          window.currentUser = null;
          localStorage.removeItem('ghothys_current_user');
          window.updateUI();
          window.showToast('Sesi Habis', 'Silakan login ulang');
        }
      }
      throw {
        statusCode: response.status,
        message: data.message || 'Request failed',
        data,
      };
    }

    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new order
 * @param {Object} orderData - Order data
 * @param {string} orderData.customerName - Customer name
 * @param {string} orderData.game - Game name
 * @param {string} orderData.uid - User ID
 * @param {string} orderData.server - Server/Zone ID
 * @param {string} orderData.product - Product/Package name
 * @param {string|number} orderData.price - Price
 * @param {string} orderData.payment - Payment method
 * @returns {Promise<Object>} Order creation response
 */
const createOrder = async (orderData) => {
  console.log('[FRONTEND] [VALIDATION_OK] Order data validated:', orderData);
  console.log('[FRONTEND] [SENDING_TO_BACKEND] POST /api/order');

  return apiFetch('/order', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
};

/**
 * Get all orders
 * @returns {Promise<Object>} Orders list
 */
const getOrders = async () => {
  console.log('[FRONTEND] [SENDING_TO_BACKEND] GET /api/order');
  
  return apiFetch('/order', {
    method: 'GET',
  });
};

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Order details
 */
const getOrderById = async (orderId) => {
  console.log('[FRONTEND] [SENDING_TO_BACKEND] GET /api/order/' + orderId);
  
  return apiFetch(`/order/${orderId}`, {
    method: 'GET',
  });
};

/**
 * Send WhatsApp notification (placeholder)
 * @param {string} phone - Phone number
 * @param {string} message - Message content
 * @returns {Promise<Object>} Notification response
 */
const sendWhatsAppNotification = async (phone, message) => {
  console.log('[FRONTEND] [SENDING_TO_BACKEND] POST /api/notification/whatsapp');

  return apiFetch('/notification/whatsapp', {
    method: 'POST',
    body: JSON.stringify({ phone, message }),
  });
};

/**
 * Send Discord notification (placeholder)
 * @param {string} message - Message content
 * @param {Object} embed - Embed object (optional)
 * @returns {Promise<Object>} Notification response
 */
const sendDiscordNotification = async (message, embed = null) => {
  console.log('[FRONTEND] [SENDING_TO_BACKEND] POST /api/notification/discord');

  return apiFetch('/notification/discord', {
    method: 'POST',
    body: JSON.stringify({ message, embed }),
  });
};

// ── AUTH ──

const register = async (data) => {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

const login = async (data) => {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

const getProfile = async () => {
  return apiFetch('/auth/profile', { method: 'GET' });
};

const updateProfile = async (data) => {
  return apiFetch('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

const changePassword = async (data) => {
  return apiFetch('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

const changeUsername = async (data) => {
  return apiFetch('/auth/change-username', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

const addPoints = async (data) => {
  return apiFetch('/auth/points', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

const forgotPassword = async (data) => {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Health check
 * @returns {Promise<Object>} Server health status
 */
const healthCheck = async () => {
  return apiFetch('/health', {
    method: 'GET',
  });
};

// Export all API functions
window.API = {
  createOrder,
  getOrders,
  getOrderById,
  sendWhatsAppNotification,
  sendDiscordNotification,
  healthCheck,
  apiFetch,
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  changeUsername,
  addPoints,
  forgotPassword,
};
