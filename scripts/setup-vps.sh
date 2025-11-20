#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Phuket Radar VPS Setup..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Docker (if not installed)
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    # Add current user to docker group
    sudo usermod -aG docker $USER
    echo "✅ Docker installed."
else
    echo "✅ Docker already installed."
fi

# 3. Check for .env file
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "   Please create a .env file with your secrets before starting the app."
    echo "   Run: nano .env"
    read -p "   Press Enter when you have created the .env file..."
fi

# 4. Start Application
echo "🚀 Starting Phuket Radar..."
# Ensure we have the latest code
git pull || echo "   (Git pull skipped or failed, using current code)"

# Build and start containers
sudo docker compose up -d --build

echo "==========================================="
echo "✅ SETUP COMPLETE!"
echo "==========================================="
echo "Your app should now be running."
echo "Check status with: sudo docker compose ps"
echo "View logs with:    sudo docker compose logs -f"
