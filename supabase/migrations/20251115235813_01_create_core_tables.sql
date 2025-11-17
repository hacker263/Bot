/*
  # Smart WhatsApp Bot Platform - Core Tables

  1. Users (extends auth.users)
    - id (uuid, primary key)
    - role (enum: customer, merchant, super_admin)
    - phone_number (text, unique)
    - whatsapp_verified (boolean)
    - profile_data (jsonb for preferences, language, etc)
    - created_at (timestamp)

  2. Merchants
    - id (uuid, primary key)
    - user_id (fk to users)
    - business_name (text)
    - region (enum: ZW, ZA)
    - currency (enum: USD, ZWL, ZAR)
    - subscription_plan (enum: free, starter, pro)
    - order_count (integer)
    - order_limit (integer)
    - settings (jsonb for templates, preferences)
    - verified (boolean)
    - created_at (timestamp)

  3. Products
    - id (uuid, primary key)
    - merchant_id (fk to merchants)
    - name (text)
    - description (text)
    - price (decimal)
    - currency (enum)
    - category (text)
    - stock (integer)
    - image_url (text)
    - is_active (boolean)
    - created_at (timestamp)

  4. Customers
    - id (uuid, primary key)
    - user_id (fk to users, nullable for guests)
    - phone_number (text)
    - name (text)
    - email (text, nullable)
    - preferences (jsonb - favorite items, frequent merchants)
    - is_guest (boolean)
    - created_at (timestamp)

  5. Orders
    - id (uuid, primary key)
    - merchant_id (fk to merchants)
    - customer_id (fk to customers)
    - items (jsonb - array of {product_id, quantity, price})
    - total_amount (decimal)
    - currency (enum)
    - status (enum: pending, confirmed, preparing, dispatched, delivered, cancelled)
    - payment_method (text)
    - payment_status (enum: pending, paid, failed)
    - whatsapp_order_id (text - reference to WhatsApp conversation)
    - created_at (timestamp)
    - updated_at (timestamp)

  6. Carts
    - id (uuid, primary key)
    - customer_id (fk to customers)
    - merchant_id (fk to merchants)
    - items (jsonb - array of {product_id, quantity})
    - expires_at (timestamp)
    - created_at (timestamp)
    - updated_at (timestamp)

  7. ConversationSessions
    - id (uuid, primary key)
    - customer_phone (text)
    - merchant_id (fk to merchants, nullable if multi-merchant)
    - conversation_state (jsonb - tracks current step, context)
    - last_message_at (timestamp)
    - expires_at (timestamp)
    - created_at (timestamp)

  8. BotMessages
    - id (uuid, primary key)
    - conversation_session_id (fk)
    - direction (enum: incoming, outgoing)
    - message_type (enum: text, button, list, media)
    - content (text)
    - metadata (jsonb)
    - created_at (timestamp)

  9. CustomerPreferences
    - id (uuid, primary key)
    - customer_id (fk to customers)
    - merchant_id (fk to merchants)
    - preferred_products (array of uuid)
    - preferred_payment_method (text)
    - language (text)
    - notifications_enabled (boolean)
    - created_at (timestamp)

  10. Payments
    - id (uuid, primary key)
    - order_id (fk to orders)
    - amount (decimal)
    - currency (enum)
    - payment_method (text)
    - status (enum: pending, completed, failed)
    - reference_id (text - payment gateway reference)
    - created_at (timestamp)

  Security:
    - Enable RLS on all tables
    - Users see only their data
    - Merchants see their own data and customer orders
    - Admins see all data
    - Customers see their own orders and merchant products
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  phone_number text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'merchant', 'super_admin')),
  whatsapp_verified boolean DEFAULT false,
  profile_data jsonb DEFAULT '{"language": "en", "preferences": {}}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  region text NOT NULL CHECK (region IN ('ZW', 'ZA')),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'ZWL', 'ZAR')),
  subscription_plan text NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'pro')),
  order_count integer DEFAULT 0,
  order_limit integer DEFAULT 10,
  settings jsonb DEFAULT '{"codEnabled": true, "messageTemplates": {}}'::jsonb,
  verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  currency text NOT NULL CHECK (currency IN ('USD', 'ZWL', 'ZAR')),
  category text NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  name text NOT NULL,
  email text,
  preferences jsonb DEFAULT '{"favoriteItems": [], "frequentMerchants": []}'::jsonb,
  is_guest boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  customer_id uuid REFERENCES customers(id),
  items jsonb NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  currency text NOT NULL CHECK (currency IN ('USD', 'ZWL', 'ZAR')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'dispatched', 'delivered', 'cancelled')),
  payment_method text,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  whatsapp_order_id text,
  customer_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz DEFAULT (now() + interval '2 hours'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  merchant_id uuid REFERENCES merchants(id),
  conversation_state jsonb DEFAULT '{"step": "welcome", "context": {}}'::jsonb,
  last_message_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_session_id uuid REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'button', 'list', 'media')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  preferred_products uuid[] DEFAULT ARRAY[]::uuid[],
  preferred_payment_method text,
  language text DEFAULT 'en',
  notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, merchant_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  currency text NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reference_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid()::text = auth_id::text OR id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = auth_id::text)
  WITH CHECK (auth.uid()::text = auth_id::text);

CREATE POLICY "Anonymous users can insert"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Merchants can view own data"
  ON merchants FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Products are publicly visible"
  ON products FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Merchants can view own products"
  ON products FOR SELECT
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())));

CREATE POLICY "Merchants can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())));

CREATE POLICY "Customers can view own profile"
  ON customers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()) OR merchant_id IN (SELECT id FROM merchants WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())));

CREATE POLICY "Merchants can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())));

CREATE POLICY "Enable insert for orders"
  ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Customers can view own carts"
  ON carts FOR SELECT
  TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Customers can manage own carts"
  ON carts FOR UPDATE
  TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_merchants_user_id ON merchants(user_id);
CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_customers_phone ON customers(phone_number);
CREATE INDEX idx_orders_merchant ON orders(merchant_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_carts_customer ON carts(customer_id);
CREATE INDEX idx_carts_merchant ON carts(merchant_id);
CREATE INDEX idx_sessions_phone ON conversation_sessions(customer_phone);
CREATE INDEX idx_sessions_expires ON conversation_sessions(expires_at);
CREATE INDEX idx_messages_session ON bot_messages(conversation_session_id);
