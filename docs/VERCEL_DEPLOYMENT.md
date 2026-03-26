# Vercel Deployment Guide

**BioAestheticAx Network B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.1.0 |
| **Last Updated** | January 22, 2026 |
| **Status** | ✅ Production Ready |

---

This is a consolidated guide covering all Vercel deployment topics. All Vercel-related documentation has been merged into this single file.

---

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Environment Variables](#environment-variables)
3. [Build Configuration](#build-configuration)
4. [Connecting to Railway Backend](#connecting-to-railway-backend)
5. [Troubleshooting](#troubleshooting)
6. [Common Issues & Fixes](#common-issues--fixes)

---

## Initial Setup

### Connect GitHub Repository

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Login to your account

2. **Import Project**
   - Click "Add New" → "Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Project Settings**
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-5 minutes)

---

## Environment Variables

See **[Environment Variables Reference](ENVIRONMENT_VARIABLES_REFERENCE.md)** for complete details.

### Vercel Variables (Frontend Only)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Optional | Railway backend URL (auto-detected) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | Google Maps API key |

### Important Notes

- ✅ Only `NEXT_PUBLIC_*` variables are safe for Vercel
- ❌ Never add backend secrets (JWT, Database, Gmail) to Vercel
- **Auto-detection:** If `NEXT_PUBLIC_API_URL` is not set, the app auto-detects Vercel domains

### Setting Environment Variables

1. Go to **Vercel Dashboard** → **Settings** → **Environment Variables**
2. Add variable with all environments selected (Production, Preview, Development)
3. **Redeploy** after adding (variables are injected at build time)

---

## Build Configuration

### Root Directory

**Problem:** Vercel can't find `package.json`

**Solution:**
1. Go to Project Settings → General
2. Find "Root Directory"
3. Set to: `frontend`
4. Save and redeploy

### Build Command

**Default:** `npm run build` (auto-detected for Next.js)

**Custom Build:**
- Only needed if you have custom build steps
- Usually not required

### Output Directory

**Default:** `.next` (auto-detected for Next.js)

**Custom Output:**
- Only needed for custom Next.js config
- Usually not required

---

## Connecting to Railway Backend

### Option 1: Auto-Detection (Recommended)

**No configuration needed!** The app automatically:
- Detects Vercel domains (`*.vercel.app`)
- Uses Railway backend URL automatically
- Works out of the box

**How it works:**
- Frontend detects it's running on Vercel
- Automatically uses: `https://bioaestheticaxdepolying-production.up.railway.app/api`
- No environment variable needed

### Option 2: Explicit Configuration

If you want to override auto-detection or use a different backend:

**Step 1: Set Environment Variable**

**In Vercel:**
1. Settings → Environment Variables
2. Add: `NEXT_PUBLIC_API_URL = https://bioaestheticaxdepolying-production.up.railway.app/api`
3. Select all environments
4. Save

**Step 2: Redeploy**

**IMPORTANT:** Environment variables are injected at build time, so you must redeploy:

1. Go to **Deployments** tab
2. Click **Redeploy** on latest deployment
3. Wait for build to complete

### Step 3: Verify Connection

**Check Browser Console:**
1. Open your Vercel site
2. Open Developer Tools (F12)
3. Go to Console tab
4. Look for:
   ```
   ✅ Vercel domain detected: bioaestheticaxdepolying.vercel.app
   ✅ Using Railway backend URL: https://bioaestheticaxdepolying-production.up.railway.app/api
   ```

**Check Network Requests:**
1. Open Network tab in Developer Tools
2. Try to login or access any API feature
3. Look for requests going to:
   - ✅ `https://bioaestheticaxdepolying-production.up.railway.app/api/...`
   - ❌ NOT `http://localhost:4000/api/...`

**Test API Endpoint:**
```bash
curl https://bioaestheticaxdepolying-production.up.railway.app/api/health
```

Should return:
```json
{"success":true,"message":"BioAestheticAx Network API is running"}
```

---

## API URL Configuration

### How API URL Detection Works

The frontend uses a **centralized, dynamic API URL configuration** that works automatically:

**Priority Order:**
1. **Environment Variable** (`NEXT_PUBLIC_API_URL`) - Highest priority if set
2. **Auto-Detection** - Detects Vercel domains and uses Railway backend
3. **Fallback** - Uses localhost for development

### Auto-Detection Logic

```typescript
// Automatically detects:
- Vercel domains (*.vercel.app) → Railway backend
- Localhost → http://localhost:4000/api
- Custom domains → Same host with port 4000
```

### Common API URL Issues

#### Issue: Port in URL (`:4000`)

**Problem:** URL includes port like `https://domain.vercel.app:4000/api`

**Solution:**
- Vercel domains cannot have custom ports
- The code automatically strips ports from URLs
- Make sure `NEXT_PUBLIC_API_URL` doesn't include `:4000`

#### Issue: Wrong Backend URL

**Problem:** Frontend connecting to wrong backend

**Solution:**
1. Check browser console for API URL logs
2. Verify auto-detection is working (should see Railway URL)
3. Or set `NEXT_PUBLIC_API_URL` explicitly in Vercel

#### Issue: localhost on Production

**Problem:** Still using `localhost:4000` on Vercel

**Solution:**
1. Check `NEXT_PUBLIC_API_URL` is not set incorrectly
2. Clear browser cache (hard refresh: Ctrl+Shift+R)
3. Verify deployment completed successfully
4. Check build logs for errors

### Files Using API URL

All API calls use centralized configuration:
- `frontend/src/lib/apiConfig.ts` - Centralized config
- `frontend/src/lib/api.ts` - Main API client
- All components and pages use `getApiUrl()` helper

**✅ DO:** Use centralized helper
```typescript
import { getApiUrl } from '@/lib/apiConfig';
const response = await fetch(`${getApiUrl()}/auth/login`);
```

**❌ DON'T:** Use direct environment variable
```typescript
// Wrong - don't do this
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`);
```

## Troubleshooting

### Issue: 404 Errors on API Routes

**Problem:** Frontend shows 404 errors for routes like `/backgrounds/active` or `/contact-platforms`

**Root Cause:** API base URL configuration removing `/api` prefix

**Solution:**
1. Verify `getApiBaseUrl()` in `frontend/src/lib/api.ts` includes `/api`
2. Check that API calls use full path: `/api/backgrounds/active`
3. Verify backend routes are registered with `/api` prefix

**Common 404 Routes:**
- `/api/backgrounds/active` - Should work after fix
- `/api/contact-platforms` - Should work after fix
- `/api/video-advertisements/active` - Should work after fix

**Verification:**
1. Check Network tab in browser DevTools
2. Verify requests go to: `https://backend.com/api/route` (with `/api`)
3. Should NOT see: `https://backend.com/route` (without `/api`)

### Issue: 404 Errors on API Calls

**Causes:**
1. Wrong API URL in environment variable
2. Backend not deployed/running
3. CORS configuration issue

**Solutions:**
1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check Railway backend is online
3. Verify CORS settings in Railway backend
4. Check browser console for specific error messages

### Issue: Environment Variable Not Working

**Causes:**
1. Variable not set for correct environment
2. Didn't redeploy after setting variable
3. Variable name has typo
4. Port included in URL (`:4000`)

**Solutions:**
1. Verify variable is set for **Production** environment
2. **Redeploy** after adding variable (required!)
3. Check variable name is exactly: `NEXT_PUBLIC_API_URL` (case-sensitive)
4. **Remove port** from URL (should NOT include `:4000`)
5. Check build logs in Vercel for any errors

### Issue: Still Seeing localhost in Console

**Causes:**
1. Didn't redeploy after setting variable
2. Browser cache
3. Variable not set correctly
4. Auto-detection not working

**Solutions:**
1. **Redeploy** after adding variable
2. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
3. Verify variable value doesn't have trailing slashes (should end with `/api`)
4. Check variable is set for Production environment
5. If not using env var, verify auto-detection is working (check console logs)

### Issue: Build Fails

**Causes:**
1. TypeScript errors
2. Missing dependencies
3. Build command error

**Solutions:**
1. Check build logs in Vercel
2. Fix TypeScript errors locally first
3. Verify `package.json` has all dependencies
4. Test build locally: `npm run build`

### Issue: Framework Not Detected

**Problem:** Vercel shows "No Framework Detected"

**Solution:**
1. Verify Root Directory is set to `frontend`
2. Verify `package.json` exists in frontend folder
3. Verify Next.js is installed
4. Manually set Framework Preset to "Next.js"

### Issue: Git Connection Error

**Problem:** Can't connect to GitHub repository

**Solution:**
1. Verify GitHub repository is accessible
2. Check Vercel has permission to access repository
3. Reconnect GitHub account if needed
4. Check repository settings in GitHub

---

## Common Issues & Fixes

### Issue: CORS Errors

**Problem:** Frontend can't make API requests

**Solution:**
1. Check Railway backend → Variables → `FRONTEND_URL`
2. Should include: `https://bioaestheticaxdepolying.vercel.app`
3. Verify CORS is configured in `backend/src/app.ts`
4. Check Railway logs for CORS errors

### Issue: Root Directory Not Found

**Problem:** Vercel can't find project files

**Solution:**
1. Go to Project Settings → General
2. Set Root Directory to: `frontend`
3. Save and redeploy

### Issue: Build Timeout

**Problem:** Build takes too long and times out

**Solution:**
1. Optimize build process
2. Remove unused dependencies
3. Check for infinite loops in build scripts
4. Consider upgrading Vercel plan if needed

---

## Quick Reference

### Vercel Environment Variable
```
NEXT_PUBLIC_API_URL = https://bioaestheticaxdepolying-production.up.railway.app/api
```

### Railway Backend URL
```
https://bioaestheticaxdepolying-production.up.railway.app/api
```

### Vercel Project Settings
- **Root Directory:** `frontend`
- **Framework:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

### Verify Deployment
1. Check Vercel dashboard for successful deployment
2. Test site: `https://bioaestheticaxdepolying.vercel.app`
3. Check browser console for API connection
4. Test login/API features

---

## Security Notes

1. **Only use `NEXT_PUBLIC_*` variables** - These are safe to expose to browser
2. **Never add backend secrets** - Don't add JWT secrets, database URLs, etc.
3. **Use Railway for backend secrets** - Keep sensitive data in Railway Variables
4. **Review variable values** - Make sure no sensitive data in public variables

---

## Related Documentation

- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [Deployment Environment Variables](./DEPLOYMENT_ENVIRONMENT_VARIABLES.md)
- [Environment Variables Reference](./ENVIRONMENT_VARIABLES_REFERENCE.md)
- [Credentials Guide](./CREDENTIALS_GUIDE.md)

