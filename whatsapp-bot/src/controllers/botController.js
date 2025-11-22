/**
 * Main Bot Controller
 * Orchestrates message handling, routing to handlers, and response delivery
 */

const { getContentType } = require('@whiskeysockets/baileys');
const commandParser = require('../utils/commandParser');
const MessageFormatter = require('../utils/messageFormatter');
const authMiddleware = require('../middlewares/auth');
const rateLimiter = require('../middlewares/rateLimiter');
const connectionHandler = require('../middlewares/connectionHandler');
const cache = require('../database/cache');

const authHandler = require('../handlers/authHandler');
const adminHandler = require('../handlers/adminHandler');
const merchantHandler = require('../handlers/merchantHandler');
const customerHandler = require('../handlers/customerHandler');

const Logger = require('../config/logger');
const constants = require('../config/constants');

const logger = new Logger('BotController');

class BotController {
  /**
   * Main message handler
   */
  async handleMessage(message, sock) {
    try {
      // Validate message
      const validation = connectionHandler.validateMessage(message);
      if (!validation.valid) {
        logger.debug(`Message skipped: ${validation.reason}`);
        return;
      }

      // Extract message data
      const messageType = getContentType(message.message);
      if (messageType !== 'conversation' && messageType !== 'extendedTextMessage') {
        return;
      }

      const text = message.message.conversation || 
                   message.message.extendedTextMessage?.text || '';
      const from = message.key.remoteJid;
      const phoneNumber = from.replace('@s.whatsapp.net', '').replace('@g.us', '');
      const isGroup = from.includes('@g.us');

      logger.info(`Message from ${phoneNumber}${isGroup ? ' (GROUP)' : ''}: ${text.substring(0, 50)}`);

      // Check rate limits
      if (!await rateLimiter.checkMessageLimit(phoneNumber)) {
        await this.sendMessage(sock, from, 'You are sending messages too fast. Please slow down.');
        return;
      }

      // Process message
      await this.processMessage(text, from, phoneNumber, sock, isGroup);

    } catch (error) {
      logger.error('Message handling error', error);
      const errorType = connectionHandler.handleError(error, 'message_handler');
      if (errorType === 'rate_limited') {
        await connectionHandler.recoverFromError(errorType);
      }
    }
  }

  /**
   * Route message to appropriate handler
   */
  async processMessage(text, from, phoneNumber, sock, isGroup) {
    try {
      const trimmed = text.trim();

      // Empty or too short
      if (!trimmed || trimmed.length < 2) {
        logger.debug('Message too short');
        return;
      }

      logger.info(`📝 Processing: "${trimmed}"`);

      // Command-based routing
      if (commandParser.isCommand(trimmed)) {
        logger.info(`🎯 Command detected: "${trimmed}"`);
        return await this.handleCommand(trimmed, from, phoneNumber, sock);
      }

      // Natural language intent detection
      const intent = commandParser.detectIntent(trimmed);
      if (intent) {
        logger.info(`💡 Intent detected: ${intent}`);
        return await this.handleNaturalLanguage(trimmed, intent, from, phoneNumber, sock);
      }

      // No clear intent - ignore to avoid noise
      logger.debug(`No intent detected for: "${trimmed}"`);
    } catch (error) {
      logger.error('Message processing error', error);
      await this.sendMessage(sock, from, constants.MESSAGES.ERROR);
    }
  }

  /**
   * Handle commands (!command)
   */
  async handleCommand(text, from, phoneNumber, sock) {
    const parsed = commandParser.parseCommand(text);
    if (!parsed) {
      logger.warn(`Failed to parse command: "${text}"`);
      return;
    }

    const { command, args } = parsed;

    logger.info(`✅ Command: ${command}, Args: [${args.join(', ')}]`);

    try {
      // Check command rate limit
      if (!await rateLimiter.checkCommandLimit(phoneNumber, command)) {
        await this.sendMessage(sock, from, 
          MessageFormatter.formatError('You\'re using this command too frequently. Please wait a moment.')
        );
        return;
      }

      let result = null;

      // Route to appropriate handler
      // Auth/General commands (work for all)
      if (['register', 'login', 'logout', 'verify', 'profile', 'help', 'owner', 'about', 'feedback', 'stats'].includes(command)) {
        logger.info(`→ Routing to authHandler: ${command}`);
        try {
          result = await authHandler.handleAuthCommand(command, args, from, phoneNumber);
          logger.info(`← authHandler returned: ${result ? 'result' : 'null'}`);
        } catch (err) {
          logger.error(`authHandler error: ${err.message}`);
          result = { error: err.message };
        }
      }
      
      // Admin commands
      else if (['admin', 'merchants', 'approve', 'reject', 'suspend', 'sales', 'logs', 'broadcast', 'stats', 'alerts'].includes(command)) {
        logger.info(`→ Routing to adminHandler: ${command}`);
        // Check admin rights first
        try {
          await authMiddleware.requireAdmin(phoneNumber);
          result = await adminHandler.handleAdminCommand(command, args, from, phoneNumber);
          logger.info(`← adminHandler returned: ${result ? 'result' : 'null'}`);
        } catch (error) {
          logger.warn(`Admin check failed: ${error.message}`);
          result = { error: error.message };
        }
      }
      
      // Merchant commands
      else if (['merchant', 'orders', 'products', 'store', 'analytics', 'dashboard', 'add-product', 'edit-product', 
                'delete-product', 'accept', 'reject', 'update-status', 'store-status', 'store-hours', 
                'store-profile', 'settings', 'performance', 'customers', 'feedback', 'boost', 'tips'].includes(command)) {
        logger.info(`→ Routing to merchantHandler: ${command}`);
        try {
          await authMiddleware.requireMerchant(phoneNumber);
          result = await merchantHandler.handleMerchantCommand(command, args, from, phoneNumber);
          logger.info(`← merchantHandler returned: ${result ? 'result' : 'null'}`);
        } catch (error) {
          logger.warn(`Merchant check failed: ${error.message}`);
          result = { error: error.message };
        }
      }
      
      // Customer commands
      else if (['menu', 'm', 'search', 'categories', 'nearby', 'store', 'add', 'cart', 'c', 'remove',
                'clear', 'checkout', 'pay', 'orders', 'reorder', 'track', 'status', 'rate', 'favorites',
                'addresses', 'deals', 'trending', 'promo', 'featured'].includes(command)) {
        logger.info(`→ Routing to customerHandler: ${command}`);
        try {
          result = await customerHandler.handleCustomerCommand(command, args, from, phoneNumber);
          logger.info(`← customerHandler returned: ${result ? 'result' : 'null'}`);
        } catch (err) {
          logger.error(`customerHandler error: ${err.message}`);
          result = { error: err.message };
        }
      }
      
      // Unknown command
      else {
        logger.warn(`Unknown command: ${command}`);
        result = { error: constants.MESSAGES.UNKNOWN_COMMAND };
      }

      // Send result
      if (result) {
        logger.info(`✅ Result received: ${typeof result} with keys: ${Object.keys(result).join(', ')}`);
        await this.sendCommandResponse(sock, from, result);
      } else {
        logger.warn(`⚠️  No result returned from handler for command: ${command}`);
      }

    } catch (error) {
      logger.error('Command handler error', error);
      await this.sendMessage(sock, from, constants.MESSAGES.ERROR);
    }
  }

  /**
   * Handle natural language intent
   */
  async handleNaturalLanguage(text, intent, from, phoneNumber, sock) {
    logger.debug(`Natural language intent: ${intent}`);

    try {
      let response = null;

      switch (intent) {
        case 'greet':
          response = MessageFormatter.formatSuccess(`Hello! Type !help to see what I can do`);
          break;

        case 'help':
          response = MessageFormatter.formatMenu('customer');
          break;

        case 'browse':
          // Trigger menu command
          response = (await customerHandler.handleCustomerCommand('menu', [], from, phoneNumber)).message;
          break;

        case 'order':
          response = `What would you like to order?\n\n!search <item_name> to find products\nExample: !search pizza`;
          break;

        case 'add_to_cart':
          response = `To add items: !add <product_id> <quantity>\n\nFirst, find products with !menu or !search`;
          break;

        case 'checkout':
          response = (await customerHandler.handleCustomerCommand('checkout', [], from, phoneNumber)).message;
          break;

        case 'track':
          response = `To track order: !track <order_id>\n\nView orders with !orders`;
          break;

        case 'profile':
          response = (await authHandler.handleAuthCommand('profile', [], from, phoneNumber)).message;
          break;

        default:
          response = `I didn't understand that. Type !help for commands.`;
      }

      await this.sendMessage(sock, from, response);

    } catch (error) {
      logger.error('Natural language handling error', error);
      await this.sendMessage(sock, from, constants.MESSAGES.ERROR);
    }
  }

  /**
   * Send command response
   */
  async sendCommandResponse(sock, to, result) {
    logger.info(`📤 Sending response: ${JSON.stringify(result).substring(0, 100)}`);
    
    if (result.error) {
      logger.warn(`⚠️  Command error: ${result.error}`);
      await this.sendMessage(sock, to, MessageFormatter.formatError(result.error));
      return;
    }

    if (result.message) {
      logger.info(`✉️  Sending message response`);
      await this.sendMessage(sock, to, result.message);
    }

    if (result.notifyUser) {
      logger.info(`🔔 Notifying user: ${result.notifyUser.phone}`);
      const userPhone = `${result.notifyUser.phone}@s.whatsapp.net`;
      await this.sendMessage(sock, userPhone, result.notifyUser.message);
    }
  }

  /**
   * Send message to user
   */
  async sendMessage(sock, to, message, options = {}) {
    try {
      if (!message || !message.trim()) {
        logger.debug(`Message is empty, skipping`);
        return;
      }

      const msgOptions = {
        text: message,
        ...options,
      };

      logger.info(`📨 Sending to ${to}: ${message.substring(0, 50)}...`);
      await sock.sendMessage(to, msgOptions);
      logger.success(`✅ Message sent to ${to.split('@')[0]}`);

    } catch (error) {
      logger.error(`❌ Failed to send message to ${to}`, error);
      
      // Store for retry
      await cache.addToRetryQueue({
        type: 'message',
        to,
        message,
        options,
      });
    }
  }

  /**
   * Process retry queue for failed messages
   */
  async processRetryQueue(sock) {
    try {
      const queue = await cache.getRetryQueue();
      
      for (let i = queue.length - 1; i >= 0; i--) {
        const item = queue[i];
        
        // Skip if too many attempts
        if (item.attempts >= 3) {
          await cache.removeFromRetryQueue(i);
          continue;
        }

        // Try again
        try {
          if (item.type === 'message') {
            await this.sendMessage(sock, item.to, item.message, item.options);
            await cache.removeFromRetryQueue(i);
            logger.success(`Retry queue: Message successfully sent to ${item.to}`);
          }
        } catch (error) {
          item.attempts++;
          logger.warn(`Retry queue: Retry ${item.attempts} failed for ${item.to}`);
        }
      }
    } catch (error) {
      logger.error('Retry queue processing error', error);
    }
  }

  /**
   * Display help menu
   */
  displayHelp(role = 'customer') {
    return MessageFormatter.formatMenu(role);
  }
}

module.exports = new BotController();
