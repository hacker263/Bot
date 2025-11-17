import { WhatsAppMessage, Cart, Product } from '../types';
import { dataService } from './dataService';
import { paymentService } from './paymentService';
import { localizationService } from './localizationService';
import { notificationService } from './notificationService';

// Simple NLP for parsing orders
class NLPService {
  parseOrderMessage(message: string, products: Product[]): { productId: string; quantity: number }[] | null {
    const normalizedMessage = message.toLowerCase();
    const orderItems: { productId: string; quantity: number }[] = [];

    // Common patterns for ordering
    const patterns = [
      /(\d+)\s*x?\s*(.+)/g, // "2x sadza" or "2 sadza"
      /(.+?)\s*[\s-]\s*(\d+)/g, // "sadza - 2" or "sadza 2"
    ];

    // Look for product matches
    products.forEach(product => {
      const productName = product.name.toLowerCase();
      const productWords = productName.split(' ');
      
      // Check if product name or key words appear in message
      const isProductMentioned = productWords.some(word => 
        word.length > 2 && normalizedMessage.includes(word)
      ) || normalizedMessage.includes(productName);

      if (isProductMentioned) {
        // Try to extract quantity
        let quantity = 1;
        
        for (const pattern of patterns) {
          const matches = Array.from(normalizedMessage.matchAll(pattern));
          for (const match of matches) {
            if (match[2] && match[2].includes(productWords[0])) {
              quantity = parseInt(match[1]) || 1;
              break;
            } else if (match[1] && match[1].includes(productWords[0])) {
              quantity = parseInt(match[2]) || 1;
              break;
            }
          }
        }

        // Look for standalone numbers
        if (quantity === 1) {
          const numberMatches = normalizedMessage.match(/\b\d+\b/g);
          if (numberMatches && numberMatches.length === 1) {
            quantity = parseInt(numberMatches[0]);
          }
        }

        orderItems.push({ productId: product.id, quantity });
      }
    });

    return orderItems.length > 0 ? orderItems : null;
  }

  needsClarification(message: string, products: Product[]): boolean {
    const parsed = this.parseOrderMessage(message, products);
    return !parsed || parsed.length === 0;
  }
}

class WhatsAppService {
  private nlp = new NLPService();
  private carts = new Map<string, Cart>();
  private sessions = new Map<string, { step: string; merchantId: string }>();

  async processMessage(
    customerPhone: string,
    message: string,
    merchantId: string
  ): Promise<WhatsAppMessage[]> {
    const products = dataService.getProducts(merchantId);
    const merchant = dataService.getMerchants().find(m => m.id === merchantId);
    if (!merchant) return [];

    // Get localized templates
    const language = localizationService.getMerchantLanguage(merchant);
    const templates = localizationService.getTemplates(language);

    const responses: WhatsAppMessage[] = [];
    const session = this.sessions.get(customerPhone) || { step: 'welcome', merchantId };
    this.sessions.set(customerPhone, session);

    // Handle different conversation steps
    switch (session.step) {
      case 'welcome':
        responses.push({
          id: `msg-${Date.now()}`,
          type: 'outgoing',
          content: localizationService.formatMessage(templates.welcome, {
            businessName: merchant.businessName
          }),
          timestamp: new Date(),
          customerPhone
        });

        responses.push({
          id: `msg-${Date.now()}-menu`,
          type: 'outgoing',
          content: this.generateMenuMessage(products),
          timestamp: new Date(),
          customerPhone
        });

        session.step = 'ordering';
        break;

      case 'ordering':
        const orderItems = this.nlp.parseOrderMessage(message, products);
        
        if (!orderItems || orderItems.length === 0) {
          responses.push({
            id: `msg-${Date.now()}`,
            type: 'outgoing',
            content: templates.clarification,
            timestamp: new Date(),
            customerPhone
          });
        } else {
          // Add to cart
          const cart = this.carts.get(customerPhone) || { items: [], customerPhone, lastUpdated: new Date() };
          
          orderItems.forEach(item => {
            const existingItem = cart.items.find(ci => ci.productId === item.productId);
            if (existingItem) {
              existingItem.quantity += item.quantity;
            } else {
              cart.items.push(item);
            }
          });
          
          cart.lastUpdated = new Date();
          this.carts.set(customerPhone, cart);

          responses.push({
            id: `msg-${Date.now()}`,
            type: 'outgoing',
            content: this.generateCartSummary(cart, products),
            timestamp: new Date(),
            customerPhone
          });

          responses.push({
            id: `msg-${Date.now()}-options`,
            type: 'outgoing',
            content: 'Would you like to:\n1. Add more items\n2. Checkout\n3. Clear cart\n\nJust type the number or tell me what you\'d like to do!',
            timestamp: new Date(),
            customerPhone
          });

          session.step = 'cart_options';
        }
        break;

      case 'cart_options':
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('1') || lowerMessage.includes('add') || lowerMessage.includes('more')) {
          session.step = 'ordering';
          responses.push({
            id: `msg-${Date.now()}`,
            type: 'outgoing',
            content: 'Great! What else would you like to add?',
            timestamp: new Date(),
            customerPhone
          });
        } else if (lowerMessage.includes('2') || lowerMessage.includes('checkout') || lowerMessage.includes('order')) {
          session.step = 'checkout';
          responses.push({
            id: `msg-${Date.now()}`,
            type: 'outgoing',
            content: 'Perfect! I\'ll help you complete your order. What\'s your name?',
            timestamp: new Date(),
            customerPhone
          });
        } else if (lowerMessage.includes('3') || lowerMessage.includes('clear') || lowerMessage.includes('empty')) {
          this.carts.delete(customerPhone);
          session.step = 'ordering';
          responses.push({
            id: `msg-${Date.now()}`,
            type: 'outgoing',
            content: 'Cart cleared! What would you like to order?',
            timestamp: new Date(),
            customerPhone
          });
        } else {
          // Try to parse as new order
          const newOrderItems = this.nlp.parseOrderMessage(message, products);
          if (newOrderItems && newOrderItems.length > 0) {
            session.step = 'ordering';
            return this.processMessage(customerPhone, message, merchantId);
          } else {
            responses.push({
              id: `msg-${Date.now()}`,
              type: 'outgoing',
              content: 'Please choose:\n1. Add more items\n2. Checkout\n3. Clear cart',
              timestamp: new Date(),
              customerPhone
            });
          }
        }
        break;

      case 'checkout':
        if (!this.sessions.get(customerPhone)?.customerName) {
          this.sessions.set(customerPhone, { ...session, customerName: message });
          responses.push({
            id: `msg-${Date.now()}`,
            type: 'outgoing',
            content: `Thank you ${message}! How would you like to pay?${this.generatePaymentOptions(merchant.region)}`,
            timestamp: new Date(),
            customerPhone
          });
          session.step = 'payment';
        }
        break;

      case 'payment':
        const paymentMethod = this.parsePaymentMethod(message, merchant.region);
        if (paymentMethod) {
          await this.createOrder(customerPhone, merchantId, paymentMethod);
          responses.push({
            id: `msg-${Date.now()}`,
            type: 'outgoing',
            content: 'Order created successfully! 🎉 You will receive payment details shortly.',
            timestamp: new Date(),
            customerPhone
          });
          
          // Reset session
          this.sessions.delete(customerPhone);
          this.carts.delete(customerPhone);
        } else {
          responses.push({
            id: `msg-${Date.now()}`,
            type: 'outgoing',
            content: 'Please select a valid payment method:' + this.generatePaymentOptions(merchant.region),
            timestamp: new Date(),
            customerPhone
          });
        }
        break;

      default:
        session.step = 'welcome';
        return this.processMessage(customerPhone, message, merchantId);
    }

    return responses;
  }

  private generateMenuMessage(products: Product[]): string {
    let menu = '🍽️ *Our Menu*\n\n';
    
    const categories = [...new Set(products.map(p => p.category))];
    categories.forEach(category => {
      menu += `*${category}*\n`;
      products
        .filter(p => p.category === category && p.isActive)
        .forEach(product => {
          menu += `• ${product.name} - ${product.currency} ${product.price}\n  ${product.description}\n\n`;
        });
    });
    
    menu += 'Just tell me what you\'d like! For example: "2 Sadza & Beef Stew" or "1x Chicken Rice"';
    return menu;
  }

  private generateCartSummary(cart: Cart, products: Product[]): string {
    let summary = '🛒 *Your Cart*\n\n';
    let total = 0;
    let currency = 'USD';

    cart.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const itemTotal = product.price * item.quantity;
        total += itemTotal;
        currency = product.currency;
        summary += `• ${item.quantity}x ${product.name}\n  ${currency} ${product.price} each = ${currency} ${itemTotal.toFixed(2)}\n\n`;
      }
    });

    summary += `*Total: ${currency} ${total.toFixed(2)}*`;
    return summary;
  }

  private generatePaymentOptions(region: 'ZW' | 'ZA'): string {
    const methods = paymentService.getPaymentMethodsForRegion(region);
    let options = '\n\nPayment Options:\n';
    methods.forEach((method, index) => {
      options += `${index + 1}. ${method.name}\n`;
    });
    return options;
  }

  private parsePaymentMethod(message: string, region: 'ZW' | 'ZA'): string | null {
    const methods = paymentService.getPaymentMethodsForRegion(region);
    const lowerMessage = message.toLowerCase();

    // Try number selection first
    const numberMatch = message.match(/\b(\d+)\b/);
    if (numberMatch) {
      const index = parseInt(numberMatch[1]) - 1;
      if (index >= 0 && index < methods.length) {
        return methods[index].id;
      }
    }

    // Try name matching
    return methods.find(method => 
      lowerMessage.includes(method.name.toLowerCase()) ||
      lowerMessage.includes(method.id)
    )?.id || null;
  }

  private async createOrder(customerPhone: string, merchantId: string, paymentMethod: string): Promise<void> {
    const cart = this.carts.get(customerPhone);
    const session = this.sessions.get(customerPhone);
    const products = dataService.getProducts(merchantId);
    const merchant = dataService.getMerchants().find(m => m.id === merchantId);

    if (!cart || !session?.customerName || !merchant) return;

    const orderItems = cart.items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      return {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        price: product.price
      };
    });

    const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const order = dataService.createOrder({
      merchantId,
      customerName: session.customerName,
      customerPhone,
      items: orderItems,
      totalAmount,
      currency: merchant.currency,
      status: 'pending',
      paymentMethod: paymentMethod as any,
      paymentStatus: 'pending',
      region: merchant.region
    });

    // Create payment link (mock)
    try {
      const paymentLink = await paymentService.createPaymentLink(
        order.id,
        totalAmount,
        merchant.currency,
        paymentMethod,
        merchant.region
      );
      
      // Notify merchant of new order
      notificationService.notifyOrderReceived(
        merchantId,
        order.id.split('-')[1],
        session.customerName,
        totalAmount,
        merchant.currency
      );
      
      // In a real app, this would send a WhatsApp message with the payment link
      console.log(`Payment link for order ${order.id}: ${paymentLink}`);
    } catch (error) {
      console.error('Failed to create payment link:', error);
    }
  }

  getCart(customerPhone: string): Cart | undefined {
    return this.carts.get(customerPhone);
  }

  clearCart(customerPhone: string): void {
    this.carts.delete(customerPhone);
    this.sessions.delete(customerPhone);
  }
}

export const whatsappService = new WhatsAppService();