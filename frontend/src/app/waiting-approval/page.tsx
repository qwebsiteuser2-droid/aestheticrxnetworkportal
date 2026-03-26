'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { getAccessToken } from '@/lib/auth';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

export default function WaitingApprovalPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, updateUser } = useAuth();
  const [checkingApproval, setCheckingApproval] = useState(false);

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
      console.log('✅ Waiting-approval - Regular user detected, redirecting to home page immediately');
      console.log('✅ Waiting-approval - User type:', userType, 'User:', user);
      router.push('/');
      return;
    }

    // If user is approved, redirect to login page to refresh session
    if (user && user.is_approved) {
      console.log('✅ Waiting-approval - User approved, redirecting to login page');
      // Clear any existing tokens to force fresh login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
      return;
    }

    // If user is not approved, check approval status periodically
    if (user && !user.is_approved && !user.is_admin) {
      setCheckingApproval(true);
      
      // Function to check approval status
      const checkApprovalStatus = async () => {
        try {
          const token = getAccessToken();
          if (!token) {
            console.log('⚠️ Waiting-approval - No token found, redirecting to login');
            router.push('/login');
            return;
          }

          // Use centralized API instance
          console.log('🔍 Waiting-approval - Checking approval status...');
          
          const response = await api.get('/auth/profile');

          if (response.data.success) {
            const data = response.data;
            console.log('📋 Waiting-approval - Profile response:', data);
            console.log('📋 Waiting-approval - is_approved:', data.data?.user?.is_approved);
            
            // Update user data in context to reflect latest status
            if (data.data?.user) {
              updateUser(data.data.user);
            }
            
            if (data.data?.user?.is_approved) {
              console.log('✅ Waiting-approval - Account approved detected, redirecting to login page');
              // Clear any existing tokens to force fresh login
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              // Use window.location for immediate redirect
              window.location.href = '/login';
              return true; // Indicate approval was detected
            }
          } else {
            console.error('⚠️ Waiting-approval - Profile check failed:', response.status, response.statusText);
            const errorData = await response.json().catch(() => ({}));
            console.error('⚠️ Waiting-approval - Error details:', errorData);
          }
        } catch (error) {
          console.error('❌ Waiting-approval - Error checking approval status:', error);
        }
        return false;
      };

      // Check immediately on mount
      checkApprovalStatus();
      
      // Then check every 3 seconds (reduced from 5 for faster detection)
      const checkApprovalInterval = setInterval(async () => {
        const approved = await checkApprovalStatus();
        if (approved) {
          clearInterval(checkApprovalInterval);
        }
      }, 3000); // Check every 3 seconds

      // Cleanup interval on unmount
      return () => clearInterval(checkApprovalInterval);
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            Account Under Review
          </h2>
        </div>

        <div className="bg-white shadow rounded-lg p-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
            </div>
            
            <p className="text-lg font-medium text-gray-900 mb-2">
              Your account is being investigated and reviewed by our team.
            </p>
            
            <p className="text-base text-gray-600 leading-relaxed">
              We will grant you access to the system after the approval process is complete.
            </p>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3 text-left">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">
                    What happens next?
                  </h3>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>Our team is carefully reviewing your account information</li>
                    <li>You will receive an email notification once your account is approved</li>
                    <li>This page will automatically update when approval is granted</li>
                    <li>You will then have full access to all system features</li>
                  </ul>
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

            <div className="mt-8">
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Home
              </button>
            </div>
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
  );
}
