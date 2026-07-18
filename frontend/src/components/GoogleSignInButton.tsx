'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { setAuthData } from '@/lib/auth';
import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getPostLoginRedirect } from '@/lib/authRedirect';

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
  /** Required for doctor Google signup */
  signupId?: string;
  clinicName?: string;
  consent?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  /** Path or path+query to open after login (e.g. /order?productId=…) */
  redirectAfterLogin?: string | null;
}

export default function GoogleSignInButton({
  mode = 'login',
  userType = 'regular_user',
  signupId,
  clinicName,
  consent = true,
  onSuccess,
  onError,
  className = '',
  disabled = false,
  redirectAfterLogin = null,
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

  const doctorSignupBlocked =
    mode === 'signup' && userType === 'doctor' && !(signupId && signupId.trim());

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      const errorMsg = 'No credential received from Google';
      console.error(errorMsg);
      onError?.(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (mode === 'signup' && userType === 'doctor' && !(signupId && signupId.trim())) {
      const errorMsg = 'Please enter your signup ID before continuing with Google';
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (mode === 'signup' && !consent) {
      const errorMsg = 'Please accept the privacy policy and terms to continue';
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔑 Google Auth - Sending credential to backend...', { mode, userType });
      
      const response = await authApi.googleAuth(credentialResponse.credential, {
        mode,
        userType,
        signup_id: signupId?.trim() || undefined,
        clinic_name: clinicName?.trim() || undefined,
        consent,
      });

      // Backend returns redirectToSignup when no account exists (login mode)
      if (!response.success && response.redirectToSignup) {
        toast.error('No account found for this Google email. Please sign up first.');
        onError?.('No account found. Please sign up.');
        setTimeout(() => router.push('/signup/select-type'), 1500);
        return;
      }

      if (response.success && response.data) {
        const { user, accessToken, refreshToken, isNewUser } = response.data;

        setAuthData({
          success: true,
          message: isNewUser ? 'Account created via Google' : 'Login successful via Google',
          data: { accessToken, refreshToken, user }
        });
        
        login(user);

        if (isNewUser) {
          toast.success(
            user.is_approved
              ? 'Account created with Google!'
              : 'Registration successful! Please wait for admin approval.'
          );
        } else {
          toast.success('Signed in with Google successfully!');
        }

        sessionStorage.setItem('fromLogin', 'true');
        sessionStorage.setItem('google_auth', 'true');

        onSuccess?.();

        router.push(getPostLoginRedirect(user, redirectAfterLogin));
      } else {
        const errorMsg = response.message || 'Google Sign-In failed';
        console.error('❌ Google Auth failed:', errorMsg);
        onError?.(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Google Auth error:', error);

      const data = error.response?.data;
      if (data?.redirectToSignup) {
        toast.error('No account found for this Google email. Please sign up first.');
        onError?.('No account found. Please sign up.');
        setTimeout(() => router.push('/signup/select-type'), 1500);
        return;
      }

      const errorMsg = data?.message || error.message || 'Google Sign-In failed';
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
      {doctorSignupBlocked && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-2">
          Enter your Doctor Sign-up ID above, then continue with Google.
        </p>
      )}

      <div className={`relative ${disabled || doctorSignupBlocked ? 'opacity-50 pointer-events-none' : ''}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg z-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
        
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
