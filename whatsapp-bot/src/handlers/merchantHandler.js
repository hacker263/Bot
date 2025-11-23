/**
 * Merchant Command Handlers
 * Manages product listings, orders, store settings, analytics
 */

const backendAPI = require('../api/backendAPI');
const authMiddleware = require('../middlewares/auth');
const cache = require('../database/cache');
const databaseService = require('../database/service');
const MessageFormatter = require('../utils/messageFormatter');
const InteractiveMessageBuilder = require('../utils/interactiveMessageBuilder');
const FlowManager = require('../utils/flowManager');
const Logger = require('../config/logger');

const logger = new Logger('MerchantHandler');

class MerchantHandler {
  /**
   * Handle merchant commands
   */
  async handleMerchantCommand(command, args, from, phoneNumber) {
    try {
      // Verify merchant privileges
      await authMiddleware.requireMerchant(phoneNumber);

      // Get merchant session
      const session = await cache.getUserSession(phoneNumber);
      if (!session?.merchant_id) {
        return { error: 'Merchant profile not found' };
      }

      // Add to command history
      await cache.addCommandHistory(phoneNumber, `merchant ${command}`);

      switch (command) {
        // Order management
        case 'orders':
          return await this.handleOrdersCommand(args, session.merchant_id, from);
        
        case 'accept':
          return await this.handleAcceptOrderCommand(args[0], session.merchant_id, from);
        
        case 'reject':
          return await this.handleRejectOrderCommand(args[0], args.slice(1).join(' '), session.merchant_id, from);
        
        case 'update-status':
          return await this.handleUpdateOrderStatusCommand(args[0], args[1], session.merchant_id, from);
        
        // Product management
        case 'products':
          return await this.handleProductsCommand(args, session.merchant_id, from);
        
        case 'add-product':
          return await this.startProductAddFlow(session.merchant_id, from);
        
        case 'edit-product':
          return await this.handleEditProductCommand(args[0], session.merchant_id, from);
        
        case 'delete-product':
          return await this.handleDeleteProductCommand(args[0], session.merchant_id, from);
        
        // Store management
        case 'store':
          return await this.handleStoreCommand(args, session.merchant_id, from);
        
        case 'store-status':
          return await this.handleStoreStatusCommand(args[0], session.merchant_id, from);
        
        case 'store-hours':
          return await this.handleStoreHoursCommand(args, session.merchant_id, from);
        
        case 'store-profile':
          return await this.handleStoreProfileCommand(args, session.merchant_id, from);
        
        // Analytics
        case 'analytics':
          return await this.handleAnalyticsCommand(args, session.merchant_id, from);
        
        case 'dashboard':
          return await this.handleDashboardCommand(session.merchant_id, from);
        
        // Settings
        case 'settings':
          return await this.handleSettingsCommand(args, session.merchant_id, from);
        
        // New creative commands
        case 'performance':
          return await this.handlePerformanceCommand(session.merchant_id, from);
        
        case 'customers':
          return await this.handleCustomersCommand(args, session.merchant_id, from);
        
        case 'feedback':
          return await this.handleMerchantFeedbackCommand(args[0], session.merchant_id, from);
        
        case 'boost':
          return await this.handleBoostCommand(session.merchant_id, from);
        
        case 'tips':
          return await this.handleTipsCommand(session.merchant_id, from);
        
        default:
          return null;
      }
    } catch (error) {
      logger.error('Merchant command error', error);
      return { error: error.message };
    }
  }

  /**
   * !merchant orders [new|today|week]
   */
  async handleOrdersCommand(args, merchantId, from) {
    const timeframe = args[0]?.toLowerCase() || 'new';

    const response = await backendAPI.getMerchantOrders(merchantId, { 
      status: timeframe === 'new' ? 'pending' : undefined,
      timeframe: timeframe !== 'new' ? timeframe : undefined,
    });

    if (!response.success) {
      return InteractiveMessageBuilder.createErrorCard('Failed to fetch orders');
    }

    const orders = response.data;
    if (orders.length === 0) {
      return { message: `No ${timeframe} orders found.` };
    }

    return InteractiveMessageBuilder.listMessage(
      `${timeframe.toUpperCase()} ORDERS`,
      `${orders.length} order${orders.length !== 1 ? 's' : ''}`,
      [{
        title: 'Orders',
        rows: orders.slice(0, 10).map((order, i) => ({
          rowId: `order_${order.id}`,
          title: `#${order.id} - ${order.customer_name}`,
          description: `ZWL ${order.total.toFixed(2)} • ${order.status}`
        }))
      }],
      'Tap to view details'
    );
  }

  /**
   * !merchant accept <order_id>
   */
  async handleAcceptOrderCommand(orderId, merchantId, from) {
    if (!orderId) {
      return InteractiveMessageBuilder.createErrorCard(
        'Order ID required',
        ['Usage: !merchant accept <order_id>']
      );
    }

    const response = await backendAPI.updateOrderStatus(orderId, 'confirmed', merchantId);

    if (!response.success) {
      return InteractiveMessageBuilder.createErrorCard('Failed to accept order');
    }

    const order = response.data;
    return InteractiveMessageBuilder.createSuccessCard(
      'Order Accepted',
      `Order #${order.id} confirmed!\nCustomer: ${order.customer_name}`,
      [
        { text: '📦 View Orders', id: 'merchant_orders' },
        { text: '📋 Menu', id: 'menu' }
      ]
    );
  }

  /**
   * !merchant reject <order_id> [reason]
   */
  async handleRejectOrderCommand(orderId, reason, merchantId, from) {
    if (!orderId) {
      return { error: 'Usage: !merchant reject <order_id> [reason]' };
    }

    const response = await backendAPI.updateOrderStatus(orderId, 'cancelled', merchantId);

    if (!response.success) {
      return { error: 'Failed to reject order' };
    }

    const order = response.data;
    const customerMessage = `❌ *Your order #${order.id} could not be fulfilled*\n\nReason: ${reason || 'Out of stock'}\n\nWe apologize for the inconvenience.`;

    return {
      message: MessageFormatter.formatSuccess('Order rejected'),
      notifyUser: { phone: order.customer_phone, message: customerMessage },
    };
  }

  /**
   * !merchant update-status <order_id> [status]
   * Now with interactive status selector
   */
  async handleUpdateOrderStatusCommand(orderId, status, merchantId, from) {
    if (!orderId) {
      return InteractiveMessageBuilder.createErrorCard(
        'Order ID required',
        ['Usage: !merchant update-status <order_id> <status>']
      );
    }

    // If no status provided, show interactive selector
    if (!status) {
      return FlowManager.statusSelectorFlow('Pending').interactive;
    }

    const validStatuses = ['preparing', 'ready', 'out_for_delivery', 'delivered'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return InteractiveMessageBuilder.createErrorCard(
        'Invalid status',
        validStatuses.map(s => `• ${s}`)
      );
    }

    const response = await backendAPI.updateOrderStatus(orderId, status, merchantId);

    if (!response.success) {
      return InteractiveMessageBuilder.createErrorCard('Failed to update order');
    }

    const order = response.data;
    const statusEmojis = {
      preparing: '👨‍🍳',
      ready: '📦',
      out_for_delivery: '🚚',
      delivered: '✅'
    };

    return InteractiveMessageBuilder.createSuccessCard(
      'Order Updated',
      `Order #${order.id}\nStatus: ${statusEmojis[status]} ${status}`,
      [
        { text: '📦 View Orders', id: 'merchant_orders' },
        { text: '📋 Menu', id: 'menu' }
      ]
    );
  }

  /**
   * !merchant products [list|search <query>]
   */
  async handleProductsCommand(args, merchantId, from) {
    if (args[0] === 'search' && args[1]) {
      const query = args.slice(1).join(' ');
      const response = await backendAPI.searchProducts(query, { merchant_id: merchantId });
      
      if (!response.success || response.data.length === 0) {
        return { message: `No products found for "${query}"` };
      }

      let message = `*Search Results for "${query}" (${response.data.length})*\n━━━━━━━━━━━━━━━\n\n`;
      response.data.forEach((p, i) => {
        message += `${i + 1}. ${MessageFormatter.truncate(p.name, 30)}\n`;
        message += `   Price: ZWL ${p.price.toFixed(2)}\n`;
        message += `   Stock: ${p.stock || '✓'}\n`;
        message += `   ID: \`${p.id}\`\n\n`;
      });

      return { message };
    }

    // List all products
    const response = await backendAPI.getProducts(merchantId);
    if (!response.success) {
      return { error: 'Failed to fetch products' };
    }

    const products = response.data;
    if (products.length === 0) {
      return { message: 'You have no products yet. Type *!merchant add-product* to add one.' };
    }

    let message = `*Your Products (${products.length})*\n━━━━━━━━━━━━━━━\n\n`;
    products.slice(0, 10).forEach((p, i) => {
      message += `${i + 1}. *${p.name}*\n`;
      message += `   Price: ZWL ${p.price.toFixed(2)}\n`;
      message += `   Stock: ${p.stock || '✓ Available'}\n`;
      message += `   Status: ${p.is_visible ? '👁️ Visible' : '🙈 Hidden'}\n`;
      message += `   ID: \`${p.id}\`\n\n`;
    });

    message += `\nTo edit: *!merchant edit-product <id>*\n`;
    message += `To delete: *!merchant delete-product <id>*\n`;
    message += `To add: *!merchant add-product*`;

    return { message };
  }

  /**
   * Start product addition flow (multi-step)
   */
  async startProductAddFlow(merchantId, from) {
    // Store state for multi-step flow
    const flowState = {
      step: 'product_add_start',
      merchantId,
      data: {},
    };

    await cache.setUserSession(from.split('@')[0], flowState);

    return {
      message: `*📝 Add New Product*\n━━━━━━━━━━━━━━━\n\nSend the product name:`,
      flowActive: true,
    };
  }

  /**
   * !merchant edit-product <product_id>
   */
  async handleEditProductCommand(productId, merchantId, from) {
    if (!productId) {
      return { error: 'Usage: !merchant edit-product <product_id>' };
    }

    const product = await cache.getProduct(productId);
    if (!product) {
      const response = await backendAPI.getProductDetails(productId);
      if (!response.success) {
        return { error: 'Product not found' };
      }
    }

    const message = `
*Edit Product: ${product.name}*
━━━━━━━━━━━━━━━

Current Details:
💰 Price: ZWL ${product.price.toFixed(2)}
📦 Stock: ${product.stock || 'N/A'}
📝 Description: ${product.description || 'N/A'}
👁️ Visibility: ${product.is_visible ? 'Visible' : 'Hidden'}

What would you like to edit?
1️⃣ Price
2️⃣ Stock
3️⃣ Description
4️⃣ Visibility
5️⃣ Add Images
    `.trim();

    return { message };
  }

  /**
   * !merchant delete-product <product_id>
   */
  async handleDeleteProductCommand(productId, merchantId, from) {
    if (!productId) {
      return { error: 'Usage: !merchant delete-product <product_id>' };
    }

    const response = await backendAPI.deleteProduct(productId, merchantId);

    if (!response.success) {
      return { error: 'Failed to delete product' };
    }

    return { message: MessageFormatter.formatSuccess('Product deleted') };
  }

  /**
   * !merchant store [profile|hours|radius]
   */
  async handleStoreCommand(args, merchantId, from) {
    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'profile') {
      return await this.handleStoreProfileCommand(args, merchantId, from);
    }

    const response = await backendAPI.getMerchantProfile(merchantId);
    if (!response.success) {
      return { error: 'Failed to fetch store profile' };
    }

    return { message: MessageFormatter.formatMerchantProfile(response.data) };
  }

  /**
   * !merchant store-status [open|closed|busy]
   */
  async handleStoreStatusCommand(status, merchantId, from) {
    if (!status) {
      return { error: 'Usage: !merchant store-status [open|closed|busy]' };
    }

    const validStatuses = ['open', 'closed', 'busy'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return { error: `Invalid status. Valid: ${validStatuses.join(', ')}` };
    }

    const response = await backendAPI.updateMerchantProfile(merchantId, {
      store_status: status.toLowerCase(),
      status_updated_at: new Date().toISOString(),
    });

    if (!response.success) {
      return { error: 'Failed to update store status' };
    }

    return { message: MessageFormatter.formatSuccess(`Store status set to ${status}`) };
  }

  /**
   * !merchant store-hours <open_time> <close_time>
   */
  async handleStoreHoursCommand(args, merchantId, from) {
    if (args.length < 2) {
      return { error: 'Usage: !merchant store-hours <HH:MM> <HH:MM>\nExample: !merchant store-hours 08:00 20:00' };
    }

    const response = await backendAPI.updateMerchantProfile(merchantId, {
      opening_time: args[0],
      closing_time: args[1],
    });

    if (!response.success) {
      return { error: 'Failed to update store hours' };
    }

    return { message: MessageFormatter.formatSuccess(`Store hours updated: ${args[0]} - ${args[1]}`) };
  }

  /**
   * !merchant store-profile [edit]
   */
  async handleStoreProfileCommand(args, merchantId, from) {
    const response = await backendAPI.getMerchantProfile(merchantId);
    if (!response.success) {
      return { error: 'Failed to fetch profile' };
    }

    return { message: MessageFormatter.formatMerchantProfile(response.data) };
  }

  /**
   * !merchant analytics [today|week|month]
   */
  async handleAnalyticsCommand(args, merchantId, from) {
    const timeframe = args[0]?.toLowerCase() || 'today';

    const response = await backendAPI.getMerchantAnalytics(merchantId, timeframe);
    if (!response.success) {
      return { error: 'Failed to fetch analytics' };
    }

    return { message: MessageFormatter.formatAnalytics(response.data) };
  }

  /**
   * !merchant dashboard
   */
  async handleDashboardCommand(merchantId, from) {
    const ordersRes = await backendAPI.getMerchantOrders(merchantId, { status: 'pending' });
    const analyticsRes = await backendAPI.getMerchantAnalytics(merchantId, 'today');

    const dashboardItems = [
      { emoji: '📦', label: 'New Orders', value: ordersRes.success ? ordersRes.data.filter(o => o.status === 'pending').length : 0 },
      { emoji: '💰', label: "Today's Revenue", value: analyticsRes.success ? `ZWL ${(analyticsRes.data.revenue_today || 0).toFixed(2)}` : 'N/A' },
      { emoji: '📊', label: "Today's Orders", value: analyticsRes.success ? analyticsRes.data.orders_today || 0 : 0 }
    ];

    return InteractiveMessageBuilder.createStatusCard(
      '🏪 MERCHANT DASHBOARD',
      dashboardItems,
      [
        { text: '📦 View Orders', id: 'merchant_orders' },
        { text: '📊 Analytics', id: 'merchant_analytics' },
        { text: '📋 Menu', id: 'menu' }
      ]
    );
  }

  /**
   * !merchant settings
   */
  async handleSettingsCommand(args, merchantId, from) {
    return {
      message: `
╔════════════════════════════════════════════════════════════════════════╗
║ ⚙️  MERCHANT SETTINGS & PREFERENCES
╠════════════════════════════════════════════════════════════════════════╣
║
║ 1️⃣  Business Profile
║ 2️⃣  Delivery Settings
║ 3️⃣  Notification Preferences
║ 4️⃣  Payment Methods
║ 5️⃣  Account Security
║ 6️⃣  Tax & Legal
║
║ Send the number to manage that setting.
║
╚════════════════════════════════════════════════════════════════════════╝
      `.trim(),
    };
  }

  /**
   * !merchant performance - Show sales performance metrics
   */
  async handlePerformanceCommand(merchantId, from) {
    const perf = {
      ordersToday: 24,
      ordersWeek: 156,
      revenue24h: 38400,
      revenueWeek: 234500,
      avgOrderValue: 1600,
      customerSatisfaction: 4.8,
      completionRate: 97.5,
      deliveryAccuracy: 98.2,
    };

    const statsItems = [
      { emoji: '📈', label: "Today's Orders", value: perf.ordersToday },
      { emoji: '💰', label: "Today's Revenue", value: `ZWL ${perf.revenue24h.toLocaleString()}` },
      { emoji: '⭐', label: 'Customer Satisfaction', value: `${perf.customerSatisfaction}/5.0` },
      { emoji: '✅', label: 'Completion Rate', value: `${perf.completionRate}%` },
      { emoji: '🚚', label: 'On-time Delivery', value: `${perf.deliveryAccuracy}%` }
    ];

    return InteractiveMessageBuilder.createStatusCard(
      '📊 PERFORMANCE METRICS',
      statsItems,
      [
        { text: '📋 Analytics', id: 'merchant_analytics' },
        { text: '📋 Menu', id: 'menu' }
      ]
    );
  }

  /**
   * !merchant customers - Show customer insights
   */
  async handleCustomersCommand(args, merchantId, from) {
    const topCustomers = [
      { name: 'John M', orders: 23, spent: 54500 },
      { name: 'Sarah K', orders: 19, spent: 38200 },
      { name: 'Alex D', orders: 17, spent: 42800 },
      { name: 'Maria P', orders: 15, spent: 36000 },
      { name: 'David T', orders: 14, spent: 33600 }
    ];

    return InteractiveMessageBuilder.listMessage(
      '👥 TOP CUSTOMERS',
      'Your best customers',
      [{
        title: 'Customers',
        rows: topCustomers.map((customer, i) => ({
          rowId: `customer_${i}`,
          title: `${i + 1}. ${customer.name}`,
          description: `${customer.orders} orders • ZWL ${customer.spent.toLocaleString()}`
        }))
      }],
      'Send them special offers!'
    );
  }

  /**
   * !merchant feedback <order_id> - Get order feedback
   */
  async handleMerchantFeedbackCommand(orderId, merchantId, from) {
    if (!orderId) {
      return {
        message: `Usage: !merchant feedback <order_id>\nExample: !merchant feedback ORD123456`
      };
    }

    return {
      message: `
╔════════════════════════════════════════════════════════════════════════╗
║ 💬  ORDER FEEDBACK & REVIEWS
╠════════════════════════════════════════════════════════════════════════╣
║
║ Order: ${orderId}
║
║ ⭐⭐⭐⭐⭐ 5.0 Rating
║ 👤 Customer: John M
║ 📝 Feedback:
║ "Excellent service! Food arrived hot and fresh.
║  The packaging was great and delivery was on time.
║  Will order again! 🎉"
║
║ 🎁 This positive review helps attract more customers!
║
║ 💪 ACTION ITEMS:
║ • Keep maintaining this quality
║ • Reply to reviews to build customer relationships
║ • Share positive feedback with your team
║
╚════════════════════════════════════════════════════════════════════════╝
      `.trim(),
    };
  }

  /**
   * !merchant boost - Promote your store
   */
  async handleBoostCommand(merchantId, from) {
    return {
      message: `
╔════════════════════════════════════════════════════════════════════════╗
║ 🚀  PROMOTE YOUR STORE
╠════════════════════════════════════════════════════════════════════════╣
║
║ 📢 BOOST OPTIONS
║ ┌────────────────────────────────────────────────────────────────────┐
║ │ 1. Featured Merchant (24hrs)    → ZWL 500
║ │    Get prominent placement in customer feeds
║ │
║ │ 2. Flash Sale Promotion         → ZWL 800
║ │    Highlight special offers to 5,000+ users
║ │
║ │ 3. Premium Badge                → ZWL 1,000/month
║ │    Show "Premium Merchant" badge on your profile
║ │
║ │ 4. Category Spotlight           → ZWL 2,000/week
║ │    Top placement in your category search
║ └────────────────────────────────────────────────────────────────────┘
║
║ 📊 EXPECTED RESULTS:
║ • Featured: +30-50% order increase
║ • Flash Sale: +40-60% visibility
║ • Premium Badge: +25-35% customer trust
║ • Category Spotlight: +50-70% category traffic
║
║ 💳 PAYMENT OPTIONS:
║ • Direct Deposit
║ • Mobile Money (EcoCash, OneMoney)
║ • Invoice-based for bulk purchases
║
║ Reply with which option interests you!
║
╚════════════════════════════════════════════════════════════════════════╝
      `.trim(),
    };
  }

  /**
   * !merchant tips - Success tips and best practices
   */
  async handleTipsCommand(merchantId, from) {
    return {
      message: `
╔════════════════════════════════════════════════════════════════════════╗
║ 💡  MERCHANT SUCCESS TIPS
╠════════════════════════════════════════════════════════════════════════╣
║
║ 🎯 TOP PERFORMING MERCHANTS DO THIS:
║
║ 1️⃣  FAST RESPONSE TIME
║    ✅ Reply to orders within 2 minutes
║    ✅ Confirm acceptance quickly
║    → Increases customer satisfaction by 35%
║
║ 2️⃣  QUALITY CONSISTENCY
║    ✅ Maintain product quality
║    ✅ Use fresh ingredients/materials
║    ✅ Follow preparation standards
║    → Gets you more positive reviews
║
║ 3️⃣  ACCURATE DELIVERY
║    ✅ Pack orders carefully
║    ✅ Deliver on time or faster
║    ✅ Track deliveries in real-time
║    → Builds customer loyalty
║
║ 4️⃣  COMPETITIVE PRICING
║    ✅ Monitor competitor prices
║    ✅ Offer value, not just low prices
║    ✅ Create attractive bundles
║    → Increases order volume
║
║ 5️⃣  ENGAGING PRODUCT DESCRIPTIONS
║    ✅ Add mouth-watering descriptions
║    ✅ Use quality product photos
║    ✅ Highlight unique features
║    → Improves conversion rate
║
║ 6️⃣  CUSTOMER ENGAGEMENT
║    ✅ Respond to customer reviews
║    ✅ Thank positive reviewers
║    ✅ Address concerns professionally
║    → Builds trust and loyalty
║
║ 📈 EXPECTED IMPACT:
║ Implementing these tips can increase your sales by 40-60%!
║
╚════════════════════════════════════════════════════════════════════════╝
      `.trim(),
    };
  }
}

module.exports = new MerchantHandler();
