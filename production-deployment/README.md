# Production Deployment Files

This directory contains all the production deployment files for BioAestheticAx Network.

## 📅 Deployment Timeline
**Scheduled for December 2024**

## 📁 Files Included

- `deploy-now.sh` - Quick deployment script
- `start-production.sh` - Production start script
- `nginx/` - Nginx configuration files
- `DEPLOYMENT.md` - Complete deployment guide
- `QUICK_START.md` - Quick start guide

**Note:** Docker files have been moved to `../docker/` directory:
- `docker/docker-compose.prod.yml` - Full production setup with SSL
- `docker/docker-compose.prod-http.yml` - HTTP-only production setup
- `docker/Dockerfile.prod` - Production backend Dockerfile
- `docker/frontend-Dockerfile.prod` - Production frontend Dockerfile

**Scripts moved to `../scripts/` directory:**
- `scripts/deploy.sh` - Full deployment script with SSL
- `scripts/setup-ssl.sh` - SSL certificate setup script

## 🚀 Quick Deployment

1. **Use Docker files from `../docker/` directory**:
   ```bash
   docker-compose -f ../docker/docker-compose.prod.yml up -d
   ```

2. **Configure your domain**:
   - Edit environment variables in `.env` or `production.env`
   - Update `nginx/nginx.conf` with your domain

3. **Deploy using scripts**:
   ```bash
   ../scripts/deploy.sh
   ../scripts/setup-ssl.sh
   ```

   Or use the quick deployment script:
   ```bash
   ./deploy-now.sh
   ```

## 📋 Pre-Deployment Checklist

- [ ] Domain name configured
- [ ] SSL certificates ready
- [ ] Production environment variables set
- [ ] Database credentials updated
- [ ] Email service configured (SendGrid/Gmail)
- [ ] WhatsApp service configured (Twilio)
- [ ] File storage configured (S3/DigitalOcean Spaces)
- [ ] Admin passwords changed
- [ ] Backup strategy in place

## 🔒 Security Considerations

- Change all default passwords
- Use strong JWT secrets
- Configure proper CORS origins
- Set up rate limiting
- Enable SSL/HTTPS
- Configure firewall rules
- Set up monitoring and logging

---

**Note**: These files are ready for production deployment in December. Keep them secure and don't commit sensitive credentials to version control.
