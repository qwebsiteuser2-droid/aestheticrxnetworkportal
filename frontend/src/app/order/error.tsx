'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Order page error boundary
export default function OrderError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Order page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Shopping cart icon with error state */}
        <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 relative">
          <span className="text-4xl">🛒</span>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        {/* Error message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Unable to Load Products
        </h1>
        <p className="text-gray-600 mb-6">
          We couldn&apos;t load the product catalog. Your cart items are safe and will be available when you return.
        </p>

        {/* Cart preservation notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-700 font-medium">Your cart is preserved</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Reload Products
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            Go Home
          </Link>
        </div>

        {/* Support info */}
        <p className="mt-8 text-sm text-gray-500">
          Need help with an order?{' '}
          <a
            href="mailto:asadkhanbloch4949@gmail.com"
            className="text-blue-600 hover:underline"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}

