# Firewall Instructions - Open Ports for Mobile Testing

**Version:** 2.0.0  
**Last Updated:** December 5, 2024  
**Current Server IP:** 192.168.0.66

## How to Allow Mobile Device Access

---

## 🚨 QUICK FIX (Run These Commands)

**Open a terminal and run:**

```bash
cd /home/enigmatix/Q_project/AestheticRxNetwork
sudo bash open-firewall-ports.sh
```

**OR manually run:**

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 4000/tcp
```

**Enter your password when prompted.**

---

## 🔥 FIREWALL TYPES

### 1. UFW (Ubuntu Firewall) - Most Common

**Check status:**
```bash
sudo ufw status
```

**Open ports:**
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 4000/tcp
```

**Verify:**
```bash
sudo ufw status | grep -E "(3000|4000)"
```

**Close ports (when done testing):**
```bash
sudo ufw delete allow 3000/tcp
sudo ufw delete allow 4000/tcp
```

---

### 2. Firewalld (Red Hat/CentOS)

**Open ports:**
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=4000/tcp
sudo firewall-cmd --reload
```

**Verify:**
```bash
sudo firewall-cmd --list-ports
```

---

### 3. iptables (Advanced)

**Open ports:**
```bash
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 4000 -j ACCEPT
```

**Save rules:**
```bash
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

---

## 🛡️ IF FIREWALL IS TOO STRICT

### Option 1: Temporarily Disable (NOT RECOMMENDED for production)

```bash
# UFW
sudo ufw disable

# Firewalld
sudo systemctl stop firewalld

# Remember to re-enable after testing!
```

---

### Option 2: Allow All Local Network (Safer)

```bash
# UFW - Allow from local network only
sudo ufw allow from 192.168.0.0/24 to any port 3000
sudo ufw allow from 192.168.0.0/24 to any port 4000
```

This allows only devices on your local network (192.168.0.x) to access these ports.

---

### Option 3: Use SSH Tunnel (Most Secure)

If firewall is too strict, use SSH port forwarding:

```bash
# On your laptop, create SSH tunnel
ssh -L 3000:localhost:3000 -L 4000:localhost:4000 user@your-laptop-ip

# Then access from mobile via the SSH server
```

---

## ✅ VERIFICATION

### Check if ports are open:

```bash
# Check UFW
sudo ufw status | grep -E "(3000|4000)"

# Check if ports are listening
netstat -tuln | grep -E "(3000|4000)"

# Or use ss
ss -tuln | grep -E "(3000|4000)"
```

### Test from mobile:

1. Make sure mobile is on same WiFi
2. Open browser on mobile
3. Go to: `http://192.168.0.66:3000`
4. If it works, firewall is open! ✅

---

## 🔒 SECURITY NOTES

1. **Only open ports when testing** - Close them when done
2. **Use local network only** - Don't expose to internet
3. **Use strong passwords** - Protect your system
4. **Close ports after testing** - Don't leave them open permanently

---

## 🚨 TROUBLESHOOTING

### Port still blocked?

1. **Check if service is running:**
   ```bash
   netstat -tuln | grep 3000
   netstat -tuln | grep 4000
   ```

2. **Check firewall logs:**
   ```bash
   sudo tail -f /var/log/ufw.log
   ```

3. **Try disabling firewall temporarily:**
   ```bash
   sudo ufw disable
   # Test if it works
   # Then re-enable: sudo ufw enable
   ```

4. **Check router firewall:**
   - Some routers have their own firewall
   - May need to configure router settings

---

## 📱 AFTER OPENING PORTS

1. **Restart services** (if needed):
   ```bash
   cd /home/enigmatix/Q_project/AestheticRxNetwork
   ./dev-sh/dev-restart.sh
   ```

2. **Test from mobile:**
   - Connect mobile to same WiFi
   - Open: `http://192.168.0.66:3000`

3. **Verify it works:**
   - Website should load on mobile
   - Advertisements should display
   - API calls should work
   - Order page should load products correctly

---

## 📝 Version History

### Version 2.0.0 (December 5, 2024)
- Updated server IP to 192.168.0.66
- Added verification steps for mobile testing
- Enhanced troubleshooting section

### Version 1.0.0 (Initial Release)
- Initial firewall instructions
- Basic port opening commands
- Security notes

---

**Run the script: `sudo bash open-firewall-ports.sh`**

**Document Version**: 2.0.0  
**Last Updated**: December 5, 2024  
**Written by**: Muhammad Qasim Shabbir
