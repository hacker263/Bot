# Bot + Dashboard Deployment Guide

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 16+
- PostgreSQL or Supabase account
- WhatsApp account for scanning QR
- Git

### 1. Setup Environment

```bash
cd /workspaces/Bot/whatsapp-bot

# Copy example env
cp ../.env.example .env

# Edit .env with your credentials
nano .env
```

**Required in `.env`:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
ADMIN_PHONE=+263700000000
BOT_PREFIX=!
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Bot + Dashboard

```bash
npm start
```

**Output should show:**
```
🚀 Dashboard Server running on http://localhost:3000
✅ Database initialized successfully
✅ Bot initialized successfully
📱 Scan this QR code with WhatsApp:
```

### 4. Access Dashboard

Open browser: `http://localhost:3000`

---

## ☁️ Production Deployment

### Option 1: Railway.app (Recommended)

**1. Create Railway account**
- Sign up at https://railway.app
- Connect GitHub account

**2. Prepare repository**
```bash
cd /workspaces/Bot
git init
git add .
git commit -m "Initial bot + dashboard"
git remote add origin https://github.com/yourusername/bot.git
git push -u origin main
```

**3. Deploy on Railway**
- New Project → Import from GitHub
- Select repo
- Add environment variables
- Deploy

**4. Configure for Railway**
```javascript
// In index.js, line 3
const PORT = process.env.PORT || 3000;
```

**5. Set environment variables on Railway**
- Go to Variables
- Add all from `.env`
- Deploy will auto-restart

---

### Option 2: Heroku

**1. Install Heroku CLI**
```bash
curl https://cli-assets.heroku.com/install.sh | sh
heroku login
```

**2. Create app**
```bash
cd /workspaces/Bot
heroku create your-bot-name
```

**3. Add PostgreSQL addon**
```bash
heroku addons:create heroku-postgresql:hobby-dev
heroku config
# Copy DATABASE_URL
```

**4. Set environment variables**
```bash
heroku config:set SUPABASE_URL="https://..."
heroku config:set SUPABASE_KEY="..."
heroku config:set ADMIN_PHONE="+263700000000"
```

**5. Deploy**
```bash
git push heroku main
heroku logs --tail
```

---

### Option 3: DigitalOcean App Platform

**1. Create DigitalOcean account**
- Sign up at https://www.digitalocean.com
- Add credit card

**2. Create App**
- Apps → Create App
- Choose GitHub
- Select repository
- Configure runtime (Node.js 16)

**3. Set environment variables**
- Go to Settings → Component
- Add all from `.env`

**4. Deploy**
- Auto-deploys on push to main

**5. Get domain**
- DigitalOcean provides `.ondigitalocean.app` domain
- Or add custom domain in settings

---

### Option 4: Docker + VPS

**1. Create Dockerfile**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY whatsapp-bot/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY whatsapp-bot/src ./src
COPY whatsapp-bot/auth_info_baileys ./auth_info_baileys

# Expose port
EXPOSE 3000

# Start bot
CMD ["npm", "start"]
```

**2. Create docker-compose.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: smart_bot
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  bot:
    build: .
    environment:
      DATABASE_URL: postgres://postgres:secure_password@postgres:5432/smart_bot
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_KEY: ${SUPABASE_KEY}
      ADMIN_PHONE: ${ADMIN_PHONE}
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    volumes:
      - ./auth_info_baileys:/app/auth_info_baileys

volumes:
  postgres_data:
```

**3. Deploy on VPS**

```bash
# SSH into VPS
ssh root@your-vps-ip

# Clone repository
git clone https://github.com/yourusername/bot.git
cd bot

# Create .env
nano .env
# Add all credentials

# Start with Docker
docker-compose up -d

# View logs
docker-compose logs -f bot
```

---

## 📦 Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] Database initialized and tables created
- [ ] All dependencies installed (`npm install`)
- [ ] Local testing passed (all phases in testing guide)
- [ ] Database backups in place
- [ ] Error logging configured
- [ ] Security headers enabled (Helmet)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] SSL certificate obtained (if using custom domain)
- [ ] Monitoring set up
- [ ] Backup strategy defined

---

## 🔐 Production Security

### 1. Environment Variables
```bash
# Never commit .env to git
echo ".env" >> .gitignore
echo "auth_info_baileys/" >> .gitignore

# Use strong credentials
SUPABASE_KEY=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
```

### 2. Database Security

```sql
-- Create limited user for API
CREATE USER bot_api WITH PASSWORD 'strong_password';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO bot_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bot_api;

-- Row-level security for sensitive data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON users
  USING (phone = current_user_id());
```

### 3. API Security

```javascript
// In dashboardServer.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Use Helmet for security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// HTTPS redirect (on production)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  next();
});
```

### 4. SSL Certificate

**Using Let's Encrypt:**
```bash
# On your VPS
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Auto-renew
sudo certbot renew --dry-run
```

**Use in Node:**
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/fullchain.pem')
};

https.createServer(options, app).listen(443);
```

---

## 📊 Monitoring & Maintenance

### 1. Application Monitoring

```javascript
// Add to index.js
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Log important events
logger.info('Bot started');
logger.error('Database error', error);
logger.warn('High response time');
```

### 2. Uptime Monitoring

```bash
# Using cron job on VPS
# Run health check every 5 minutes
*/5 * * * * curl -f http://localhost:3000/health || systemctl restart bot

# Add to crontab
crontab -e
```

### 3. Log Rotation

```bash
# Create /etc/logrotate.d/bot
/var/log/bot/bot.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 nobody adm
    sharedscripts
}
```

### 4. Database Backups

**Automatic backups (if using Supabase):**
- Supabase handles this automatically
- Backup frequency: Daily
- Retention: 30 days (free tier)

**Manual backup:**
```bash
# Create backup
pg_dump > backup-$(date +%Y%m%d).sql

# Restore from backup
psql < backup-20240115.sql
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Bot

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Use Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: railway up
      
      - name: Notify on Slack
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {"text": "Deployment failed for ${{ github.repository }}"}
```

---

## 📈 Scaling Strategies

### Tier 1: Single Server (Current)
- **Users:** 0-1,000
- **Cost:** Free - $10/month
- **Setup:** Local machine or small VPS
- **Database:** Supabase free tier

### Tier 2: Separate Services
- **Users:** 1,000 - 10,000
- **Cost:** $20 - $50/month
- **Components:**
  - Bot server (Railway/DigitalOcean)
  - Database (Supabase Pro)
  - Redis cache (DigitalOcean)

**Implementation:**
```bash
# Use Redis for distributed cache
npm install redis

# In index.js
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});
```

### Tier 3: Microservices
- **Users:** 10,000 - 100,000
- **Cost:** $100 - $500/month
- **Components:**
  - API Gateway (Kong/Nginx)
  - Multiple bot instances (load balanced)
  - Database cluster (PostgreSQL)
  - Redis cluster
  - Message queue (RabbitMQ)

---

## 🆘 Emergency Procedures

### Bot Down
```bash
# 1. Check status
curl http://localhost:3000/health

# 2. Restart
systemctl restart bot
# or
docker restart bot-container

# 3. Check logs
tail -100 /var/log/bot/bot.log

# 4. If DB issue: reconnect
# Kill process and restart
pkill -f "node.*index.js"
npm start
```

### Database Issues
```bash
# 1. Check connection
psql -h localhost -U postgres -d smart_bot

# 2. Check disk space
df -h

# 3. Restart database
systemctl restart postgresql

# 4. Restore from backup
psql < latest-backup.sql
```

### High Memory Usage
```bash
# 1. Check process
ps aux | grep node

# 2. Identify memory leak
node --inspect=0.0.0.0:9229 src/index.js
# Open chrome://inspect

# 3. Kill and restart
pkill -9 node
npm start
```

---

## 📞 Support Resources

- **Baileys Docs:** https://github.com/WhiskeySockets/Baileys
- **Supabase Docs:** https://supabase.com/docs
- **Express Docs:** https://expressjs.com
- **Node.js Docs:** https://nodejs.org/docs
- **Railway Docs:** https://docs.railway.app

