# 🚀 Bot + Dashboard Complete Integration Guide

**Status**: ✅ Ready to Run (Zero-Cost)  
**Date**: November 2025  
**Architecture**: Vite React Dashboard + Express API + WhatsApp Bot

---

## 🎯 What You Have

- **Dashboard UI** (Port 5173): React/Vite interface for viewing bot data
- **Express API Server** (Port 5174): Middleware that syncs bot ↔ dashboard
- **WhatsApp Bot**: Sends commands from WhatsApp, syncs data to API
- **File-Based Storage**: No database needed - uses JSON files in `/data`

---

## ⚡ Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
cd /workspaces/Bot
npm install
```

This installs:
- Vite + React (dashboard frontend)
- Express + CORS + Body-Parser (API server)
- Concurrently (run multiple servers)
- Nodemon (auto-reload on changes)

### Step 2: Start Everything

#### Option A: All-in-One Command
```bash
npm run dev:all
```

This starts simultaneously:
- 🎨 Dashboard: http://localhost:5173
- 🔌 API Server: http://localhost:5174  
- 🤖 WhatsApp Bot: Waiting for QR scan

#### Option B: Start Separately
```bash
# Terminal 1: Dashboard UI
npm run dev

# Terminal 2: API Server
npm run api

# Terminal 3: WhatsApp Bot
npm run bot:dev
```

### Step 3: Scan WhatsApp QR

- Open WhatsApp and scan QR from bot terminal
- Bot is now ready to receive commands!

---

## 🔄 How It Works

### User Registration Flow

```
User in WhatsApp:
  ↓
Sends: !register John Doe
  ↓
Bot Handler receives command
  ↓
Calls backendAPI.registerUser(phone, name)
  ↓
Express API Server saves to /data/users.json
  ↓
Returns success response
  ↓
Data now visible in Dashboard UI
```

### Data Sync Chain

```
WhatsApp Bot Command
    ↓
backendAPI.* method (existing)
    ↓
HTTP POST/GET to localhost:5174
    ↓
Express API Server
    ↓
Read/Write /data/*.json files
    ↓
Response back to bot
    ↓
Bot displays result + caches locally
    ↓
Dashboard can query same API
    ↓
Real-time UI update
```

---

## 📋 API Endpoints (Automatic Sync)

All these endpoints are ready to use by bot handlers:

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/users/:phone
```

### Merchants
```
POST   /api/merchants
GET    /api/merchants
GET    /api/merchants/:id
PUT    /api/merchants/:id
GET    /api/admin/merchants/pending
POST   /api/admin/merchants/:id/approve
POST   /api/admin/merchants/:id/reject
```

### Products
```
POST   /api/merchants/:merchantId/products
GET    /api/merchants/:merchantId/products
GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/products/search
```

### Orders
```
POST   /api/orders
GET    /api/orders/:id
PUT    /api/orders/:id
GET    /api/customers/:phone/orders
GET    /api/merchants/:merchantId/orders
```

### Cart & More
```
POST   /api/carts/sync
GET    /api/carts/:phone
DELETE /api/carts/:phone
POST   /api/favorites/:phone/:productId
DELETE /api/favorites/:phone/:productId
GET    /api/favorites/:phone
```

---

## 🤖 Bot Commands (Already Working)

### User Commands
```
!register [name]    → Creates user in API
!login              → Verifies in API
!profile            → Shows profile
!help               → Shows commands
```

### Customer Commands
```
!menu               → Lists products from API
!search [item]      → Searches products
!add [id] [qty]     → Adds to cart
!cart               → Shows cart items
!checkout           → Creates order in API
!orders             → Shows your orders
```

### Merchant Commands
```
!merchant register  → Creates merchant (saved to API)
!merchant products  → Lists your products
!merchant add       → Adds product (saved to API)
!merchant orders    → Shows your orders
!merchant dashboard → Shows analytics
```

### Admin Commands
```
!admin merchants    → Lists merchants from API
!admin pending      → Shows pending approvals
!admin approve [id] → Approves merchant (API updated)
```

---

## 📊 File Storage Structure

Data is automatically saved in `/data/`:

```
/data/
├── users.json          # All registered users
├── merchants.json      # Merchant profiles
├── products.json       # Product listings
├── orders.json         # Customer orders
├── carts.json          # Shopping carts
├── favorites.json      # User favorites
└── (auto-created)
```

### Example: `/data/users.json`
```json
[
  {
    "id": "user-1234567890",
    "phone_number": "+263700000000",
    "name": "John Doe",
    "role": "customer",
    "created_at": "2025-11-23T10:30:00Z",
    "updated_at": "2025-11-23T10:30:00Z"
  }
]
```

---

## 🎨 Dashboard Features

### Merchant Dashboard (After Login)
- **Overview**: Stats, revenue, orders
- **Products**: Create, edit, delete products
- **Orders**: View, update order status
- **Analytics**: Sales data, trends
- **Settings**: Profile management

### Admin Dashboard
- **Merchants**: List, approve, reject, suspend
- **Analytics**: System-wide metrics
- **Orders**: Monitor all orders
- **Users**: User management

---

## 🔗 Integration Points

### Where Bot Syncs Data

1. **AuthHandler** (`src/handlers/authHandler.js`)
   - `handleRegisterCommand()` → calls `backendAPI.registerUser()`
   - `handleLoginCommand()` → calls `backendAPI.getUser()`

2. **MerchantHandler** (`src/handlers/merchantHandler.js`)
   - Merchant registration → API saves to merchants.json
   - Product operations → API saves to products.json
   - Order operations → API reads/writes orders.json

3. **CustomerHandler** (`src/handlers/customerHandler.js`)
   - Shopping actions → Cart synced to carts.json
   - Checkout → Order created in orders.json

4. **AdminHandler** (`src/handlers/adminHandler.js`)
   - Approval actions → merchant status updated in API

---

## ✅ Testing the Integration

### Test 1: User Registration
```bash
# In WhatsApp:
!register Jane Smith

# Check dashboard - user should appear
# Check /data/users.json - user saved
```

### Test 2: API Direct Call
```bash
# Register via API directly:
curl -X POST http://localhost:5174/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+263700000001",
    "name": "Test User",
    "role": "customer"
  }'

# Response shows user created
# Visible in dashboard
```

### Test 3: Merchant Registration
```bash
# In WhatsApp:
!merchant register

# Follow prompts to fill merchant details
# Check /data/merchants.json
# Should appear in admin pending list
```

### Test 4: Product Creation
```bash
# As merchant in WhatsApp:
!merchant add

# Enter product name, price, stock
# Check /data/products.json
# Should appear in merchant's product list
```

### Test 5: Place Order
```bash
# As customer in WhatsApp:
!menu              → See products
!add [product-id] 2 → Add to cart
!checkout          → Create order

# Check /data/orders.json
# Should appear in merchant's orders
# Should appear in customer's orders
```

---

## 🐛 Troubleshooting

### "Cannot GET http://localhost:5174"
- Ensure API server is running: `npm run api`
- Check no firewall blocking port 5174

### "User not found" when registering via bot
- API server might not be running
- Check `/data/users.json` exists and has content
- Restart API: `npm run api`

### Dashboard shows no data
- Ensure API server running
- Check `/data/` folder exists with JSON files
- Reload dashboard page

### Bot commands work but data doesn't sync
- Check bot is using correct API_BASE_URL (should be `http://localhost:5174`)
- Check `backendAPI.js` in bot is being used
- Monitor API server logs for requests

### Files in /data/ not updating
- Check permissions on `/data/` folder
- Restart API server
- Check for errors in API console

---

## 🚀 Running on Different Machines

### Locally Only (Both on Same Machine)
```bash
npm run dev:all
# Everything runs on localhost
# Works offline
# Perfect for development
```

### On Network (Share Between Machines)
```bash
# Get your machine IP
ipconfig getifaddr en0    # Mac/Linux
ipconfig                  # Windows (look for IPv4)

# Update environment:
API_BASE_URL=http://YOUR_IP:5174 npm run bot:dev
```

### Production Deployment
See `BOT_DASHBOARD_DEPLOYMENT_GUIDE.md` for:
- Railway.app
- Heroku
- DigitalOcean
- Docker deployment

---

## 📈 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    WhatsApp Network                         │
└────────────────────────────────┬────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   WhatsApp Bot          │
                    │  (backendAPI calls)     │
                    └────────────┬────────────┘
                                 │
          ┌──────────────────────┴──────────────────────┐
          │                                             │
          │  localhost:5174/api/*                       │
          │                                             │
    ┌─────▼──────────────────────────────────────┐    
    │    Express API Server                      │    
    │  (/src/server/index.js)                    │    
    │  - Request validation                      │    
    │  - File I/O operations                     │    
    │  - CORS headers                            │    
    └─────┬──────────────────────────────────────┘    
          │                                             
    ┌─────▼──────────────────────────────────────┐    
    │    /data/*.json Files                      │    
    │  ├── users.json                            │    
    │  ├── merchants.json                        │    
    │  ├── products.json                         │    
    │  ├── orders.json                           │    
    │  ├── carts.json                            │    
    │  └── favorites.json                        │    
    └──────────────────────────────────────────────┐    
          │                                          │
          │ localhost:5174 (API responses)          │
          │                                          │
    ┌─────▼──────────────────────────────────────┐
    │  Vite React Dashboard                      │
    │  (localhost:5173)                          │
    │  ├── Merchant Dashboard                    │
    │  ├── Admin Dashboard                       │
    │  └── User Interface                        │
    └────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
/workspaces/Bot/
├── src/
│   ├── server/
│   │   └── index.js            ← Express API Server (NEW)
│   ├── pages/                  ← Dashboard UI
│   ├── components/
│   ├── services/
│   └── contexts/
├── whatsapp-bot/
│   └── src/
│       ├── handlers/           ← Use backendAPI
│       ├── api/
│       │   └── backendAPI.js   ← Already correct
│       ├── config/
│       │   └── constants.js    ← Updated to use :5174
│       └── index.js
├── data/                       ← JSON storage (auto-created)
├── package.json                ← Updated scripts
└── vite.config.ts
```

---

## 🎯 Next Steps

1. ✅ **Run Everything**: `npm run dev:all`
2. ✅ **Test Registration**: Send `!register Test` in WhatsApp
3. ✅ **Check Dashboard**: Open http://localhost:5173
4. ✅ **View Data**: Check http://localhost:5174/api/users
5. ✅ **Scale Up**: Create merchants, products, orders

---

## 💡 Features

✅ **Zero-Cost**: No paid services needed  
✅ **Self-Contained**: Runs on single machine  
✅ **Real-Time Sync**: Bot ↔ Dashboard instant updates  
✅ **Persistent Storage**: All data in JSON files  
✅ **Scalable**: Can migrate to database later  
✅ **Complete Integration**: All commands sync automatically  
✅ **Dashboard Ready**: View all bot data in UI  
✅ **Developer Friendly**: Easy to modify and extend  

---

## 📞 Support

- **Bot not syncing?** Check if API running on :5174
- **Data not appearing?** Restart API server
- **Port conflicts?** Change in constants.js or environment
- **More help?** Check logs in each terminal

---

## 🎉 You're All Set!

Everything is configured and ready. Just run:

```bash
npm run dev:all
```

Then scan the WhatsApp QR and start using the bot. All data automatically syncs to the dashboard!

