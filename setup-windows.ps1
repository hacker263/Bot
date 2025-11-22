# Windows PowerShell Setup Script for WhatsApp Bot
# Run as Administrator: Right-click PowerShell → "Run as Administrator"

Write-Host ""
Write-Host "===================================================="
Write-Host "  Smart WhatsApp Bot - Windows Setup" -ForegroundColor Cyan
Write-Host "===================================================="
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell → 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Docker
Write-Host "[1/4] Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker is not installed or not running" -ForegroundColor Red
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Download Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor White
    Write-Host "2. Install it" -ForegroundColor White
    Write-Host "3. Start Docker Desktop app" -ForegroundColor White
    Write-Host "4. Run this script again" -ForegroundColor White
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Node.js
Write-Host "[2/4] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green
    Write-Host "✓ npm $npmVersion found" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed" -ForegroundColor Red
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Download Node.js: https://nodejs.org/" -ForegroundColor White
    Write-Host "2. Install it" -ForegroundColor White
    Write-Host "3. Restart PowerShell" -ForegroundColor White
    Write-Host "4. Run this script again" -ForegroundColor White
    Read-Host "Press Enter to exit"
    exit 1
}

# Start Docker containers
Write-Host ""
Write-Host "[3/4] Starting Docker containers..." -ForegroundColor Yellow
Write-Host "Stopping any existing containers..." -ForegroundColor Gray
docker-compose down -q 2>$null
Write-Host "Starting containers..." -ForegroundColor Gray
docker-compose up -d
Write-Host "✓ Docker containers started" -ForegroundColor Green

# Check if containers started successfully
Write-Host "Verifying containers..." -ForegroundColor Gray
Start-Sleep -Seconds 2
$containers = docker-compose ps
Write-Host "$containers" -ForegroundColor Gray

# Install dependencies
Write-Host ""
Write-Host "[4/4] Installing dependencies..." -ForegroundColor Yellow
Write-Host "Installing web platform dependencies..." -ForegroundColor Gray
npm install --silent
Write-Host "✓ Web platform installed" -ForegroundColor Green

Write-Host "Installing bot dependencies..." -ForegroundColor Gray
cd whatsapp-bot
npm install --silent
cd ..
Write-Host "✓ Bot installed" -ForegroundColor Green

# Success message
Write-Host ""
Write-Host "===================================================="
Write-Host "  ✅ Setup Complete!" -ForegroundColor Green
Write-Host "===================================================="
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open first PowerShell window and run:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Open second PowerShell window and run:" -ForegroundColor White
Write-Host "   cd whatsapp-bot" -ForegroundColor Yellow
Write-Host "   npm start" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Scan QR code with WhatsApp:" -ForegroundColor White
Write-Host "   Settings → Linked Devices → Link a Device" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Test the bot:" -ForegroundColor White
Write-Host "   Send: !test" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Access services:" -ForegroundColor White
Write-Host "   Web Platform:    http://localhost:5173" -ForegroundColor Yellow
Write-Host "   API:             http://localhost:4001" -ForegroundColor Yellow
Write-Host "   Database Admin:  http://localhost:5050" -ForegroundColor Yellow
Write-Host ""
Write-Host "Questions? Check:" -ForegroundColor Cyan
Write-Host "  • README.md" -ForegroundColor Yellow
Write-Host "  • WINDOWS_SETUP.md" -ForegroundColor Yellow
Write-Host "  • TESTING_GUIDE.md" -ForegroundColor Yellow
Write-Host ""

# Ask to keep window open
$response = Read-Host "Press Enter to close, or type 'keep' to keep window open"
if ($response -ne "keep") {
    exit 0
}
