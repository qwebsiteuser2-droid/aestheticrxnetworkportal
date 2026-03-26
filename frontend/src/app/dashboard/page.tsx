'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { getAccessToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [checkingApproval, setCheckingApproval] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Regular users are auto-approved, so redirect them immediately (no waiting page)
    // Check both 'regular' and 'regular_user' to handle backend variations
    const userType = user?.user_type || (user as any)?.user_type || '';
    const isRegularUser = userType === 'regular' || userType === 'regular_user';
    
    if (user && isRegularUser) {
      console.log('✅ Dashboard - Regular user detected, redirecting to home page immediately');
      console.log('✅ Dashboard - User type:', userType, 'User:', user);
      router.push('/');
      return;
    }

    // If user is not approved, show waiting message and check periodically
    // BUT: Regular users should never reach here (they're redirected above)
    // This is only for doctors and employees
    if (user && !user.is_approved && !user.is_admin && !isRegularUser) {
      setCheckingApproval(true);
      
      // Check approval status every 5 seconds
      const checkApprovalInterval = setInterval(async () => {
        try {
          const token = getAccessToken();
          if (!token) {
            clearInterval(checkApprovalInterval);
            router.push('/login');
            return;
          }

          // Use centralized API instance
          const response = await api.get('/auth/profile');

          if (response.data.success) {
            const data = response.data;
            if (data.data?.user?.is_approved) {
              clearInterval(checkApprovalInterval);
              // Account approved, redirect to login page immediately to refresh session
              console.log('✅ Dashboard - Account approved detected, redirecting to login page');
              // Clear any existing tokens to force fresh login
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              router.push('/login');
            }
          }
        } catch (error) {
          console.error('Error checking approval status:', error);
        }
      }, 5000); // Check every 5 seconds

      // Cleanup interval on unmount
      return () => clearInterval(checkApprovalInterval);
    } else if (user && user.is_approved) {
      // User is approved, redirect to login page to refresh session
      console.log('✅ Dashboard - User approved, redirecting to login page');
      // Clear any existing tokens to force fresh login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    }
  }, [user, isAuthenticated, authLoading, router]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show approval modal if user just got approved
  const ApprovalModal = () => {
    if (!showApprovalModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircleIcon className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Account Approved
              </h3>
              <div className="mt-4 text-sm text-gray-600 space-y-2">
                <p className="font-medium text-gray-900">
                  The team will review your request
                </p>
                <p>
                  You will be given access to the system after approval and investigation.
                </p>
                <p className="mt-4 text-xs text-gray-500">
                  Redirecting you to your dashboard...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Show waiting for approval message if user is not approved
  if (user && !user.is_approved && !user.is_admin) {
    // Determine user type for custom messaging
    const userType = user.user_type || 'doctor';
    const isEmployee = userType === 'employee';
    const isDoctor = userType === 'doctor' || (!isEmployee && userType !== 'regular' && userType !== 'regular_user');

    // Custom messages based on user type
    const getTitle = () => {
      if (isEmployee) {
        return 'Waiting for Approval';
      } else if (isDoctor) {
        return 'Thank You for Registering';
      }
      return 'Waiting for Admin Approval';
    };

    const getSubtitle = () => {
      if (isEmployee) {
        return 'Your registration is under review';
      } else if (isDoctor) {
        return 'Your credentials are being verified';
      }
      return 'Your account is under review';
    };

    const getMainMessage = () => {
      if (isEmployee) {
        return {
          title: 'Registration Submitted',
          description: 'Your account details have been received and are pending admin approval.'
        };
      } else if (isDoctor) {
        return {
          title: 'Professional Credentials Verification',
          description: 'Thank you for registering with our platform. We are currently verifying your professional credentials and clinic information to ensure the highest standards of service.'
        };
      }
      return {
        title: 'Registration Submitted',
        description: 'Your account details have been received'
      };
    };

    const getReviewMessage = () => {
      if (isEmployee) {
        return {
          title: 'Admin Review',
          description: 'Our team is reviewing your application'
        };
      } else if (isDoctor) {
        return {
          title: 'Verification Process',
          description: 'Our administrative team is carefully reviewing your professional credentials and clinic details'
        };
      }
      return {
        title: 'Admin Review',
        description: 'Our team is reviewing your application'
      };
    };

    const getApprovalMessage = () => {
      if (isEmployee) {
        return {
          title: 'Approval',
          description: 'You will be notified once your account is approved'
        };
      } else if (isDoctor) {
        return {
          title: 'Access Granted',
          description: 'You will receive notification and full platform access upon approval'
        };
      }
      return {
        title: 'Approval',
        description: 'You\'ll be notified once approved'
      };
    };

    const getInfoMessage = () => {
      if (isEmployee) {
        return [
          'Our admin team will review your registration',
          'You\'ll receive an email notification once approved',
          'This page will automatically refresh when approved',
          'You can then access the employee dashboard'
        ];
      } else if (isDoctor) {
        return [
          'Our verification team is reviewing your professional credentials and clinic information',
          'You will receive an email notification once your account is verified and approved',
          'This page will automatically update when approval is granted',
          'Upon approval, you will have full access to all platform features including ordering, research submissions, and more'
        ];
      }
      return [
        'Our admin team will review your registration',
        'You\'ll receive an email notification once approved',
        'This page will automatically refresh when approved',
        'You can then access all platform features'
      ];
    };

    const mainMsg = getMainMessage();
    const reviewMsg = getReviewMessage();
    const approvalMsg = getApprovalMessage();
    const infoMessages = getInfoMessage();

    return (
      <>
        <ApprovalModal />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              {getTitle()}
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              {getSubtitle()}
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{mainMsg.title}</p>
                  <p className="text-sm text-gray-500">{mainMsg.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="h-4 w-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{reviewMsg.title}</p>
                  <p className="text-sm text-gray-500">{reviewMsg.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{approvalMsg.title}</p>
                  <p className="text-sm text-gray-500">{approvalMsg.description}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    What happens next?
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {infoMessages.map((message, index) => (
                        <li key={index}>{message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {checkingApproval && (
              <div className="mt-6 text-center">
                <div className="inline-flex items-center space-x-2 text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Checking approval status...</span>
                </div>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={() => {
                  // Only allow going to home page, not other features
                  window.location.href = '/';
                }}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Home
              </button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need help? Contact us at{' '}
              <a href="mailto:asadkhanbloch4949@gmail.com" className="font-medium text-blue-600 hover:text-blue-500">
                asadkhanbloch4949@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
      </>
    );
  }

  // If user is approved or admin, they should be redirected (handled in useEffect)
  // This is a fallback loading state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}

