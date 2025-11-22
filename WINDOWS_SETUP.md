# 🪟 Windows Setup Guide for WhatsApp Bot

> Complete guide for setting up and testing on Windows 10/11

---

## ✅ Windows Prerequisites

Before starting, ensure you have:

- [ ] **Windows 10 or 11** (64-bit recommended)
- [ ] **Docker Desktop for Windows** (installed & running)
  - Download: https://www.docker.com/products/docker-desktop
  - Must have WSL2 (Windows Subsystem for Linux 2) enabled
- [ ] **Node.js 18+** (from https://nodejs.org/)
  - Verify: Open PowerShell → `node -v` and `npm -v`
- [ ] **Git for Windows** (optional, for cloning)
- [ ] **WhatsApp** on your phone
- [ ] **Administrator access** (for some Docker operations)
- [ ] **Ports available:** 5173, 3000, 3001, 4001, 5432, 6379

---

## 🚀 Windows Quick Setup (5-10 minutes)

### Step 1: Enable WSL2 (First Time Only)

If this is your first time using Docker on Windows:

1. **Open PowerShell as Administrator**
   - Right-click PowerShell → "Run as Administrator"

2. **Enable WSL2:**
   ```powershell
   wsl --install
   ```

3. **Restart your computer**

4. **Verify Docker Desktop is running:**
   - Open Docker Desktop application
   - Wait for it to show "Engine running"

### Step 2: Navigate to Project

```powershell
# Open PowerShell or Windows Terminal
cd C:\path\to\whatsapp-smart-bot
```

### Step 3: Start Docker Services

```powershell
docker-compose up -d
```

**Expected output:**
```
[+] Running 3/3
 ✔ Container postgres   Started
 ✔ Container redis      Started
 ✔ Container pgadmin    Started
```

### Step 4: Install & Start Web Platform (PowerShell Window 1)

```powershell
npm install
npm run dev
```

**Expected output:**
```
VITE v5.0.0  ready
➜  Local:   http://localhost:5173/
```

### Step 5: Install & Start Bot (PowerShell Window 2)

```powershell
cd whatsapp-bot
npm install
npm start
```

**Expected output:**
```
✨ Enhanced Smart WhatsApp Ordering Bot
✅ Webhook server running on port 3001
📱 Scan QR code:
[QR CODE DISPLAYED]
```

### Step 6: Connect WhatsApp

1. Open WhatsApp on your phone
2. Go to **Settings → Linked Devices**
3. Tap **"Link a Device"**
4. **Point camera at QR code** in PowerShell
5. Wait for **"🚀 Bot Connected!"** message

✅ **Bot is now live on Windows!**

---

## 🛠 Windows-Specific Issues & Fixes

### Issue 1: Docker Not Running

**Error:** `Cannot connect to Docker daemon`

**Fix:**
```powershell
# 1. Open Docker Desktop application
# 2. Wait 30 seconds for it to start
# 3. Verify "Engine running" appears
# 4. Try again:
docker-compose ps
```

### Issue 2: WSL2 Not Enabled

**Error:** `WSL 2 installation is incomplete`

**Fix:**
```powershell
# Open PowerShell as Administrator:
wsl --install
wsl --set-default-version 2

# Restart computer
# Then restart Docker Desktop
```

### Issue 3: Ports Already in Use

**Error:** `Port 5173 is already allocated`

**Fix:**
```powershell
# Find process using port (e.g., 5173):
Get-NetTCPConnection -LocalPort 5173 | Select-Object -ExpandProperty OwningProcess

# Kill it:
Stop-Process -Id <PID> -Force

# Or use different port in package.json
```

### Issue 4: npm or node not recognized

**Error:** `'npm' is not recognized as an internal or external command`

**Fix:**
```powershell
# 1. Download Node.js from https://nodejs.org/
# 2. Install it (restart after)
# 3. Open NEW PowerShell window
# 4. Verify:
node -v
npm -v
```

### Issue 5: PowerShell Execution Policy

**Error:** `cannot be loaded because running scripts is disabled`

**Fix:**
```powershell
# Run as Administrator:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue 6: Git Bash vs PowerShell

**Recommendation:** Use **Windows Terminal** or **PowerShell**
- Git Bash sometimes has path issues on Windows
- Windows Terminal is included in Windows 11
- PowerShell is built into Windows 10/11

---

## 📊 Docker Desktop Configuration for Windows

### Check Docker Status

```powershell
# Verify Docker is working
docker --version
docker-compose --version

# Check containers
docker-compose ps
```

### Docker Desktop Settings

1. **Open Docker Desktop**
2. Go to **Settings (gear icon)**
3. **Resources** tab:
   - Memory: Set to 4GB+ (recommended 6GB+)
   - CPUs: Set to 4+ (recommended 4-6)
4. **WSL Integration** tab:
   - Enable WSL 2 based engine
5. Click **Apply & Restart**

---

## 🔗 Windows Access Points

### Services Running on Windows PC

| Service | URL | Port | Access |
|---------|-----|------|--------|
| **Web Platform** | http://localhost:5173 | 5173 | Browser |
| **API Server** | http://localhost:4001 | 4001 | API calls |
| **Bot Webhook** | http://localhost:3001 | 3001 | Internal |
| **PgAdmin** | http://localhost:5050 | 5050 | Browser |
| **PostgreSQL** | localhost:5432 | 5432 | Database |
| **Redis** | localhost:6379 | 6379 | Cache |

### Access Database on Windows

**PgAdmin (Web UI for PostgreSQL):**
1. Open: http://localhost:5050
2. Email: admin@example.com
3. Password: admin
4. Click "Add New Server"
5. Hostname: postgres
6. Username: postgres
7. Password: postgres

---

## 📁 File Paths on Windows

### Important Directories

```
C:\Users\[YourUsername]\whatsapp-smart-bot\
├── whatsapp-bot\
│   ├── enhanced-bot.js
│   ├── api-server.js
│   └── auth_info_baileys\    (WhatsApp session data)
├── src\                        (Web platform)
└── docker-compose.yml
```

### Bot Session Storage

WhatsApp connection data stored in:
```
.\whatsapp-bot\auth_info_baileys\
```

If you need to reset:
```powershell
# Delete the folder (bot will generate new QR code)
Remove-Item -Path ".\whatsapp-bot\auth_info_baileys" -Recurse -Force

# Restart bot:
npm start
```

---

## 🧪 Windows Testing Commands

### Test 1: Quick Health Check

```powershell
# Check all services running
docker-compose ps

# Check web platform
Invoke-WebRequest http://localhost:5173 -UseBasicParsing | Select-Object StatusCode

# Check API
Invoke-WebRequest http://localhost:4001/health -UseBasicParsing | Select-Object Content
```

### Test 2: WhatsApp Commands

Send from WhatsApp:
```
!test
```

Expected response in bot terminal:
```
✅ Command parsing: OK
✅ Intent detection: OK
[... more checks ...]
```

### Test 3: Database Connection

```powershell
# Access PostgreSQL from Windows
# (requires PostgreSQL client installed)

psql -h localhost -U postgres -d whatsapp_bot
# Password: postgres

# Then in psql:
SELECT COUNT(*) FROM users;
```

Or use PgAdmin at http://localhost:5050

---

## 🚨 Windows Troubleshooting Checklist

```
DOCKER
☐ Docker Desktop is open and running
☐ WSL2 is enabled
☐ docker-compose ps shows 3 containers (postgres, redis, pgadmin)

NODE.JS
☐ node -v returns version 18+
☐ npm -v returns version 8+
☐ npm packages installed (node_modules folder exists)

PORTS
☐ Ports 5173, 3001, 4001, 5432, 6379 are available
☐ No other services using these ports

WHATSAPP
☐ WhatsApp on phone is open
☐ Settings → Linked Devices is accessible
☐ QR code visible in PowerShell

BOT
☐ Bot terminal shows "Bot Connected!"
☐ Can send message to bot from WhatsApp
☐ Terminal receives message

WEB PLATFORM
☐ http://localhost:5173 loads in browser
☐ No errors in browser console
☐ Can see dashboard/login page
```

---

## 💾 Windows Data & Backups

### Location of Important Data

```
C:\Users\[YourUsername]\whatsapp-smart-bot\
```

### Database Backup (Windows)

```powershell
# Backup PostgreSQL from Docker
docker exec whatsapp-smart-bot-postgres-1 pg_dump -U postgres whatsapp_bot > backup.sql

# Restore from backup
cat backup.sql | docker exec -i whatsapp-smart-bot-postgres-1 psql -U postgres whatsapp_bot
```

### Reset Everything on Windows

```powershell
# 1. Stop all containers
docker-compose down -v

# 2. Delete bot session data
Remove-Item -Path ".\whatsapp-bot\auth_info_baileys" -Recurse -Force

# 3. Start fresh
docker-compose up -d
npm start
```

---

## 🎯 Common Windows Commands

### Navigation

```powershell
# Change directory
cd C:\path\to\whatsapp-smart-bot

# List files
ls
Get-ChildItem

# Go back
cd ..

# Open in Explorer
explorer .
```

### Process Management

```powershell
# Find process using port
Get-NetTCPConnection -LocalPort 5173

# Kill process
Stop-Process -Id <PID> -Force

# List all node processes
Get-Process node
```

### Docker Commands (Windows)

```powershell
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart postgres

# Clean up
docker-compose down -v
```

---

## 🎓 Windows Terminal Tips

### Use Windows Terminal (Recommended)

1. **Install Windows Terminal** (free from Microsoft Store)
2. **Open multiple tabs:**
   - Ctrl+Shift+T (new tab)
   - Ctrl+Tab (switch tab)
   - Ctrl+W (close tab)
3. **Split panes:**
   - Alt+Shift+D (vertical split)
   - Alt+Shift+- (horizontal split)

### Keep Services Running

**Option 1:** Use multiple terminal windows
- Window 1: Docker services
- Window 2: Web platform (npm run dev)
- Window 3: Bot (npm start)

**Option 2:** Use screen or tmux
- Not recommended on Windows (use Windows Terminal instead)

---

## 🚀 Windows Quick Reference

### Files to Remember

| File | Purpose |
|------|---------|
| `README.md` | Main guide |
| `PC_SETUP_CHECKLIST.md` | Setup checklist |
| `TESTING_GUIDE.md` | Test procedures |
| `docker-compose.yml` | Docker configuration |
| `whatsapp-bot/enhanced-bot.js` | Bot code |
| `whatsapp-bot/.env` | Bot configuration |

### Commands You'll Use Most

```powershell
# Start everything
docker-compose up -d
npm run dev                # Terminal 1
cd whatsapp-bot && npm start  # Terminal 2

# Stop everything
docker-compose down
Ctrl+C                     # Stop npm processes

# View logs
docker-compose logs -f postgres
npm start                  # View bot logs in real-time

# Test
Send: !test              # From WhatsApp
```

---

## 📞 Windows-Specific Support

| Problem | Windows Fix |
|---------|------------|
| Docker won't start | Restart Docker Desktop app |
| WSL2 error | Run `wsl --install` in PowerShell Admin |
| npm not found | Restart PowerShell after installing Node |
| Port in use | Use `Get-NetTCPConnection -LocalPort XXXX` |
| Slow performance | Increase Docker Desktop RAM to 6GB+ |
| Permission denied | Run PowerShell as Administrator |
| File path issues | Use `C:\path` not `/path` |

---

## ✅ Windows Success Criteria

You're ready when:

- ✅ Docker Desktop is running
- ✅ `docker-compose ps` shows 3 containers "Up"
- ✅ `npm -v` and `node -v` work
- ✅ Web platform loads at http://localhost:5173
- ✅ Bot terminal shows "Bot Connected!"
- ✅ QR code scans successfully
- ✅ Can send `!test` command
- ✅ All services respond

---

## 🎉 Next Steps

1. **Follow setup steps above** (Step 1-6)
2. **Verify everything works** (check success criteria)
3. **Run quick tests** (send `!test`)
4. **Follow TESTING_GUIDE.md** (comprehensive testing)
5. **Reference as needed** (use DOCUMENTATION_GUIDE.md)

---

## 🆘 Need Help?

**Check these docs for Windows:**
- README.md - General overview
- PC_SETUP_CHECKLIST.md - Setup checklist
- TESTING_GUIDE.md - Testing procedures
- DOCUMENTATION_GUIDE.md - Find what you need

**Common Windows issues:**
1. Docker not running → Open Docker Desktop app
2. npm not found → Install Node.js and restart PowerShell
3. Ports in use → Kill process with Stop-Process -Id
4. WSL2 error → Run wsl --install in PowerShell Admin

---

**Ready? Start with Step 1 above and follow to Step 6!**

Any questions? Everything is in the documentation!
