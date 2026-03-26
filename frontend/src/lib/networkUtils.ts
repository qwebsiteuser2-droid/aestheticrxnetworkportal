/**
 * Network Utilities for handling slow/unstable internet connections
 */

// Connection status types
export type ConnectionStatus = 'online' | 'offline' | 'slow';

// Check if we're online
export const isOnline = (): boolean => {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
};

// Get estimated connection quality
export const getConnectionQuality = (): 'fast' | 'slow' | 'offline' => {
  if (!isOnline()) return 'offline';
  
  // Use Network Information API if available
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection) {
      // effectiveType can be 'slow-2g', '2g', '3g', or '4g'
      const effectiveType = connection.effectiveType;
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        return 'slow';
      }
      // downlink is in Mbps
      if (connection.downlink && connection.downlink < 1) {
        return 'slow';
      }
    }
  }
  
  return 'fast';
};

// Retry configuration
export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryOn?: number[]; // HTTP status codes to retry on
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryOn: [408, 429, 500, 502, 503, 504, 0], // 0 for network errors
};

// Calculate exponential backoff delay
export const calculateBackoffDelay = (
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number => {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.floor(delay + jitter);
};

// Sleep utility
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Retry wrapper for async functions
export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: RetryConfig
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, retryOn } = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry
      const status = error.response?.status || 0;
      const shouldRetry = attempt < maxRetries && (
        retryOn.includes(status) ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED' ||
        error.message === 'Network Error'
      );
      
      if (!shouldRetry) {
        throw error;
      }
      
      // Calculate delay and wait
      const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);
      console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

// Debounce utility for search inputs
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Throttle utility for frequent events
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  set<T>(key: string, data: T, ttl: number = 60000): void { // Default 1 minute TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // Get cached data or fetch if not available/expired
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 60000
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }
}

export const apiCache = new SimpleCache();

// Connection status listener
export function createConnectionListener(
  onOnline?: () => void,
  onOffline?: () => void,
  onSlow?: () => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const handleOnline = () => {
    console.log('🌐 Connection restored');
    onOnline?.();
  };
  
  const handleOffline = () => {
    console.log('📴 Connection lost');
    onOffline?.();
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Check for slow connection periodically
  let slowCheckInterval: NodeJS.Timeout | null = null;
  if (onSlow) {
    slowCheckInterval = setInterval(() => {
      if (getConnectionQuality() === 'slow') {
        onSlow();
      }
    }, 5000);
  }
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (slowCheckInterval) clearInterval(slowCheckInterval);
  };
}

// Format time ago for last sync
export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

