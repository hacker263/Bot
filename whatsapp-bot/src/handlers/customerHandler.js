/**
 * Customer Command Handlers
 * Manages browsing, searching, cart operations, orders
 */

const backendAPI = require('../api/backendAPI');
const authMiddleware = require('../middlewares/auth');
const cache = require('../database/cache');
const MessageFormatter = require('../utils/messageFormatter');
const Logger = require('../config/logger');

const logger = new Logger('CustomerHandler');

class CustomerHandler {
  /**
   * Handle customer commands
   */
  async handleCustomerCommand(command, args, from, phoneNumber) {
    try {
      const session = await cache.getUserSession(phoneNumber);

      // Add to command history
      await cache.addCommandHistory(phoneNumber, `customer ${command}`);

      switch (command) {
        // Browsing
        case 'menu':
        case 'm':
          return await this.handleMenuCommand(args, phoneNumber, from);
        
        case 'search':
          return await this.handleSearchCommand(args.join(' '), phoneNumber, from);
        
        case 'categories':
          return await this.handleCategoriesCommand(phoneNumber, from);
        
        case 'nearby':
          return await this.handleNearbyCommand(args, phoneNumber, from);
        
        case 'store':
          return await this.handleStoreDetailsCommand(args[0], phoneNumber, from);
        
        // Cart operations
        case 'add':
          return await this.handleAddToCartCommand(args, phoneNumber, from);
        
        case 'cart':
        case 'c':
          return await this.handleShowCartCommand(phoneNumber, from);
        
        case 'remove':
          return await this.handleRemoveFromCartCommand(args[0], phoneNumber, from);
        
        case 'clear':
          return await this.handleClearCartCommand(phoneNumber, from);
        
        // Checkout & Orders
        case 'checkout':
        case 'pay':
          return await this.handleCheckoutCommand(phoneNumber, from);
        
        case 'orders':
          return await this.handleOrdersCommand(phoneNumber, from);
        
        case 'reorder':
          return await this.handleReorderCommand(args[0], phoneNumber, from);
        
        case 'track':
        case 'status':
          return await this.handleTrackOrderCommand(args[0], phoneNumber, from);
        
        case 'rate':
          return await this.handleRateOrderCommand(args[0], args[1], phoneNumber, from);
        
        // Preferences
        case 'favorites':
          return await this.handleFavoritesCommand(args, phoneNumber, from);
        
        case 'addresses':
          return await this.handleAddressesCommand(args, phoneNumber, from);
        
        case 'deals':
          return await this.handleDealsCommand(phoneNumber, from);
        
        default:
          return null;
      }
    } catch (error) {
      logger.error('Customer command error', error);
      return { error: error.message };
    }
  }

  /**
   * !menu or !m
   */
  async handleMenuCommand(args, phoneNumber, from) {
    const response = await backendAPI.getProducts({});
    if (!response.success || response.data.length === 0) {
      return { message: 'No products available. Please try again later.' };
    }

    const products = response.data.slice(0, 15);
    let message = `*🛒 Available Products*\n━━━━━━━━━━━━━━━\n\n`;

    products.forEach((product, i) => {
      message += `${i + 1}. *${product.name}*\n`;
      message += `   💰 ZWL ${product.price.toFixed(2)}\n`;
      message += `   ID: \`${product.id}\`\n\n`;
    });

    message += `To add to cart: *!add <product_id> <quantity>*\nExample: \`!add prod123 2\``;

    return { message };
  }

  /**
   * !search <query>
   */
  async handleSearchCommand(query, phoneNumber, from) {
    if (!query || query.length < 2) {
      return { error: 'Search query too short. Try: !search noodles' };
    }

    const response = await backendAPI.searchProducts(query);
    if (!response.success || response.data.length === 0) {
      return { message: `No products found for "${query}". Try a different search.` };
    }

    let message = `*🔍 Search Results for "${query}"*\n━━━━━━━━━━━━━━━\n\n`;
    const results = response.data.slice(0, 10);

    results.forEach((product, i) => {
      message += `${i + 1}. *${product.name}*\n`;
      message += `   🏪 ${product.merchant_name}\n`;
      message += `   💰 ZWL ${product.price.toFixed(2)}\n`;
      message += `   ⭐ ${product.rating || 'N/A'}\n`;
      message += `   ID: \`${product.id}\`\n\n`;
    });

    if (response.data.length > 10) {
      message += `\n... and ${response.data.length - 10} more results`;
    }

    message += `\nTo add: *!add <id> <qty>*`;

    return { message };
  }

  /**
   * !categories
   */
  async handleCategoriesCommand(phoneNumber, from) {
    const categories = [
      '🍔 Food & Restaurants',
      '🛍️ Retail & Shopping',
      '📚 Books & Media',
      '👕 Fashion & Apparel',
      '🏥 Health & Wellness',
      '⚙️ Electronics',
      '🌿 Groceries',
    ];

    let message = `*📂 Product Categories*\n━━━━━━━━━━━━━━━\n\n`;
    categories.forEach((cat, i) => {
      message += `${i + 1}. ${cat}\n`;
    });

    message += `\nTo browse: *!search <category>*`;

    return { message };
  }

  /**
   * !nearby [category]
   */
  async handleNearbyCommand(args, phoneNumber, from) {
    const category = args[0] || 'all';

    let message = `*📍 Stores Near You*\n━━━━━━━━━━━━━━━\n\n`;
    message += `Harare & Bulawayo Area:\n\n`;
    message += `🏪 Top Stores:\n`;
    message += `1. Supa Stores - 2km away ⭐⭐⭐⭐⭐\n`;
    message += `2. Quick Mart - 3.5km away ⭐⭐⭐⭐\n`;
    message += `3. Local Bakery - 1.2km away ⭐⭐⭐⭐⭐\n\n`;

    message += `To view store: *!store <store_id>*\n`;
    message += `To search items: *!search <item>*`;

    return { message };
  }

  /**
   * !store <store_id>
   */
  async handleStoreDetailsCommand(storeId, phoneNumber, from) {
    if (!storeId) {
      return { error: 'Usage: !store <store_id>' };
    }

    const response = await backendAPI.getMerchantProfile(storeId);
    if (!response.success) {
      return { error: 'Store not found' };
    }

    return { message: MessageFormatter.formatMerchantProfile(response.data) };
  }

  /**
   * !add <product_id> <quantity>
   */
  async handleAddToCartCommand(args, phoneNumber, from) {
    if (!args[0] || !args[1]) {
      return { error: 'Usage: !add <product_id> <quantity>\nExample: !add prod123 2' };
    }

    const productId = args[0];
    const quantity = parseInt(args[1]);

    if (isNaN(quantity) || quantity < 1) {
      return { error: 'Invalid quantity. Must be a number ≥ 1' };
    }

    // Fetch product details
    const productRes = await backendAPI.getProductDetails(productId);
    if (!productRes.success) {
      return { error: 'Product not found' };
    }

    const product = productRes.data;

    // Get current cart
    let cart = await cache.getUserCart(phoneNumber);
    if (!cart.items) cart.items = [];

    // Check if product already in cart
    const existingItem = cart.items.find(item => item.id === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        id: productId,
        name: product.name,
        price: product.price,
        quantity,
        merchant_id: product.merchant_id,
      });
    }

    // Recalculate total
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Save cart
    await cache.setUserCart(phoneNumber, cart);

    return {
      message: MessageFormatter.formatSuccess(
        `Added ${quantity}x ${product.name} to cart!\n\n💰 Cart Total: ZWL ${cart.total.toFixed(2)}\n\nType *!cart* to view or *!checkout* to order`
      ),
    };
  }

  /**
   * !cart or !c
   */
  async handleShowCartCommand(phoneNumber, from) {
    const cart = await cache.getUserCart(phoneNumber);
    return { message: MessageFormatter.formatCart(cart) };
  }

  /**
   * !remove <item_index>
   */
  async handleRemoveFromCartCommand(itemIndex, phoneNumber, from) {
    if (!itemIndex) {
      return { error: 'Usage: !remove <item_index>\nGet index from !cart command' };
    }

    const index = parseInt(itemIndex) - 1;
    let cart = await cache.getUserCart(phoneNumber);

    if (index < 0 || index >= cart.items.length) {
      return { error: 'Invalid item index' };
    }

    const removed = cart.items.splice(index, 1)[0];
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    await cache.setUserCart(phoneNumber, cart);

    return {
      message: MessageFormatter.formatSuccess(
        `Removed ${removed.name} from cart\n\nNew Total: ZWL ${cart.total.toFixed(2)}`
      ),
    };
  }

  /**
   * !clear
   */
  async handleClearCartCommand(phoneNumber, from) {
    await cache.clearUserCart(phoneNumber);
    return { message: '✨ Cart cleared!' };
  }

  /**
   * !checkout or !pay
   */
  async handleCheckoutCommand(phoneNumber, from) {
    const cart = await cache.getUserCart(phoneNumber);

    if (!cart.items || cart.items.length === 0) {
      return { message: '🛒 Your cart is empty. Add items first!' };
    }

    const session = await cache.getUserSession(phoneNumber);

    // Create order in backend
    const orderRes = await backendAPI.createOrder(phoneNumber, {
      items: cart.items,
      total: cart.total,
      customer_name: session?.name || 'Customer',
      delivery_type: 'delivery', // Could offer choice here
      delivery_address: session?.delivery_address || '',
    });

    if (!orderRes.success) {
      return { error: `Failed to create order: ${orderRes.error}` };
    }

    const order = orderRes.data;

    // Clear cart after successful order
    await cache.clearUserCart(phoneNumber);

    const message = `
✅ *Order Placed Successfully!*
━━━━━━━━━━━━━━━

Order ID: \`${order.id}\`
Total: ZWL ${order.total.toFixed(2)}

🚚 Delivery Address:
${session?.delivery_address || 'Pickup'}

Your order has been sent to the merchant.
You'll receive updates as it progresses.

Type *!track ${order.id}* to track your order
    `.trim();

    return { message };
  }

  /**
   * !orders
   */
  async handleOrdersCommand(phoneNumber, from) {
    const response = await backendAPI.getCustomerOrders(phoneNumber);
    if (!response.success || response.data.length === 0) {
      return { message: 'You have no orders yet. Type !menu to browse and !add to order.' };
    }

    const orders = response.data.slice(0, 10);
    let message = `*📦 Your Orders (${orders.length})*\n━━━━━━━━━━━━━━━\n\n`;

    orders.forEach((order, i) => {
      message += `${i + 1}. Order #${order.id}\n`;
      message += `   🏪 ${order.merchant_name}\n`;
      message += `   💰 ZWL ${order.total.toFixed(2)}\n`;
      message += `   Status: ${MessageFormatter.getStatusEmoji(order.status)} ${order.status}\n`;
      message += `   Date: ${new Date(order.created_at).toLocaleDateString()}\n\n`;
    });

    message += `To track: *!track <order_id>*\n`;
    message += `To reorder: *!reorder <order_id>*`;

    return { message };
  }

  /**
   * !reorder <order_id>
   */
  async handleReorderCommand(orderId, phoneNumber, from) {
    if (!orderId) {
      return { error: 'Usage: !reorder <order_id>' };
    }

    const orderRes = await backendAPI.getOrderStatus(orderId);
    if (!orderRes.success) {
      return { error: 'Order not found' };
    }

    const order = orderRes.data;
    let cart = await cache.getUserCart(phoneNumber);

    // Add items from previous order to cart
    order.items.forEach(item => {
      const existing = cart.items.find(i => i.id === item.id);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        cart.items.push(item);
      }
    });

    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    await cache.setUserCart(phoneNumber, cart);

    return {
      message: MessageFormatter.formatSuccess(
        `Reordered items from Order #${orderId}!\n\n💰 New Cart Total: ZWL ${cart.total.toFixed(2)}\n\nType *!checkout* to place order`
      ),
    };
  }

  /**
   * !track <order_id>
   */
  async handleTrackOrderCommand(orderId, phoneNumber, from) {
    if (!orderId) {
      return { error: 'Usage: !track <order_id>' };
    }

    const response = await backendAPI.getOrderStatus(orderId);
    if (!response.success) {
      return { error: 'Order not found' };
    }

    return { message: MessageFormatter.formatOrder(response.data) };
  }

  /**
   * !rate <order_id> <rating>
   */
  async handleRateOrderCommand(orderId, rating, phoneNumber, from) {
    if (!orderId || !rating) {
      return { error: 'Usage: !rate <order_id> <rating_1_to_5>' };
    }

    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      return { error: 'Rating must be 1 to 5' };
    }

    // Post rating to backend
    const response = await backendAPI.request('POST', `/api/orders/${orderId}/rating`, {
      customer_phone: phoneNumber,
      rating: ratingNum,
    });

    if (!response.success) {
      return { error: 'Failed to save rating' };
    }

    return { message: MessageFormatter.formatSuccess(`Thanks for your ${ratingNum}⭐ rating!`) };
  }

  /**
   * !favorites [add|remove|list] <store_id>
   */
  async handleFavoritesCommand(args, phoneNumber, from) {
    const action = args[0]?.toLowerCase() || 'list';

    if (action === 'list') {
      let message = `*❤️ Your Favorite Stores*\n━━━━━━━━━━━━━━━\n\n`;
      message += `1. Supa Stores\n2. Quick Mart\n3. Local Bakery\n\n`;
      message += `To add: *!favorites add <store_id>*\n`;
      message += `To remove: *!favorites remove <store_id>*`;

      return { message };
    }

    if (action === 'add' && args[1]) {
      return { message: MessageFormatter.formatSuccess(`Store added to favorites!`) };
    }

    if (action === 'remove' && args[1]) {
      return { message: MessageFormatter.formatSuccess(`Store removed from favorites`) };
    }

    return { error: 'Usage: !favorites [list|add|remove] [store_id]' };
  }

  /**
   * !addresses [list|add|remove] [address]
   */
  async handleAddressesCommand(args, phoneNumber, from) {
    const action = args[0]?.toLowerCase() || 'list';

    if (action === 'list') {
      let message = `*📍 Your Delivery Addresses*\n━━━━━━━━━━━━━━━\n\n`;
      message += `1. 123 Main Street, Harare\n2. 456 Work Ave, CBD\n\n`;
      message += `To add: *!addresses add <address>*\n`;
      message += `To remove: *!addresses remove <number>*`;

      return { message };
    }

    return { error: 'Usage: !addresses [list|add|remove]' };
  }

  /**
   * !deals
   */
  async handleDealsCommand(phoneNumber, from) {
    return {
      message: `
*🎉 Active Deals & Offers*
━━━━━━━━━━━━━━━

🔥 Hot Deals:
• 30% off on Groceries Today
• Buy 2 Pizzas Get 1 Free
• Free Delivery on Orders > ZWL 500

⏰ Limited Time:
• Flash Sale: 50% off Electronics (Ends 20:00)
• Breakfast Special: 40% off 7-10am

💰 New Customer:
• First order: 20% OFF (Max ZWL 50)
• Code: WELCOME20

Type *!search <item>* to find deals
      `.trim(),
    };
  }
}

module.exports = new CustomerHandler();
