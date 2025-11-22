# WhatsApp Bot - Backend Integration Guide

## Quick Start - Integration Checklist

This guide walks you through integrating the modularized WhatsApp bot with your backend.

---

## Phase 1: Backend API Setup

### 1.1 Required Backend Endpoints

Your backend MUST implement these endpoints. Use Supabase functions or Express routes.

#### Authentication Routes

```javascript
// POST /api/auth/register
// Register new user (customer or merchant)
{
  "phone_number": "263784123456",    // Required, normalized
  "name": "John Doe",                 // Required
  "role": "customer|merchant",        // Required
  "email": "john@example.com"         // Optional
}

Response:
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "phone_number": "263784123456",
    "name": "John Doe",
    "role": "customer",
    "created_at": "2025-11-22T10:30:00Z",
    "status": "active"
  }
}
```

```javascript
// POST /api/auth/send-otp
// Trigger OTP send via email/SMS backend service
{
  "phone_number": "263784123456"
}

Response:
{
  "success": true,
  "message": "OTP sent to registered email"
}
```

```javascript
// POST /api/auth/login
// Verify OTP and return user + token
{
  "phone_number": "263784123456",
  "otp": "123456"
}

Response:
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_uuid",
      "phone_number": "263784123456",
      "name": "John Doe",
      "role": "customer",
      "authenticated": true
    },
    "expires_in": 86400
  }
}
```

#### User Routes

```javascript
// GET /api/users/<phone>
// Get user profile by phone
Response: { user object with all fields }

// PUT /api/users/<phone>
// Update user profile
{
  "name": "John Updated",
  "email": "new@example.com",
  "delivery_address": "123 Main St",
  "preferences": { ... }
}
```

#### Merchant Routes

```javascript
// GET /api/merchants/<id>
// Get merchant profile

// PUT /api/merchants/<id>
// Update merchant profile
{
  "business_name": "New Name",
  "category": "Food",
  "opening_time": "08:00",
  "closing_time": "20:00",
  "delivery_radius": 5,
  "store_status": "open",
  "description": "..."
}

// POST /api/admin/merchants/<id>/approve
// Admin approve merchant
{ "approved_by": "admin_phone" }

// POST /api/admin/merchants/<id>/reject
// Admin reject merchant
{
  "reason": "Incomplete information",
  "rejected_by": "admin_phone"
}

// POST /api/admin/merchants/<id>/suspend
// Admin suspend merchant
{
  "reason": "Policy violation",
  "suspended_by": "admin_phone"
}

// GET /api/admin/merchants/pending
// Get pending merchants for approval
Response: [ { merchant objects } ]
```

#### Product Routes

```javascript
// POST /api/merchants/<merchant_id>/products
// Add product
{
  "name": "Product Name",
  "description": "...",
  "price": 500.00,
  "stock": 10,
  "category": "category_id",
  "image_urls": ["url1", "url2"]
}

// GET /api/merchants/<merchant_id>/products
// Get merchant's products

// PUT /api/products/<id>
// Update product
{ "name": "...", "price": 600, "stock": 5 }

// DELETE /api/products/<id>
// Delete product
{ "merchant_id": "merchant_uuid" }

// GET /api/products/<id>
// Get product details

// GET /api/products/search?q=pizza&category=food&merchant_id=...
// Search products with filters
Response: [ { product objects } ]
```

#### Order Routes

```javascript
// POST /api/orders
// Create new order
{
  "customer_phone": "263784123456",
  "items": [
    { "id": "product_id", "quantity": 2, "price": 500 },
    { "id": "product_id2", "quantity": 1, "price": 1000 }
  ],
  "total": 2000.00,
  "delivery_type": "delivery|pickup",
  "delivery_address": "123 Main St, Harare"
}

Response:
{
  "id": "order_uuid",
  "customer_phone": "263784123456",
  "status": "pending",
  "total": 2000.00,
  "items": [...],
  "created_at": "2025-11-22T10:45:00Z",
  "estimated_time": "30 mins"
}

// GET /api/orders/<id>
// Get order details

// PUT /api/orders/<id>
// Update order status
{
  "status": "preparing|ready|out_for_delivery|delivered|cancelled",
  "updated_by": "merchant_phone"
}

// GET /api/merchants/<id>/orders?status=pending&timeframe=today
// Get merchant's orders

// GET /api/customers/<phone>/orders
// Get customer's order history
```

#### Analytics Routes

```javascript
// GET /api/merchants/<id>/analytics?timeframe=today|week|month
// Merchant analytics
Response:
{
  "orders_today": 5,
  "revenue_today": 2500,
  "total_orders": 150,
  "total_revenue": 50000,
  "top_products": [...],
  "repeat_rate": 45,
  "peak_hours": "12-14"
}

// GET /api/admin/analytics
// System-wide analytics
Response:
{
  "total_users": 1000,
  "customer_count": 850,
  "merchant_count": 150,
  "total_orders": 5000,
  "total_revenue": 500000,
  "active_stores": 140,
  "avg_response_time": 250
}
```

#### Admin Routes

```javascript
// GET /api/admin/alerts
// System alerts for admin
Response: [ { alert objects with title, description, severity } ]

// POST /api/admin/broadcasts
// Send broadcast message to all/merchants/customers
{
  "admin_id": "admin_phone",
  "message": "System maintenance at 22:00 UTC",
  "recipient_type": "all|merchants|customers"
}

Response: { "recipients_count": 850 }
```

---

## Phase 2: Bot Configuration

### 2.1 Environment Setup

Create `.env` file in `/whatsapp-bot/`:

```env
# Backend URLs
API_BASE_URL=http://localhost:5173          # or your backend URL
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Bot Settings
BOT_PREFIX=!
BOT_WEBHOOK_PORT=3001
BOT_API_PORT=4001
LOG_LEVEL=info

# Admin Phones (comma-separated, no spaces)
ADMIN_PHONES=263781234567,263789876543

# Optional
DEBUG=false
```

### 2.2 Start the Bot

```bash
cd whatsapp-bot

# Install dependencies
npm install

# Run modular bot
npm run dev            # Uses nodemon on bot-modular.js
# or
node bot-modular.js

# Or run with API server
npm run all
```

---

## Phase 3: Webhook Configuration

### 3.1 Backend → Bot Webhooks

Your backend should POST to these Bot webhook endpoints to send updates to users.

#### Order Update Notification

```javascript
// When order status changes, notify customer
POST http://localhost:3001/webhook/order-update
{
  "orderId": "order_uuid",
  "status": "preparing",
  "customerPhone": "263784123456",
  "merchantId": "merchant_uuid"
}

Response:
{
  "success": true,
  "message": "Notification sent to customer"
}
```

#### Merchant Approval Notification

```javascript
POST http://localhost:3001/webhook/merchant-approved
{
  "merchantPhone": "263781234567",
  "businessName": "John's Pizza Shop"
}
```

#### Product Updated Notification

```javascript
POST http://localhost:3001/webhook/product-updated
{
  "merchantPhone": "263781234567",
  "productName": "Margherita Pizza",
  "action": "added|updated|deleted"
}
```

### 3.2 Bot → Backend Integration

Bot automatically calls your backend for:

- **User Registration** → `POST /api/auth/register`
- **OTP Verification** → `POST /api/auth/login`
- **Merchant Approval** → `POST /api/admin/merchants/<id>/approve`
- **Order Creation** → `POST /api/orders`
- **Order Updates** → `PUT /api/orders/<id>`
- **Analytics Fetch** → `GET /api/merchants/<id>/analytics`

All requests include:
```
Headers:
  Content-Type: application/json
  User-Agent: SmartWhatsAppBot/1.0
```

---

## Phase 4: Testing Integration

### 4.1 Test Auth Flow

```bash
# 1. Open WhatsApp chat with bot number
# 2. Send registration

!register John customer

# Bot responds with welcome message

# 3. Send login
!login

# Bot sends: "OTP Sent"
# Backend sends OTP via email/SMS

# 4. Send verification (use OTP received)
!verify 123456

# Bot responds: "Login Successful"
```

### 4.2 Test Merchant Flow

```bash
# 1. Register as merchant
!register "Jane's Store" merchant

# 2. Check pending approval
# (Admin sees in: !admin merchants pending)

# 3. Admin approves
# (Only admin can do: !admin approve <merchant_id>)

# 4. Merchant receives approval notification
# Merchant can now add products

!merchant add-product

# 5. Add products
(Multi-step flow - follow prompts)

# 6. View orders
!merchant orders new

# 7. Update order
!merchant update-status <order_id> ready
```

### 4.3 Test Customer Flow

```bash
# 1. Register as customer
!register John customer

# 2. Browse products
!menu
!search pizza

# 3. Add to cart
!add prod_123 2

# 4. View cart
!cart

# 5. Checkout
!checkout

# Bot creates order, customer receives confirmation

# 6. Track order
!track <order_id>

# Receives updates as merchant changes status
```

### 4.4 Test Admin Flow

```bash
# Only admin phones can use admin commands

# List pending merchants
!admin merchants pending

# Approve merchant
!admin approve <merchant_id>

# View sales
!admin sales today

# Send broadcast
!admin broadcast "System maintenance at 22:00"

# View alerts
!admin alerts
```

### 4.5 cURL Testing

```bash
# Test bot health
curl http://localhost:3001/health

# Test webhook (simulate order update)
curl -X POST http://localhost:3001/webhook/order-update \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_123",
    "status": "ready",
    "customerPhone": "263784123456"
  }'

# Test bot API
curl -X POST http://localhost:4001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "phone_number": "263784123456",
    "role": "customer"
  }'
```

---

## Phase 5: Error Handling

### 5.1 Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to send message" | Connection issue | Check bot is connected (scan QR) |
| "You are not authorized" | Not an admin/merchant | Check ADMIN_PHONES in .env |
| "Product not found" | Invalid product ID | Check product exists in backend |
| "Rate limit exceeded" | Too many requests | Wait before sending more |
| "Failed to create order" | API error | Check backend is running |
| "OTP invalid" | Wrong code | Request new OTP |

### 5.2 Logging & Debugging

```bash
# Enable debug logging
DEBUG=true npm run dev

# Watch logs in real-time
tail -f logs/*.log

# Check cache
ls -la cache/
cat cache/sessions/<phone>.json
```

### 5.3 Retry Queue

Failed API requests automatically retry:
- First retry: 1 second
- Second retry: 2 seconds
- Third retry: 4 seconds

Check queue status:
```bash
cat cache/retry_queue.json
```

---

## Phase 6: Performance Optimization

### 6.1 Caching Strategy

- **Sessions**: 24 hours (cache)
- **Carts**: 2 hours (cache)
- **Products**: 15 minutes (cache)
- **Merchants**: 30 minutes (cache)

Bot automatically refreshes when:
- User logs in
- New product added
- Store details updated

### 6.2 Rate Limiting

Current limits per minute per user:
- Messages: 100
- Commands: 5 per command
- Image uploads: 10
- API calls: 50

Adjust in `src/config/constants.js` if needed.

### 6.3 Connection Optimization

- Auto-reconnect with exponential backoff
- Maximum 5 reconnection attempts
- Initial backoff: 5 seconds
- Message queue for offline periods

---

## Phase 7: Monitoring & Maintenance

### 7.1 Health Checks

```bash
# Check bot is connected
curl http://localhost:3001/health

# Expected response:
{
  "status": "connected",
  "bot": "smart-whatsapp-modular",
  "uptime": 3600.5,
  "timestamp": "2025-11-22T15:30:45.123Z"
}
```

### 7.2 Uptime Monitoring

Set up monitoring to check `/health` endpoint every 5 minutes:

```javascript
setInterval(async () => {
  const response = await fetch('http://localhost:3001/health');
  if (!response.ok) {
    // Alert: Bot is down
    // Restart bot
  }
}, 300000); // 5 minutes
```

### 7.3 Log Monitoring

Monitor these log patterns for issues:

```
❌ Error in          - Command processing failed
⚠️  Reconnecting...   - Connection lost
❌ API Request Failed - Backend unreachable
Rate limit exceeded  - User sending too fast
```

---

## Phase 8: Security Checklist

- [ ] Admin phones in `.env` only (not in code)
- [ ] Validate all user inputs server-side
- [ ] Use HTTPS for webhook calls
- [ ] Never log sensitive data (tokens, OTPs)
- [ ] Implement rate limiting on backend too
- [ ] Validate image file types/sizes
- [ ] Use environment variables for secrets
- [ ] Rotate admin phone list regularly
- [ ] Monitor for suspicious activity
- [ ] Implement CORS restrictions on webhook

---

## Phase 9: Deployment

### 9.1 Production Setup

```bash
# Install PM2 for process management
npm install -g pm2

# Start bot with PM2
pm2 start bot-modular.js --name "whatsapp-bot"

# Monitor
pm2 monit

# View logs
pm2 logs whatsapp-bot

# Save configuration
pm2 save
pm2 startup
```

### 9.2 Environment

```env
# Production values
NODE_ENV=production
LOG_LEVEL=info
DEBUG=false
BOT_WEBHOOK_PORT=443    # Use reverse proxy
API_BASE_URL=https://api.example.com
```

### 9.3 Docker (Optional)

```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "bot-modular.js"]
```

```bash
docker build -t whatsapp-bot .
docker run --env-file .env -p 3001:3001 -p 4001:4001 whatsapp-bot
```

---

## Phase 10: Support & Troubleshooting

### Common Issues

**Bot not receiving messages:**
- Verify bot account is connected (check QR scan)
- Check message format (must be plain text, not media)
- Verify bot is in contacts
- Restart bot: `pm2 restart whatsapp-bot`

**Backend API calls failing:**
- Check API endpoint is correct in `.env`
- Verify backend is running and accessible
- Check network connectivity
- Review error logs for specific failures
- Check authorization headers

**Customers not receiving notifications:**
- Verify webhook URLs are correct
- Check bot is connected
- Monitor webhook logs
- Verify customer phone numbers are normalized

**Performance issues:**
- Check cache size: `du -sh cache/`
- Increase cache TTL for frequently accessed data
- Implement cache cleanup (old sessions)
- Monitor bot memory usage: `ps aux | grep node`

---

## Summary

✅ Implement all required backend endpoints
✅ Configure bot with API_BASE_URL
✅ Set up webhook receivers in bot
✅ Configure webhook senders in backend
✅ Test all flows end-to-end
✅ Monitor logs and health checks
✅ Implement error handling
✅ Deploy with PM2 or Docker

For detailed API documentation, see `ARCHITECTURE_GUIDE.md`

---

Last Updated: November 22, 2025
