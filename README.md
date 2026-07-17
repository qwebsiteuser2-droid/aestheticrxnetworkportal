# AestheticRxNetwork - B2B Medical Platform

**Version:** 3.6.0  
**Last Updated:** July 17, 2026  
**Status:** Production Ready ✅  
**Registered entity:** AESTHETICRXNETWORK (PRIVATE LIMITED)

A comprehensive B2B platform designed for medical clinics and doctors to manage orders, share research papers, track performance, collaborate within a medical community, book appointments with doctors, and manage advertisements.

> **v3.6.0 — Brand consolidation:** The product is now formally incorporated. UI, titles, and metadata use the display name **AestheticRxNetwork**; legal, invoice, and copyright text use the registered entity **AESTHETICRXNETWORK (PRIVATE LIMITED)**. The canonical site URL is `aestheticrxnetwork.vercel.app`.

### Production stack

| Layer | Hosting | Notes |
|-------|---------|--------|
| **Frontend** | [Vercel](https://vercel.com) (Next.js 14) | e.g. `aestheticrxnetwork.vercel.app` |
| **Backend API** | [Railway](https://railway.app) (Node.js / Express) | REST + Socket.io |
| **Database** | PostgreSQL 15 | TypeORM migrations on deploy |
| **Email** | Gmail API | Orders, invoices, appointments, tiers |
| **Files** | PostgreSQL (product images) + optional uploads dir | Gallery stored in DB for Railway |

Configure via root [`env.example`](env.example) — see [docs/ENVIRONMENT_VARIABLES_REFERENCE.md](docs/ENVIRONMENT_VARIABLES_REFERENCE.md).

### User roles

| Role | Description |
|------|-------------|
| **Admin** | Full dashboard at `/admin` (users, products, orders, invoices, ads, tiers, exports) |
| **Doctor / clinic** | Orders, research, advertisements, tier benefits, delivery location |
| **Employee** | Delivery assignment dashboard |
| **Regular user** | Book appointments, comment on doctor profiles |

## 📋 Table of Contents

- [Features](#-features)
- [Application routes](#-application-routes-key-pages)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)
- [Environment variables (quick reference)](#-environment-variables-quick-reference)
- [Testing](#-testing)
- [Security](#-security)
- [Deployment](#-deployment)
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
- **Payment Integration**: PayFast on backend (ITN, initialize); portal checkout uses **Cash on Delivery** (PayFast UI hidden until re-enabled)
- **Invoice Generator**: Admin PDF invoices + automatic email on COD orders ([docs/INVOICE_GENERATOR.md](docs/INVOICE_GENERATOR.md))
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

### Checkout, invoices & compliance (v3.5.6)
- **Cash on Delivery checkout**: PayFast removed from portal UI; backend PayFast API/ITN retained for future use
- **One customer email per checkout**: Order confirmation + single **`Invoices.pdf`** attachment (batch cart = one combined Rx challan)
- **Challan PDF**: Logo, homepage brand colors (`#1E6BFF`, `#35B7D6`, `#D59225`), 28-row table — see [docs/INVOICE_GENERATOR.md](docs/INVOICE_GENERATOR.md)
- **Debt limit modal**: Clear 403 debt-restriction message at checkout instead of generic errors
- **Sign-in redirect**: Buy Now / checkout → `/login` with return URL (no sign-in modal on catalog)
- **Product images**: Next.js proxy `/api/product-images/:id?view=` + PostgreSQL gallery (works on Vercel + Railway)
- **Legal / OAuth**: `/privacy`, `/terms`, `/oauth-verification` + [Google OAuth docs](docs/GOOGLE_OAUTH_VERIFICATION.md)

### Product catalog & reviews (v3.5.2–3.5.6)
- **Public browse** on homepage and `/order` without login; checkout requires sign-in
- **ProductDetailsModal**: quantity, **Add to Cart** / **Buy Now**, gallery (front/back/side), product reviews
- **Admin gallery** (`/admin/products`): thumbnail + front/back/side uploads persisted to PostgreSQL
- **Product reviews API**: `product_reviews` table (migration `1700000000028`)

### Doctor Profile & Discovery (v3.5.4)
- **Appointment statistics tab** on doctor profiles (`/user/[id]`): received, accepted/done, and pending counts with monthly or yearly breakdown
- **Date filters**: by calendar year, single month (`YYYY-MM`), or custom date range
- **Patient comments tab**: patients (`regular_user`) can leave public comments on a doctor profile; admins can remove inappropriate comments
- **Find Doctors** (`/doctors`): sort by most appointment requests received or most accepted appointments
- **Appointment filters**: minimum received / minimum accepted thresholds; doctor cards show request and accepted counts
- **Stats source**: aggregated from the `conversations` table (appointment requests)

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
- **Public product catalog** on homepage and `/order` (browse without sign-in)
- Product catalog with stock management, search, and product detail modals
- Shopping cart with **Add to Cart** / **Buy Now** (Buy Now opens cart modal)
- Order tracking and status updates
- Leaderboard system
- Tier-based rewards and benefits
- Certificate generation

### Admin Product Gallery (v3.5.3)
- **Admin product images** (`/admin/products`): separate uploads for catalog thumbnail plus **front**, **back**, and **side** gallery views
- Customer product modal loads views via `/api/product-images/:id?view=front|back|side`

### Homepage & Branding UI (v3.5.2) 🆕
- **Layout**: Top Clinics sidebar (top-left) + full product catalog on the main area
- **No blue hero card** on homepage or order page — catalog-first experience
- **Brand wordmark** (`BrandTitle`): **Aesthetic** / **R** blue, **X** light blue, **Ne** blue–gold blend, **twork** gold
- **Header tagline** (bold): *Professional B2B platform for clinics. Connect, order, research, and grow together.*
- **Logo** aligned to the far left of the header on desktop
- See [`branding-assets/README.md`](branding-assets/README.md) and `frontend/src/components/BrandTitle.tsx`

### Mobile experience (v3.5.7) 🆕
- **Sticky top navigation** on phones: Home, Order, Doctors (with search icon), Status, Ranks, Research, Pride
- **Sign In / Register** and **profile menu** (logout, Admin, Appointment Status) in the header
- **Signed-in Home (mobile)**: no product grid — shop via **Order** tab; **Top Clinics** auto-expanded
- **Guests on Home**: full catalog; Buy Now / Add to Cart still redirect to login with product context
- **Product modal**: Quantity → Add to Cart / Buy Now → Share directly under images
- **Appointment Status**: unread conversations first; layout fits narrow screens
- Full details: [`docs/MOBILE_AND_PWA.md`](docs/MOBILE_AND_PWA.md)

### Progressive Web App (PWA) (v3.5.1+)
- **Installable App**: Add to home screen on mobile and desktop
- **Consistent App Name**: Installed app displays as **AestheticRxNetwork**
- **Manifest**: `frontend/public/manifest.json` — `display: standalone`, theme `#1E66FF`
- **iOS Title**: `appleWebApp.title` in `frontend/src/app/layout.tsx`

> **Note:** After a manifest change, reinstall the PWA so the OS picks up new icons/name.

**Install steps (Android / iOS):** [`docs/MOBILE_AND_PWA.md`](docs/MOBILE_AND_PWA.md)

## 🗺️ Application routes (key pages)

| Route | Purpose |
|-------|---------|
| `/` | Homepage: catalog (guests / desktop); Top Clinics; foldable sections — mobile signed-in users use **Order** tab to shop |
| `/messages` | Appointment Status (conversations) |
| `/order` | Full catalog, cart, COD checkout |
| `/doctors`, `/user/[id]` | Find doctors, profiles, stats, comments |
| `/messages`, `/appointments` | Appointment requests & status |
| `/research`, `/research-lab` | Research papers |
| `/leaderboard`, `/hall-of-pride` | Community recognition |
| `/advertisement`, `/advertisement/apply-new` | Doctor advertisements (COD) |
| `/login`, `/signup` | Auth (email/password + Google) |
| `/privacy`, `/terms` | Legal (OAuth verification) |
| `/admin` | Admin dashboard — see [docs/README.md](docs/README.md#admin-dashboard-map) |

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
- **PWA**: Installable Progressive Web App via `frontend/public/manifest.json` (app name **AestheticRxNetwork**)

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
- **Payment**: PayFast (backend only; UI uses COD for now)

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
   git clone https://github.com/qasimjungle/AestheticRxNetwork_App.git
   cd AestheticRxNetwork_App
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
aestheticrx/
├── frontend/                   # Next.js frontend application (Vercel deployment)
│   ├── src/
│   │   ├── app/               # Next.js app router pages
│   │   │   ├── doctors/       # Doctors listing & appointment page
│   │   │   ├── messages/      # Appointments status page
│   │   │   ├── order/         # Product catalog & checkout
│   │   │   ├── admin/         # Admin dashboard (invoices, products, …)
│   │   │   ├── api/product-images/  # Image proxy to Railway backend
│   │   │   ├── privacy/, terms/   # Legal pages
│   │   │   ├── oauth-verification/
│   │   │   └── ...            # doctors, research, messages, etc.
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
│   │   │   ├── gmailService.ts      # Email (orders, invoices, tiers)
│   │   │   ├── invoiceService.ts    # Rx challan PDF (PDFKit)
│   │   │   ├── debtService.ts       # Tier debt limits
│   │   │   └── ...
│   │   ├── assets/invoice/    # logo.png for PDF challans (copied in Docker)
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
│   ├── README.md              # Documentation index (start here)
│   ├── CHANGELOG.md           # Version history
│   ├── USER_GUIDE.md          # End-user guide
│   ├── INVOICE_GENERATOR.md   # Challan / Invoices.pdf
│   ├── GOOGLE_OAUTH_*.md      # OAuth verification
│   ├── API.md, ARCHITECTURE.md, DEVELOPMENT.md, …
│   └── archive/               # Historical docs only
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
- **[Environment Variables Reference](docs/ENVIRONMENT_VARIABLES_REFERENCE.md)** - Complete variable reference (Vercel + Railway)
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

### Deployment documentation
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production overview
- **[Railway Deployment](docs/RAILWAY_DEPLOYMENT.md)** - Backend on Railway
- **[Vercel Deployment](docs/VERCEL_DEPLOYMENT.md)** - Frontend on Vercel
- **[Environment Variables Reference](docs/ENVIRONMENT_VARIABLES_REFERENCE.md)** - Vercel & Railway variables
- **[CI/CD Pipelines](docs/CI_CD_PIPELINES.md)** - GitHub Actions

### Testing Documentation
- **[Production Desktop Testing](docs/Production_Final_Feature_Testing_Desktop_Device.md)** - Complete desktop feature testing checklist
- **[Production Mobile Testing](docs/Production_Final_Feature_Testing_Mobile_Device.md)** - User-end mobile feature testing checklist
- **[Development Desktop Testing](docs/Development_Final_Feature_Testing_Desktop_Device.md)** - Development environment desktop testing
- **[Development Mobile Testing](docs/Development_Final_Feature_Testing_Mobile_Device.md)** - Development environment mobile testing

### Invoices & Payments
- **[Invoice Generator](docs/INVOICE_GENERATOR.md)** - Admin PDF invoices and COD order email attachments
- **[PayFast Setup](docs/PAYFAST_SETUP_GUIDE.md)** - Backend PayFast configuration (portal UI uses COD)

### Google OAuth & Compliance
- **[Google OAuth Verification](docs/GOOGLE_OAUTH_VERIFICATION.md)** - App verification checklist
- **[OAuth Scope Justifications](docs/GOOGLE_OAUTH_SCOPE_JUSTIFICATIONS.md)** - Scope text for Google Console
- **[Search Console Verification](docs/SEARCH_CONSOLE_VERIFICATION_STEPS.md)** - Domain verification steps

### Guides & quality
- **[TypeScript Guide](docs/TYPESCRIPT_GUIDE.md)** - TypeScript errors and fixes
- **[Email Setup](docs/EMAIL_SETUP.md)** - Gmail API configuration
- **[Security Guide](docs/SECURITY.md)** - Security practices

### Version history
- **[Changelog](docs/CHANGELOG.md)** - Complete version history (current: **3.5.7**)
- **[Mobile UI & PWA](docs/MOBILE_AND_PWA.md)** - Sticky navigation, Home/Order behavior, install as app
- **[Documentation index](docs/README.md)** - Full doc map and admin routes

## 🔧 Environment variables (quick reference)

Copy [`env.example`](env.example) to `.env` at the repo root. Minimum for local dev:

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API base URL |
| `NEXT_PUBLIC_SITE_URL` | Frontend | Canonical site URL (OAuth, links) |
| `DATABASE_URL` | Backend | PostgreSQL connection |
| `JWT_SECRET` | Backend | Auth tokens |
| `FRONTEND_URL` | Backend | CORS + email links (comma-separated in prod) |
| `GMAIL_API_*` | Backend | Order + invoice emails |
| `MAIN_ADMIN_EMAIL` | Backend | Order notification recipient |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Frontend | Delivery location on order |

Optional: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, PayFast vars (backend only), Twilio, Redis.

Full list: [docs/ENVIRONMENT_VARIABLES_REFERENCE.md](docs/ENVIRONMENT_VARIABLES_REFERENCE.md).

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

| Step | Action |
|------|--------|
| 1 | Push to `main` (GitHub Actions CI) |
| 2 | **Railway**: deploy `backend/` — run migrations, set `DATABASE_URL`, `GMAIL_API_*`, `MAIN_ADMIN_EMAIL` |
| 3 | **Vercel**: deploy `frontend/` — set `NEXT_PUBLIC_API_URL` to Railway URL |
| 4 | Verify `/health`, place test COD order, confirm **Invoices.pdf** email |

Guides: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · [Railway](docs/RAILWAY_DEPLOYMENT.md) · [Vercel](docs/VERCEL_DEPLOYMENT.md)

### Docker Compose (self-hosted)

```bash
cd production-deployment
docker-compose -f docker-compose.prod-http.yml up -d
```

Backend Docker images include `backend/assets/invoice/` for PDF generation.

## 📝 License

MIT License

## 👥 Contributors

AestheticRxNetwork Team

## 🔗 Links

- **Repository**: https://github.com/qasimjungle/AestheticRxNetwork_App
- **Issues**: https://github.com/qasimjungle/AestheticRxNetwork_App/issues

---

**Status**: Production Ready ✅  
**Version**: 3.5.7  
**Last Updated**: June 2, 2026  
**CI/CD**: GitHub Actions  
**Test Coverage**: Comprehensive  
**Security Score**: 10/10 ⭐⭐⭐⭐⭐

---

**Written by**: Muhammad Qasim Shabbir
