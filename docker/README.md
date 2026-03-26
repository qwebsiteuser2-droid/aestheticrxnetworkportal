# Docker Configuration Files

**Last Updated:** January 14, 2026

This directory contains all Docker-related configuration files for the project.

## 📋 Files Overview

### Docker Compose Files
- `docker-compose.yml` - Development environment configuration
- `docker-compose.prod.yml` - Production environment with SSL
- `docker-compose.prod-http.yml` - Production environment (HTTP only)

### Dockerfiles
- `Dockerfile.prod` - Production Dockerfile (backend)
- `frontend-Dockerfile.prod` - Production Dockerfile (frontend)

## 🚀 Usage

### Development
```bash
docker-compose -f docker/docker-compose.yml up
```

### Production (with SSL)
```bash
docker-compose -f docker/docker-compose.prod.yml up -d
```

### Production (HTTP only)
```bash
docker-compose -f docker/docker-compose.prod-http.yml up -d
```

## 📝 Notes

- Production files are configured for SSL/HTTPS
- Development file is for local development
- All files use environment variables from `.env` or `production.env`
- See `docs/DEPLOYMENT.md` for detailed deployment instructions

## 🔗 Related Documentation

- [Deployment Guide](../docs/DEPLOYMENT.md)
- [Production Deployment](../production-deployment/README.md)
- [Docker Environment Variables](../docs/DOCKER_ENVIRONMENT_VARIABLES.md)

---

**Last Updated:** January 14, 2026

