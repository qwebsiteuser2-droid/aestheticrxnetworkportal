#!/bin/bash
cd /home/enigmatix/Q_project/BioAestheticAx Network
CURRENT_IP=$(hostname -I | awk '{print $1}' || ip addr show | grep -oP 'inet \K[\d.]+' | grep -v '127.0.0.1' | head -1)

echo "📱 Mobile Access Information:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Your Local IP: $CURRENT_IP"
echo "📲 Frontend URL: http://$CURRENT_IP:3000"
echo "🔌 Backend API: http://$CURRENT_IP:4000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Quick Setup:"
echo "1. Make sure mobile device is on same WiFi network"
echo "2. Open browser on mobile and go to: http://$CURRENT_IP:3000"
echo "3. If firewall blocks, run: sudo ufw allow 3000/tcp && sudo ufw allow 4000/tcp"
echo ""
echo "💡 Tip: Scan this QR code or manually type the URL in your mobile browser"
echo ""

