const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

class BotApiClient {
  private baseUrl = `${SUPABASE_URL}/functions/v1`;

  private async request(endpoint: string, payload: Record<string, unknown>) {
    try {
      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Client-Info': 'bot-client/1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Bot API error on ${endpoint}:`, error);
      throw error;
    }
  }

  async registerUser(phoneNumber: string, name: string, role: string) {
    return this.request('bot-auth', {
      action: 'register',
      phone_number: phoneNumber,
      name,
      role,
    });
  }

  async verifyUser(phoneNumber: string) {
    return this.request('bot-auth', {
      action: 'verify',
      phone_number: phoneNumber,
    });
  }

  async saveMessage(customerPhone: string, content: string, direction: string, merchantId?: string) {
    return this.request('bot-messages', {
      action: 'save',
      customer_phone: customerPhone,
      merchant_id: merchantId,
      message_content: content,
      direction,
    });
  }

  async getConversationSession(customerPhone: string) {
    return this.request('bot-messages', {
      action: 'get_session',
      customer_phone: customerPhone,
    });
  }

  async clearConversationSession(customerPhone: string) {
    return this.request('bot-messages', {
      action: 'clear_session',
      customer_phone: customerPhone,
    });
  }

  async createOrder(merchantId: string, customerPhone: string, items: unknown[], totalAmount: number, currency: string, paymentMethod: string) {
    return this.request('bot-orders', {
      action: 'create',
      merchant_id: merchantId,
      customer_phone: customerPhone,
      items,
      total_amount: totalAmount,
      currency,
      payment_method: paymentMethod,
    });
  }

  async getOrder(orderId: string) {
    return this.request('bot-orders', {
      action: 'get',
      order_id: orderId,
    });
  }

  async updateOrderStatus(orderId: string, status: string) {
    return this.request('bot-orders', {
      action: 'update_status',
      order_id: orderId,
      status,
    });
  }

  async listMerchantOrders(merchantId: string, status?: string) {
    return this.request('bot-orders', {
      action: 'list',
      merchant_id: merchantId,
      status,
    });
  }

  async listProducts(merchantId?: string) {
    return this.request('bot-products', {
      action: 'list',
      merchant_id: merchantId,
    });
  }

  async getProduct(productId: string) {
    return this.request('bot-products', {
      action: 'get',
      product_id: productId,
    });
  }

  async searchProducts(query: string, merchantId?: string) {
    return this.request('bot-products', {
      action: 'search',
      query,
      merchant_id: merchantId,
    });
  }

  async getProductsByCategory(category: string, merchantId?: string) {
    return this.request('bot-products', {
      action: 'by_category',
      category,
      merchant_id: merchantId,
    });
  }

  async addToCart(customerPhone: string, merchantId: string, productId: string, quantity: number) {
    return this.request('bot-carts', {
      action: 'add',
      customer_phone: customerPhone,
      merchant_id: merchantId,
      product_id: productId,
      quantity,
    });
  }

  async getCart(customerPhone: string, merchantId: string) {
    return this.request('bot-carts', {
      action: 'get',
      customer_phone: customerPhone,
      merchant_id: merchantId,
    });
  }

  async removeFromCart(customerPhone: string, merchantId: string, productId: string) {
    return this.request('bot-carts', {
      action: 'remove',
      customer_phone: customerPhone,
      merchant_id: merchantId,
      product_id: productId,
    });
  }

  async clearCart(customerPhone: string, merchantId: string) {
    return this.request('bot-carts', {
      action: 'clear',
      customer_phone: customerPhone,
      merchant_id: merchantId,
    });
  }
}

export const botApiClient = new BotApiClient();
