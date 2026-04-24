# System Architecture

**AestheticRxNetwork B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.2.0 |
| **Last Updated** | January 27, 2026 |

---

## Overview

AestheticRxNetwork is a full-stack B2B medical platform built with modern web technologies following a microservices-oriented architecture with clear separation between frontend, backend, and data layers.

### Key Principles

- **Separation of Concerns**: Clear boundaries between layers
- **Type Safety**: TypeScript throughout the stack
- **Security First**: Comprehensive security measures
- **Scalability**: Designed for horizontal scaling
- **Maintainability**: Clean code and documentation

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                          │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                      CDN / Load Balancer                      │
│                (Vercel Edge / Railway)                        │
└─────────────────┬───────────────────────┬────────────────────┘
                  │                       │
          ┌───────▼────────┐      ┌───────▼────────┐
          │   Frontend      │      │    Backend      │
          │   (Next.js)     │      │   (Express)     │
          │   Vercel        │      │   Railway       │
          └─────────────────┘      └────────┬────────┘
                                            │
                            ┌───────────────┼───────────────┐
                            │               │               │
                    ┌───────▼────┐  ┌───────▼───┐  ┌───────▼───┐
                    │ PostgreSQL  │  │   Gmail   │  │  Storage  │
                    │  (Railway)  │  │   API     │  │  (Local)  │
                    └─────────────┘  └───────────┘  └───────────┘
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with SSR |
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| Axios | Latest | HTTP client |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime |
| Express.js | 4.x | Web framework |
| TypeScript | 5.x | Type safety |
| TypeORM | 0.3.x | ORM |
| PostgreSQL | 15.x | Database |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Vercel | Frontend hosting |
| Railway | Backend hosting & PostgreSQL |
| GitHub Actions | CI/CD pipelines |

---

## Component Architecture

### Frontend Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public pages
│   ├── admin/             # Admin pages
│   ├── user/              # User pages
│   └── api/               # API routes (proxies)
├── components/            # React components
│   ├── layout/           # Layout components
│   ├── modals/           # Modal components
│   └── ui/               # UI components
├── lib/                   # Utilities
│   ├── api.ts            # API client
│   └── utils.ts          # Helper functions
└── types/                 # TypeScript types
```

### Backend Structure

```
backend/
├── controllers/           # Request handlers
├── services/             # Business logic
├── models/               # Database entities
├── routes/               # API routes
├── middleware/           # Express middleware
│   ├── auth.ts          # Authentication
│   ├── admin.ts         # Admin authorization
│   └── errorHandler.ts  # Error handling
├── db/                   # Database config
│   ├── data-source.ts   # TypeORM config
│   └── migrations/      # Database migrations
└── utils/                # Utilities
```

---

## Database Schema

### Entity Relationship

```
doctors (users)
├── orders
│   └── products
├── research_papers
│   ├── research_paper_views
│   └── research_paper_upvotes
├── certificates
├── badges
├── admin_permissions
└── teams
    └── team_members

tier_configs
└── doctors (tier assignment)

advertisements
├── advertisement_applications
└── advertisement_placements
```

### Key Entities

| Entity | Description |
|--------|-------------|
| Doctors | Central user entity (Admin/Doctor/Employee/Regular) |
| Orders | Order lifecycle management |
| Products | Product catalog with inventory |
| Research Papers | Research publication system |
| Tier Configs | Performance-based tiering |
| Certificates | Auto-generated tier certificates |
| Badges | Admin-assigned achievement badges |
| Teams | Team formation for leaderboard |
| Conversations | Doctor-patient appointment requests |
| Notifications | Real-time user notifications (appointments, messages) |

### Database Patterns

- **UUID Primary Keys**: Security and scalability
- **Soft Deletes**: `is_deactivated` flags
- **Audit Fields**: `created_at`, `updated_at`
- **JSONB Columns**: Flexible data (PostgreSQL)
- **Indexes**: On frequently queried fields

---

## API Architecture

### RESTful Design

```
/api
├── /auth          # Authentication
├── /products      # Product catalog
├── /orders        # Order management
├── /research      # Research papers
├── /leaderboard   # Rankings
├── /teams         # Team management
├── /badges        # Badge management
├── /certificates  # Certificate generation
├── /payfast       # Payment processing
├── /conversations # Doctor-patient appointments
├── /notifications # User notifications
├── /doctors       # Doctor profiles & online status
└── /admin         # Admin operations
```

### Authentication Flow

```
1. Login: POST /api/auth/login → JWT tokens
2. Request: Authorization: Bearer <access_token>
3. Refresh: POST /api/auth/refresh → New tokens
```

### Response Format

```typescript
// Success
{ success: true, data: { ... }, message?: string }

// Error
{ success: false, message: string, error?: string }
```

---

## Security Architecture

### Security Layers

```
┌─────────────────────────────────┐
│  1. Network Layer                │
│     - SSL/TLS encryption        │
│     - Rate limiting             │
│     - CORS configuration        │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  2. Application Layer           │
│     - Helmet security headers   │
│     - Input validation          │
│     - JWT authentication        │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  3. Business Logic Layer        │
│     - Role-based access control │
│     - Permission validation     │
│     - Audit logging             │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  4. Data Layer                  │
│     - SQL injection prevention  │
│     - Parameterized queries     │
│     - Password hashing (bcrypt) │
└─────────────────────────────────┘
```

---

## Deployment Architecture

### Production Setup

```
                    Internet
                        │
                        ▼
┌──────────────────────────────────────────────┐
│                   Vercel                      │
│              (Frontend + CDN)                 │
│         https://app.vercel.app               │
└──────────────────────────────────────────────┘
                        │
                        ▼ API Calls
┌──────────────────────────────────────────────┐
│                   Railway                     │
│              (Backend + Database)             │
│         https://api.railway.app              │
│                     │                         │
│         ┌───────────┴───────────┐            │
│         │                       │            │
│    ┌────▼────┐            ┌────▼────┐       │
│    │ Express │            │PostgreSQL│       │
│    │ Server  │────────────│ Database │       │
│    └─────────┘            └──────────┘       │
└──────────────────────────────────────────────┘
```

---

## Data Flow

### Order Processing

```
User places order → Order validation → 
Debt limit check → Stock verification → 
Order creation → Email notifications → 
Admin notification → Payment processing
```

### Payment Processing

```
User selects PayFast → Payment form generated → 
Redirect to PayFast → User completes payment → 
PayFast ITN callback → Order status updated → 
Tier recalculation → Success notification
```

### Tier Progression

```
Payment completed → Total sales calculated → 
Tier threshold checked → Tier updated → 
Certificate generated → Email with PDF sent
```

### Dynamic Tier Configuration

- Tier names are not hardcoded in business logic.
- Active tiers are resolved from `tier_configs`, ordered by `display_order`.
- User tier assignment is threshold-driven and supports admin tier add/edit/delete operations.
- Debt limits are enforced from `tier_configs.debt_limit` (with admin per-user override support).

---

## Performance Considerations

### Frontend

- Server-side rendering (SSR) for SEO
- Image optimization with Next.js
- Code splitting and lazy loading
- Static asset caching via CDN

### Backend

- Database connection pooling
- Query optimization with indexes
- Response compression
- API response caching where appropriate

### Database

- Indexed columns for frequent queries
- Optimized JOIN operations
- Connection pooling via TypeORM

---

## Design Decisions

| Decision | Technology | Rationale |
|----------|------------|-----------|
| Frontend Framework | Next.js | SSR, SEO, TypeScript support |
| Backend Framework | Express.js | Mature, flexible, rich ecosystem |
| ORM | TypeORM | TypeScript-first, migrations, relations |
| Database | PostgreSQL | ACID compliance, JSONB, performance |
| Hosting | Vercel + Railway | Ease of deployment, auto-scaling |

---

## References

- [API Documentation](API.md)
- [Development Guide](DEVELOPMENT.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Security Guide](SECURITY.md)

---

**Document Version**: 3.2.0  
**Last Updated**: January 27, 2026
