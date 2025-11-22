/**
 * Authentication Middleware
 * Validates user permissions and role-based access
 */

const backendAPI = require('../api/backendAPI');
const cache = require('../database/cache');
const constants = require('../config/constants');
const Logger = require('../config/logger');

const logger = new Logger('AuthMiddleware');

class AuthMiddleware {
  /**
   * Check if user is admin
   */
  async isAdmin(phoneNumber) {
    return constants.ADMIN_PHONES.includes(this.normalizePhone(phoneNumber));
  }

  /**
   * Check if user is merchant
   */
  async isMerchant(phoneNumber) {
    const session = await cache.getUserSession(phoneNumber);
    return session?.role === constants.ROLES.MERCHANT;
  }

  /**
   * Check if user is customer
   */
  async isCustomer(phoneNumber) {
    const session = await cache.getUserSession(phoneNumber);
    return session?.role === constants.ROLES.CUSTOMER;
  }

  /**
   * Verify user session and return user data
   */
  async verifySession(phoneNumber) {
    let session = await cache.getUserSession(phoneNumber);

    if (!session) {
      // Fetch from backend
      const response = await backendAPI.getUser(phoneNumber);
      if (response.success) {
        session = response.data;
        await cache.setUserSession(phoneNumber, session);
      } else {
        logger.warn(`Session verification failed for ${phoneNumber}`);
        return null;
      }
    }

    return session;
  }

  /**
   * Require admin role
   */
  async requireAdmin(phoneNumber) {
    if (!await this.isAdmin(phoneNumber)) {
      logger.warn(`Unauthorized admin command attempt: ${phoneNumber}`);
      throw new Error('You are not authorized to use this admin command.');
    }
    return true;
  }

  /**
   * Require merchant role
   */
  async requireMerchant(phoneNumber) {
    if (!await this.isMerchant(phoneNumber)) {
      logger.warn(`Unauthorized merchant command attempt: ${phoneNumber}`);
      throw new Error('You must be a registered merchant to use this command.');
    }
    return true;
  }

  /**
   * Require authenticated user
   */
  async requireAuth(phoneNumber) {
    const session = await this.verifySession(phoneNumber);
    if (!session) {
      throw new Error('Please register or login first. Type !register or !login');
    }
    return session;
  }

  normalizePhone(phone) {
    return phone.replace(/\D/g, '');
  }
}

module.exports = new AuthMiddleware();
