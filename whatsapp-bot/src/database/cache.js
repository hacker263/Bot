/**
 * Database Cache Layer
 * Uses JSON file storage for local caching with SQLite option
 * No remote database required - all data written to backend API
 */

const fs = require('fs').promises;
const path = require('path');
const NodeCache = require('node-cache');
const Logger = require('../config/logger');

const logger = new Logger('CacheDB');

class CacheDatabase {
  constructor() {
    this.baseDir = path.join(__dirname, '../../cache');
    this.inMemory = new NodeCache({ stdTTL: 3600 });
    this.ensureCacheDir();
  }

  async ensureCacheDir() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create cache directory', error);
    }
  }

  /**
   * Get user session from cache
   */
  async getUserSession(phoneNumber) {
    const key = `session:${phoneNumber}`;
    let data = this.inMemory.get(key);
    
    if (!data) {
      data = await this.readFromFile(`sessions/${phoneNumber}.json`);
      if (data) {
        this.inMemory.set(key, data);
      }
    }
    return data;
  }

  /**
   * Save user session
   */
  async setUserSession(phoneNumber, sessionData) {
    const key = `session:${phoneNumber}`;
    this.inMemory.set(key, sessionData);
    await this.writeToFile(`sessions/${phoneNumber}.json`, sessionData);
  }

  /**
   * Get user cart
   */
  async getUserCart(phoneNumber) {
    const key = `cart:${phoneNumber}`;
    let data = this.inMemory.get(key);
    
    if (!data) {
      data = await this.readFromFile(`carts/${phoneNumber}.json`) || { items: [], total: 0 };
      if (data) {
        this.inMemory.set(key, data);
      }
    }
    return data;
  }

  /**
   * Save user cart
   */
  async setUserCart(phoneNumber, cartData) {
    const key = `cart:${phoneNumber}`;
    this.inMemory.set(key, cartData);
    await this.writeToFile(`carts/${phoneNumber}.json`, cartData);
  }

  /**
   * Clear user cart
   */
  async clearUserCart(phoneNumber) {
    const key = `cart:${phoneNumber}`;
    this.inMemory.del(key);
    await this.deleteFile(`carts/${phoneNumber}.json`);
  }

  /**
   * Store merchant profile (local cache only - source of truth is backend)
   */
  async getMerchantProfile(merchantId) {
    const key = `merchant:${merchantId}`;
    let data = this.inMemory.get(key);
    
    if (!data) {
      data = await this.readFromFile(`merchants/${merchantId}.json`);
      if (data) {
        this.inMemory.set(key, data);
      }
    }
    return data;
  }

  /**
   * Cache merchant profile
   */
  async setMerchantProfile(merchantId, profileData) {
    const key = `merchant:${merchantId}`;
    this.inMemory.set(key, profileData);
    await this.writeToFile(`merchants/${merchantId}.json`, profileData);
  }

  /**
   * Get product from cache
   */
  async getProduct(productId) {
    const key = `product:${productId}`;
    let data = this.inMemory.get(key);
    
    if (!data) {
      data = await this.readFromFile(`products/${productId}.json`);
      if (data) {
        this.inMemory.set(key, data);
      }
    }
    return data;
  }

  /**
   * Cache product
   */
  async setProduct(productId, productData) {
    const key = `product:${productId}`;
    this.inMemory.set(key, productData);
    await this.writeToFile(`products/${productId}.json`, productData);
  }

  /**
   * Store command history for rate limiting & context
   */
  async addCommandHistory(phoneNumber, command, timestamp = Date.now()) {
    const historyFile = `history/${phoneNumber}_commands.json`;
    let history = await this.readFromFile(historyFile) || [];
    
    history.push({
      command,
      timestamp,
      date: new Date().toISOString(),
    });

    // Keep only last 100 commands
    if (history.length > 100) {
      history = history.slice(-100);
    }

    await this.writeToFile(historyFile, history);
  }

  /**
   * Get recent commands for rate limiting check
   */
  async getRecentCommands(phoneNumber, minutesBack = 1) {
    const historyFile = `history/${phoneNumber}_commands.json`;
    const history = await this.readFromFile(historyFile) || [];
    const cutoff = Date.now() - (minutesBack * 60 * 1000);
    
    return history.filter(cmd => cmd.timestamp > cutoff);
  }

  /**
   * Store failed API requests for retry queue
   */
  async addToRetryQueue(requestData) {
    const queueFile = 'retry_queue.json';
    let queue = await this.readFromFile(queueFile) || [];
    
    queue.push({
      ...requestData,
      addedAt: Date.now(),
      attempts: 0,
    });

    await this.writeToFile(queueFile, queue);
  }

  /**
   * Get retry queue
   */
  async getRetryQueue() {
    const queueFile = 'retry_queue.json';
    return await this.readFromFile(queueFile) || [];
  }

  /**
   * Remove from retry queue after successful retry
   */
  async removeFromRetryQueue(index) {
    const queueFile = 'retry_queue.json';
    let queue = await this.readFromFile(queueFile) || [];
    queue.splice(index, 1);
    await this.writeToFile(queueFile, queue);
  }

  /**
   * Store image upload queue for batch processing
   */
  async addToImageQueue(phoneNumber, imageData) {
    const queueFile = `image_queue/${phoneNumber}.json`;
    let queue = await this.readFromFile(queueFile) || [];
    
    queue.push({
      ...imageData,
      addedAt: Date.now(),
    });

    await this.writeToFile(queueFile, queue);
    return queue.length;
  }

  /**
   * Get image upload queue for a user
   */
  async getImageQueue(phoneNumber) {
    const queueFile = `image_queue/${phoneNumber}.json`;
    return await this.readFromFile(queueFile) || [];
  }

  /**
   * Clear image queue after upload
   */
  async clearImageQueue(phoneNumber) {
    const queueFile = `image_queue/${phoneNumber}.json`;
    await this.deleteFile(queueFile);
  }

  /**
   * Internal: Read from file
   */
  async readFromFile(filename) {
    try {
      const filePath = path.join(this.baseDir, filename);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error(`Failed to read ${filename}`, error);
      }
      return null;
    }
  }

  /**
   * Internal: Write to file
   */
  async writeToFile(filename, data) {
    try {
      const filePath = path.join(this.baseDir, filename);
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      logger.error(`Failed to write ${filename}`, error);
    }
  }

  /**
   * Internal: Delete file
   */
  async deleteFile(filename) {
    try {
      const filePath = path.join(this.baseDir, filename);
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error(`Failed to delete ${filename}`, error);
      }
    }
  }

  /**
   * Clear all caches (for testing/reset)
   */
  async clearAll() {
    this.inMemory.flushAll();
    logger.info('All in-memory caches cleared');
  }
}

module.exports = new CacheDatabase();
