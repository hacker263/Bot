export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  inApp: boolean;
  orderUpdates: boolean;
  paymentAlerts: boolean;
  systemMaintenance: boolean;
  marketingUpdates: boolean;
}

class NotificationService {
  private notifications: Map<string, Notification[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();

  // Default preferences
  private defaultPreferences: NotificationPreferences = {
    email: true,
    sms: false,
    inApp: true,
    orderUpdates: true,
    paymentAlerts: true,
    systemMaintenance: true,
    marketingUpdates: false
  };

  createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    actionUrl?: string,
    actionText?: string
  ): Notification {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      actionUrl,
      actionText
    };

    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.unshift(notification);
    
    // Keep only last 50 notifications per user
    if (userNotifications.length > 50) {
      userNotifications.splice(50);
    }
    
    this.notifications.set(userId, userNotifications);
    return notification;
  }

  getNotifications(userId: string): Notification[] {
    return this.notifications.get(userId) || [];
  }

  getUnreadCount(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.read).length;
  }

  markAsRead(userId: string, notificationId: string): void {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  markAllAsRead(userId: string): void {
    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.forEach(n => n.read = true);
  }

  deleteNotification(userId: string, notificationId: string): void {
    const userNotifications = this.notifications.get(userId) || [];
    const index = userNotifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      userNotifications.splice(index, 1);
    }
  }

  getPreferences(userId: string): NotificationPreferences {
    return this.preferences.get(userId) || this.defaultPreferences;
  }

  updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): void {
    const current = this.getPreferences(userId);
    this.preferences.set(userId, { ...current, ...preferences });
  }

  // Predefined notification templates
  notifyOrderReceived(merchantId: string, orderNumber: string, customerName: string, amount: number, currency: string): void {
    this.createNotification(
      merchantId,
      'info',
      'New Order Received',
      `Order #${orderNumber} from ${customerName} for ${currency} ${amount.toFixed(2)}`,
      `/dashboard/orders`,
      'View Order'
    );
  }

  notifyPaymentReceived(merchantId: string, orderNumber: string, amount: number, currency: string): void {
    this.createNotification(
      merchantId,
      'success',
      'Payment Received',
      `Payment of ${currency} ${amount.toFixed(2)} received for order #${orderNumber}`,
      `/dashboard/orders`,
      'View Order'
    );
  }

  notifyLowStock(merchantId: string, productName: string, currentStock: number): void {
    this.createNotification(
      merchantId,
      'warning',
      'Low Stock Alert',
      `${productName} is running low (${currentStock} remaining)`,
      `/dashboard/products`,
      'Update Stock'
    );
  }

  notifyUsageLimitWarning(merchantId: string, percentageUsed: number, planName: string): void {
    this.createNotification(
      merchantId,
      'warning',
      'Usage Limit Warning',
      `You've used ${percentageUsed.toFixed(0)}% of your ${planName} plan limit`,
      `/dashboard/settings`,
      'Upgrade Plan'
    );
  }

  notifySystemMaintenance(userId: string, maintenanceDate: Date, duration: string): void {
    this.createNotification(
      userId,
      'info',
      'Scheduled Maintenance',
      `System maintenance scheduled for ${maintenanceDate.toLocaleDateString()} (${duration})`,
    );
  }

  // Bulk notifications for admin
  broadcastToAllMerchants(
    type: Notification['type'],
    title: string,
    message: string,
    merchantIds: string[]
  ): void {
    merchantIds.forEach(merchantId => {
      this.createNotification(merchantId, type, title, message);
    });
  }
}

export const notificationService = new NotificationService();