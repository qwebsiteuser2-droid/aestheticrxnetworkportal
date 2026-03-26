import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';
import { getApiUrl } from './apiConfig';
import { withRetry, apiCache } from './networkUtils';

// Helper function to get the correct API base URL for axios
// The baseURL should include /api since our endpoints don't include /api prefix
// Example: baseURL = "https://backend.com/api", endpoint = "/auth/login" 
// Result: "https://backend.com/api/auth/login"
const getApiBaseUrl = (): string => {
  // Use the centralized getApiUrl helper which already returns URL with /api suffix
  // This is correct because our endpoints (like /auth/login) don't include /api
  return getApiUrl();
};

// API Configuration - Make it dynamic so it's recalculated on each request
const getApiBaseUrlDynamic = (): string => {
  return getApiBaseUrl();
};

// Create axios instance with dynamic baseURL
const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(), // Initial baseURL
  timeout: 30000, // 30 seconds default (increased from 10s for Railway)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Retry configuration for slow connections
const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelay: 1000,
  maxDelay: 5000,
  retryOn: [408, 429, 500, 502, 503, 504, 0], // 0 for network errors
};

// Cache TTL for different types of data (in milliseconds)
const CACHE_TTL = {
  products: 5 * 60 * 1000,    // 5 minutes
  doctors: 2 * 60 * 1000,     // 2 minutes
  leaderboard: 60 * 1000,     // 1 minute
  tierConfigs: 10 * 60 * 1000, // 10 minutes
  hallOfPride: 5 * 60 * 1000,  // 5 minutes
};

// Override baseURL on each request to ensure it's always current
api.interceptors.request.use(
  (config) => {
    // Update baseURL dynamically for each request
    config.baseURL = getApiBaseUrlDynamic();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor to add auth token (merged with baseURL interceptor above)
api.interceptors.request.use(
  (config) => {
    // Update baseURL dynamically for each request
    let baseUrl = getApiBaseUrlDynamic();
    
    // Safety check: Ensure baseURL is properly formatted (absolute URL with protocol)
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      console.error('❌ CRITICAL: baseURL missing protocol!', baseUrl);
      // Try to fix common issues
      if (baseUrl.startsWith('/')) {
        baseUrl = baseUrl.replace(/^\/+/, '');
      }
      if (baseUrl.includes('https//:') || baseUrl.includes('https//')) {
        baseUrl = baseUrl.replace(/https?\/\/:?/, 'https://');
      } else if (baseUrl.includes('https:/')) {
        baseUrl = baseUrl.replace(/https?:\//, 'https://');
      } else if (!baseUrl.match(/^https?:\/\//)) {
        baseUrl = `https://${baseUrl}`;
      }
    }
    
    // CRITICAL: Fix triple slashes (https:///domain → https://domain)
    baseUrl = baseUrl.replace(/^(https?:\/)\/+/g, '$1/');
    
    // CRITICAL: Ensure baseURL always includes /api
    if (!baseUrl.endsWith('/api')) {
      console.error('❌ CRITICAL: baseURL missing /api suffix!', baseUrl);
      config.baseURL = baseUrl.endsWith('/') ? `${baseUrl}api` : `${baseUrl}/api`;
    } else {
      config.baseURL = baseUrl;
    }
    
    const token = Cookies.get('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log request URL for debugging (only for specific routes to reduce noise)
    if (config.url?.includes('contact-platforms') || config.url?.includes('backgrounds')) {
      console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
      console.log('📤 Full URL:', `${config.baseURL}${config.url}`);
      console.log('📤 baseURL:', config.baseURL);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refreshToken');
        if (refreshToken) {
          // getApiBaseUrlDynamic() now returns URL with /api, so we just append the endpoint
          const refreshUrl = getApiBaseUrlDynamic();
          const response = await axios.post(`${refreshUrl}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          Cookies.set('accessToken', accessToken, { 
            expires: 1,
            sameSite: 'strict', // CSRF protection
            secure: process.env.NODE_ENV === 'production' // HTTPS only in production
          });
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    console.error('❌ API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown'
    });

    // Skip showing toast for 404 errors with userNotFound flag (let component handle redirect)
    // Check for userNotFound flag first, then check for 404 on login endpoint
    const requestUrl = error.config?.url || '';
    const fullUrl = error.config ? `${error.config.baseURL || ''}${error.config.url || ''}` : '';
    const isLoginRequest = requestUrl.includes('/auth/login') || 
                         requestUrl === '/auth/login' ||
                         fullUrl.includes('/auth/login');
    const userNotFoundFlag = error.response?.data?.userNotFound === true;
    const is404Status = error.response?.status === 404;
    const isUserNotFound = userNotFoundFlag || (is404Status && isLoginRequest);
    
    console.log('🔍 Interceptor - isUserNotFound:', isUserNotFound);
    console.log('🔍 Interceptor - status:', error.response?.status);
    console.log('🔍 Interceptor - userNotFound flag:', userNotFoundFlag);
    console.log('🔍 Interceptor - is404Status:', is404Status);
    console.log('🔍 Interceptor - isLoginRequest:', isLoginRequest);
    console.log('🔍 Interceptor - requestUrl:', requestUrl);
    console.log('🔍 Interceptor - fullUrl:', fullUrl);
    
    // CRITICAL: Never show toast for 404 errors on login requests - let component handle redirect
    // This prevents "Invalid credentials" from showing when user doesn't exist
    if (is404Status && isLoginRequest) {
      console.log('✅ Interceptor - 404 on login request, skipping toast to let component handle redirect');
      // Don't show any toast - let the component handle the redirect
    } else if (isUserNotFound) {
      console.log('✅ Interceptor - userNotFound flag detected, skipping toast');
      // Don't show any toast - let the component handle it
    } else {
      // Only show toast for errors that are NOT user not found
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.message) {
        // Show more detailed error for network errors
        if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
          console.error('🌐 Network Error Details:', {
            attemptedURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown',
            hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
          });
          toast.error(`Network Error: Cannot reach ${error.config?.baseURL || 'server'}. Please check your connection.`);
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('An unexpected error occurred');
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (credentials: { email: string; password: string; otpCode?: string }) => {
    // Login may involve database queries and OTP checks, increase timeout
    const response = await api.post('/auth/login', credentials, {
      timeout: 30000 // 30 seconds for login operations
    });
    return response.data;
  },

  loginWithOTP: async (userId: string, otpCode: string) => {
    const response = await api.post('/auth/login', {
      userId,
      otpCode,
      isOTPLogin: true
    });
    return response.data;
  },

  generateOTP: async (userId: string) => {
    // OTP generation involves sending emails which can be slow
    const response = await api.post('/otp/generate', { userId }, {
      timeout: 60000 // 60 seconds for OTP generation (email sending can be slow)
    });
    return response.data;
  },

  resendOTP: async (email: string, purpose: string = 'login') => {
    const response = await api.post('/otp/resend', { email, purpose });
    return response.data;
  },

  verifyOTP: async (userId: string, otpCode: string) => {
    const response = await api.post('/otp/verify', { userId, otpCode });
    return response.data;
  },

  checkOTPRequirement: async (userId: string, userRole: string) => {
    const response = await api.post('/otp/check-requirement', { userId, userRole });
    return response.data;
  },

  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (userData: any) => {
    const response = await api.put('/auth/profile', userData);
    return response.data;
  },

  requestPasswordReset: async (email: string) => {
    // Use longer timeout for password reset (OTP generation can take time)
    const response = await api.post('/auth/password-reset/request', { email }, {
      timeout: 30000 // 30 seconds for password reset requests
    });
    return response.data;
  },

  confirmPasswordReset: async (email: string, otpCode: string, newPassword: string) => {
    const response = await api.post('/auth/password-reset/confirm', {
      email,
      otpCode,
      newPassword
    });
    return response.data;
  },

  changePassword: async (passwordData: { currentPassword: string; newPassword: string }) => {
    const response = await api.put('/auth/change-password', passwordData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Google OAuth methods
  getGoogleClientId: async () => {
    const response = await api.get('/auth/google/client-id');
    return response.data;
  },

  googleAuth: async (idToken: string, userType: string = 'regular_user') => {
    const response = await api.post('/auth/google', { idToken, userType }, {
      timeout: 30000 // 30 seconds for Google auth operations
    });
    return response.data;
  },

  linkGoogleAccount: async (idToken: string) => {
    const response = await api.post('/auth/google/link', { idToken });
    return response.data;
  },

  unlinkGoogleAccount: async () => {
    const response = await api.post('/auth/google/unlink');
    return response.data;
  },
};

// Products API with caching and retry support
export const productsApi = {
  getAll: async (params?: { page?: number; limit?: number; category?: string; featured?: boolean }) => {
    const cacheKey = `products:${JSON.stringify(params || {})}`;
    return apiCache.getOrFetch(
      cacheKey,
      async () => {
        const response = await withRetry(
          () => api.get('/products', { params }),
          RETRY_CONFIG
        );
        return response.data;
      },
      CACHE_TTL.products
    );
  },

  getById: async (id: string) => {
    const cacheKey = `product:${id}`;
    return apiCache.getOrFetch(
      cacheKey,
      async () => {
        const response = await withRetry(
          () => api.get(`/products/${id}`),
          RETRY_CONFIG
        );
        return response.data;
      },
      CACHE_TTL.products
    );
  },

  getBySlot: async (slot: number) => {
    const response = await withRetry(
      () => api.get(`/products/slot/${slot}`),
      RETRY_CONFIG
    );
    return response.data;
  },

  search: async (query: string, params?: { page?: number; limit?: number }) => {
    const response = await withRetry(
      () => api.get('/products/search', { params: { q: query, ...params } }),
      RETRY_CONFIG
    );
    return response.data;
  },

  getCategories: async () => {
    const cacheKey = 'product:categories';
    return apiCache.getOrFetch(
      cacheKey,
      async () => {
        const response = await withRetry(
          () => api.get('/products/categories'),
          RETRY_CONFIG
        );
        return response.data;
      },
      CACHE_TTL.products
    );
  },
};

// Orders API
export const ordersApi = {
  create: async (orderData: any) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  getMy: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await api.get('/orders/my', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  getAll: async (params?: { page?: number; limit?: number; status?: string; doctor_id?: string }) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  updateStatus: async (id: string, status: string, notes?: string) => {
    const response = await api.put(`/orders/${id}/status`, { status, notes });
    return response.data;
  },
};

// Research API
export const researchApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; tag?: string }) => {
    const response = await api.get('/research', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/research/${id}`);
    return response.data;
  },

  create: async (researchData: any) => {
    const response = await api.post('/research', researchData);
    return response.data;
  },

  update: async (id: string, researchData: any) => {
    const response = await api.put(`/research/${id}`, researchData);
    return response.data;
  },

  trackView: async (id: string) => {
    const response = await api.post(`/research/${id}/view`);
    return response.data;
  },

  upvote: async (id: string) => {
    const response = await api.post(`/research/${id}/upvote`);
    return response.data;
  },

  removeUpvote: async (id: string) => {
    const response = await api.delete(`/research/${id}/upvote`);
    return response.data;
  },

  getAnalytics: async (id: string) => {
    const response = await api.get(`/research/${id}/analytics`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/research/${id}`);
    return response.data;
  },

  approve: async (id: string) => {
    const response = await api.post(`/research/${id}/approve`);
    return response.data;
  },

  reject: async (id: string, reason: string) => {
    const response = await api.post(`/research/${id}/reject`, { reason });
    return response.data;
  },
};

// Leaderboard API with caching
export const leaderboardApi = {
  get: async () => {
    return apiCache.getOrFetch(
      'leaderboard:public',
      async () => {
        const response = await withRetry(
          () => api.get('/public/leaderboard'),
          RETRY_CONFIG
        );
        return response.data;
      },
      CACHE_TTL.leaderboard
    );
  },
  getUserPosition: async () => {
    const response = await withRetry(
      () => api.get('/auth/leaderboard/position'),
      RETRY_CONFIG
    );
    return response.data;
  },
  getAdmin: async () => {
    const response = await withRetry(
      () => api.get('/admin/leaderboard'),
      RETRY_CONFIG
    );
    return response.data;
  },
};

// Tier Configuration API with caching
export const tierConfigApi = {
  get: async () => {
    return apiCache.getOrFetch(
      'tier-configs:public',
      async () => {
        const response = await withRetry(
          () => api.get('/public/tier-configs'),
          RETRY_CONFIG
        );
        return response.data;
      },
      CACHE_TTL.tierConfigs
    );
  },
  getAdmin: async () => {
    const response = await withRetry(
      () => api.get('/admin/tier-configs'),
      RETRY_CONFIG
    );
    return response.data;
  },
  create: async (data: any) => {
    apiCache.delete('tier-configs:public'); // Invalidate cache
    const response = await api.post('/admin/tier-configs', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    apiCache.delete('tier-configs:public'); // Invalidate cache
    const response = await api.put(`/admin/tier-configs/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    apiCache.delete('tier-configs:public'); // Invalidate cache
    const response = await api.delete(`/admin/tier-configs/${id}`);
    return response.data;
  },
};

// Hall of Pride API with caching
export const hallOfPrideApi = {
  getAll: async () => {
    return apiCache.getOrFetch(
      'hall-of-pride:all',
      async () => {
        const response = await withRetry(
          () => api.get('/hall-of-pride'),
          RETRY_CONFIG
        );
        return response.data;
      },
      CACHE_TTL.hallOfPride
    );
  },

  create: async (entryData: any) => {
    apiCache.delete('hall-of-pride:all'); // Invalidate cache
    const response = await api.post('/hall-of-pride', entryData);
    return response.data;
  },

  update: async (id: string, entryData: any) => {
    apiCache.delete('hall-of-pride:all'); // Invalidate cache
    const response = await api.put(`/hall-of-pride/${id}`, entryData);
    return response.data;
  },

  delete: async (id: string) => {
    apiCache.delete('hall-of-pride:all'); // Invalidate cache
    const response = await api.delete(`/hall-of-pride/${id}`);
    return response.data;
  },
};

// Admin API
export const adminApi = {
  // Dashboard
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  // Users
  getUsers: async (params?: { page?: number; limit?: number; approved?: boolean }) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  approveUser: async (id: string) => {
    const response = await api.post(`/admin/users/${id}/approve`);
    return response.data;
  },

  rejectUser: async (id: string, reason: string) => {
    const response = await api.post(`/admin/users/${id}/reject`, { reason });
    return response.data;
  },

  // Products
  createProduct: async (productData: any) => {
    const response = await api.post('/admin/products', productData);
    return response.data;
  },

  updateProduct: async (id: string, productData: any) => {
    const response = await api.put(`/admin/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id: string) => {
    const response = await api.delete(`/admin/products/${id}`);
    return response.data;
  },

  // Research
  getResearchPapers: async (params?: { page?: number; limit?: number; approved?: boolean }) => {
    const response = await api.get('/admin/research', { params });
    return response.data;
  },

  approveResearch: async (id: string) => {
    const response = await api.post(`/admin/research/${id}/approve`);
    return response.data;
  },

  rejectResearch: async (id: string, reason: string) => {
    const response = await api.post(`/admin/research/${id}/reject`, { reason });
    return response.data;
  },

  // Exports
  generateExport: async () => {
    const response = await api.get('/admin/exports/generate');
    return response.data;
  },

  // Admin Permissions
  getCurrentUserPermission: async () => {
    const response = await api.get('/admin/permissions/current');
    return response.data;
  },
};

// File Upload API
export const uploadApi = {
  uploadImage: async (file: File, folder: string = 'images') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getPresignedUrl: async (fileName: string, fileType: string, folder: string = 'images') => {
    const response = await api.post('/upload/presigned-url', {
      fileName,
      fileType,
      folder,
    });
    return response.data;
  },
};

export default api;
