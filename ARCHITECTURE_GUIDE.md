# WhatsApp Smart Bot - Architecture & Integration Guide

## Overview

This document provides a comprehensive guide to the restructured WhatsApp bot architecture, API integration, and backend communication patterns.

---

## 1. Folder Structure

```
whatsapp-bot/src/
├── config/                    # Global configuration
│   ├── constants.js          # Constants, messages, enums
│   └── logger.js             # Pino logger setup
│
├── database/                 # Local caching layer
│   └── cache.js             # JSON-based cache (no remote DB)
│
├── api/                      # Backend API integration
│   └── backendAPI.js        # API client with retries
│
├── middlewares/              # Cross-cutting concerns
│   ├── auth.js              # Role-based auth
│   ├── rateLimiter.js       # Rate limiting
│   └── connectionHandler.js # Connection management
│
├── utils/                    # Helper functions
│   ├── messageFormatter.js  # WhatsApp message formatting
│   └── commandParser.js     # Command parsing & intent detection
│
├── handlers/                 # Role-specific command handlers
│   ├── authHandler.js       # Register, login, profile
│   ├── adminHandler.js      # Admin commands
│   ├── merchantHandler.js   # Merchant commands
│   └── customerHandler.js   # Customer commands
│
├── controllers/              # Orchestration layer
│   └── botController.js     # Main message router
│
└── services/                 # Business logic (expandable)
    └── (future) analyticsService.js, etc.
```

---

## 2. Core Components

### A. Configuration (`src/config/`)

**constants.js** - Centralized constants
- Role definitions (ADMIN, MERCHANT, CUSTOMER)
- Order/Merchant status enums
- Rate limits
- Message templates

**logger.js** - Structured logging
- Colored console output
- Pino logger integration
- Module-specific namespacing

### B. Database Cache (`src/database/cache.js`)

**In-Memory + File Storage** (No remote database):
- Sessions: `/cache/sessions/{phone}.json`
- Carts: `/cache/carts/{phone}.json`
- Merchants: `/cache/merchants/{id}.json`
- Products: `/cache/products/{id}.json`
- Retry Queue: `/cache/retry_queue.json`
- Image Queue: `/cache/image_queue/{phone}.json`

**Key Methods:**
```javascript
// Sessions
getUserSession(phoneNumber)
setUserSession(phoneNumber, data)

// Carts
getUserCart(phoneNumber)
setUserCart(phoneNumber, data)

// Retry mechanism
addToRetryQueue(requestData)
getRetryQueue()

// Image uploads
addToImageQueue(phoneNumber, imageData)
getImageQueue(phoneNumber)
```

### C. API Layer (`src/api/backendAPI.js`)

**Automatic Retries & Error Handling:**
- Exponential backoff (1s, 2s, 4s)
- Retryable error detection
- Connection failure recovery

**Endpoints by Category:**

```javascript
// Auth
registerUser(phone, name, role)
loginUser(phone, otp)
sendOTP(phone)
getUser(phone)

// Merchants
getMerchantProfile(id)
updateMerchantProfile(id, data)
approveMerchant(id, adminId)
getPendingMerchants()

// Products
addProduct(merchantId, data)
updateProduct(productId, data)
searchProducts(query, filters)

// Orders
createOrder(phone, data)
getOrderStatus(orderId)
updateOrderStatus(orderId, status, merchantId)

// Analytics
getMerchantAnalytics(merchantId, timeframe)
getSystemAnalytics(adminId)
```

### D. Middlewares

**Auth (`src/middlewares/auth.js`)**
- `isAdmin(phone)` - Check admin status
- `isMerchant(phone)` - Check merchant role
- `requireAuth(phone)` - Enforce authentication
- `verifySession(phone)` - Validate & refresh session

**Rate Limiter (`src/middlewares/rateLimiter.js`)**
- `checkMessageLimit()` - Messages/minute
- `checkImageUploadLimit()` - Image uploads/minute
- `checkCommandLimit(command)` - Per-command limits
- Sliding window counters stored in memory

**Connection Handler (`src/middlewares/connectionHandler.js`)**
- Auto-reconnect with backoff
- QR code generation
- Error recovery strategies
- Session persistence check

### E. Utils

**Command Parser (`src/utils/commandParser.js`)**
- Command detection (`isCommand()`)
- Argument parsing
- Natural language intent detection
- Entity extraction (phone, amount, quantity)

**Message Formatter (`src/utils/messageFormatter.js`)**
- Formatted output for products, orders, carts
- Emoji-enhanced messages
- Status indicators
- Role-based menus

---

## 3. Message Flow Diagram

```
User Message (WhatsApp)
    ↓
Bot Receives (socket.io)
    ↓
[Validation] - Check message format
    ↓
[Rate Limit] - Check user quotas
    ↓
[Parse] - Extract command or intent
    ↓
[Auth Check] - Verify role if needed
    ↓
Route to Handler:
├─ Auth Commands → authHandler
├─ Admin Commands → adminHandler
├─ Merchant Commands → merchantHandler
└─ Customer Commands → customerHandler
    ↓
Handler Logic:
├─ Validate input
├─ Call Backend API
├─ Cache response
└─ Format response
    ↓
Send Response → User
    ↓
[Failure?] → Add to Retry Queue
    ↓
Retry Queue Processor:
└─ Retry every 5 seconds (max 3 attempts)
```

---

## 4. Handler Architecture

### Auth Handler (`src/handlers/authHandler.js`)

**Commands:**
- `!register [name] [role]` - User registration
- `!login` - Initiate login (sends OTP)
- `!verify <code>` - Verify OTP
- `!logout` - Logout user
- `!profile` - View profile
- `!help [command]` - Get help

**Flow:**
```
!register → 
  ├─ Check if already registered
  ├─ Call backendAPI.registerUser()
  ├─ Save session to cache
  └─ Return welcome message

!login →
  ├─ Call backendAPI.sendOTP()
  ├─ Store login state in cache
  └─ Wait for !verify

!verify <code> →
  ├─ Call backendAPI.loginUser(phone, otp)
  ├─ Save authenticated session
  └─ Route based on user role
```

### Admin Handler (`src/handlers/adminHandler.js`)

**Commands:**
```
!admin merchants [pending|approved|suspended]  - List merchants
!admin approve <id>                             - Approve merchant
!admin reject <id> [reason]                     - Reject merchant
!admin suspend <id> [reason]                    - Suspend merchant
!admin sales [today|week|month]                 - View sales
!admin logs [errors|warnings]                   - System logs
!admin broadcast <message>                      - Send broadcast
!admin stats                                    - System stats
!admin alerts                                   - Active alerts
```

**Data Flow:**
```
!admin approve <merchant_id>
  ├─ Verify admin status (requireAdmin)
  ├─ Call backendAPI.approveMerchant()
  ├─ Get merchant phone from response
  ├─ Send notification to merchant
  └─ Log action for audit trail
```

### Merchant Handler (`src/handlers/merchantHandler.js`)

**Order Management:**
```
!merchant orders [new|today|week]
  ├─ Call getMerchantOrders(merchantId, filters)
  ├─ Format order list
  └─ Show quick actions

!merchant accept <order_id>
!merchant reject <order_id> [reason]
!merchant update-status <order_id> <status>
  └─ Notify customer via WhatsApp
```

**Product Management:**
```
!merchant products [list|search]
!merchant add-product             → Multi-step flow
!merchant edit-product <id>
!merchant delete-product <id>
```

**Store Management:**
```
!merchant store [profile|hours]
!merchant store-status [open|closed|busy]
!merchant store-hours <open> <close>
```

**Analytics:**
```
!merchant analytics [today|week|month]
!merchant dashboard
```

### Customer Handler (`src/handlers/customerHandler.js`)

**Browsing:**
```
!menu / !m              - Show all products
!search <query>         - Search products
!categories             - Product categories
!nearby [category]      - Nearby stores
!store <store_id>       - View store details
```

**Cart:**
```
!add <product_id> <qty>
  ├─ Fetch product from API
  ├─ Get current cart from cache
  ├─ Add/update item
  ├─ Save cart
  └─ Notify user of cart total

!cart / !c              - Show cart
!remove <index>         - Remove item
!clear                  - Clear cart
```

**Orders:**
```
!checkout / !pay
  ├─ Get cart from cache
  ├─ Call createOrder()
  ├─ Clear cart
  └─ Show order confirmation

!orders                 - View past orders
!reorder <order_id>     - Add previous order items to cart
!track <order_id>       - Track order status
!rate <order_id> <1-5>  - Rate order
```

**Preferences:**
```
!favorites [list|add|remove]
!addresses [list|add|remove]
!deals                  - Show active deals
```

---

## 5. API Integration Details

### A. Authentication Flow

**Registration:**
```javascript
POST /api/auth/register
{
  phone_number: "263784123456",
  name: "John Doe",
  role: "customer",
  email: "john@example.com"
}

Response:
{
  id: "user_123",
  phone_number: "263784123456",
  name: "John Doe",
  role: "customer",
  status: "active",
  created_at: "2025-11-22T10:30:00Z"
}
```

**Login with OTP:**
```javascript
POST /api/auth/send-otp
{ phone_number: "263784123456" }

// User receives OTP via WhatsApp

POST /api/auth/login
{
  phone_number: "263784123456",
  otp: "123456"
}

Response:
{
  token: "jwt_token",
  user: { ... },
  expires_in: 86400
}
```

### B. Order Management

**Creating Order:**
```javascript
POST /api/orders
{
  customer_phone: "263784123456",
  items: [
    { id: "prod_1", quantity: 2, price: 500 },
    { id: "prod_2", quantity: 1, price: 1000 }
  ],
  total: 2000,
  delivery_type: "delivery",
  delivery_address: "123 Main St, Harare"
}

Response:
{
  id: "order_123",
  status: "pending",
  created_at: "2025-11-22T10:45:00Z",
  estimated_time: "30 mins",
  ...
}
```

**Updating Order Status:**
```javascript
PUT /api/orders/<order_id>
{
  status: "preparing",
  updated_by: "merchant_123"
}

// Bot automatically notifies customer
```

### C. Error Handling & Retries

**Automatic Retry Logic:**
```javascript
const response = await backendAPI.request('GET', '/api/orders/123');

// Retryable errors: 408, 429, 500, 502, 503, 504
// Exponential backoff: 1s, 2s, 4s, 8s
// Max retries: 3

if (!response.success) {
  // Store in retry queue
  await cache.addToRetryQueue({
    method: 'GET',
    endpoint: '/api/orders/123',
    attempts: 0
  });
  
  // Process queue every 5 seconds
  // Automatically retry failed requests
}
```

---

## 6. Webhook Integration (Backend → Bot)

**Backend sends updates to bot via webhook:**

```javascript
POST /webhook/order-update
{
  orderId: "order_123",
  status: "ready",
  customerPhone: "263784123456",
  merchantId: "merchant_456"
}

// Bot automatically sends message to customer:
// "📦 Your order is ready for pickup!"
```

**Webhook receiver:**
```javascript
app.post('/webhook/order-update', async (req, res) => {
  const { orderId, status, customerPhone } = req.body;
  
  const message = `📦 Order ${orderId} is now ${status}`;
  await sock.sendMessage(`${customerPhone}@s.whatsapp.net`, { text: message });
  
  res.json({ success: true });
});
```

---

## 7. Step-by-Step Backend Integration

### Setup Instructions

**1. Environment Variables** (`.env`)
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Bot
BOT_PREFIX=!
BOT_WEBHOOK_PORT=3001
BOT_API_PORT=4001
ADMIN_PHONES=263781234567,263789876543

# Logging
LOG_LEVEL=info
DEBUG=false
```

**2. Initialize Bot**
```bash
cd whatsapp-bot
npm install
npm run dev
```

**3. Configure Backend Routes**

Your backend must implement:

```
POST   /api/auth/register              - Register user
POST   /api/auth/login                 - Login user
POST   /api/auth/send-otp              - Send OTP

GET    /api/users/<phone>              - Get user
PUT    /api/users/<phone>              - Update user

POST   /api/merchants                  - Create merchant
GET    /api/merchants/<id>             - Get merchant
PUT    /api/merchants/<id>             - Update merchant
GET    /api/admin/merchants/pending    - List pending

POST   /api/admin/merchants/<id>/approve   - Approve
POST   /api/admin/merchants/<id>/reject    - Reject
POST   /api/admin/merchants/<id>/suspend   - Suspend

POST   /api/products                   - Create product
GET    /api/products/<id>              - Get product
PUT    /api/products/<id>              - Update product
DELETE /api/products/<id>              - Delete product
GET    /api/merchants/<id>/products    - Merchant products
GET    /api/products/search            - Search

POST   /api/orders                     - Create order
GET    /api/orders/<id>                - Get order
PUT    /api/orders/<id>                - Update order
GET    /api/merchants/<id>/orders      - Merchant orders
GET    /api/customers/<phone>/orders   - Customer orders

POST   /api/admin/broadcasts           - Send broadcast
GET    /api/admin/analytics            - System analytics
GET    /api/merchants/<id>/analytics   - Merchant analytics
```

**4. Webhook Configuration**

Backend should notify bot about:
```
POST http://localhost:3001/webhook/order-update
POST http://localhost:3001/webhook/merchant-approved
POST http://localhost:3001/webhook/product-updated
```

**5. Test Integration**

```bash
# Test auth
curl -X POST http://localhost:4001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phone_number":"263784123456","role":"customer"}'

# Test webhook
curl -X POST http://localhost:3001/webhook/order-update \
  -H "Content-Type: application/json" \
  -d '{"orderId":"123","status":"ready","customerPhone":"263784123456"}'

# Check bot health
curl http://localhost:4001/health
```

---

## 8. Cache Management

### Session Caching

```javascript
// Session TTL: 24 hours
// Stores: User info, role, authentication status

const session = await cache.getUserSession(phone);
// Returns: { id, name, role, merchant_id, authenticated, ... }

await cache.setUserSession(phone, sessionData);
```

### Cart Caching

```javascript
// Cart TTL: 2 hours
// Stores: Items, quantities, totals

const cart = await cache.getUserCart(phone);
// { items: [...], total: 5000 }

await cache.setUserCart(phone, updatedCart);
```

### Product Caching

```javascript
// Product TTL: 15 minutes
// Stores: Product details from API

const product = await cache.getProduct(productId);

await cache.setProduct(productId, productData);
```

---

## 9. Rate Limiting

**Limits per minute:**
- Messages: 100/min per user
- Image uploads: 10/min per user
- API calls: 50/min per user
- Specific commands: 5/min per command

**Sliding window algorithm:**
```javascript
// In-memory counter with window reset
// No database queries needed
// Configurable in constants.js
```

---

## 10. Logging & Monitoring

**Log Levels:**
- `info` - General flow
- `error` - Failures
- `warn` - Warnings
- `success` - Operation success
- `debug` - Detailed (if DEBUG=true)

**Sample Log Output:**
```
[INFO] Message from 263784123456: !search pizza
[DEBUG] Command: search, Args: pizza
[INFO] Processing search intent
[SUCCESS] Search completed: 5 results found
```

---

## 11. Future Enhancements

1. **Image Handling**
   - Batch upload queue in `image_queue/`
   - Local thumbnail generation
   - Self-hosted MinIO for storage

2. **Analytics Service**
   - Separate `analyticsService.js`
   - Track user behavior
   - Generate reports

3. **Multi-language Support**
   - `localizationService.js`
   - Locale detection from user preferences
   - Message templating

4. **WebSocket Sync**
   - Real-time cart/order updates
   - Live notifications
   - Desktop/mobile sync

5. **Scheduled Tasks**
   - Daily summaries (via node-cron)
   - Expired session cleanup
   - Retry queue processing

---

## 12. Testing

**Mock Backend for Development:**
```javascript
// Use environment flag to switch
if (process.env.USE_MOCK_API === 'true') {
  // Load mock API responses
  // Useful for development without backend
}
```

**Test Commands:**
```bash
# Test auth flow
!register John customer
!login
!verify 123456

# Test customer flow
!menu
!search pizza
!add prod_1 2
!cart
!checkout

# Test merchant flow
!merchant orders new
!merchant accept order_123

# Test admin flow
!admin merchants pending
!admin approve merchant_456
```

---

## Summary

This restructured bot provides:
✅ **Modular architecture** - Easy to extend and maintain
✅ **No remote database** - Local cache only
✅ **Automatic retries** - Network resilience
✅ **Role-based access** - Admin, merchant, customer
✅ **Rate limiting** - Prevent abuse
✅ **Structured logging** - Easy debugging
✅ **Command routing** - Clear separation of concerns
✅ **Message formatting** - Professional, emoji-enhanced
✅ **Session management** - User context tracking
✅ **Webhook support** - Backend integration

For questions or issues, refer to specific handler files or middleware modules.
