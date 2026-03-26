# Environment Variables Reference

**BioAestheticAx Network B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.1.0 |
| **Last Updated** | January 22, 2026 |
| **Status** | ✅ Production Ready |

---

## Overview

Your application has **two separate deployments**:
- **Frontend** → Deployed on **Vercel**
- **Backend** → Deployed on **Railway**

Each deployment requires different environment variables.

---

## Quick Start

```bash
# Copy template
cp env.example .env

# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Frontend (Vercel) Variables

### Location
Vercel Dashboard → Your Project → Settings → Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://your-backend.railway.app/api` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps key | `AIzaSy...` |

### Notes
- ✅ Only variables with `NEXT_PUBLIC_` prefix are exposed to browser
- ✅ These are safe to expose publicly
- ❌ Do NOT add backend secrets here (JWT, Database, Gmail, etc.)

---

## Backend (Railway) Variables

### Location
Railway Dashboard → Backend Service → Variables

### Server Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` / `production` |
| `PORT` | Server port (auto-set by Railway) | `4000` or `8080` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-frontend.vercel.app` |
| `BACKEND_URL` | Backend URL | `https://your-backend.railway.app` |
| `CORS_ORIGIN` | Allowed CORS origins | `https://your-frontend.vercel.app` |

### Database

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgres://user:pass@host:5432/db` |

### Authentication

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `JWT_SECRET` | Access token secret (64 chars) | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | Refresh token secret (64 chars) | Same as above |
| `JWT_EXPIRES_IN` | Access token expiry | `1h` (default) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` (default) |

### Email

| Variable | Description | Example |
|----------|-------------|---------|
| `GMAIL_USER` | Gmail address | `your@gmail.com` |
| `GMAIL_APP_PASSWORD` | App password | `xxxx xxxx xxxx xxxx` |
| `MAIN_ADMIN_EMAIL` | Primary admin email | `admin@example.com` |
| `SECONDARY_ADMIN_EMAIL` | Secondary admin | `admin2@example.com` |

### Payment (PayFast)

| Variable | Description | Example |
|----------|-------------|---------|
| `PAYFAST_MERCHANT_ID` | Merchant ID | `10000100` |
| `PAYFAST_MERCHANT_KEY` | Merchant key | `46f0cd694581a` |
| `PAYFAST_PASSPHRASE` | Passphrase | `your_passphrase` |

---

## Optional Variables

### Gmail API (OAuth 2.0)

| Variable | Description |
|----------|-------------|
| `GMAIL_API_CLIENT_ID` | OAuth client ID |
| `GMAIL_API_CLIENT_SECRET` | OAuth client secret |
| `GMAIL_API_REFRESH_TOKEN` | OAuth refresh token |
| `GMAIL_API_USER_EMAIL` | Gmail account |

### SendGrid (Alternative Email)

| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | From email address |

### AI Services

| Variable | Description |
|----------|-------------|
| `HF_TOKEN` | Hugging Face API token |

### Storage (S3-Compatible)

| Variable | Description |
|----------|-------------|
| `S3_ENDPOINT` | S3 endpoint URL |
| `S3_BUCKET` | Bucket name |
| `S3_KEY` | Access key ID |
| `S3_SECRET` | Secret access key |
| `S3_REGION` | Region |

### Google Services

| Variable | Description |
|----------|-------------|
| `GOOGLE_PRIVATE_KEY_ID` | Service account key ID |
| `GOOGLE_PRIVATE_KEY` | Service account private key |
| `GOOGLE_CLIENT_ID` | Service account client ID |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `DISABLE_RATE_LIMIT` | `false` | Disable rate limiting (dev only) |

---

## Deployment Examples

### Local Development

```env
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:4000/api
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
DATABASE_URL=postgres://postgres:password@localhost:5432/bioaestheticax
CORS_ORIGIN=http://localhost:3000
```

### Vercel + Railway (Production)

**Frontend (Vercel):**
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
```

**Backend (Railway):**
```env
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
BACKEND_URL=https://your-backend.railway.app
DATABASE_URL=postgres://...  # Provided by Railway
CORS_ORIGIN=https://your-frontend.vercel.app
JWT_SECRET=your_64_char_secret
JWT_REFRESH_SECRET=your_64_char_secret
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
MAIN_ADMIN_EMAIL=admin@example.com
SECONDARY_ADMIN_EMAIL=admin2@example.com
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=your_passphrase
```

---

## Minimum Required `.env`

```env
# Environment
NODE_ENV=development

# URLs
NEXT_PUBLIC_API_URL=http://localhost:4000/api
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL=postgres://postgres:password@localhost:5432/bioaestheticax

# Auth
JWT_SECRET=your_64_char_secret
JWT_REFRESH_SECRET=your_64_char_secret

# Email
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
MAIN_ADMIN_EMAIL=admin@example.com
SECONDARY_ADMIN_EMAIL=admin2@example.com

# Payment
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=your_passphrase

# Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
```

---

## Quick Checklist

### Vercel (Frontend)

- [ ] `NEXT_PUBLIC_API_URL` → Railway backend URL
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` → (if using maps)

### Railway (Backend)

- [ ] `DATABASE_URL` → PostgreSQL connection string
- [ ] `JWT_SECRET` → 64-character secret
- [ ] `JWT_REFRESH_SECRET` → 64-character secret
- [ ] `GMAIL_USER` → Gmail email
- [ ] `GMAIL_APP_PASSWORD` → Gmail app password
- [ ] `MAIN_ADMIN_EMAIL` → Admin email
- [ ] `SECONDARY_ADMIN_EMAIL` → Secondary admin email
- [ ] `FRONTEND_URL` → Vercel frontend URL
- [ ] `BACKEND_URL` → Railway backend URL
- [ ] `CORS_ORIGIN` → Vercel frontend URL
- [ ] `NODE_ENV` → `production`

---

## Common Mistakes

### ❌ Wrong: Adding backend secrets to Vercel
```bash
# DON'T DO THIS IN VERCEL!
JWT_SECRET=...  # ❌ Wrong!
DATABASE_URL=...  # ❌ Wrong!
GMAIL_USER=...  # ❌ Wrong!
```

### ✅ Correct: Only public variables in Vercel
```bash
# DO THIS IN VERCEL
NEXT_PUBLIC_API_URL=...  # ✅ Correct!
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...  # ✅ Correct!
```

---

## Security Notes

- Never commit `.env` files to Git
- Use different secrets per environment
- Rotate secrets every 90 days
- Use Railway's variable masking (automatic)
- Only expose `NEXT_PUBLIC_*` variables in Vercel

---

## Related Documentation

- [Credentials Guide](CREDENTIALS_GUIDE.md) - How to obtain credentials
- [Railway Deployment](RAILWAY_DEPLOYMENT.md) - Backend deployment
- [Vercel Deployment](VERCEL_DEPLOYMENT.md) - Frontend deployment
- [Email Setup](EMAIL_SETUP.md) - Email configuration

---

**Document Version**: 3.1.0  
**Last Updated**: January 22, 2026
