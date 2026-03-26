# BioAestheticAx Network - Development Guide

## 🚀 Quick Start for Development

### Start Development Environment
```bash
./dev-sh/dev-start.sh
```

### Stop Development Environment
```bash
docker compose down
```

### View Logs
```bash
docker compose logs -f
```

### Restart Services
```bash
./dev-sh/dev-restart.sh
```

## 📋 Development Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Database Admin**: http://localhost:8080
- **MinIO Console**: http://localhost:9001
- **Health Check**: http://localhost:4000/health

## 👤 Default Admin Credentials

- **Email**: `asadkhanbloch4949@gmail.com`
- **Password**: `Qasim7878,,`

**⚠️ IMPORTANT**: Change these passwords after first login!

## 🛠️ Development Commands

### Docker Commands
```bash
# Check service status
docker compose ps

# View logs for specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# Rebuild and restart
docker compose up --build -d

# Stop all services
docker compose down

# Remove all containers and volumes (clean slate)
docker compose down -v
```

### Backend Commands
```bash
# Run migrations
docker compose exec backend npm run migration:run

# Seed database
docker compose exec backend npm run seed

# Clear and reseed database
docker compose exec backend npm run seed:clear
docker compose exec backend npm run seed

# Run backend tests
docker compose exec backend npm test

# Access backend shell
docker compose exec backend sh
```

### Frontend Commands
```bash
# Run frontend tests
docker compose exec frontend npm test

# Access frontend shell
docker compose exec frontend sh
```

## 📁 Project Structure

```
BioAestheticAx Network/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   ├── services/       # Business logic
│   │   └── db/            # Database configuration
│   └── uploads/           # File uploads
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js app router
│   │   ├── components/    # React components
│   │   └── lib/          # Utility functions
│   └── public/           # Static assets
├── seeds/                 # Database seed data
├── dev-start.sh          # Start development
├── dev-stop.sh           # Stop development
├── dev-logs.sh           # View logs
├── dev-restart.sh        # Restart services
└── production-deployment/ # Production files (for December)
```

## 🔧 Development Workflow

### 1. Daily Development
```bash
# Start your day
./dev-sh/dev-start.sh

# Make changes to code
# Files are automatically synced via Docker volumes

# View logs if needed
./dev-logs.sh

# End your day
./dev-stop.sh
```

### 2. Database Changes
```bash
# After modifying models, create migration
docker compose exec backend npm run migration:generate -- -n YourMigrationName

# Run migration
docker compose exec backend npm run migration:run

# If needed, revert migration
docker compose exec backend npm run migration:revert
```

### 3. Adding New Features
1. Create/modify backend API endpoints
2. Update frontend components
3. Test locally
4. Commit changes to git

## 🐛 Troubleshooting

### Services Won't Start
```bash
# Check Docker is running
docker --version

# Check for port conflicts
netstat -tulpn | grep :3000
netstat -tulpn | grep :4000

# Clean restart
docker compose down -v
./dev-sh/dev-start.sh
```

### Database Issues
```bash
# Reset database completely
docker compose down -v
./dev-sh/dev-start.sh

# Check database connection
docker compose exec db psql -U postgres -d bioaestheticax1 -c "SELECT version();"
```

### Frontend Not Loading
```bash
# Check frontend logs
docker compose logs frontend

# Rebuild frontend
docker compose up --build -d frontend
```

### Backend API Issues
```bash
# Check backend logs
docker compose logs backend

# Test API endpoint
curl http://localhost:4000/health
```

## 📊 Monitoring Development

### Health Checks
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000/health
- **Database**: Check with Adminer at http://localhost:8080

### Log Monitoring
```bash
# All services
./dev-logs.sh

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

## 🔄 Hot Reloading

Both frontend and backend support hot reloading:
- **Frontend**: Changes to React components auto-reload
- **Backend**: Changes to TypeScript files auto-reload via nodemon

## 📝 Environment Variables

Development uses `.env` file with these defaults:
- `NODE_ENV=development`
- `DATABASE_URL=postgres://postgres:password@db:5432/bioaestheticax1`
- `JWT_SECRET=your-super-secret-jwt-key-change-this-in-production`
- `FRONTEND_URL=http://localhost:3000`

## 🚀 Production Deployment (December)

When ready for production in December, all production files are stored in:
```
production-deployment/
├── docker-compose.prod.yml
├── docker-compose.prod-http.yml
├── production.env
├── deploy.sh
├── dev-sh/setup-ssl.sh
├── nginx/
└── DEPLOYMENT.md
```

## 📞 Support

For development issues:
1. Check this guide first
2. Check service logs: `./dev-logs.sh`
3. Try clean restart: `docker compose down -v && ./dev-sh/dev-start.sh`
4. Check the main README.md
5. Contact the development team

---

**Happy coding! 🎉**
