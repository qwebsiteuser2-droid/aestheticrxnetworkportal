# Documentation Index

**AestheticRxNetwork — B2B Medical Platform**

| | |
|--|--|
| **Version** | 3.5.7 |
| **Last Updated** | June 2, 2026 |
| **Production frontend** | [aestheticrxnetworkportal.vercel.app](https://aestheticrxnetworkportal.vercel.app) |
| **Root README** | [../README.md](../README.md) |

---

## Start here

| I want to… | Read |
|------------|------|
| Set up locally | [DEVELOPMENT.md](DEVELOPMENT.md) → [CREDENTIALS_GUIDE.md](CREDENTIALS_GUIDE.md) → [ENVIRONMENT_VARIABLES_REFERENCE.md](ENVIRONMENT_VARIABLES_REFERENCE.md) |
| Deploy backend | [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) |
| Deploy frontend | [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) |
| Use the portal as a user | [USER_GUIDE.md](USER_GUIDE.md) |
| Understand architecture | [ARCHITECTURE.md](ARCHITECTURE.md) → [TECHNICAL_SPECIFICATIONS.md](TECHNICAL_SPECIFICATIONS.md) |
| Call the API | [API.md](API.md) |
| See what changed | [CHANGELOG.md](CHANGELOG.md) |
| Mobile UI & install as app | [MOBILE_AND_PWA.md](MOBILE_AND_PWA.md) |

---

## Platform overview (v3.5.7)

### Public & authenticated routes (frontend)

| Area | Path | Notes |
|------|------|--------|
| Home | `/` | Guests: catalog on Home. Signed-in **mobile**: catalog on **Order** only; Top Clinics auto-expand |
| Order | `/order` | Cart, COD checkout, Google Maps delivery |
| Appointment Status | `/messages` | Conversations; unread sorted first on mobile |
| Doctors | `/doctors`, `/user/[id]` | Search (`?focus=search`), filters, profiles |
| Profiles | `/user/[id]` | Stats, patient comments, public doctor view |
| Research | `/research`, `/research-lab` | Papers, upvotes |
| Legal / OAuth | `/privacy`, `/terms`, `/oauth-verification` | Google verification |
| Login / signup | `/login`, `/signup` | JWT + Google OAuth |
| Admin | `/admin/*` | Role-gated dashboard (see below) |
| Invoices (admin) | `/admin/invoices` | Manual + auto challan PDFs |

### Order & invoice flow (COD)

1. User browses catalog (no login required).
2. Checkout requires login → `/login?returnUrl=…`
3. Orders created per cart line (`skip_notification: true` for batch).
4. `POST /api/orders/batch-notify` → **one** customer email with **`Invoices.pdf`** (combined challan for multi-item carts).
5. Admins receive batch order alert via Gmail API.

PayFast: backend only; portal UI uses **Cash on Delivery**. See [PAYFAST_SETUP_GUIDE.md](PAYFAST_SETUP_GUIDE.md).

### User roles

| Role | Typical access |
|------|----------------|
| **Admin** | Full `/admin` tools, permissions, exports |
| **Doctor / clinic** | Orders, research, ads, tier benefits |
| **Employee** | Delivery dashboard |
| **Regular user** | Appointments, comments on doctor profiles |

---

## Documentation by category

### Setup & development

| Document | Description |
|----------|-------------|
| [DEVELOPMENT.md](DEVELOPMENT.md) | Local setup, scripts, workflow |
| [CREDENTIALS_GUIDE.md](CREDENTIALS_GUIDE.md) | API keys (Maps, Gmail, PayFast, etc.) |
| [ENVIRONMENT_VARIABLES_REFERENCE.md](ENVIRONMENT_VARIABLES_REFERENCE.md) | Full `.env` reference |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Code standards, PR expectations |
| [TYPESCRIPT_GUIDE.md](TYPESCRIPT_GUIDE.md) | Common TS fixes |

### Deployment

| Document | Description |
|----------|-------------|
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production overview |
| [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) | Backend (Express + PostgreSQL) |
| [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) | Frontend (Next.js) |
| [CI_CD_PIPELINES.md](CI_CD_PIPELINES.md) | GitHub Actions |

### Architecture & API

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, data flows |
| [TECHNICAL_SPECIFICATIONS.md](TECHNICAL_SPECIFICATIONS.md) | Schema, APIs, IDs, security |
| [API.md](API.md) | REST endpoint reference |
| [SECURITY.md](SECURITY.md) | Auth, hardening, practices |

### Email, payments, invoices

| Document | Description |
|----------|-------------|
| [EMAIL_SETUP.md](EMAIL_SETUP.md) | Gmail API, deliverability |
| [INVOICE_GENERATOR.md](INVOICE_GENERATOR.md) | Rx challan PDFs, `Invoices.pdf` on COD orders |
| [PAYFAST_SETUP_GUIDE.md](PAYFAST_SETUP_GUIDE.md) | Backend PayFast (UI uses COD) |

### Google OAuth & compliance

| Document | Description |
|----------|-------------|
| [GOOGLE_OAUTH_VERIFICATION.md](GOOGLE_OAUTH_VERIFICATION.md) | App verification checklist |
| [GOOGLE_OAUTH_SCOPE_JUSTIFICATIONS.md](GOOGLE_OAUTH_SCOPE_JUSTIFICATIONS.md) | Console scope text |
| [GOOGLE_OAUTH_DEMO_VIDEO.md](GOOGLE_OAUTH_DEMO_VIDEO.md) | Demo recording guide |
| [SEARCH_CONSOLE_VERIFICATION_STEPS.md](SEARCH_CONSOLE_VERIFICATION_STEPS.md) | Domain verification |

### Testing

| Document | Description |
|----------|-------------|
| [Production_Final_Feature_Testing_Desktop_Device.md](Production_Final_Feature_Testing_Desktop_Device.md) | Production desktop QA |
| [Production_Final_Feature_Testing_Mobile_Device.md](Production_Final_Feature_Testing_Mobile_Device.md) | Production mobile QA |
| [Development_Final_Feature_Testing_Desktop_Device.md](Development_Final_Feature_Testing_Desktop_Device.md) | Dev desktop QA |
| [Development_Final_Feature_Testing_Mobile_Device.md](Development_Final_Feature_Testing_Mobile_Device.md) | Dev mobile QA |

### Mobile & PWA

| Document | Description |
|----------|-------------|
| [MOBILE_AND_PWA.md](MOBILE_AND_PWA.md) | Sticky nav, Home/Order behavior, product modal, PWA install |

### End users

| Document | Description |
|----------|-------------|
| [USER_GUIDE.md](USER_GUIDE.md) | Doctors, patients, employees, admins |

### Version history

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](CHANGELOG.md) | All releases |

### Archived docs

Historical notes live under [`archive/`](archive/) (old fixes, consolidated guides). Prefer the documents above for current work.

---

## What's new in v3.5.7

- **Mobile sticky nav**: Home, Order, Doctors (+ search badge), Status, Ranks, Research, Pride — see [MOBILE_AND_PWA.md](MOBILE_AND_PWA.md).
- **Signed-in mobile Home**: no catalog; use **Order** tab; Top Clinics auto-unfold.
- **Product modal (mobile)**: Quantity → Add to Cart / Buy Now → Share under images.
- **Appointment Status**: mobile layout; unread-first sorting.
- **Notifications & profile menu** fixed for mobile.

## What's new in v3.5.6

- **Invoice / challan**: `/admin/invoices`; COD checkout emails **one** message with **`Invoices.pdf`** (combined cart = one challan; logo + brand colors `#1E6BFF`, `#35B7D6`, `#D59225`).
- **Product images**: Next.js proxy `/api/product-images/:id?view=` + DB gallery columns.
- **Checkout UX**: debt-limit modal; login redirect (no sign-in modal on Buy Now).
- **PayFast**: removed from portal UI; backend retained.
- **Legal / OAuth**: `/privacy`, `/terms`, `/oauth-verification` + Google verification docs.
- **Product reviews & gallery** in `ProductDetailsModal`.

See [CHANGELOG.md](CHANGELOG.md) for earlier releases.

---

## Admin dashboard map

| Tile | Path |
|------|------|
| Users | `/admin/users` |
| Products | `/admin/products` |
| Orders | `/admin/order-management` |
| **Invoice generator** | `/admin/invoices` |
| Employees | `/admin/employee-management` |
| Research | `/admin/research-management` |
| Tiers | `/admin/tier-configs` |
| Leaderboard / Hall of Pride | `/admin/leaderboard`, `/admin/hall-of-pride` |
| Advertisements | `/admin/advertisements` |
| Email analytics / Gmail | `/admin/email-analytics`, `/admin/gmail-messages` |
| Data export | `/admin/data-export` |
| Permissions | `/admin/permissions` |
| Signup IDs | `/admin/signup-ids` |
| Settings (OTP, AI, featured, …) | `/admin/otp-management`, `/admin/ai-config`, `/admin/featured`, … |

---

## Repository layout (docs-relevant)

```
docs/
├── README.md                 # This index
├── CHANGELOG.md
├── DEVELOPMENT.md
├── DEPLOYMENT.md
├── RAILWAY_DEPLOYMENT.md
├── VERCEL_DEPLOYMENT.md
├── ARCHITECTURE.md
├── TECHNICAL_SPECIFICATIONS.md
├── API.md
├── SECURITY.md
├── USER_GUIDE.md
├── INVOICE_GENERATOR.md
├── PAYFAST_SETUP_GUIDE.md
├── EMAIL_SETUP.md
├── GOOGLE_OAUTH_*.md
├── MOBILE_AND_PWA.md
├── SEARCH_CONSOLE_VERIFICATION_STEPS.md
├── CI_CD_PIPELINES.md
├── CREDENTIALS_GUIDE.md
├── ENVIRONMENT_VARIABLES_REFERENCE.md
├── CONTRIBUTING.md
├── TYPESCRIPT_GUIDE.md
├── Production_Final_Feature_Testing_*.md
├── Development_Final_Feature_Testing_*.md
└── archive/                  # Historical only
```

---

## Related assets

| Location | Purpose |
|----------|---------|
| [../branding-assets/README.md](../branding-assets/README.md) | Logo, wordmark colors, PWA icons |
| `../backend/assets/invoice/logo.png` | Source for PDF challan logo |
| `../frontend/src/lib/brandColors.ts` | Web UI brand tokens |
| `../env.example` | Environment template |

---

**Document version:** 3.5.7 · **Last updated:** June 2, 2026
