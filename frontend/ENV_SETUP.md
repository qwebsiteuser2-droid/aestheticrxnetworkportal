# Environment Variables Setup

## API URL Configuration

The frontend now uses **automatic API URL detection** that works for both Vercel and local development.

### How It Works

1. **Priority 1:** `NEXT_PUBLIC_API_URL` environment variable (if set)
2. **Priority 2:** Auto-detect based on hostname:
   - Vercel domains → Railway backend
   - Localhost → Local backend (http://localhost:4000/api)
   - Custom domains → Same host with port 4000
3. **Priority 3:** Fallback to localhost for development

### For Local Development

**No configuration needed!** The app automatically detects `localhost` and uses:
```
http://localhost:4000/api
```

### For Vercel Production

**Option 1: Auto-detection (Recommended)**
- Don't set `NEXT_PUBLIC_API_URL`
- The app will auto-detect Vercel domains and use Railway backend

**Option 2: Explicit Configuration**
Set in Vercel Dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_API_URL = https://bioaestheticaxdepolying-production-e86e.up.railway.app/api
```

### Usage in Code

Always use the centralized helper function:

```typescript
import { getApiUrl } from '@/lib/apiConfig';

// Get full API URL with /api suffix
const apiUrl = getApiUrl(); // Returns: http://localhost:4000/api or https://railway.app/api

// Get base URL without /api
import { getApiBaseUrl } from '@/lib/apiConfig';
const baseUrl = getApiBaseUrl(); // Returns: http://localhost:4000 or https://railway.app

// Get full endpoint URL
import { getApiEndpoint } from '@/lib/apiConfig';
const loginUrl = getApiEndpoint('/auth/login'); // Returns: http://localhost:4000/api/auth/login
```

### Available Functions

- `getApiUrl()` - Returns API URL with `/api` suffix
- `getApiBaseUrl()` - Returns base URL without `/api` suffix
- `getApiEndpoint(endpoint)` - Returns full URL for an endpoint
- `isProduction()` - Check if running in production
- `isLocal()` - Check if running locally

### Migration Notes

All direct uses of `process.env.NEXT_PUBLIC_API_URL` have been replaced with `getApiUrl()` from `@/lib/apiConfig`.

The old `getApiUrl` from `@/lib/getApiUrl` still works (backward compatibility) but now re-exports from the new config.

