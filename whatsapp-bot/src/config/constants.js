/**
 * Global Constants and Configuration
 * Used across all modules for consistency
 */

module.exports = {
  BOT_PREFIX: process.env.BOT_PREFIX || '!',
  ADMIN_PHONES: (process.env.ADMIN_PHONES || '').split(',').filter(Boolean),
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5173',
  SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  SUPABASE_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  BOT_API_PORT: process.env.BOT_API_PORT || 4001,
  BOT_WEBHOOK_PORT: process.env.BOT_WEBHOOK_PORT || 3001,
  
  // Cache TTLs (seconds)
  CACHE_TTL: {
    SESSION: 86400,      // 24 hours
    CART: 7200,          // 2 hours
    USER: 3600,          // 1 hour
    MERCHANT: 1800,      // 30 minutes
    PRODUCT: 900,        // 15 minutes
    COMMAND: 300,        // 5 minutes
  },

  // Rate Limiting
  RATE_LIMIT: {
    IMAGE_UPLOAD: 10,    // max 10 images per minute
    MESSAGE_SEND: 100,   // max 100 messages per minute
    API_CALL: 50,        // max 50 API calls per minute
  },

  // Message Templates
  MESSAGES: {
    ERROR: '❌ Sorry, an error occurred. Please try again later.',
    NOT_AUTHORIZED: '🔒 You are not authorized to use this command.',
    UNKNOWN_COMMAND: '❓ Unknown command. Type !help for available commands.',
    WELCOME: '👋 Welcome to Smart WhatsApp Bot!',
  },

  // User Roles
  ROLES: {
    ADMIN: 'admin',
    MERCHANT: 'merchant',
    CUSTOMER: 'customer',
  },

  // Order Status
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PREPARING: 'preparing',
    READY: 'ready',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  },

  // Merchant Status
  MERCHANT_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    SUSPENDED: 'suspended',
    REJECTED: 'rejected',
  },

  // Product Visibility
  VISIBILITY: {
    PUBLIC: 'public',
    PRIVATE: 'private',
  },
};
