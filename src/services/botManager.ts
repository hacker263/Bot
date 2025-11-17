import { botApiClient } from './botApiClient';

interface BotMessage {
  type: 'text' | 'buttons' | 'list';
  content: string;
  buttons?: Array<{ label: string; id: string }>;
  listItems?: Array<{ title: string; id: string; description?: string }>;
}

interface ConversationState {
  step: string;
  context: Record<string, unknown>;
  merchantId?: string;
  userId?: string;
  userRole?: string;
}

class CommandParser {
  private prefix = '!';
  private commandRegex = /^!(\w+)(?:\s+(.*))?$/;

  private naturalLanguagePatterns = [
    { regex: /i want|i'd like|can i get|order|buy/i, type: 'intent_order' },
    { regex: /show|list|menu|what's|what do you|products/i, type: 'intent_browse' },
    { regex: /checkout|pay|payment|confirm|place order/i, type: 'intent_checkout' },
    { regex: /track|status|where is|when|delivery/i, type: 'intent_status' },
    { regex: /hello|hi|hey|greetings|start/i, type: 'intent_greet' },
    { regex: /help|commands|what can|assistance/i, type: 'intent_help' },
  ];

  isCommand(message: string): boolean {
    return message.startsWith(this.prefix);
  }

  parseCommand(message: string): { command: string; args: string[] } | null {
    const match = message.match(this.commandRegex);
    if (!match) return null;

    const command = match[1].toLowerCase();
    const argsString = match[2] || '';
    const args = argsString.split(/\s+/).filter(Boolean);

    return { command, args };
  }

  detectNaturalLanguageIntent(message: string): string | null {
    for (const pattern of this.naturalLanguagePatterns) {
      if (pattern.regex.test(message)) {
        return pattern.type;
      }
    }
    return null;
  }

  isValidNaturalLanguage(message: string): boolean {
    return message.length > 2 && this.detectNaturalLanguageIntent(message) !== null;
  }
}

class BotManager {
  private parser = new CommandParser();
  private sessionCache = new Map<string, ConversationState>();

  async handleMessage(
    phoneNumber: string,
    message: string,
    merchantId: string
  ): Promise<BotMessage[]> {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return [];
    }

    const isCmd = this.parser.isCommand(trimmedMessage);
    const intent = this.parser.detectNaturalLanguageIntent(trimmedMessage);

    if (!isCmd && !intent) {
      return [];
    }

    try {
      if (isCmd) {
        return await this.handleCommand(phoneNumber, trimmedMessage, merchantId);
      } else {
        return await this.handleNaturalLanguage(phoneNumber, trimmedMessage, merchantId, intent!);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      return [
        {
          type: 'text',
          content: 'Sorry, something went wrong. Please try again or type !help for assistance.',
        },
      ];
    }
  }

  private async handleCommand(phoneNumber: string, message: string, merchantId: string): Promise<BotMessage[]> {
    const parsed = this.parser.parseCommand(message);
    if (!parsed) return [];

    const { command, args } = parsed;

    const user = await botApiClient.verifyUser(phoneNumber);
    const userRole = user.success ? user.user?.role : 'customer';

    switch (command) {
      case 'register':
        return await this.cmdRegister(phoneNumber, args);
      case 'menu':
      case 'm':
        return await this.cmdShowMenu(merchantId);
      case 'search':
        return await this.cmdSearch(args.join(' '), merchantId);
      case 'cart':
      case 'c':
        return await this.cmdShowCart(phoneNumber, merchantId);
      case 'add':
        return await this.cmdAddToCart(phoneNumber, args, merchantId);
      case 'remove':
        return await this.cmdRemoveFromCart(phoneNumber, args[0], merchantId);
      case 'clear':
        return await this.cmdClearCart(phoneNumber, merchantId);
      case 'checkout':
      case 'pay':
        return await this.cmdCheckout(phoneNumber, merchantId);
      case 'orders':
        return await this.cmdShowOrders(phoneNumber, userRole, merchantId, args[0]);
      case 'status':
      case 'track':
        return await this.cmdOrderStatus(phoneNumber, args[0], merchantId);
      case 'dashboard':
        return await this.cmdMerchantDashboard(phoneNumber, userRole, merchantId);
      case 'help':
        return [{ type: 'text', content: this.getHelpText() }];
      default:
        return [{ type: 'text', content: `Unknown command: ${command}. Type !help for available commands.` }];
    }
  }

  private async handleNaturalLanguage(
    phoneNumber: string,
    message: string,
    merchantId: string,
    intent: string
  ): Promise<BotMessage[]> {
    let session = this.sessionCache.get(phoneNumber) || {
      step: 'welcome',
      context: {},
      merchantId,
    };

    switch (intent) {
      case 'intent_order':
        return await this.processOrderIntent(phoneNumber, message, merchantId, session);
      case 'intent_browse':
        return await this.cmdShowMenu(merchantId);
      case 'intent_checkout':
        return await this.cmdCheckout(phoneNumber, merchantId);
      case 'intent_status':
        return [{ type: 'text', content: 'Please provide your order ID to check status. Type: !status <order-id>' }];
      case 'intent_greet':
        return [{ type: 'text', content: `Hello! 👋 Welcome! Type !menu to see our products or !help for commands.` }];
      case 'intent_help':
        return [{ type: 'text', content: this.getHelpText() }];
      default:
        return [];
    }
  }

  private async processOrderIntent(
    phoneNumber: string,
    message: string,
    merchantId: string,
    session: ConversationState
  ): Promise<BotMessage[]> {
    const products = await botApiClient.listProducts(merchantId);
    if (!products.success) {
      return [{ type: 'text', content: 'Could not load products. Please try again.' }];
    }

    const matches = this.findProductMatches(message, products.products);
    if (matches.length === 0) {
      return [{ type: 'text', content: 'I could not find matching products. Type !menu to see what we offer.' }];
    }

    const responses: BotMessage[] = [];
    let totalAdded = 0;

    for (const match of matches) {
      const result = await botApiClient.addToCart(phoneNumber, merchantId, match.id, match.quantity);
      if (result.success) {
        totalAdded++;
      }
    }

    responses.push({
      type: 'text',
      content: `✅ Added ${totalAdded} item(s) to your cart! Type !cart to review or !checkout to proceed.`,
    });

    return responses;
  }

  private findProductMatches(
    message: string,
    products: Record<string, Array<{ id: string; name: string }>>,
    _maxMatches = 3
  ): Array<{ id: string; quantity: number }> {
    const matches: Array<{ id: string; quantity: number }> = [];
    const messageLower = message.toLowerCase();

    const quantityMatch = messageLower.match(/(\d+)\s*x?\s+/);
    const defaultQty = quantityMatch ? parseInt(quantityMatch[1]) : 1;

    for (const category in products) {
      for (const product of products[category]) {
        const productWords = product.name.toLowerCase().split(/\s+/);
        const isMatched = productWords.some((word) => messageLower.includes(word));

        if (isMatched) {
          matches.push({ id: product.id, quantity: defaultQty });
        }
      }
    }

    return matches;
  }

  private async cmdRegister(phoneNumber: string, args: string[]): Promise<BotMessage[]> {
    const name = args.join(' ') || 'Customer';
    const result = await botApiClient.registerUser(phoneNumber, name, 'customer');

    if (result.success) {
      return [{ type: 'text', content: `✅ Welcome ${name}! You're now registered. Type !menu to see our products.` }];
    }

    return [{ type: 'text', content: `Registration failed: ${result.error}` }];
  }

  private async cmdShowMenu(merchantId: string): Promise<BotMessage[]> {
    const result = await botApiClient.listProducts(merchantId);

    if (!result.success || !result.products) {
      return [{ type: 'text', content: 'Could not load menu. Please try again.' }];
    }

    let menuText = '🍽️ *Our Menu*\n\n';

    for (const category in result.products) {
      menuText += `*${category}*\n`;
      for (const product of result.products[category]) {
        menuText += `• ${product.name} - ${product.currency} ${product.price}\n`;
      }
      menuText += '\n';
    }

    menuText += 'Type: !add [product name] [qty] or just say "I want..."';

    return [{ type: 'text', content: menuText }];
  }

  private async cmdSearch(query: string, merchantId: string): Promise<BotMessage[]> {
    if (!query) {
      return [{ type: 'text', content: 'What would you like to search for?' }];
    }

    const result = await botApiClient.searchProducts(query, merchantId);

    if (!result.success || result.count === 0) {
      return [{ type: 'text', content: `No products found matching "${query}". Type !menu to browse.` }];
    }

    let text = `Found ${result.count} product(s):\n\n`;
    for (const product of result.results) {
      text += `• ${product.name} - ${product.currency} ${product.price}\n`;
    }

    return [{ type: 'text', content: text }];
  }

  private async cmdShowCart(phoneNumber: string, merchantId: string): Promise<BotMessage[]> {
    const result = await botApiClient.getCart(phoneNumber, merchantId);

    if (!result.success || !result.cart) {
      return [{ type: 'text', content: 'Your cart is empty. Type !menu to add items.' }];
    }

    let cartText = '🛒 *Your Cart*\n\n';

    for (const item of result.cart.items) {
      cartText += `${item.quantity}x ${item.product_name}\n${item.currency} ${item.price} each = ${item.currency} ${item.subtotal.toFixed(2)}\n\n`;
    }

    cartText += `*Total: ${result.cart.currency} ${result.cart.total.toFixed(2)}*\n\n`;
    cartText += 'Type: !checkout to order or !add [product] to add more';

    return [{ type: 'text', content: cartText }];
  }

  private async cmdAddToCart(phoneNumber: string, args: string[], merchantId: string): Promise<BotMessage[]> {
    if (args.length === 0) {
      return [{ type: 'text', content: 'Usage: !add [product name] [quantity]' }];
    }

    const lastArg = args[args.length - 1];
    const qty = parseInt(lastArg) > 0 ? parseInt(lastArg) : 1;
    const productQuery = args.slice(0, args.length - 1).join(' ');

    const result = await botApiClient.searchProducts(productQuery, merchantId);

    if (!result.success || result.count === 0) {
      return [{ type: 'text', content: `Product "${productQuery}" not found. Type !menu to browse.` }];
    }

    const product = result.results[0];
    const addResult = await botApiClient.addToCart(phoneNumber, merchantId, product.id, qty);

    if (addResult.success) {
      return [
        {
          type: 'text',
          content: `✅ Added ${qty}x ${product.name} to cart! (${addResult.items_count} total items)\nType !cart to view or !checkout to order.`,
        },
      ];
    }

    return [{ type: 'text', content: 'Failed to add item to cart. Please try again.' }];
  }

  private async cmdRemoveFromCart(phoneNumber: string, productName: string | undefined, merchantId: string): Promise<BotMessage[]> {
    if (!productName) {
      return [{ type: 'text', content: 'Which product would you like to remove?' }];
    }

    const result = await botApiClient.searchProducts(productName, merchantId);
    if (!result.success || result.count === 0) {
      return [{ type: 'text', content: 'Product not found.' }];
    }

    await botApiClient.removeFromCart(phoneNumber, merchantId, result.results[0].id);

    return [{ type: 'text', content: '✅ Item removed from cart.' }];
  }

  private async cmdClearCart(phoneNumber: string, merchantId: string): Promise<BotMessage[]> {
    await botApiClient.clearCart(phoneNumber, merchantId);
    return [{ type: 'text', content: '🗑️ Cart cleared. Type !menu to start shopping again.' }];
  }

  private async cmdCheckout(phoneNumber: string, merchantId: string): Promise<BotMessage[]> {
    const cart = await botApiClient.getCart(phoneNumber, merchantId);

    if (!cart.success || !cart.cart || cart.cart.items.length === 0) {
      return [{ type: 'text', content: 'Your cart is empty. Type !menu to add items.' }];
    }

    const items = cart.cart.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }));

    const order = await botApiClient.createOrder(
      merchantId,
      phoneNumber,
      items,
      cart.cart.total,
      cart.cart.currency,
      'pending'
    );

    if (order.success) {
      await botApiClient.clearCart(phoneNumber, merchantId);

      return [
        {
          type: 'text',
          content: `✅ Order placed successfully!\nOrder ID: ${order.order_id}\nTotal: ${cart.cart.currency} ${cart.cart.total.toFixed(2)}\n\nYou will receive payment details shortly. Type !status ${order.order_id} to track.`,
        },
      ];
    }

    return [{ type: 'text', content: 'Failed to place order. Please try again.' }];
  }

  private async cmdShowOrders(phoneNumber: string, userRole: string, merchantId: string, status?: string): Promise<BotMessage[]> {
    if (userRole !== 'merchant' && userRole !== 'super_admin') {
      return [{ type: 'text', content: 'Access denied. Merchant access required.' }];
    }

    const result = await botApiClient.listMerchantOrders(merchantId, status);

    if (!result.success || result.count === 0) {
      return [{ type: 'text', content: 'No orders found.' }];
    }

    let text = `📦 Orders (${result.count})\n\n`;

    for (const order of result.orders.slice(0, 5)) {
      text += `Order: ${order.id}\nStatus: ${order.status} | Payment: ${order.payment_status}\nTotal: ${order.currency} ${order.total_amount}\n\n`;
    }

    return [{ type: 'text', content: text }];
  }

  private async cmdOrderStatus(phoneNumber: string, orderId: string, _merchantId: string): Promise<BotMessage[]> {
    if (!orderId) {
      return [{ type: 'text', content: 'Please provide an order ID. Usage: !status <order-id>' }];
    }

    const result = await botApiClient.getOrder(orderId);

    if (!result.success || !result.order) {
      return [{ type: 'text', content: 'Order not found.' }];
    }

    const order = result.order;

    return [
      {
        type: 'text',
        content: `📦 *Order ${orderId}*\n\nStatus: ${order.status}\nPayment: ${order.payment_status}\nTotal: ${order.currency} ${order.total_amount}\nPlaced: ${new Date(order.created_at).toLocaleDateString()}`,
      },
    ];
  }

  private async cmdMerchantDashboard(phoneNumber: string, userRole: string, merchantId: string): Promise<BotMessage[]> {
    if (userRole !== 'merchant' && userRole !== 'super_admin') {
      return [{ type: 'text', content: 'Access denied. Merchant access required.' }];
    }

    return [
      {
        type: 'text',
        content: 'Dashboard feature coming soon. Use the web platform for full analytics.',
      },
    ];
  }

  private getHelpText(): string {
    return `📚 *Available Commands*

👥 *Customer:*
!register [name] - Register
!menu / !m - View products
!search [query] - Search products
!add [product] [qty] - Add to cart
!cart / !c - View cart
!remove [product] - Remove from cart
!clear - Clear cart
!checkout / !pay - Place order
!status [order-id] - Check order
!orders - Your orders

🏪 *Merchant:*
!orders [status] - View orders
!orders pending - Filter by status
!dashboard - Business stats

*Natural Language:*
Just message: "I want 2 sadza please"
or "Can I get chicken and rice?"

Type !help for this message`;
  }
}

export const botManager = new BotManager();
