'use client';

import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { clearAuthData } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('🛡️ AuthGuard - Checking authentication:', {
      isLoading,
      isAuthenticated,
      user: user?.email,
      isAdmin: user?.is_admin,
      requireAdmin
    });

    if (isLoading) {
      console.log('🛡️ AuthGuard - Still loading, waiting...');
      return;
    }

    if (!isAuthenticated) {
      console.log('🛡️ AuthGuard - Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    // CRITICAL: Check if account is deactivated
    if (user?.is_deactivated) {
      console.log('🛡️ AuthGuard - Account is deactivated, logging out and redirecting');
      // Clear auth data and redirect to login
      clearAuthData();
      router.push('/login');
      alert('Your account has been deactivated. Please contact support.');
      return;
    }

    // CRITICAL: Check if user is approved (unless they're an admin)
    // Regular users are auto-approved, so they bypass this check
    // Unapproved users can only access /waiting-approval
    if (!user?.is_admin && !user?.is_approved && user?.user_type !== 'regular' && (user as any)?.user_type !== 'regular_user') {
      const currentPath = window.location.pathname;
      // Allow access to /waiting-approval and /login, redirect everything else
      if (currentPath !== '/waiting-approval' && currentPath !== '/login' && currentPath !== '/signup') {
        console.log('🛡️ AuthGuard - User not approved, redirecting to /waiting-approval');
        router.push('/waiting-approval');
        return;
      }
    }

    if (requireAdmin && !user?.is_admin) {
      console.log('🛡️ AuthGuard - Admin required but user is not admin, redirecting to home');
      router.push('/');
      return;
    }

    console.log('🛡️ AuthGuard - Authentication passed, rendering children');
  }, [isAuthenticated, user, isLoading, requireAdmin, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  // Block unapproved users from accessing protected pages (except /waiting-approval)
  // Regular users are auto-approved, so they bypass this check
  if (!user?.is_admin && !user?.is_approved && user?.user_type !== 'regular' && (user as any)?.user_type !== 'regular_user') {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    if (currentPath !== '/waiting-approval' && currentPath !== '/login' && currentPath !== '/signup') {
      return null; // Will redirect to /waiting-approval
    }
  }

  if (requireAdmin && !user?.is_admin) {
    return null; // Will redirect to home
  }

  return <>{children}</>;
}
