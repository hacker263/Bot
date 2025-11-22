/**
 * Merchant Command Handlers
 * Manages product listings, orders, store settings, analytics
 */

const backendAPI = require('../api/backendAPI');
const authMiddleware = require('../middlewares/auth');
const cache = require('../database/cache');
const MessageFormatter = require('../utils/messageFormatter');
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
      return { error: 'Failed to fetch orders' };
    }

    const orders = response.data;
    if (orders.length === 0) {
      return { message: `No ${timeframe} orders found.` };
    }

    let message = `*${timeframe.toUpperCase()} ORDERS (${orders.length})*\n━━━━━━━━━━━━━━━\n\n`;

    orders.slice(0, 10).forEach((order, i) => {
      message += `${i + 1}. Order #${order.id}\n`;
      message += `   Customer: ${order.customer_name} (${order.customer_phone})\n`;
      message += `   Items: ${order.items_count || order.items?.length}\n`;
      message += `   Total: ZWL ${order.total.toFixed(2)}\n`;
      message += `   Status: ${MessageFormatter.getStatusEmoji(order.status)} ${order.status}\n`;
      message += `   Time: ${new Date(order.created_at).toLocaleTimeString()}\n\n`;
    });

    message += `To accept: *!merchant accept <order_id>*\n`;
    message += `To reject: *!merchant reject <order_id> [reason]*\n`;
    message += `To update: *!merchant update-status <order_id> <status>*`;

    return { message };
  }

  /**
   * !merchant accept <order_id>
   */
  async handleAcceptOrderCommand(orderId, merchantId, from) {
    if (!orderId) {
      return { error: 'Usage: !merchant accept <order_id>' };
    }

    const response = await backendAPI.updateOrderStatus(orderId, 'confirmed', merchantId);

    if (!response.success) {
      return { error: 'Failed to accept order' };
    }

    const order = response.data;
    const customerMessage = `✅ *Your order #${order.id} has been accepted!*\n\nMerchant: ${order.merchant_name}\nEstimated time: ${order.estimated_time || '30-45 mins'}\n\nYou'll be notified when it's ready.`;

    return {
      message: MessageFormatter.formatSuccess('Order accepted!'),
      notifyUser: { phone: order.customer_phone, message: customerMessage },
    };
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
   * !merchant update-status <order_id> <status>
   */
  async handleUpdateOrderStatusCommand(orderId, status, merchantId, from) {
    if (!orderId || !status) {
      return { error: 'Usage: !merchant update-status <order_id> <status>' };
    }

    const validStatuses = ['preparing', 'ready', 'out_for_delivery', 'delivered'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return { error: `Invalid status. Valid: ${validStatuses.join(', ')}` };
    }

    const response = await backendAPI.updateOrderStatus(orderId, status, merchantId);

    if (!response.success) {
      return { error: 'Failed to update order' };
    }

    const order = response.data;
    const statusMessages = {
      preparing: '👨‍🍳 Your order is being prepared!',
      ready: '📦 Your order is ready for pickup/delivery!',
      out_for_delivery: '🚚 Your order is on the way!',
      delivered: '✅ Your order has been delivered!',
    };

    const customerMessage = `${MessageFormatter.getStatusEmoji(status)} *Order Update*\n\n${statusMessages[status]}\n\nOrder #${order.id}`;

    return {
      message: MessageFormatter.formatSuccess(`Order status updated to ${status}`),
      notifyUser: { phone: order.customer_phone, message: customerMessage },
    };
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

    let message = `*🏪 Merchant Dashboard*\n━━━━━━━━━━━━━━━\n\n`;

    if (ordersRes.success) {
      const newOrders = ordersRes.data.filter(o => o.status === 'pending').length;
      message += `📦 New Orders: ${newOrders}\n`;
    }

    if (analyticsRes.success) {
      message += `💰 Today's Revenue: ZWL ${(analyticsRes.data.revenue_today || 0).toFixed(2)}\n`;
      message += `📊 Orders Today: ${analyticsRes.data.orders_today || 0}\n`;
    }

    message += `\nQuick Links:\n`;
    message += `!merchant orders new\n`;
    message += `!merchant analytics\n`;
    message += `!merchant products\n`;
    message += `!merchant store`;

    return { message };
  }

  /**
   * !merchant settings
   */
  async handleSettingsCommand(args, merchantId, from) {
    return {
      message: `
*⚙️ Merchant Settings*
━━━━━━━━━━━━━━━

1️⃣ Business Profile
2️⃣ Delivery Settings
3️⃣ Notification Preferences
4️⃣ Payment Methods
5️⃣ Account Security

Send the number to manage that setting.
      `.trim(),
    };
  }
}

module.exports = new MerchantHandler();
