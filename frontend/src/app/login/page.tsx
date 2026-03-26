'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { setAuthData } from '@/lib/auth';
import { useAuth } from '@/app/providers';
import { toast } from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import OTPModal from '@/components/OTPModal';
import DeactivatedAccountModal from '@/components/modals/DeactivatedAccountModal';
import GoogleSignInButton from '@/components/GoogleSignInButton';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string>('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showDeactivatedModal, setShowDeactivatedModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [otpData, setOtpData] = useState<{
    userId: string;
    userRole: string;
    userEmail: string;
    password: string;
  } | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  // Clear any existing toast notifications when the page loads
  useEffect(() => {
    toast.dismiss();
    setIsMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const getLoginMessage = (userType: string, isAdmin: boolean): string => {
    if (isAdmin) {
      return 'Logging in as Admin...';
    }
    switch (userType) {
      case 'doctor':
        return 'Logging in as Doctor...';
      case 'regular_user':
        return 'Logging in as User...';
      case 'employee':
        return 'Logging in as Employee...';
      default:
        return 'Logging in...';
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setLoginMessage('Authenticating...');
    
    try {
      console.log('🔑 Login - Attempting login for:', data.email);
      const response = await authApi.login(data);
      
      if (response.success && response.data) {
        const user = response.data.user;
        const message = getLoginMessage(user.user_type || '', user.is_admin || false);
        setLoginMessage(message);
        
        // Small delay to show the message
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('🔑 Login - Login successful, setting auth data');
        setAuthData(response);
        login(user);
        toast.success('Login successful!');
        reset();
        
        // Set flag to indicate user came from login
        sessionStorage.setItem('fromLogin', 'true');

        // Check if user is approved - redirect unapproved users to waiting-approval page
        // Regular users are auto-approved, so they go directly to their dashboard
        const userType = user.user_type || (user as any).user_type || '';
        const isRegularUser = userType === 'regular' || userType === 'regular_user';
        
        if (isRegularUser) {
          console.log('🔑 Login - Regular user detected, redirecting to home page');
          router.push('/');
        } else if (!user.is_approved && !user.is_admin) {
          console.log('🔑 Login - User not approved, redirecting to waiting-approval page');
          router.push('/waiting-approval');
        } else {
          console.log('🔑 Login - User approved, redirecting to home page');
          router.push('/');
        }
      } else if (response.data?.otpRequired) {
        // OTP verification required
        console.log('🔑 Login - OTP verification required');
        setOtpData({
          userId: response.data.userId,
          userRole: response.data.userRole,
          userEmail: data.email,
          password: data.password
        });
        setShowOTPModal(true);
        toast.success(response.data.message || 'OTP verification required');
      } else {
        console.log('🔑 Login - Login failed:', response.message);
        toast.error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('🔑 Login - Login error:', error);
      console.error('🔑 Login - Error response:', error.response);
      console.error('🔑 Login - Error status:', error.response?.status);
      console.error('🔑 Login - Error data:', error.response?.data);
      console.error('🔑 Login - Error message:', error.message);
      
      // Check for userNotFound in multiple ways
      const userNotFoundFlag = error.response?.data?.userNotFound === true;
      const is404Status = error.response?.status === 404;
      const is401Status = error.response?.status === 401;
      const isLoginEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url === '/auth/login';
      const isUserNotFound = userNotFoundFlag || (is404Status && isLoginEndpoint);
      // Also redirect on 401 (wrong password) - redirect all failed logins to signup
      const shouldRedirect = isUserNotFound || (is401Status && isLoginEndpoint);
      
      console.log('🔑 Login - userNotFoundFlag:', userNotFoundFlag);
      console.log('🔑 Login - is404Status:', is404Status);
      console.log('🔑 Login - is401Status:', is401Status);
      console.log('🔑 Login - isLoginEndpoint:', isLoginEndpoint);
      console.log('🔑 Login - Is user not found?', isUserNotFound);
      console.log('🔑 Login - Should redirect?', shouldRedirect);
      
      if (shouldRedirect) {
        // Failed login (user not found OR wrong password) - redirect to signup
        console.log('🔑 Login - Login failed, redirecting to signup...');
        // Dismiss any existing toasts first
        toast.dismiss();
        // Show message based on error type
        const message = isUserNotFound 
          ? 'Account not found. Redirecting to signup...'
          : 'Login failed. Redirecting to signup...';
        toast.success(message, { 
          duration: 2000,
          id: 'login-failed-redirect' // Unique ID to prevent duplicates
        });
        // Short delay to show the message before redirecting
        setTimeout(() => {
          console.log('🔑 Login - Executing redirect to /signup');
          window.location.href = '/signup';
        }, 2000);
        return; // Important: return early to prevent any other error handling
      } else {
        // Check if account is deactivated
        const errorMessage = error.response?.data?.message || '';
        const isDeactivated = error.response?.status === 403 && errorMessage.includes('deactivated');
        
        if (isDeactivated) {
          // Show deactivated account modal instead of toast
          toast.dismiss(); // Dismiss any existing toasts
          setShowDeactivatedModal(true);
        } else {
          // Other errors (network, server errors, etc.)
          toast.error(errorMessage || 'Login failed. Please try again.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerify = async (otpCode: string) => {
    if (!otpData) return;
    
    setIsLoading(true);
    setLoginMessage('Verifying OTP...');
    
    try {
      // Resubmit login with OTP code
      const formData = {
        email: otpData.userEmail,
        password: otpData.password,
        otpCode: otpCode
      };
      
      const response = await authApi.login(formData);
      
      if (response.success && response.data) {
        const user = response.data.user;
        const message = getLoginMessage(user.user_type || '', user.is_admin || false);
        setLoginMessage(message);
        
        // Small delay to show the message
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setAuthData(response);
        login(user);
        toast.success('Login successful!');
        setShowOTPModal(false);
        setOtpData(null);
        
        // Set flags to indicate user came from login with OTP verified
        sessionStorage.setItem('fromLogin', 'true');
        sessionStorage.setItem('login_otp_verified', 'true');
        
        // Check if user is approved - redirect unapproved users to waiting-approval page
        // Regular users are auto-approved, so they won't see this page
        if (!user.is_approved && !user.is_admin && user.user_type !== 'regular' && user.user_type !== 'regular_user') {
          router.push('/waiting-approval');
        } else {
          router.push('/');
        }
      } else {
        toast.error(response.message || 'Invalid OTP');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
      setLoginMessage('');
    }
  };

  const handleResendOTP = async () => {
    if (!otpData) return;
    
    try {
      // Use the resend endpoint with login purpose
      await authApi.resendOTP(otpData.userEmail, 'login');
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      throw error;
    }
  };

  const handleCloseOTPModal = () => {
    setShowOTPModal(false);
    setOtpData(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="flex justify-center">
          <img src="/logo.png" alt="AestheticRxNetwork" className="w-16 h-16 sm:w-20 sm:h-20 object-contain shadow-lg rounded-xl" />
        </div>
        <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 px-4">
          Or{' '}
          <a href="/signup" className="font-medium text-blue-600 hover:text-blue-500 underline">
            create a new account
          </a>
        </p>
        <p className="mt-2 text-center text-sm">
          <a href="/password-reset" className="font-medium text-blue-600 hover:text-blue-500 underline">
            Forgot your password?
          </a>
        </p>
      </div>

      <div className="mt-6 sm:mt-8 mx-auto w-full max-w-md">
        <div className="bg-white py-6 px-4 sm:py-8 sm:px-6 lg:px-10 shadow-lg sm:rounded-lg">
          <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="mt-1">
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="appearance-none block w-full px-4 py-3 text-base sm:text-sm border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="appearance-none block w-full px-4 py-3 pr-12 text-base sm:text-sm border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center touch-manipulation"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-6 w-6 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeIcon className="h-6 w-6 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation min-h-[44px]"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="text-sm sm:text-base">{loginMessage || 'Signing in...'}</span>
                  </div>
                ) : (
                  <span className="text-base sm:text-sm">Sign in</span>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <div className="mt-4">
              <GoogleSignInButton 
                mode="login" 
                disabled={isLoading}
              />
            </div>
          </form>
        </div>
      </div>

      {/* OTP Modal */}
      {otpData && (
        <OTPModal
          isOpen={showOTPModal}
          onClose={handleCloseOTPModal}
          onVerify={handleOTPVerify}
          userId={otpData.userId}
          userRole={otpData.userRole}
          userEmail={otpData.userEmail}
          onResendOTP={handleResendOTP}
        />
      )}

      {/* Deactivated Account Modal */}
      <DeactivatedAccountModal
        isOpen={showDeactivatedModal}
        onClose={() => setShowDeactivatedModal(false)}
      />
    </div>
  );
}
