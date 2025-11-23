/**
 * Database Models & Schemas
 * Defines the structure for all database entities
 */

// User/Customer Model
const UserSchema = {
  id: 'UUID (Primary Key)',
  phone_number: 'String (Unique)',
  name: 'String',
  email: 'String (Unique)',
  role: 'Enum: customer, merchant, admin',
  is_active: 'Boolean (Default: true)',
  is_verified: 'Boolean (Default: false)',
  verification_otp: 'String',
  verification_otp_expires: 'Timestamp',
  profile_image: 'String (URL)',
  bio: 'Text',
  address: 'String',
  city: 'String',
  country: 'String',
  created_at: 'Timestamp',
  updated_at: 'Timestamp',
  last_login: 'Timestamp',
};

// Merchant Model
const MerchantSchema = {
  id: 'UUID (Primary Key)',
  user_id: 'UUID (Foreign Key -> User)',
  store_name: 'String',
  description: 'Text',
  category: 'String',
  logo_url: 'String',
  cover_image_url: 'String',
  website: 'String',
  phone_number: 'String',
  email: 'String',
  address: 'String',
  city: 'String',
  coordinates: 'GeoPoint (lat, lng)',
  rating: 'Float (0-5)',
  review_count: 'Integer',
  status: 'Enum: pending, approved, suspended, rejected',
  approved_by: 'UUID (Foreign Key -> User/Admin)',
  approval_date: 'Timestamp',
  rejection_reason: 'Text',
  suspension_reason: 'Text',
  is_featured: 'Boolean',
  business_license: 'String (URL)',
  tax_id: 'String',
  bank_account: 'String (Encrypted)',
  commission_rate: 'Float',
  total_orders: 'Integer',
  total_revenue: 'Float',
  average_delivery_time: 'Integer (minutes)',
  created_at: 'Timestamp',
  updated_at: 'Timestamp',
};

// Product Model
const ProductSchema = {
  id: 'UUID (Primary Key)',
  merchant_id: 'UUID (Foreign Key -> Merchant)',
  name: 'String',
  description: 'Text',
  category: 'String',
  sub_category: 'String',
  price: 'Float',
  discount_percentage: 'Float (0-100)',
  discounted_price: 'Float',
  quantity_in_stock: 'Integer',
  unit: 'String (kg, ltr, piece, etc)',
  image_urls: 'Array<String> (URLs)',
  rating: 'Float (0-5)',
  review_count: 'Integer',
  sku: 'String (Unique)',
  barcode: 'String',
  is_active: 'Boolean',
  is_featured: 'Boolean',
  created_at: 'Timestamp',
  updated_at: 'Timestamp',
};

// Cart Model
const CartSchema = {
  id: 'UUID (Primary Key)',
  customer_phone: 'String (Foreign Key -> User)',
  items: 'Array<{product_id, quantity, price, merchant_id}>',
  total_items: 'Integer',
  subtotal: 'Float',
  tax: 'Float',
  delivery_fee: 'Float',
  discount: 'Float',
  total: 'Float',
  coupon_code: 'String',
  created_at: 'Timestamp',
  updated_at: 'Timestamp',
  expires_at: 'Timestamp (24 hours from update)',
};

// Order Model
const OrderSchema = {
  id: 'UUID (Primary Key)',
  order_number: 'String (Unique)',
  customer_phone: 'String (Foreign Key -> User)',
  items: 'Array<{product_id, product_name, merchant_id, quantity, price}>',
  subtotal: 'Float',
  tax: 'Float',
  delivery_fee: 'Float',
  discount: 'Float',
  total: 'Float',
  status: 'Enum: pending, confirmed, preparing, ready, out_for_delivery, delivered, cancelled',
  payment_method: 'String (cash, card, wallet)',
  payment_status: 'Enum: pending, completed, failed',
  delivery_address: 'String',
  delivery_coordinates: 'GeoPoint (lat, lng)',
  estimated_delivery_time: 'Timestamp',
  actual_delivery_time: 'Timestamp',
  driver_id: 'UUID (Foreign Key -> User)',
  driver_phone: 'String',
  driver_location: 'GeoPoint',
  customer_rating: 'Float (0-5)',
  customer_review: 'Text',
  merchant_rating: 'Float (0-5)',
  merchant_review: 'Text',
  delivery_rating: 'Float (0-5)',
  delivery_review: 'Text',
  special_instructions: 'Text',
  created_at: 'Timestamp',
  updated_at: 'Timestamp',
};

// Payment Model
const PaymentSchema = {
  id: 'UUID (Primary Key)',
  order_id: 'UUID (Foreign Key -> Order)',
  customer_phone: 'String',
  amount: 'Float',
  currency: 'String (ZWL, USD)',
  method: 'Enum: cash, card, wallet, mobile_money',
  provider: 'String (PayPal, Stripe, etc)',
  transaction_id: 'String',
  status: 'Enum: pending, completed, failed',
  error_message: 'Text',
  created_at: 'Timestamp',
  updated_at: 'Timestamp',
};

// Favorite/Wishlist Model
const FavoriteSchema = {
  id: 'UUID (Primary Key)',
  customer_phone: 'String (Foreign Key -> User)',
  product_id: 'UUID (Foreign Key -> Product)',
  created_at: 'Timestamp',
};

// Address Model
const AddressSchema = {
  id: 'UUID (Primary Key)',
  customer_phone: 'String (Foreign Key -> User)',
  type: 'String (home, work, other)',
  address: 'String',
  city: 'String',
  coordinates: 'GeoPoint (lat, lng)',
  is_default: 'Boolean',
  created_at: 'Timestamp',
  updated_at: 'Timestamp',
};

// Rating/Review Model
const RatingSchema = {
  id: 'UUID (Primary Key)',
  entity_type: 'Enum: product, merchant, order, delivery',
  entity_id: 'UUID (Foreign Key)',
  customer_phone: 'String (Foreign Key -> User)',
  rating: 'Float (0-5)',
  review_text: 'Text',
  images: 'Array<String> (URLs)',
  helpful_count: 'Integer',
  created_at: 'Timestamp',
  updated_at: 'Timestamp',
};

// Coupon/Promo Model
const PromoSchema = {
  id: 'UUID (Primary Key)',
  code: 'String (Unique)',
  description: 'String',
  discount_type: 'Enum: percentage, fixed',
  discount_value: 'Float',
  min_order_value: 'Float',
  max_discount: 'Float',
  valid_from: 'Timestamp',
  valid_until: 'Timestamp',
  usage_limit: 'Integer',
  used_count: 'Integer',
  applicable_to: 'String (all, merchants, products)',
  created_by: 'UUID (Foreign Key -> User/Admin)',
  is_active: 'Boolean',
  created_at: 'Timestamp',
};

// Analytics Model
const AnalyticsSchema = {
  id: 'UUID (Primary Key)',
  entity_type: 'Enum: merchant, product, order, customer',
  entity_id: 'UUID',
  date: 'Date',
  total_orders: 'Integer',
  total_revenue: 'Float',
  average_order_value: 'Float',
  total_items_sold: 'Integer',
  total_customers: 'Integer',
  conversion_rate: 'Float',
  top_products: 'Array<{product_id, name, count}>',
  top_customers: 'Array<{phone, name, count}>',
  created_at: 'Timestamp',
};

// Notification Model
const NotificationSchema = {
  id: 'UUID (Primary Key)',
  recipient_phone: 'String (Foreign Key -> User)',
  recipient_type: 'Enum: customer, merchant, admin',
  type: 'Enum: order, promotion, system, payment',
  title: 'String',
  message: 'String',
  related_entity_type: 'String',
  related_entity_id: 'UUID',
  is_read: 'Boolean (Default: false)',
  read_at: 'Timestamp',
  created_at: 'Timestamp',
};

// Admin Log Model
const AdminLogSchema = {
  id: 'UUID (Primary Key)',
  admin_phone: 'String (Foreign Key -> User)',
  action: 'String (approve_merchant, reject_merchant, etc)',
  entity_type: 'String (merchant, order, product)',
  entity_id: 'UUID',
  details: 'JSON Object',
  reason: 'Text',
  created_at: 'Timestamp',
};

module.exports = {
  UserSchema,
  MerchantSchema,
  ProductSchema,
  CartSchema,
  OrderSchema,
  PaymentSchema,
  FavoriteSchema,
  AddressSchema,
  RatingSchema,
  PromoSchema,
  AnalyticsSchema,
  NotificationSchema,
  AdminLogSchema,
};
