'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const requestResetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const confirmResetSchema = z.object({
  otpCode: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RequestResetFormData = z.infer<typeof requestResetSchema>;
type ConfirmResetFormData = z.infer<typeof confirmResetSchema>;

export default function PasswordResetPage() {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    formState: { errors: errorsRequest },
  } = useForm<RequestResetFormData>({
    resolver: zodResolver(requestResetSchema),
  });

  const {
    register: registerConfirm,
    handleSubmit: handleSubmitConfirm,
    formState: { errors: errorsConfirm },
  } = useForm<ConfirmResetFormData>({
    resolver: zodResolver(confirmResetSchema),
  });

  const onRequestSubmit = async (data: RequestResetFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.requestPasswordReset(data.email);
      
      if (response.success) {
        setEmail(data.email);
        setStep('confirm');
        toast.success('OTP sent to your email!');
      } else if (response.redirectToSignup) {
        toast.error('No account found with this email.');
        setTimeout(() => {
          router.push('/signup');
        }, 2000);
      } else {
        toast.error(response.message || 'Failed to send reset email');
      }
    } catch (error: any) {
      console.error('Password reset request error:', error);
      toast.error(error.response?.data?.message || 'Failed to request password reset');
    } finally {
      setIsLoading(false);
    }
  };

  const onConfirmSubmit = async (data: ConfirmResetFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.confirmPasswordReset(email, data.otpCode, data.newPassword);
      
      if (response.success) {
        toast.success('Password reset successful! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        toast.error(response.message || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('Password reset confirm error:', error);
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="flex justify-center">
          <img src="/logo.png" alt="AestheticRxNetwork" className="w-16 h-16 sm:w-20 sm:h-20 object-contain shadow-lg rounded-xl" />
        </div>
        <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
          {step === 'request' ? 'Reset your password' : 'Enter OTP and new password'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 px-4">
          {step === 'request' 
            ? 'Enter your email address and we\'ll send you an OTP to reset your password.'
            : `OTP has been sent to ${email}. Please check your email.`
          }
        </p>
      </div>

      <div className="mt-6 sm:mt-8 mx-auto w-full max-w-md">
        <div className="bg-white py-6 px-4 sm:py-8 sm:px-6 lg:px-10 shadow-lg sm:rounded-lg">
          {step === 'request' ? (
            <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmitRequest(onRequestSubmit)}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    {...registerRequest('email')}
                    type="email"
                    autoComplete="email"
                    className="appearance-none block w-full px-4 py-3 text-base sm:text-sm border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter your email"
                    disabled={isLoading}
                  />
                  {errorsRequest.email && (
                    <p className="mt-1.5 text-sm text-red-600">{errorsRequest.email.message}</p>
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
                      <span className="text-sm sm:text-base">Sending OTP...</span>
                    </div>
                  ) : (
                    <span className="text-base sm:text-sm">Send OTP</span>
                  )}
                </button>
              </div>

              <div className="text-center">
                <a href="/login" className="text-sm text-blue-600 hover:text-blue-500 underline">
                  Back to login
                </a>
              </div>
            </form>
          ) : (
            <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmitConfirm(onConfirmSubmit)}>
              <div>
                <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 mb-1.5">
                  OTP Code
                </label>
                <div className="mt-1">
                  <input
                    {...registerConfirm('otpCode')}
                    type="text"
                    maxLength={6}
                    className="appearance-none block w-full px-4 py-3 text-base sm:text-sm border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center text-2xl tracking-widest"
                    placeholder="000000"
                    disabled={isLoading}
                  />
                  {errorsConfirm.otpCode && (
                    <p className="mt-1.5 text-sm text-red-600">{errorsConfirm.otpCode.message}</p>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">Check your email for the 6-digit code</p>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="mt-1 relative">
                  <input
                    {...registerConfirm('newPassword')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="appearance-none block w-full px-4 py-3 pr-12 text-base sm:text-sm border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter new password"
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
                  {errorsConfirm.newPassword && (
                    <p className="mt-1.5 text-sm text-red-600">{errorsConfirm.newPassword.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="mt-1 relative">
                  <input
                    {...registerConfirm('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="appearance-none block w-full px-4 py-3 pr-12 text-base sm:text-sm border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Confirm new password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center touch-manipulation"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-6 w-6 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="h-6 w-6 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                  {errorsConfirm.confirmPassword && (
                    <p className="mt-1.5 text-sm text-red-600">{errorsConfirm.confirmPassword.message}</p>
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
                      <span className="text-sm sm:text-base">Resetting password...</span>
                    </div>
                  ) : (
                    <span className="text-base sm:text-sm">Reset Password</span>
                  )}
                </button>
              </div>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-sm text-blue-600 hover:text-blue-500 underline"
                  disabled={isLoading}
                >
                  Resend OTP
                </button>
                <div>
                  <a href="/login" className="text-sm text-blue-600 hover:text-blue-500 underline">
                    Back to login
                  </a>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

