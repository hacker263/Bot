/**
 * Connection & Error Handling Middleware
 * Manages bot connection, reconnection, and error recovery
 */

const { DisconnectReason } = require('@whiskeysockets/baileys');
const Logger = require('../config/logger');

const logger = new Logger('ConnectionHandler');

class ConnectionMiddleware {
  constructor() {
    this.connectionAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // ms
    this.isConnected = false;
  }

  /**
   * Handle connection updates
   */
  handleConnectionUpdate(update, startBotFunction) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('QR Code generated - scan with WhatsApp');
      this.connectionAttempts = 0;
    }

    if (connection === 'open') {
      this.isConnected = true;
      this.connectionAttempts = 0;
      logger.success('✅ Bot connected!');
    }

    if (connection === 'close') {
      this.isConnected = false;
      const shouldReconnect = 
        (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect && this.connectionAttempts < this.maxReconnectAttempts) {
        this.connectionAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.connectionAttempts - 1);
        
        logger.warn(
          `Connection lost. Reconnecting... (Attempt ${this.connectionAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
        );

        setTimeout(startBotFunction, delay);
      } else if (this.connectionAttempts >= this.maxReconnectAttempts) {
        logger.error('Max reconnection attempts reached. Manual restart required.');
      } else {
        logger.info('Logged out - new login required');
      }
    }
  }

  /**
   * Handle errors gracefully
   */
  handleError(error, context = '') {
    logger.error(`Error in ${context}:`, error);

    if (error.response?.status === 429) {
      logger.warn('Rate limited by WhatsApp - implementing backoff');
      return 'rate_limited';
    }

    if (error.code === 'ECONNREFUSED') {
      logger.error('Cannot connect to WhatsApp servers');
      return 'connection_refused';
    }

    if (error.message.includes('socket hang up')) {
      logger.warn('Socket hang up - will auto-reconnect');
      return 'socket_hang_up';
    }

    return 'unknown_error';
  }

  /**
   * Validate message before processing
   */
  validateMessage(message) {
    try {
      if (!message?.message) {
        return { valid: false, reason: 'No message content' };
      }

      if (message.key?.fromMe) {
        return { valid: false, reason: 'Own message' };
      }

      const text = message.message.conversation || 
                   message.message.extendedTextMessage?.text || '';

      if (!text?.trim()) {
        return { valid: false, reason: 'Empty text' };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Message validation error', error);
      return { valid: false, reason: 'Validation failed' };
    }
  }

  /**
   * Recover from common errors
   */
  async recoverFromError(errorType) {
    switch (errorType) {
      case 'rate_limited':
        logger.info('Backing off for 60 seconds');
        await this.sleep(60000);
        break;
      
      case 'socket_hang_up':
        logger.info('Waiting before retry');
        await this.sleep(10000);
        break;
      
      case 'connection_refused':
        logger.info('Connection refused - waiting 30 seconds');
        await this.sleep(30000);
        break;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Session persistence check
   */
  isSessionValid() {
    return this.isConnected;
  }
}

module.exports = new ConnectionMiddleware();
