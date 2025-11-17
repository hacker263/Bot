interface WebhookPayload {
  orderId: string;
  status: string;
  customerPhone: string;
  merchantId: string;
}

interface LowStockPayload {
  productName: string;
  currentStock: number;
  merchantPhone: string;
}

class WebhookService {
  private botWebhookUrl = 'http://localhost:3001';

  async notifyOrderUpdate(payload: WebhookPayload): Promise<boolean> {
    try {
      const response = await fetch(`${this.botWebhookUrl}/webhook/order-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send order update webhook:', error);
      return false;
    }
  }

  async notifyLowStock(payload: LowStockPayload): Promise<boolean> {
    try {
      const response = await fetch(`${this.botWebhookUrl}/webhook/low-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send low stock webhook:', error);
      return false;
    }
  }

  async checkBotHealth(): Promise<{ status: string; bot: string; timestamp: string } | null> {
    try {
      const response = await fetch(`${this.botWebhookUrl}/health`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to check bot health:', error);
      return null;
    }
  }
}

export const webhookService = new WebhookService();