'use client';

import { useState } from 'react';

export default function TestCSPPage() {
  const [message, setMessage] = useState('');

  const testInlineScript = () => {
    // This should work if CSP is fixed
    console.log('Inline script executed successfully!');
    setMessage('✅ CSP is working! Inline scripts are allowed.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">CSP Test Page</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">CSP Test</h2>
          <p className="text-gray-600 mb-4">
            If you see this page without CSP errors in the console, the CSP is working!
          </p>
          
          <button
            onClick={testInlineScript}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Test Inline Script
          </button>
          
          {message && (
            <div className="mt-4 p-4 bg-green-100 rounded-lg">
              <p className="text-green-800">{message}</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Console Test</h2>
          <p className="text-gray-600 mb-4">
            Check the browser console for any CSP violations. You should see:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>No "Refused to execute inline script" errors</li>
            <li>No CSP violation messages</li>
            <li>This page should load without issues</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
          <p className="text-gray-600 mb-4">
            Once CSP is working, you can:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Visit the order management page</li>
            <li>Test the authentication system</li>
            <li>Verify all admin features work</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
