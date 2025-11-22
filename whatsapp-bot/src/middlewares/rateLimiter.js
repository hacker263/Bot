/**
 * Rate Limiting Middleware
 * Prevents spam and abuse with configurable limits
 */

const cache = require('../database/cache');
const constants = require('../config/constants');
const Logger = require('../config/logger');

const logger = new Logger('RateLimiter');

class RateLimiter {
  /**
   * Check message rate limit (messages per minute)
   */
  async checkMessageLimit(phoneNumber) {
    const key = `rate:msg:${phoneNumber}`;
    const limiter = this.getOrCreateLimiter(key, constants.RATE_LIMIT.MESSAGE_SEND, 60);
    
    if (limiter.count >= limiter.max) {
      logger.warn(`Rate limit exceeded for messages: ${phoneNumber}`);
      return false;
    }

    limiter.count++;
    return true;
  }

  /**
   * Check image upload rate limit
   */
  async checkImageUploadLimit(phoneNumber) {
    const key = `rate:img:${phoneNumber}`;
    const limiter = this.getOrCreateLimiter(key, constants.RATE_LIMIT.IMAGE_UPLOAD, 60);
    
    if (limiter.count >= limiter.max) {
      logger.warn(`Rate limit exceeded for image uploads: ${phoneNumber}`);
      return false;
    }

    limiter.count++;
    return true;
  }

  /**
   * Check API call rate limit
   */
  async checkAPILimit(phoneNumber) {
    const key = `rate:api:${phoneNumber}`;
    const limiter = this.getOrCreateLimiter(key, constants.RATE_LIMIT.API_CALL, 60);
    
    if (limiter.count >= limiter.max) {
      logger.warn(`Rate limit exceeded for API calls: ${phoneNumber}`);
      return false;
    }

    limiter.count++;
    return true;
  }

  /**
   * Check command rate limit (specific commands per minute)
   */
  async checkCommandLimit(phoneNumber, command) {
    const key = `rate:cmd:${phoneNumber}:${command}`;
    const limiter = this.getOrCreateLimiter(key, 5, 60); // 5 per minute per command

    if (limiter.count >= limiter.max) {
      logger.warn(`Rate limit exceeded for command '${command}': ${phoneNumber}`);
      return false;
    }

    limiter.count++;
    return true;
  }

  /**
   * Internal: Get or create rate limiter
   */
  getOrCreateLimiter(key, max, windowSeconds) {
    let limiter = global.rateLimiters?.get(key);

    if (!limiter || Date.now() - limiter.createdAt > windowSeconds * 1000) {
      limiter = {
        count: 0,
        max,
        createdAt: Date.now(),
      };

      if (!global.rateLimiters) {
        global.rateLimiters = new Map();
      }
      global.rateLimiters.set(key, limiter);
    }

    return limiter;
  }

  /**
   * Get remaining quota
   */
  getRemainingQuota(phoneNumber, limitType = 'message') {
    const key = `rate:${limitType}:${phoneNumber}`;
    const limiter = global.rateLimiters?.get(key);
    
    if (!limiter) {
      if (limitType === 'message') return constants.RATE_LIMIT.MESSAGE_SEND;
      if (limitType === 'image') return constants.RATE_LIMIT.IMAGE_UPLOAD;
      if (limitType === 'api') return constants.RATE_LIMIT.API_CALL;
    }

    return Math.max(0, limiter.max - limiter.count);
  }
}

module.exports = new RateLimiter();
