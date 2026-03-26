import Cookies from 'js-cookie';
import { User, AuthResponse } from '@/types';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

/**
 * Check if we're in a browser environment
 */
const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Set authentication tokens and user data
 */
export const setAuthData = (authResponse: AuthResponse): void => {
  if (!isBrowser()) return;
  if (authResponse.data) {
    const { accessToken, refreshToken, user } = authResponse.data;
    
    // Set tokens with expiration and CSRF protection (SameSite=Strict)
    // SameSite=Strict provides CSRF protection by preventing cookies from being sent in cross-site requests
    Cookies.set(ACCESS_TOKEN_KEY, accessToken, { 
      expires: 1, // 1 day
      sameSite: 'strict', // CSRF protection
      secure: process.env.NODE_ENV === 'production' // HTTPS only in production
    });
    if (refreshToken) {
      Cookies.set(REFRESH_TOKEN_KEY, refreshToken, { 
        expires: 7, // 7 days
        sameSite: 'strict', // CSRF protection
        secure: process.env.NODE_ENV === 'production' // HTTPS only in production
      });
    }
    
    // Set user data
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

/**
 * Get access token
 */
export const getAccessToken = (): string | undefined => {
  if (!isBrowser()) return undefined;
  return Cookies.get(ACCESS_TOKEN_KEY);
};

/**
 * Get refresh token
 */
export const getRefreshToken = (): string | undefined => {
  if (!isBrowser()) return undefined;
  return Cookies.get(REFRESH_TOKEN_KEY);
};

/**
 * Get current user from localStorage
 */
export const getCurrentUser = (): User | null => {
  if (!isBrowser()) return null;
  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) {
      return null;
    }
    
    const user = JSON.parse(userStr);
    return user;
  } catch (error) {
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = getAccessToken();
  const user = getCurrentUser();
  return !!(token && user);
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (): boolean => {
  if (!isBrowser()) return true;
  const token = getAccessToken();
  if (!token) {
    return true;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < currentTime;
    return isExpired;
  } catch (error) {
    return true;
  }
};

/**
 * Check if user is approved
 */
export const isApproved = (): boolean => {
  const user = getCurrentUser();
  return user?.is_approved || false;
};

/**
 * Check if user is admin
 */
export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.is_admin || false;
};

/**
 * Clear authentication data (complete logout)
 */
export const clearAuthData = (): void => {
  if (!isBrowser()) return;
  // Clear cookies (tokens)
  Cookies.remove(ACCESS_TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);
  // Clear localStorage (user data)
  localStorage.removeItem(USER_KEY);
  // Clear sessionStorage (session flags)
  sessionStorage.removeItem('fromLogin');
  // Clear all cookies that might be related
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
};

/**
 * Update user data in localStorage
 */
export const updateUserData = (user: User): void => {
  if (!isBrowser()) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Get user tier based on sales
 */
export const getUserTier = (sales: number): string => {
  if (sales >= 100000) return 'Grandmaster';
  if (sales >= 50000) return 'Master';
  if (sales >= 25000) return 'Expert';
  if (sales >= 10000) return 'Contributor';
  return 'Starter';
};

/**
 * Get tier color
 */
export const getTierColor = (tier: string): string => {
  const colors: Record<string, string> = {
    Starter: 'gray',
    Contributor: 'green',
    Expert: 'blue',
    Master: 'purple',
    Grandmaster: 'gold',
  };
  return colors[tier] || 'gray';
};

/**
 * Get tier progress percentage
 */
export const getTierProgress = (currentSales: number, tier: string): number => {
  const thresholds: Record<string, number> = {
    Starter: 0,
    Contributor: 10000,
    Expert: 25000,
    Master: 50000,
    Grandmaster: 100000,
  };

  const currentThreshold = thresholds[tier] || 0;
  const nextThreshold = Object.values(thresholds).find(t => t > currentThreshold) || 100000;
  
  if (currentSales <= currentThreshold) return 0;
  if (currentSales >= nextThreshold) return 100;
  
  return Math.min(100, ((currentSales - currentThreshold) / (nextThreshold - currentThreshold)) * 100);
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};


/**
 * Format date
 */
export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

/**
 * Format date and time
 */
export const formatDateTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

/**
 * Get relative time
 */
export const getRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generate a random ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
