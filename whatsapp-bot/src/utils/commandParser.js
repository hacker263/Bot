/**
 * Command Parser Utility
 * Parses user messages into commands and natural language intents
 */

const constants = require('../config/constants');

class CommandParser {
  constructor() {
    this.prefix = constants.BOT_PREFIX;
    this.commandRegex = new RegExp(`^${this.escapeRegex(this.prefix)}(\\w+)(?:\\s+(.*))?$`, 'i');
    this.intentPatterns = [
      { regex: /i want|i\'d like|can i get|order|buy|give me|get me/i, intent: 'order' },
      { regex: /show|list|menu|what\'s|what do you|products|see|view|browse/i, intent: 'browse' },
      { regex: /add|put|include|cart/i, intent: 'add_to_cart' },
      { regex: /remove|delete|take out/i, intent: 'remove_from_cart' },
      { regex: /checkout|pay|payment|confirm|place order|proceed/i, intent: 'checkout' },
      { regex: /track|status|where is|when|delivery|where's/i, intent: 'track' },
      { regex: /hello|hi|hey|greetings|start|welcome/i, intent: 'greet' },
      { regex: /help|commands|what can|assistance|how to/i, intent: 'help' },
      { regex: /my profile|account|settings|preferences|my info/i, intent: 'profile' },
    ];
  }

  /**
   * Check if text is a command
   */
  isCommand(text) {
    return text.trim().startsWith(this.prefix);
  }

  /**
   * Parse command: returns { command, args } or null
   */
  parseCommand(text) {
    const trimmed = text.trim();
    const match = trimmed.match(this.commandRegex);

    if (!match) return null;

    return {
      command: match[1].toLowerCase(),
      args: match[2]?.split(/\s+/).filter(Boolean) || [],
      rawArgs: match[2] || '',
    };
  }

  /**
   * Detect natural language intent
   */
  detectIntent(text) {
    for (const pattern of this.intentPatterns) {
      if (pattern.regex.test(text)) {
        return pattern.intent;
      }
    }
    return null;
  }

  /**
   * Extract entities from message (phone, price, quantity, etc.)
   */
  extractEntities(text) {
    const entities = {};

    // Phone number
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/);
    if (phoneMatch) {
      entities.phone = phoneMatch[0].replace(/\D/g, '');
    }

    // Price/Amount
    const priceMatch = text.match(/(?:ZWL|USD|R)?[\s]?(\d+(?:[.,]\d{2})?)/);
    if (priceMatch) {
      entities.amount = parseFloat(priceMatch[1].replace(',', '.'));
    }

    // Quantity
    const qtyMatch = text.match(/(\d+)(?:\s*x|times|of|quantity)?/);
    if (qtyMatch) {
      entities.quantity = parseInt(qtyMatch[1]);
    }

    // Email
    const emailMatch = text.match(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/);
    if (emailMatch) {
      entities.email = emailMatch[0];
    }

    return entities;
  }

  /**
   * Parse time expressions (e.g., "tomorrow", "next week")
   */
  parseTimeExpression(text) {
    const now = new Date();
    const times = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      tomorrow: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      yesterday: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      'this week': new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000),
      'last week': new Date(now.getTime() - (now.getDay() + 7) * 24 * 60 * 60 * 1000),
      'this month': new Date(now.getFullYear(), now.getMonth(), 1),
      'last month': new Date(now.getFullYear(), now.getMonth() - 1, 1),
    };

    for (const [key, date] of Object.entries(times)) {
      if (text.toLowerCase().includes(key)) {
        return date;
      }
    }

    return null;
  }

  /**
   * Validate command arguments
   */
  validateArgs(command, args, minArgs = 0, maxArgs = null) {
    if (args.length < minArgs) {
      return { valid: false, error: `Not enough arguments for ${command}` };
    }

    if (maxArgs && args.length > maxArgs) {
      return { valid: false, error: `Too many arguments for ${command}` };
    }

    return { valid: true };
  }

  /**
   * Helper: Escape regex special characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get all available commands for a role
   */
  getAvailableCommands(role = 'customer') {
    const commands = {
      admin: [
        'merchants', 'approve', 'reject', 'suspend', 'sales', 'logs', 'broadcast', 'stats',
      ],
      merchant: [
        'orders', 'products', 'store', 'analytics', 'dashboard', 'notifications',
      ],
      customer: [
        'menu', 'search', 'add', 'cart', 'remove', 'clear', 'checkout', 'status', 
        'orders', 'profile', 'favorites', 'help',
      ],
      global: ['help', 'register', 'login', 'logout', 'profile'],
    };

    const roleCommands = commands[role] || [];
    return [...roleCommands, ...commands.global];
  }
}

module.exports = new CommandParser();
