'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import api from '@/lib/api';
import GoogleSignInButton from '@/components/GoogleSignInButton';

type UserType = 'doctor' | 'regular_user' | 'employee';

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  clinic_name: string;
  doctor_name: string;
  signup_id: string;
  whatsapp: string;
  address: string;
  consent: boolean;
  user_type: UserType;
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userTypeParam = searchParams.get('type') as UserType;
  
  const [userType, setUserType] = useState<UserType>(userTypeParam || 'doctor');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    clinic_name: '',
    doctor_name: '',
    signup_id: '',
    whatsapp: '',
    address: '',
    consent: false,
    user_type: userTypeParam || 'doctor'
  });

  useEffect(() => {
    // Redirect to type selection if no type is provided
    if (!userTypeParam || !['doctor', 'regular_user', 'employee'].includes(userTypeParam)) {
      router.push('/signup/select-type');
      return;
    }
    setUserType(userTypeParam);
    setFormData(prev => ({ ...prev, user_type: userTypeParam }));
  }, [userTypeParam, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!formData.consent) {
      toast.error('Please accept the privacy policy and terms');
      return;
    }

    // Validate based on user type
    if (userType === 'doctor') {
      if (!formData.clinic_name || !formData.signup_id) {
        toast.error('Clinic name and signup ID are required for doctor registration');
        return;
      }
      if (!formData.address) {
        toast.error('Clinic address is required for doctor registration');
        return;
      }
    }

    if (!formData.doctor_name) {
      toast.error('Name is required');
      return;
    }

    setLoading(true);

    try {
      const requestBody: any = {
        email: formData.email,
        password: formData.password,
        doctor_name: formData.doctor_name,
        consent: formData.consent,
        user_type: userType
      };

      // Add optional fields
      if (formData.clinic_name) requestBody.clinic_name = formData.clinic_name;
      if (formData.signup_id) requestBody.signup_id = formData.signup_id;
      if (formData.whatsapp) requestBody.whatsapp = formData.whatsapp;
      if (formData.address) {
        requestBody.google_location = {
          lat: 0, // Will be geocoded later or user can update in profile
          lng: 0,
          address: formData.address.trim()
        };
      }

      const response = await api.post('/auth/register', requestBody);
      const data = response.data;

      if (data.success) {
        // Check user type from response (backend may return 'regular' instead of 'regular_user')
        const responseUserType = data.data?.user?.user_type || userType;
        const isRegularUser = responseUserType === 'regular_user' || responseUserType === 'regular';
        
        if (data.data?.accessToken) {
          // Auto-approved user (only regular users are auto-approved)
          toast.success(data.message || 'Registration successful!');
          // Store tokens and redirect
          localStorage.setItem('accessToken', data.data.accessToken);
          if (data.data.refreshToken) {
            localStorage.setItem('refreshToken', data.data.refreshToken);
          }
          
          // Regular users go directly to home page (no dashboard)
          if (isRegularUser) {
            console.log('✅ Registration - Regular user auto-approved, redirecting to home page');
            router.push('/');
            return;
          } else {
            // Doctors and employees are not auto-approved, redirect to waiting-approval page
            console.log('⏳ Registration - Doctor/Employee needs approval, redirecting to waiting-approval');
            router.push('/waiting-approval');
            return;
          }
        } else {
          // This should only happen for doctors/employees (regular users always get tokens)
          if (isRegularUser) {
            // Regular user should always have tokens, but if somehow they don't, still redirect to home page
            console.log('⚠️ Registration - Regular user but no tokens, redirecting to home page anyway');
            router.push('/');
          } else {
            // Doctor or Employee needs approval - redirect to waiting-approval page
            toast.success('Registration successful! Please wait for admin approval.');
            router.push('/waiting-approval');
          }
        }
      } else {
        // Registration failed - show error and stay on signup page
        const errorMessage = data.message || 'Registration failed. Please try again.';
        console.error('❌ Registration failed:', errorMessage);
        console.error('❌ Response data:', data);
        toast.error(errorMessage);
        
        if (errorMessage.includes('Email already registered')) {
          setTimeout(() => {
            toast('Try logging in instead', {
              icon: 'ℹ️',
              duration: 5000,
            });
          }, 2000);
        } else if (errorMessage.includes('Invalid or already used signup ID')) {
          setTimeout(() => {
            toast('Please use a different signup ID', {
              icon: '⚠️',
              duration: 5000,
            });
          }, 2000);
        } else if (errorMessage.includes('Password does not meet requirements')) {
          setTimeout(() => {
            toast('Please check password requirements', {
              icon: '⚠️',
              duration: 5000,
            });
          }, 2000);
        } else if (errorMessage.includes('Missing required fields')) {
          setTimeout(() => {
            toast('Please fill in all required fields', {
              icon: '⚠️',
              duration: 5000,
            });
          }, 2000);
        }
      }
    } catch (error: any) {
      // Network error or other unexpected errors
      console.error('❌ Registration network error:', error);
      // Axios errors have error.response.data for API errors
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed. Please check your connection and try again.';
      toast.error(errorMessage);
      
      // If it's a network error, suggest checking connection
      if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
        setTimeout(() => {
          toast('Please check your internet connection', {
            icon: '🌐',
            duration: 5000,
          });
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (userType) {
      case 'doctor': return 'Doctor Registration';
      case 'regular_user': return 'User Registration';
      case 'employee': return 'Employee Registration';
      default: return 'Registration';
    }
  };

  const getDescription = () => {
    switch (userType) {
      case 'doctor': return 'Join our exclusive platform for medical professionals';
      case 'regular_user': return 'Create an account to order products';
      case 'employee': return 'Register as a delivery employee';
      default: return '';
    }
  };

  if (!userTypeParam || !['doctor', 'regular_user', 'employee'].includes(userTypeParam)) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-20 w-20 flex items-center justify-center">
            <img src="/logo.png" alt="AestheticRxNetwork" className="h-20 w-20 object-contain shadow-lg rounded-xl" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {getTitle()}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getDescription()}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            {/* Signup ID - Only for doctors */}
            {userType === 'doctor' && (
              <div>
                <label htmlFor="signup_id" className="block text-sm font-medium text-gray-700">
                  Signup ID *
                </label>
                <input
                  id="signup_id"
                  name="signup_id"
                  type="text"
                  required
                  value={formData.signup_id}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your special signup ID"
                />
                <p className="mt-1 text-xs text-gray-500">
                  You should have received this ID during our marketing campaign
                </p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label htmlFor="doctor_name" className="block text-sm font-medium text-gray-700">
                {userType === 'employee' ? 'Full Name *' : userType === 'regular_user' ? 'Name *' : 'Doctor Name *'}
              </label>
              <input
                id="doctor_name"
                name="doctor_name"
                type="text"
                required
                value={formData.doctor_name}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={userType === 'employee' ? 'John Doe' : userType === 'regular_user' ? 'Your Name' : 'Dr. John Smith'}
              />
            </div>

            {/* Clinic Name - Only for doctors and optional for regular users */}
            {(userType === 'doctor' || userType === 'regular_user') && (
              <div>
                <label htmlFor="clinic_name" className="block text-sm font-medium text-gray-700">
                  {userType === 'doctor' ? 'Clinic Name *' : 'Organization/Company Name (Optional)'}
                </label>
                <input
                  id="clinic_name"
                  name="clinic_name"
                  type="text"
                  {...(userType === 'doctor' ? { required: true } : {})}
                  value={formData.clinic_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={userType === 'doctor' ? 'ABC Medical Center' : 'Your Company (Optional)'}
                />
              </div>
            )}

            {/* WhatsApp - Optional for all */}
            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
                WhatsApp Number {userType === 'doctor' ? '*' : '(Optional)'}
              </label>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                {...(userType === 'doctor' ? { required: true } : {})}
                value={formData.whatsapp}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="+92 300 1234567"
              />
            </div>

            {/* Location/Address - Helps find nearby doctors */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Your Location/Address {userType === 'doctor' ? '*' : '(Optional)'}
              </label>
              <input
                id="address"
                name="address"
                type="text"
                {...(userType === 'doctor' ? { required: true } : {})}
                value={formData.address}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={userType === 'doctor' ? 'Clinic address (e.g., 123 Main St, City)' : 'Your city or area (helps find nearby doctors)'}
              />
              <p className="mt-1 text-xs text-gray-500">
                {userType === 'doctor' 
                  ? 'Enter your clinic address for patients to find you' 
                  : 'Enter your location to discover doctors near you'}
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Create a strong password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <div className="flex items-start">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              checked={formData.consent}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
              required
            />
            <label htmlFor="consent" className="ml-2 block text-sm text-gray-900">
              I consent to the collection and processing of my personal data, including email communications, data usage, cookies, and organization access, and I agree to the{' '}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500 underline">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500 underline">
                Terms of Service
              </a>
              . (Required for GDPR compliance)
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registering...' : `Register as ${userType === 'doctor' ? 'Doctor' : userType === 'regular_user' ? 'User' : 'Employee'}`}
            </button>
          </div>

          {/* Google Sign-In - Only for regular users (doctors need signup ID verification) */}
          {userType === 'regular_user' && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">Or sign up with</span>
                </div>
              </div>

              <GoogleSignInButton 
                mode="signup" 
                userType="regular_user"
                disabled={loading}
              />
            </>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in here
              </Link>
            </p>
            {userType === 'doctor' && (
              <p className="text-xs text-gray-500 mt-2">
                If you've already registered, you may be waiting for admin approval. Check your email for updates.
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              <Link href="/signup/select-type" className="text-blue-600 hover:text-blue-500">
                Change account type
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}