# Technical Specifications

**BioAestheticAx Network B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.5.0 |
| **Last Updated** | January 31, 2026 |

---

This document provides comprehensive technical details about the BioAestheticAx Network platform for developers and technical stakeholders.

## Table of Contents

### 1. System Overview
- [1.1 Platform Type](#11-platform-type)
- [1.2 Core Components](#12-core-components)

### 2. Technology Stack
- [2.1 Frontend Stack](#21-frontend-stack)
- [2.2 Backend Stack](#22-backend-stack)
- [2.3 Infrastructure](#23-infrastructure)
- [2.4 Rendering Strategy](#24-rendering-strategy)

### 3. Architecture
- [3.1 System Architecture](#31-system-architecture)
- [3.2 Component Architecture](#32-component-architecture)

### 4. Database Design
- [4.1 Database Schema](#41-database-schema)
- [4.2 Database Relationships](#42-database-relationships)

### 5. API Specifications
- [5.1 Base URL](#51-base-url)
- [5.2 Authentication](#52-authentication)
- [5.3 Response Format](#53-response-format)

### 6. System Components
- [6.1 Authentication & Authorization](#61-authentication--authorization)
- [6.2 User Management System](#62-user-management-system)
- [6.3 ID Assignment System](#63-id-assignment-system)
- [6.4 Payment Integration](#64-payment-integration)
- [6.5 File Upload System](#65-file-upload-system)
- [6.6 Email & Notification System](#66-email--notification-system)

### 7. Security & Deployment
- [7.1 Security Implementation](#71-security-implementation)
- [7.2 Deployment Architecture](#72-deployment-architecture)
- [7.3 Performance Considerations](#73-performance-considerations)

---

## 1. System Overview

### 1.1 Platform Type
- **Category**: B2B Medical Platform
- **Architecture**: Full-stack web application
- **Deployment**: Containerized (Docker)
- **Database**: PostgreSQL (relational)
- **Cache**: Redis (optional)

### 1.2 Core Components

1. **Frontend**: Next.js 14 (React-based)
2. **Backend**: Express.js (Node.js)
3. **Database**: PostgreSQL 15
4. **Reverse Proxy**: Nginx
5. **Containerization**: Docker & Docker Compose

---

## 2. Technology Stack

### 2.1 Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with SSR/SSG |
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first CSS framework |
| Axios | Latest | HTTP client |
| React Hook Form | Latest | Form management |
| React Hot Toast | Latest | Notifications |
| Recharts | Latest | Data visualization |
| @react-oauth/google | Latest | Google OAuth 2.0 Sign-In |
| Socket.io Client | Latest | Real-time communication |

### 2.2 Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | JavaScript runtime |
| Express.js | 4.x | Web framework |
| TypeScript | 5.x | Type safety |
| TypeORM | 0.3.x | Object-Relational Mapping |
| PostgreSQL | 15.x | Relational database |
| JWT | Latest | Authentication tokens |
| bcrypt | Latest | Password hashing |
| Multer | Latest | File upload handling |
| Nodemailer | 7.x | Email service (fallback) |
| Gmail API | Latest | Email service (primary) |
| google-auth-library | Latest | Google OAuth token verification |
| googleapis | Latest | Gmail API integration |
| Twilio | Latest | WhatsApp/SMS service |
| Socket.io | Latest | Real-time communication |

### 2.3 Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| Nginx | Reverse proxy & load balancing |
| GitHub Actions | CI/CD pipeline |
| PayFast | Payment gateway integration |

### 2.4 Rendering Strategy (v3.4.0)

Next.js 14 App Router hybrid rendering approach optimized for performance and SEO.

#### Rendering Types Used

| Rendering Type | Pages | Rationale |
|----------------|-------|-----------|
| **SSG (Static)** | Privacy Policy, Terms of Service | 100% static content, no JS needed, best performance |
| **ISR (Incremental Static Regeneration)** | Research, Leaderboard | Public content, SEO important, revalidates every 5 minutes |
| **CSR (Client-Side)** | Login, Signup, Admin, Dashboard, Order | Forms, authentication, highly interactive |
| **Hybrid (Server + Client Islands)** | Homepage, Doctor Search | Static shell with interactive components |

#### Page Classification

**Static Pages (SSG) - Pre-rendered at build time:**
```
/privacy          → No 'use client', metadata exported
/terms            → No 'use client', metadata exported  
/privacy-policy   → No 'use client', metadata exported
```

**ISR Pages - Revalidated periodically:**
```
/research         → revalidate = 300 (5 minutes)
/leaderboard      → revalidate = 300 (5 minutes)
```

**Client Pages (CSR) - Full client-side rendering:**
```
/login            → Forms, authentication flow
/signup           → Forms, user registration
/admin/*          → Protected, interactive dashboards
/dashboard        → User-specific data
/order            → Shopping cart, payment flow
/profile          → Interactive editing
/messages/*       → Real-time messaging
```

**Hybrid Pages - Server layout with client islands:**
```
/doctors          → Layout metadata + client page component
/hall-of-pride    → Layout metadata + client page component
/order            → Layout metadata + client page component
```

#### SEO Optimization

All public-facing pages include:
- **Metadata exports** for title, description, keywords
- **Open Graph tags** for social sharing
- **Structured data** where applicable

Example metadata structure:
```typescript
export const metadata: Metadata = {
  title: 'Page Title | BioAestheticAx Network',
  description: 'Page description for SEO',
  keywords: 'relevant, keywords, here',
  openGraph: {
    title: 'Page Title',
    description: 'Description for social sharing',
    type: 'website',
  },
};
```

#### UX Patterns (v3.5.0)

**Loading States (Streaming)**

Skeleton loaders provide instant feedback during navigation:

```
frontend/src/app/
├── loading.tsx              # Root loading state
├── doctors/loading.tsx      # Doctor cards skeleton
├── research/loading.tsx     # Research papers skeleton
├── leaderboard/loading.tsx  # Rankings skeleton
├── order/loading.tsx        # Products grid skeleton
└── hall-of-pride/loading.tsx # Achievements skeleton
```

Benefits:
- Zero blank screen time during navigation
- Perceived performance improvement
- Works with React Suspense and streaming

**Error Boundaries**

Graceful error handling at route level:

```
frontend/src/app/
├── error.tsx          # Root error boundary
├── doctors/error.tsx  # Doctor-specific errors
└── order/error.tsx    # Order-specific errors
```

Features:
- "Try Again" button to reset error state
- Contextual error messages per route
- Development mode shows error details
- Support contact information

**Custom 404 Page**

Static not-found page with helpful navigation:

```
frontend/src/app/not-found.tsx  # Custom 404 with quick links
```

**Dynamic Imports**

Heavy components loaded on-demand to reduce initial bundle:

```typescript
// Homepage dynamic imports
const VideoAdvertisementModal = dynamic(
  () => import('@/components/VideoAdvertisementModal'),
  { ssr: false }
);

const HeroCards = dynamic(
  () => import('@/components/HeroCards'),
  { loading: () => <Skeleton /> }
);
```

Impact: ~30% reduction in initial JavaScript bundle size

#### Performance Benefits

| Optimization | Impact |
|--------------|--------|
| Static pages | ~100ms TTFB, no server computation |
| ISR pages | Fresh content without rebuild |
| Client pages | Interactive immediately after hydration |
| Layout metadata | SEO without SSR overhead |
| Loading skeletons | Zero blank screen time |
| Dynamic imports | ~30% smaller initial bundle |
| Error boundaries | Graceful failure recovery |

---

## 3. Architecture

### 3.1 System Architecture

```
┌─────────────────────────────────────────┐
│         Client (Web Browser)            │
└──────────────────┬──────────────────────┘
                   │ HTTPS
                   │
┌──────────────────▼──────────────────────┐
│         Nginx (Reverse Proxy)           │
│  - SSL Termination                      │
│  - Static File Serving                  │
│  - Load Balancing                       │
└──────────┬──────────────────┬───────────┘
           │                  │
    ┌──────▼──────┐    ┌──────▼──────┐
    │  Frontend    │    │   Backend   │
    │  (Next.js)   │    │  (Express)  │
    │  Port 3000   │    │  Port 4000  │
    └─────────────┘    └──────┬───────┘
                              │
                  ┌───────────┼───────────┐
                  │           │           │
          ┌───────▼──┐  ┌─────▼────┐  ┌──▼────┐
          │PostgreSQL│  │  Redis   │  │Storage│
          │  :5432   │  │  :6379   │  │(Files)│
          └──────────┘  └──────────┘  └───────┘
```

### Application Layers

1. **Presentation Layer** (Frontend)
   - React components
   - Next.js pages
   - Client-side routing
   - State management

2. **API Layer** (Backend)
   - RESTful endpoints
   - Request/response handling
   - Authentication middleware
   - Error handling

3. **Business Logic Layer** (Services)
   - Domain logic
   - Data validation
   - Business rules
   - External service integration

4. **Data Access Layer** (TypeORM)
   - Database queries
   - Entity management
   - Migrations
   - Relationships

## Database Schema

### Core Entities

#### Users (doctors table)

```sql
CREATE TABLE doctors (
  id UUID PRIMARY KEY,
  doctor_id INTEGER UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  doctor_name VARCHAR(255) NOT NULL,
  clinic_name VARCHAR(255),
  signup_id VARCHAR(50) UNIQUE,
  user_type ENUM('doctor', 'regular', 'employee', 'admin'),
  is_approved BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  is_deactivated BOOLEAN DEFAULT false,
  tier VARCHAR(50) DEFAULT 'Lead Starter',
  tier_color VARCHAR(50),
  profile_photo_url VARCHAR(500),
  whatsapp VARCHAR(20),
  google_location JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Key Fields:**
- `doctor_id`: Auto-incremented from 42001 (only for doctors)
- `signup_id`: Required for doctor registration (42001-42030 range)
- `user_type`: Determines access level and features
- `is_admin`: Full admin access flag

#### Orders

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  doctor_id UUID REFERENCES doctors(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  total_amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  payment_status VARCHAR(50),
  payment_amount DECIMAL(10,2),
  delivery_status VARCHAR(50),
  order_location JSONB,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### Products

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  stock_quantity INTEGER DEFAULT 0,
  image_url VARCHAR(500),
  category VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### Research Papers

```sql
CREATE TABLE research_papers (
  id UUID PRIMARY KEY,
  doctor_id UUID REFERENCES doctors(id),
  title VARCHAR(255) NOT NULL,
  abstract TEXT,
  content TEXT,
  citations JSONB,
  image_urls VARCHAR(500)[],
  pdf_file_url VARCHAR(500),
  is_approved BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### Allowed Signup IDs

```sql
CREATE TABLE allowed_signup_ids (
  id UUID PRIMARY KEY,
  signup_id VARCHAR(50) UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES doctors(id),
  notes TEXT,
  created_at TIMESTAMP
);
```

#### Certificates

```sql
CREATE TABLE certificates (
  id UUID PRIMARY KEY,
  doctor_id UUID REFERENCES doctors(id),
  tier_name VARCHAR(100) NOT NULL,
  certificate_url VARCHAR(500),
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### Badges

```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY,
  doctor_id UUID REFERENCES doctors(id),
  badge_type ENUM('achievement', 'milestone', 'special', 'custom') NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50) DEFAULT '#6B46C1',
  earned_date TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Key Fields:**
- `badge_type`: Type of badge (achievement, milestone, special, custom)
- `name`: Badge name displayed to users
- `icon`: Emoji or icon identifier (e.g., '🏆', '⭐', '💎')
- `color`: Hex color code for badge display
- `earned_date`: Date when badge was earned/assigned
- `is_active`: Whether badge is currently active/visible

### 4.2 Database Relationships

```
doctors (1) ──< (N) orders
doctors (1) ──< (N) research_papers
doctors (1) ──< (N) certificates
doctors (1) ──< (N) badges
products (1) ──< (N) orders
allowed_signup_ids (1) ──< (1) doctors
```

---

## 5. API Specifications

### 5.1 Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:4000/api
```

### 5.2 Authentication

All protected endpoints require JWT token:

```
Authorization: Bearer <access_token>
```

### 5.3 Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (development only)"
}
```

### Key Endpoints

#### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/password-reset/request` - Request password reset (sends OTP)
- `POST /api/auth/password-reset/confirm` - Confirm password reset with OTP
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

#### Orders

- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id` - Update order (admin)

#### Products

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)

#### Research

- `GET /api/research` - Get research papers
- `POST /api/research` - Upload research paper
- `GET /api/research/:id` - Get paper details
- `PUT /api/research/:id/approve` - Approve paper (admin)

---

## 6. System Components

### 6.1 Authentication & Authorization

#### 6.1.1 JWT Token System

**Access Token:**
- Expires: 1 hour (configurable via `JWT_EXPIRES_IN`)
- Contains: user ID, email, role
- Stored: HTTP-only cookie or localStorage

**Refresh Token:**
- Expires: 7 days (configurable via `JWT_REFRESH_EXPIRES_IN`)
- Used to obtain new access tokens
- Stored: HTTP-only cookie

### Token Structure

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "doctorId": 42001,
  "isAdmin": false,
  "iat": 1234567890,
  "exp": 1234567890,
  "aud": "q-website1-users",
  "iss": "q-website1"
}
```

### Role-Based Access Control

**Roles:**
1. **Admin**: Full system access
2. **Doctor**: Order, research, profile features
3. **Employee**: Delivery tracking features
4. **Regular**: Read-only access

**Permission Levels:**
- Public: No authentication required
- Authenticated: Any logged-in user
- Doctor: Doctor role required
- Admin: Admin role required
- Custom: Permission-based access

## User Management System

### User Types

#### Doctor
- **Registration**: Requires Signup ID
- **Approval**: Admin approval required
- **Features**: Full user features + research upload
- **ID Assignment**: Auto-incremented from 42001

#### Regular User
- **Registration**: No Signup ID needed
- **Approval**: Auto-approved
- **Features**: Read-only access
- **ID Assignment**: No doctor_id assigned

#### Employee
- **Registration**: No Signup ID needed
- **Approval**: Auto-approved
- **Features**: Delivery tracking
- **ID Assignment**: No doctor_id assigned

#### Admin
- **Creation**: System-generated or promoted
- **Approval**: Immediate access
- **Features**: All features + admin panel
- **ID Assignment**: May have doctor_id if converted from doctor

### User Registration Flow

```
1. User selects user type
2. Fill registration form
3. If Doctor:
   - Validate Signup ID
   - Check if ID is available
   - Mark ID as used
4. Hash password
5. If Doctor:
   - Generate doctor_id (auto-increment)
6. Create user record
7. If Regular/Employee:
   - Auto-approve
8. If Doctor:
   - Send approval request to admin
9. Send confirmation email
```

### 6.3 ID Assignment System

### Signup ID System

**Purpose**: Control doctor registration

**Range**: 42001-42030 (configurable)

**Lifecycle:**
1. Admin creates Signup IDs
2. IDs stored in `allowed_signup_ids` table
3. Doctor uses ID during registration
4. System validates ID availability
5. ID marked as `is_used = true`
6. ID linked to doctor record

**Validation:**
```typescript
// Check if Signup ID exists and is unused
const signupId = await signupIdRepository.findOne({
  where: { signup_id, is_used: false }
});
```

### Doctor ID Assignment

**Auto-Increment Logic:**
```typescript
// Get last doctor_id
const lastDoctor = await doctorRepository
  .createQueryBuilder('doctor')
  .where('doctor.doctor_id IS NOT NULL')
  .orderBy('doctor.doctor_id', 'DESC')
  .getOne();

// Increment from last or start at 42001
const nextId = lastDoctor?.doctor_id 
  ? lastDoctor.doctor_id + 1 
  : 42001;
```

**Characteristics:**
- Starts at 42001
- Increments by 1
- Only assigned to Doctors
- Used for leaderboard and tracking
- Unique constraint enforced

### 6.4 Payment Integration

### PayFast Integration

**Configuration:**
- Merchant ID
- Merchant Key
- Passphrase
- Sandbox/Production mode

**Payment Flow:**
1. User places order
2. System creates order records
3. Generate PayFast payment form
4. User redirected to PayFast
5. User completes payment
6. PayFast sends ITN (Instant Transaction Notification)
7. System verifies payment
8. Update order status
9. Send confirmation emails

**ITN Handling:**
- Signature verification
- Payment status update
- Order status update
- Email notifications
- Idempotency checks

### Payment Methods

**Cash on Delivery:**
- No online payment
- Status: `pending`
- Admin updates manually

**PayFast Online:**
- Secure payment gateway
- Status: `paid` (after verification)
- Automatic confirmation

### 6.5 File Upload System

### Upload Configuration

**Supported Formats:**
- Images: JPG, PNG, GIF, WebP
- Documents: PDF
- Videos: MP4, WebM, MOV (for advertisements)
- Maximum Size: 
  - General files: 10MB
  - Advertisement videos: 50MB
  - Advertisement images: 2MB
  - Advertisement animations (GIF): 5MB

**Storage:**
- Local filesystem: `backend/uploads/`
- Path: `/api/images/[...path]`
- CDN-ready structure

### Upload Flow

1. Client selects file
2. File validated (type, size)
3. Uploaded to server
4. File stored in uploads directory
5. URL generated and returned
6. URL stored in database

### 6.6 Email & Notification System

### Email Service

**Primary Provider**: Gmail API with OAuth 2.0 (v3.4.0)

**Configuration:**
- Google Cloud Console project
- Gmail API enabled
- OAuth 2.0 credentials (client ID, client secret)
- Refresh token for persistent access
- Service account or user credentials

**Fallback Provider**: Gmail SMTP with App Password

**Configuration:**
- Gmail account
- App password (requires 2FA)
- SMTP settings (port 587, TLS)

**Email Types:**
- Registration confirmation
- Password reset OTP codes
- Admin approval notifications
- Order confirmations
- Payment confirmations
- Research paper approvals
- Tier upgrade notifications
- Appointment request notifications (v3.4.0)
- Appointment acceptance notifications (v3.4.0)

**Gmail API Implementation:**

```
1. Initialize Gmail client with OAuth credentials
2. Build email message (MIME format)
3. Encode message as base64url
4. Send via Gmail API users.messages.send()
5. Track email ID for delivery confirmation
6. Retry with exponential backoff on failure
7. Fall back to SMTP if API fails
```

### Notification System

**Channels:**
- Email (Gmail API / SMTP)
- WhatsApp (Twilio)
- In-app notifications (Bell icon)
- Real-time Socket.io notifications

**Triggers:**
- Order placed
- Order status changed
- Payment received
- Research approved
- Tier upgraded
- Admin actions
- Appointment requested (v3.4.0)
- Appointment accepted (v3.4.0)

---

### 6.7 Google OAuth Integration (v3.4.0)

### OAuth 2.0 Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Google OAuth 2.0 Flow                     │
├─────────────────────────────────────────────────────────────┤
│  1. User clicks "Sign in with Google" button                │
│  2. Google Identity Services popup opens                    │
│  3. User authenticates with Google account                  │
│  4. Google returns ID Token (JWT) to frontend               │
│  5. Frontend sends ID Token to backend /auth/google         │
│  6. Backend verifies token using google-auth-library        │
│  7. Backend extracts payload: email, name, picture          │
│  8. Backend creates new user OR links to existing           │
│  9. Backend issues JWT access + refresh tokens              │
│ 10. User is authenticated (skips OTP for Google users)      │
└─────────────────────────────────────────────────────────────┘
```

### Token Verification Process

**Backend verification steps:**
1. Verify ID token signature
2. Verify token audience (client ID)
3. Verify token issuer (accounts.google.com)
4. Verify token not expired
5. Extract user payload (email, sub, name, picture)

### User Creation/Linking Logic

```
If email exists in database:
  → Link Google account to existing user
  → Update profile picture if not set
  → Return existing user with new tokens

If email does not exist:
  → Create new user account
  → Set user_type based on context
  → Mark as auto-approved (regular user)
  → Return new user with tokens
```

---

### 6.8 Doctor Appointment System (v3.2.0-3.4.0)

### Data Models

**Conversation Model:**
- `id`: UUID primary key
- `user_id`: Foreign key to users table
- `doctor_id`: Foreign key to doctors table
- `status`: enum ('pending', 'accepted', 'rejected')
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Message Model:**
- `id`: UUID primary key
- `conversation_id`: Foreign key to conversations
- `sender_id`: Foreign key to users
- `content`: Text content
- `created_at`: Timestamp

**Notification Model:**
- `id`: UUID primary key
- `recipient_id`: Foreign key to users
- `type`: enum ('appointment_request', 'appointment_accepted', etc.)
- `content`: Notification message
- `is_read`: Boolean
- `created_at`: Timestamp

### Appointment Status Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                 Appointment Status Workflow                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [Patient requests appointment]                            │
│              │                                              │
│              ▼                                              │
│        ┌─────────┐                                          │
│        │ PENDING │ ←── Initial state                        │
│        └────┬────┘                                          │
│              │                                              │
│    Doctor accepts appointment                               │
│              │                                              │
│              ▼                                              │
│       ┌──────────┐                                          │
│       │ ACCEPTED │ ←── Doctor contact info shared           │
│       └──────────┘                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Doctor-to-Doctor Restriction

- Doctors cannot set appointments with other doctors
- Modal popup displayed when doctor attempts to set appointment
- Feature is restricted to patient (regular user) role only

---

## 7. Security & Deployment

### 7.1 Security Implementation

### Password Security

- **Hashing**: bcrypt with 12 rounds
- **Requirements**: Minimum 8 characters
- **Storage**: Hashed only, never plain text

### SQL Injection Prevention

- **ORM**: TypeORM with parameterized queries
- **Validation**: Input validation on all endpoints
- **Sanitization**: Data sanitization before queries

### XSS Protection

- **Input Sanitization**: DOMPurify for user content
- **CSP Headers**: Content Security Policy
- **Output Encoding**: Automatic encoding in templates

### CSRF Protection

- **SameSite Cookies**: Strict same-site policy
- **Token Validation**: CSRF tokens for state-changing operations

### Rate Limiting

- **Implementation**: express-rate-limit
- **Limits**: 100 requests per 15 minutes
- **IP-based**: Per IP address tracking

### 7.2 Deployment Architecture

### Container Structure

```
docker-compose.yml
├── frontend (Next.js)
├── backend (Express)
├── db (PostgreSQL)
├── redis (Optional)
└── nginx (Reverse Proxy)
```

### Environment Variables

**Required Variables:**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret (32+ chars)
- `JWT_REFRESH_SECRET`: Refresh token secret (32+ chars)
- `GMAIL_USER`: Gmail account for emails
- `GMAIL_APP_PASSWORD`: Gmail app password

**Optional Variables:**
- `REDIS_URL`: Redis connection string
- `PAYFAST_*`: PayFast credentials
- `TWILIO_*`: Twilio credentials

### Deployment Process

1. Build Docker images
2. Run database migrations
3. Seed initial data (optional)
4. Start containers
5. Configure Nginx
6. Set up SSL certificates
7. Health checks

### 7.3 Performance Considerations

### Database Optimization

- **Indexes**: On frequently queried fields
- **Connection Pooling**: TypeORM connection pool
- **Query Optimization**: Efficient queries with joins
- **Caching**: Redis for frequently accessed data

### Frontend Optimization

- **Code Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js Image component
- **Static Generation**: SSG for static pages
- **Caching**: Browser and CDN caching

### API Optimization

- **Pagination**: Limit results per page
- **Filtering**: Server-side filtering
- **Compression**: Gzip compression
- **Rate Limiting**: Prevent abuse

## Monitoring & Logging

### Logging

- **Application Logs**: Console and file logs
- **Error Tracking**: Comprehensive error logging
- **Audit Logs**: Security-sensitive operations
- **Request Logs**: API request/response logging

### Monitoring

- **Health Checks**: `/health` endpoint
- **Database Monitoring**: Connection status
- **Performance Metrics**: Response times
- **Error Rates**: Track error frequencies

---

## Related Documentation

- [Architecture Documentation](./ARCHITECTURE.md) - System architecture details
- [Deployment Guide](./DEPLOYMENT.md) - Deployment instructions
- [API Documentation](./API.md) - API reference
- [Security Guide](./SECURITY.md) - Security implementation

---

**Document Version**: 3.4.0  
**Last Updated**: January 31, 2026

