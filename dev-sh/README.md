# Development Scripts

This folder contains development and testing shell scripts for the BioAestheticAx Network project. These scripts are used during local development and testing, and are kept separate from production deployment scripts.

## Scripts Overview

### Development Environment

- **`dev-start.sh`** - Start the development environment using Docker Compose
- **`dev-restart.sh`** - Restart the development environment

### Mobile Testing & Network Access

- **`mobile-access.sh`** - Enable mobile device access to the development server
- **`allow-mobile-access.sh`** - Alternative script for allowing mobile access
- **`disable-firewall-mobile-test.sh`** - Disable firewall rules for mobile testing
- **`test-mobile-access.sh`** - Test mobile device connectivity

### Firebase Deployment (Development/Testing)

- **`firebase-deploy.sh`** - Deploy to Firebase Hosting
- **`firebase-restart.sh`** - Restart Firebase services

### SSL & Security

- **`generate-secrets.sh`** - Generate secure JWT secrets for production deployment (Railway, etc.)
- **Note:** `setup-ssl.sh` has been moved to `../scripts/` to avoid duplication

### Testing & Utilities

- **`test-advertisement-media.sh`** - Test advertisement media functionality
- **`generate-test-media.sh`** - Generate test media files
- **`disable-viewer-admin-buttons.sh`** - Disable viewer/admin buttons for testing

## Usage

All scripts should be run from the project root directory:

```bash
# Example: Start development environment
./dev-sh/dev-start.sh

# Example: Test mobile access
./dev-sh/test-mobile-access.sh
```

## Notes

- These scripts are for **development and testing only**
- Production deployment scripts are located in the `production-deployment/` folder
- Railway deployment uses `start.sh` in the project root
- Make sure scripts are executable: `chmod +x dev-sh/*.sh`

