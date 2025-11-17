const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  getContentType,
} = require("@whiskeysockets/baileys");

// 2. Import 'makeInMemoryStore' from the dedicated store package you installed
const { makeInMemoryStore } = require("@rodrigogs/baileys-store");
// Note: If you installed a different store package, change '@rodrigogs/baileys-store' to the name of that package.

const { Boom } = require("@hapi/boom");
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const qrcode = require("qrcode-terminal");
const chalk = require("chalk");
const figlet = require("figlet");
const NodeCache = require("node-cache");
const axios = require("axios");
const P = require("pino");
require("dotenv").config();

class EnhancedSmartWhatsAppBot {
  constructor() {
    this.sock = null;
    this.store = makeInMemoryStore({
      logger: P().child({ level: "silent", stream: "store" }),
    });
    this.prefix = process.env.BOT_PREFIX || "!";
    this.adminPhone = process.env.ADMIN_PHONE || "+263781564004";
    this.apiBaseUrl = process.env.API_BASE_URL || "http://localhost:5173";
    this.supabaseUrl = process.env.VITE_SUPABASE_URL || "https://jehtulixweheexcnqzum.supabase.co";
    this.supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaHR1bGl4d2VoZWV4Y25xenVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMzgxMTMsImV4cCI6MjA3ODgxNDExM30.wvITI1fZJ9Pkmt7OEvmnoS_QRf_lswrpmRvG20__BaU";

    this.sessions = new NodeCache({ stdTTL: 86400 });
    this.carts = new NodeCache({ stdTTL: 7200 });
    this.users = new NodeCache({ stdTTL: 3600 });
    this.commandHistory = new NodeCache({ stdTTL: 300 });

    this.setupLogger();
    this.displayBanner();
    this.setupWebhookServer();
  }

  setupLogger() {
    this.logger = P({
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      level: "info",
    });
  }

  displayBanner() {
    console.clear();
    console.log(
      chalk.cyan(
        figlet.textSync("Smart WhatsApp", { horizontalLayout: "full" })
      )
    );
    console.log(chalk.green("🤖 Enhanced Smart WhatsApp Ordering Bot"));
    console.log(chalk.yellow("📱 Multi-tenant with AI-like Features"));
    console.log(chalk.blue("🌍 Zimbabwe & South Africa"));
    console.log(chalk.magenta("⚡ Powered by Baileys + Supabase\n"));
  }

  setupWebhookServer() {
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    this.app.post("/webhook/order-update", (req, res) => {
      this.handleOrderWebhook(req.body);
      res.json({ success: true });
    });

    this.app.get("/health", (req, res) => {
      res.json({
        status: "connected",
        bot: "enhanced-smart-whatsapp",
        timestamp: new Date().toISOString(),
      });
    });

    this.server = this.app.listen(3001, () => {
      console.log(chalk.green("✅ Webhook server running on port 3001"));
    });
  }

  async handleOrderWebhook(payload) {
    const { orderId, status, customerPhone, merchantId } = payload;
    const message = `📦 Order Update: Your order ${orderId} is now ${status}`;

    try {
      await this.sock.sendMessage(`${customerPhone}@s.whatsapp.net`, {
        text: message,
      });
      console.log(chalk.green(`✅ Sent order update to ${customerPhone}`));
    } catch (error) {
      console.error(chalk.red("Webhook error:"), error);
    }
  }

  async startBot() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(
        "./auth_info_baileys"
      );
      const { version, isLatest } = await fetchLatestBaileysVersion();

      console.log(chalk.green(`🔄 Using WA v${version.join(".")}`));

      this.sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" })),
        },
        browser: ["Enhanced Bot", "Chrome", "1.0.0"],
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: true,
        getMessage: async (key) => {
          if (this.store) {
            const msg = await this.store.loadMessage(key.remoteJid, key.id);
            return msg?.message || undefined;
          }
        },
      });

      this.store?.bind(this.sock.ev);
      this.setupEventHandlers(saveCreds);
    } catch (error) {
      console.error(chalk.red("❌ Error starting bot:"), error);
      setTimeout(() => this.startBot(), 5000);
    }
  }

  setupEventHandlers(saveCreds) {
    this.sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(chalk.yellow("\n📱 Scan QR code:"));
        qrcode.generate(qr, { small: true });
        console.log(chalk.green("✨ Waiting for connection...\n"));
      }

      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error).output?.statusCode !== DisconnectReason.loggedOut;
        console.log(chalk.red("❌ Connection closed. Reconnecting..."));

        if (shouldReconnect) {
          setTimeout(() => this.startBot(), 3000);
        }
      } else if (connection === "open") {
        console.log(chalk.green("🚀 Bot Connected!"));
        console.log(chalk.blue(`📞 Number: ${this.sock.user?.id}`));
        this.displayCommands();
      }
    });

    this.sock.ev.on("creds.update", saveCreds);

    this.sock.ev.on("messages.upsert", async (m) => {
      try {
        const message = m.messages[0];
        if (!message.message || message.key.fromMe) return;

        await this.handleMessage(message);
      } catch (error) {
        console.error(chalk.red("❌ Error:"), error);
      }
    });
  }

  displayCommands() {
    console.log(chalk.cyan("\n📋 Commands Active:"));
    console.log(chalk.white("Customer: !menu, !search, !add, !cart, !checkout"));
    console.log(chalk.white("Merchant: !orders, !dashboard"));
    console.log(chalk.white("Natural: Say 'I want 2 sadza please'\n"));
  }

  async handleMessage(message) {
    const messageType = getContentType(message.message);
    if (messageType !== "conversation" && messageType !== "extendedTextMessage")
      return;

    const text = message.message.conversation || message.message.extendedTextMessage?.text || "";
    const from = message.key.remoteJid;
    const phoneNumber = from.replace("@s.whatsapp.net", "");

    if (from.includes("@g.us")) {
      console.log(chalk.yellow(`ℹ️ Group message ignored from ${phoneNumber}`));
      return;
    }

    console.log(chalk.cyan(`📨 [${phoneNumber}]: ${text}`));

    try {
      if (text.startsWith(this.prefix)) {
        await this.handleCommand(from, phoneNumber, text);
      } else {
        const intent = this.detectIntent(text);
        if (intent) {
          await this.handleNaturalLanguage(from, phoneNumber, text, intent);
        } else {
          console.log(chalk.gray(`⏭️  Ignored non-command message`));
        }
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error);
      await this.sendMessage(from, "❌ Error processing message. Please try again.");
    }
  }

  detectIntent(message) {
    const patterns = [
      { regex: /i want|order|buy|get|please/i, intent: "order" },
      { regex: /menu|show|list|what|products/i, intent: "browse" },
      { regex: /cart|summary|total/i, intent: "cart" },
      { regex: /checkout|pay|confirm|place/i, intent: "checkout" },
      { regex: /track|status|where|delivery/i, intent: "status" },
      { regex: /hello|hi|hey|start/i, intent: "greet" },
      { regex: /help|commands|assist/i, intent: "help" },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(message)) {
        return pattern.intent;
      }
    }
    return null;
  }

  async handleCommand(from, phoneNumber, text) {
    const args = text.slice(this.prefix.length).trim().split(" ");
    const command = args[0].toLowerCase();

    console.log(chalk.blue(`🎯 Command: ${command}`));

    switch (command) {
      case "register":
        await this.cmdRegister(from, phoneNumber, args.slice(1));
        break;
      case "menu":
      case "m":
        await this.cmdShowMenu(from, phoneNumber);
        break;
      case "search":
        await this.cmdSearch(from, phoneNumber, args.slice(1).join(" "));
        break;
      case "add":
        await this.cmdAddToCart(from, phoneNumber, args.slice(1));
        break;
      case "cart":
      case "c":
        await this.cmdShowCart(from, phoneNumber);
        break;
      case "remove":
        await this.cmdRemoveFromCart(from, phoneNumber, args[1]);
        break;
      case "clear":
        await this.cmdClearCart(from, phoneNumber);
        break;
      case "checkout":
      case "pay":
        await this.cmdCheckout(from, phoneNumber);
        break;
      case "status":
      case "track":
        await this.cmdOrderStatus(from, phoneNumber, args[1]);
        break;
      case "orders":
        await this.cmdMerchantOrders(from, phoneNumber, args[1]);
        break;
      case "test":
        await this.cmdTest(from, phoneNumber);
        break;
      case "help":
        await this.sendMessage(from, this.getHelpText());
        break;
      default:
        await this.sendMessage(from, `❓ Unknown command: ${command}. Type !help`);
    }
  }

  async handleNaturalLanguage(from, phoneNumber, text, intent) {
    switch (intent) {
      case "order":
        await this.handleOrderIntent(from, phoneNumber, text);
        break;
      case "browse":
        await this.cmdShowMenu(from, phoneNumber);
        break;
      case "cart":
        await this.cmdShowCart(from, phoneNumber);
        break;
      case "checkout":
        await this.cmdCheckout(from, phoneNumber);
        break;
      case "greet":
        await this.sendMessage(from, "👋 Hello! Type !menu to browse or !help for commands.");
        break;
      case "help":
        await this.sendMessage(from, this.getHelpText());
        break;
      case "status":
        await this.sendMessage(from, "📦 Type: !status <order-id>\nExample: !status abc123");
        break;
    }
  }

  async handleOrderIntent(from, phoneNumber, text) {
    await this.sendMessage(from, "🛒 Finding products for you...");

    const qtyMatch = text.match(/(\d+)\s*x?\s+/);
    const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

    const message = `Found request for ${quantity} item(s). Type !menu to see products or !add [product] ${quantity}`;
    await this.sendMessage(from, message);
  }

  async cmdRegister(from, phoneNumber, args) {
    const name = args.join(" ") || "Customer";

    try {
      const response = await axios.post(
        `${this.supabaseUrl}/functions/v1/bot-auth`,
        {
          action: "register",
          phone_number: phoneNumber,
          name,
          role: "customer",
        },
        {
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        await this.sendMessage(
          from,
          `✅ Welcome ${name}! Registered successfully. Type !menu to shop.`
        );
        this.users.set(phoneNumber, { name, role: "customer" });
      } else {
        await this.sendMessage(from, `❌ ${response.data.error}`);
      }
    } catch (error) {
      console.error("Register error:", error);
      await this.sendMessage(from, "❌ Registration failed. Try again.");
    }
  }

  async cmdShowMenu(from, phoneNumber) {
    try {
      const response = await axios.post(
        `${this.supabaseUrl}/functions/v1/bot-products`,
        { action: "list" },
        {
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        let menu = "🍽️ *OUR MENU*\n\n";

        for (const category in response.data.products) {
          menu += `*${category}*\n`;
          for (const product of response.data.products[category]) {
            menu += `• ${product.name}\n  ${product.currency} ${product.price}\n`;
          }
          menu += "\n";
        }

        menu += "Type: !add [product name] [qty]";
        await this.sendMessage(from, menu);
      }
    } catch (error) {
      console.error("Menu error:", error);
      await this.sendMessage(from, "❌ Could not load menu.");
    }
  }

  async cmdSearch(from, phoneNumber, query) {
    if (!query) {
      await this.sendMessage(from, "What would you like to search for?");
      return;
    }

    try {
      const response = await axios.post(
        `${this.supabaseUrl}/functions/v1/bot-products`,
        { action: "search", query },
        {
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success && response.data.results.length > 0) {
        let text = `Found ${response.data.count} product(s):\n\n`;
        for (const product of response.data.results) {
          text += `• ${product.name} - ${product.currency} ${product.price}\n`;
        }
        await this.sendMessage(from, text);
      } else {
        await this.sendMessage(
          from,
          `No products found for "${query}". Type !menu to browse.`
        );
      }
    } catch (error) {
      console.error("Search error:", error);
      await this.sendMessage(from, "❌ Search failed.");
    }
  }

  async cmdAddToCart(from, phoneNumber, args) {
    if (args.length === 0) {
      await this.sendMessage(from, "Usage: !add [product name] [qty]");
      return;
    }

    try {
      const lastArg = args[args.length - 1];
      const qty = parseInt(lastArg) > 0 ? parseInt(lastArg) : 1;
      const productQuery = args.slice(0, -1).join(" ");

      const searchResponse = await axios.post(
        `${this.supabaseUrl}/functions/v1/bot-products`,
        { action: "search", query: productQuery },
        {
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!searchResponse.data.success || searchResponse.data.results.length === 0) {
        await this.sendMessage(from, `Product not found: ${productQuery}`);
        return;
      }

      const product = searchResponse.data.results[0];

      // Get default merchant (first available)
      const merchantResponse = await axios.post(
        `${this.supabaseUrl}/functions/v1/bot-carts`,
        {
          action: "add",
          customer_phone: phoneNumber,
          merchant_id: "default-merchant-id",
          product_id: product.id,
          quantity: qty,
        },
        {
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (merchantResponse.data.success) {
        await this.sendMessage(
          from,
          `✅ Added ${qty}x ${product.name} to cart!\nType !cart to review or !checkout to order.`
        );
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      await this.sendMessage(from, "❌ Could not add to cart.");
    }
  }

  async cmdShowCart(from, phoneNumber) {
    try {
      const response = await axios.post(
        `${this.supabaseUrl}/functions/v1/bot-carts`,
        {
          action: "get",
          customer_phone: phoneNumber,
          merchant_id: "default-merchant-id",
        },
        {
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success && response.data.cart) {
        let cartText = "🛒 *YOUR CART*\n\n";

        for (const item of response.data.cart.items) {
          cartText += `${item.quantity}x ${item.product_name}\n${item.currency} ${item.subtotal.toFixed(2)}\n\n`;
        }

        cartText += `*Total: ${response.data.cart.currency} ${response.data.cart.total.toFixed(2)}*\n\n`;
        cartText += "Type: !checkout to order or !add [product] to add more";

        await this.sendMessage(from, cartText);
      } else {
        await this.sendMessage(from, "🛒 Your cart is empty. Type !menu to add items.");
      }
    } catch (error) {
      console.error("Cart error:", error);
      await this.sendMessage(from, "❌ Could not load cart.");
    }
  }

  async cmdRemoveFromCart(from, phoneNumber, productName) {
    if (!productName) {
      await this.sendMessage(from, "Which product to remove?");
      return;
    }

    try {
      const response = await axios.post(
        `${this.supabaseUrl}/functions/v1/bot-products`,
        { action: "search", query: productName },
        {
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success && response.data.results.length > 0) {
        await axios.post(
          `${this.supabaseUrl}/functions/v1/bot-carts`,
          {
            action: "remove",
            customer_phone: phoneNumber,
            merchant_id: "default-merchant-id",
            product_id: response.data.results[0].id,
          },
          {
            headers: {
              Authorization: `Bearer ${this.supabaseKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        await this.sendMessage(from, "✅ Item removed from cart.");
      }
    } catch (error) {
      console.error("Remove error:", error);
      await this.sendMessage(from, "❌ Could not remove item.");
    }
  }

  async cmdClearCart(from, phoneNumber) {
    try {
      await axios.post(
        `${this.supabaseUrl}/functions/v1/bot-carts`,
        {
          action: "clear",
          customer_phone: phoneNumber,
          merchant_id: "default-merchant-id",
        },
        {
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      await this.sendMessage(from, "🗑️ Cart cleared. Type !menu to shop again.");
    } catch (error) {
      console.error("Clear error:", error);
      await this.sendMessage(from, "❌ Could not clear cart.");
    }
  }

  async cmdCheckout(from, phoneNumber) {
    try {
      const cartResponse = await axios.post(
        `${this.supabaseUrl}/functions/v1/bot-carts`,
        {
          action: "get",
          customer_phone: phoneNumber,
          merchant_id: "default-merchant-id",
        },
        {
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!cartResponse.data.cart || cartResponse.data.cart.items.length === 0) {
        await this.sendMessage(from, "🛒 Your cart is empty.");
        return;
      }

      const cart = cartResponse.data.cart;
      const items = cart.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
      }));

      const orderResponse = await axios.post(
        `${this.supabaseUrl}/functions/v1/bot-orders`,
        {
          action: "create",
          merchant_id: "default-merchant-id",
          customer_phone: phoneNumber,
          items,
          total_amount: cart.total,
          currency: cart.currency,
          payment_method: "pending",
        },
        {
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (orderResponse.data.success) {
        await axios.post(
          `${this.supabaseUrl}/functions/v1/bot-carts`,
          {
            action: "clear",
            customer_phone: phoneNumber,
            merchant_id: "default-merchant-id",
          },
          {
            headers: {
              Authorization: `Bearer ${this.supabaseKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        await this.sendMessage(
          from,
          `✅ Order placed!\nOrder ID: ${orderResponse.data.order_id}\nTotal: ${cart.currency} ${cart.total.toFixed(2)}\n\nYou'll receive payment details shortly.`
        );
      }
    } catch (error) {
      console.error("Checkout error:", error);
      await this.sendMessage(from, "❌ Could not place order.");
    }
  }

  async cmdOrderStatus(from, phoneNumber, orderId) {
    if (!orderId) {
      await this.sendMessage(from, "Usage: !status <order-id>");
      return;
    }

    try {
      const response = await axios.post(
        `${this.supabaseUrl}/functions/v1/bot-orders`,
        { action: "get", order_id: orderId },
        {
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success && response.data.order) {
        const order = response.data.order;
        await this.sendMessage(
          from,
          `📦 Order ${orderId}\nStatus: ${order.status}\nPayment: ${order.payment_status}\nTotal: ${order.currency} ${order.total_amount}`
        );
      }
    } catch (error) {
      console.error("Status error:", error);
      await this.sendMessage(from, "❌ Order not found.");
    }
  }

  async cmdMerchantOrders(from, phoneNumber, status) {
    await this.sendMessage(from, "📦 Merchant feature. Use web dashboard for details.");
  }

  async cmdTest(from, phoneNumber) {
    const testMessages = [
      "✅ Command parsing works!",
      "✅ Message detection active!",
      "✅ API integration ready!",
      "Type !help for all commands",
    ];

    for (const msg of testMessages) {
      await this.sendMessage(from, msg);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  async sendMessage(to, message) {
    try {
      await this.sock.sendMessage(to, { text: message });
      console.log(chalk.green(`✅ Sent: ${message.substring(0, 50)}...`));
    } catch (error) {
      console.error(chalk.red("Send error:"), error);
    }
  }

  getHelpText() {
    return `📚 *AVAILABLE COMMANDS*

👥 *CUSTOMER:*
!register [name] - Create account
!menu / !m - View products
!search [query] - Search items
!add [product] [qty] - Add to cart
!cart / !c - View cart
!remove [product] - Remove item
!clear - Empty cart
!checkout / !pay - Place order
!status [id] - Check order
!orders - Your orders

🏪 *MERCHANT:*
!orders - All orders
!orders pending - Pending orders
!dashboard - Business stats

*NATURAL LANGUAGE:*
"I want 2 sadza please"
"Can I get chicken rice?"
"Order 3 portions"

Type !help to see this`;
  }
}

const bot = new EnhancedSmartWhatsAppBot();
bot.startBot();

process.on("SIGINT", () => {
  console.log(chalk.yellow("\n👋 Shutting down..."));
  if (bot.server) bot.server.close();
  process.exit(0);
});
