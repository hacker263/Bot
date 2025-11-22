/**
 * Message Formatting Utilities
 * Creates formatted WhatsApp messages with proper spacing and emojis
 */

class MessageFormatter {
  /**
   * Format product display
   */
  static formatProduct(product) {
    return `
*${product.name}*
━━━━━━━━━━━━━━━
💰 Price: ZWL ${product.price.toFixed(2)}
📦 Stock: ${product.stock || 'Available'}
${product.description ? `📝 ${product.description}` : ''}
⭐ Rating: ${product.rating || 'N/A'} (${product.reviews || 0} reviews)
${product.image_url ? `🖼️ Has images` : ''}

ID: \`${product.id}\`
`.trim();
  }

  /**
   * Format order summary
   */
  static formatOrder(order) {
    const items = order.items.map(item => 
      `${item.quantity}x ${item.name} - ZWL ${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    return `
*Order #${order.id}*
━━━━━━━━━━━━━━━
📅 Date: ${new Date(order.created_at).toLocaleDateString()}
🏪 Merchant: ${order.merchant_name}

Items:
${items}

Subtotal: ZWL ${order.subtotal?.toFixed(2) || '0.00'}
Delivery: ZWL ${order.delivery_fee?.toFixed(2) || '0.00'}
💰 *Total: ZWL ${order.total.toFixed(2)}*

Status: ${this.getStatusEmoji(order.status)} ${order.status}
Address: ${order.delivery_address || 'Pickup'}
    `.trim();
  }

  /**
   * Format cart display
   */
  static formatCart(cart) {
    if (!cart?.items || cart.items.length === 0) {
      return '🛒 Your cart is empty';
    }

    const items = cart.items.map(item =>
      `${item.quantity}x ${item.name} - ZWL ${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    return `
🛒 *Your Cart*
━━━━━━━━━━━━━━━
${items}

💰 *Total: ZWL ${cart.total.toFixed(2)}*

Type *!checkout* to place order
Type *!cart* to see details
Type *!clear* to empty cart
    `.trim();
  }

  /**
   * Format merchant profile
   */
  static formatMerchantProfile(merchant) {
    return `
*${merchant.business_name}*
━━━━━━━━━━━━━━━
👤 Owner: ${merchant.owner_name}
📞 Phone: ${merchant.phone}
📍 Location: ${merchant.town || 'N/A'}
🏷️ Category: ${merchant.category}

⏰ Hours: ${merchant.opening_time || '9:00'} - ${merchant.closing_time || '17:00'}
📦 Status: ${this.getStatusEmoji(merchant.status)} ${merchant.status}
🚚 Delivery: ${merchant.delivery_radius || 'N/A'} km radius

${merchant.description ? `📝 ${merchant.description}` : ''}

⭐ Rating: ${merchant.rating || 'N/A'} (${merchant.reviews || 0} reviews)
👥 Followers: ${merchant.followers || 0}
    `.trim();
  }

  /**
   * Format analytics
   */
  static formatAnalytics(analytics) {
    return `
*📊 Analytics*
━━━━━━━━━━━━━━━
Orders Today: ${analytics.orders_today || 0}
Revenue Today: ZWL ${analytics.revenue_today?.toFixed(2) || '0.00'}

Weekly Summary:
${analytics.weekly_orders || 0} orders
ZWL ${analytics.weekly_revenue?.toFixed(2) || '0.00'} revenue

Top Products:
${this.formatTopProducts(analytics.top_products)}

Peak Hours: ${analytics.peak_hours || 'N/A'}
Customer Repeat Rate: ${analytics.repeat_rate || '0'}%
    `.trim();
  }

  /**
   * Format command menu
   */
  static formatMenu(role = 'customer') {
    if (role === 'admin') {
      return `
👨‍💼 *ADMIN COMMANDS*
━━━━━━━━━━━━━━━

*/admin merchants pending* - View pending merchants
*/admin approve <id>* - Approve merchant
*/admin reject <id>* - Reject merchant
*/admin suspend <id>* - Suspend merchant
*/admin sales today* - Today's sales
*/admin logs errors* - Error logs
*/admin broadcast* - Send broadcast message
*/admin stats* - System statistics

Type *!help [command]* for more details
      `.trim();
    }

    if (role === 'merchant') {
      return `
🏪 *MERCHANT COMMANDS*
━━━━━━━━━━━━━━━

*/orders new* - View new orders
*/orders today* - Today's orders
*/products add* - Add new product
*/products list* - Your products
*/products edit <id>* - Edit product
*/store profile* - View store profile
*/store status open/closed* - Toggle store status
*/analytics today* - View analytics
*/help* - Get help

Type *!help [command]* for details
      `.trim();
    }

    // Customer menu
    return `
🛒 *CUSTOMER COMMANDS*
━━━━━━━━━━━━━━━

*!menu or !m* - Show merchant menu
*!search <item>* - Search products
*!add <id> <qty>* - Add to cart
*!cart or !c* - View cart
*!checkout* - Place order
*!status <order_id>* - Track order
*!orders* - Your orders
*!favorites* - Saved stores
*!help* - Get help

Example: \`!search noodles\`
Example: \`!add prod123 2\`
    `.trim();
  }

  /**
   * Format error message
   */
  static formatError(errorMessage, suggestion = '') {
    let msg = `❌ *Error*\n${errorMessage}`;
    if (suggestion) {
      msg += `\n\n💡 Try: ${suggestion}`;
    }
    return msg;
  }

  /**
   * Format success message
   */
  static formatSuccess(message) {
    return `✅ ${message}`;
  }

  /**
   * Get status emoji
   */
  static getStatusEmoji(status) {
    const emojis = {
      pending: '⏳',
      confirmed: '✅',
      preparing: '👨‍🍳',
      ready: '📦',
      out_for_delivery: '🚚',
      delivered: '✅',
      cancelled: '❌',
      approved: '✅',
      suspended: '⛔',
      rejected: '❌',
    };
    return emojis[status] || '❓';
  }

  /**
   * Format top products list
   */
  static formatTopProducts(products) {
    if (!products || products.length === 0) {
      return 'No data yet';
    }

    return products.slice(0, 3)
      .map((p, i) => `${i + 1}. ${p.name} (${p.sold || 0} sold)`)
      .join('\n');
  }

  /**
   * Truncate long text
   */
  static truncate(text, maxLength = 100) {
    if (text.length > maxLength) {
      return text.substring(0, maxLength - 3) + '...';
    }
    return text;
  }

  /**
   * Format currency
   */
  static formatCurrency(amount, currency = 'ZWL') {
    return `${currency} ${amount.toFixed(2)}`;
  }

  /**
   * Format date/time
   */
  static formatDateTime(date) {
    return new Date(date).toLocaleString();
  }
}

module.exports = MessageFormatter;
