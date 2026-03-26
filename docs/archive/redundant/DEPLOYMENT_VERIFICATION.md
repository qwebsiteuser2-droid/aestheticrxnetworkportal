# Deployment Verification Guide

## 🎉 Congratulations! Your Full Stack is Online

You now have:
- ✅ **Database** - PostgreSQL on Railway
- ✅ **Backend** - Node.js API on Railway  
- ✅ **Frontend** - Next.js on Vercel

## 🔗 Connect Frontend to Backend

### Step 1: Get Your Railway Backend URL

1. Go to Railway → Your Backend Service → Settings → Networking
2. Find your **Public Domain** (e.g., `q-website-backend-production.up.railway.app`)
3. Copy the full URL (should be like: `https://q-website-backend-production.up.railway.app`)

**OR** if you have a custom domain:
- Use your custom domain (e.g., `https://api.yourdomain.com`)

### Step 2: Set Environment Variable in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/qasim3/bioaestheticaxdepolying)
2. Click on your project → **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** Your Railway backend URL (e.g., `https://q-website-backend-production.up.railway.app`)
   - **Environment:** Select all (Production, Preview, Development)
4. Click **Save**

### Step 3: Redeploy Frontend

After adding the environment variable:

1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger auto-deployment

## ✅ Verify Everything Works

### 1. Test Backend Health

Open in browser or use curl:
```bash
curl https://your-railway-backend-url.up.railway.app/health
```

Should return:
```json
{"status":"ok","timestamp":"..."}
```

### 2. Test Frontend → Backend Connection

1. Open your Vercel frontend URL
2. Open browser **Developer Tools** (F12) → **Console** tab
3. Look for API URL logs:
   ```
   🌐 API URL (from env): https://your-backend-url/api
   ```
4. Try logging in or accessing any API feature
5. Check **Network** tab for API requests - they should go to your Railway backend

### 3. Check CORS Configuration

The backend should allow requests from:
- Your Vercel production domain: `https://bioaestheticaxdepolying.vercel.app`
- Your Vercel preview domains: `https://bioaestheticaxdepolying-*.vercel.app`
- Any custom domains you've configured

If you see CORS errors:
- Check `backend/src/app.ts` - CORS should allow Vercel domains
- Verify `FRONTEND_URL` environment variable in Railway matches your Vercel URL

## 🔧 Environment Variables Checklist

### Railway Backend Variables

Go to Railway → Backend Service → Settings → Variables

**Required:**
- ✅ `DATABASE_URL` - PostgreSQL connection string (points to `bioaestheticax1` database)
- ✅ `JWT_SECRET` - At least 32 characters
- ✅ `JWT_REFRESH_SECRET` - At least 32 characters
- ✅ `FRONTEND_URL` - Your Vercel frontend URL (e.g., `https://bioaestheticaxdepolying.vercel.app`)

**Optional (but recommended):**
- `NODE_ENV=production`
- `PORT=4000` (Railway sets this automatically)
- `BACKEND_URL` - Your Railway backend URL (for internal references)

### Vercel Frontend Variables

Go to Vercel → Project → Settings → Environment Variables

**Required:**
- ✅ `NEXT_PUBLIC_API_URL` - Your Railway backend URL (e.g., `https://q-website-backend-production.up.railway.app`)

**Note:** `NEXT_PUBLIC_*` variables are exposed to the browser, so they're safe for API URLs.

## 🐛 Troubleshooting

### Frontend can't connect to backend

**Symptoms:**
- Network errors in browser console
- "Failed to fetch" errors
- CORS errors

**Solutions:**
1. **Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel**
   - Should be your Railway backend URL
   - Should NOT include `/api` at the end (frontend adds that)
   - Example: `https://q-website-backend-production.up.railway.app`

2. **Check CORS in backend:**
   - Railway → Backend → Settings → Variables
   - Ensure `FRONTEND_URL` matches your Vercel domain
   - Check `backend/src/app.ts` CORS configuration

3. **Verify backend is online:**
   - Railway → Backend → Check status (should be "Online")
   - Test health endpoint: `https://your-backend-url/health`

4. **Check browser console:**
   - Open DevTools → Console
   - Look for API URL logs
   - Check Network tab for failed requests

### Backend database errors

**Symptoms:**
- "relation does not exist" errors
- Database connection errors

**Solutions:**
1. **Verify migrations ran:**
   - Railway → Backend → Deploy Logs
   - Look for "migration:run" output
   - Should see "X migrations are new migrations must be executed"

2. **Check database connection:**
   - Railway → Database → Settings → Variables
   - Verify `DATABASE_URL` points to `bioaestheticax1` database
   - Format: `postgresql://user:pass@host:port/bioaestheticax1`

3. **Manually run migrations (if needed):**
   ```bash
   railway link
   railway run npm run migration:run
   ```

### CORS errors

**Symptoms:**
- "Access to fetch at '...' from origin '...' has been blocked by CORS policy"

**Solutions:**
1. **Update `FRONTEND_URL` in Railway:**
   - Should match your Vercel domain exactly
   - Include `https://` protocol
   - Example: `https://bioaestheticaxdepolying.vercel.app`

2. **Check backend CORS config:**
   - File: `backend/src/app.ts`
   - Should allow Vercel domains dynamically
   - Should allow preview deployments

3. **Redeploy backend after changing CORS:**
   - Railway will auto-redeploy on push
   - Or manually trigger redeploy

## 📊 Monitoring

### Railway Monitoring

- **Logs:** Railway → Backend → Logs tab
- **Metrics:** Railway → Backend → Metrics tab
- **Health:** Check `/health` endpoint

### Vercel Monitoring

- **Logs:** Vercel → Project → Logs
- **Analytics:** Vercel → Project → Analytics
- **Speed Insights:** Vercel → Project → Speed Insights

## 🔐 Security Checklist

- ✅ JWT secrets are set and secure (32+ characters)
- ✅ Database credentials are secure (Railway manages this)
- ✅ CORS is configured to only allow your Vercel domains
- ✅ Environment variables are set correctly
- ✅ No sensitive data in frontend code
- ✅ HTTPS is enabled (Railway and Vercel both use HTTPS)

## 🚀 Next Steps

1. **Test all features:**
   - User registration/login
   - Admin functions
   - API endpoints
   - File uploads

2. **Set up custom domains** (optional):
   - Railway: Custom domain for backend
   - Vercel: Custom domain for frontend

3. **Monitor performance:**
   - Check Railway metrics
   - Check Vercel analytics
   - Monitor error rates

4. **Set up alerts** (optional):
   - Railway: Service health alerts
   - Vercel: Deployment failure notifications

## 📝 Quick Reference

### Backend URL Format
```
https://your-service-name.up.railway.app
```

### Frontend URL Format
```
https://your-project.vercel.app
```

### Database Connection
```
postgresql://user:password@host:port/bioaestheticax1
```

### Environment Variable Priority
1. Railway/Vercel UI settings (highest priority)
2. `railway.json` / `vercel.json` config files
3. `.env` files (local development only)

## 🎯 Success Indicators

You'll know everything is working when:
- ✅ Frontend loads without errors
- ✅ API calls succeed (check Network tab)
- ✅ No CORS errors in console
- ✅ Database queries work
- ✅ Authentication works
- ✅ All features function correctly

---

**Need Help?**
- Check Railway logs: Railway → Service → Logs
- Check Vercel logs: Vercel → Project → Logs
- Review error messages carefully
- Check environment variables are set correctly

