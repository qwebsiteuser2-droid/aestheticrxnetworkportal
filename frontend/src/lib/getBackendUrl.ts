/**
 * Server-side helper to get backend URL
 * Use this in API routes (server-side only)
 */
export function getBackendUrl(): string {
  // Priority 1: BACKEND_URL (server-side only)
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  
  // Priority 2: NEXT_PUBLIC_API_URL (remove /api if present)
  if (process.env.NEXT_PUBLIC_API_URL) {
    const url = process.env.NEXT_PUBLIC_API_URL;
    return url.endsWith('/api') ? url.slice(0, -4) : url;
  }
  
  // Priority 3: Default to localhost for development
  return 'http://localhost:4000';
}

/**
 * Get backend URL with /api path
 */
export function getBackendApiUrl(): string {
  const baseUrl = getBackendUrl();
  return `${baseUrl}/api`;
}

