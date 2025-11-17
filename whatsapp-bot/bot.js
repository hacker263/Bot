const { 
  default: makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  getContentType
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const qrcode = require('qrcode-terminal');
const chalk = require('chalk');
const figlet = require('figlet');
const moment = require('moment-timezone');
const NodeCache = require('node-cache');
const axios = require('axios');
const P = require('pino');
require('dotenv').config();

class SmartWhatsAppBot {
  constructor() {
    this.sock = null;
    this.store = makeInMemoryStore({ logger: P().child({ level: 'silent', stream: 'store' }) });
    this.prefix = process.env.BOT_PREFIX || '!';
    this.adminPhone = process.env.ADMIN_PHONE;
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:5173';
    
    // Caches for performance
    this.sessions = new NodeCache({ stdTTL: 3600 }); // 1 hour
    this.carts = new NodeCache({ stdTTL: 7200 }); // 2 hours
    this.merchants = new NodeCache({ stdTTL: 1800 }); // 30 minutes
    this.products = new NodeCache({ stdTTL: 900 }); // 15 minutes
    
    this.setupLogger();
    this.displayBanner();
    this.setupWebhookServer();
    this.setupCronJobs();
  }

  setupLogger() {
    this.logger = P({
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      level: 'info'
    });
  }

  displayBanner() {
    console.clear();
    console.log(chalk.cyan(figlet.textSync('Smart WhatsApp', { horizontalLayout: 'full' })));
    console.log(chalk.green('🤖 Smart WhatsApp Ordering & Payment Assistant'));
    console.log(chalk.yellow('📱 Multi-tenant WhatsApp Bot for SMEs'));
    console.log(chalk.blue('🌍 Supporting Zimbabwe & South Africa'));
    console.log(chalk.magenta('⚡ Powered by Baileys Framework\n'));
  }

  async startBot() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
      const { version, isLatest } = await fetchLatestBaileysVersion();
      
      console.log(chalk.green(`🔄 Using WA v${version.join('.')}, isLatest: ${isLatest}`));

      this.sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
        },
        browser: ['Smart WhatsApp Bot', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: true,
        getMessage: async (key) => {
          if (this.store) {
            const msg = await this.store.loadMessage(key.remoteJid, key.id);
            return msg?.message || undefined;
          }
          return undefined;
        }
      });

      this.store?.bind(this.sock.ev);
      this.setupEventHandlers(saveCreds);
      
    } catch (error) {
      console.error(chalk.red('❌ Error starting bot:'), error);
      setTimeout(() => this.startBot(), 5000);
    }
  }

  setupEventHandlers(saveCreds) {
    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log(chalk.yellow('\n📱 Scan this QR code with your WhatsApp:'));
        console.log(chalk.cyan('📋 Steps:'));
        console.log(chalk.white('   1. Open WhatsApp on your phone'));
        console.log(chalk.white('   2. Go to Settings > Linked Devices'));
        console.log(chalk.white('   3. Tap "Link a Device"'));
        console.log(chalk.white('   4. Scan the QR code below:\n'));
        
        qrcode.generate(qr, { small: true });
        console.log(chalk.green('\n✨ Waiting for connection...\n'));
      }
      
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(chalk.red('❌ Connection closed due to'), lastDisconnect?.error, chalk.yellow('Reconnecting...'), shouldReconnect);
        
        if (shouldReconnect) {
          setTimeout(() => this.startBot(), 3000);
        }
      } else if (connection === 'open') {
        console.log(chalk.green('🚀 WhatsApp Bot Connected Successfully!'));
        console.log(chalk.blue(`📞 Bot Number: ${this.sock.user?.id}`));
        console.log(chalk.cyan(`🎯 Command Prefix: ${this.prefix}`));
        console.log(chalk.magenta('💡 Bot is ready to receive messages!\n'));
        
        this.displayCommands();
        this.loadInitialData();
      }
    });

    this.sock.ev.on('creds.update', saveCreds);
    
    this.sock.ev.on('messages.upsert', async (m) => {
      try {
        const message = m.messages[0];
        if (!message.message || message.key.fromMe) return;
        
        await this.handleMessage(message);
      } catch (error) {
        console.error(chalk.red('❌ Error handling message:'), error);
      }
    });
  }

  displayCommands() {
    console.log(chalk.cyan('📋 Available Commands:'));
    console.log(chalk.white('👥 Customer Commands:'));
    console.log(chalk.green(`   ${this.prefix}menu - View available products`));
    console.log(chalk.green(`   ${this.prefix}order [item] [qty] - Add items to cart`));
    console.log(chalk.green(`   ${this.prefix}cart - View current cart`));
    console.log(chalk.green(`   ${this.prefix}checkout - Complete order`));
    console.log(chalk.green(`   ${this.prefix}status [orderID] - Check order status`));
    console.log(chalk.green(`   ${this.prefix}clear - Empty cart`));
    console.log(chalk.green(`   ${this.prefix}help - Show all commands`));
    
    console.log(chalk.white('\n🏪 Merchant Commands:'));
    console.log(chalk.blue(`   ${this.prefix}dashboard - Business statistics`));
    console.log(chalk.blue(`   ${this.prefix}orders [status] - View orders`));
    console.log(chalk.blue(`   ${this.prefix}products - View inventory`));
    console.log(chalk.blue(`   ${this.prefix}analytics - Detailed analytics`));
    
    console.log(chalk.white('\n⚙️ Admin Commands:'));
    console.log(chalk.magenta(`   ${this.prefix}merchants - View all merchants`));
    console.log(chalk.magenta(`   ${this.prefix}platform - Platform statistics`));
    console.log(chalk.magenta(`   ${this.prefix}health - System health`));
    console.log(chalk.magenta(`   ${this.prefix}broadcast [msg] - Send to all users`));
    
    console.log(chalk.yellow('\n🌍 Natural Language:'));
    console.log(chalk.white('   "I want 2 sadza and beef stew"'));
    console.log(chalk.white('   "Can I get chicken and rice?"'));
    console.log(chalk.white('   "Order 3 portions please"\n'));
  }

  async handleMessage(message) {
    const messageType = getContentType(message.message);
    if (messageType !== 'conversation' && messageType !== 'extendedTextMessage') return;
    
    const text = message.message.conversation || message.message.extendedTextMessage?.text || '';
    const from = message.key.remoteJid;
    const phoneNumber = from.replace('@s.whatsapp.net', '');
    
    // Skip group messages
    if (from.includes('@g.us')) return;
    
    console.log(chalk.cyan(`📨 Message from ${phoneNumber}: ${text}`));
    
    try {
      if (text.startsWith(this.prefix)) {
        await this.handleCommand(from, phoneNumber, text);
      } else {
        await this.handleNaturalLanguage(from, phoneNumber, text);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error processing message:'), error);
      await this.sendMessage(from, '❌ Sorry, something went wrong. Please try again later.');
    }
  }

  async handleCommand(from, phoneNumber, text) {
    const args = text.slice(this.prefix.length).trim().split(' ');
    const command = args[0].toLowerCase();
    const userRole = await this.getUserRole(phoneNumber);

    console.log(chalk.blue(`🎯 Command: ${command} from ${phoneNumber} (${userRole})`));

    switch (command) {
      // Customer Commands
      case 'menu':
      case 'm':
        await this.showMenu(from, phoneNumber);
        break;
      
      case 'order':
      case 'o':
        await this.handleOrderCommand(from, phoneNumber, args.slice(1));
        break;
      
      case 'cart':
      case 'c':
        await this.showCart(from, phoneNumber);
        break;
      
      case 'checkout':
      case 'pay':
        await this.handleCheckout(from, phoneNumber);
        break;
      
      case 'status':
      case 's':
        await this.showOrderStatus(from, phoneNumber, args[1]);
        break;
      
      case 'clear':
        await this.clearCart(from, phoneNumber);
        break;

      // Merchant Commands
      case 'dashboard':
      case 'dash':
        if (userRole === 'merchant' || userRole === 'admin') {
          await this.showMerchantDashboard(from, phoneNumber);
        } else {
          await this.sendMessage(from, '❌ Access denied. Merchant access required.');
        }
        break;
      
      case 'orders':
        if (userRole === 'merchant' || userRole === 'admin') {
          await this.showMerchantOrders(from, phoneNumber, args[1]);
        } else {
          await this.sendMessage(from, '❌ Access denied. Merchant access required.');
        }
        break;
      
      case 'products':
      case 'inventory':
        if (userRole === 'merchant' || userRole === 'admin') {
          await this.showMerchantProducts(from, phoneNumber);
        } else {
          await this.sendMessage(from, '❌ Access denied. Merchant access required.');
        }
        break;
      
      case 'analytics':
      case 'stats':
        if (userRole === 'merchant' || userRole === 'admin') {
          await this.showAnalytics(from, phoneNumber);
        } else {
          await this.sendMessage(from, '❌ Access denied. Merchant access required.');
        }
        break;

      // Admin Commands
      case 'merchants':
        if (userRole === 'admin') {
          await this.showAllMerchants(from);
        } else {
          await this.sendMessage(from, '❌ Access denied. Admin access required.');
        }
        break;
      
      case 'platform':
        if (userRole === 'admin') {
          await this.showPlatformStats(from);
        } else {
          await this.sendMessage(from, '❌ Access denied. Admin access required.');
        }
        break;
      
      case 'health':
        if (userRole === 'admin') {
          await this.showSystemHealth(from);
        } else {
          await this.sendMessage(from, '❌ Access denied. Admin access required.');
        }
        break;
      
      case 'broadcast':
        if (userRole === 'admin') {
          await this.handleBroadcast(from, args.slice(1).join(' '));
        } else {
          await this.sendMessage(from, '❌ Access denied. Admin access required.');
        }
        break;

      // General Commands
      case 'help':
      case 'h':
        await this.showHelp(from, userRole);
        break;
      
      case 'register':
        await this.handleRegistration(from, phoneNumber, args.slice(1));
        break;
      
      case 'language':
      case 'lang':
        await this.handleLanguageChange(from, phoneNumber, args[1]);
        break;

      default:
        await this.sendMessage(from, `❓ Unknown command: ${command}\nType ${this.prefix}help for available commands.`);
    }
  }

  async handleNaturalLanguage(from, phoneNumber, text) {
    const session = this.sessions.get(phoneNumber) || { step: 'welcome', merchantId: null };
    
    // Simple NLP for order detection
    const orderKeywords = ['want', 'order', 'buy', 'get', 'need', 'sadza', 'chicken', 'rice', 'beef'];
    const hasOrderIntent = orderKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );

    if (hasOrderIntent || session.step !== 'welcome') {
      await this.processNaturalOrder(from, phoneNumber, text);
    } else {
      // Send welcome message
      const welcomeMsg = `👋 *Welcome to Smart WhatsApp Ordering!*\n\n` +
        `🍽️ To get started:\n` +
        `• Type *${this.prefix}menu* to see available food\n` +
        `• Type *${this.prefix}help* for all commands\n` +
        `• Or just tell me what you'd like to order!\n\n` +
        `💡 Example: "I want 2 sadza and beef stew"`;
      
      await this.sendMessage(from, welcomeMsg);
    }
  }

  async showMenu(from, phoneNumber) {
    try {
      const merchantId = await this.findNearestMerchant(phoneNumber);
      const products = await this.getProducts(merchantId);
      
      if (!products || products.length === 0) {
        await this.sendMessage(from, '😔 No menu available at the moment. Please try again later.');
        return;
      }

      let menuText = '🍽️ *Our Menu*\n\n';
      const categories = [...new Set(products.map(p => p.category))];
      
      categories.forEach(category => {
        menuText += `*${category}*\n`;
        products
          .filter(p => p.category === category && p.isActive)
          .forEach(product => {
            menuText += `• ${product.name} - ${product.currency} ${product.price}\n`;
            menuText += `  ${product.description}\n`;
            if (product.stock < 10) {
              menuText += `  ⚠️ Only ${product.stock} left!\n`;
            }
            menuText += '\n';
          });
      });

      menuText += `💡 *How to order:*\n`;
      menuText += `Type: ${this.prefix}order [item] [quantity]\n`;
      menuText += `Example: ${this.prefix}order sadza 2\n\n`;
      menuText += `Or just tell me: "I want 2 sadza and beef stew"`;

      await this.sendMessage(from, menuText);
    } catch (error) {
      console.error(chalk.red('❌ Error showing menu:'), error);
      await this.sendMessage(from, '❌ Error loading menu. Please try again.');
    }
  }

  async handleOrderCommand(from, phoneNumber, args) {
    if (args.length < 2) {
      await this.sendMessage(from, `❓ Usage: ${this.prefix}order [item] [quantity]\nExample: ${this.prefix}order sadza 2`);
      return;
    }

    const itemName = args.slice(0, -1).join(' ').toLowerCase();
    const quantity = parseInt(args[args.length - 1]);

    if (isNaN(quantity) || quantity <= 0) {
      await this.sendMessage(from, '❌ Please provide a valid quantity.');
      return;
    }

    const merchantId = await this.findNearestMerchant(phoneNumber);
    const products = await this.getProducts(merchantId);
    const product = products.find(p => 
      p.name.toLowerCase().includes(itemName) || 
      itemName.includes(p.name.toLowerCase())
    );

    if (!product) {
      await this.sendMessage(from, `❌ Product "${itemName}" not found.\nType ${this.prefix}menu to see available items.`);
      return;
    }

    if (product.stock < quantity) {
      await this.sendMessage(from, `❌ Sorry, only ${product.stock} ${product.name} available.`);
      return;
    }

    // Add to cart
    const cart = this.carts.get(phoneNumber) || { items: [], merchantId };
    const existingItem = cart.items.find(item => item.productId === product.id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: quantity
      });
    }

    cart.merchantId = merchantId;
    this.carts.set(phoneNumber, cart);

    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    await this.sendMessage(from,
      `✅ Added ${quantity}x ${product.name} to cart!\n\n` +
      `🛒 *Cart Summary:*\n` +
      cart.items.map(item => `• ${item.quantity}x ${item.productName} - ${product.currency} ${(item.price * item.quantity).toFixed(2)}`).join('\n') +
      `\n\n💰 *Total: ${product.currency} ${total.toFixed(2)}*\n\n` +
      `Type ${this.prefix}checkout to complete your order!`
    );
  }

  async showCart(from, phoneNumber) {
    const cart = this.carts.get(phoneNumber);
    
    if (!cart || cart.items.length === 0) {
      await this.sendMessage(from, `🛒 Your cart is empty.\nType ${this.prefix}menu to start ordering!`);
      return;
    }

    const merchant = await this.getMerchant(cart.merchantId);
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    let cartText = '🛒 *Your Cart*\n\n';
    cart.items.forEach(item => {
      cartText += `• ${item.quantity}x ${item.productName}\n`;
      cartText += `  ${merchant.currency} ${item.price} each = ${merchant.currency} ${(item.price * item.quantity).toFixed(2)}\n\n`;
    });
    
    cartText += `💰 *Total: ${merchant.currency} ${total.toFixed(2)}*\n\n`;
    cartText += `🚀 Type ${this.prefix}checkout to complete your order\n`;
    cartText += `🗑️ Type ${this.prefix}clear to empty cart`;

    await this.sendMessage(from, cartText);
  }

  async handleCheckout(from, phoneNumber) {
    const cart = this.carts.get(phoneNumber);
    
    if (!cart || cart.items.length === 0) {
      await this.sendMessage(from, `🛒 Your cart is empty.\nType ${this.prefix}menu to start ordering!`);
      return;
    }

    const merchant = await this.getMerchant(cart.merchantId);
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create order via API
    const orderId = await this.createOrder({
      merchantId: cart.merchantId,
      customerName: 'WhatsApp Customer',
      customerPhone: phoneNumber,
      items: cart.items,
      totalAmount: total,
      currency: merchant.currency,
      region: merchant.region
    });

    // Show payment options
    const paymentOptions = this.getPaymentOptions(merchant.region);
    let checkoutText = `✅ *Order Created!*\n`;
    checkoutText += `📋 Order ID: #${orderId}\n`;
    checkoutText += `💰 Total: ${merchant.currency} ${total.toFixed(2)}\n\n`;
    checkoutText += `💳 *Payment Options:*\n`;
    
    paymentOptions.forEach((option, index) => {
      checkoutText += `${index + 1}. ${option.name}\n`;
    });
    
    checkoutText += `\nReply with the number of your preferred payment method.`;

    // Store checkout session
    this.sessions.set(phoneNumber, {
      step: 'payment_selection',
      orderId: orderId,
      merchantId: cart.merchantId,
      paymentOptions: paymentOptions
    });

    await this.sendMessage(from, checkoutText);
  }

  async clearCart(from, phoneNumber) {
    this.carts.del(phoneNumber);
    this.sessions.del(phoneNumber);
    await this.sendMessage(from, '🗑️ Cart cleared! Type ' + this.prefix + 'menu to start ordering again.');
  }

  async showHelp(from, userRole) {
    let helpText = `🤖 *Smart WhatsApp Bot Help*\n\n`;
    
    helpText += `👥 *Customer Commands:*\n`;
    helpText += `• ${this.prefix}menu - View available products\n`;
    helpText += `• ${this.prefix}order [item] [qty] - Add to cart\n`;
    helpText += `• ${this.prefix}cart - View your cart\n`;
    helpText += `• ${this.prefix}checkout - Complete order\n`;
    helpText += `• ${this.prefix}status [orderID] - Check order status\n`;
    helpText += `• ${this.prefix}clear - Empty cart\n\n`;

    if (userRole === 'merchant' || userRole === 'admin') {
      helpText += `🏪 *Merchant Commands:*\n`;
      helpText += `• ${this.prefix}dashboard - View business stats\n`;
      helpText += `• ${this.prefix}orders [status] - View orders\n`;
      helpText += `• ${this.prefix}products - View inventory\n`;
      helpText += `• ${this.prefix}analytics - View detailed stats\n\n`;
    }

    if (userRole === 'admin') {
      helpText += `⚙️ *Admin Commands:*\n`;
      helpText += `• ${this.prefix}merchants - View all merchants\n`;
      helpText += `• ${this.prefix}platform - Platform statistics\n`;
      helpText += `• ${this.prefix}health - System health\n`;
      helpText += `• ${this.prefix}broadcast [msg] - Send to all\n\n`;
    }

    helpText += `🌍 *Other Commands:*\n`;
    helpText += `• ${this.prefix}language [en/sn/zu/af] - Change language\n`;
    helpText += `• ${this.prefix}help - Show this help\n\n`;
    helpText += `💡 You can also order naturally: "I want 2 sadza"`;

    await this.sendMessage(from, helpText);
  }

  async showMerchantDashboard(from, phoneNumber) {
    const merchantId = await this.getMerchantIdByPhone(phoneNumber);
    const merchant = await this.getMerchant(merchantId);
    
    if (!merchant) {
      await this.sendMessage(from, '❌ Merchant not found.');
      return;
    }

    const orders = await this.getMerchantOrders(merchantId);
    const products = await this.getProducts(merchantId);

    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const todayOrders = orders.filter(o => {
      const today = new Date().toDateString();
      return new Date(o.createdAt).toDateString() === today;
    }).length;

    let dashText = `📊 *${merchant.businessName} Dashboard*\n\n`;
    dashText += `📈 *Today's Stats:*\n`;
    dashText += `• Orders: ${todayOrders}\n`;
    dashText += `• Pending: ${pendingOrders}\n`;
    dashText += `• Products: ${products.filter(p => p.isActive).length} active\n`;
    dashText += `• Plan: ${merchant.subscriptionPlan}\n\n`;
    dashText += `🔗 *Quick Actions:*\n`;
    dashText += `• ${this.prefix}orders - View recent orders\n`;
    dashText += `• ${this.prefix}products - Manage inventory\n`;
    dashText += `• ${this.prefix}analytics - View detailed stats\n`;
    dashText += `• Visit dashboard: ${this.apiBaseUrl}/dashboard`;

    await this.sendMessage(from, dashText);
  }

  async sendMessage(to, text) {
    try {
      await this.sock.sendMessage(to, { text });
      return true;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to send message to ${to}:`), error);
      return false;
    }
  }

  // Webhook server for platform integration
  setupWebhookServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Webhook for order updates from platform
    app.post('/webhook/order-update', async (req, res) => {
      try {
        const { orderId, status, customerPhone, merchantId } = req.body;
        
        const statusEmojis = {
          confirmed: '✅',
          fulfilled: '📦',
          cancelled: '❌'
        };

        const emoji = statusEmojis[status] || '📋';
        const message = `${emoji} *Order Update*\n\nOrder #${orderId} is now *${status}*\n\nThank you for your business!`;
        
        await this.sendMessage(`${customerPhone}@s.whatsapp.net`, message);
        
        // Notify merchant
        const merchant = await this.getMerchant(merchantId);
        if (merchant && merchant.phone) {
          await this.sendMessage(`${merchant.phone}@s.whatsapp.net`, `📋 Order #${orderId} marked as ${status}`);
        }
        
        res.json({ success: true });
      } catch (error) {
        console.error(chalk.red('❌ Webhook error:'), error);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    });

    // Webhook for low stock alerts
    app.post('/webhook/low-stock', async (req, res) => {
      try {
        const { productName, currentStock, merchantPhone } = req.body;
        const message = `⚠️ *Low Stock Alert*\n\n${productName} is running low!\nCurrent stock: ${currentStock}\n\nPlease restock soon.`;
        
        await this.sendMessage(`${merchantPhone}@s.whatsapp.net`, message);
        res.json({ success: true });
      } catch (error) {
        console.error(chalk.red('❌ Low stock webhook error:'), error);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        bot: this.sock?.user ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      });
    });

    const port = process.env.WEBHOOK_PORT || 3001;
    app.listen(port, () => {
      console.log(chalk.green(`🔗 Webhook server running on port ${port}`));
    });
  }

  // Cron jobs for automated tasks
  setupCronJobs() {
    // Daily summary for merchants (8 AM)
    cron.schedule('0 8 * * *', async () => {
      console.log(chalk.blue('📊 Sending daily summaries...'));
      await this.sendDailySummaries();
    });

    // Weekly platform stats for admin (Monday 9 AM)
    cron.schedule('0 9 * * 1', async () => {
      console.log(chalk.blue('📈 Sending weekly platform stats...'));
      await this.sendWeeklyStats();
    });

    // Cache refresh every hour
    cron.schedule('0 * * * *', async () => {
      console.log(chalk.blue('🔄 Refreshing data cache...'));
      await this.loadInitialData();
    });
  }

  async loadInitialData() {
    try {
      // Load merchants and products data
      console.log(chalk.yellow('📡 Loading platform data...'));
      // In production, this would fetch from your API
    } catch (error) {
      console.error(chalk.red('❌ Error loading initial data:'), error);
    }
  }

  // Helper methods for API integration
  async getUserRole(phoneNumber) {
    // Check if user is admin
    if (phoneNumber === this.adminPhone?.replace('+', '')) {
      return 'admin';
    }
    
    // Check if user is a merchant (mock implementation)
    const merchantPhones = ['263771111111', '27821111111'];
    if (merchantPhones.includes(phoneNumber)) {
      return 'merchant';
    }
    
    return 'customer';
  }

  async findNearestMerchant(phoneNumber) {
    // Simple logic - return demo merchant based on region
    if (phoneNumber.startsWith('263')) {
      return 'merchant-1'; // Zimbabwe
    } else if (phoneNumber.startsWith('27')) {
      return 'merchant-2'; // South Africa
    }
    return 'merchant-1'; // Default
  }

  getPaymentOptions(region) {
    const options = {
      'ZW': [
        { id: 'ecocash', name: 'EcoCash' },
        { id: 'onemoney', name: 'OneMoney' },
        { id: 'bank_transfer', name: 'Bank Transfer' }
      ],
      'ZA': [
        { id: 'eft', name: 'EFT' },
        { id: 'payfast', name: 'PayFast' },
        { id: 'snapscan', name: 'SnapScan' }
      ]
    };
    return options[region] || options['ZW'];
  }

  // Mock API methods - replace with actual API calls
  async getProducts(merchantId) {
    const cacheKey = `products_${merchantId}`;
    let products = this.products.get(cacheKey);
    
    if (!products) {
      // Mock products data
      products = [
        {
          id: 'prod-1',
          name: 'Sadza & Beef Stew',
          description: 'Traditional meal with tender beef',
          price: 5.50,
          currency: 'USD',
          category: 'Main Course',
          stock: 50,
          isActive: true
        },
        {
          id: 'prod-2',
          name: 'Chicken & Rice',
          description: 'Grilled chicken with seasoned rice',
          price: 6.00,
          currency: 'USD',
          category: 'Main Course',
          stock: 30,
          isActive: true
        }
      ];
      this.products.set(cacheKey, products);
    }
    
    return products;
  }

  async getMerchant(merchantId) {
    const cacheKey = `merchant_${merchantId}`;
    let merchant = this.merchants.get(cacheKey);
    
    if (!merchant) {
      merchant = {
        id: merchantId,
        businessName: merchantId === 'merchant-1' ? 'Mutamba\'s Kitchen' : 'Boerewors Express',
        phone: merchantId === 'merchant-1' ? '+263771111111' : '+27821111111',
        currency: merchantId === 'merchant-1' ? 'USD' : 'ZAR',
        region: merchantId === 'merchant-1' ? 'ZW' : 'ZA',
        subscriptionPlan: 'starter',
        isActive: true
      };
      this.merchants.set(cacheKey, merchant);
    }
    
    return merchant;
  }

  async createOrder(orderData) {
    // Generate order ID
    const orderId = `${Date.now()}`.slice(-6);
    console.log(chalk.green('📝 Created order:'), orderId, orderData);
    
    // In production, this would create the order via API
    // await axios.post(`${this.apiBaseUrl}/api/orders`, orderData);
    
    return orderId;
  }

  async getMerchantOrders(merchantId) {
    return []; // Mock empty orders
  }

  async getMerchantIdByPhone(phoneNumber) {
    if (phoneNumber.startsWith('263')) {
      return 'merchant-1';
    } else if (phoneNumber.startsWith('27')) {
      return 'merchant-2';
    }
    return 'merchant-1';
  }

  async sendDailySummaries() {
    // Implementation for daily summaries
    console.log(chalk.blue('📊 Daily summaries sent'));
  }

  async sendWeeklyStats() {
    // Implementation for weekly stats
    console.log(chalk.blue('📈 Weekly stats sent'));
  }

  async processNaturalOrder(from, phoneNumber, text) {
    // Simple NLP implementation
    const products = await this.getProducts(await this.findNearestMerchant(phoneNumber));
    
    // Extract quantities and product names
    const words = text.toLowerCase().split(' ');
    const quantities = words.filter(word => /^\d+$/.test(word)).map(Number);
    
    let foundProducts = [];
    products.forEach(product => {
      const productWords = product.name.toLowerCase().split(' ');
      const hasMatch = productWords.some(word => words.includes(word));
      if (hasMatch) {
        foundProducts.push(product);
      }
    });

    if (foundProducts.length > 0 && quantities.length > 0) {
      // Simulate order command
      const quantity = quantities[0] || 1;
      const product = foundProducts[0];
      await this.handleOrderCommand(from, phoneNumber, [product.name.split(' ')[0], quantity.toString()]);
    } else {
      await this.sendMessage(from, 
        `🤔 I'm not sure I understood that. Could you please:\n\n` +
        `• Type ${this.prefix}menu to see available items\n` +
        `• Or try: "I want 2 sadza" or "${this.prefix}order sadza 2"`
      );
    }
  }

  // Placeholder methods for other commands
  async showOrderStatus(from, phoneNumber, orderId) {
    if (!orderId) {
      await this.sendMessage(from, `❓ Usage: ${this.prefix}status [orderID]\nExample: ${this.prefix}status 123456`);
      return;
    }
    
    await this.sendMessage(from, `📦 Order #${orderId} Status: *Confirmed*\n\nYour order is being prepared and will be ready soon!`);
  }

  async showMerchantOrders(from, phoneNumber, status) {
    await this.sendMessage(from, `📋 *Recent Orders*\n\nNo orders found.\n\nOrders will appear here once customers start placing them via WhatsApp.`);
  }

  async showMerchantProducts(from, phoneNumber) {
    const merchantId = await this.getMerchantIdByPhone(phoneNumber);
    const products = await this.getProducts(merchantId);
    
    let productsText = `📦 *Your Products*\n\n`;
    products.forEach(product => {
      productsText += `• ${product.name}\n`;
      productsText += `  Price: ${product.currency} ${product.price}\n`;
      productsText += `  Stock: ${product.stock}\n`;
      productsText += `  Status: ${product.isActive ? '✅ Active' : '❌ Inactive'}\n\n`;
    });
    
    productsText += `🔗 Manage products: ${this.apiBaseUrl}/dashboard/products`;
    
    await this.sendMessage(from, productsText);
  }

  async showAnalytics(from, phoneNumber) {
    await this.sendMessage(from, 
      `📊 *Business Analytics*\n\n` +
      `📈 *This Month:*\n` +
      `• Total Orders: 0\n` +
      `• Revenue: $0.00\n` +
      `• Top Product: N/A\n\n` +
      `🔗 Detailed analytics: ${this.apiBaseUrl}/dashboard/analytics`
    );
  }

  async showAllMerchants(from) {
    await this.sendMessage(from,
      `🏪 *Platform Merchants*\n\n` +
      `• Mutamba's Kitchen (ZW) - Active\n` +
      `• Boerewors Express (ZA) - Active\n\n` +
      `📊 Total: 2 merchants\n` +
      `🔗 Manage: ${this.apiBaseUrl}/admin/merchants`
    );
  }

  async showPlatformStats(from) {
    await this.sendMessage(from,
      `📈 *Platform Statistics*\n\n` +
      `🏪 Active Merchants: 2\n` +
      `📦 Total Orders: 0\n` +
      `💰 Platform Revenue: $0.00\n` +
      `🌍 Regions: Zimbabwe, South Africa\n\n` +
      `🔗 Full analytics: ${this.apiBaseUrl}/admin/analytics`
    );
  }

  async showSystemHealth(from) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    await this.sendMessage(from,
      `🏥 *System Health*\n\n` +
      `🤖 Bot Status: ✅ Online\n` +
      `⏱️ Uptime: ${hours}h ${minutes}m\n` +
      `📱 WhatsApp: ✅ Connected\n` +
      `🌐 API: ✅ Healthy\n` +
      `💾 Cache: ✅ Active\n\n` +
      `🔗 Detailed health: ${this.apiBaseUrl}/admin/health`
    );
  }

  async handleBroadcast(from, message) {
    if (!message) {
      await this.sendMessage(from, `❓ Usage: ${this.prefix}broadcast [message]\nExample: ${this.prefix}broadcast System maintenance tonight`);
      return;
    }
    
    await this.sendMessage(from, `📢 Broadcast sent: "${message}"\n\nMessage will be delivered to all active users.`);
  }

  async handleRegistration(from, phoneNumber, args) {
    await this.sendMessage(from,
      `📝 *Merchant Registration*\n\n` +
      `To register as a merchant:\n` +
      `1. Visit: ${this.apiBaseUrl}/register\n` +
      `2. Fill in your business details\n` +
      `3. Choose your subscription plan\n` +
      `4. Start receiving orders!\n\n` +
      `💡 Need help? Contact support.`
    );
  }

  async handleLanguageChange(from, phoneNumber, language) {
    const languages = {
      'en': 'English 🇬🇧',
      'sn': 'Shona 🇿🇼',
      'zu': 'Zulu 🇿🇦',
      'af': 'Afrikaans 🇿🇦'
    };
    
    if (!language || !languages[language]) {
      await this.sendMessage(from,
        `🌍 *Available Languages:*\n\n` +
        Object.entries(languages).map(([code, name]) => `• ${this.prefix}language ${code} - ${name}`).join('\n')
      );
      return;
    }
    
    await this.sendMessage(from, `✅ Language changed to ${languages[language]}`);
  }
}

// Start the bot
const bot = new SmartWhatsAppBot();
bot.startBot();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Shutting down Smart WhatsApp Bot...'));
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ Uncaught Exception:'), error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
});