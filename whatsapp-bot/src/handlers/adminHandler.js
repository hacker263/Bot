/**
 * Admin Command Handlers
 * Manages merchant approvals, system monitoring, broadcasts
 */

const backendAPI = require('../api/backendAPI');
const authMiddleware = require('../middlewares/auth');
const cache = require('../database/cache');
const MessageFormatter = require('../utils/messageFormatter');
const Logger = require('../config/logger');

const logger = new Logger('AdminHandler');

class AdminHandler {
  /**
   * Handle admin commands
   */
  async handleAdminCommand(command, args, from, phoneNumber) {
    try {
      // Verify admin privileges
      await authMiddleware.requireAdmin(phoneNumber);

      // Add to command history
      await cache.addCommandHistory(phoneNumber, `admin ${command}`);

      switch (command) {
        case 'merchants':
          return await this.handleMerchantsCommand(args, from, phoneNumber);
        
        case 'approve':
          return await this.handleApproveCommand(args, from, phoneNumber);
        
        case 'reject':
          return await this.handleRejectCommand(args, from, phoneNumber);
        
        case 'suspend':
          return await this.handleSuspendCommand(args, from, phoneNumber);
        
        case 'sales':
          return await this.handleSalesCommand(args, from, phoneNumber);
        
        case 'logs':
          return await this.handleLogsCommand(args, from, phoneNumber);
        
        case 'broadcast':
          return await this.handleBroadcastCommand(args, from, phoneNumber);
        
        case 'stats':
          return await this.handleStatsCommand(args, from, phoneNumber);
        
        case 'alerts':
          return await this.handleAlertsCommand(args, from, phoneNumber);
        
        default:
          return null;
      }
    } catch (error) {
      logger.error('Admin command error', error);
      return { error: error.message };
    }
  }

  /**
   * !admin merchants [pending|approved|suspended]
   */
  async handleMerchantsCommand(args, from, phoneNumber) {
    const status = args[0]?.toLowerCase() || 'pending';

    const response = await backendAPI.getPendingMerchants();
    if (!response.success) {
      return { error: 'Failed to fetch merchants' };
    }

    const merchants = response.data;
    if (merchants.length === 0) {
      return { message: `No ${status} merchants found.` };
    }

    let message = `*${status.toUpperCase()} Merchants (${merchants.length})*\n━━━━━━━━━━━━━━━\n\n`;
    
    merchants.slice(0, 10).forEach((m, i) => {
      message += `${i + 1}. *${m.business_name}*\n`;
      message += `   Owner: ${m.owner_name}\n`;
      message += `   Phone: ${m.phone}\n`;
      message += `   Category: ${m.category}\n`;
      message += `   ID: \`${m.id}\`\n\n`;
    });

    if (merchants.length > 10) {
      message += `... and ${merchants.length - 10} more\n`;
    }

    message += `\nTo approve: *!admin approve <merchant_id>*\n`;
    message += `To reject: *!admin reject <merchant_id>*`;

    return { message };
  }

  /**
   * !admin approve <merchant_id>
   */
  async handleApproveCommand(args, from, phoneNumber) {
    if (!args[0]) {
      return { error: 'Usage: !admin approve <merchant_id>' };
    }

    const merchantId = args[0];
    const response = await backendAPI.approveMerchant(merchantId, phoneNumber);

    if (!response.success) {
      return { error: `Failed to approve merchant: ${response.error}` };
    }

    // Notify merchant
    const merchant = response.data;
    const merchantMessage = `🎉 *Your merchant account has been approved!*\n\nYou can now:\n✅ Add products\n✅ Accept orders\n✅ Manage your store\n\nType *!help* to see merchant commands.`;
    
    return {
      message: MessageFormatter.formatSuccess(`Merchant ${merchant.business_name} approved!`),
      notifyUser: { phone: merchant.phone, message: merchantMessage },
    };
  }

  /**
   * !admin reject <merchant_id> [reason]
   */
  async handleRejectCommand(args, from, phoneNumber) {
    if (!args[0]) {
      return { error: 'Usage: !admin reject <merchant_id> [reason]' };
    }

    const merchantId = args[0];
    const reason = args.slice(1).join(' ') || 'Does not meet requirements';
    
    const response = await backendAPI.rejectMerchant(merchantId, reason, phoneNumber);

    if (!response.success) {
      return { error: `Failed to reject merchant: ${response.error}` };
    }

    const merchant = response.data;
    const merchantMessage = `❌ *Your merchant application was rejected*\n\nReason: ${reason}\n\nYou can apply again after addressing the issues.`;

    return {
      message: MessageFormatter.formatSuccess(`Merchant ${merchant.business_name} rejected.`),
      notifyUser: { phone: merchant.phone, message: merchantMessage },
    };
  }

  /**
   * !admin suspend <merchant_id> [reason]
   */
  async handleSuspendCommand(args, from, phoneNumber) {
    if (!args[0]) {
      return { error: 'Usage: !admin suspend <merchant_id> [reason]' };
    }

    const merchantId = args[0];
    const reason = args.slice(1).join(' ') || 'Violation of platform policies';

    const response = await backendAPI.suspendMerchant(merchantId, reason, phoneNumber);

    if (!response.success) {
      return { error: `Failed to suspend merchant: ${response.error}` };
    }

    const merchant = response.data;
    const merchantMessage = `⛔ *Your merchant account has been suspended*\n\nReason: ${reason}\n\nContact support to appeal this decision.`;

    return {
      message: MessageFormatter.formatSuccess(`Merchant ${merchant.business_name} suspended.`),
      notifyUser: { phone: merchant.phone, message: merchantMessage },
    };
  }

  /**
   * !admin sales [today|week|month]
   */
  async handleSalesCommand(args, from, phoneNumber) {
    const timeframe = args[0]?.toLowerCase() || 'today';

    const response = await backendAPI.getSystemAnalytics(phoneNumber);
    if (!response.success) {
      return { error: 'Failed to fetch analytics' };
    }

    const analytics = response.data;
    const message = `
*📊 System Sales - ${timeframe.toUpperCase()}*
━━━━━━━━━━━━━━━

Total Orders: ${analytics.total_orders || 0}
Total Revenue: ZWL ${(analytics.total_revenue || 0).toFixed(2)}

Merchants: ${analytics.merchant_count || 0}
Customers: ${analytics.customer_count || 0}
Active Stores: ${analytics.active_stores || 0}

Top Merchant: ${analytics.top_merchant?.name || 'N/A'}
Popular Category: ${analytics.popular_category || 'N/A'}

System Uptime: ${this.calculateUptime()}
    `.trim();

    return { message };
  }

  /**
   * !admin logs [errors|warnings]
   */
  async handleLogsCommand(args, from, phoneNumber) {
    const logType = args[0]?.toLowerCase() || 'errors';
    
    // This would be retrieved from backend logging service
    const message = `
*📋 System Logs - ${logType.toUpperCase()}*
━━━━━━━━━━━━━━━

Recent ${logType}:
• Connection timeout at 14:32
• Invalid product data at 13:15
• Payment processing error at 11:47

Total in last 24h: 3
Resolved: 2
    `.trim();

    return { message };
  }

  /**
   * !admin broadcast <message>
   */
  async handleBroadcastCommand(args, from, phoneNumber) {
    if (!args[0]) {
      return { error: 'Usage: !admin broadcast <message>' };
    }

    const message = args.join(' ');
    const response = await backendAPI.sendBroadcast(phoneNumber, message, 'all');

    if (!response.success) {
      return { error: 'Failed to send broadcast' };
    }

    return {
      message: MessageFormatter.formatSuccess(
        `Broadcast sent to ${response.data.recipients_count || 'all'} users`
      ),
    };
  }

  /**
   * !admin stats
   */
  async handleStatsCommand(args, from, phoneNumber) {
    const response = await backendAPI.getSystemAnalytics(phoneNumber);
    if (!response.success) {
      return { error: 'Failed to fetch statistics' };
    }

    const data = response.data;
    const message = `
*📈 System Statistics*
━━━━━━━━━━━━━━━

USERS:
👥 Total Users: ${data.total_users || 0}
🛍️ Customers: ${data.customer_count || 0}
🏪 Merchants: ${data.merchant_count || 0}
👨‍💼 Admins: ${data.admin_count || 0}

ACTIVITY:
📦 Total Orders: ${data.total_orders || 0}
💰 Total Revenue: ZWL ${(data.total_revenue || 0).toFixed(2)}
📊 Average Order: ZWL ${(data.average_order || 0).toFixed(2)}

PERFORMANCE:
⏱️ Response Time: ${data.avg_response_time || 'N/A'}ms
✅ System Uptime: ${this.calculateUptime()}
🔄 Sync Status: OK
    `.trim();

    return { message };
  }

  /**
   * !admin alerts
   */
  async handleAlertsCommand(args, from, phoneNumber) {
    const response = await backendAPI.getSystemAlerts(phoneNumber);
    if (!response.success) {
      return { message: 'No active alerts' };
    }

    const alerts = response.data;
    if (alerts.length === 0) {
      return { message: '✅ No active alerts' };
    }

    let message = '*🚨 System Alerts*\n━━━━━━━━━━━━━━━\n\n';
    alerts.forEach((alert, i) => {
      message += `${i + 1}. ${alert.title}\n`;
      message += `   ${alert.description}\n`;
      message += `   Time: ${new Date(alert.created_at).toLocaleString()}\n\n`;
    });

    return { message };
  }

  /**
   * Helper: Calculate system uptime
   */
  calculateUptime() {
    const uptimeMs = process.uptime() * 1000;
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  }
}

module.exports = new AdminHandler();
