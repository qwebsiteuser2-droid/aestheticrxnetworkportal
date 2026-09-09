import Link from 'next/link';
import { BrandTitle } from '@/components/BrandTitle';

/** Content-area loading only — Sign In / Register stay clickable */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="w-9 h-9 object-contain" />
          <BrandTitle size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Sign In
          </Link>
          <Link
            href="/signup/select-type"
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Get Started
          </Link>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600" />
        <p className="mt-4 text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}
