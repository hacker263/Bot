-- Smart WhatsApp Bot - PostgreSQL Initialization Script

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('customer', 'merchant', 'super_admin');
CREATE TYPE region AS ENUM ('ZW', 'ZA');
CREATE TYPE currency_type AS ENUM ('USD', 'ZWL', 'ZAR');
CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'pro');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'dispatched', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE message_direction AS ENUM ('incoming', 'outgoing');
CREATE TYPE message_type_enum AS ENUM ('text', 'button', 'list', 'media');

-- Core tables
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number text UNIQUE NOT NULL,
  email text UNIQUE,
  role user_role NOT NULL DEFAULT 'customer',
  whatsapp_verified boolean DEFAULT false,
  profile_data jsonb DEFAULT '{"language": "en", "preferences": {}}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merchants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  region region NOT NULL,
  currency currency_type NOT NULL DEFAULT 'USD',
  subscription_plan subscription_plan NOT NULL DEFAULT 'free',
  order_count integer DEFAULT 0,
  order_limit integer DEFAULT 10,
  settings jsonb DEFAULT '{"codEnabled": true, "messageTemplates": {}}'::jsonb,
  verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  currency currency_type NOT NULL,
  category text NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  customer_id uuid REFERENCES customers(id),
  items jsonb NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  currency currency_type NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  whatsapp_order_id text,
  customer_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz DEFAULT (now() + interval '2 hours'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_phone text NOT NULL,
  merchant_id uuid REFERENCES merchants(id),
  conversation_state jsonb DEFAULT '{"step": "welcome", "context": {}}'::jsonb,
  last_message_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bot_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_session_id uuid REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  direction message_direction NOT NULL,
  message_type message_type_enum NOT NULL DEFAULT 'text',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  currency currency_type NOT NULL,
  payment_method text NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  reference_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
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

-- Insert sample data
INSERT INTO users (phone_number, email, role, whatsapp_verified) VALUES
  ('27123456789', 'merchant1@smartwhatsapp.co.za', 'merchant', true),
  ('263773123456', 'merchant2@smartwhatsapp.com', 'merchant', true),
  ('27987654321', 'admin@smartwhatsapp.com', 'super_admin', true)
ON CONFLICT (phone_number) DO NOTHING;

INSERT INTO merchants (user_id, business_name, region, currency, subscription_plan)
SELECT id, 'Fresh Eats SA', 'ZA', 'ZAR', 'starter'
FROM users WHERE phone_number = '27123456789' AND NOT EXISTS (SELECT 1 FROM merchants WHERE user_id = users.id)
ON CONFLICT DO NOTHING;

INSERT INTO merchants (user_id, business_name, region, currency, subscription_plan)
SELECT id, 'Zim Groceries', 'ZW', 'USD', 'starter'
FROM users WHERE phone_number = '263773123456' AND NOT EXISTS (SELECT 1 FROM merchants WHERE user_id = users.id)
ON CONFLICT DO NOTHING;

-- Sample products
INSERT INTO products (merchant_id, name, description, price, currency, category, stock, image_url, is_active)
SELECT m.id, 'Sadza & Beef Stew', 'Traditional Zimbabwean meal', 5.50, 'USD', 'Main Course', 50,
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg', true
FROM merchants m JOIN users u ON m.user_id = u.id WHERE u.phone_number = '263773123456' AND NOT EXISTS (
  SELECT 1 FROM products WHERE merchant_id = m.id AND name = 'Sadza & Beef Stew'
)
ON CONFLICT DO NOTHING;

COMMIT;
