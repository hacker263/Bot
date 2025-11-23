/**
 * Authentication & General Commands Handler
 * Handles register, login, help, profile
 */

const backendAPI = require('../api/backendAPI');
const authMiddleware = require('../middlewares/auth');
const cache = require('../database/cache');
const databaseService = require('../database/service');
const MessageFormatter = require('../utils/messageFormatter');
const InteractiveMessageBuilder = require('../utils/interactiveMessageBuilder');
const FlowManager = require('../utils/flowManager');
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
        
        case 'owner':
          return await this.handleOwnerCommand(from, phoneNumber);
        
        case 'about':
          return await this.handleAboutCommand(from, phoneNumber);
        
        case 'feedback':
          return await this.handleFeedbackCommand(args.join(' '), from, phoneNumber);
        
        case 'stats':
          return await this.handleStatsCommand(from, phoneNumber);
        
        default:
          return null;
      }
    } catch (error) {
      logger.error('Auth command error', error);
      return { error: error.message };
    }
  }

  /**
   * !register - Start registration flow with API sync
   */
  async handleRegisterCommand(args, from, phoneNumber) {
    try {
      // Check if user already exists via API
      const existingUser = await backendAPI.getUser(phoneNumber);
      if (existingUser.success && existingUser.data) {
        return InteractiveMessageBuilder.createSuccessCard(
          'Already Registered',
          'You\'re already registered! Type !login to continue.'
        );
      }

      // Get user name from args or prompt
      const name = args[0] ? args.join(' ') : null;

      if (name) {
        // Register with API
        const registerRes = await backendAPI.registerUser(phoneNumber, name, 'customer', '');
        
        if (registerRes.success) {
          // Cache the session
          await cache.setUserSession(phoneNumber, {
            authenticated: false,
            name: name,
            created_at: new Date(),
          });

          logger.info(`User registered via API: ${phoneNumber}`);

          return InteractiveMessageBuilder.buttonMessage(
            '👋 Welcome to Smart Bot',
            `Great ${name}! Let's set up your account.`,
            [
              { id: 'register_customer', text: '🛍️ As Customer' },
              { id: 'register_merchant', text: '🏪 As Merchant' }
            ]
          );
        } else {
          return InteractiveMessageBuilder.createErrorCard('Registration Failed', [registerRes.error]);
        }
      }

      // Prompt for name or show role selector
      return InteractiveMessageBuilder.buttonMessage(
        '👋 Welcome to Smart Bot',
        'What would you like to do?',
        [
          { id: 'register_customer', text: '🛍️ As Customer' },
          { id: 'register_merchant', text: '🏪 As Merchant' }
        ]
      );
    } catch (error) {
      logger.error('Registration error', error);
      return InteractiveMessageBuilder.createErrorCard('Registration Failed', [error.message]);
    }
  }

  /**
   * !login - Start login flow with API sync
   */
  async handleLoginCommand(args, from, phoneNumber) {
    try {
      // Check API for user
      const userResult = await backendAPI.getUser(phoneNumber);
      
      if (!userResult.success || !userResult.data) {
        return InteractiveMessageBuilder.createErrorCard(
          'User Not Found',
          ['Please register first using !register']
        );
      }

      const user = userResult.data;
      const existing = await cache.getUserSession(phoneNumber);
      
      if (existing?.authenticated) {
        return InteractiveMessageBuilder.createSuccessCard(
          'Already Logged In',
          `Welcome back ${user.name}!`
        );
      }

      // Cache session
      await cache.setUserSession(phoneNumber, {
        authenticated: true,
        name: user.name,
        role: user.role || 'customer',
        loginTime: new Date(),
      });

      logger.info(`User logged in: ${phoneNumber}`);

      return InteractiveMessageBuilder.createSuccessCard(
        `Welcome ${user.name}!`,
        'You\'re now logged in. Type !help to see available commands.'
      );
    } catch (error) {
      logger.error('Login error', error);
      return InteractiveMessageBuilder.createErrorCard('Login Failed', [error.message]);
    }
  }

  /**
   * !verify <otp_code>
   */
  async handleVerifyCommand(args, from, phoneNumber) {
    if (!args[0]) {
      return InteractiveMessageBuilder.createErrorCard(
        'OTP required',
        ['Usage: !verify <otp_code>', 'Check your SMS for the code']
      );
    }

    const otp = args[0];
    const response = await backendAPI.loginUser(phoneNumber, otp);

    if (!response.success) {
      return InteractiveMessageBuilder.createErrorCard(
        'Invalid OTP',
        ['Try again', 'Request new OTP']
      );
    }

    const user = response.data;
    await cache.setUserSession(phoneNumber, {
      ...user,
      authenticated: true,
      authenticatedAt: new Date().toISOString(),
    });

    logger.success(`User authenticated: ${phoneNumber}`);

    const roleEmoji = user.role === 'admin' ? '👨‍💼' : user.role === 'merchant' ? '🏪' : '🛍️';
    const nextActions = user.role === 'admin' 
      ? [{ text: '📊 Stats', id: 'admin_stats' }]
      : user.role === 'merchant'
      ? [{ text: '📦 Orders', id: 'merchant_orders' }]
      : [{ text: '🛒 Menu', id: 'customer_menu' }];

    return InteractiveMessageBuilder.createSuccessCard(
      'Login Successful',
      `Welcome ${user.name}!\nRole: ${roleEmoji} ${user.role}`,
      nextActions
    );
  }

  /**
   * !logout
   */
  async handleLogoutCommand(from, phoneNumber) {
    await cache.setUserSession(phoneNumber, { authenticated: false });
    return InteractiveMessageBuilder.createSuccessCard(
      'Logged Out',
      'You have been successfully logged out',
      [{ text: '🔑 Login Again', id: 'login' }]
    );
  }

  /**
   * !profile
   */
  async handleProfileCommand(from, phoneNumber) {
    const session = await cache.getUserSession(phoneNumber);

    if (!session?.authenticated) {
      return { message: 'Please login first with !login' };
    }

    const profileItems = [
      { emoji: '👤', label: 'Name', value: session.name },
      { emoji: '📱', label: 'Phone', value: phoneNumber },
      { emoji: '🎭', label: 'Role', value: session.role },
      { emoji: '✅', label: 'Status', value: session.status || 'Active' }
    ];

    if (session.role === 'merchant') {
      profileItems.push(
        { emoji: '🏪', label: 'Business', value: session.business_name || 'N/A' },
        { emoji: '📂', label: 'Category', value: session.category || 'N/A' },
        { emoji: '📋', label: 'Approval', value: session.approval_status || 'Pending' }
      );
    }

    return InteractiveMessageBuilder.createStatusCard(
      '👤 YOUR PROFILE',
      profileItems,
      [
        { text: '✏️ Edit', id: 'edit_profile' },
        { text: '📋 Menu', id: 'menu' }
      ]
    );
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

      owner: `
*!owner*
Get contact information of the bot owner

Usage: !owner
Displays owner contact and details
      `.trim(),

      about: `
*!about*
Learn about Smart WhatsApp Bot

Usage: !about
Shows platform information and features
      `.trim(),

      feedback: `
*!feedback*
Send feedback or report issues

Usage: !feedback <your message>
Example: !feedback The app is amazing!
      `.trim(),

      stats: `
*!stats*
View platform statistics

Usage: !stats
Shows user count, orders, revenue, etc.
      `.trim(),
    };

    return helps[command] || `❌ Command not found: ${command}`;
  }

  /**
   * !owner - Bot owner contact (with save and direct contact options)
   */
  async handleOwnerCommand(from, phoneNumber) {
    const ownerInfo = {
      name: 'Hacker263',
      phone: '+263781564004',
      role: 'Developer & Founder',
      org: 'Smart WhatsApp Bot',
      email: 'hacker263@smartbot.dev',
      website: 'www.smartbot.dev',
      services: ['WhatsApp Bot Development', 'E-commerce Solutions', 'Custom Integration'],
      availability: '24/7',
      bio: 'Passionate developer creating innovative WhatsApp solutions'
    };

    // Build detailed owner info message
    let ownerBody = `*👨‍💼 ${ownerInfo.name}*\n━━━━━━━━━━━━━━━\n\n`;
    ownerBody += `🎭 *Role:* ${ownerInfo.role}\n`;
    ownerBody += `🏢 *Organization:* ${ownerInfo.org}\n`;
    ownerBody += `📱 *WhatsApp:* ${ownerInfo.phone}\n`;
    ownerBody += `📧 *Email:* ${ownerInfo.email}\n`;
    ownerBody += `🌐 *Website:* ${ownerInfo.website}\n`;
    ownerBody += `⏰ *Available:* ${ownerInfo.availability}\n\n`;
    ownerBody += `💼 *Services:*\n`;
    ownerInfo.services.forEach(service => {
      ownerBody += `  ✓ ${service}\n`;
    });
    ownerBody += `\n📝 *Bio:* ${ownerInfo.bio}`;

    // Save owner info to user's local cache for quick access
    await cache.setOwnerContact(phoneNumber, ownerInfo);

    return InteractiveMessageBuilder.templateButtonMessage(
      ownerBody,
      [
        { id: 'contact_save', text: '💾 Save Contact', label: 'Save' },
        { id: 'contact_whatsapp', text: '💬 Message', label: 'Chat' },
        { id: 'contact_call', text: '☎️ Call', label: 'Call' }
      ],
      '━━━━━━━━━━━━━━━━━━━━━━━'
    );
  }

  /**
   * !about - Platform info
   */
  async handleAboutCommand(from, phoneNumber) {
    return InteractiveMessageBuilder.createStatusCard(
      'ℹ️ ABOUT SMART BOT',
      [
        { emoji: '🚀', label: 'What', value: 'E-commerce on WhatsApp' },
        { emoji: '👥', label: 'Users', value: 'Customers, Merchants, Admins' },
        { emoji: '🌍', label: 'Region', value: 'Zimbabwe & Beyond' },
        { emoji: '⭐', label: 'Rating', value: '4.8/5.0' }
      ],
      [
        { text: '🛍️ Start Shopping', id: 'menu' },
        { text: '📱 Contact', id: 'owner' }
      ]
    );
  }

  /**
   * !feedback - Get feedback
   */
  async handleFeedbackCommand(message, from, phoneNumber) {
    if (!message) {
      return InteractiveMessageBuilder.buttonMessage(
        '💬 Send Feedback',
        'Tell us what you think about Smart Bot',
        [
          { id: 'feedback_positive', text: '👍 I Love It' },
          { id: 'feedback_issue', text: '⚠️ Found an Issue' },
          { id: 'feedback_suggestion', text: '💡 Suggestion' }
        ]
      );
    }

    await cache.addCommandHistory(phoneNumber, `feedback: ${message}`);

    return InteractiveMessageBuilder.createSuccessCard(
      'Feedback Received',
      `Thanks for your feedback: "${message}"`,
      [{ text: '📋 Menu', id: 'menu' }]
    );
  }

  /**
   * !stats - Platform stats
   */
  async handleStatsCommand(from, phoneNumber) {
    const stats = {
      totalUsers: 2543,
      totalMerchants: 187,
      totalOrders: 8934,
      totalRevenue: 245600,
      avgOrderValue: 27.5,
      activeNow: 342,
      avgRating: 4.8,
    };

    const statsItems = [
      { emoji: '👥', label: 'Total Users', value: stats.totalUsers.toLocaleString() },
      { emoji: '🏪', label: 'Merchants', value: stats.totalMerchants },
      { emoji: '📦', label: 'Orders', value: stats.totalOrders.toLocaleString() },
      { emoji: '💰', label: 'Revenue', value: `ZWL ${stats.totalRevenue.toLocaleString()}` },
      { emoji: '⭐', label: 'Rating', value: `${stats.avgRating}/5.0` },
      { emoji: '🟢', label: 'Active Now', value: stats.activeNow }
    ];

    return InteractiveMessageBuilder.createStatusCard(
      '📊 PLATFORM STATS',
      statsItems,
      [
        { text: '🛒 Shop Now', id: 'menu' },
        { text: '📱 Contact', id: 'owner' }
      ]
    );
  }
}

module.exports = new AuthHandler();
