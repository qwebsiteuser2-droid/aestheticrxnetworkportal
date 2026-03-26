/**
 * Centralized URL Configuration for Backend
 * 
 * This file provides a single source of truth for all URL configurations
 * in the backend. It handles FRONTEND_URL, BACKEND_URL, and related URLs.
 * 
 * Usage:
 *   import { getFrontendUrl, getBackendUrl } from '@/config/urlConfig';
 */

/**
 * Get the frontend URL based on environment
 * 
 * Priority:
 * 1. FRONTEND_URL environment variable (if set)
 * 2. Auto-detect from request origin/referer (if provided)
 * 3. Fallback to localhost for development
 * 
 * @param requestOrigin - Optional origin from request headers
 * @returns Frontend URL
 */
export const getFrontendUrl = (requestOrigin?: string): string => {
  // Priority 1: Use provided request origin (for dynamic detection)
  if (requestOrigin) {
    try {
      const url = new URL(requestOrigin);
      const frontendUrl = `${url.protocol}//${url.host}`;
      console.log('🌐 Using frontend URL from request:', frontendUrl);
      return frontendUrl;
    } catch (e) {
      console.warn('⚠️ Failed to parse origin/referer URL, using env/default');
    }
  }

  // Priority 2: Use environment variable
  const envUrl = process.env.FRONTEND_URL;
  if (envUrl && envUrl.trim() !== '') {
    // Handle comma-separated URLs (take first one for single URL functions)
    const urls = envUrl.split(',').map(url => url.trim()).filter(url => url);
    const firstUrl = urls[0];
    if (firstUrl) {
      return firstUrl;
    }
  }

  // Priority 3: Fallback based on environment
  if (process.env.NODE_ENV === 'production') {
    // In production, default to Vercel if not set
    return 'https://aestheticrxnetwork.vercel.app';
  }

  // Development fallback
  return 'http://localhost:3000';
};

/**
 * Get all frontend URLs (supports multiple URLs for CORS)
 * 
 * @returns Array of allowed frontend URLs
 */
export const getAllFrontendUrls = (): string[] => {
  const urls: string[] = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  // Production Vercel domains
  urls.push('https://aestheticrxnetwork.vercel.app');
  urls.push('https://aestheticrxnetwork-*.vercel.app');
  
  // Legacy domains (keep for backward compatibility)
  urls.push('https://aestheticrxdepolying.vercel.app');
  urls.push('https://aestheticrxdepolying-*.vercel.app');
  urls.push('https://aestheticrxnetworkdepolying.vercel.app');
  urls.push('https://aestheticrxnetworkdepolying-*.vercel.app');

  // Add environment variable URLs (supports comma-separated)
  if (process.env.FRONTEND_URL) {
    const envUrls = process.env.FRONTEND_URL.split(',')
      .map(url => url.trim())
      .filter(url => url);
    urls.push(...envUrls);
  }

  // Add Vercel preview domains if FRONTEND_URL contains vercel.app
  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('vercel.app')) {
    const vercelDomains = process.env.FRONTEND_URL.split(',').map(url => {
      const trimmed = url.trim();
      if (trimmed.includes('vercel.app')) {
        try {
          const urlObj = new URL(trimmed);
          const projectName = urlObj.hostname.split('.')[0];
          return [
            trimmed,
            `https://${projectName}.vercel.app`,
          ];
        } catch (e) {
          return [trimmed];
        }
      }
      return [trimmed];
    }).flat();
    urls.push(...vercelDomains.filter((url, index, self) => self.indexOf(url) === index));
  }

  return [...new Set(urls)]; // Remove duplicates
};

/**
 * Get the backend URL
 * 
 * Priority:
 * 1. BACKEND_URL environment variable
 * 2. Auto-detect from PORT and hostname
 * 3. Fallback to localhost:4000
 * 
 * @returns Backend URL
 */
export const getBackendUrl = (): string => {
  // Priority 1: Environment variable (but validate it's not localhost)
  if (process.env.BACKEND_URL) {
    const backendUrl = process.env.BACKEND_URL.trim();
    // Reject localhost URLs in production-like environments
    if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
      console.warn('⚠️ BACKEND_URL contains localhost, ignoring and using production URL');
    } else {
      return backendUrl;
    }
  }

  // Priority 2: Check if running on Railway (multiple indicators)
  const isRailway = process.env.RAILWAY_ENVIRONMENT || 
                    process.env.RAILWAY_PROJECT_ID || 
                    process.env.RAILWAY_PUBLIC_DOMAIN ||
                    (process.env.NODE_ENV === 'production' && process.env.PORT);
  
  if (isRailway) {
    // Railway provides RAILWAY_PUBLIC_DOMAIN or we can construct from service
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      const railwayUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
      console.log('🌐 Using Railway URL from RAILWAY_PUBLIC_DOMAIN:', railwayUrl);
      return railwayUrl;
    }
    // Fallback to known Railway URL if not set
    console.log('🌐 Railway detected, using production URL');
    return 'https://aestheticrxnetworkdepolying-production.up.railway.app';
  }

  // Priority 3: Check NODE_ENV for production
  if (process.env.NODE_ENV === 'production') {
    // In production but not Railway, still use production URL
    console.log('🌐 Production environment detected, using production URL');
    return 'https://aestheticrxnetworkdepolying-production.up.railway.app';
  }

  // Priority 4: If PORT is set (Railway always sets this), assume production
  if (process.env.PORT && process.env.PORT !== '4000' && process.env.PORT !== '3000') {
    console.log('🌐 Non-standard PORT detected, assuming production');
    return 'https://aestheticrxnetworkdepolying-production.up.railway.app';
  }

  // Development fallback (only if truly local)
  const port = process.env.PORT || '4000';
  console.log('🌐 Development mode, using localhost');
  return `http://localhost:${port}`;
};

/**
 * Get backend API URL (with /api suffix)
 * 
 * @returns Backend API URL
 */
export const getBackendApiUrl = (): string => {
  const baseUrl = getBackendUrl();
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

/**
 * Build a frontend URL with a specific path
 * 
 * @param path - Path to append (e.g., '/leaderboard', '/research')
 * @param requestOrigin - Optional origin from request headers
 * @returns Full frontend URL with path
 */
export const getFrontendUrlWithPath = (path: string, requestOrigin?: string): string => {
  const baseUrl = getFrontendUrl(requestOrigin);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Build a backend URL with a specific path
 * 
 * @param path - Path to append (e.g., '/api/payments/notify')
 * @returns Full backend URL with path
 */
export const getBackendUrlWithPath = (path: string): string => {
  const baseUrl = getBackendUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Check if running in production
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if running locally
 */
export const isLocal = (): boolean => {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
};

