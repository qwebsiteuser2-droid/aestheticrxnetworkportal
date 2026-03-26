'use client';

import { useAuth } from '@/app/providers';
import { getAccessToken, getCurrentUser, isAuthenticated } from '@/lib/auth';
import { useEffect, useState } from 'react';

export default function TestAuthPage() {
  const { user, isAuthenticated: authIsAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const token = getAccessToken();
  const currentUser = getCurrentUser();
  const authCheck = isAuthenticated();

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
          <div className="bg-white p-6 rounded-lg shadow">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
        
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Auth Hook State:</h2>
            <p><strong>isLoading:</strong> {isLoading ? 'true' : 'false'}</p>
            <p><strong>isAuthenticated:</strong> {authIsAuthenticated ? 'true' : 'false'}</p>
            <p><strong>user:</strong> {user ? JSON.stringify(user, null, 2) : 'null'}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Auth Library State:</h2>
            <p><strong>Token exists:</strong> {token ? 'true' : 'false'}</p>
            <p><strong>Token:</strong> {token ? token.substring(0, 50) + '...' : 'null'}</p>
            <p><strong>Current User:</strong> {currentUser ? JSON.stringify(currentUser, null, 2) : 'null'}</p>
            <p><strong>isAuthenticated():</strong> {authCheck ? 'true' : 'false'}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Local Storage:</h2>
            <p><strong>User data:</strong> {typeof window !== 'undefined' ? (localStorage.getItem('user') || 'null') : 'N/A (SSR)'}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Cookies:</h2>
            <p><strong>Access Token:</strong> {typeof window !== 'undefined' ? (document.cookie.includes('accessToken') ? 'exists' : 'not found') : 'N/A (SSR)'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
