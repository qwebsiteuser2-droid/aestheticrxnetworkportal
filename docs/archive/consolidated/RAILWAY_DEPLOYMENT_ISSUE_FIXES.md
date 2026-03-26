# Railway Deployment Issue Fixes

**Last Updated:** January 14, 2026  
**Status:** ✅ Comprehensive Troubleshooting Guide

This document consolidates all Railway deployment issue fixes and troubleshooting solutions.

---

## Table of Contents

1. [502 Errors](#502-errors)
2. [Backend Not Responding](#backend-not-responding)
3. [CORS Issues](#cors-issues)
4. [Database Connection Issues](#database-connection-issues)
5. [Import Statement Errors](#import-statement-errors)
6. [Port Configuration Issues](#port-configuration-issues)
7. [Build Failures](#build-failures)
8. [Deployment Issues](#deployment-issues)

---

## 502 Errors

### Problem: Backend Returns 502 Bad Gateway

**Symptoms:**
- API calls return 502 error
- Backend appears offline
- Health check fails

**Root Causes:**
1. Wrong PORT configuration
2. Application crash on startup
3. Database connection failure
4. Missing environment variables

**Solutions:**

#### Fix 1: Check PORT Configuration
```bash
# Railway sets PORT automatically
# Don't manually set PORT variable
# Check Railway logs for port binding errors
```

**Action:**
1. Remove `PORT` variable if manually set
2. Let Railway handle port assignment automatically
3. Check Railway logs for port binding messages

#### Fix 2: Check Application Startup
1. Go to Railway Dashboard → Backend Service → Logs
2. Look for startup errors
3. Check for missing dependencies
4. Verify `npm start` command works

**Common Startup Errors:**
- Missing environment variables
- Database connection timeout
- TypeScript compilation errors
- Missing npm packages

#### Fix 3: Verify Database Connection
1. Check `DATABASE_URL` is set correctly
2. Verify database service is online
3. Test database connection:
   ```bash
   psql "$DATABASE_URL" -c "SELECT 1;"
   ```

#### Fix 4: Check Required Environment Variables
Verify all required variables are set:
- ✅ `DATABASE_URL`
- ✅ `JWT_SECRET`
- ✅ `JWT_REFRESH_SECRET`
- ✅ `FRONTEND_URL` (for CORS)

---

## Backend Not Responding

### Problem: Backend Service Not Responding to Requests

**Symptoms:**
- All API calls timeout
- Health check endpoint doesn't respond
- Railway shows service as "Online" but requests fail

**Root Causes:**
1. Application crashed after startup
2. Port binding issue
3. Network configuration problem
4. Application listening on wrong interface

**Solutions:**

#### Fix 1: Check Railway Logs
1. Railway Dashboard → Backend Service → Logs
2. Look for error messages
3. Check for crash reports
4. Look for "listening on" messages

**What to Look For:**
```
✅ Good: "Server running on port 8080"
✅ Good: "Listening on: 0.0.0.0:8080"
❌ Bad: "Error: listen EADDRINUSE"
❌ Bad: "Cannot connect to database"
```

#### Fix 2: Verify Application Code
Ensure your application:
- Listens on `0.0.0.0` (not `localhost` or `127.0.0.1`)
- Uses `process.env.PORT` (not hardcoded port)
- Handles errors gracefully

**Example:**
```typescript
// ✅ Good
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// ❌ Bad
app.listen(4000, 'localhost', () => {
  // Won't work on Railway
});
```

#### Fix 3: Check Service Status
1. Railway Dashboard → Backend Service
2. Verify service shows "Online" status
3. Check deployment status
4. Look for any warnings or errors

#### Fix 4: Restart Service
1. Railway Dashboard → Backend Service → Deployments
2. Click "Redeploy" on latest deployment
3. Wait for deployment to complete
4. Check logs for successful startup

---

## CORS Issues

### Problem: CORS Errors When Frontend Connects to Backend

**Symptoms:**
- Browser console shows CORS errors
- API requests blocked by browser
- "Access-Control-Allow-Origin" errors
- Error: `No 'Access-Control-Allow-Origin' header is present on the requested resource`

**Root Causes:**
1. `FRONTEND_URL` not set in Railway
2. `FRONTEND_URL` doesn't match actual frontend domain
3. CORS configuration incorrect
4. Multiple frontend URLs not configured
5. Vercel domain not in allowed origins list

**Solutions:**

#### Fix 1: Set FRONTEND_URL Correctly
1. Go to Railway Dashboard → Backend Service → Variables
2. Add/Update: `FRONTEND_URL`
3. Value should be your Vercel domain: `https://bioaestheticaxdepolying.vercel.app`
4. For multiple domains, use comma-separated:
   ```
   https://bioaestheticaxdepolying.vercel.app,https://bioaestheticaxdepolying-git-main-qasim3.vercel.app
   ```
5. Save and redeploy

#### Fix 2: Verify CORS Configuration
Check `backend/src/app.ts` for CORS configuration:
```typescript
// Should use getAllFrontendUrls() from urlConfig
import { getAllFrontendUrls } from '@/config/urlConfig';

const allowedOrigins = getAllFrontendUrls();
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

**CORS Configuration Details:**
- Backend allows **all** `.vercel.app` domains automatically
- Includes production: `https://bioaestheticaxdepolying.vercel.app`
- Includes preview deployments: `https://bioaestheticaxdepolying-*-*.vercel.app`
- Uses string matching: `origin.includes('.vercel.app')`

#### Fix 3: Check Request Headers
Verify frontend sends correct headers:
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (if authenticated)

#### Fix 4: Test CORS Directly
```bash
# Test CORS from command line
curl -H "Origin: https://bioaestheticaxdepolying.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://bioaestheticaxdepolying-production.up.railway.app/api/auth/login
```

Should return CORS headers:
```
Access-Control-Allow-Origin: https://bioaestheticaxdepolying.vercel.app
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

#### Fix 5: Check Railway Logs for CORS
After deployment, check Railway logs for:
```
✅ CORS: Allowing Vercel domain: https://bioaestheticaxdepolying.vercel.app
🔍 OPTIONS Preflight Request: { origin: '...', ... }
✅ OPTIONS: Allowing preflight for origin: ...
```

If you see `❌ CORS: Blocked origin`, the configuration needs updating.

#### Fix 6: Clear Browser Cache
1. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. Or clear browser cache completely
3. CORS errors can be cached by the browser

---

## 500 Internal Server Errors

### Problem: Backend Returns 500 Internal Server Error

**Symptoms:**
- API calls return 500 error
- Generic error messages
- Endpoints not working

**Root Causes:**
1. Database connection issues
2. Missing database tables/columns
3. Query errors
4. Missing environment variables
5. Application errors

**Solutions:**

#### Fix 1: Check Railway Backend Logs (CRITICAL)
1. Railway Dashboard → Backend Service → Logs tab
2. Look for error messages around the time of the request
3. Look for:
   - `QueryFailedError`
   - `relation "X" does not exist`
   - `column "X" does not exist`
   - `ECONNREFUSED`
   - `ENOTFOUND`

#### Fix 2: Common 500 Error Causes

**Database Table Missing:**
```
QueryFailedError: relation "doctors" does not exist
```
**Fix:** Check if migrations have run. Look for migration errors in Railway logs.

**Database Column Missing:**
```
QueryFailedError: column "X" does not exist
```
**Fix:** Check if migration for that column has run. Verify migration status.

**Database Connection Error:**
```
Error: connect ECONNREFUSED
```
**Fix:** Check `DATABASE_URL` in Railway environment variables. Verify database service is online.

**Missing Environment Variable:**
```
JWT_SECRET must be set
```
**Fix:** Add missing environment variables in Railway Variables tab.

#### Fix 3: Verify Database Connection
1. Check `DATABASE_URL` is set correctly
2. Verify database service is online
3. Test connection:
   ```bash
   psql "$DATABASE_URL" -c "SELECT 1;"
   ```

#### Fix 4: Check Migrations
Verify migrations have run:
1. Check Railway logs for migration output
2. Look for: `✅ Migration executed successfully`
3. If migrations failed, check error messages

#### Fix 5: Verify Required Tables Exist
```bash
# Connect to database
psql "$DATABASE_URL"

# List tables
\dt

# Should see: doctors, products, orders, etc.
```

### Login 500 Errors

**Specific Issue:** Login endpoint returns 500 error

**Common Causes:**
1. `doctors` table doesn't exist
2. Missing columns in `doctors` table
3. Database connection failure
4. Wrong database name

**Debugging Steps:**
1. Check Railway logs for specific error message
2. Verify `DATABASE_URL` points to correct database (`railway` not `bioaestheticax1`)
3. Check if `doctors` table exists: `\dt doctors`
4. Verify user exists: `SELECT email FROM doctors WHERE email = 'user@example.com';`

**Quick Fix:**
```bash
# Connect to Railway database
railway connect postgres

# Switch to correct database
\c railway

# Check tables
\dt

# Check data
SELECT COUNT(*) FROM doctors;
```

## Database Connection Issues

### Problem: Cannot Connect to Database

**Symptoms:**
- Database connection timeout errors
- "Connection refused" errors
- Application fails to start
- Database queries fail

**Root Causes:**
1. Wrong `DATABASE_URL`
2. Database service offline
3. Network connectivity issues
4. SSL configuration incorrect
5. Wrong database name

**Solutions:**

#### Fix 1: Verify DATABASE_URL
1. Railway Dashboard → Backend Service → Variables
2. Check `DATABASE_URL` value
3. Format should be: `postgresql://user:password@host:port/database`
4. **Important:** Use `/railway` database (not `/bioaestheticax1`)

**Correct Format:**
```
postgresql://postgres:PASSWORD@tramway.proxy.rlwy.net:22589/railway
```

#### Fix 2: Check Database Service Status
1. Railway Dashboard → Postgres Service
2. Verify service shows "Online"
3. Check database is accessible
4. Verify connection string from Postgres service variables

#### Fix 3: Test Database Connection
```bash
# Test connection directly
psql "postgresql://postgres:PASSWORD@tramway.proxy.rlwy.net:22589/railway" -c "SELECT 1;"
```

If connection fails:
- Check password is correct
- Verify host and port
- Check network connectivity
- Verify SSL settings

#### Fix 4: Check SSL Configuration
For production, SSL should be enabled:
```typescript
// In data-source.ts
ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
```

#### Fix 5: Database Name Mismatch
**Problem:** Backend connects to wrong database
- Backend uses: `bioaestheticax1` (has only new signups)
- Actual data is in: `railway` (has all users)

**Symptoms:**
- Signup works but login/password reset fails
- Data exists but backend can't find it
- Different data in Railway UI vs application

**Solution:**
1. Go to Railway Dashboard → Backend Service → Variables
2. Find `DATABASE_URL` variable
3. **Current value (wrong):**
   ```
   postgresql://postgres:password@host:port/bioaestheticax1
   ```
4. **Change to (correct):**
   ```
   postgresql://postgres:password@host:port/railway
   ```
5. **Important:** Change `/bioaestheticax1` to `/railway` at the end!
6. Save and redeploy
7. Verify connection works

**Alternative: Use Railway Variable Reference (Recommended)**
1. Delete current `DATABASE_URL` if manually set
2. Click **"+ New Variable"**
3. **Key:** `DATABASE_URL`
4. **Value:** Click **"Reference"** button
5. Select **Postgres** service → **DATABASE_PUBLIC_URL**
6. Railway will automatically use the correct database

**After Fix:**
- ✅ All existing users will be accessible
- ✅ Password reset will work
- ✅ Login will work for all users
- ✅ New signups will go to correct database

#### Railway Database Viewer Issue
**Problem:** Railway's database viewer shows "You have no tables" even though database has tables.

**Root Cause:**
Railway's database viewer displays tables from the **default database** that Railway creates:
- Railway's UI shows the **`railway` database** (which may be empty)
- Your application uses a different database (which has all tables)

**This is normal behavior** - Railway's database viewer is a convenience tool that shows the default database, not necessarily the database your application uses.

**Solution: Use External Database Client**
Use any PostgreSQL client (TablePlus, pgAdmin, DBeaver, DataGrip) to view your data. This UI limitation doesn't affect your application's functionality.

---

## Import Statement Errors

### Problem: Build Fails with Import Errors

**Symptoms:**
- TypeScript compilation errors
- "Cannot find module" errors
- Build fails in Railway
- Missing file imports

**Root Causes:**
1. Missing dependencies in `package.json`
2. TypeScript path aliases not configured
3. File paths incorrect
4. Missing type definitions

**Solutions:**

#### Fix 1: Check Build Logs
1. Railway Dashboard → Backend Service → Deployments
2. Click on failed deployment
3. Check "Build Logs" for specific errors
4. Look for import/module errors

#### Fix 2: Verify Dependencies
1. Check `package.json` has all required dependencies
2. Verify `@types/*` packages for TypeScript
3. Ensure all imports are correct

**Common Missing Dependencies:**
- `@types/node`
- `@types/express`
- `@types/bcryptjs`
- Other type definitions

#### Fix 3: Check TypeScript Configuration
Verify `tsconfig.json` has correct paths:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

#### Fix 4: Verify File Paths
- Check all import paths are correct
- Verify file extensions (`.ts`, `.js`)
- Check case sensitivity (Linux is case-sensitive)
- Verify files exist in correct locations

#### Fix 5: Test Build Locally
```bash
# Test build before deploying
cd backend
npm run build

# Fix any errors locally first
# Then push to trigger Railway deployment
```

---

## Port Configuration Issues

### Problem: Port Already in Use or Wrong Port

**Symptoms:**
- "Port already in use" errors
- Application doesn't start
- Wrong port binding

**Solutions:**

#### Fix 1: Don't Set PORT Manually
**Railway automatically sets PORT:**
- Railway sets `PORT` environment variable
- Usually `8080` or `PORT` from Railway
- Don't manually set `PORT` variable

**Action:**
1. Remove `PORT` variable if manually set
2. Let Railway handle port assignment
3. Use `process.env.PORT` in code

#### Fix 2: Use Correct Port in Code
```typescript
// ✅ Good - Use Railway's PORT
const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// ❌ Bad - Hardcoded port
app.listen(4000, () => {
  // Won't work if Railway uses different port
});
```

#### Fix 3: Listen on 0.0.0.0
**Important:** Always listen on `0.0.0.0` (not `localhost`):
```typescript
// ✅ Good
app.listen(PORT, '0.0.0.0', () => {
  // Accepts connections from all interfaces
});

// ❌ Bad
app.listen(PORT, 'localhost', () => {
  // Only accepts local connections
});
```

---

## Build Failures

### Problem: Build Fails in Railway

**Symptoms:**
- Deployment fails
- Build logs show errors
- Application doesn't deploy

**Root Causes:**
1. TypeScript errors
2. Missing dependencies
3. Build command incorrect
4. Node version mismatch

**Solutions:**

#### Fix 1: Check Build Command
1. Railway Dashboard → Backend Service → Settings
2. Verify Build Command: `npm run build`
3. Verify Start Command: `npm start`
4. Check Root Directory is set to `backend`

#### Fix 2: Check Node Version
Verify `package.json` specifies Node version:
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

Or set in Railway:
1. Railway Dashboard → Backend Service → Variables
2. Add: `NODE_VERSION = 18` (or your required version)

#### Fix 3: Test Build Locally
```bash
# Test build before deploying
cd backend
npm install
npm run build

# Fix any errors locally
# Then push to trigger Railway deployment
```

#### Fix 4: Check Dependencies
1. Verify `package.json` has all dependencies
2. Check `package-lock.json` is committed
3. Ensure no missing peer dependencies

---

## Deployment Issues

### Problem: Deployment Fails or Doesn't Complete

**Symptoms:**
- Deployment stuck in "Building" or "Deploying"
- Deployment fails without clear error
- Service doesn't update after deployment

**Solutions:**

#### Fix 1: Check Deployment Logs
1. Railway Dashboard → Backend Service → Deployments
2. Click on deployment
3. Check "Build Logs" and "Deploy Logs"
4. Look for specific error messages

#### Fix 2: Redeploy
1. Railway Dashboard → Backend Service → Deployments
2. Click "Redeploy" on latest deployment
3. Wait for completion
4. Check logs for success

#### Fix 3: Check GitHub Connection
1. Railway Dashboard → Project Settings
2. Verify GitHub repository is connected
3. Check repository access permissions
4. Verify branch is correct (usually `main`)

#### Fix 4: Clear Build Cache
If builds are failing due to cache:
1. Railway Dashboard → Backend Service → Settings
2. Look for "Clear Build Cache" option
3. Or trigger new deployment from different commit

---

## Quick Troubleshooting Checklist

When Railway backend is not working:

1. ✅ **Check Service Status**
   - Is service "Online" in Railway dashboard?
   - Is latest deployment successful?

2. ✅ **Check Logs**
   - Railway Dashboard → Logs tab
   - Look for error messages
   - Check startup messages

3. ✅ **Verify Environment Variables**
   - `DATABASE_URL` is set correctly
   - `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
   - `FRONTEND_URL` matches your Vercel domain

4. ✅ **Test Backend Directly**
   ```bash
   curl https://bioaestheticaxdepolying-production.up.railway.app/api/health
   ```

5. ✅ **Check Database Connection**
   - Is Postgres service online?
   - Can you connect to database?
   - Is `DATABASE_URL` correct?

6. ✅ **Verify Port Configuration**
   - Don't manually set `PORT`
   - Code uses `process.env.PORT`
   - Application listens on `0.0.0.0`

7. ✅ **Check CORS Configuration**
   - `FRONTEND_URL` is set in Railway
   - CORS allows your Vercel domain
   - Check Railway logs for CORS errors

---

## Related Documentation

- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md)
- [Database Connection Fix](./RAILWAY_DATABASE_CONNECTION_FIX.md)

---

**Last Updated:** January 14, 2026
