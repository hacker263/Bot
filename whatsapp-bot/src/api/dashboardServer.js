/**
 * Dashboard API Server
 * Express server with all endpoints for bot-dashboard synchronization
 * This IS the dashboard backend - no separate frontend needed
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Logger = require('../config/logger');
const databaseService = require('../database/service');
const backendAPI = require('../api/backendAPI');

const logger = new Logger('DashboardAPI');

class DashboardServer {
  constructor() {
    this.app = express();
    this.port = process.env.API_PORT || 3000;
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security
    this.app.use(helmet());
    this.app.use(cors());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date() });
    });
  }

  /**
   * Setup all API routes
   */
  setupRoutes() {
    // ===== AUTHENTICATION ROUTES =====
    this.app.post('/api/auth/register', this.handleRegister.bind(this));
    this.app.post('/api/auth/login', this.handleLogin.bind(this));
    this.app.post('/api/auth/send-otp', this.handleSendOTP.bind(this));
    this.app.post('/api/auth/verify-otp', this.handleVerifyOTP.bind(this));
    this.app.get('/api/users/:phone', this.handleGetUser.bind(this));

    // ===== MERCHANT ROUTES =====
    this.app.post('/api/merchants', this.handleCreateMerchant.bind(this));
    this.app.get('/api/merchants/:id', this.handleGetMerchant.bind(this));
    this.app.put('/api/merchants/:id', this.handleUpdateMerchant.bind(this));
    this.app.get('/api/admin/merchants/pending', this.handleGetPendingMerchants.bind(this));
    this.app.post('/api/admin/merchants/:id/approve', this.handleApproveMerchant.bind(this));
    this.app.post('/api/admin/merchants/:id/reject', this.handleRejectMerchant.bind(this));
    this.app.post('/api/admin/merchants/:id/suspend', this.handleSuspendMerchant.bind(this));
    this.app.get('/api/merchants/:id/analytics', this.handleGetMerchantAnalytics.bind(this));

    // ===== PRODUCT ROUTES =====
    this.app.post('/api/merchants/:merchantId/products', this.handleCreateProduct.bind(this));
    this.app.get('/api/merchants/:merchantId/products', this.handleGetMerchantProducts.bind(this));
    this.app.get('/api/products/:id', this.handleGetProduct.bind(this));
    this.app.put('/api/products/:id', this.handleUpdateProduct.bind(this));
    this.app.delete('/api/products/:id', this.handleDeleteProduct.bind(this));
    this.app.get('/api/products/search', this.handleSearchProducts.bind(this));

    // ===== ORDER ROUTES =====
    this.app.post('/api/orders', this.handleCreateOrder.bind(this));
    this.app.get('/api/orders/:id', this.handleGetOrder.bind(this));
    this.app.put('/api/orders/:id', this.handleUpdateOrder.bind(this));
    this.app.get('/api/customers/:phone/orders', this.handleGetCustomerOrders.bind(this));
    this.app.get('/api/merchants/:merchantId/orders', this.handleGetMerchantOrders.bind(this));

    // ===== CART ROUTES =====
    this.app.post('/api/carts/sync', this.handleSyncCart.bind(this));
    this.app.get('/api/carts/:phone', this.handleGetCart.bind(this));
    this.app.delete('/api/carts/:phone', this.handleClearCart.bind(this));

    // ===== FAVORITE ROUTES =====
    this.app.post('/api/favorites/:phone/:productId', this.handleAddFavorite.bind(this));
    this.app.delete('/api/favorites/:phone/:productId', this.handleRemoveFavorite.bind(this));
    this.app.get('/api/favorites/:phone', this.handleGetFavorites.bind(this));

    // ===== ADDRESS ROUTES =====
    this.app.post('/api/addresses/:phone', this.handleSaveAddress.bind(this));
    this.app.get('/api/addresses/:phone', this.handleGetAddresses.bind(this));

    // ===== RATING ROUTES =====
    this.app.post('/api/ratings', this.handleSaveRating.bind(this));

    // ===== ADMIN ROUTES =====
    this.app.get('/api/admin/alerts', this.handleGetAlerts.bind(this));
    this.app.get('/api/admin/analytics', this.handleGetSystemAnalytics.bind(this));
    this.app.post('/api/admin/broadcasts', this.handleBroadcast.bind(this));

    // Error handling
    this.app.use((err, req, res, next) => {
      logger.error('API Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    });
  }

  /**
   * ===== AUTHENTICATION HANDLERS =====
   */

  async handleRegister(req, res) {
    try {
      const { phone_number, name, role, email } = req.body;

      if (!phone_number || !name) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      // Check if user already exists
      const existingUser = await databaseService.getUserByPhone(phone_number);
      if (existingUser.data) {
        return res.status(409).json({ success: false, error: 'User already exists' });
      }

      // Create user in database
      const userData = {
        phone_number,
        name,
        role: role || 'customer',
        email: email || '',
        is_verified: false,
        created_at: new Date(),
      };

      const result = await databaseService.createUser(userData);

      if (result.success) {
        logger.info(`User registered: ${phone_number}`);
        res.status(201).json({ success: true, data: result.data, message: 'Registration successful' });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Registration error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleLogin(req, res) {
    try {
      const { phone_number, otp } = req.body;

      if (!phone_number || !otp) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      // Get user
      const userResult = await databaseService.getUserByPhone(phone_number);
      if (!userResult.data) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Verify OTP (in real app, would check against sent OTP)
      // For now, accept any OTP
      const updates = {
        is_verified: true,
        last_login: new Date(),
      };

      const updateResult = await databaseService.updateUser(phone_number, updates);

      if (updateResult.success) {
        logger.info(`User logged in: ${phone_number}`);
        res.json({ success: true, data: updateResult.data, message: 'Login successful' });
      } else {
        res.status(500).json({ success: false, error: updateResult.error });
      }
    } catch (error) {
      logger.error('Login error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleSendOTP(req, res) {
    try {
      const { phone_number } = req.body;

      if (!phone_number) {
        return res.status(400).json({ success: false, error: 'Phone number required' });
      }

      // Generate OTP (6 digits)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Save OTP to database
      await databaseService.updateUser(phone_number, {
        verification_otp: otp,
        verification_otp_expires: expiresAt,
      });

      // In real app, send OTP via WhatsApp or SMS
      logger.info(`OTP sent to ${phone_number}: ${otp}`);

      res.json({
        success: true,
        message: 'OTP sent successfully',
        otp: otp, // In production, don't return this
      });
    } catch (error) {
      logger.error('Send OTP error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleVerifyOTP(req, res) {
    try {
      const { phone_number, otp } = req.body;

      const userResult = await databaseService.getUserByPhone(phone_number);
      if (!userResult.data) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const user = userResult.data;

      if (user.verification_otp !== otp) {
        return res.status(400).json({ success: false, error: 'Invalid OTP' });
      }

      if (new Date() > new Date(user.verification_otp_expires)) {
        return res.status(400).json({ success: false, error: 'OTP expired' });
      }

      await databaseService.updateUser(phone_number, {
        is_verified: true,
        verification_otp: null,
      });

      logger.info(`OTP verified for ${phone_number}`);
      res.json({ success: true, message: 'OTP verified' });
    } catch (error) {
      logger.error('Verify OTP error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleGetUser(req, res) {
    try {
      const { phone } = req.params;
      const result = await databaseService.getUserByPhone(phone);

      if (result.success && result.data) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(404).json({ success: false, error: 'User not found' });
      }
    } catch (error) {
      logger.error('Get user error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * ===== MERCHANT HANDLERS =====
   */

  async handleCreateMerchant(req, res) {
    try {
      const { user_id, store_name, description, category } = req.body;

      const result = await databaseService.createMerchant({
        user_id,
        store_name,
        description,
        category,
        status: 'pending',
        created_at: new Date(),
      });

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Create merchant error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleGetMerchant(req, res) {
    try {
      const { id } = req.params;
      const result = await databaseService.getMerchant(id);

      if (result.success && result.data) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(404).json({ success: false, error: 'Merchant not found' });
      }
    } catch (error) {
      logger.error('Get merchant error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleUpdateMerchant(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const result = await databaseService.updateMerchantStatus(id, updates.status || 'active', updates);

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Update merchant error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleGetPendingMerchants(req, res) {
    try {
      const result = await databaseService.getPendingMerchants();

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Get pending merchants error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleApproveMerchant(req, res) {
    try {
      const { id } = req.params;
      const { approved_by } = req.body;

      const result = await databaseService.updateMerchantStatus(id, 'approved', {
        approved_by,
        approval_date: new Date(),
      });

      if (result.success) {
        logger.info(`Merchant approved: ${id}`);
        res.json({ success: true, data: result.data, message: 'Merchant approved' });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Approve merchant error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleRejectMerchant(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const result = await databaseService.updateMerchantStatus(id, 'rejected', {
        rejection_reason: reason,
      });

      if (result.success) {
        logger.info(`Merchant rejected: ${id}`);
        res.json({ success: true, data: result.data, message: 'Merchant rejected' });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Reject merchant error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleSuspendMerchant(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const result = await databaseService.updateMerchantStatus(id, 'suspended', {
        suspension_reason: reason,
      });

      if (result.success) {
        logger.info(`Merchant suspended: ${id}`);
        res.json({ success: true, data: result.data, message: 'Merchant suspended' });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Suspend merchant error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleGetMerchantAnalytics(req, res) {
    try {
      const { id } = req.params;
      const { timeframe } = req.query;

      // Calculate date range based on timeframe
      const endDate = new Date();
      let startDate = new Date();

      switch (timeframe) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 1);
      }

      const result = await databaseService.getMerchantAnalytics(id, startDate, endDate);

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Get merchant analytics error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * ===== PRODUCT HANDLERS =====
   */

  async handleCreateProduct(req, res) {
    try {
      const { merchantId } = req.params;
      const productData = {
        merchant_id: merchantId,
        ...req.body,
        is_active: true,
        created_at: new Date(),
      };

      const result = await databaseService.createProduct(productData);

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Create product error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleGetProduct(req, res) {
    try {
      const { id } = req.params;
      const result = await databaseService.getProduct(id);

      if (result.success && result.data) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(404).json({ success: false, error: 'Product not found' });
      }
    } catch (error) {
      logger.error('Get product error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleGetMerchantProducts(req, res) {
    try {
      const { merchantId } = req.params;
      const result = await databaseService.getMerchantProducts(merchantId);

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Get merchant products error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleUpdateProduct(req, res) {
    try {
      const { id } = req.params;
      const updates = { ...req.body, updated_at: new Date() };

      const result = await databaseService.updateProduct(id, updates);

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Update product error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleDeleteProduct(req, res) {
    try {
      const { id } = req.params;
      const result = await databaseService.updateProduct(id, { is_active: false });

      if (result.success) {
        res.json({ success: true, message: 'Product deleted' });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Delete product error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleSearchProducts(req, res) {
    try {
      const { q, category, min_price, max_price } = req.query;

      const result = await databaseService.searchProducts(q, {
        category,
        min_price: parseFloat(min_price),
        max_price: parseFloat(max_price),
      });

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Search products error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * ===== ORDER HANDLERS =====
   */

  async handleCreateOrder(req, res) {
    try {
      const { customer_phone, items, total, ...orderData } = req.body;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}`;

      const result = await databaseService.createOrder({
        order_number: orderNumber,
        customer_phone,
        items,
        total,
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date(),
        ...orderData,
      });

      if (result.success) {
        // Clear customer's cart
        await databaseService.clearCart(customer_phone);

        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Create order error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleGetOrder(req, res) {
    try {
      const { id } = req.params;
      const result = await databaseService.getOrder(id);

      if (result.success && result.data) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(404).json({ success: false, error: 'Order not found' });
      }
    } catch (error) {
      logger.error('Get order error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleUpdateOrder(req, res) {
    try {
      const { id } = req.params;
      const { status, ...updates } = req.body;

      const result = await databaseService.updateOrderStatus(id, status, updates);

      if (result.success) {
        logger.info(`Order updated: ${id} -> ${status}`);
        res.json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Update order error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleGetCustomerOrders(req, res) {
    try {
      const { phone } = req.params;
      const result = await databaseService.getCustomerOrders(phone);

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Get customer orders error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleGetMerchantOrders(req, res) {
    try {
      const { merchantId } = req.params;
      const filters = req.query;

      const result = await databaseService.getMerchantOrders(merchantId, filters);

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Get merchant orders error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * ===== CART HANDLERS =====
   */

  async handleSyncCart(req, res) {
    try {
      const { customer_phone, items, total } = req.body;

      const cartData = {
        items,
        total_items: items.length,
        total,
        updated_at: new Date(),
      };

      const result = await databaseService.syncCart(customer_phone, cartData);

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Sync cart error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleGetCart(req, res) {
    try {
      const { phone } = req.params;
      const result = await databaseService.getCart(phone);

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(404).json({ success: false, error: 'Cart not found' });
      }
    } catch (error) {
      logger.error('Get cart error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleClearCart(req, res) {
    try {
      const { phone } = req.params;
      const result = await databaseService.clearCart(phone);

      if (result.success) {
        res.json({ success: true, message: 'Cart cleared' });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Clear cart error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * ===== FAVORITE HANDLERS =====
   */

  async handleAddFavorite(req, res) {
    try {
      const { phone, productId } = req.params;
      const result = await databaseService.addFavorite(phone, productId);

      if (result.success) {
        res.json({ success: true, message: 'Added to favorites' });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Add favorite error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleRemoveFavorite(req, res) {
    try {
      const { phone, productId } = req.params;
      const result = await databaseService.removeFavorite(phone, productId);

      if (result.success) {
        res.json({ success: true, message: 'Removed from favorites' });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Remove favorite error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleGetFavorites(req, res) {
    try {
      const { phone } = req.params;
      const { data, error } = await this.db
        .from('favorites')
        .select('*')
        .eq('customer_phone', phone);

      if (!error) {
        res.json({ success: true, data });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    } catch (error) {
      logger.error('Get favorites error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * ===== ADDRESS HANDLERS =====
   */

  async handleSaveAddress(req, res) {
    try {
      const { phone } = req.params;
      const addressData = req.body;

      const result = await databaseService.saveAddress(phone, addressData);

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Save address error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleGetAddresses(req, res) {
    try {
      const { phone } = req.params;
      const result = await databaseService.getAddresses(phone);

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Get addresses error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * ===== RATING HANDLERS =====
   */

  async handleSaveRating(req, res) {
    try {
      const ratingData = {
        ...req.body,
        created_at: new Date(),
      };

      const result = await databaseService.saveRating(ratingData);

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Save rating error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * ===== ADMIN HANDLERS =====
   */

  async handleGetAlerts(req, res) {
    try {
      // Fetch system alerts from database
      const { data, error } = await databaseService.db
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error) {
        res.json({ success: true, data });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    } catch (error) {
      logger.error('Get alerts error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleGetSystemAnalytics(req, res) {
    try {
      const timeframe = req.query.timeframe || 'today';

      // Get orders count, revenue, etc.
      const { data: orders, error: ordersError } = await databaseService.db
        .from('orders')
        .select('count()', { count: 'exact' });

      const { data: revenue } = await databaseService.db
        .from('orders')
        .select('total');

      if (!ordersError) {
        res.json({
          success: true,
          data: {
            total_orders: orders[0]?.count || 0,
            total_revenue: revenue?.reduce((sum, r) => sum + (r.total || 0), 0) || 0,
            timeframe,
          },
        });
      } else {
        res.status(500).json({ success: false, error: ordersError.message });
      }
    } catch (error) {
      logger.error('Get system analytics error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async handleBroadcast(req, res) {
    try {
      const { admin_id, message, recipient_type } = req.body;

      // In production, would send message via WhatsApp to all users
      logger.info(`Broadcast from ${admin_id}: ${message} (to: ${recipient_type})`);

      res.json({ success: true, message: 'Broadcast queued' });
    } catch (error) {
      logger.error('Broadcast error', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Start the server
   */
  async start() {
    try {
      this.app.listen(this.port, () => {
        logger.info(`Dashboard API Server running on port ${this.port}`);
      });
    } catch (error) {
      logger.error('Failed to start server', error.message);
      throw error;
    }
  }
}

module.exports = DashboardServer;
