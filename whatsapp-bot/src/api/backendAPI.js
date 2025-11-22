/**
 * Backend API Client
 * Handles all communication with backend APIs
 * Includes retries, error handling, and logging
 */

const axios = require('axios');
const Logger = require('../config/logger');
const constants = require('../config/constants');

const logger = new Logger('APIClient');

class BackendAPI {
  constructor() {
    this.baseURL = constants.API_BASE_URL;
    this.supabaseUrl = constants.SUPABASE_URL;
    this.supabaseKey = constants.SUPABASE_KEY;
    this.maxRetries = 3;
    this.retryDelay = 1000; // ms
  }

  /**
   * Make API request with automatic retries
   */
  async request(method, endpoint, data = null, retryCount = 0) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SmartWhatsAppBot/1.0',
        },
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`API Request Failed: ${method} ${endpoint}`, error.message);

      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        logger.warn(`Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${this.maxRetries})`);
        
        await this.sleep(delay);
        return this.request(method, endpoint, data, retryCount + 1);
      }

      return {
        success: false,
        error: error.response?.data?.error || error.message,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * === AUTHENTICATION ===
   */

  async registerUser(phoneNumber, name, role = 'customer', email = '') {
    return this.request('POST', '/api/auth/register', {
      phone_number: this.normalizePhone(phoneNumber),
      name,
      role,
      email,
    });
  }

  async loginUser(phoneNumber, otp) {
    return this.request('POST', '/api/auth/login', {
      phone_number: this.normalizePhone(phoneNumber),
      otp,
    });
  }

  async sendOTP(phoneNumber) {
    return this.request('POST', '/api/auth/send-otp', {
      phone_number: this.normalizePhone(phoneNumber),
    });
  }

  async getUser(phoneNumber) {
    return this.request('GET', `/api/users/${this.normalizePhone(phoneNumber)}`);
  }

  /**
   * === MERCHANT MANAGEMENT ===
   */

  async getMerchantProfile(merchantId) {
    return this.request('GET', `/api/merchants/${merchantId}`);
  }

  async updateMerchantProfile(merchantId, profileData) {
    return this.request('PUT', `/api/merchants/${merchantId}`, profileData);
  }

  async approveMerchant(merchantId, adminId) {
    return this.request('POST', `/api/admin/merchants/${merchantId}/approve`, {
      approved_by: adminId,
    });
  }

  async rejectMerchant(merchantId, reason, adminId) {
    return this.request('POST', `/api/admin/merchants/${merchantId}/reject`, {
      reason,
      rejected_by: adminId,
    });
  }

  async suspendMerchant(merchantId, reason, adminId) {
    return this.request('POST', `/api/admin/merchants/${merchantId}/suspend`, {
      reason,
      suspended_by: adminId,
    });
  }

  async getPendingMerchants() {
    return this.request('GET', '/api/admin/merchants/pending');
  }

  /**
   * === PRODUCTS ===
   */

  async addProduct(merchantId, productData) {
    return this.request('POST', `/api/merchants/${merchantId}/products`, productData);
  }

  async updateProduct(productId, productData) {
    return this.request('PUT', `/api/products/${productId}`, productData);
  }

  async deleteProduct(productId, merchantId) {
    return this.request('DELETE', `/api/products/${productId}`, { merchant_id: merchantId });
  }

  async getProducts(merchantId) {
    return this.request('GET', `/api/merchants/${merchantId}/products`);
  }

  async getProductDetails(productId) {
    return this.request('GET', `/api/products/${productId}`);
  }

  async searchProducts(query, filters = {}) {
    const params = new URLSearchParams({
      q: query,
      ...filters,
    });
    return this.request('GET', `/api/products/search?${params.toString()}`);
  }

  /**
   * === ORDERS ===
   */

  async createOrder(phoneNumber, orderData) {
    return this.request('POST', `/api/orders`, {
      customer_phone: this.normalizePhone(phoneNumber),
      ...orderData,
    });
  }

  async getOrderStatus(orderId) {
    return this.request('GET', `/api/orders/${orderId}`);
  }

  async updateOrderStatus(orderId, status, merchantId) {
    return this.request('PUT', `/api/orders/${orderId}`, {
      status,
      updated_by: merchantId,
    });
  }

  async getMerchantOrders(merchantId, filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request('GET', `/api/merchants/${merchantId}/orders?${params.toString()}`);
  }

  async getCustomerOrders(phoneNumber) {
    return this.request('GET', `/api/customers/${this.normalizePhone(phoneNumber)}/orders`);
  }

  /**
   * === CARTS ===
   */

  async syncCart(phoneNumber, cartData) {
    return this.request('POST', `/api/carts/sync`, {
      customer_phone: this.normalizePhone(phoneNumber),
      items: cartData.items,
      total: cartData.total,
    });
  }

  /**
   * === ANALYTICS ===
   */

  async getMerchantAnalytics(merchantId, timeframe = 'today') {
    return this.request('GET', `/api/merchants/${merchantId}/analytics?timeframe=${timeframe}`);
  }

  async getSystemAnalytics(adminId) {
    return this.request('GET', `/api/admin/analytics`, { admin_id: adminId });
  }

  /**
   * === NOTIFICATIONS & BROADCASTS ===
   */

  async sendBroadcast(adminId, message, recipientType = 'all') {
    return this.request('POST', `/api/admin/broadcasts`, {
      admin_id: adminId,
      message,
      recipient_type: recipientType,
    });
  }

  async getSystemAlerts(adminId) {
    return this.request('GET', `/api/admin/alerts`);
  }

  /**
   * === HELPER METHODS ===
   */

  normalizePhone(phone) {
    // Remove all non-numeric characters and leading +
    return phone.replace(/\D/g, '');
  }

  isRetryableError(error) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    if (error.response?.status) {
      return retryableStatuses.includes(error.response.status);
    }
    // Retry network errors
    return error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new BackendAPI();
