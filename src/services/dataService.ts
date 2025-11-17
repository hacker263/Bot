import { Product, Order, Merchant, Analytics, SubscriptionPlan, OrderItem } from '../types';
import { webhookService } from './webhookService';

// Mock data for demo purposes
const mockProducts: Product[] = [
  {
    id: 'prod-1',
    merchantId: 'merchant-1',
    name: 'Sadza & Beef Stew',
    description: 'Traditional Zimbabwean meal with tender beef stew',
    price: 5.50,
    currency: 'USD',
    category: 'Main Course',
    stock: 50,
    imageUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'prod-2',
    merchantId: 'merchant-1',
    name: 'Chicken & Rice',
    description: 'Grilled chicken with seasoned rice',
    price: 6.00,
    currency: 'USD',
    category: 'Main Course',
    stock: 30,
    imageUrl: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400',
    isActive: true,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16')
  },
  {
    id: 'prod-3',
    merchantId: 'merchant-2',
    name: 'Boerewors & Pap',
    description: 'Traditional South African sausage with maize porridge',
    price: 120,
    currency: 'ZAR',
    category: 'Main Course',
    stock: 25,
    imageUrl: 'https://images.pexels.com/photos/3688/food-dinner-lunch-unhealthy.jpg?auto=compress&cs=tinysrgb&w=400',
    isActive: true,
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17')
  },
  {
    id: 'prod-4',
    merchantId: 'merchant-1',
    name: 'Mazondo (Trotters)',
    description: 'Traditional cow trotters in rich gravy',
    price: 7.50,
    currency: 'USD',
    category: 'Traditional',
    stock: 15,
    imageUrl: 'https://images.pexels.com/photos/5491932/pexels-photo-5491932.jpeg?auto=compress&cs=tinysrgb&w=400',
    isActive: true,
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18')
  }
];

const mockOrders: Order[] = [
  {
    id: 'order-1',
    merchantId: 'merchant-1',
    customerName: 'Tawanda Mukamuri',
    customerPhone: '+263771234567',
    items: [
      { productId: 'prod-1', productName: 'Sadza & Beef Stew', quantity: 2, price: 5.50 },
      { productId: 'prod-2', productName: 'Chicken & Rice', quantity: 1, price: 6.00 }
    ],
    totalAmount: 17.00,
    currency: 'USD',
    status: 'confirmed',
    paymentMethod: 'ecocash',
    paymentStatus: 'paid',
    region: 'ZW',
    createdAt: new Date('2024-01-20T10:30:00'),
    updatedAt: new Date('2024-01-20T11:00:00')
  },
  {
    id: 'order-2',
    merchantId: 'merchant-1',
    customerName: 'Grace Ndoro',
    customerPhone: '+263772345678',
    items: [
      { productId: 'prod-4', productName: 'Mazondo (Trotters)', quantity: 1, price: 7.50 }
    ],
    totalAmount: 7.50,
    currency: 'USD',
    status: 'pending',
    paymentMethod: 'onemoney',
    paymentStatus: 'pending',
    region: 'ZW',
    createdAt: new Date('2024-01-21T14:15:00'),
    updatedAt: new Date('2024-01-21T14:15:00')
  },
  {
    id: 'order-3',
    merchantId: 'merchant-2',
    customerName: 'Pieter Steyn',
    customerPhone: '+27821234567',
    items: [
      { productId: 'prod-3', productName: 'Boerewors & Pap', quantity: 3, price: 120 }
    ],
    totalAmount: 360,
    currency: 'ZAR',
    status: 'fulfilled',
    paymentMethod: 'eft',
    paymentStatus: 'paid',
    region: 'ZA',
    createdAt: new Date('2024-01-19T16:45:00'),
    updatedAt: new Date('2024-01-20T09:30:00')
  }
];

const mockMerchants: Merchant[] = [
  {
    id: 'merchant-1',
    name: 'John Mutamba',
    email: 'merchant1@demo.com',
    phone: '+263771111111',
    businessName: 'Mutamba\'s Kitchen',
    region: 'ZW',
    currency: 'USD',
    subscriptionPlan: 'starter',
    orderCount: 15,
    orderLimit: 200,
    isActive: true,
    settings: {
      codEnabled: true,
      messageTemplates: {
        welcome: 'Mauya ku Mutamba\'s Kitchen! Welcome! How can we help you today?',
        orderConfirmation: 'Thank you for your order! Order #{{orderNumber}} confirmed. Total: {{total}}',
        paymentLink: 'Please complete payment: {{paymentLink}}'
      }
    },
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-21')
  },
  {
    id: 'merchant-2',
    name: 'Sarah van der Merwe',
    email: 'merchant2@demo.com',
    phone: '+27821111111',
    businessName: 'Boerewors Express',
    region: 'ZA',
    currency: 'ZAR',
    subscriptionPlan: 'pro',
    orderCount: 45,
    orderLimit: -1,
    isActive: true,
    settings: {
      codEnabled: false,
      messageTemplates: {
        welcome: 'Welcome to Boerewors Express! Hoe gaan dit? What can we get you today?',
        orderConfirmation: 'Dankie! Order #{{orderNumber}} confirmed. Total: R{{total}}',
        paymentLink: 'Payment link: {{paymentLink}}'
      }
    },
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-20')
  }
];

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    orderLimit: 20,
    price: 0,
    features: ['Basic WhatsApp bot', 'Product catalog', 'Order management', 'Basic analytics']
  },
  {
    id: 'starter',
    name: 'Starter',
    orderLimit: 200,
    price: 25,
    features: ['All Free features', 'Payment integrations', 'Advanced analytics', 'Export data', 'Priority support']
  },
  {
    id: 'pro',
    name: 'Pro',
    orderLimit: -1,
    price: 75,
    features: ['All Starter features', 'Unlimited orders', 'Multi-location support', 'Custom branding', 'API access']
  }
];

class DataService {
  private products = [...mockProducts];
  private orders = [...mockOrders];
  private merchants = [...mockMerchants];

  // Product methods
  getProducts(merchantId: string): Product[] {
    return this.products.filter(p => p.merchantId === merchantId);
  }

  getAllProducts(): Product[] {
    return this.products;
  }

  createProduct(merchantId: string, productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const product: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      merchantId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.products.push(product);
    return product;
  }

  updateProduct(id: string, updates: Partial<Product>): void {
    const index = this.products.findIndex(p => p.id === id);
    if (index !== -1) {
      this.products[index] = { ...this.products[index], ...updates, updatedAt: new Date() };
      
      // Check for low stock and send notification
      const product = this.products[index];
      if (updates.stock !== undefined && updates.stock < 10) {
        const merchant = this.merchants.find(m => m.id === product.merchantId);
        if (merchant) {
          webhookService.notifyLowStock({
            productName: product.name,
            currentStock: updates.stock,
            merchantPhone: merchant.phone
          });
        }
      }
    }
  }

  deleteProduct(id: string): void {
    this.products = this.products.filter(p => p.id !== id);
  }

  // Order methods
  getOrders(merchantId: string): Order[] {
    return this.orders.filter(o => o.merchantId === merchantId);
  }

  getAllOrders(): Order[] {
    return this.orders;
  }

  createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Order {
    const order: Order = {
      ...orderData,
      id: `order-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.orders.push(order);

    // Update merchant order count
    const merchant = this.merchants.find(m => m.id === orderData.merchantId);
    if (merchant) {
      merchant.orderCount++;
    }

    return order;
  }

  updateOrder(id: string, updates: Partial<Order>): void {
    const index = this.orders.findIndex(o => o.id === id);
    if (index !== -1) {
      this.orders[index] = { ...this.orders[index], ...updates, updatedAt: new Date() };
      
      // Send webhook notification for status changes
      if (updates.status) {
        const order = this.orders[index];
        webhookService.notifyOrderUpdate({
          orderId: order.id.split('-')[1],
          status: updates.status,
          customerPhone: order.customerPhone,
          merchantId: order.merchantId
        });
      }
    }
  }

  // Merchant methods
  getMerchants(): Merchant[] {
    return this.merchants;
  }

  createMerchant(merchantData: Omit<Merchant, 'id' | 'createdAt' | 'updatedAt'>): Merchant {
    const merchant: Merchant = {
      ...merchantData,
      id: `merchant-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.merchants.push(merchant);
    return merchant;
  }

  updateMerchant(id: string, updates: Partial<Merchant>): void {
    const index = this.merchants.findIndex(m => m.id === id);
    if (index !== -1) {
      this.merchants[index] = { ...this.merchants[index], ...updates, updatedAt: new Date() };
    }
  }

  deleteMerchant(id: string): void {
    this.merchants = this.merchants.filter(m => m.id !== id);
    this.products = this.products.filter(p => p.merchantId !== id);
    this.orders = this.orders.filter(o => o.merchantId !== id);
  }

  // Analytics methods
  getAnalytics(merchantId: string): Analytics {
    const merchantOrders = this.orders.filter(o => o.merchantId === merchantId);
    const products = this.products.filter(p => p.merchantId === merchantId);
    
    const totalRevenue = merchantOrders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    
    const totalOrders = merchantOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top products
    const productSales = new Map<string, { sales: number; revenue: number; name: string }>();
    merchantOrders.forEach(order => {
      order.items.forEach(item => {
        const current = productSales.get(item.productId) || { sales: 0, revenue: 0, name: item.productName };
        current.sales += item.quantity;
        current.revenue += item.price * item.quantity;
        productSales.set(item.productId, current);
      });
    });

    const topProducts = Array.from(productSales.values())
      .map(p => ({ productName: p.name, sales: p.sales, revenue: p.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Daily sales (last 7 days)
    const dailySales = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = merchantOrders.filter(o => 
        o.createdAt.toISOString().split('T')[0] === dateStr
      );
      
      dailySales.push({
        date: dateStr,
        orders: dayOrders.length,
        revenue: dayOrders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.totalAmount, 0)
      });
    }

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      topProducts,
      dailySales,
      monthlySales: [] // Simplified for demo
    };
  }

  getPlatformAnalytics(): Analytics {
    const totalRevenue = this.orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    
    const totalOrders = this.orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      topProducts: [],
      dailySales: [],
      monthlySales: []
    };
  }

  getSubscriptionPlans(): SubscriptionPlan[] {
    return subscriptionPlans;
  }

  // Export functionality
  exportOrdersToCSV(merchantId?: string): string {
    const ordersToExport = merchantId ? 
      this.orders.filter(o => o.merchantId === merchantId) : 
      this.orders;

    const headers = ['Order ID', 'Customer Name', 'Phone', 'Items', 'Total', 'Status', 'Payment Method', 'Date'];
    const rows = ordersToExport.map(order => [
      order.id,
      order.customerName,
      order.customerPhone,
      order.items.map(i => `${i.productName} (${i.quantity})`).join('; '),
      `${order.totalAmount} ${order.currency}`,
      order.status,
      order.paymentMethod,
      order.createdAt.toISOString().split('T')[0]
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export const dataService = new DataService();