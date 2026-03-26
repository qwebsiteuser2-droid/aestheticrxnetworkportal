'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { authApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  clinic_name: z.string().min(2, 'Clinic name must be at least 2 characters'),
  doctor_name: z.string().min(2, 'Doctor name must be at least 2 characters'),
  signup_id: z.string().min(1, 'Signup ID is required'),
  whatsapp: z.string().optional(),
  consent: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      const response = await authApi.register(registerData);
      
      if (response.success) {
        toast.success('Registration successful! Please wait for admin approval.');
        reset();
        onClose();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
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
                Email Address *
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
                Password *
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="form-input pr-10"
                  placeholder="Create a strong password"
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  className="form-input pr-10"
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="form-error">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Clinic Name */}
            <div>
              <label htmlFor="clinic_name" className="form-label">
                Clinic Name *
              </label>
              <input
                {...register('clinic_name')}
                type="text"
                id="clinic_name"
                className="form-input"
                placeholder="Enter your clinic name"
                disabled={isLoading}
              />
              {errors.clinic_name && (
                <p className="form-error">{errors.clinic_name.message}</p>
              )}
            </div>

            {/* Doctor Name */}
            <div>
              <label htmlFor="doctor_name" className="form-label">
                Doctor Name *
              </label>
              <input
                {...register('doctor_name')}
                type="text"
                id="doctor_name"
                className="form-input"
                placeholder="Enter your full name"
                disabled={isLoading}
              />
              {errors.doctor_name && (
                <p className="form-error">{errors.doctor_name.message}</p>
              )}
            </div>

            {/* Signup ID */}
            <div>
              <label htmlFor="signup_id" className="form-label">
                Signup ID *
              </label>
              <input
                {...register('signup_id')}
                type="text"
                id="signup_id"
                className="form-input"
                placeholder="Enter your signup ID"
                disabled={isLoading}
              />
              <p className="form-help">
                This ID was provided during your initial contact with our team.
              </p>
              {errors.signup_id && (
                <p className="form-error">{errors.signup_id.message}</p>
              )}
            </div>

            {/* WhatsApp */}
            <div>
              <label htmlFor="whatsapp" className="form-label">
                WhatsApp Number (Optional)
              </label>
              <input
                {...register('whatsapp')}
                type="tel"
                id="whatsapp"
                className="form-input"
                placeholder="+1234567890"
                disabled={isLoading}
              />
              {errors.whatsapp && (
                <p className="form-error">{errors.whatsapp.message}</p>
              )}
            </div>

            {/* Consent */}
            <div>
              <label className="flex items-start space-x-3">
                <input
                  {...register('consent')}
                  type="checkbox"
                  className="form-checkbox mt-1"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="/terms" className="text-primary-600 hover:text-primary-700">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-primary-600 hover:text-primary-700">
                    Privacy Policy
                  </a>
                  . I consent to the processing of my personal data for platform access and communication purposes.
                </span>
              </label>
              {errors.consent && (
                <p className="form-error">{errors.consent.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner w-4 h-4 mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign in here
              </button>
            </p>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Registration Process</h3>
            <div className="text-xs text-blue-800 space-y-1">
              <p>1. Fill out the registration form above</p>
              <p>2. Wait for admin approval (usually within 24 hours)</p>
              <p>3. Receive email notification when approved</p>
              <p>4. Sign in and start using the platform</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
