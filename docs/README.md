# Documentation Index

**AestheticRxNetwork B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.4.0 |
| **Last Updated** | January 31, 2026 |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [Development Guide](DEVELOPMENT.md) | Setup and development workflow |
| [Railway Deployment](RAILWAY_DEPLOYMENT.md) | Backend deployment |
| [Vercel Deployment](VERCEL_DEPLOYMENT.md) | Frontend deployment |
| [Credentials Guide](CREDENTIALS_GUIDE.md) | API keys and credentials |
| [Security Guide](SECURITY.md) | Security implementation |

---

## Documentation Categories

### Getting Started

| Document | Description |
|----------|-------------|
| [Development Guide](DEVELOPMENT.md) | Setup and workflow |
| [Credentials Guide](CREDENTIALS_GUIDE.md) | API keys |
| [Environment Variables](ENVIRONMENT_VARIABLES_REFERENCE.md) | Configuration |

### Deployment

| Document | Description |
|----------|-------------|
| [Deployment Guide](DEPLOYMENT.md) | General deployment |
| [Railway Deployment](RAILWAY_DEPLOYMENT.md) | Backend hosting |
| [Vercel Deployment](VERCEL_DEPLOYMENT.md) | Frontend hosting |

### Architecture & Technical

| Document | Description |
|----------|-------------|
| [Architecture](ARCHITECTURE.md) | System design |
| [Technical Specifications](TECHNICAL_SPECIFICATIONS.md) | Database, API details |
| [API Documentation](API.md) | API reference |
| [Security Guide](SECURITY.md) | Security implementation |

### Configuration

| Document | Description |
|----------|-------------|
| [Email Setup](EMAIL_SETUP.md) | Email configuration, deliverability, spam reduction |
| [PayFast Setup](PAYFAST_SETUP_GUIDE.md) | Payment gateway |

### DevOps & CI/CD

| Document | Description |
|----------|-------------|
| [CI/CD Pipelines](CI_CD_PIPELINES.md) | GitHub Actions workflows |

### Testing

| Document | Description |
|----------|-------------|
| [Production Desktop Testing](Production_Final_Feature_Testing_Desktop_Device.md) | Desktop checklist |
| [Production Mobile Testing](Production_Final_Feature_Testing_Mobile_Device.md) | Mobile checklist |
| [Development Desktop Testing](Development_Final_Feature_Testing_Desktop_Device.md) | Dev desktop |
| [Development Mobile Testing](Development_Final_Feature_Testing_Mobile_Device.md) | Dev mobile |

### User & Contributor Documentation

| Document | Description |
|----------|-------------|
| [User Guide](USER_GUIDE.md) | End-user guide |
| [TypeScript Guide](TYPESCRIPT_GUIDE.md) | TS errors |
| [Contributing](CONTRIBUTING.md) | Contribution guidelines |
| [Changelog](CHANGELOG.md) | Version history |

---

## Quick Start

### New Developer

1. [Development Guide](DEVELOPMENT.md) - Set up environment
2. [Credentials Guide](CREDENTIALS_GUIDE.md) - Get API keys
3. [Environment Variables](ENVIRONMENT_VARIABLES_REFERENCE.md) - Configure `.env`

### Deploying to Production

1. [Railway Deployment](RAILWAY_DEPLOYMENT.md) - Deploy backend
2. [Vercel Deployment](VERCEL_DEPLOYMENT.md) - Deploy frontend
3. [Deployment Variables](DEPLOYMENT_ENVIRONMENT_VARIABLES.md) - Set env vars

---

## Version Information

**Current Version:** 3.4.0  
**Release Date:** January 31, 2026

### What's New in v3.4.0

- **Google OAuth Sign-In**
  - Sign in with Google account using industry-standard OAuth 2.0
  - One-click registration for new users
  - Supports multiple Vercel deployment domains

- **Gmail API Integration**
  - Replaced SMTP with Google Gmail API for reliable email delivery
  - OAuth 2.0 authentication for secure API-based sending
  - Automatic retries with exponential backoff
  - Email tracking and quota management

- **Doctor Appointment Restrictions**
  - Doctors cannot set appointments with other doctors
  - Proper modal popup notification explaining the restriction
  - Feature is exclusively for patients booking consultations

- **Navigation Protection**
  - All protected pages now require authentication
  - Automatic redirect to login page if not signed in
  - Toast notifications for better user feedback

- **UI/UX Improvements**
  - Cleaner doctor cards (removed profile circle placeholders)
  - Improved doctor profile navigation with Next.js Link
  - Better socket connection handling with reduced error spam
  - Enhanced CORS support for multiple Vercel domains

### Previous: v3.3.0

- Enhanced doctors page with quick action cards
- Read/unread status for appointment messages
- Improved notification system with graceful degradation

### Previous: v3.2.0

- Doctor Appointment System (Pending → Accepted workflow)
- Doctor Online Status (🟢 Online / 🟡 Away / ⚫ Offline)
- Location at Signup (privacy-respecting, no browser GPS)
- Terms of Service Updates

### Previous: v3.1.0

- Debt Limit Enforcement with modal and visual debt bar
- Background Message Processing for bulk emails
- Award Messages UI improvements

See [CHANGELOG.md](CHANGELOG.md) for complete history.

---

## Documentation Structure

```
docs/
├── README.md                    # This index
├── CHANGELOG.md                 # Version history
│
├── # Setup & Development
├── DEVELOPMENT.md
├── CREDENTIALS_GUIDE.md
├── ENVIRONMENT_VARIABLES_REFERENCE.md
│
├── # Deployment
├── DEPLOYMENT.md
├── RAILWAY_DEPLOYMENT.md
├── VERCEL_DEPLOYMENT.md
│
├── # Architecture & Technical
├── ARCHITECTURE.md
├── TECHNICAL_SPECIFICATIONS.md
├── API.md
├── SECURITY.md
│
├── # Configuration
├── EMAIL_SETUP.md
├── PAYFAST_SETUP_GUIDE.md
│
├── # DevOps
├── CI_CD_PIPELINES.md
│
├── # User & Guides
├── USER_GUIDE.md
├── TYPESCRIPT_GUIDE.md
├── CONTRIBUTING.md
│
├── # Testing
├── Production_Final_Feature_Testing_*.md
├── Development_Final_Feature_Testing_*.md
│
└── archive/                     # Historical docs
```

---

**Document Version**: 3.4.0  
**Last Updated**: January 31, 2026
