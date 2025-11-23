# Bot + Dashboard Troubleshooting Guide

## 🚨 Common Issues & Solutions

### Database Issues

#### ❌ Problem: Database Connection Failed
```
Error: Failed to connect to Supabase
ENOTFOUND your-project.supabase.co
```

**Solutions:**
1. Check `.env` file for correct `SUPABASE_URL`
   ```bash
   grep SUPABASE_URL .env
   ```

2. Verify Supabase credentials
   - Go to https://supabase.com
   - Project Settings → API
   - Copy correct URL and API key

3. Check internet connection
   ```bash
   ping supabase.co
   ```

4. Verify Supabase project is running
   - Check Supabase dashboard
   - Ensure project status is "Active"

5. Test connection manually
   ```javascript
   const { createClient } = require('@supabase/supabase-js');
   const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
   db.from('users').select('*').then(r => console.log(r));
   ```

---

#### ❌ Problem: Tables Not Created
```
Error: relation "users" does not exist
```

**Solutions:**
1. Manually run table creation SQL
   - Open Supabase SQL Editor
   - Copy SQL from `src/config/database.js` `createTables()` function
   - Paste and execute

2. Check existing tables
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

3. Verify service role key has permissions
   - Go to Project Settings → API
   - Use `SUPABASE_SERVICE_KEY` not anon key for writes

4. Check database quota
   - Supabase free tier: 500MB storage
   - Upgrade if needed

---

#### ❌ Problem: Row Level Security (RLS) Blocking Operations
```
Error: new row violates row-level-security policy
```

**Solutions:**
1. Disable RLS for development
   - Open Supabase Table Editor
   - Click table name
   - Go to "RLS" tab
   - Toggle off for each table

2. Or configure RLS policies
   ```sql
   -- Allow all operations for development
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ALTER TABLE merchants DISABLE ROW LEVEL SECURITY;
   ALTER TABLE products DISABLE ROW LEVEL SECURITY;
   ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
   ```

---

### API Server Issues

#### ❌ Problem: Port 3000 Already in Use
```
Error: listen EADDRINUSE :::3000
```

**Solutions:**
1. Find process using port 3000
   ```bash
   lsof -i :3000
   # or
   netstat -tlnp | grep :3000
   ```

2. Kill the process
   ```bash
   kill -9 <PID>
   # or
   fuser -k 3000/tcp
   ```

3. Use different port
   ```bash
   API_PORT=3001 npm start
   ```

---

#### ❌ Problem: CORS Error When Accessing API
```
Error: Access to XMLHttpRequest blocked by CORS policy
```

**Solutions:**
1. Check CORS configuration in `dashboardServer.js`
   ```javascript
   app.use(cors({
     origin: '*', // Should be '*' for development
     credentials: true
   }));
   ```

2. Verify API is running
   ```bash
   curl -i http://localhost:3000/health
   ```

3. Check request headers
   ```bash
   curl -i -H "Origin: http://localhost:3000" \
     http://localhost:3000/api/auth/register
   ```

---

#### ❌ Problem: API Endpoints Returning 404
```
Error: Cannot POST /api/merchants
```

**Solutions:**
1. Verify endpoint exists in `dashboardServer.js`
   ```bash
   grep -n "POST.*merchants" src/api/dashboardServer.js
   ```

2. Check route registration
   ```javascript
   // Should see: app.post('/api/merchants', ...)
   ```

3. Test with curl
   ```bash
   curl -X POST http://localhost:3000/api/merchants \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

4. Check request format
   - Ensure correct HTTP method (POST/GET/PUT/DELETE)
   - Include `Content-Type: application/json`
   - Valid JSON body

---

### Bot Connection Issues

#### ❌ Problem: Bot Won't Connect to WhatsApp
```
Error: WhatsApp connection failed
```

**Solutions:**
1. Scan QR code again
   - Delete `auth_info_baileys` folder
   ```bash
   rm -rf auth_info_baileys
   npm start
   ```

2. Use newer WhatsApp version
   - Update Baileys library
   ```bash
   npm install --save @whiskeysockets/baileys@latest
   ```

3. Check WhatsApp account status
   - Not banned or suspended
   - Not logged in multiple devices
   - Internet connection stable

4. Try Ubuntu 22.04 or newer
   - Baileys works best on newer systems
   - Check `uname -a`

---

#### ❌ Problem: Bot Receives Messages But Can't Send
```
Error: Failed to send message
```

**Solutions:**
1. Check bot permissions
   - Add bot number to contacts
   - Start conversation with bot

2. Verify message service initialized
   ```javascript
   console.log(this.messageService); // Should not be null
   ```

3. Test with simple message
   ```bash
   curl -X POST http://localhost:3000/api/bot/send-message \
     -H "Content-Type: application/json" \
     -d '{
       "to": "+263700000000@s.whatsapp.net",
       "message": "Test",
       "type": "text"
     }'
   ```

4. Check rate limiting
   - WhatsApp blocks rapid messages
   - Space out messages by 2-3 seconds

---

### Handler Integration Issues

#### ❌ Problem: Database Not Syncing on Commands
```
User sends: !register John
Bot responds but data not in database
```

**Solutions:**
1. Verify databaseService is imported
   ```bash
   grep "databaseService" src/handlers/authHandler.js
   # Should show: const databaseService = require(...)
   ```

2. Check if database is initialized
   ```bash
   curl http://localhost:3000/api/bot/health
   # Check: "databaseConnected": true
   ```

3. Verify command handler calls database
   ```javascript
   // In authHandler.js handleRegisterCommand
   const result = await databaseService.createUser(userData);
   console.log('DB Result:', result);
   ```

4. Check error logs
   ```bash
   tail -50 bot.log | grep -i "error\|database"
   ```

5. Test database operation directly
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "phone": "+263700000000",
       "name": "Test User",
       "role": "customer"
     }'
   ```

---

#### ❌ Problem: Handler Methods Not Found
```
Error: Cannot read property 'handleRegisterCommand' of undefined
```

**Solutions:**
1. Check handler file exists
   ```bash
   ls -la src/handlers/authHandler.js
   ```

2. Verify correct exports
   ```bash
   tail -5 src/handlers/authHandler.js
   # Should show: module.exports = AuthHandler;
   ```

3. Check command name matching
   ```bash
   grep "handleRegister" src/handlers/authHandler.js
   # Should match: handleRegisterCommand
   ```

4. Verify handler initialization
   ```javascript
   this.authHandler = new AuthHandler(this.sock, this.store);
   console.log(this.authHandler.handleRegisterCommand); // Should exist
   ```

---

### Cache Issues

#### ❌ Problem: Stale Cache Data
```
User updates product but old price still showing
```

**Solutions:**
1. Clear cache manually
   ```bash
   # Add endpoint to index.js
   app.post('/api/cache/clear', (req, res) => {
     this.carts.flushAll();
     this.merchants.flushAll();
     this.products.flushAll();
     res.json({ success: true });
   });
   
   # Then call
   curl -X POST http://localhost:3000/api/cache/clear
   ```

2. Reduce cache TTL temporarily
   ```javascript
   // In index.js constructor
   this.products = new NodeCache({ stdTTL: 60 }); // 1 minute instead of 15
   ```

3. Force cache refresh after update
   ```javascript
   // In handler after update
   await databaseService.updateProduct(productId, data);
   this.cache.del(`product:${productId}`); // Clear specific key
   ```

---

#### ❌ Problem: Memory Leak with Large Cache
```
Process memory grows continuously
Memory: 1GB → 2GB → 3GB
```

**Solutions:**
1. Reduce cache size
   ```javascript
   this.carts = new NodeCache({ 
     stdTTL: 3600,
     maxKeys: 1000 // Limit entries
   });
   ```

2. Implement cache cleanup
   ```javascript
   setInterval(() => {
     const stats = this.carts.getStats();
     console.log('Cache stats:', stats);
     if (stats.keys > 5000) {
       this.carts.flushAll();
     }
   }, 300000); // Every 5 minutes
   ```

3. Monitor memory usage
   ```bash
   # Watch process memory
   watch -n 1 'ps aux | grep node'
   ```

---

### Performance Issues

#### ❌ Problem: API Slow (> 500ms response)
```
API taking too long to respond
```

**Solutions:**
1. Check database performance
   ```sql
   -- Check slow queries
   EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 'xxx';
   
   -- Add indexes if needed
   CREATE INDEX idx_orders_user_id ON orders(user_id);
   ```

2. Profile API endpoints
   ```javascript
   // Add timing middleware
   app.use((req, res, next) => {
     const start = Date.now();
     res.on('finish', () => {
       console.log(`${req.method} ${req.path}: ${Date.now() - start}ms`);
     });
     next();
   });
   ```

3. Cache frequently accessed data
   ```javascript
   // Increase cache TTL for stable data
   this.merchants = new NodeCache({ stdTTL: 3600 }); // 1 hour
   ```

4. Use pagination for large datasets
   ```javascript
   // Instead of: SELECT * FROM orders
   // Use: SELECT * FROM orders LIMIT 20 OFFSET 0
   ```

---

#### ❌ Problem: Message Sending Timeout
```
Error: Message timeout after 30s
```

**Solutions:**
1. Increase timeout
   ```javascript
   // In messageService.js
   const timeout = 60000; // 60 seconds
   ```

2. Check WhatsApp rate limits
   - Max 80 messages/minute per bot
   - Space out batch messages

3. Implement message queue
   ```javascript
   // Queue messages with delay
   const messageQueue = [];
   setInterval(async () => {
     if (messageQueue.length > 0) {
       await sock.sendMessage(...messageQueue.shift());
     }
   }, 100); // Send one every 100ms
   ```

---

### Environment/Config Issues

#### ❌ Problem: Environment Variables Not Loading
```
Error: SUPABASE_URL is undefined
```

**Solutions:**
1. Check `.env` file exists
   ```bash
   ls -la .env
   cat .env | grep SUPABASE
   ```

2. Verify correct directory
   ```bash
   pwd # Should be /workspaces/Bot/whatsapp-bot
   ```

3. Reload environment
   ```bash
   # In index.js
   require('dotenv').config({ path: '../.env' });
   ```

4. Debug env loading
   ```bash
   node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL)"
   ```

5. Use absolute path
   ```bash
   export SUPABASE_URL="https://..."
   npm start
   ```

---

#### ❌ Problem: Configuration Not Applied
```
Changes in .env not taking effect
```

**Solutions:**
1. Restart bot process
   ```bash
   # Kill existing
   pkill -f "node.*index.js"
   # Start new
   npm start
   ```

2. Clear Node cache
   ```bash
   rm -rf node_modules/.cache
   ```

3. Verify config reload
   ```javascript
   // Add to index.js
   console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
   ```

---

## 📊 Diagnostic Tools

### Complete Health Check Script
```bash
#!/bin/bash
echo "=== BOT HEALTH CHECK ==="

# 1. Check Node
echo "1. Node Version:"
node --version

# 2. Check Dependencies
echo "2. NPM Packages:"
npm ls | head -20

# 3. Check Database
echo "3. Database Connection:"
curl -s http://localhost:3000/api/bot/health | jq '.databaseConnected'

# 4. Check API
echo "4. API Health:"
curl -s http://localhost:3000/health | jq '.status'

# 5. Check Ports
echo "5. Listening Ports:"
netstat -tlnp | grep node

# 6. Check Disk Space
echo "6. Disk Space:"
df -h | grep /

# 7. Check Memory
echo "7. Memory Usage:"
free -h

# 8. Check Logs
echo "8. Recent Errors:"
tail -20 bot.log | grep ERROR

echo "=== END HEALTH CHECK ==="
```

### Database Inspection
```sql
-- Check all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Check user count
SELECT COUNT(*) as total_users FROM users;

-- Check recent errors in logs
SELECT * FROM admin_logs WHERE action = 'error' 
ORDER BY created_at DESC LIMIT 10;

-- Check cache hit rates (if stored)
SELECT * FROM system_metrics WHERE metric = 'cache_hit_rate' 
ORDER BY created_at DESC LIMIT 1;
```

---

## 🆘 Emergency Procedures

### Total Reset
```bash
# 1. Stop bot
pkill -f "node.*index.js"

# 2. Clear authentication
rm -rf auth_info_baileys

# 3. Clear cache
rm -rf node_modules/.cache

# 4. Reset database (if needed)
# In Supabase: Delete all rows from each table

# 5. Clear environment
rm .env

# 6. Reinstall dependencies
rm -rf node_modules
npm install

# 7. Restart
npm start
```

### Rollback Procedure
```bash
# If latest changes broke something
git log --oneline | head -10
git revert HEAD
npm install
npm start
```

### Database Restore
```bash
# Export current database
pg_dump > backup.sql

# Restore from backup
psql < backup.sql

# Or use Supabase backups
# Supabase Dashboard → Settings → Backups
```

---

## 📞 Get Support

**Still stuck?** Check these resources:

1. **Check Logs**
   ```bash
   tail -100 bot.log
   ```

2. **Test Endpoints**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Review Configuration**
   - `.env` file correct?
   - Database credentials valid?
   - Port 3000 available?

4. **Search Issues**
   - Search GitHub issues for error message
   - Check Baileys documentation
   - Check Supabase docs

5. **Debug Mode**
   ```bash
   DEBUG=* npm start
   ```

