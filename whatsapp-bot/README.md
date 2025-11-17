# Smart WhatsApp Bot

A comprehensive WhatsApp bot for the Smart WhatsApp Ordering & Payment Assistant platform.

## Features

### Customer Commands
- `!menu` - View available products and menu
- `!order [item] [quantity]` - Add items to cart
- `!cart` - View current cart contents
- `!checkout` - Complete order and select payment
- `!status [orderID]` - Check order status
- `!clear` - Empty cart
- `!help` - Show all available commands

### Merchant Commands
- `!dashboard` - View business statistics
- `!orders [status]` - View orders (all, pending, confirmed, fulfilled)
- `!products` - View inventory and product status
- `!analytics` - View detailed business analytics
- `!settings` - Quick access to settings

### Admin Commands
- `!merchants` - View all merchants on platform
- `!platform` - Platform-wide statistics
- `!health` - System health monitoring
- `!broadcast [message]` - Send message to all users

### Natural Language Ordering
The bot also supports natural language ordering without commands:
- "I want 2 sadza and beef stew"
- "Can I get chicken and rice?"
- "Order 3 portions of sadza please"

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd whatsapp-bot
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start the Bot**
   ```bash
   npm start
   ```

4. **Scan QR Code**
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices
   - Scan the QR code displayed in terminal

## Configuration

### Environment Variables
- `BOT_PREFIX` - Command prefix (default: !)
- `BOT_PHONE_NUMBER` - Your WhatsApp business number
- `API_BASE_URL` - Platform API URL
- `ADMIN_PHONE` - Admin phone number for elevated access
- `WEBHOOK_SECRET` - Secret for webhook verification

### Webhook Endpoints
- `POST /webhook/order-update` - Order status updates
- `POST /webhook/low-stock` - Low stock alerts
- `GET /health` - Bot health check

## Integration with Platform

The bot integrates with the main platform through:

1. **Webhooks** - Receive real-time updates
2. **API Calls** - Fetch merchant and product data
3. **Order Creation** - Create orders in platform database
4. **User Authentication** - Role-based command access

## Automated Features

### Cron Jobs
- **Daily Summaries** (8 AM) - Send daily stats to merchants
- **Weekly Reports** (Monday 9 AM) - Platform stats to admin
- **Cache Refresh** (Hourly) - Update merchant data

### Smart Features
- **Session Management** - Maintains user context
- **Cart Persistence** - Remembers user carts
- **Natural Language Processing** - Understands order intent
- **Multi-language Support** - Supports EN/SN/ZU/AF
- **Payment Integration** - Regional payment methods
- **Order Tracking** - Real-time status updates

## Usage Examples

### Customer Ordering Flow
```
Customer: !menu
Bot: [Shows menu with products and prices]

Customer: !order sadza 2
Bot: ✅ Added 2x Sadza & Beef Stew to cart!

Customer: !checkout
Bot: [Shows payment options for region]

Customer: 1
Bot: [Processes EcoCash payment]
```

### Merchant Management
```
Merchant: !dashboard
Bot: [Shows today's stats and quick actions]

Merchant: !orders pending
Bot: [Lists all pending orders]

Merchant: !analytics
Bot: [Shows sales analytics and trends]
```

### Natural Language
```
Customer: "I want 2 sadza and 1 chicken rice"
Bot: ✅ Added to cart:
     • 2x Sadza & Beef Stew
     • 1x Chicken & Rice
     Total: $17.00
```

## Security Features

- **Role-based Access** - Commands restricted by user role
- **Webhook Verification** - Secure webhook endpoints
- **Session Isolation** - User data separation
- **Rate Limiting** - Prevents spam and abuse
- **Error Handling** - Graceful error recovery

## Monitoring & Logging

- **Real-time Logging** - All interactions logged
- **Health Checks** - Bot status monitoring
- **Performance Metrics** - Response time tracking
- **Error Reporting** - Automatic error alerts

## Deployment

### Production Setup
1. Use PM2 for process management
2. Set up reverse proxy (nginx)
3. Configure SSL certificates
4. Set up monitoring (New Relic, DataDog)
5. Configure backup strategies

### Scaling
- Multiple bot instances
- Load balancing
- Database clustering
- Redis for session storage