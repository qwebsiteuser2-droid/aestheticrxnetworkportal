# AestheticRxNetwork - Quick Start Guide

## 🚀 Get Your Website Live in 5 Minutes

### Option 1: Quick HTTP Deployment (Recommended for Testing)

```bash
# 1. Start the application
./start-production.sh

# 2. Access your website
# Frontend: http://localhost
# API: http://localhost/api
```

### Option 2: Full Production Deployment with SSL

```bash
# 1. Configure your domain
# Edit production.env and nginx/nginx.conf with your domain

# 2. Deploy with SSL
./deploy.sh
./setup-ssl.sh
```

## 📋 What's Included

✅ **Production-ready Docker setup**
✅ **Nginx reverse proxy with security headers**
✅ **PostgreSQL database with health checks**
✅ **Redis caching**
✅ **SSL certificate automation**
✅ **Database migrations and seeding**
✅ **Rate limiting and security**
✅ **Automated deployment scripts**

## 🔧 Default Admin Access

After deployment, you can log in with:
- **Email**: Check `MAIN_ADMIN_EMAIL` in `production.env`
- **Password**: `ChangeMe123!`

**⚠️ IMPORTANT**: Change this password immediately after first login!

## 🌐 Access Points

- **Frontend**: http://localhost (or your domain)
- **Backend API**: http://localhost/api
- **Health Check**: http://localhost/health

## 📁 Key Files Created

- `production.env` - Production environment configuration
- `docker-compose.prod-http.yml` - HTTP-only production setup
- `docker-compose.prod.yml` - Full production setup with SSL
- `nginx/nginx.conf` - SSL-enabled Nginx configuration
- `nginx/nginx-http.conf` - HTTP-only Nginx configuration
- `deploy.sh` - Full deployment script
- `start-production.sh` - Quick start script
- `setup-ssl.sh` - SSL certificate setup
- `DEPLOYMENT.md` - Complete deployment guide

## 🔒 Security Features

- JWT authentication with refresh tokens
- Rate limiting on API endpoints
- CORS protection
- Security headers (XSS, CSRF, etc.)
- Bcrypt password hashing
- Input validation with Zod

## 📊 Monitoring

```bash
# Check service status
docker-compose -f docker-compose.prod-http.yml ps

# View logs
docker-compose -f docker-compose.prod-http.yml logs -f

# Check specific service
docker-compose -f docker-compose.prod-http.yml logs -f backend
```

## 🛠️ Troubleshooting

### Services won't start?
```bash
# Check logs
docker-compose -f docker-compose.prod-http.yml logs

# Check disk space
df -h

# Restart services
docker-compose -f docker-compose.prod-http.yml restart
```

### Database issues?
```bash
# Run migrations manually
docker-compose -f docker-compose.prod-http.yml exec backend npm run migration:run

# Reset database
docker-compose -f docker-compose.prod-http.yml exec backend npm run seed:clear
docker-compose -f docker-compose.prod-http.yml exec backend npm run seed
```

## 🔄 Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod-http.yml up --build -d
```

## 📞 Support

1. Check the logs first
2. Review `DEPLOYMENT.md` for detailed instructions
3. Check the main `README.md`
4. Contact the development team

---

**🎉 Your AestheticRxNetwork application is now live and ready to use!**
