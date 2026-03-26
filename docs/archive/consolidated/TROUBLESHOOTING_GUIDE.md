# Troubleshooting Guide

**Last Updated:** January 14, 2026  
**Status:** ✅ Comprehensive Guide

This document consolidates all troubleshooting and debugging information for the AestheticRxNetwork platform.

---

## Table of Contents

1. [Common Issues](#common-issues)
2. [Debugging 500 Errors](#debugging-500-errors)
3. [API Route Issues](#api-route-issues)
4. [Authentication Issues](#authentication-issues)
5. [Database Issues](#database-issues)
6. [Deployment Issues](#deployment-issues)

---

## Common Issues

### Issue: Application Not Working

**Quick Checklist:**
1. ✅ Check Railway backend is online
2. ✅ Check Vercel frontend is deployed
3. ✅ Verify environment variables are set
4. ✅ Check browser console for errors
5. ✅ Check Railway logs for backend errors

### Issue: Features Not Loading

**Symptoms:**
- Pages load but data doesn't appear
- API calls failing
- Empty lists/sections

**Solutions:**
1. Check Network tab in browser DevTools
2. Look for failed API requests
3. Check Railway logs for backend errors
4. Verify database has data
5. Check CORS configuration

---

## Debugging 500 Errors

### How to Debug 500 Errors

**Step 1: Check Railway Backend Logs**
1. Railway Dashboard → Backend Service → Logs tab
2. Look for error messages around the time of request
3. Look for:
   - `QueryFailedError`
   - `relation "X" does not exist`
   - `column "X" does not exist`
   - `ECONNREFUSED`
   - `ENOTFOUND`

**Step 2: Identify Error Type**

**Database Table Missing:**
```
QueryFailedError: relation "doctors" does not exist
```
**Fix:** Check if migrations have run. See Railway logs for migration errors.

**Database Column Missing:**
```
QueryFailedError: column "X" does not exist
```
**Fix:** Check if migration for that column has run. Verify migration status.

**Database Connection Error:**
```
Error: connect ECONNREFUSED
```
**Fix:** Check `DATABASE_URL` in Railway environment variables.

**Missing Environment Variable:**
```
JWT_SECRET must be set
```
**Fix:** Add missing environment variables in Railway Variables tab.

### Common 500 Error Endpoints

**Recently Fixed (Should Work Now):**
- ✅ `/api/video-advertisements/active`
- ✅ `/api/video-advertisements/rotation-configs/*`
- ✅ `/api/contact-platforms`
- ✅ `/api/backgrounds/active`
- ✅ `/api/video-advertisements/areas`

**If Still Getting 500:**
1. Check Railway logs for specific error
2. Verify endpoint exists in backend routes
3. Check database tables exist
4. Verify environment variables are set

---

## API Route Issues

### Issue: 404 Errors on API Routes

**Problem:** Frontend shows 404 errors for routes like:
- `/backgrounds/active`
- `/contact-platforms`
- `/video-advertisements/active`

**Root Cause:** API base URL configuration removing `/api` prefix

**Solution:**
1. Verify `getApiBaseUrl()` in `frontend/src/lib/api.ts` includes `/api`
2. Check that API calls use full path: `/api/backgrounds/active`
3. Verify backend routes are registered with `/api` prefix

**Verification:**
1. Check Network tab in browser DevTools
2. Verify requests go to: `https://backend.com/api/route` (with `/api`)
3. Should NOT see: `https://backend.com/route` (without `/api`)

### Available API Endpoints

**Backgrounds:**
- `GET /api/backgrounds/active` - Public endpoint
- `GET /api/backgrounds/admin` - Admin: Get all backgrounds
- `POST /api/backgrounds/admin` - Admin: Create background

**Contact Platforms:**
- `GET /api/contact-platforms` - Public endpoint
- `GET /api/contact-platforms/admin` - Admin: Get all platforms

**Video Advertisements:**
- `GET /api/video-advertisements/active` - Public endpoint
- `GET /api/video-advertisements/areas` - Get advertisement areas
- `GET /api/video-advertisements/rotation-configs/*` - Get rotation configs

---

## Authentication Issues

### Issue: Login Returns 500 Error

**Symptoms:**
- Login endpoint returns 500
- Generic "Login failed" message

**Debugging:**
1. Check Railway logs for specific error
2. Verify `doctors` table exists
3. Check database connection
4. Verify user exists in database

**Common Causes:**
- Database table missing
- Database column missing
- Database connection failure
- Wrong database name

**See:** [Authentication Guide](./AUTHENTICATION_GUIDE.md#login-issues)

### Issue: Password Reset Not Working

**Symptoms:**
- "No account found with this email" error
- OTP not received
- OTP verification fails

**Solutions:**
1. Verify backend uses correct database (`railway` not `aestheticrx1`)
2. Check Gmail credentials are set in Railway
3. Verify email exists in database
4. Check Railway logs for errors

**See:** [Authentication Guide](./AUTHENTICATION_GUIDE.md#password-reset)

---

## Database Issues

### Issue: Database Connection Fails

**Symptoms:**
- Application can't connect to database
- Database queries fail
- Application crashes on startup

**Solutions:**
1. Verify `DATABASE_URL` is correct
2. Check database service is online
3. Verify network connectivity
4. Check SSL settings

**See:** [Railway Deployment Issue Fixes](./RAILWAY_DEPLOYMENT_ISSUE_FIXES.md#database-connection-issues)

### Issue: Wrong Database

**Symptoms:**
- Data not found
- Users can't login
- Password reset doesn't find users

**Solution:**
- Update `DATABASE_URL` to use `/railway` database (not `/aestheticrx1`)
- Verify data exists in `railway` database

**See:** [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md#database-configuration)

---

## Deployment Issues

### Issue: Backend Not Deploying

**Symptoms:**
- Deployment stuck
- Build fails
- Service not updating

**Solutions:**
1. Check build logs in Railway
2. Verify GitHub connection
3. Check for TypeScript errors
4. Verify dependencies are correct

**See:** [Railway Deployment Issue Fixes](./RAILWAY_DEPLOYMENT_ISSUE_FIXES.md#deployment-issues)

### Issue: Frontend Not Deploying

**Symptoms:**
- Vercel build fails
- Deployment stuck
- Changes not appearing

**Solutions:**
1. Check Vercel build logs
2. Verify environment variables
3. Check for TypeScript errors
4. Verify root directory is set to `frontend`

**See:** [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md#troubleshooting)

---

## Quick Diagnostic Commands

### Check Backend Health
```bash
curl https://aestheticrxdepolying-production.up.railway.app/api/health
```

### Check Database Connection
```bash
psql "postgresql://postgres:PASSWORD@tramway.proxy.rlwy.net:22589/railway" -c "SELECT 1;"
```

### Test Login
```bash
curl -X POST https://aestheticrxdepolying-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Check API Endpoint
```bash
curl https://aestheticrxdepolying-production.up.railway.app/api/backgrounds/active
```

---

## Related Documentation

- [Railway Deployment Issue Fixes](./RAILWAY_DEPLOYMENT_ISSUE_FIXES.md)
- [Authentication Guide](./AUTHENTICATION_GUIDE.md)
- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md)

---

**Last Updated:** January 14, 2026

