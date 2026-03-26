'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Doctors page error boundary
export default function DoctorsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Doctors page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Doctor icon with error state */}
        <div className="mx-auto w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 relative">
          <span className="text-4xl">👨‍⚕️</span>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        {/* Error message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Unable to Load Doctors
        </h1>
        <p className="text-gray-600 mb-6">
          We couldn&apos;t load the doctor directory. This might be a temporary issue with our server.
        </p>

        {/* Helpful suggestions */}
        <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm font-medium text-gray-700 mb-2">Try these steps:</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Check your internet connection</li>
            <li>• Refresh the page</li>
            <li>• Try again in a few minutes</li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

