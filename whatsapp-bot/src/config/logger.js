/**
 * Pino Logger Configuration
 * Centralized logging with timestamps and structured format
 */

const P = require('pino');
const chalk = require('chalk');

class Logger {
  constructor(moduleName = 'Bot') {
    this.logger = P({
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      level: process.env.LOG_LEVEL || 'info',
    }).child({ module: moduleName });
  }

  info(message, data = {}) {
    console.log(chalk.blue(`[INFO] ${message}`), data);
    this.logger.info({ message, ...data });
  }

  error(message, error = null, data = {}) {
    console.log(chalk.red(`[ERROR] ${message}`), error?.message || error, data);
    this.logger.error({ message, error: error?.message, ...data });
  }

  warn(message, data = {}) {
    console.log(chalk.yellow(`[WARN] ${message}`), data);
    this.logger.warn({ message, ...data });
  }

  success(message, data = {}) {
    console.log(chalk.green(`[SUCCESS] ${message}`), data);
    this.logger.info({ message, success: true, ...data });
  }

  debug(message, data = {}) {
    if (process.env.DEBUG) {
      console.log(chalk.magenta(`[DEBUG] ${message}`), data);
      this.logger.debug({ message, ...data });
    }
  }
}

module.exports = Logger;
