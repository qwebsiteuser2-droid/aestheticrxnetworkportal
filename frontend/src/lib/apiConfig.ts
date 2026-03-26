/**
 * Centralized API URL Configuration
 * 
 * This file provides a single source of truth for API URL configuration.
 * It automatically detects the environment (Vercel, local, etc.) and returns
 * the appropriate API URL.
 * 
 * Usage:
 *   import { getApiUrl } from '@/lib/apiConfig';
 *   const apiUrl = getApiUrl();
 */

/**
 * Robust URL sanitization function
 * Fixes all common malformed URL patterns
 * 
 * @param url - Raw URL string (may be malformed)
 * @returns Properly formatted URL
 */
const sanitizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return 'https://aestheticrxdepolying-production.up.railway.app/api';
  }

  let sanitized = url.trim();
  
  // Log original for debugging (only once)
  if (typeof window !== 'undefined' && !(window as any).__urlSanitizationLogged) {
    console.log('🔧 Original URL:', sanitized);
    (window as any).__urlSanitizationLogged = true;
  }
  
  // Step 1: Remove leading slashes (e.g., /domain.com → domain.com)
  sanitized = sanitized.replace(/^\/+/, '');
  
  // Step 2: Fix all malformed protocol patterns (order matters!)
  // CRITICAL: Fix triple slashes first (https:///domain → https://domain)
  sanitized = sanitized.replace(/^https?:\/\/\//, 'https://');
  sanitized = sanitized.replace(/^https?:\/\/\/+/, 'https://');
  
  // Pattern: https//:domain → https://domain (most common malformed pattern)
  if (sanitized.match(/^https?\/\/:/)) {
    sanitized = sanitized.replace(/^https?\/\/:/, 'https://');
  }
  // Pattern: https//domain → https://domain (missing colon)
  else if (sanitized.match(/^https?\/\//)) {
    sanitized = sanitized.replace(/^https?\/\//, 'https://');
  }
  // Pattern: https:/domain → https://domain (missing one slash)
  else if (sanitized.match(/^https?:\//)) {
    sanitized = sanitized.replace(/^https?:\//, 'https://');
  }
  // Pattern: http:/domain → http://domain
  else if (sanitized.match(/^http:\//)) {
    sanitized = sanitized.replace(/^http:\//, 'http://');
  }
  // Pattern: https:domain → https://domain (missing both slashes, but has colon)
  else if (sanitized.match(/^https?:[^\/]/)) {
    sanitized = sanitized.replace(/^(https?:)([^\/])/, '$1//$2');
  }
  
  // Step 3: Normalize protocol (ensure exactly two slashes after protocol)
  // Fix any remaining triple+ slashes
  sanitized = sanitized.replace(/^(https?:\/)\/+/g, '$1/');
  
  // Step 4: Ensure it starts with http:// or https://
  if (!sanitized.match(/^https?:\/\//)) {
    // If it doesn't start with a protocol, add https://
    sanitized = `https://${sanitized}`;
  }
  
  // Step 5: Remove ports (Vercel doesn't support custom ports)
  sanitized = sanitized.replace(/:4000(\/|$)/g, '$1');
  sanitized = sanitized.replace(/:3000(\/|$)/g, '$1');
  
  // Step 6: Ensure /api suffix
  if (!sanitized.endsWith('/api')) {
    sanitized = sanitized.endsWith('/') ? `${sanitized}api` : `${sanitized}/api`;
  }
  
  // Step 7: Final validation - must be absolute URL
  if (!sanitized.startsWith('https://') && !sanitized.startsWith('http://')) {
    // Last resort: try to extract domain and rebuild URL
    const domainMatch = sanitized.match(/([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|railway\.app|vercel\.app))/);
    if (domainMatch) {
      const domain = domainMatch[1];
      console.warn('⚠️ Rebuilding URL from extracted domain:', domain);
      sanitized = `https://${domain}/api`;
    } else {
      console.error('❌ URL sanitization failed, using default:', sanitized);
      sanitized = 'https://aestheticrxdepolying-production.up.railway.app/api';
    }
  }
  
  // Log sanitized for debugging (only once)
  if (typeof window !== 'undefined' && (window as any).__urlSanitizationLogged && !(window as any).__urlSanitizedLogged) {
    console.log('✅ Sanitized URL:', sanitized);
    (window as any).__urlSanitizedLogged = true;
  }
  
  return sanitized;
};

/**
 * Get the API URL based on environment
 * 
 * Priority:
 * 1. NEXT_PUBLIC_API_URL environment variable (if set)
 * 2. Auto-detect based on hostname (Vercel → Railway, localhost → localhost:4000)
 * 3. Fallback to localhost for development
 * 
 * @returns API URL with /api suffix
 */
export const getApiUrl = (): string => {
  // Priority 1: Use environment variable if explicitly set
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return sanitizeUrl(envUrl);
  }

  // Priority 2: Auto-detect based on hostname (client-side only)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Vercel/Railway domains → Use Railway backend
    if (hostname.includes('vercel.app') || hostname.includes('railway.app')) {
      // Try to get from env variable first, otherwise use default Railway URL
      const defaultRailwayUrl = process.env.NEXT_PUBLIC_API_URL || 
        process.env.NEXT_PUBLIC_RAILWAY_URL || 
        'https://aestheticrxdepolying-production.up.railway.app/api';
      
      const railwayUrl = sanitizeUrl(defaultRailwayUrl);
      
      // Log once per page load
      if (!(window as any).__apiUrlLogged) {
        console.log('🌐 Environment: Production (Vercel)');
        console.log('🔗 Using Railway backend:', railwayUrl);
        (window as any).__apiUrlLogged = true;
      }
      
      return railwayUrl;
    }
    
    // Localhost → Use local backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const localUrl = 'http://localhost:4000/api';
      
      if (!(window as any).__apiUrlLogged) {
        console.log('🌐 Environment: Local Development');
        console.log('🔗 Using local backend:', localUrl);
        (window as any).__apiUrlLogged = true;
      }
      
      return localUrl;
    }
    
    // Other domains (IP addresses, custom domains) → Use same host with port 4000
    // Ensure protocol ends with :// (protocol already includes the colon)
    const protocolWithSlashes = protocol.endsWith('//') ? protocol : `${protocol}//`;
    const customUrl = `${protocolWithSlashes}${hostname}:4000/api`;
    
    if (!(window as any).__apiUrlLogged) {
      console.log('🌐 Environment: Custom Domain');
      console.log('🔗 Using custom backend:', customUrl);
      (window as any).__apiUrlLogged = true;
    }
    
    return customUrl;
  }

  // Priority 3: Server-side rendering fallback
  // For SSR, prefer environment variable, fallback to localhost
  const ssrUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  return sanitizeUrl(ssrUrl);
};

/**
 * Get API base URL without /api suffix
 * Useful for building full URLs or image paths
 * 
 * @returns Base URL without /api suffix
 */
export const getApiBaseUrl = (): string => {
  const apiUrl = getApiUrl();
  return apiUrl.replace('/api', '');
};

/**
 * Get full API endpoint URL
 * 
 * @param endpoint - API endpoint (e.g., '/auth/login' or 'auth/login')
 * @returns Full URL with endpoint
 */
export const getApiEndpoint = (endpoint: string): string => {
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

/**
 * Check if running in production (Vercel)
 */
export const isProduction = (): boolean => {
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('vercel.app') || 
           window.location.hostname.includes('railway.app');
  }
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if running locally
 */
export const isLocal = (): boolean => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }
  return process.env.NODE_ENV === 'development';
};

/**
 * Get full URL for profile images
 * Profile images are stored on the backend server, so we need to prepend the backend URL
 * 
 * @param imageUrl - Image URL (can be relative like /uploads/profiles/xxx.png or absolute)
 * @returns Full URL to the image on the backend server, or null if no image
 */
export const getProfileImageUrl = (imageUrl?: string | null): string | null => {
  if (!imageUrl) return null;
  
  // If it's already an absolute URL (starts with http), return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If it's a data URL, return as-is
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  
  // Get the backend base URL (without /api)
  const backendBaseUrl = getApiBaseUrl();
  
  // Ensure the image path starts with /
  const imagePath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  
  return `${backendBaseUrl}${imagePath}`;
};

/**
 * Get full URL for product images
 * 
 * @param imageUrl - Image URL (can be relative or absolute)
 * @returns Full URL to the image on the backend server, or null if no image
 */
export const getProductImageUrl = (imageUrl?: string | null): string | null => {
  return getProfileImageUrl(imageUrl);
};

/**
 * Get full URL for any uploaded file
 * 
 * @param filePath - File path (can be relative or absolute)
 * @returns Full URL to the file on the backend server, or null if no path
 */
export const getUploadUrl = (filePath?: string | null): string | null => {
  return getProfileImageUrl(filePath);
};

