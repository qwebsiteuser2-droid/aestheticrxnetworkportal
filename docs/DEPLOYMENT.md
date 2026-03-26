# Deployment Guide

**BioAestheticAx Network B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.1.0 |
| **Last Updated** | January 22, 2026 |

---

This guide provides comprehensive instructions for deploying the BioAestheticAx Network application to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Deployment](#quick-deployment)
- [Production Environment Setup](#production-environment-setup)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04+ or similar Linux distribution
- **RAM**: Minimum 2GB (4GB recommended)
- **CPU**: 2+ cores
- **Disk**: 20GB+ free space
- **Network**: Static IP address (for SSL)

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Git
- Certbot (for SSL certificates)

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

# Install Certbot (for SSL)
sudo apt install certbot python3-certbot-nginx -y

# Logout and login again to apply Docker group changes
```

### 2. Clone Repository

```bash
git clone https://github.com/qasimjungle/BioAestheticAx Network_App.git
cd BioAestheticAx Network_App
```

### 3. Configure Environment

```bash
# Copy example environment file
cp env.example production.env

# Edit with your production values
nano production.env
```

### 4. Deploy with Docker Compose

```bash
# For HTTP deployment (testing)
docker-compose -f docker/docker-compose.prod-http.yml up -d

# For HTTPS deployment (production)
docker-compose -f docker/docker-compose.prod.yml up -d
```

## Production Environment Setup

### Environment Variables

See **[Environment Variables Reference](ENVIRONMENT_VARIABLES_REFERENCE.md)** for the complete list of all environment variables required for production.

Create `production.env` with your production values:

```bash
# Copy template
cp env.example production.env

# Edit with production values
nano production.env
```

**Key production requirements:**
- `NODE_ENV=production`
- Strong JWT secrets (64+ characters)
- Production database URL
- Valid Gmail credentials
- PayFast production credentials

### Generating Secure Secrets

```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Docker Deployment

### Using Production Docker Compose

The project includes production-ready Docker Compose files:

1. **HTTP Only** (`docker/docker-compose.prod-http.yml`): For testing without SSL
2. **HTTPS** (`docker/docker-compose.prod.yml`): Full production with SSL

### Deployment Steps

```bash
# 1. Navigate to production directory
cd production-deployment

# 2. Configure environment
cp ../env.example production.env
nano production.env  # Edit with your values

# 3. Build and start services
docker-compose -f docker/docker-compose.prod.yml up --build -d

# 4. Run database migrations
docker-compose -f docker/docker-compose.prod.yml exec backend npm run migration:run

# 5. Seed database (optional)
docker-compose -f docker/docker-compose.prod.yml exec backend npm run seed

# 6. Check service status
docker-compose -f docker/docker-compose.prod.yml ps

# 7. View logs
docker-compose -f docker/docker-compose.prod.yml logs -f
```

### Service Management

```bash
# Start services
docker-compose -f docker/docker-compose.prod.yml start

# Stop services
docker-compose -f docker/docker-compose.prod.yml stop

# Restart services
docker-compose -f docker/docker-compose.prod.yml restart

# View logs
docker-compose -f docker/docker-compose.prod.yml logs -f [service_name]

# Rebuild and restart
docker-compose -f docker/docker-compose.prod.yml up --build -d
```

## Manual Deployment

### 1. Build Backend

```bash
cd backend
npm install
npm run build
```

### 2. Build Frontend

```bash
cd frontend
npm install
npm run build
```

### 3. Start Services

```bash
# Backend
cd backend
NODE_ENV=production npm start

# Frontend
cd frontend
NODE_ENV=production npm start
```

## SSL/HTTPS Setup

### Using Certbot with Nginx

1. **Configure Nginx** (edit `nginx/nginx.conf`):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location /.well-known/acme-challenge/ {
           root /var/www/certbot;
       }
       
       location / {
           return 301 https://$host$request_uri;
       }
   }
   
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       # SSL configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;
       ssl_prefer_server_ciphers on;
       
       # Your application configuration
       location / {
           proxy_pass http://frontend:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /api {
           proxy_pass http://backend:4000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

2. **Obtain SSL Certificate**:
   ```bash
   sudo certbot certonly --webroot \
     -w /var/www/certbot \
     -d your-domain.com \
     -d www.your-domain.com
   ```

3. **Auto-renewal**:
   ```bash
   # Add to crontab
   sudo crontab -e
   # Add: 0 0 * * * certbot renew --quiet
   ```

### Using Automated Script

```bash
./production-deployment/setup-ssl.sh
```

## Database Setup

### Production Database

1. **Create Database**:
   ```sql
   CREATE DATABASE bioaestheticax1;
   CREATE USER bioaestheticax_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE bioaestheticax1 TO bioaestheticax_user;
   ```

2. **Run Migrations**:
   ```bash
   cd backend
   npm run migration:run
   ```

3. **Seed Initial Data** (optional):
   ```bash
   npm run seed
   ```

### Database Backups

```bash
# Create backup
pg_dump -U postgres bioaestheticax1 > backup_$(date +%Y%m%d).sql

# Restore backup
psql -U postgres bioaestheticax1 < backup_20240101.sql
```

## Monitoring

### Health Checks

- **Backend Health**: `https://your-domain.com/api/health`
- **Frontend**: `https://your-domain.com`

### Log Monitoring

```bash
# View all logs
docker-compose -f docker/docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker/docker-compose.prod.yml logs -f backend
docker-compose -f docker/docker-compose.prod.yml logs -f frontend
docker-compose -f docker/docker-compose.prod.yml logs -f nginx
```

### Performance Monitoring

- Monitor server resources: `htop` or `docker stats`
- Check database connections
- Monitor API response times
- Set up error tracking (Sentry, etc.)

## Troubleshooting

### Services Not Starting

```bash
# Check service status
docker-compose -f docker/docker-compose.prod.yml ps

# Check logs
docker-compose -f docker/docker-compose.prod.yml logs [service_name]

# Restart service
docker-compose -f docker/docker-compose.prod.yml restart [service_name]
```

### Database Connection Issues

```bash
# Check database is running
docker-compose -f docker/docker-compose.prod.yml ps db

# Check database logs
docker-compose -f docker/docker-compose.prod.yml logs db

# Test connection
docker-compose -f docker/docker-compose.prod.yml exec backend npm run migration:run
```

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

### Port Conflicts

```bash
# Check what's using port
sudo lsof -i :80
sudo lsof -i :443

# Kill process
sudo kill -9 <PID>
```

## Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] SSL certificate installed and auto-renewal configured
- [ ] Health checks passing
- [ ] Admin accounts created and passwords changed
- [ ] Email notifications working
- [ ] Payment gateway configured (if using)
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Security headers verified
- [ ] Rate limiting configured
- [ ] CORS properly configured

## Security Best Practices

1. **Use strong passwords** for all services
2. **Keep dependencies updated**: `npm audit fix`
3. **Enable firewall**: `ufw enable`
4. **Regular backups**: Automated daily backups
5. **Monitor logs**: Set up log aggregation
6. **Update regularly**: Keep system and Docker updated
7. **Use HTTPS**: Always use SSL in production
8. **Limit access**: Use firewall rules to limit access

## Scaling

### Horizontal Scaling

- Use load balancer (Nginx, HAProxy)
- Multiple backend instances
- Database connection pooling
- Redis for session management

### Vertical Scaling

- Increase server resources
- Optimize database queries
- Use CDN for static assets
- Enable caching

## Support

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Review [DEVELOPMENT.md](DEVELOPMENT.md) for setup details
3. Check GitHub Issues
4. Review [ARCHITECTURE.md](ARCHITECTURE.md) for system design

---

**Document Version**: 3.1.0  
**Last Updated**: January 22, 2026

