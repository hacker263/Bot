# ✨ WhatsApp Bot + Dashboard - Complete Integration

**Status**: ✅ READY TO RUN  
**Cost**: 🆓 ZERO (No paid services)  
**Setup Time**: ⚡ 5 minutes  

---

## 🎯 What This Is

A **fully integrated WhatsApp bot** that:
- Runs on your local machine
- Syncs all data with a beautiful React dashboard
- No external dependencies or database needed
- All data stored locally in JSON files

### Use Cases
- 🛍️ Customer orders via WhatsApp
- 🏪 Merchant store management
- 📦 Product inventory
- 💰 Sales tracking  
- ⭐ Ratings and favorites
- 📊 Admin analytics

---

## ⚡ Quick Start (3 Commands)

```bash
# 1. Install dependencies (one time)
npm install

# 2. Start everything
npm run dev:all

# 3. Scan WhatsApp QR when prompted
```

That's it! You now have:
- 🎨 Dashboard at http://localhost:5173
- 🔌 API at http://localhost:5174
- 🤖 Bot waiting for WhatsApp

---

## 📚 How It Works

### Simple Flow

```
User sends WhatsApp message
     ↓
Bot receives command (!register, !checkout, etc)
     ↓
Bot calls Express API server on localhost:5174
     ↓
API server saves data to /data/*.json
     ↓
Dashboard queries same API
     ↓
Real-time UI updates with new data
```

### Zero External Services

```
BEFORE (Traditional Approach):
WhatsApp Bot → Supabase ❌ (requires account & setup)
           → Firebase ❌ (costs money)
           → Database ❌ (complex)

AFTER (This Solution):
WhatsApp Bot → Express API (localhost:5174)
            → /data/ folder (JSON files)
            → Dashboard UI (localhost:5173)
```

---

## 🚀 Starting the System

### Option 1: All-in-One (Easiest)
```bash
npm run dev:all
```

Starts in one command:
- Vite dev server (Dashboard UI)
- Express API server
- WhatsApp bot

All terminals visible, logs from all services.

### Option 2: Separate Terminals
```bash
# Terminal 1
npm run dev

# Terminal 2  
npm run api

# Terminal 3
npm run bot:dev
```

### Option 3: Using Script
```bash
bash start-all.sh
```

---

## 📱 WhatsApp Commands

All these commands automatically sync with the dashboard:

### User Commands
```
!register [name]    → Create account
!login              → Login
!profile            → View profile
!help               → Show all commands
```

### Customer Commands  
```
!menu               → Browse products
!search [term]      → Find products
!add [id] [qty]     → Add to cart
!cart               → View cart
!checkout           → Create order
!orders             → View my orders
```

### Merchant Commands
```
!merchant register  → Create store
!merchant products  → List your products
!merchant add       → Add product
!merchant orders    → View orders
```

### Admin Commands
```
!admin merchants    → List merchants
!admin pending      → View approvals needed
!admin approve [id] → Approve merchant
```

---

## 📊 Dashboard Features

Login at http://localhost:5173

### Merchant View
- ✅ Overview with stats (revenue, orders, products)
- ✅ Product management (create, edit, delete)
- ✅ Order tracking (view, update status)
- ✅ Sales analytics (trends, performance)
- ✅ Settings and profile

### Admin View
- ✅ Merchant management (approve, reject, suspend)
- ✅ System analytics
- ✅ Order monitoring
- ✅ User management
- ✅ System alerts

### Data Sync
- ✅ All bot-created data appears instantly
- ✅ No manual refresh needed
- ✅ Real-time updates
- ✅ Historical records

---

## 🗂️ Project Structure

```
/workspaces/Bot/
├── src/
│   ├── server/
│   │   └── index.js             ← EXPRESS API SERVER (NEW!)
│   ├── pages/                   ← Dashboard UI pages
│   ├── components/              ← React components
│   ├── services/                ← Dashboard services
│   └── contexts/                ← React contexts
├── whatsapp-bot/
│   └── src/
│       ├── handlers/            ← Command handlers
│       ├── api/
│       │   └── backendAPI.js    ← Already calls our API
│       └── config/
│           └── constants.js     ← Updated to use port 5174
├── data/                        ← JSON storage (auto-created)
│   ├── users.json
│   ├── merchants.json
│   ├── products.json
│   ├── orders.json
│   ├── carts.json
│   └── favorites.json
└── package.json                 ← Run scripts
```

---

## 🔌 API Endpoints

All endpoints run at `http://localhost:5174/api/`

### Authentication
```
POST   /api/auth/register              Register user
POST   /api/auth/login                 User login
GET    /api/users/:phone               Get user profile
```

### Merchants
```
POST   /api/merchants                  Create merchant
GET    /api/merchants                  List all
GET    /api/merchants/:id              Get merchant
PUT    /api/merchants/:id              Update merchant
GET    /api/admin/merchants/pending    List pending
POST   /api/admin/merchants/:id/approve
POST   /api/admin/merchants/:id/reject
```

### Products
```
POST   /api/merchants/:mid/products    Create product
GET    /api/merchants/:mid/products    List merchant products
GET    /api/products/:id               Get product
PUT    /api/products/:id               Update product
DELETE /api/products/:id               Delete product
GET    /api/products/search            Search products
```

### Orders
```
POST   /api/orders                     Create order
GET    /api/orders/:id                 Get order
PUT    /api/orders/:id                 Update order
GET    /api/customers/:phone/orders    Customer orders
GET    /api/merchants/:id/orders       Merchant orders
```

### Cart & More
```
POST   /api/carts/sync                 Sync cart
GET    /api/carts/:phone               Get cart
DELETE /api/carts/:phone               Clear cart
POST   /api/favorites/:phone/:pid      Add favorite
DELETE /api/favorites/:phone/:pid      Remove favorite
```

---

## 🧪 Test It Out

### Test 1: Register User
```bash
# In WhatsApp:
!register John Smith

# Check /data/users.json - should have new user
# Login to dashboard - user should appear
```

### Test 2: Create Merchant
```bash
# In WhatsApp:
!merchant register

# Fill in store details
# Check dashboard - merchant in pending list
# As admin, approve merchant
```

### Test 3: Add Product
```bash
# As merchant in WhatsApp:
!merchant add

# Enter product details
# Check /data/products.json
# See in dashboard product list
```

### Test 4: Place Order
```bash
# As customer in WhatsApp:
!add [product-id] 2    # Add to cart
!checkout              # Create order

# Check /data/orders.json
# See in merchant's order list
# See in customer's order list
```

---

## 📁 Data Files

All data automatically saved to `/data/` as JSON:

### /data/users.json
```json
[
  {
    "id": "user-1234567890",
    "phone_number": "+263771234567",
    "name": "John Doe",
    "role": "customer",
    "created_at": "2025-11-23T10:30:00Z"
  }
]
```

### /data/merchants.json
```json
[
  {
    "id": "merchant-1234567890",
    "phone_number": "+263771234567",
    "store_name": "John's Store",
    "status": "approved",
    "created_at": "2025-11-23T10:35:00Z"
  }
]
```

### /data/orders.json
```json
[
  {
    "id": "order-1234567890",
    "merchant_id": "merchant-123",
    "customer_phone": "+263771234567",
    "items": [{"productId": "prod-123", "quantity": 2}],
    "total": 50.00,
    "status": "pending"
  }
]
```

---

## 🛠️ NPM Scripts

```bash
npm run dev              # Just dashboard
npm run api              # Just API server
npm run bot:dev          # Just bot
npm run dev:all          # ALL THREE (recommended!)
npm run build            # Build for production
```

---

## 🔧 Configuration

### Change Bot Prefix
Edit `/workspaces/Bot/whatsapp-bot/src/config/constants.js`:
```javascript
BOT_PREFIX: '!'  // Change to any character
```

### Change Ports
- Dashboard: Edit `vite.config.ts`
- API: Set `API_PORT` environment variable
- Bot: Edit constants.js

### Database Location
Data stored in `/data/` by default. To change:
Edit `src/server/index.js` line where `DATA_DIR` is set.

---

## ⚠️ Troubleshooting

### "Cannot connect to API"
```bash
# Make sure API server is running
npm run api

# Check it's working:
curl http://localhost:5174/health
```

### "WhatsApp bot won't connect"
```bash
# Delete auth files and scan QR again
rm -rf whatsapp-bot/auth_info_baileys
npm run bot:dev
```

### "Data not persisting"
```bash
# Check /data folder exists:
ls -la data/

# Check file permissions:
chmod -R 755 data/

# Restart API:
npm run api
```

### "Port already in use"
```bash
# Port 5173 in use:
API_PORT=5175 npm run api

# Or kill the process:
lsof -ti:5174 | xargs kill -9
```

---

## 🎨 Customization

### Add New Dashboard Pages
1. Create component in `src/pages/`
2. Add route to `src/App.tsx`
3. New page can call any API endpoint

### Add New Commands
1. Create handler in `whatsapp-bot/src/handlers/`
2. Import in `index.js`
3. Call API endpoints via `backendAPI`

### Customize Styling
Dashboard uses Tailwind CSS. Edit `src/index.css` or component classes.

---

## 🚀 Deployment

Ready for production? Options:

### Local Network (Share with Team)
```bash
# Get your IP:
ipconfig getifaddr en0  # Mac/Linux

# Share: http://YOUR_IP:5173
```

### Public Internet
- Railway.app (free tier available)
- Heroku (alternative)
- DigitalOcean App Platform
- Docker on any server

See `BOT_DASHBOARD_DEPLOYMENT_GUIDE.md` for detailed steps.

---

## 🆓 Why This Approach

### Costs Comparison

| Solution | Cost | Setup | Maintenance |
|----------|------|-------|-------------|
| **This Project** | $0 | 5 min | None |
| Supabase | $0-25/mo | 15 min | Database |
| Firebase | $0-100+/mo | 20 min | Complex |
| Commercial Bot | $50-500/mo | 1 hour | License |

### Benefits
✅ **No Hidden Costs** - Completely free  
✅ **Full Control** - Source code yours  
✅ **Offline Ready** - Works without internet  
✅ **Instant Sync** - Real-time updates  
✅ **Scalable** - Grows with your needs  
✅ **Easy to Fork** - Copy and modify freely  

---

## 📖 Documentation

- **[Quick Start Guide](./BOT_DASHBOARD_INTEGRATION_QUICK_START.md)** - Step-by-step setup
- **[API Documentation](./whatsapp-bot/src/api/ENDPOINTS.md)** - All endpoints
- **[Deployment Guide](./BOT_DASHBOARD_DEPLOYMENT_GUIDE.md)** - Going live
- **[Troubleshooting](./BOT_DASHBOARD_TROUBLESHOOTING.md)** - Common issues

---

## 🤝 Contributing

Want to add features?

1. Fork the project
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

---

## 📞 Support

- **Commands not working?** Check bot logs in terminal
- **API errors?** Check API server logs
- **Dashboard issues?** Check browser console (F12)
- **Data missing?** Check `/data/` folder

---

## 📄 License

MIT - Free to use and modify

---

## 🎉 Ready?

```bash
npm run dev:all
```

Then:
1. 📱 Scan WhatsApp QR
2. 🎨 Open dashboard at http://localhost:5173
3. 💬 Start sending commands from WhatsApp!

That's it! Everything syncs automatically. 🚀

---

**Last Updated**: November 2025  
**Status**: ✅ Production Ready  
**Version**: 1.0  

