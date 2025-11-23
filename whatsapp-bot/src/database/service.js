/**
 * Database Service Layer
 * Handles all CRUD operations and data persistence
 * Supports both Supabase and local database
 */

const Logger = require('../config/logger');
const logger = new Logger('DatabaseService');

class DatabaseService {
  constructor() {
    this.db = null; // Will be initialized with Supabase or local DB
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize database connection
   */
  async initialize(supabaseClient) {
    try {
      this.db = supabaseClient;
      logger.info('Database service initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize database', error.message);
      return false;
    }
  }

  /**
   * === USER OPERATIONS ===
   */

  async createUser(userData) {
    try {
      const { data, error } = await this.db
        .from('users')
        .insert([userData])
        .select();

      if (error) throw error;
      logger.info(`User created: ${userData.phone_number}`);
      return { success: true, data: data[0] };
    } catch (error) {
      logger.error('Failed to create user', error.message);
      return { success: false, error: error.message };
    }
  }

  async getUserByPhone(phoneNumber) {
    try {
      // Check cache first
      const cacheKey = `user_${phoneNumber}`;
      if (this.cache.has(cacheKey)) {
        return { success: true, data: this.cache.get(cacheKey), cached: true };
      }

      const { data, error } = await this.db
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        this.cache.set(cacheKey, data);
        setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);
      }

      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to get user: ${phoneNumber}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async updateUser(phoneNumber, updates) {
    try {
      const { data, error } = await this.db
        .from('users')
        .update(updates)
        .eq('phone_number', phoneNumber)
        .select();

      if (error) throw error;

      // Invalidate cache
      this.cache.delete(`user_${phoneNumber}`);

      logger.info(`User updated: ${phoneNumber}`);
      return { success: true, data: data[0] };
    } catch (error) {
      logger.error(`Failed to update user: ${phoneNumber}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * === MERCHANT OPERATIONS ===
   */

  async createMerchant(merchantData) {
    try {
      const { data, error } = await this.db
        .from('merchants')
        .insert([merchantData])
        .select();

      if (error) throw error;
      logger.info(`Merchant created: ${merchantData.store_name}`);
      return { success: true, data: data[0] };
    } catch (error) {
      logger.error('Failed to create merchant', error.message);
      return { success: false, error: error.message };
    }
  }

  async getMerchant(merchantId) {
    try {
      const { data, error } = await this.db
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to get merchant: ${merchantId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async getMerchantByUserId(userId) {
    try {
      const { data, error } = await this.db
        .from('merchants')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to get merchant by user: ${userId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async getPendingMerchants() {
    try {
      const { data, error } = await this.db
        .from('merchants')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Failed to get pending merchants', error.message);
      return { success: false, error: error.message };
    }
  }

  async updateMerchantStatus(merchantId, status, metadata = {}) {
    try {
      const updates = {
        status,
        updated_at: new Date(),
        ...metadata,
      };

      const { data, error } = await this.db
        .from('merchants')
        .update(updates)
        .eq('id', merchantId)
        .select();

      if (error) throw error;
      logger.info(`Merchant status updated: ${merchantId} -> ${status}`);
      return { success: true, data: data[0] };
    } catch (error) {
      logger.error(`Failed to update merchant status: ${merchantId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * === PRODUCT OPERATIONS ===
   */

  async createProduct(productData) {
    try {
      const { data, error } = await this.db
        .from('products')
        .insert([productData])
        .select();

      if (error) throw error;
      logger.info(`Product created: ${productData.name}`);
      return { success: true, data: data[0] };
    } catch (error) {
      logger.error('Failed to create product', error.message);
      return { success: false, error: error.message };
    }
  }

  async getProduct(productId) {
    try {
      const { data, error } = await this.db
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to get product: ${productId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async getMerchantProducts(merchantId) {
    try {
      const { data, error } = await this.db
        .from('products')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to get merchant products: ${merchantId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async searchProducts(query, filters = {}) {
    try {
      let queryBuilder = this.db
        .from('products')
        .select('*')
        .eq('is_active', true)
        .ilike('name', `%${query}%`);

      if (filters.category) {
        queryBuilder = queryBuilder.eq('category', filters.category);
      }

      if (filters.min_price !== undefined) {
        queryBuilder = queryBuilder.gte('price', filters.min_price);
      }

      if (filters.max_price !== undefined) {
        queryBuilder = queryBuilder.lte('price', filters.max_price);
      }

      const { data, error } = await queryBuilder.limit(50);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Failed to search products', error.message);
      return { success: false, error: error.message };
    }
  }

  async updateProduct(productId, updates) {
    try {
      const { data, error } = await this.db
        .from('products')
        .update(updates)
        .eq('id', productId)
        .select();

      if (error) throw error;
      logger.info(`Product updated: ${productId}`);
      return { success: true, data: data[0] };
    } catch (error) {
      logger.error(`Failed to update product: ${productId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * === ORDER OPERATIONS ===
   */

  async createOrder(orderData) {
    try {
      const { data, error } = await this.db
        .from('orders')
        .insert([orderData])
        .select();

      if (error) throw error;
      logger.info(`Order created: ${orderData.order_number}`);
      return { success: true, data: data[0] };
    } catch (error) {
      logger.error('Failed to create order', error.message);
      return { success: false, error: error.message };
    }
  }

  async getOrder(orderId) {
    try {
      const { data, error } = await this.db
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to get order: ${orderId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async getCustomerOrders(phoneNumber) {
    try {
      const { data, error } = await this.db
        .from('orders')
        .select('*')
        .eq('customer_phone', phoneNumber)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to get customer orders: ${phoneNumber}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async getMerchantOrders(merchantId, filters = {}) {
    try {
      let queryBuilder = this.db
        .from('orders')
        .select('*')
        .contains('items', [{ merchant_id: merchantId }]);

      if (filters.status) {
        queryBuilder = queryBuilder.eq('status', filters.status);
      }

      if (filters.start_date) {
        queryBuilder = queryBuilder.gte('created_at', filters.start_date);
      }

      if (filters.end_date) {
        queryBuilder = queryBuilder.lte('created_at', filters.end_date);
      }

      const { data, error } = await queryBuilder
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to get merchant orders: ${merchantId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async updateOrderStatus(orderId, status, metadata = {}) {
    try {
      const updates = {
        status,
        updated_at: new Date(),
        ...metadata,
      };

      const { data, error } = await this.db
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select();

      if (error) throw error;
      logger.info(`Order status updated: ${orderId} -> ${status}`);
      return { success: true, data: data[0] };
    } catch (error) {
      logger.error(`Failed to update order: ${orderId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * === CART OPERATIONS ===
   */

  async syncCart(phoneNumber, cartData) {
    try {
      // Check if cart exists
      const { data: existingCart } = await this.db
        .from('carts')
        .select('id')
        .eq('customer_phone', phoneNumber)
        .single();

      if (existingCart) {
        // Update existing cart
        const { data, error } = await this.db
          .from('carts')
          .update(cartData)
          .eq('customer_phone', phoneNumber)
          .select();

        if (error) throw error;
        logger.info(`Cart updated: ${phoneNumber}`);
        return { success: true, data: data[0] };
      } else {
        // Create new cart
        const { data, error } = await this.db
          .from('carts')
          .insert([{ customer_phone: phoneNumber, ...cartData }])
          .select();

        if (error) throw error;
        logger.info(`Cart created: ${phoneNumber}`);
        return { success: true, data: data[0] };
      }
    } catch (error) {
      logger.error(`Failed to sync cart: ${phoneNumber}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async getCart(phoneNumber) {
    try {
      const { data, error } = await this.db
        .from('carts')
        .select('*')
        .eq('customer_phone', phoneNumber)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to get cart: ${phoneNumber}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async clearCart(phoneNumber) {
    try {
      const { error } = await this.db
        .from('carts')
        .delete()
        .eq('customer_phone', phoneNumber);

      if (error) throw error;
      logger.info(`Cart cleared: ${phoneNumber}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to clear cart: ${phoneNumber}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * === FAVORITE OPERATIONS ===
   */

  async addFavorite(phoneNumber, productId) {
    try {
      const { data, error } = await this.db
        .from('favorites')
        .insert([{ customer_phone: phoneNumber, product_id: productId }])
        .select();

      if (error && error.code !== '23505') throw error; // Ignore duplicate key error

      logger.info(`Favorite added: ${phoneNumber} -> ${productId}`);
      return { success: true, data: data?.[0] };
    } catch (error) {
      logger.error('Failed to add favorite', error.message);
      return { success: false, error: error.message };
    }
  }

  async removeFavorite(phoneNumber, productId) {
    try {
      const { error } = await this.db
        .from('favorites')
        .delete()
        .eq('customer_phone', phoneNumber)
        .eq('product_id', productId);

      if (error) throw error;
      logger.info(`Favorite removed: ${phoneNumber} -> ${productId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to remove favorite', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * === ADDRESS OPERATIONS ===
   */

  async saveAddress(phoneNumber, addressData) {
    try {
      const { data, error } = await this.db
        .from('addresses')
        .insert([{ customer_phone: phoneNumber, ...addressData }])
        .select();

      if (error) throw error;
      logger.info(`Address saved: ${phoneNumber}`);
      return { success: true, data: data[0] };
    } catch (error) {
      logger.error('Failed to save address', error.message);
      return { success: false, error: error.message };
    }
  }

  async getAddresses(phoneNumber) {
    try {
      const { data, error } = await this.db
        .from('addresses')
        .select('*')
        .eq('customer_phone', phoneNumber)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to get addresses: ${phoneNumber}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * === RATING OPERATIONS ===
   */

  async saveRating(ratingData) {
    try {
      const { data, error } = await this.db
        .from('ratings')
        .insert([ratingData])
        .select();

      if (error) throw error;
      logger.info(`Rating saved for ${ratingData.entity_type}: ${ratingData.entity_id}`);
      return { success: true, data: data[0] };
    } catch (error) {
      logger.error('Failed to save rating', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * === ANALYTICS OPERATIONS ===
   */

  async getMerchantAnalytics(merchantId, startDate, endDate) {
    try {
      const { data, error } = await this.db
        .from('analytics')
        .select('*')
        .eq('entity_type', 'merchant')
        .eq('entity_id', merchantId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to get merchant analytics: ${merchantId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * === NOTIFICATION OPERATIONS ===
   */

  async createNotification(notificationData) {
    try {
      const { data, error } = await this.db
        .from('notifications')
        .insert([notificationData])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      logger.error('Failed to create notification', error.message);
      return { success: false, error: error.message };
    }
  }

  async getNotifications(phoneNumber, limit = 50) {
    try {
      const { data, error } = await this.db
        .from('notifications')
        .select('*')
        .eq('recipient_phone', phoneNumber)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to get notifications: ${phoneNumber}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * === HELPER METHODS ===
   */

  clearCache() {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  async healthCheck() {
    try {
      const { data, error } = await this.db.from('users').select('count()', { count: 'exact' });
      if (error) throw error;
      return { success: true, message: 'Database healthy' };
    } catch (error) {
      logger.error('Database health check failed', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DatabaseService();
