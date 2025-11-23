#!/bin/bash

# Bot + Dashboard Integration Startup Script
# Starts all services: Dashboard UI + API Server + WhatsApp Bot

echo "🚀 Starting Bot + Dashboard Integration..."
echo ""
echo "📋 Services that will start:"
echo "   1. 🎨 Dashboard UI        (port 5173)"
echo "   2. 🔌 API Server          (port 5174)"  
echo "   3. 🤖 WhatsApp Bot        (QR will appear)"
echo ""
echo "⏳ Starting services..."
echo ""

npm run dev:all
