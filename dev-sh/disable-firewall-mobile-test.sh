#!/bin/bash

# Script to disable firewall for mobile testing
# This allows mobile devices on the same network to access localhost:3000 and localhost:4000

echo "🔥 Disabling Firewall for Mobile Testing"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script needs root privileges to modify firewall rules."
    echo "   Please run with: sudo ./disable-firewall-mobile-test.sh"
    exit 1
fi

# Detect which firewall is running
if command -v ufw &> /dev/null; then
    echo "📋 Detected UFW (Ubuntu Firewall)"
    echo ""
    echo "⚠️  WARNING: This will temporarily disable UFW firewall!"
    echo "   This allows all incoming connections on ports 3000 and 4000"
    echo ""
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Disabling UFW firewall..."
        ufw disable
        echo "✅ UFW firewall disabled"
        echo ""
        echo "📱 Mobile Testing Setup:"
        echo "   1. Find your computer's IP address:"
        echo "      - Run: ip addr show | grep 'inet '"
        echo "      - Or: hostname -I"
        echo "   2. On your mobile device, connect to the same WiFi network"
        echo "   3. Access: http://YOUR_IP:3000 (frontend)"
        echo "   4. API will be at: http://YOUR_IP:4000"
        echo ""
        echo "🔒 To re-enable firewall later, run:"
        echo "   sudo ufw enable"
    else
        echo "❌ Cancelled"
        exit 0
    fi

elif command -v firewall-cmd &> /dev/null; then
    echo "📋 Detected firewalld (CentOS/RHEL)"
    echo ""
    echo "🔄 Opening ports 3000 and 4000..."
    firewall-cmd --permanent --add-port=3000/tcp
    firewall-cmd --permanent --add-port=4000/tcp
    firewall-cmd --reload
    echo "✅ Ports 3000 and 4000 opened"
    echo ""
    echo "📱 Mobile Testing Setup:"
    echo "   1. Find your computer's IP address:"
    echo "      - Run: ip addr show | grep 'inet '"
    echo "      - Or: hostname -I"
    echo "   2. On your mobile device, connect to the same WiFi network"
    echo "   3. Access: http://YOUR_IP:3000 (frontend)"
    echo "   4. API will be at: http://YOUR_IP:4000"

elif command -v iptables &> /dev/null; then
    echo "📋 Detected iptables"
    echo ""
    echo "⚠️  WARNING: This will add rules to allow ports 3000 and 4000"
    echo ""
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Adding iptables rules..."
        iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
        iptables -I INPUT -p tcp --dport 4000 -j ACCEPT
        echo "✅ Ports 3000 and 4000 opened"
        echo ""
        echo "📱 Mobile Testing Setup:"
        echo "   1. Find your computer's IP address:"
        echo "      - Run: ip addr show | grep 'inet '"
        echo "      - Or: hostname -I"
        echo "   2. On your mobile device, connect to the same WiFi network"
        echo "   3. Access: http://YOUR_IP:3000 (frontend)"
        echo "   4. API will be at: http://YOUR_IP:4000"
        echo ""
        echo "⚠️  Note: iptables rules are temporary. To make permanent, save them:"
        echo "   sudo iptables-save > /etc/iptables/rules.v4"
    else
        echo "❌ Cancelled"
        exit 0
    fi

else
    echo "❌ No firewall detected (ufw, firewalld, or iptables)"
    echo ""
    echo "📱 Your system might not have a firewall enabled."
    echo "   You can test directly:"
    echo "   1. Find your computer's IP address:"
    echo "      - Run: ip addr show | grep 'inet '"
    echo "      - Or: hostname -I"
    echo "   2. On your mobile device, connect to the same WiFi network"
    echo "   3. Access: http://YOUR_IP:3000 (frontend)"
    echo "   4. API will be at: http://YOUR_IP:4000"
    exit 0
fi

echo ""
echo "✅ Firewall configuration complete!"
echo ""
echo "💡 Quick IP Address Check:"
echo "   Run this command to see your IP:"
echo "   hostname -I | awk '{print \$1}'"
echo ""

