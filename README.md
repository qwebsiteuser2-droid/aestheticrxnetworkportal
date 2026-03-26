# BioAestheticAx Network - B2B Medical Platform

**Version:** 3.5.0  
**Last Updated:** January 31, 2026  
**Status:** Production Ready ✅

A comprehensive B2B platform designed for medical clinics and doctors to manage orders, share research papers, track performance, collaborate within a medical community, book appointments with doctors, and manage advertisements.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)
- [Development](#-development)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [Security](#-security)
- [License](#-license)
- [Changelog](#-changelog)

## 🚀 Features

### Core Features
- **Order Management**: Complete order lifecycle from placement to delivery
- **Research Papers**: Publish, share, and manage medical research papers
- **Tier System**: Performance-based tier system with benefits and rewards
- **Employee Management**: Delivery tracking and employee assignment
- **Admin Dashboard**: Comprehensive admin tools for system management
- **Data Export**: Secure data export with password protection
- **Payment Integration**: PayFast payment gateway integration
- **Notifications**: Email and WhatsApp notifications for orders and updates

### Advertisement System (v2.0.0) 🆕
- **Visual Area Selection**: Interactive placement preview with mobile/desktop toggle
- **Multiple Media Types**: Support for videos (50MB max, any length), images (2MB, JPG/PNG), and GIF animations (5MB)
- **Status Workflow**: PENDING → APPROVED → ACTIVE → COMPLETED/EXPIRED
- **Waiting Queue**: Automatic activation when capacity becomes available
- **Admin Approval**: Complete admin workflow with conflict detection
- **Rotation System**: Automatic ad rotation with configurable intervals
- **4 Active Placements**: Top banner, Hero section (2 variants), Footer/Content area
- **Mobile Support**: Full mobile device compatibility with dynamic API URL detection
- **Real-time Tracking**: Impressions, clicks, views tracking
- **Email Notifications**: Activation and waiting queue notifications

### Doctor Appointment System (v3.4.0) 🆕
- **Set Appointment with Doctors**: Quick access from doctors page with info cards
- **Appointment Requests**: Regular users (patients) can send appointment requests to doctors
- **Doctor Approval Workflow**: Doctors receive, review, and accept appointment requests
- **Appointments Status Page**: Dedicated page showing pending/accepted appointments
- **Real-time Notifications**: Bell icon notifications for new requests and approvals
- **Doctor Contact Sharing**: Upon approval, doctor's contact info (email, WhatsApp, clinic address) shared with patient
- **Privacy First**: Appointments visible only to the specific doctor and patient (admins have oversight)
- **Status Tracking**: Pending → Accepted workflow with clear visual indicators
  - Users see: "⏳ Waiting" → "✓ Confirmed"
  - Doctors see: "📋 New Request" → "✓ Accepted"
- **Email Notifications**: Automatic email to patient when doctor accepts request
- **Read/Unread Status**: Track which appointment messages have been read
- **Doctor-to-Doctor Restriction**: Doctors cannot set appointments with other doctors (modal popup notification)
- **Navigation Protection**: All protected pages require login, redirects to login if not authenticated

### Google Authentication (v3.4.0) 🆕
- **Google Sign-In**: Sign in with Google account using OAuth 2.0
- **One-Click Registration**: Quick signup using Google account details
- **Secure OAuth Flow**: Industry-standard OAuth 2.0 authentication
- **Multiple Domains**: Supports multiple Vercel deployment domains

### Gmail API Integration (v3.4.0) 🆕
- **Gmail API Service**: Replaced SMTP with Google Gmail API for reliable email delivery
- **OAuth 2.0 Authentication**: Secure API-based email sending
- **Retry Mechanism**: Automatic retries with exponential backoff for failed emails
- **Email Tracking**: Track sent emails and delivery status
- **Quota Management**: Monitor and manage Gmail API quotas

### Notification System (v3.3.0) 🆕
- **Bell Icon Notifications**: Real-time notification badge in header
- **Notification Types**:
  - `new_message` - New appointment requests for doctors
  - `appointment_accepted` - Acceptance confirmations for patients
  - `user_approved`, `order_placed`, `order_completed`, etc.
- **Mark as Read**: Individual and bulk mark-as-read functionality
- **Notification API**: Complete REST API for notification management
- **Graceful Degradation**: Handles database schema migrations seamlessly

### Doctor Online Status (v3.2.0) 🆕
- **Real-time Status Indicators**: 🟢 Online, 🟡 Away, ⚫ Offline
- **WebSocket Integration**: Live status updates via Socket.io
- **Availability Settings**: Available, Busy, Do Not Disturb options
- **Activity Tracking**: Automatic status updates based on user activity
- **Doctors Page Display**: Online status shown on doctor cards

### Location-Based Services (v3.2.0) 🆕
- **Signup Location Collection**: Location entered during registration (no browser geolocation)
- **Privacy-Respecting**: No real-time GPS tracking or browser location access
- **Nearby Doctor Discovery**: Find doctors based on registered locations
- **Delivery Optimization**: Location data used for order delivery routing
- **Terms of Service Compliant**: Clear disclosure in Terms and Services page

### User Management
- Doctor/Clinic registration and authentication
- Role-based access control (Admin, Doctor, Employee, Regular User)
- Signup ID system for controlled registration
- Admin panel for user management
- Profile management with Google Maps integration
- Location collected at signup (manual entry, no GPS tracking)

### Research Features
- Research paper upload and management
- Research paper viewing and upvoting
- Research benefits and rewards system
- Research reports and moderation
- AI-powered research assistance

### Business Features
- Product catalog with stock management
- Shopping cart functionality
- Order tracking and status updates
- Leaderboard system
- Tier-based rewards and benefits
- Certificate generation

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (React-based)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **Icons**: Heroicons, Lucide React
- **Notifications**: React Hot Toast
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: TypeORM
- **Database**: PostgreSQL 15
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, express-rate-limit
- **File Upload**: Multer (50MB video limit, GIF animation support)
- **Email**: Gmail API (OAuth 2.0) / Nodemailer fallback
- **Authentication**: Google OAuth 2.0 Sign-In
- **SMS/WhatsApp**: Twilio
- **PDF Generation**: PDFKit
- **Payment**: PayFast integration

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (for production)
- **CI/CD**: GitHub Actions
- **Cache**: Redis (optional)

### Rendering Strategy (v3.4.0)

Optimized hybrid rendering for better performance and SEO:

| Page Type | Rendering | Examples |
|-----------|-----------|----------|
| **Static (SSG)** | Pre-built at deploy | Privacy Policy, Terms of Service |
| **ISR** | Revalidates every 5 min | Research, Leaderboard |
| **CSR** | Client-side | Login, Signup, Admin, Dashboard |
| **Hybrid** | Server layout + client islands | Doctor Search, Hall of Pride |

### UX Patterns (v3.5.0) 🆕

Enhanced user experience with modern Next.js patterns:

| Pattern | Implementation | Benefit |
|---------|----------------|---------|
| **Loading States** | `loading.tsx` per route | Zero blank screen time |
| **Error Boundaries** | `error.tsx` per route | Graceful error recovery |
| **Dynamic Imports** | Heavy components lazy-loaded | ~30% smaller bundle |
| **Custom 404** | `not-found.tsx` | Helpful navigation on errors |

**Benefits:**
- ⚡ ~100ms TTFB on static pages
- 🔍 SEO-optimized with metadata on all public pages
- 📱 Fast initial load with minimal JavaScript on static pages
- 🔄 Fresh content without full rebuilds (ISR)
- 💀 Skeleton loaders for instant visual feedback
- 🛡️ Error boundaries prevent full-page crashes
- 📦 Dynamic imports reduce initial bundle by ~30%

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL 15 or higher
- npm or yarn
- Docker (optional, for containerized setup)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/qasimjungle/BioAestheticAx Network_App.git
   cd BioAestheticAx Network_App
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example env file
   cp env.example .env
   
   # Edit .env with your configuration
   # See docs/DEVELOPMENT.md for detailed environment variable setup
   ```

4. **Set up database**
   ```bash
   cd backend
   npm run migration:run
   npm run seed  # Optional: Seed initial data
   ```

5. **Start development servers**
   ```bash
   # Using Docker Compose (recommended)
   docker-compose up -d
   
   # Or manually:
   # Backend (port 4000)
   cd backend
   npm run dev
   
   # Frontend (port 3000)
   cd frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000/api
   - Health Check: http://localhost:4000/health

## 📁 Project Structure

```
bioaestheticax/
├── frontend/                   # Next.js frontend application (Vercel deployment)
│   ├── src/
│   │   ├── app/               # Next.js app router pages
│   │   │   ├── doctors/       # Doctors listing & appointment page
│   │   │   ├── messages/      # Appointments status page
│   │   │   ├── terms/         # Terms of service page
│   │   │   ├── signup/        # Registration with location
│   │   │   └── ...            # Other pages
│   │   ├── components/        # React components
│   │   │   ├── NotificationBell.tsx  # Bell icon with notifications
│   │   │   ├── DoctorCard.tsx        # Doctor card with online status
│   │   │   ├── HeroCards.tsx         # Landing page hero cards
│   │   │   └── layout/               # Header, Footer, Navigation
│   │   ├── lib/               # Utilities and helpers
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Utility functions
│   ├── public/                # Static assets
│   └── package.json
│
├── backend/                    # Express.js backend API (Railway deployment)
│   ├── src/
│   │   ├── controllers/       # Route controllers
│   │   │   ├── conversationController.ts  # Appointments API
│   │   │   ├── notificationController.ts  # Notifications API
│   │   │   ├── doctorSearchController.ts  # Doctor search with online status
│   │   │   └── ...
│   │   ├── models/            # TypeORM entities
│   │   │   ├── Conversation.ts   # Appointment conversations
│   │   │   ├── Message.ts        # Appointment messages
│   │   │   ├── Notification.ts   # User notifications
│   │   │   ├── Doctor.ts         # Doctor with online status fields
│   │   │   └── ...
│   │   ├── routes/            # API routes
│   │   │   ├── conversations.ts  # /api/conversations
│   │   │   ├── notifications.ts  # /api/notifications
│   │   │   └── ...
│   │   ├── services/          # Business logic services
│   │   │   ├── gmailService.ts   # Email notifications
│   │   │   └── ...
│   │   ├── middleware/        # Express middleware
│   │   │   └── auth.ts           # JWT authentication
│   │   ├── db/                # Database configuration
│   │   │   ├── data-source.ts    # TypeORM config
│   │   │   └── migrations/       # Database migrations
│   │   ├── scripts/           # Utility scripts
│   │   └── utils/             # Utility functions
│   ├── uploads/               # File uploads directory
│   ├── Dockerfile.prod        # Production Dockerfile (used by Railway)
│   └── package.json
│
├── docs/                       # Comprehensive documentation
│   ├── README.md              # Documentation index
│   ├── USER_GUIDE.md          # User guide (all user types)
│   ├── API.md                 # API documentation
│   ├── ARCHITECTURE.md        # System architecture
│   ├── CHANGELOG.md           # Version history
│   ├── DEVELOPMENT.md         # Development guide
│   ├── DEPLOYMENT.md          # Deployment guide
│   ├── RAILWAY_DEPLOYMENT.md  # Railway backend deployment
│   ├── VERCEL_DEPLOYMENT.md   # Vercel frontend deployment
│   ├── CREDENTIALS_GUIDE.md   # How to get API keys
│   ├── TROUBLESHOOTING_GUIDE.md # Troubleshooting
│   ├── Production_Final_Feature_Testing_*.md  # Production testing
│   ├── Development_Final_Feature_Testing_*.md # Development testing
│   └── archive/               # Archived documentation
│
├── docker/                     # Docker configuration files
│   ├── docker-compose.yml     # Development environment
│   ├── docker-compose.prod.yml # Production with SSL
│   └── docker-compose.prod-http.yml # Production HTTP only
│
├── scripts/                    # Shell scripts and utilities
│   ├── deploy.sh              # Deployment script
│   ├── start.sh               # Start development
│   └── ...                    # Other utility scripts
│
├── database/                  # Database scripts and SQL files
├── config/                    # Configuration files (gitignored)
├── seeds/                     # Database seed data
├── production-deployment/     # Production deployment files
├── nginx/                     # Nginx configuration
│
├── vercel.json                # Vercel deployment configuration
├── railway.json               # Railway deployment configuration
└── README.md                  # This file
```

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

### For Users (Non-Technical)
- **[User Guide](docs/USER_GUIDE.md)** - Complete guide for all users (Doctors, Regular Users, Employees, Admins)
  - Sign up and login process
  - How to place orders
  - Research paper features
  - Profile management
  - Tier system explanation
  - FAQ and troubleshooting

### For Developers (Technical)
- **[Development Guide](docs/DEVELOPMENT.md)** - Setup, development workflow, and best practices
- **[How to Get Credentials](docs/CREDENTIALS_GUIDE.md)** - Step-by-step guide for obtaining all API keys and credentials
  - Google Maps API Key
  - Gmail App Password
  - PayFast credentials
  - Google Drive Service Account
  - Cloud storage (S3)
  - And more...
- **[Deployment Environment Variables](docs/DEPLOYMENT_ENVIRONMENT_VARIABLES.md)** - Vercel & Railway setup guide
  - Quick setup checklist
  - Frontend (Vercel) variables
  - Backend (Railway) variables
  - Security best practices
- **[Environment Variables Reference](docs/ENVIRONMENT_VARIABLES_REFERENCE.md)** - Complete variable reference
  - All variables explained
  - Deployment scenarios (Local, Docker, Production)
  - Security best practices
  - Troubleshooting guide
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture and design decisions
- **[Technical Specifications](docs/TECHNICAL_SPECIFICATIONS.md)** - Detailed technical documentation
  - Database schema
  - API specifications
  - ID assignment system
  - Payment integration
  - Security implementation
- **[API Documentation](docs/API.md)** - Complete API reference
- **[Contributing](docs/CONTRIBUTING.md)** - Contribution guidelines and code standards

### Deployment Documentation
- **[Railway Deployment](docs/RAILWAY_DEPLOYMENT.md)** - Complete Railway backend deployment guide
- **[Railway Deployment Issue Fixes](docs/RAILWAY_DEPLOYMENT_ISSUE_FIXES.md)** - Railway troubleshooting and fixes
- **[Vercel Deployment](docs/VERCEL_DEPLOYMENT.md)** - Complete Vercel frontend deployment guide
- **[Deployment Environment Variables](docs/DEPLOYMENT_ENVIRONMENT_VARIABLES.md)** - Vercel & Railway setup guide
- **[Environment Variables Reference](docs/ENVIRONMENT_VARIABLES_REFERENCE.md)** - Complete variable reference

### Testing Documentation
- **[Production Desktop Testing](docs/Production_Final_Feature_Testing_Desktop_Device.md)** - Complete desktop feature testing checklist
- **[Production Mobile Testing](docs/Production_Final_Feature_Testing_Mobile_Device.md)** - User-end mobile feature testing checklist
- **[Development Desktop Testing](docs/Development_Final_Feature_Testing_Desktop_Device.md)** - Development environment desktop testing
- **[Development Mobile Testing](docs/Development_Final_Feature_Testing_Mobile_Device.md)** - Development environment mobile testing

### Troubleshooting & Guides
- **[Troubleshooting Guide](docs/TROUBLESHOOTING_GUIDE.md)** - General troubleshooting and debugging
- **[Authentication Guide](docs/AUTHENTICATION_GUIDE.md)** - Password reset, login, credentials
- **[TypeScript Guide](docs/TYPESCRIPT_GUIDE.md)** - TypeScript errors and fixes
- **[Issues and Bugs](docs/ISSUES_AND_BUGS.md)** - Bug tracking

### Advertisement System Documentation
- **[Advertisement Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)** - Complete advertisement system implementation details
- **[Advertisement Configuration Guide](docs/ADVERTISEMENT_CONFIGURATION.md)** - How to configure advertisement placements and rotation

### Version History
- **[Changelog](docs/CHANGELOG.md)** - Complete version history and changes

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test
npm run test:coverage

# Frontend tests
cd frontend
npm test
npm run test:coverage

# Type checking
cd backend && npm run type-check
cd frontend && npm run type-check
```

## 🔒 Security

This project implements comprehensive security measures:

- ✅ JWT authentication with strong secrets
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ SQL injection prevention (TypeORM)
- ✅ XSS protection
- ✅ Path traversal prevention
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Input validation (Joi, Zod)
- ✅ Audit logging
- ✅ Security headers (Helmet)
- ✅ Comprehensive test coverage

## 🚢 Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

### Quick Production Deployment

```bash
# Using Docker Compose
cd production-deployment
docker-compose -f docker-compose.prod-http.yml up -d
```

## 📝 License

MIT License

## 👥 Contributors

BioAestheticAx Network Team

## 🔗 Links

- **Repository**: https://github.com/qasimjungle/BioAestheticAx Network_App
- **Issues**: https://github.com/qasimjungle/BioAestheticAx Network_App/issues

---

**Status**: Production Ready ✅  
**Version**: 3.4.0  
**Last Updated**: January 31, 2026  
**CI/CD**: GitHub Actions  
**Test Coverage**: Comprehensive  
**Security Score**: 10/10 ⭐⭐⭐⭐⭐

---

**Written by**: Muhammad Qasim Shabbir
# bioaestheticax
