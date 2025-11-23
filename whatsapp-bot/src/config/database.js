/**
 * Database Configuration
 * Setup Supabase or local database connection
 */

const { createClient } = require('@supabase/supabase-js');
const Logger = require('./logger');

const logger = new Logger('DatabaseConfig');

class DatabaseConfig {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_KEY;
    this.client = null;
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      if (!this.supabaseUrl || !this.supabaseKey) {
        logger.warn('Supabase credentials not found. Database features will be limited.');
        return false;
      }

      this.client = createClient(this.supabaseUrl, this.supabaseKey);
      
      // Test connection
      const { error } = await this.client.from('users').select('count()', { count: 'exact' });
      
      if (error && error.code !== 'PGRST116') {
        logger.warn(`Database connection warning: ${error.message}`);
      } else {
        logger.info('Database connection established');
      }

      return true;
    } catch (error) {
      logger.error('Failed to initialize database', error.message);
      return false;
    }
  }

  /**
   * Get Supabase client
   */
  getClient() {
    if (!this.client) {
      logger.error('Database client not initialized');
      return null;
    }
    return this.client;
  }

  /**
   * Create required tables if they don't exist
   */
  async createTables() {
    if (!this.client) return false;

    try {
      const tables = [
        `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            phone_number VARCHAR(20) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE,
            role VARCHAR(50) DEFAULT 'customer',
            is_active BOOLEAN DEFAULT true,
            is_verified BOOLEAN DEFAULT false,
            verification_otp VARCHAR(6),
            verification_otp_expires TIMESTAMP,
            profile_image VARCHAR(500),
            bio TEXT,
            address VARCHAR(500),
            city VARCHAR(100),
            country VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
          )
        `,
        `
          CREATE TABLE IF NOT EXISTS merchants (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id),
            store_name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            logo_url VARCHAR(500),
            cover_image_url VARCHAR(500),
            website VARCHAR(500),
            phone_number VARCHAR(20),
            email VARCHAR(255),
            address VARCHAR(500),
            city VARCHAR(100),
            rating DECIMAL(3,2) DEFAULT 0,
            review_count INTEGER DEFAULT 0,
            status VARCHAR(50) DEFAULT 'pending',
            approved_by UUID REFERENCES users(id),
            approval_date TIMESTAMP,
            rejection_reason TEXT,
            suspension_reason TEXT,
            is_featured BOOLEAN DEFAULT false,
            business_license VARCHAR(500),
            tax_id VARCHAR(100),
            commission_rate DECIMAL(5,2) DEFAULT 10,
            total_orders INTEGER DEFAULT 0,
            total_revenue DECIMAL(12,2) DEFAULT 0,
            average_delivery_time INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
        `
          CREATE TABLE IF NOT EXISTS products (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            merchant_id UUID NOT NULL REFERENCES merchants(id),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            sub_category VARCHAR(100),
            price DECIMAL(10,2) NOT NULL,
            discount_percentage DECIMAL(5,2) DEFAULT 0,
            discounted_price DECIMAL(10,2),
            quantity_in_stock INTEGER DEFAULT 0,
            unit VARCHAR(50),
            image_urls TEXT[],
            rating DECIMAL(3,2) DEFAULT 0,
            review_count INTEGER DEFAULT 0,
            sku VARCHAR(100),
            barcode VARCHAR(100),
            is_active BOOLEAN DEFAULT true,
            is_featured BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
        `
          CREATE TABLE IF NOT EXISTS orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_number VARCHAR(50) UNIQUE NOT NULL,
            customer_phone VARCHAR(20) NOT NULL REFERENCES users(phone_number),
            items JSONB NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            tax DECIMAL(10,2) DEFAULT 0,
            delivery_fee DECIMAL(10,2) DEFAULT 0,
            discount DECIMAL(10,2) DEFAULT 0,
            total DECIMAL(10,2) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            payment_method VARCHAR(50),
            payment_status VARCHAR(50) DEFAULT 'pending',
            delivery_address TEXT,
            estimated_delivery_time TIMESTAMP,
            actual_delivery_time TIMESTAMP,
            driver_id UUID REFERENCES users(id),
            customer_rating DECIMAL(3,2),
            customer_review TEXT,
            merchant_rating DECIMAL(3,2),
            merchant_review TEXT,
            delivery_rating DECIMAL(3,2),
            delivery_review TEXT,
            special_instructions TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
        `
          CREATE TABLE IF NOT EXISTS carts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            customer_phone VARCHAR(20) UNIQUE NOT NULL REFERENCES users(phone_number),
            items JSONB NOT NULL,
            total_items INTEGER DEFAULT 0,
            subtotal DECIMAL(10,2) DEFAULT 0,
            tax DECIMAL(10,2) DEFAULT 0,
            delivery_fee DECIMAL(10,2) DEFAULT 0,
            discount DECIMAL(10,2) DEFAULT 0,
            total DECIMAL(10,2) DEFAULT 0,
            coupon_code VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
          )
        `,
        `
          CREATE TABLE IF NOT EXISTS favorites (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            customer_phone VARCHAR(20) NOT NULL REFERENCES users(phone_number),
            product_id UUID NOT NULL REFERENCES products(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(customer_phone, product_id)
          )
        `,
        `
          CREATE TABLE IF NOT EXISTS addresses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            customer_phone VARCHAR(20) NOT NULL REFERENCES users(phone_number),
            type VARCHAR(50) DEFAULT 'home',
            address TEXT NOT NULL,
            city VARCHAR(100),
            is_default BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
        `
          CREATE TABLE IF NOT EXISTS ratings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            entity_type VARCHAR(50) NOT NULL,
            entity_id UUID,
            customer_phone VARCHAR(20) NOT NULL REFERENCES users(phone_number),
            rating DECIMAL(3,2) NOT NULL,
            review_text TEXT,
            images TEXT[],
            helpful_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
        `
          CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            recipient_phone VARCHAR(20) NOT NULL REFERENCES users(phone_number),
            recipient_type VARCHAR(50),
            type VARCHAR(50),
            title VARCHAR(255),
            message TEXT,
            is_read BOOLEAN DEFAULT false,
            read_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
        `
          CREATE TABLE IF NOT EXISTS admin_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            admin_phone VARCHAR(20) NOT NULL REFERENCES users(phone_number),
            action VARCHAR(255),
            entity_type VARCHAR(100),
            entity_id UUID,
            details JSONB,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
      ];

      for (const createTableSQL of tables) {
        try {
          const { error } = await this.client.rpc('exec', { sql: createTableSQL });
          if (error && error.code !== 'PGRST116') {
            logger.warn(`Table creation: ${error.message}`);
          }
        } catch (err) {
          logger.warn(`Could not create tables via RPC: ${err.message}`);
        }
      }

      logger.info('Database tables checked/created');
      return true;
    } catch (error) {
      logger.error('Failed to create tables', error.message);
      return false;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.client) {
      this.client = null;
      logger.info('Database connection closed');
    }
  }
}

module.exports = new DatabaseConfig();
