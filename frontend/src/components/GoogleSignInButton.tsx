'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { setAuthData } from '@/lib/auth';
import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// Dynamically import GoogleLogin to avoid SSR issues with location
const GoogleLogin = dynamic(
  () => import('@react-oauth/google').then((mod) => mod.GoogleLogin),
  { 
    ssr: false,
    loading: () => <div className="w-full h-10 bg-gray-100 rounded-lg animate-pulse" />
  }
);

interface GoogleSignInButtonProps {
  mode?: 'login' | 'signup';
  userType?: 'regular_user' | 'doctor' | 'employee';
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function GoogleSignInButton({
  mode = 'login',
  userType = 'regular_user',
  onSuccess,
  onError,
  className = '',
  disabled = false,
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Only render Google button on client side and when OAuth is configured
  useEffect(() => {
    setIsMounted(true);
    
    // Check if Google OAuth is configured by checking for client ID
    const checkGoogleReady = async () => {
      try {
        const response = await authApi.getGoogleClientId();
        if (response.success && response.data?.clientId) {
          // Give GoogleOAuthProvider time to initialize
          setTimeout(() => setIsGoogleReady(true), 500);
        }
      } catch {
        // Google OAuth not configured
        setIsGoogleReady(false);
      }
    };
    
    checkGoogleReady();
  }, []);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      const errorMsg = 'No credential received from Google';
      console.error(errorMsg);
      onError?.(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔑 Google Sign-In - Sending credential to backend...');
      
      const response = await authApi.googleAuth(credentialResponse.credential, userType);

      if (response.success && response.data) {
        const { user, accessToken, refreshToken, isNewUser } = response.data;

        // Set auth data in cookies/localStorage (wrap in AuthResponse format)
        setAuthData({
          success: true,
          data: { accessToken, refreshToken, user }
        });
        
        // Update auth context
        login(user);

        // Show success message
        const message = isNewUser 
          ? 'Account created successfully! Welcome!' 
          : 'Signed in with Google successfully!';
        toast.success(message);

        // Set fromLogin flag to allow auto-login (skip OTP for Google users)
        sessionStorage.setItem('fromLogin', 'true');
        sessionStorage.setItem('google_auth', 'true');

        // Call onSuccess callback
        onSuccess?.();

        // Redirect based on user type and approval status
        const userType = user.user_type || '';
        const isRegularUser = userType === 'regular' || userType === 'regular_user';
        
        if (user.is_admin) {
          router.push('/admin');
        } else if (user.is_approved || isRegularUser) {
          router.push('/');
        } else {
          // New doctor/employee users who need approval
          router.push('/waiting-approval');
        }
      } else {
        const errorMsg = response.message || 'Google Sign-In failed';
        console.error('❌ Google Sign-In failed:', errorMsg);
        onError?.(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Google Sign-In failed';
      onError?.(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    const errorMsg = 'Google Sign-In was cancelled or failed';
    console.error(errorMsg);
    onError?.(errorMsg);
    toast.error(errorMsg);
  };

  // Don't render during SSR or when Google OAuth is not ready
  if (!isMounted || !isGoogleReady) {
    return (
      <div className={`w-full ${className}`}>
        <div className="w-full h-10 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg z-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {/* Wrap in try-catch at runtime to prevent crashes if provider not ready */}
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          useOneTap={false}
          theme="outline"
          size="large"
          width="100%"
          text={mode === 'signup' ? 'signup_with' : 'signin_with'}
          shape="rectangular"
          logo_alignment="left"
        />
      </div>
      
      {isLoading && (
        <p className="text-sm text-gray-500 text-center mt-2">
          {mode === 'signup' ? 'Creating your account...' : 'Signing you in...'}
        </p>
      )}
    </div>
  );
}

