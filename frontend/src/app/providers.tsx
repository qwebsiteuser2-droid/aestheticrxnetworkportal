'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { User } from '@/types';
import { getCurrentUser, clearAuthData, getAccessToken, isTokenExpired } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { ConnectionStatusBanner } from '@/components/ConnectionStatus';

// Dynamically import GoogleOAuthProvider to avoid SSR issues
const GoogleOAuthProvider = dynamic(
  () => import('@react-oauth/google').then((mod) => mod.GoogleOAuthProvider),
  { ssr: false }
);

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading?: boolean;
  authLoading?: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize authentication state immediately on mount (client-side only)
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    const initializeAuth = async () => {
      try {
        const token = getAccessToken();
        const userData = getCurrentUser();
        
        if (token && userData && !isTokenExpired()) {
          // CRITICAL: Check if account is deactivated
          if (userData.is_deactivated) {
            clearAuthData();
            setUser(null);
            setIsAuthenticated(false);
            // Redirect to login if we're on a protected page
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            return;
          }
          
          // CRITICAL: If user came from a fresh login (sessionStorage flag), allow auto-login
          // Otherwise, if OTP is required "Every Time", we should force re-login
          const fromLogin = sessionStorage.getItem('fromLogin');
          if (!fromLogin) {
            // Not from a fresh login - check if we should force re-login for OTP
            // This prevents auto-login when OTP is required "Every Time"
            // We'll let the token refresh mechanism handle this check
            console.log('🔐 Auth Init - No fromLogin flag, allowing auto-login (token refresh will check OTP)');
          }
          
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          if (token && isTokenExpired()) {
            clearAuthData();
          }
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Initialize immediately, no delay needed
    initializeAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    clearAuthData();
    window.location.href = '/login';
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    loading: isLoading,
    authLoading: isLoading,
    login,
    logout,
    updateUser,
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Google OAuth Provider wrapper - only runs on client side
function GoogleAuthWrapper({ children }: { children: ReactNode }) {
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Only run on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only fetch Google client ID on client side
    if (!isMounted) return;

    const fetchGoogleClientId = async () => {
      try {
        const response = await authApi.getGoogleClientId();
        if (response.success && response.data?.clientId) {
          setGoogleClientId(response.data.clientId);
        }
      } catch (error) {
        console.log('Google Sign-In not configured');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoogleClientId();
  }, [isMounted]);

  // During SSR or before mount, render children without GoogleOAuthProvider
  if (!isMounted || isLoading || !googleClientId) {
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {children}
    </GoogleOAuthProvider>
  );
}

export function Providers({ children }: AuthProviderProps) {
  return (
    <GoogleAuthWrapper>
      <AuthProvider>
        <ConnectionStatusBanner />
        {children}
      </AuthProvider>
    </GoogleAuthWrapper>
  );
}
