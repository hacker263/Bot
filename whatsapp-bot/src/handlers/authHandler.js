/**
 * Authentication & General Commands Handler
 * Handles register, login, help, profile
 */

const backendAPI = require('../api/backendAPI');
const authMiddleware = require('../middlewares/auth');
const cache = require('../database/cache');
const MessageFormatter = require('../utils/messageFormatter');
const commandParser = require('../utils/commandParser');
const Logger = require('../config/logger');
const constants = require('../config/constants');

const logger = new Logger('AuthHandler');

class AuthHandler {
  /**
   * Handle general/auth commands
   */
  async handleAuthCommand(command, args, from, phoneNumber) {
    try {
      // Add to command history
      await cache.addCommandHistory(phoneNumber, command);

      switch (command) {
        case 'register':
          return await this.handleRegisterCommand(args, from, phoneNumber);
        
        case 'login':
          return await this.handleLoginCommand(args, from, phoneNumber);
        
        case 'logout':
          return await this.handleLogoutCommand(from, phoneNumber);
        
        case 'profile':
          return await this.handleProfileCommand(from, phoneNumber);
        
        case 'help':
          return await this.handleHelpCommand(args, from, phoneNumber);
        
        case 'verify':
          return await this.handleVerifyCommand(args, from, phoneNumber);
        
        default:
          return null;
      }
    } catch (error) {
      logger.error('Auth command error', error);
      return { error: error.message };
    }
  }

  /**
   * !register [name] [role]
   * Example: !register John customer
   */
  async handleRegisterCommand(args, from, phoneNumber) {
    // Check if already registered
    const existing = await cache.getUserSession(phoneNumber);
    if (existing) {
      return { error: 'You are already registered. Type !login to continue.' };
    }

    if (!args[0]) {
      return {
        message: `*📝 Welcome! Let's register*\n━━━━━━━━━━━━━━━\n\nWhat's your name?`,
        flowActive: true,
      };
    }

    const name = args.slice(0, -1).join(' ') || args[0];
    const role = args[args.length - 1].toLowerCase() || 'customer';

    if (!['customer', 'merchant'].includes(role)) {
      return { error: 'Invalid role. Choose: customer or merchant' };
    }

    // Send registration request to backend
    const response = await backendAPI.registerUser(phoneNumber, name, role);

    if (!response.success) {
      return { error: `Registration failed: ${response.error}` };
    }

    const user = response.data;

    // Save session
    await cache.setUserSession(phoneNumber, {
      ...user,
      registered_at: new Date().toISOString(),
    });

    let message = `✅ *Welcome ${name}!*\n\n`;
    
    if (role === 'merchant') {
      message += `Your merchant account is pending approval.\n\n`;
      message += `Next Steps:\n`;
      message += `1. Wait for admin review\n`;
      message += `2. You'll be notified when approved\n`;
      message += `3. Then you can add products\n\n`;
      message += `OTP sent to your phone for verification.`;
    } else {
      message += `You're ready to start shopping!\n\n`;
      message += `Try:\n`;
      message += `!menu - Browse products\n`;
      message += `!search pizza - Search items\n`;
      message += `!help - See all commands`;
    }

    return { message };
  }

  /**
   * !login
   */
  async handleLoginCommand(args, from, phoneNumber) {
    const existing = await cache.getUserSession(phoneNumber);
    if (existing?.authenticated) {
      return { message: `Welcome back ${existing.name}! You're already logged in.` };
    }

    // Send OTP
    const response = await backendAPI.sendOTP(phoneNumber);

    if (!response.success) {
      return { error: 'Failed to send OTP. Please try again.' };
    }

    // Store login flow state
    await cache.setUserSession(phoneNumber, {
      loginFlow: true,
      sentAt: new Date().toISOString(),
    });

    return {
      message: `📱 *OTP Sent*\n\nCheck your WhatsApp for the verification code.\nReply with: !verify <code>`,
      flowActive: true,
    };
  }

  /**
   * !verify <otp_code>
   */
  async handleVerifyCommand(args, from, phoneNumber) {
    if (!args[0]) {
      return { error: 'Usage: !verify <otp_code>' };
    }

    const otp = args[0];

    // Verify with backend
    const response = await backendAPI.loginUser(phoneNumber, otp);

    if (!response.success) {
      return { error: 'Invalid OTP. Please try again or request a new one.' };
    }

    const user = response.data;

    // Save authenticated session
    await cache.setUserSession(phoneNumber, {
      ...user,
      authenticated: true,
      authenticatedAt: new Date().toISOString(),
    });

    logger.success(`User authenticated: ${phoneNumber}`);

    let message = `✅ *Login Successful*\n\n`;
    message += `Welcome ${user.name}!\n\n`;
    message += `Role: ${user.role === 'admin' ? '👨‍💼 Admin' : user.role === 'merchant' ? '🏪 Merchant' : '🛍️ Customer'}\n\n`;

    if (user.role === 'admin') {
      message += `Type *!help* to see admin commands`;
    } else if (user.role === 'merchant') {
      message += `Type *!help* to see merchant commands`;
    } else {
      message += `Type *!help* to see customer commands`;
    }

    return { message };
  }

  /**
   * !logout
   */
  async handleLogoutCommand(from, phoneNumber) {
    await cache.setUserSession(phoneNumber, { authenticated: false });
    return { message: '✅ Logged out successfully!' };
  }

  /**
   * !profile
   */
  async handleProfileCommand(from, phoneNumber) {
    const session = await cache.getUserSession(phoneNumber);

    if (!session?.authenticated) {
      return { message: 'Please login first with !login' };
    }

    let message = `*👤 Your Profile*\n━━━━━━━━━━━━━━━\n\n`;
    message += `Name: ${session.name}\n`;
    message += `Phone: ${phoneNumber}\n`;
    message += `Role: ${session.role}\n`;
    message += `Status: ${session.status || 'Active'}\n`;

    if (session.role === 'merchant') {
      message += `\nBusiness: ${session.business_name || 'N/A'}\n`;
      message += `Category: ${session.category || 'N/A'}\n`;
      message += `Approval: ${session.approval_status || 'Pending'}\n`;
    }

    message += `\nJoined: ${new Date(session.authenticated_at).toLocaleDateString()}\n`;

    return { message };
  }

  /**
   * !help [command]
   */
  async handleHelpCommand(args, from, phoneNumber) {
    const session = await cache.getUserSession(phoneNumber);
    const role = session?.role || 'customer';

    if (args[0]) {
      return { message: this.getCommandHelp(args[0]) };
    }

    // Show role-based menu
    return { message: MessageFormatter.formatMenu(role) };
  }

  /**
   * Get detailed help for specific command
   */
  getCommandHelp(command) {
    const helps = {
      register: `
*!register*
Sign up as a customer or merchant

Usage: !register [name] [role]
Example: !register John customer

Roles: customer, merchant
      `.trim(),

      login: `
*!login*
Log in to your account

Usage: !login
You'll receive an OTP code to verify
      `.trim(),

      menu: `
*!menu*
Browse all available products

Usage: !menu or !m
Shows product list with prices
      `.trim(),

      search: `
*!search*
Find products by name

Usage: !search <query>
Example: !search pizza
      `.trim(),

      add: `
*!add*
Add items to your shopping cart

Usage: !add <product_id> <quantity>
Example: !add prod123 2
      `.trim(),

      cart: `
*!cart*
View your shopping cart

Usage: !cart or !c
Shows items, prices, and total
      `.trim(),

      checkout: `
*!checkout*
Place your order

Usage: !checkout or !pay
Submits your cart as an order
      `.trim(),

      track: `
*!track*
Track your order status

Usage: !track <order_id>
Shows current order status
      `.trim(),
    };

    return helps[command] || `❌ Command not found: ${command}`;
  }
}

module.exports = new AuthHandler();
