#!/bin/bash

# SSL Certificate Setup Script for BioAestheticAx Network
set -e

echo "🔒 Setting up SSL certificates for BioAestheticAx Network..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    print_error "Certbot is not installed. Please install it first:"
    print_error "sudo apt update && sudo apt install certbot"
    exit 1
fi

# Get domain name from user
read -p "Enter your domain name (e.g., example.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

# Create SSL directory
mkdir -p nginx/ssl

print_status "Obtaining SSL certificate for $DOMAIN..."

# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx || true

# Obtain certificate using standalone mode
certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --email admin@$DOMAIN --agree-tos --non-interactive

# Copy certificates to nginx directory
print_status "Copying certificates to nginx directory..."
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem

# Set proper permissions
sudo chown $USER:$USER nginx/ssl/cert.pem
sudo chown $USER:$USER nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

# Update nginx configuration with domain
print_status "Updating nginx configuration with domain $DOMAIN..."
sed -i "s/your-domain.com/$DOMAIN/g" nginx/nginx.conf

# Update production environment with domain
print_status "Updating production environment with domain $DOMAIN..."
sed -i "s/your-domain.com/$DOMAIN/g" production.env

# Create renewal script
print_status "Creating certificate renewal script..."
cat > renew-ssl.sh << EOF
#!/bin/bash
# SSL Certificate Renewal Script

# Stop nginx
docker-compose -f docker-compose.prod.yml stop nginx

# Renew certificate
certbot renew --standalone

# Copy renewed certificates
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem

# Set permissions
sudo chown \$USER:\$USER nginx/ssl/cert.pem
sudo chown \$USER:\$USER nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

# Restart nginx
docker-compose -f docker-compose.prod.yml start nginx

echo "SSL certificate renewed successfully!"
EOF

chmod +x renew-ssl.sh

# Add cron job for automatic renewal
print_status "Setting up automatic certificate renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * $(pwd)/renew-ssl.sh") | crontab -

print_status "🎉 SSL setup completed successfully!"
print_warning "Your SSL certificate will be automatically renewed every day at 12:00 PM"
print_warning "You can manually renew certificates by running: ./renew-ssl.sh"

# Restart nginx with SSL
print_status "Restarting nginx with SSL configuration..."
docker-compose -f docker-compose.prod.yml up -d nginx

print_status "Your application is now accessible at: https://$DOMAIN"
