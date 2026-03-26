# BioAestheticAx Network Production Deployment Guide

This guide will help you deploy your BioAestheticAx Network application to production with SSL, security, and monitoring.

## Prerequisites

### Server Requirements
- Ubuntu 20.04+ or similar Linux distribution
- Minimum 2GB RAM, 2 CPU cores
- 20GB+ disk space
- Root or sudo access

### Software Requirements
- Docker (latest version)
- Docker Compose (latest version)
- Certbot (for SSL certificates)
- Git

## Quick Deployment

### 1. Install Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Certbot
sudo apt install certbot -y

# Logout and login again to apply Docker group changes
```

### 2. Clone and Setup

```bash
# Clone your repository
git clone <your-repository-url>
cd BioAestheticAx Network

# Copy and configure environment
cp env.example production.env
nano production.env  # Edit with your actual values
```

### 3. Configure Environment Variables

Edit `production.env` with your actual values:

```bash
# Required: Update these values
NEXT_PUBLIC_API_URL=https://your-domain.com/api
DATABASE_URL=postgres://postgres:your_secure_password@db:5432/bioaestheticax1
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key
MAIN_ADMIN_EMAIL=admin@your-domain.com
SECONDARY_ADMIN_EMAIL=admin2@your-domain.com

# Optional: Configure external services
SENDGRID_API_KEY=your_sendgrid_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
S3_ENDPOINT=https://your-region.digitaloceanspaces.com
S3_BUCKET=your-bucket-name
S3_KEY=your-access-key
S3_SECRET=your-secret-key
```

### 4. Deploy Application

```bash
# Run deployment script
./deploy.sh
```

### 5. Setup SSL (Optional but Recommended)

```bash
# Run SSL setup script
./setup-ssl.sh
```

## Manual Deployment Steps

If you prefer manual deployment:

### 1. Build and Start Services

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up --build -d

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

### 2. Run Database Migrations

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migration:run

# Seed initial data
docker-compose -f docker-compose.prod.yml exec backend npm run seed
```

### 3. Configure SSL Manually

```bash
# Install certbot
sudo apt install certbot -y

# Stop nginx
docker-compose -f docker-compose.prod.yml stop nginx

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# Update nginx config with your domain
sed -i 's/your-domain.com/your-actual-domain.com/g' nginx/nginx.conf

# Restart nginx
docker-compose -f docker-compose.prod.yml up -d nginx
```

## Post-Deployment Configuration

### 1. Change Default Admin Passwords

After deployment, log in with the default credentials and change them immediately:

- **Main Admin**: `MAIN_ADMIN_EMAIL` / `ChangeMe123!`
- **Secondary Admin**: `SECONDARY_ADMIN_EMAIL` / `ChangeMe123!`

### 2. Configure External Services

#### Email Service (SendGrid)
1. Create a SendGrid account
2. Generate an API key
3. Update `SENDGRID_API_KEY` in `production.env`
4. Restart backend: `docker-compose -f docker-compose.prod.yml restart backend`

#### WhatsApp Service (Twilio)
1. Create a Twilio account
2. Get Account SID and Auth Token
3. Update `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in `production.env`
4. Restart backend: `docker-compose -f docker-compose.prod.yml restart backend`

#### File Storage (S3/DigitalOcean Spaces)
1. Create an S3 bucket or DigitalOcean Space
2. Generate access keys
3. Update S3 configuration in `production.env`
4. Restart backend: `docker-compose -f docker-compose.prod.yml restart backend`

## Monitoring and Maintenance

### Health Checks

```bash
# Check service health
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Backup Database

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres bioaestheticax1 > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres bioaestheticax1 < backup_file.sql
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up --build -d

# Run migrations if needed
docker-compose -f docker-compose.prod.yml exec backend npm run migration:run
```

### SSL Certificate Renewal

Certificates are automatically renewed via cron job. Manual renewal:

```bash
# Run renewal script
./renew-ssl.sh

# Or manually
sudo certbot renew
```

## Security Considerations

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 2. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Monitor Logs

```bash
# Set up log rotation
sudo nano /etc/logrotate.d/docker-containers
```

Add:
```
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
```

## Troubleshooting

### Common Issues

1. **Services won't start**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs
   
   # Check disk space
   df -h
   
   # Check memory
   free -h
   ```

2. **Database connection issues**
   ```bash
   # Check database logs
   docker-compose -f docker-compose.prod.yml logs db
   
   # Test connection
   docker-compose -f docker-compose.prod.yml exec backend npm run migration:run
   ```

3. **SSL certificate issues**
   ```bash
   # Check certificate validity
   openssl x509 -in nginx/ssl/cert.pem -text -noout
   
   # Renew certificate
   ./renew-ssl.sh
   ```

4. **Frontend not loading**
   ```bash
   # Check frontend logs
   docker-compose -f docker-compose.prod.yml logs frontend
   
   # Check nginx logs
   docker-compose -f docker-compose.prod.yml logs nginx
   ```

### Performance Optimization

1. **Enable Redis caching**
   - Already configured in production setup

2. **Database optimization**
   ```bash
   # Connect to database
   docker-compose -f docker-compose.prod.yml exec db psql -U postgres bioaestheticax1
   
   # Run ANALYZE
   ANALYZE;
   ```

3. **Nginx optimization**
   - Gzip compression is already enabled
   - Static file caching is configured

## Support

For issues or questions:
1. Check the logs first
2. Review this deployment guide
3. Check the main README.md
4. Contact the development team

---

**Important**: Always backup your data before making changes to the production environment!
