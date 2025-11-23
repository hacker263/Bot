# Bot + Dashboard Integration Testing Guide

## 🧪 Pre-Testing Checklist

- [ ] Environment variables configured (`.env` file)
- [ ] Supabase project created and credentials set
- [ ] Database tables created (automatic on first run)
- [ ] Node dependencies installed (`npm install`)
- [ ] Port 3000 available (Dashboard server)
- [ ] WhatsApp account ready for scanning

## 📋 Testing Phases

### Phase 1: Database Connection

#### Test 1.1: Database Initialization
```bash
cd /workspaces/Bot/whatsapp-bot
npm start
```

**Expected Output:**
```
✅ Database initialized successfully
✅ Bot initialized successfully
```

**Check List:**
- [ ] No database connection errors
- [ ] Tables visible in Supabase dashboard
- [ ] Connection pool active
- [ ] Health check shows `databaseConnected: true`

#### Test 1.2: Health Check
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "connected",
  "databaseConnected": true,
  "uptime": 45.2,
  "timestamp": "2024-01-15T10:30:45.123Z",
  "dashboardUrl": "http://localhost:3000"
}
```

---

### Phase 2: User Registration (Auth Handler)

#### Test 2.1: Bot Command Registration
1. Open WhatsApp
2. Send: `!register John Doe`
3. Bot responds with interactive buttons

**Expected Flow:**
```
User: !register John Doe
Bot: Select your role:
     [👤 Customer] [🏪 Merchant]
```

**Database Verification:**
```sql
-- Check users table in Supabase
SELECT * FROM users WHERE phone = 'sender_phone' LIMIT 1;

-- Expected columns:
-- id, phone, name, role, email, verified, created_at, last_login
```

#### Test 2.2: User Selection
1. Click "Customer" button
2. Check response confirmation

**Expected:**
- User saved to database
- Session cached locally
- Confirmation message with user ID

#### Test 2.3: Login Command
1. Send: `!login`
2. Bot requests phone/password
3. Bot verifies in database

**Database Verification:**
```sql
SELECT last_login FROM users WHERE phone = 'sender_phone';
-- Should show updated timestamp
```

---

### Phase 3: Product Management (Merchant Handler)

#### Test 3.1: Merchant Registration
1. Send: `!merchant register`
2. Fill in merchant details
3. Submit

**Expected Flow:**
```
User: !merchant register
Bot: What's your store name?
User: [John's Clothing]
Bot: Store category?
User: [Clothing & Fashion]
... (collect details)
Bot: Registration submitted! Status: Pending approval
```

**Database Verification:**
```sql
SELECT * FROM merchants WHERE user_id = 'user_id' LIMIT 1;

-- Expected status: 'pending'
-- Expected fields: store_name, category, description, logo_url
```

#### Test 3.2: Add Product
1. Send: `!merchant add-product`
2. Fill product details (name, price, stock, description)
3. Submit

**Expected:**
- Product saved to database
- Merchant receives confirmation
- Product visible in product list

**Database Verification:**
```sql
SELECT * FROM products WHERE merchant_id = 'merchant_id' LIMIT 1;

-- Expected columns:
-- id, merchant_id, name, price, stock, images (JSON), ratings
```

---

### Phase 4: Shopping & Orders (Customer Handler)

#### Test 4.1: Browse & Add to Cart
1. Send: `!menu`
2. Browse products
3. Send: `!add product_id quantity`

**Expected:**
- Cart updated locally
- Confirmation message

**Database Verification:**
```sql
SELECT * FROM carts WHERE user_id = 'user_id' LIMIT 1;

-- Expected structure:
-- {
--   items: [{product_id, quantity, price}],
--   total: 50.00,
--   updated_at: timestamp
-- }
```

#### Test 4.2: Checkout
1. Send: `!checkout`
2. Confirm payment method
3. Verify order creation

**Expected Response:**
```
✅ Order Created Successfully!
📦 Order #ORD-12345
💰 Total: $50.00
📍 Status: Pending
⏱️ Estimated Delivery: 2-3 days
```

**Database Verification:**
```sql
SELECT * FROM orders WHERE user_id = 'user_id' LIMIT 1;

-- Expected structure:
-- id, user_id, merchant_id, items (JSON array)
-- total, status ('pending', 'shipped', 'delivered')
-- delivery_address, delivery_date, rating_id
```

---

### Phase 5: API Endpoint Testing

#### Test 5.1: Authentication Endpoints

**Register via API:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+263700000000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "phone": "+263700000000",
    "name": "John Doe",
    "role": "customer",
    "verified": false
  }
}
```

**Login via API:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+263700000000",
    "password": "user_password"
  }'
```

#### Test 5.2: Product Endpoints

**Create Product (Merchant):**
```bash
curl -X POST http://localhost:3000/api/merchants/{merchantId}/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "T-Shirt",
    "description": "Blue cotton t-shirt",
    "price": 25.00,
    "stock": 100,
    "images": ["https://..."]
  }'
```

**Get Merchant Products:**
```bash
curl http://localhost:3000/api/merchants/{merchantId}/products
```

**Search Products:**
```bash
curl "http://localhost:3000/api/products/search?q=shirt&category=clothing&minPrice=10&maxPrice=50"
```

#### Test 5.3: Order Endpoints

**Get Customer Orders:**
```bash
curl http://localhost:3000/api/customers/{phone}/orders
```

**Expected Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "ORD-12345",
      "items": [...],
      "total": 50.00,
      "status": "pending",
      "created_at": "2024-01-15T10:30:45Z"
    }
  ]
}
```

**Update Order Status (Admin):**
```bash
curl -X PUT http://localhost:3000/api/orders/{orderId} \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped"}'
```

#### Test 5.4: Merchant Endpoints

**Get Pending Merchants (Admin):**
```bash
curl http://localhost:3000/api/admin/merchants/pending
```

**Approve Merchant:**
```bash
curl -X POST http://localhost:3000/api/admin/merchants/{merchantId}/approve \
  -H "Content-Type: application/json"
```

**Merchant Analytics:**
```bash
curl http://localhost:3000/api/merchants/{merchantId}/analytics
```

---

### Phase 6: Real-time Sync Testing

#### Test 6.1: Bot → Database → API

**Scenario:**
1. User sends `!checkout` in WhatsApp
2. Order created in database
3. Query API endpoint for order
4. Verify data matches

**Steps:**
```bash
# 1. Get user phone from WhatsApp
USER_PHONE="+263700000000"

# 2. Check database
curl http://localhost:3000/api/customers/$USER_PHONE/orders

# 3. Verify latest order contains correct data
# Should show same order created via WhatsApp
```

#### Test 6.2: Database → API → Display

**Scenario:**
1. Admin approves merchant in dashboard
2. Database status updated
3. Bot retrieves and notifies merchant
4. Merchant receives confirmation

**Steps:**
```bash
# 1. Approve merchant via API
MERCHANT_ID="merchant-uuid"
curl -X POST http://localhost:3000/api/admin/merchants/$MERCHANT_ID/approve

# 2. Check merchant status
curl http://localhost:3000/api/merchants/$MERCHANT_ID

# 3. Bot should send notification automatically
# Check WhatsApp for merchant approval message
```

---

### Phase 7: Cache Validation

#### Test 7.1: Cache Hit Performance

**Before Cache:**
```bash
time curl http://localhost:3000/api/merchants/all
# Expected: ~100-200ms
```

**After Cache:**
```bash
# Second request within TTL
time curl http://localhost:3000/api/merchants/all
# Expected: ~10-20ms
```

#### Test 7.2: Cache Expiration

**Steps:**
1. Get merchant data (cached for 30 min)
2. Update merchant via API
3. Query immediately (should show old data from cache)
4. Wait 1 minute, query again (should show updated data)

```bash
# Time this for cache management verification
watch -n 10 'curl http://localhost:3000/api/merchants/MERCHANT_ID'
```

---

### Phase 8: Error Handling

#### Test 8.1: Database Connection Loss

**Simulate:**
1. Stop database server
2. Send bot command
3. Observe graceful error handling

**Expected:**
```
❌ Database connection lost
⚠️ Bot continues with local cache
✅ Reconnects when DB available
```

#### Test 8.2: Invalid Data

**Test Invalid Registration:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "invalid",
    "name": ""
  }'
```

**Expected:**
```json
{
  "success": false,
  "error": "Invalid phone format"
}
```

#### Test 8.3: Rate Limiting

**Send 101 requests in 15 minutes:**
```bash
for i in {1..101}; do
  curl http://localhost:3000/api/products 2>/dev/null
  echo "Request $i"
  sleep 1
done
```

**Expected:** 101st request returns 429 (Too Many Requests)

---

## 📊 Test Report Template

```markdown
## Integration Test Report
**Date:** 2024-01-15
**Tester:** John Doe
**Version:** Bot v2.0

### Phase Results
- [ ] Phase 1: Database ✅ PASSED
- [ ] Phase 2: Auth ✅ PASSED
- [ ] Phase 3: Merchants ✅ PASSED
- [ ] Phase 4: Orders ✅ PASSED
- [ ] Phase 5: API ✅ PASSED
- [ ] Phase 6: Sync ✅ PASSED
- [ ] Phase 7: Cache ✅ PASSED
- [ ] Phase 8: Errors ✅ PASSED

### Issues Found
1. Issue #1: [Description]
   - Severity: Critical/High/Medium/Low
   - Resolution: [How to fix]

### Performance Metrics
- Avg API Response: 50ms
- Database Query: 15ms
- Cache Hit Rate: 85%
- Error Rate: 0.2%

### Sign-Off
**Approved by:** [Name]
**Date:** [Date]
```

---

## 🔧 Debugging Commands

### View Logs
```bash
# Watch real-time logs
tail -f /workspaces/Bot/whatsapp-bot/bot.log

# View last 100 lines
tail -100 /workspaces/Bot/whatsapp-bot/bot.log

# Search for errors
grep "ERROR" /workspaces/Bot/whatsapp-bot/bot.log
```

### Database Queries

```sql
-- Count users
SELECT COUNT(*) as total_users FROM users;

-- Check recent orders
SELECT id, total, status, created_at FROM orders 
ORDER BY created_at DESC LIMIT 10;

-- Check merchant approvals
SELECT id, store_name, status FROM merchants 
WHERE status = 'pending';

-- Cache stats (from application)
SELECT COUNT(*) FROM carts WHERE user_id IS NOT NULL;
```

### API Status
```bash
# Check dashboard server
curl http://localhost:3000/health

# Check bot status
curl http://localhost:3000/api/bot/health

# Get all endpoints
curl http://localhost:3000/api/endpoints
```

---

## ✅ Sign-Off Checklist

Before marking as ready for production:

- [ ] All 8 phases passed
- [ ] No critical errors
- [ ] API response time < 100ms
- [ ] Database sync working
- [ ] Cache functioning properly
- [ ] Error handling graceful
- [ ] Rate limiting active
- [ ] Logs clean and informative
- [ ] Documentation complete
- [ ] Team approval obtained

