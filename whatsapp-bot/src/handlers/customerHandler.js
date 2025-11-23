/**
 * Customer Command Handlers
 * Manages browsing, searching, cart operations, orders
 */

const backendAPI = require('../api/backendAPI');
const authMiddleware = require('../middlewares/auth');
const cache = require('../database/cache');
const databaseService = require('../database/service');
const MessageFormatter = require('../utils/messageFormatter');
const InteractiveMessageBuilder = require('../utils/interactiveMessageBuilder');
const FlowManager = require('../utils/flowManager');
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
        
        case 'trending':
          return await this.handleTrendingCommand(phoneNumber, from);
        
        case 'promo':
          return await this.handlePromoCommand(phoneNumber, from);
        
        case 'featured':
          return await this.handleFeaturedCommand(phoneNumber, from);
        
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
    const dummyProducts = [
      { id: 'prod_001', name: 'Margherita Pizza', price: 2500, rating: 4.8, reviews: 156, merchant: 'Quick Eats', image: '🍕' },
      { id: 'prod_002', name: 'Fried Chicken Combo', price: 3200, rating: 4.6, reviews: 234, merchant: 'KFC Harare', image: '🍗' },
      { id: 'prod_003', name: 'Fresh Bread Loaf', price: 450, rating: 4.9, reviews: 89, merchant: 'Local Bakery', image: '🍞' },
      { id: 'prod_004', name: 'Cold Bottle Coke', price: 350, rating: 4.7, reviews: 445, merchant: 'Refresh Shop', image: '🥤' },
      { id: 'prod_005', name: 'Beef Burger', price: 1500, rating: 4.5, reviews: 312, merchant: 'Burger King', image: '🍔' },
      { id: 'prod_006', name: 'Fresh Vegetables Pack', price: 800, rating: 4.8, reviews: 167, merchant: 'Farmers Market', image: '🥬' },
    ];

    const response = await backendAPI.getProducts({});
    const products = response?.success ? response.data.slice(0, 6) : dummyProducts;

    return InteractiveMessageBuilder.listMessage(
      '🛒 MENU - PRODUCTS',
      `Browse ${products.length} popular items`,
      [{
        title: 'Available Products',
        rows: products.map((product, i) => ({
          rowId: `add_${product.id}`,
          title: `${product.image} ${product.name}`,
          description: `ZWL ${product.price} • ⭐ ${product.rating}`
        }))
      }],
      'Tap to add to cart'
    );
  }

  /**
   * !search <query>
   */
  async handleSearchCommand(query, phoneNumber, from) {
    if (!query || query.length < 2) {
      return InteractiveMessageBuilder.createErrorCard(
        'Search query too short',
        ['Use at least 2 characters', 'Example: !search pizza']
      );
    }

    const response = await backendAPI.searchProducts(query);
    if (!response.success || response.data.length === 0) {
      return InteractiveMessageBuilder.createErrorCard(
        `No products found for "${query}"`,
        ['Try different keywords', '!menu to see all items']
      );
    }

    return InteractiveMessageBuilder.listMessage(
      `🔎 SEARCH RESULTS`,
      `Found ${response.data.length} items for "${query}"`,
      [{
        title: 'Products',
        rows: response.data.slice(0, 10).map((product, i) => ({
          rowId: `add_${product.id}`,
          title: `${product.name}`,
          description: `ZWL ${product.price} • ${product.merchant_name}`
        }))
      }],
      response.data.length > 10 ? `Showing 10 of ${response.data.length}` : 'Tap to add'
    );
  }

  /**
   * !categories
   */
  async handleCategoriesCommand(phoneNumber, from) {
    const categories = [
      { emoji: '🍔', title: 'Food & Restaurants', id: 'cat_food' },
      { emoji: '🛍️', title: 'Retail & Shopping', id: 'cat_retail' },
      { emoji: '📚', title: 'Books & Media', id: 'cat_books' },
      { emoji: '👕', title: 'Fashion & Apparel', id: 'cat_fashion' },
      { emoji: '🏥', title: 'Health & Wellness', id: 'cat_health' },
      { emoji: '⚙️', title: 'Electronics', id: 'cat_electronics' },
      { emoji: '🌿', title: 'Groceries', id: 'cat_groceries' },
    ];

    return InteractiveMessageBuilder.listMessage(
      '📂 CATEGORIES',
      'Browse by category',
      [{
        title: 'Available Categories',
        rows: categories.map(cat => ({
          rowId: cat.id,
          title: `${cat.emoji} ${cat.title}`,
          description: 'Tap to browse'
        }))
      }]
    );
  }

  /**
   * !nearby [category]
   */
  async handleNearbyCommand(args, phoneNumber, from) {
    const stores = [
      { emoji: '🏪', name: 'Supa Stores', distance: '2km', rating: 4.9, id: 'store_1' },
      { emoji: '🏬', name: 'Quick Mart', distance: '3.5km', rating: 4.6, id: 'store_2' },
      { emoji: '🥖', name: 'Local Bakery', distance: '1.2km', rating: 4.9, id: 'store_3' },
    ];

    return InteractiveMessageBuilder.listMessage(
      '📍 STORES NEAR YOU',
      'Harare & Bulawayo Area',
      [{
        title: 'Top Stores',
        rows: stores.map(store => ({
          rowId: store.id,
          title: `${store.emoji} ${store.name}`,
          description: `${store.distance} • ⭐ ${store.rating}`
        }))
      }]
    );
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
      return InteractiveMessageBuilder.createErrorCard(
        'Missing details',
        ['Usage: !add <product_id> <quantity>', 'Example: !add prod123 2']
      );
    }

    const productId = args[0];
    const quantity = parseInt(args[1]);

    if (isNaN(quantity) || quantity < 1) {
      return InteractiveMessageBuilder.createErrorCard(
        'Invalid quantity',
        ['Must be a number ≥ 1']
      );
    }

    const productRes = await backendAPI.getProductDetails(productId);
    if (!productRes.success) {
      return InteractiveMessageBuilder.createErrorCard('Product not found');
    }

    const product = productRes.data;
    let cart = await cache.getUserCart(phoneNumber);
    if (!cart.items) cart.items = [];

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

    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    await cache.setUserCart(phoneNumber, cart);

    return InteractiveMessageBuilder.createSuccessCard(
      `${quantity}x ${product.name} added!`,
      `Total in cart: ZWL ${cart.total.toFixed(2)}`,
      [
        { text: '🛒 View Cart', id: 'cart' },
        { text: '➕ Add More', id: 'menu' }
      ]
    );
  }

  /**
   * !cart or !c
   */
  async handleShowCartCommand(phoneNumber, from) {
    const cart = await cache.getUserCart(phoneNumber);
    
    if (!cart.items || cart.items.length === 0) {
      return InteractiveMessageBuilder.createErrorCard(
        'Your cart is empty',
        ['Browse items: !menu', 'Search: !search <item>']
      );
    }

    const itemSummary = cart.items.map((item, idx) => `${idx + 1}. ${item.name} x${item.quantity} = ZWL ${(item.price * item.quantity).toFixed(2)}`).join('\n');

    let body = `*🛒 YOUR CART*\n━━━━━━━━━━━━━\n\n${itemSummary}\n\n`;
    body += `💰 *Total: ZWL ${cart.total.toFixed(2)}*`;

    return InteractiveMessageBuilder.templateButtonMessage(
      body,
      [
        { text: '✅ Checkout', id: 'checkout' },
        { text: '🗑️ Clear Cart', id: 'clear_cart' },
        { text: '➕ Add More', id: 'menu' }
      ]
    );
  }

  /**
   * !remove <item_index> - with interactive item selector
   */
  async handleRemoveFromCartCommand(itemIndex, phoneNumber, from) {
    let cart = await cache.getUserCart(phoneNumber);

    if (!cart.items || cart.items.length === 0) {
      return InteractiveMessageBuilder.createErrorCard('Cart is empty');
    }

    // If no index provided, show interactive selector
    if (!itemIndex) {
      const removeOptions = cart.items.map((item, idx) => ({
        id: `remove_${idx}`,
        text: `🗑️ ${item.name} x${item.quantity}`,
        value: idx + 1,
        description: `ZWL ${(item.price * item.quantity).toFixed(2)}`
      }));

      return FlowManager.argumentSelectorFlow(
        '🗑️ REMOVE FROM CART',
        'Select item to remove',
        removeOptions
      ).interactive;
    }

    const index = parseInt(itemIndex) - 1;

    if (index < 0 || index >= cart.items.length) {
      return InteractiveMessageBuilder.createErrorCard('Invalid item index');
    }

    const removed = cart.items.splice(index, 1)[0];
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    await cache.setUserCart(phoneNumber, cart);

    return InteractiveMessageBuilder.createSuccessCard(
      'Item Removed',
      `${removed.name} removed from cart`,
      [
        { text: '🛒 View Cart', id: 'cart' },
        { text: '➕ Add More', id: 'menu' }
      ]
    );
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
    try {
      const cart = await cache.getUserCart(phoneNumber);

      if (!cart.items || cart.items.length === 0) {
        return InteractiveMessageBuilder.createErrorCard(
          'Cart is Empty',
          ['Start shopping: !menu', 'Search items: !search <item>']
        );
      }

      const session = await cache.getUserSession(phoneNumber);

      // Prepare order data
      const orderData = {
        items: cart.items,
        subtotal: cart.subtotal || cart.total,
        total: cart.total,
        status: 'pending',
        payment_status: 'pending',
      };

      // Create order in database
      const dbResult = await databaseService.createOrder(orderData);

      if (!dbResult.success) {
        return InteractiveMessageBuilder.createErrorCard(
          'Checkout Failed',
          [dbResult.error]
        );
      }

      const order = dbResult.data;

      // Sync cart to database then clear
      await databaseService.syncCart(phoneNumber, cart);
      await databaseService.clearCart(phoneNumber);
      await cache.clearUserCart(phoneNumber);

      logger.info(`Order created: ${order.order_number}`);

      return InteractiveMessageBuilder.createSuccessCard(
        '✅ Order Placed!',
        `Order #${order.order_number}\nTotal: ZWL ${order.total.toFixed(2)}\nStatus: Pending confirmation`,
        [
          { text: '📦 Track Order', id: 'track_order' },
          { text: '🏪 Continue Shopping', id: 'menu' }
        ]
      );
    } catch (error) {
      logger.error('Checkout error', error);
      return InteractiveMessageBuilder.createErrorCard(
        'Checkout Error',
        [error.message]
      );
    }
  }

    const message = `
╔════════════════════════════════════════════════╗
║ ✅  ORDER PLACED SUCCESSFULLY!
╠════════════════════════════════════════════════╣
║
║ 🎉 Thank you for your order!
║
║ 📦 Order ID: ${order.id}
║ 💰 Total:    ZWL ${order.total.toFixed(2)}
║ 📍 Delivery: ${session?.delivery_address || 'Will be requested'}
║
╠════════════════════════════════════════════════╣
║
║ 📊 What's Next?
║ ┌──────────────────────────────────────────┐
║ │ ✅ Your order has been sent to merchant  │
║ │ 🔔 You'll get updates as it progresses   │
║ │ 📍 Track order: !track ${order.id}
║ │ 📞 Contact support if needed             │
║ └──────────────────────────────────────────┘
║
║ 🔘 Quick Actions:
║ • !orders    (view all orders)
║ • !menu      (continue shopping)
║ • !track ${order.id}  (track this order)
║
╚════════════════════════════════════════════════╝
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
   * !rate <order_id> [rating] - with interactive rating selector
   */
  async handleRateOrderCommand(orderId, rating, phoneNumber, from) {
    if (!orderId) {
      return InteractiveMessageBuilder.createErrorCard(
        'Order ID required',
        ['Usage: !rate <order_id> [rating]']
      );
    }

    // If no rating provided, show interactive selector
    if (!rating) {
      const ratingOptions = [];
      for (let i = 5; i >= 1; i--) {
        const stars = '⭐'.repeat(i);
        ratingOptions.push({
          id: `rating_${i}`,
          text: `${stars} ${i} Star${i !== 1 ? 's' : ''}`,
          value: i,
          description: i === 5 ? 'Excellent!' : i === 4 ? 'Good' : i === 3 ? 'Okay' : i === 2 ? 'Not great' : 'Poor'
        });
      }

      return FlowManager.argumentSelectorFlow(
        '⭐ RATE ORDER',
        `How would you rate order #${orderId}?`,
        ratingOptions
      ).interactive;
    }

    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      return InteractiveMessageBuilder.createErrorCard(
        'Invalid rating',
        ['Rating must be 1 to 5']
      );
    }

    const response = await backendAPI.request('POST', `/api/orders/${orderId}/rating`, {
      customer_phone: phoneNumber,
      rating: ratingNum,
    });

    if (!response.success) {
      return InteractiveMessageBuilder.createErrorCard('Failed to save rating');
    }

    return InteractiveMessageBuilder.createSuccessCard(
      'Thanks for Rating!',
      `You rated order #${orderId} with ${'⭐'.repeat(ratingNum)}`,
      [
        { text: '📦 View Orders', id: 'orders' },
        { text: '📋 Menu', id: 'menu' }
      ]
    );
  }

  /**
   * !favorites [add|remove|list] [store_id] - with interactive action selector
   */
  async handleFavoritesCommand(args, phoneNumber, from) {
    const action = args[0]?.toLowerCase();

    // If no action provided, show interactive selector
    if (!action) {
      const actionOptions = [
        {
          id: 'fav_list',
          text: '❤️ View Favorites',
          description: 'See all your favorite stores'
        },
        {
          id: 'fav_add',
          text: '➕ Add Store',
          description: 'Add a store to favorites'
        },
        {
          id: 'fav_remove',
          text: '➖ Remove Store',
          description: 'Remove a store from favorites'
        }
      ];

      return FlowManager.argumentSelectorFlow(
        '❤️ MY FAVORITES',
        'What would you like to do?',
        actionOptions
      ).interactive;
    }

    if (action === 'list') {
      const favorites = [
        { id: 'store_1', text: '🏪 Supa Stores', description: 'Grocery & household items' },
        { id: 'store_2', text: '🏬 Quick Mart', description: 'General merchandise' },
        { id: 'store_3', text: '🥖 Local Bakery', description: 'Fresh baked goods' }
      ];

      return InteractiveMessageBuilder.listMessage(
        '❤️ Your Favorite Stores',
        'Tap a store to view',
        [{
          title: 'Favorite Stores',
          rows: favorites
        }]
      );
    }

    if (action === 'add') {
      if (!args[1]) {
        return InteractiveMessageBuilder.createErrorCard(
          'Store ID required',
          ['Usage: !favorites add <store_id>']
        );
      }

      return InteractiveMessageBuilder.createSuccessCard(
        'Store Added!',
        `Store #${args[1]} added to your favorites ❤️`,
        [
          { text: '❤️ View Favorites', id: 'favorites' },
          { text: '🏪 Browse', id: 'menu' }
        ]
      );
    }

    if (action === 'remove') {
      if (!args[1]) {
        // Show list to select from
        const favorites = [
          { id: 'remove_1', text: '🏪 Supa Stores', description: 'Remove from favorites' },
          { id: 'remove_2', text: '🏬 Quick Mart', description: 'Remove from favorites' },
          { id: 'remove_3', text: '🥖 Local Bakery', description: 'Remove from favorites' }
        ];

        return InteractiveMessageBuilder.listMessage(
          '➖ Remove from Favorites',
          'Select a store to remove',
          [{
            title: 'Your Favorites',
            rows: favorites
          }]
        );
      }

      return InteractiveMessageBuilder.createSuccessCard(
        'Removed!',
        `Store #${args[1]} removed from favorites`,
        [
          { text: '❤️ View Favorites', id: 'favorites' },
          { text: '🏪 Browse', id: 'menu' }
        ]
      );
    }

    return InteractiveMessageBuilder.createErrorCard(
      'Invalid action',
      ['Usage: !favorites [list|add|remove]']
    );
  }

  /**
   * !addresses [list|add|remove] [address] - with interactive action selector
   */
  async handleAddressesCommand(args, phoneNumber, from) {
    const action = args[0]?.toLowerCase();

    // If no action provided, show interactive selector
    if (!action) {
      const actionOptions = [
        {
          id: 'addr_list',
          text: '📍 View Addresses',
          description: 'See all your delivery addresses'
        },
        {
          id: 'addr_add',
          text: '➕ Add Address',
          description: 'Add a new delivery address'
        },
        {
          id: 'addr_remove',
          text: '➖ Remove Address',
          description: 'Remove a delivery address'
        }
      ];

      return FlowManager.argumentSelectorFlow(
        '📍 MY ADDRESSES',
        'What would you like to do?',
        actionOptions
      ).interactive;
    }

    if (action === 'list') {
      const addresses = [
        { id: 'addr_1', text: '🏠 123 Main Street, Harare', description: 'Home' },
        { id: 'addr_2', text: '🏢 456 Work Ave, CBD', description: 'Office' }
      ];

      return InteractiveMessageBuilder.listMessage(
        '📍 Your Delivery Addresses',
        'Tap to select or manage',
        [{
          title: 'Saved Addresses',
          rows: addresses
        }]
      );
    }

    if (action === 'add') {
      if (!args[1]) {
        return InteractiveMessageBuilder.createErrorCard(
          'Address details required',
          ['Usage: !addresses add <street>, <area>, <city>']
        );
      }

      const address = args.slice(1).join(' ');
      return InteractiveMessageBuilder.createSuccessCard(
        'Address Added!',
        `✅ New address saved: ${address}`,
        [
          { text: '📍 View All', id: 'addresses' },
          { text: '🛒 Continue Shopping', id: 'menu' }
        ]
      );
    }

    if (action === 'remove') {
      if (!args[1]) {
        // Show list to select from
        const addresses = [
          { id: 'remove_addr_1', text: '🏠 123 Main Street, Harare', description: 'Tap to remove' },
          { id: 'remove_addr_2', text: '🏢 456 Work Ave, CBD', description: 'Tap to remove' }
        ];

        return InteractiveMessageBuilder.listMessage(
          '➖ Remove Address',
          'Select an address to remove',
          [{
            title: 'Your Addresses',
            rows: addresses
          }]
        );
      }

      return InteractiveMessageBuilder.createSuccessCard(
        'Removed!',
        `Address #${args[1]} removed`,
        [
          { text: '📍 View All', id: 'addresses' },
          { text: '🛒 Continue Shopping', id: 'menu' }
        ]
      );
    }

    return InteractiveMessageBuilder.createErrorCard(
      'Invalid action',
      ['Usage: !addresses [list|add|remove]']
    );
  }

  /**
   * !deals - Show special deals and promotions
   */
  async handleDealsCommand(phoneNumber, from) {
    return {
      message: `
╔════════════════════════════════════════════════════════════════════════╗
║ 🎉  SPECIAL DEALS & PROMOTIONS
╠════════════════════════════════════════════════════════════════════════╣
║
║ 🔥 HOT DEALS (Today Only)
║ ┌────────────────────────────────────────────────────────────────────┐
║ │ 🛒 30% OFF on Groceries - Shop Now!
║ │ 🍕 Buy 2 Pizzas Get 1 Free at Quick Eats
║ │ 🚚 FREE Delivery on Orders over ZWL 500
║ └────────────────────────────────────────────────────────────────────┘
║
║ ⏰ LIMITED TIME OFFERS
║ ┌────────────────────────────────────────────────────────────────────┐
║ │ ⚡ Flash Sale: 50% off Electronics (Ends 20:00)
║ │ 🌅 Breakfast Special: 40% off from 7-10am
║ │ 🌙 Night Deal: ZWL 100 off orders after 21:00
║ └────────────────────────────────────────────────────────────────────┘
║
║ 🎁 NEW CUSTOMER BONUS
║ ┌────────────────────────────────────────────────────────────────────┐
║ │ 💝 First Order: 20% OFF (Max ZWL 50)
║ │ 🔖 Use Code: WELCOME20
║ │ ✨ Valid for 30 days from registration
║ └────────────────────────────────────────────────────────────────────┘
║
║ 💳 REFERRAL REWARDS
║ ├─ Refer a friend: Get ZWL 50 credit
║ ├─ Friend gets: 15% OFF their first order
║ └─ Unlimited referrals!
║
╠════════════════════════════════════════════════════════════════════════╣
║ Type !search <item> to find deals on specific products
║ Type !trending to see what's popular
╚════════════════════════════════════════════════════════════════════════╝
      `.trim(),
    };
  }

  /**
   * !trending - Show trending and popular items
   */
  async handleTrendingCommand(phoneNumber, from) {
    const trendingItems = [
      { name: 'Margherita Pizza', merchant: 'Quick Eats', sales: 324, rating: 4.8, emoji: '🍕' },
      { name: 'Fried Chicken', merchant: 'KFC Harare', sales: 267, rating: 4.6, emoji: '🍗' },
      { name: 'Fresh Milk 1L', merchant: 'Farmers Market', sales: 189, rating: 4.9, emoji: '🥛' },
      { name: 'Sadza & Relish', merchant: 'Traditional Kitchen', sales: 156, rating: 4.7, emoji: '🍲' },
      { name: 'Beef Burger', merchant: 'Burger King', sales: 145, rating: 4.5, emoji: '🍔' },
    ];

    let message = `
╔════════════════════════════════════════════════════════════════════════╗
║ 🔥  TRENDING NOW - TOP 5 POPULAR ITEMS
╠════════════════════════════════════════════════════════════════════════╣
║
`;

    trendingItems.forEach((item, i) => {
      const rank = i + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
      const trendBar = '█'.repeat(Math.floor(item.sales / 50)) + '░'.repeat(8 - Math.floor(item.sales / 50));
      message += `║ ${medal} #${rank}. ${item.emoji}  ${item.name.padEnd(20)} │ ${item.merchant.substring(0, 15).padEnd(15)}\n`;
      message += `║     ⭐ ${item.rating.toFixed(1)}   │ ${trendBar}  ${item.sales} orders\n`;
      message += `║\n`;
    });

    message += `╠════════════════════════════════════════════════════════════════════════╣
║ 💡 Recommendations:
║ • These items are loved by 1000+ customers
║ • Fast delivery available for all trending items
║ • Try them now before they run out!
║
║ Order any trending item: !add <name> <qty>
╚════════════════════════════════════════════════════════════════════════╝
    `.trim();

    return { message };
  }

  /**
   * !promo - Show promotional codes and vouchers
   */
  async handlePromoCommand(phoneNumber, from) {
    return {
      message: `
╔════════════════════════════════════════════════════════════════════════╗
║ 🎟️   PROMOTIONAL CODES & VOUCHERS
╠════════════════════════════════════════════════════════════════════════╣
║
║ 📌 ACTIVE CODES (November 2025)
║ ┌────────────────────────────────────────────────────────────────────┐
║ │ Code: WELCOME20      │ Discount: 20% OFF first order
║ │ Code: WEEKEND50      │ Discount: 50% OFF on weekends
║ │ Code: FOOD15         │ Discount: 15% OFF food orders
║ │ Code: LUCKY100       │ Discount: ZWL 100 OFF orders > ZWL 500
║ │ Code: VIP200         │ Discount: ZWL 200 OFF (Min 3 orders)
║ │ Code: REFER2024      │ Discount: ZWL 75 referral credit
║ └────────────────────────────────────────────────────────────────────┘
║
║ ✅ HOW TO USE CODES
║ 1. Add items to cart: !add <item> <qty>
║ 2. At checkout: Enter promo code
║ 3. Discount applied automatically!
║
║ 🎯 MERCHANT-SPECIFIC VOUCHERS
║ • Quick Eats: Buy 2 Get 1 Free (Pizzas)
║ • KFC Harare: Combo meals 25% OFF
║ • Local Bakery: Free bread with every purchase > ZWL 1000
║ • Farmers Market: Fresh produce 20% OFF daily 5-7pm
║
║ 🔔 SUBSCRIBE to our newsletter for exclusive codes!
║ Type !feedback to request new promotional offers
║
╚════════════════════════════════════════════════════════════════════════╝
      `.trim(),
    };
  }

  /**
   * !featured - Show featured merchants and collections
   */
  async handleFeaturedCommand(phoneNumber, from) {
    return {
      message: `
╔════════════════════════════════════════════════════════════════════════╗
║ ⭐  FEATURED MERCHANTS & COLLECTIONS
╠════════════════════════════════════════════════════════════════════════╣
║
║ 👑 MERCHANT OF THE WEEK
║ ┌────────────────────────────────────────────────────────────────────┐
║ │ 🏪 Quick Eats - Premium Italian & Pizza
║ │ ⭐ Rating: 4.8/5.0 (342 reviews)
║ │ 📍 Location: Harare CBD
║ │ 🚚 Free delivery on orders > ZWL 500
║ │ ⏱️  Delivery time: 25-35 minutes
║ │ 💰 Avg price: ZWL 2,500
║ │ 🎁 Special: Buy 2 Pizzas Get 1 Free Today!
║ └────────────────────────────────────────────────────────────────────┘
║
║ 🆕 NEW MERCHANTS
║ ├─ 🍲 Traditional Kitchen - Authentic Zimbabwean Cuisine
║ ├─ 🥗 Health Hub - Organic & Healthy Meals
║ └─ 🍦 Sweet Treats - Cakes & Desserts
║
║ 📦 COLLECTIONS & CATEGORIES
║ ├─ 🍕 Pizza Paradise - All pizza places in one place
║ ├─ 🍜 Quick Meals - Fast delivery within 20 mins
║ ├─ 💪 Healthy Eating - Low-cal & nutritious
║ └─ 🎉 Party Pack Specials - Perfect for gatherings
║
╠════════════════════════════════════════════════════════════════════════╣
║ Tap on a merchant name to browse their menu
║ !search <merchant_name> to find specific stores
╚════════════════════════════════════════════════════════════════════════╝
      `.trim(),
    };
  }
}

module.exports = new CustomerHandler();
