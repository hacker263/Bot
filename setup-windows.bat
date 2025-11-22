@echo off
REM Windows Quick Setup Script for WhatsApp Bot
REM Run this in Command Prompt or PowerShell (as Administrator)

ECHO.
ECHO ====================================================
ECHO  Smart WhatsApp Bot - Windows Setup
ECHO ====================================================
ECHO.

REM Check Docker
ECHO [1/4] Checking Docker...
docker --version > nul 2>&1
IF ERRORLEVEL 1 (
    ECHO ERROR: Docker is not installed or not running
    ECHO Please:
    ECHO 1. Install Docker Desktop: https://www.docker.com/products/docker-desktop
    ECHO 2. Start Docker Desktop app
    ECHO 3. Run this script again
    PAUSE
    EXIT /B 1
)
ECHO ✓ Docker found

REM Check Node.js
ECHO [2/4] Checking Node.js...
node --version > nul 2>&1
IF ERRORLEVEL 1 (
    ECHO ERROR: Node.js is not installed
    ECHO Please:
    ECHO 1. Download Node.js: https://nodejs.org/
    ECHO 2. Install it
    ECHO 3. Restart PowerShell/Command Prompt
    ECHO 4. Run this script again
    PAUSE
    EXIT /B 1
)
FOR /F "tokens=*" %%i IN ('node --version') DO set NODE_VER=%%i
ECHO ✓ Node.js %NODE_VER% found

REM Start Docker containers
ECHO.
ECHO [3/4] Starting Docker containers...
docker-compose down > nul 2>&1
docker-compose up -d
ECHO ✓ Docker containers started

REM Install dependencies
ECHO.
ECHO [4/4] Installing dependencies...
call npm install
cd whatsapp-bot
call npm install
cd ..
ECHO ✓ Dependencies installed

ECHO.
ECHO ====================================================
ECHO  ✅ Setup Complete!
ECHO ====================================================
ECHO.
ECHO Next steps:
ECHO.
ECHO 1. Open first PowerShell window and run:
ECHO    npm run dev
ECHO.
ECHO 2. Open second PowerShell window and run:
ECHO    cd whatsapp-bot
ECHO    npm start
ECHO.
ECHO 3. Scan QR code with WhatsApp
ECHO.
ECHO 4. Send: !test
ECHO.
ECHO Questions? Check: README.md or WINDOWS_SETUP.md
ECHO.
PAUSE
