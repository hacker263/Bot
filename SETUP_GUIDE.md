# Smart WhatsApp Bot Platform - Setup Guide

Complete guide to set up and run the entire system locally with Docker or with Supabase cloud database.

## Prerequisites

- Node.js 16+ and npm
- Docker and Docker Compose (optional, for local database)
- WhatsApp account (personal number for bot testing)
- Supabase account (already configured) OR local PostgreSQL

## Project Structure

```
project/
├── src/                          # Web platform (React + Vite)
│   ├── services/
│   │   ├── botApiClient.ts      # API client for bot functions
│   │   ├── botManager.ts        # Bot command/intent management
│   │   └── ...
│   └── pages/
├── whatsapp-bot/                # WhatsApp bot (Node.js + Baileys)
│   ├── enhanced-bot.js          # Main bot engine (new)
│   ├── bot.js                   # Legacy bot
│   └── package.json
├── docker-compose.yml           # Local database setup
├── docker/init.sql              # Database schema
└── .env.local                   # Local environment variables
```

## Option 1: Cloud Setup (Recommended for Quick Start)

### 1. Start the Web Platform

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# In another terminal, build for production
npm run build
```

Access at `http://localhost:5173`

### 2. Start the WhatsApp Bot

```bash
cd whatsapp-bot

# Install bot dependencies
npm install

# Start the enhanced bot
npm start

# For development with auto-reload
npm run dev

# Or run legacy bot
npm run bot:legacy
```

The bot will display a QR code. Scan it with WhatsApp on your phone to link the bot.

**Testing the Bot:**

Send messages from the number you linked:
- `!menu` - View products
- `!register John` - Register as customer
- `!search sadza` - Search products
- `!add Sadza 2` - Add 2 items to cart
- `!cart` - View cart
- `!checkout` - Place order
- `!status <order-id>` - Check order status
- Or natural language: "I want 2 sadza please"

## Option 2: Local Docker Setup

### 1. Start the Database Stack

```bash
# Create .env.local if not exists (already created)
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis
```

Services:
- **PostgreSQL**: `localhost:5432` (user: postgres, password: postgres)
- **Redis**: `localhost:6379`
- **pgAdmin**: `http://localhost:5050` (admin@example.com / admin)

### 2. Access Database

```bash
# Use pgAdmin (web UI)
# http://localhost:5050
# Add server with: host=postgres, user=postgres, password=postgres

# Or use psql from command line
docker-compose exec postgres psql -U postgres -d smart_whatsapp
```

### 3. Run Web Platform

```bash
# Update .env.local to use local database if needed
npm install
npm run dev
```

### 4. Run WhatsApp Bot

```bash
cd whatsapp-bot
npm install
npm start
```

### 5. Stop Everything

```bash
docker-compose down

# Remove volumes too (warning: deletes data)
docker-compose down -v
```

## Bot Features

### Command-Based Interface

**Prefix**: `!` (configurable via `BOT_PREFIX` env var)

#### Customer Commands
```
!register [name]        - Register as customer
!menu / !m             - Browse all products
!search [query]        - Search for products
!add [product] [qty]   - Add items to cart
!cart / !c             - View shopping cart
!remove [product]      - Remove from cart
!clear                 - Empty cart
!checkout / !pay       - Place order
!status [order-id]     - Track order
!orders                - View your orders
!help                  - Show all commands
```

#### Merchant Commands
```
!orders                - View all orders
!orders [status]       - Filter by status (pending, confirmed, delivered)
!dashboard             - Business statistics
```

#### Admin Commands
```
!merchants             - List all merchants
!platform              - Platform statistics
!health                - System health
!broadcast [message]   - Send to all users
```

### Natural Language Processing

The bot detects intent from natural messages:

```
Intent Examples:
- "I want 2 sadza and beef stew" → Add 2x Sadza to cart
- "Can I get chicken and rice?" → Browse menu
- "Show me your menu" → Display products
- "Where is my order?" → Check order status
- "Hi there!" → Greeting response
- "Help me" → Show commands
```

**How it works:**
1. Message is checked for keywords matching intent patterns
2. If command (starts with `!`), it's parsed as command
3. If natural language with recognized intent, it's processed
4. Otherwise, message is ignored (prevents spam/noise)

### Smart Features

#### 🧠 Conversation Memory
- Sessions stored in database (24-hour expiry)
- Tracks conversation context
- Remembers previous orders and preferences
- Auto-saves message history

#### 🛒 Cart Intelligence
- Persistent carts (2-hour expiry)
- Auto-summarization with totals
- Quantity parsing from natural text ("2x", "3", etc)
- Quick add/remove without menu browsing

#### 📍 Order Tracking
- Order status updates via webhooks
- Real-time notifications to customers
- Merchant order management
- Payment status tracking

#### 🌐 Multi-Language Ready
- English, Shona, Zulu, Afrikaans support
- Localized error messages
- Regional currency handling (USD, ZWL, ZAR)

#### ⚡ Smart Error Handling
- Graceful fallbacks for API failures
- Retry logic for network issues
- User-friendly error messages
- Session recovery

#### 🔐 Security & Privacy
- WhatsApp number verification
- Role-based access control
- End-to-end encrypted messages
- No sensitive data in logs

## Self-Test Mode

Test the bot without WhatsApp connections:

```bash
# In bot terminal, after bot starts:
!test

# Sends test messages to your own number
# Output shows all features working
```

**Group Chat Support:**

The bot intentionally ignores group messages to prevent spam. To test in groups:
1. Create a test group
2. Add your bot number
3. Bot will respond only to direct messages (not group messages)

## API Integration

### Supabase Edge Functions

The web platform and bot communicate via Edge Functions:

- **`bot-auth`**: User registration and verification
- **`bot-messages`**: Conversation session management
- **`bot-orders`**: Order creation and tracking
- **`bot-products`**: Product catalog and search
- **`bot-carts`**: Shopping cart management

All functions are CORS-enabled and ready for bot API calls.

### Bot API Client

Use the provided client in your bot code:

```typescript
import { botApiClient } from './services/botApiClient';

// Register user
await botApiClient.registerUser('27123456789', 'John', 'customer');

// Get products
const products = await botApiClient.listProducts('merchant-id');

// Add to cart
await botApiClient.addToCart('27123456789', 'merchant-id', 'product-id', 2);

// Create order
await botApiClient.createOrder(
  'merchant-id',
  '27123456789',
  items,
  total,
  'ZAR',
  'ecocash'
);
```

## Database Schema

Key tables:
- `users` - User accounts (customer, merchant, admin)
- `merchants` - Merchant business profiles
- `products` - Product catalog
- `customers` - Customer profiles
- `orders` - Order history
- `carts` - Active shopping carts
- `conversation_sessions` - Bot conversation context
- `bot_messages` - Message history for debugging
- `payments` - Payment records

## Environment Variables

```env
# Web Platform
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Bot
BOT_PREFIX=!
ADMIN_PHONE=27123456789
API_BASE_URL=http://localhost:5173
BOT_API_URL=http://localhost:3001
NODE_ENV=development

# Local Database (Docker)
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=smart_whatsapp
DB_HOST=localhost
DB_PORT=5432
REDIS_PORT=6379
```

## Troubleshooting

### Bot Won't Connect
```
1. Clear auth files: rm -rf whatsapp-bot/auth_info_baileys
2. Restart bot: npm start
3. Scan QR code with WhatsApp phone
```

### Messages Not Sending
```
1. Check WhatsApp number format (include country code)
2. Verify database connection
3. Check API logs: npm run logs
```

### Database Connection Failed
```
# Docker setup
1. docker-compose down
2. docker volume prune
3. docker-compose up -d

# Cloud setup
1. Check Supabase URL and key in .env
2. Verify network access
```

### Cart Issues
```
1. Merchant ID must be valid
2. Product IDs must exist in database
3. Check customer phone number format
```

## Testing Checklist

- [ ] Web platform loads at `http://localhost:5173`
- [ ] Can log in with demo credentials
- [ ] WhatsApp bot QR code displays
- [ ] Bot responds to `!help`
- [ ] Can view menu with `!menu`
- [ ] Can add to cart with `!add`
- [ ] Can checkout with `!checkout`
- [ ] Orders appear in web dashboard
- [ ] Natural language "I want 2 sadza" works
- [ ] Bot ignores non-command messages
- [ ] Group messages are ignored
- [ ] Order status works with `!status`
- [ ] Merchant can view orders with `!orders`

## Next Steps

1. **Configure Real Merchants**: Add merchant accounts in database
2. **Set Payment Gateway**: Integrate Stripe/EcoCash payment APIs
3. **Enable Notifications**: Set up WhatsApp notifications for orders
4. **Deploy Bot**: Run bot 24/7 on VPS/Cloud (Heroku, AWS, etc)
5. **Production Database**: Migrate from local to production Supabase
6. **Analytics Dashboard**: Add business intelligence features

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review error messages for specific errors
3. Test API directly using cURL or Postman
4. Check Supabase console for database issues

## Production Deployment

### Bot Deployment (VPS/Cloud)

```bash
# Use PM2 for process management
npm install -g pm2

cd whatsapp-bot
pm2 start enhanced-bot.js --name "smart-whatsapp-bot"
pm2 startup
pm2 save
```

### Web Platform Deployment

```bash
npm run build
# Deploy dist/ folder to web host (Vercel, Netlify, etc)
```

### Database

- Use Supabase (already managed)
- Or self-hosted PostgreSQL with backups
- Enable RLS for security
- Regular backups required

---

**System Ready!** 🚀 The bot is now a fully-functional ordering platform with:
- Smart command and natural language processing
- Conversation memory and cart persistence
- Multi-user support (customer, merchant, admin)
- Real-time order tracking
- Seamless web + WhatsApp integration
