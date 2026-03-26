'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { authApi } from '@/lib/api';
import { setAuthData } from '@/lib/auth';
import { useAuth } from '@/app/providers';
import { toast } from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string>('');
  const { login } = useAuth();

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
      const response = await authApi.login(data);
      
      if (response.success && response.data) {
        const user = response.data.user;
        const message = getLoginMessage(user.user_type || '', user.is_admin || false);
        setLoginMessage(message);
        
        // Small delay to show the message
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setAuthData(response);
        login(user);
        toast.success('Login successful!');
        reset();
        onClose();
        
        // Set flag to indicate user came from login
        sessionStorage.setItem('fromLogin', 'true');
        
        // Check if user is approved - redirect unapproved users to waiting-approval page
        // Regular users are auto-approved, so they won't see this page
        if (!user.is_approved && !user.is_admin && user.user_type !== 'regular' && user.user_type !== 'regular_user') {
          window.location.href = '/waiting-approval';
        } else {
          window.location.href = '/';
        }
      }
    } catch (error: any) {
      console.error('🔑 LoginModal - Login error:', error);
      console.error('🔑 LoginModal - Error response:', error.response);
      console.error('🔑 LoginModal - Error status:', error.response?.status);
      console.error('🔑 LoginModal - Error data:', error.response?.data);
      
      const userNotFoundFlag = error.response?.data?.userNotFound === true;
      const is404Status = error.response?.status === 404;
      const is401Status = error.response?.status === 401;
      const isLoginEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url === '/auth/login';
      const isUserNotFound = userNotFoundFlag || (is404Status && isLoginEndpoint);
      // Also redirect on 401 (wrong password) - redirect all failed logins to signup
      const shouldRedirect = isUserNotFound || (is401Status && isLoginEndpoint);
      
      console.log('🔑 LoginModal - Is user not found?', isUserNotFound);
      console.log('🔑 LoginModal - Should redirect?', shouldRedirect);
      
      if (shouldRedirect) {
        // Failed login (user not found OR wrong password) - redirect to signup
        console.log('🔑 LoginModal - Login failed, redirecting to signup...');
        // Dismiss any existing toasts
        toast.dismiss();
        const message = isUserNotFound 
          ? 'Account not found. Redirecting to signup...'
          : 'Login failed. Redirecting to signup...';
        toast.success(message, { 
          duration: 2000,
          id: 'login-failed-redirect-modal' // Unique ID to prevent duplicates
        });
        // Close the modal first
        onClose();
        // Short delay to show the message before redirecting
        setTimeout(() => {
          console.log('🔑 LoginModal - Executing redirect to /signup');
          window.location.href = '/signup';
        }, 2000);
        return; // Important: return early
      } else {
        // Other errors (network, server errors, etc.)
        const errorMessage = error.response?.data?.message || 'Login failed';
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
      setLoginMessage('');
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                className="form-input"
                placeholder="Enter your email"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="form-input pr-10"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{loginMessage || 'Signing in...'}</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign up here
              </button>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Demo Credentials</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Admin:</strong> admin@qwebsite.com / ChangeMe123!</p>
              <p><strong>Doctor:</strong> doctor@clinic.com / ChangeMe123!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
