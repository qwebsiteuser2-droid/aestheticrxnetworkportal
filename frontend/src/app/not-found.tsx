import Link from 'next/link';
import type { Metadata } from 'next';

// SEO Metadata for 404 page
export const metadata: Metadata = {
  title: '404 - Page Not Found | BioAestheticAx Network',
  description: 'The page you are looking for does not exist or has been moved.',
};

// Custom 404 Not Found page - Static, no client-side rendering needed
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 illustration */}
        <div className="mb-8">
          <div className="relative inline-block">
            {/* Large 404 text */}
            <span className="text-[150px] font-bold text-gray-200 leading-none select-none">
              404
            </span>
            {/* Magnifying glass overlay */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-32 h-32 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-gray-300">
                <span className="text-5xl">🔍</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Helpful links */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <p className="text-sm font-medium text-gray-700 mb-4">
            Here are some helpful links:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/"
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <span>🏠</span>
              <span className="text-sm font-medium text-gray-700">Home</span>
            </Link>
            <Link
              href="/doctors"
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <span>👨‍⚕️</span>
              <span className="text-sm font-medium text-emerald-700">Doctors</span>
            </Link>
            <Link
              href="/order"
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span>🛒</span>
              <span className="text-sm font-medium text-blue-700">Products</span>
            </Link>
            <Link
              href="/research"
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <span>📚</span>
              <span className="text-sm font-medium text-purple-700">Research</span>
            </Link>
          </div>
        </div>

        {/* Primary action */}
        <Link
          href="/"
          className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Homepage
        </Link>

        {/* Brand footer */}
        <p className="mt-12 text-sm text-gray-400">
          BioAestheticAx Network • B2B Medical Platform
        </p>
      </div>
    </div>
  );
}

