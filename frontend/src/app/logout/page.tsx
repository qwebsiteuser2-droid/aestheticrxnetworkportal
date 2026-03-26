'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/providers';

export default function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    // Clear all auth data
    logout();
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear local storage
    localStorage.clear();
    
    // Redirect to home page
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  }, [logout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Logging out...</h2>
        <p className="text-gray-600">Clearing authentication data and redirecting to home page.</p>
      </div>
    </div>
  );
}
