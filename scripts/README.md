# Scripts Directory

**Last Updated:** January 14, 2026

This directory contains all shell scripts and utility scripts for the AestheticRxNetwork project.

## 📋 Scripts Overview

### Deployment Scripts
- `deploy.sh` - Main deployment script
- `start-production.sh` - Start production environment
- `start.sh` - Start development environment

### Railway Database Scripts
- `create-railway-database.sh` - Create Railway database
- `setup-railway-database.sh` - Setup Railway database
- `copy-data-to-railway.sh` - Copy data to Railway database (uses env variables)
- `import-local-to-railway.sh` - Import local database to Railway
- `import-using-railway-cli.sh` - Import using Railway CLI
- `import-data-batches.sh` - Import data in batches
- `import-full-database.sh` - Import full database

**Note:** Redundant Railway copy scripts have been archived to `scripts/archive/`

### URL Fix Scripts
- `auto-fix-all-urls.sh` - Automatically fix all hardcoded URLs
- `find-all-hardcoded-urls.js` - Find all hardcoded URLs in codebase

**Note:** Older URL fix scripts have been archived to `scripts/archive/`

### SSL & Deployment
- `setup-ssl.sh` - Set up SSL certificates
- `deploy.sh` - Main deployment script
- `start-production.sh` - Start production environment

## 🚀 Usage

All scripts should be run from the project root directory:

```bash
# From project root
./scripts/deploy.sh
./scripts/start-production.sh
./scripts/start.sh
```

## 📝 Notes

- Scripts are organized by functionality
- All scripts are executable
- Check individual scripts for specific usage instructions
- Some scripts may require environment variables to be set

---

**Last Updated:** January 14, 2026

