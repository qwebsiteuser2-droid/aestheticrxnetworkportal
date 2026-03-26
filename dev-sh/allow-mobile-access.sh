#!/bin/bash

# Quick script to allow mobile access from local network

echo "📱 Allowing Mobile Access from Local Network"
echo "============================================="
echo ""

# Get IP and network
IP=$(hostname -I | awk '{print $1}')
NETWORK=$(echo $IP | cut -d'.' -f1-3).0/24

echo "🖥️  Your IP: $IP"
echo "🌐 Network: $NETWORK"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script needs root privileges to modify firewall rules."
    echo "   Please run with: sudo ./allow-mobile-access.sh"
    exit 1
fi

# Check if UFW is installed
if command -v ufw &> /dev/null; then
    echo "📋 Configuring UFW firewall..."
    
    # Allow ports from local network
    echo "   Allowing port 3000 (frontend) from $NETWORK..."
    ufw allow from $NETWORK to any port 3000 comment 'Frontend - Mobile Access'
    
    echo "   Allowing port 4000 (backend) from $NETWORK..."
    ufw allow from $NETWORK to any port 4000 comment 'Backend - Mobile Access'
    
    # Enable UFW if not already enabled
    if ! ufw status | grep -q "Status: active"; then
        echo ""
        echo "⚠️  UFW is currently disabled. Enabling it now..."
        ufw --force enable
    fi
    
    echo ""
    echo "✅ Firewall configured!"
    echo ""
    echo "📱 Mobile Access URLs:"
    echo "   Frontend: http://$IP:3000"
    echo "   Backend:  http://$IP:4000"
    echo ""
    echo "🔍 Current Firewall Status:"
    ufw status | grep -E "(3000|4000|Status)"
    
elif command -v firewall-cmd &> /dev/null; then
    echo "📋 Configuring firewalld..."
    firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='$NETWORK' port port='3000' protocol='tcp' accept"
    firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='$NETWORK' port port='4000' protocol='tcp' accept"
    firewall-cmd --reload
    echo "✅ Firewalld configured!"
    
else
    echo "⚠️  No firewall detected (ufw or firewalld)"
    echo "   Your services should already be accessible from the network"
fi

echo ""
echo "🧪 Testing connectivity..."
if curl -s -o /dev/null -w "Frontend: HTTP %{http_code}\n" --connect-timeout 2 http://$IP:3000 2>/dev/null; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend not accessible - check Docker containers"
fi

if curl -s -o /dev/null -w "Backend:  HTTP %{http_code}\n" --connect-timeout 2 http://$IP:4000/health 2>/dev/null; then
    echo "✅ Backend is accessible"
else
    echo "❌ Backend not accessible - check Docker containers"
fi

echo ""
echo "💡 Next Steps:"
echo "   1. Connect your mobile device to the same WiFi network"
echo "   2. Open browser on mobile: http://$IP:3000"
echo "   3. If it doesn't work, check:"
echo "      - Both devices are on the same WiFi"
echo "      - Docker containers are running: docker compose ps"
echo "      - Services are listening: netstat -tuln | grep -E ':(3000|4000)'"

