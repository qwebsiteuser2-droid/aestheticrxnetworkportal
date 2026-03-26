# Railway Deployment Guide

**AestheticRxNetwork B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.1.0 |
| **Last Updated** | January 22, 2026 |
| **Status** | ✅ Production Ready |

---

This is a consolidated guide covering all Railway deployment topics. All Railway-related documentation has been merged into this single file.

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Database Configuration](#database-configuration)
3. [Backend Deployment](#backend-deployment)
4. [Troubleshooting](#troubleshooting)
5. [Common Issues & Fixes](#common-issues--fixes)

---

## Environment Variables

See **[Environment Variables Reference](ENVIRONMENT_VARIABLES_REFERENCE.md)** for the complete list.

### Railway-Specific Variables

| Variable | Description | Notes |
|----------|-------------|-------|
| `DATABASE_URL` | PostgreSQL connection | Auto-set by Railway |
| `PORT` | Server port | Auto-set (usually 8080) |
| `RAILWAY_PUBLIC_DOMAIN` | Backend domain | Auto-detected |

### Required Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ Yes | Access token secret (64 chars) |
| `JWT_REFRESH_SECRET` | ✅ Yes | Refresh token secret (64 chars) |
| `FRONTEND_URL` | ✅ Yes | Vercel frontend URL for CORS |
| `GMAIL_USER` | ✅ Yes | Gmail for notifications |
| `GMAIL_APP_PASSWORD` | ✅ Yes | Gmail app password |
| `MAIN_ADMIN_EMAIL` | ✅ Yes | Admin notification email |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `BACKEND_URL` | Backend URL (auto-detected if not set) |
| `PAYFAST_*` | PayFast credentials for payments |
| `DISABLE_RATE_LIMIT` | Set `true` for development only |

---

## Database Configuration

### Database Connection Issue Fix

**Problem:** Backend connects to wrong database
- Backend uses: `aestheticrx1` (has only new signups)
- Actual data is in: `railway` (has all users)

**Solution:** Update `DATABASE_URL` in Railway backend service:
1. Go to Railway Dashboard → Backend Service → Variables
2. Find `DATABASE_URL`
3. Change from: `.../aestheticrx1` to `.../railway`
4. Save (Railway will auto-redeploy)

### Database View in Railway Dashboard

**Problem:** Railway Database View shows "no tables" or wrong database

**Solution:**
- Railway's Database View connects to default `railway` database
- Your application uses `railway` database (after fix above)
- If viewing different database, use external tools:
  - pgAdmin
  - DBeaver
  - psql command line

**Connect via psql:**
```bash
psql "postgresql://postgres:PASSWORD@tramway.proxy.rlwy.net:22589/railway"
```

---

## Backend Deployment

### Initial Setup

1. **Connect GitHub Repository**
   - Railway Dashboard → New Project → Deploy from GitHub
   - Select your repository
   - Railway will auto-detect and deploy

2. **Set Root Directory**
   - Go to Service Settings → Root Directory
   - Set to: `backend`

3. **Configure Build Command**
   - Build Command: `npm run build`
   - Start Command: `npm start`

4. **Add Environment Variables**
   - Go to Variables tab
   - Add all required variables (see above)

### Redeploy Backend

**Option 1: Via Dashboard**
1. Go to Deployments tab
2. Click "Redeploy" on latest deployment

**Option 2: Via Git Push**
- Push any commit to main branch
- Railway auto-deploys

**Option 3: Via Railway CLI**
```bash
railway redeploy
```

---

## Troubleshooting

### Backend Not Responding (502 Error)

**Causes:**
1. Wrong PORT configuration
2. Application crash on startup
3. Database connection failure

**Solutions:**
1. Check Railway logs for errors
2. Verify `PORT` variable (Railway sets automatically)
3. Check database connection string
4. Verify all required environment variables are set

### CORS Errors

**Problem:** Frontend can't connect to backend

**Solution:**
1. Check `FRONTEND_URL` in Railway Variables
2. Should include your Vercel domain
3. Example: `https://aestheticrxdepolying.vercel.app`
4. Verify CORS configuration in `backend/src/app.ts`

### Import Statement Errors

**Problem:** Build fails with import errors

**Solution:**
1. Check build logs in Railway
2. Verify all dependencies in `package.json`
3. Ensure TypeScript compilation succeeds
4. Check for missing file imports

### Database Connection Timeout

**Problem:** Can't connect to database

**Solution:**
1. Verify `DATABASE_URL` is correct
2. Check database service is online
3. Verify network connectivity
4. Check SSL settings (should be enabled in production)

---

## Common Issues & Fixes

### Issue: Password Reset Returns "No Account Found"

**Root Cause:** Backend connecting to wrong database

**Fix:**
1. Update `DATABASE_URL` to use `/railway` instead of `/aestheticrx1`
2. Verify email exists in `railway` database
3. Check Railway logs for database connection status

### Issue: Gmail Credentials Not Working

**Fix:**
1. Verify `GMAIL_USER` is correct email
2. Verify `GMAIL_APP_PASSWORD` is 16-character app password (not regular password)
3. Ensure 2-Step Verification is enabled on Google Account
4. Check Railway logs for email sending errors

### Issue: Rate Limiting Too Strict

**Fix:**
1. Set `DISABLE_RATE_LIMIT=true` in Railway Variables (development only)
2. Or adjust rate limit settings in code
3. Redeploy after changing variables

### Issue: Port Already in Use

**Fix:**
1. Railway automatically sets PORT
2. Don't manually set PORT variable
3. Let Railway handle port assignment

---

## Quick Reference

### Railway Backend URL
```
https://aestheticrxdepolying-production.up.railway.app/api
```

### Database Connection
```
Host: tramway.proxy.rlwy.net
Port: 22589
Database: railway
User: postgres
Password: (from Railway Variables)
```

### Check Railway Logs
1. Railway Dashboard → Backend Service → Logs tab
2. Or use Railway CLI: `railway logs`

### Verify Deployment
```bash
curl https://aestheticrxdepolying-production.up.railway.app/api/health
```

Should return:
```json
{"success":true,"message":"AestheticRxNetwork API is running"}
```

---

## Security Notes

1. **Never commit secrets to Git** - Use Railway Variables
2. **Use strong secrets** - At least 32 characters for JWT secrets
3. **Rotate secrets regularly** - Especially in production
4. **Use App Passwords** - Never use regular Gmail password
5. **Enable 2FA** - For all service accounts

---

## URL Configuration

### Backend URL Management

The backend uses **centralized URL configuration** in `backend/src/config/urlConfig.ts`:

**Functions Available:**
- `getFrontendUrl()` - Get frontend URL for CORS/redirects
- `getBackendUrl()` - Get backend URL for emails/links
- `getAllFrontendUrls()` - Get all frontend URLs for CORS

**How It Works:**
1. **Priority 1:** Request origin/referer (dynamic detection)
2. **Priority 2:** Environment variables (`FRONTEND_URL`, `BACKEND_URL`)
3. **Priority 3:** Environment-based fallbacks

**Usage:**
```typescript
// ✅ DO: Use centralized helper
import { getFrontendUrl, getBackendUrl } from '@/config/urlConfig';
const frontendUrl = getFrontendUrl();
const backendUrl = getBackendUrl();

// ❌ DON'T: Use direct env variable
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
```

**All services updated:**
- Email service (`gmailService.ts`)
- Payment service (`payfastService.ts`)
- PDF service (`pdfService.ts`)
- All controllers use URL config

## Connecting Vercel Frontend to Railway Backend

### Overview

Your frontend is deployed on **Vercel** and needs to connect to your **Railway** backend. This section covers the complete setup.

### Step 1: Configure Railway Backend

**Set `FRONTEND_URL` in Railway:**
1. Go to Railway Dashboard → Backend Service → Variables
2. Add/Update: `FRONTEND_URL = https://aestheticrxdepolying.vercel.app`
3. Can include multiple URLs (comma-separated) for preview deployments
4. Save (Railway will auto-redeploy)

### Step 2: Configure Vercel Frontend

**Set `NEXT_PUBLIC_API_URL` in Vercel:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add: `NEXT_PUBLIC_API_URL = https://aestheticrxdepolying-production.up.railway.app/api`
3. Select all environments (Production, Preview, Development)
4. Save

**Note:** If not set, the app auto-detects Vercel domains and uses Railway backend automatically.

### Step 3: Verify Connection

**Check Browser Console:**
1. Open your Vercel site
2. Open Developer Tools (F12) → Console tab
3. Should see:
   ```
   ✅ Vercel domain detected: aestheticrxdepolying.vercel.app
   ✅ Using Railway backend URL: https://aestheticrxdepolying-production.up.railway.app/api
   ```

**Check Network Requests:**
1. Open Network tab in Developer Tools
2. Try to login or access any API feature
3. Requests should go to: `https://aestheticrxdepolying-production.up.railway.app/api/...`
4. Should NOT see: `http://localhost:4000/api/...`

**Test Backend Directly:**
```bash
curl https://aestheticrxdepolying-production.up.railway.app/api/health
```

Should return:
```json
{"success":true,"message":"AestheticRxNetwork API is running"}
```

### Common Connection Issues

**CORS Errors:**
- Verify `FRONTEND_URL` in Railway matches your Vercel domain exactly
- Check CORS configuration in `backend/src/app.ts`
- Check Railway logs for CORS error messages

**404 Errors on API Calls:**
- Verify Railway backend is online (check Railway dashboard)
- Test backend directly with curl command above
- Check Railway logs for errors

**Still Using localhost:**
- Make sure you redeployed Vercel after setting environment variable
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Verify variable name is exactly: `NEXT_PUBLIC_API_URL` (case-sensitive)

### Quick Reference

**Railway Backend URL:**
```
https://aestheticrxdepolying-production.up.railway.app/api
```

**Vercel Environment Variable:**
```
NEXT_PUBLIC_API_URL = https://aestheticrxdepolying-production.up.railway.app/api
```

**Railway Environment Variable:**
```
FRONTEND_URL = https://aestheticrxdepolying.vercel.app
```

## Related Documentation

- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md)
- [Deployment Environment Variables](./DEPLOYMENT_ENVIRONMENT_VARIABLES.md)
- [Environment Variables Reference](./ENVIRONMENT_VARIABLES_REFERENCE.md)
- [Credentials Guide](./CREDENTIALS_GUIDE.md)

