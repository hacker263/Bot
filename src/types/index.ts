export interface User {
  id: string;
  email: string;
  name: string;
  role: 'merchant' | 'super_admin';
  merchantId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  price: number;
  currency: 'USD' | 'ZWL' | 'ZAR';
  category: string;
  stock: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  merchantId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number;
  currency: 'USD' | 'ZWL' | 'ZAR';
  status: 'pending' | 'confirmed' | 'fulfilled' | 'cancelled';
  paymentMethod: 'ecocash' | 'onemoney' | 'bank_transfer' | 'eft' | 'payfast' | 'snapscan' | 'cod';
  paymentStatus: 'pending' | 'paid' | 'failed';
  region: 'ZW' | 'ZA';
  createdAt: Date;
  updatedAt: Date;
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  region: 'ZW' | 'ZA';
  currency: 'USD' | 'ZWL' | 'ZAR';
  subscriptionPlan: 'free' | 'starter' | 'pro';
  orderCount: number;
  orderLimit: number;
  isActive: boolean;
  settings: {
    codEnabled: boolean;
    messageTemplates: {
      welcome: string;
      orderConfirmation: string;
      paymentLink: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: { productName: string; sales: number; revenue: number }[];
  dailySales: { date: string; orders: number; revenue: number }[];
  monthlySales: { month: string; orders: number; revenue: number }[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  orderLimit: number;
  price: number;
  features: string[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  region: 'ZW' | 'ZA';
  type: 'mobile' | 'bank' | 'digital';
}

export interface WhatsAppMessage {
  id: string;
  type: 'incoming' | 'outgoing';
  content: string;
  timestamp: Date;
  customerPhone: string;
}

export interface Cart {
  items: { productId: string; quantity: number }[];
  customerPhone: string;
  lastUpdated: Date;
}

export interface BotMessage {
  type: 'text' | 'buttons' | 'list' | 'image';
  content: string;
  buttons?: Array<{ label: string; id: string }>;
  listItems?: Array<{ title: string; id: string; description?: string }>;
  media?: string;
}

export interface ConversationSession {
  id: string;
  customerPhone: string;
  merchantId?: string;
  step: 'welcome' | 'browsing' | 'ordering' | 'cart_review' | 'checkout' | 'payment' | 'complete';
  context: Record<string, unknown>;
  lastMessageAt: Date;
  expiresAt: Date;
}

export interface BotCommand {
  command: string;
  args: string[];
  isCommand: boolean;
  intent?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface CustomerPreference {
  customerId: string;
  merchantId: string;
  preferredProducts: string[];
  preferredPaymentMethod?: string;
  language: string;
  notificationsEnabled: boolean;
}