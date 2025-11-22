# WhatsApp Bot - Command Reference Card

## Quick Start
```bash
cd whatsapp-bot && node bot-modular.js
# Scan QR code
```

---

## CUSTOMER Commands 🛍️

**Authentication:**
- `!register John customer` - Sign up as customer
- `!login` - Initiate login
- `!verify 123456` - Verify OTP code

**Browsing:**
- `!menu` or `!m` - Show all products
- `!search pizza` - Search for items
- `!categories` - Show product categories
- `!nearby` - Show nearby stores
- `!store <id>` - View store details

**Shopping:**
- `!add prod_123 2` - Add 2 items to cart
- `!cart` or `!c` - View shopping cart
- `!remove 1` - Remove item from cart
- `!clear` - Clear entire cart

**Checkout:**
- `!checkout` or `!pay` - Place order
- `!orders` - View order history
- `!reorder order_123` - Reorder previous items
- `!track order_123` - Track order status
- `!rate order_123 5` - Rate order (1-5 stars)

**Preferences:**
- `!favorites [list|add|remove]` - Manage favorites
- `!addresses [list|add|remove]` - Manage addresses
- `!deals` - Show active deals

---

## MERCHANT Commands 🏪

**Orders:**
- `!merchant orders new` - View new orders
- `!merchant orders today` - Today's orders
- `!merchant orders week` - Weekly orders
- `!merchant accept order_123` - Accept order
- `!merchant reject order_123 reason` - Reject order
- `!merchant update-status order_123 ready` - Update status

**Products:**
- `!merchant products list` - View your products
- `!merchant products search query` - Search your products
- `!merchant add-product` - Add new product (multi-step)
- `!merchant edit-product prod_123` - Edit product
- `!merchant delete-product prod_123` - Delete product

**Store:**
- `!merchant store` - View store profile
- `!merchant store-status open` - Set status (open/closed/busy)
- `!merchant store-hours 08:00 20:00` - Set operating hours
- `!merchant store-profile` - Full store details

**Analytics:**
- `!merchant analytics today` - Today's analytics
- `!merchant analytics week` - Weekly analytics
- `!merchant analytics month` - Monthly analytics
- `!merchant dashboard` - Quick dashboard
- `!merchant settings` - Settings menu

---

## ADMIN Commands 👨‍💼

**Merchant Management:**
- `!admin merchants pending` - List pending merchants
- `!admin approve merchant_123` - Approve merchant
- `!admin reject merchant_123 reason` - Reject merchant
- `!admin suspend merchant_123 reason` - Suspend merchant

**Monitoring:**
- `!admin sales today` - Today's sales
- `!admin sales week` - Weekly sales
- `!admin sales month` - Monthly sales
- `!admin stats` - Full system statistics
- `!admin alerts` - Active system alerts
- `!admin logs errors` - Error logs

**Actions:**
- `!admin broadcast message` - Send broadcast to all
- `!admin metrics` - System metrics

---

## GENERAL Commands 🔑

- `!help [command]` - Show help menu
- `!profile` - View your profile
- `!logout` - Logout

---

## Order Statuses 📦

- ⏳ **pending** - Waiting for merchant
- ✅ **confirmed** - Merchant accepted
- 👨‍🍳 **preparing** - Being prepared
- 📦 **ready** - Ready for pickup/delivery
- 🚚 **out_for_delivery** - On the way
- ✅ **delivered** - Completed
- ❌ **cancelled** - Cancelled

---

## Configuration (.env)

```env
API_BASE_URL=http://localhost:5173
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=key
BOT_PREFIX=!
BOT_WEBHOOK_PORT=3001
ADMIN_PHONES=263781234567,263789876543
LOG_LEVEL=info
```

---

## Rate Limits

- **Messages:** 100/min per user
- **Commands:** 5/min per command
- **Image uploads:** 10/min
- **API calls:** 50/min

---

## Quick Testing

**Customer:** `!register Test customer` → `!login` → `!menu` → `!add prod_1 1` → `!checkout`

**Merchant:** `!register "Store" merchant` → (Admin approves) → `!merchant orders new`

**Admin:** (Set phone in .env) → `!admin merchants pending` → `!admin approve <id>`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not authorized" | Add phone to ADMIN_PHONES if admin |
| "Rate limit exceeded" | Wait before sending more messages |
| "Product not found" | Check product ID with backend |
| "Connection lost" | Bot auto-reconnects (max 5 attempts) |
| "Backend error" | Verify backend API is running |

---

**For full documentation see:** `ARCHITECTURE_GUIDE.md` and `BACKEND_INTEGRATION_GUIDE.md`
