'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import {
  ChatBubbleLeftRightIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import { MobileHeaderChrome } from '@/components/layout/MobileHeaderChrome';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, isAuthenticated } = useAuth();
  const { permissionData } = useAdminPermission();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const hasAdminAccess = (() => {
    if (user?.is_admin && !permissionData?.permission) return true;
    if (permissionData?.hasPermission === true && permissionData?.permission) {
      const permission = permissionData.permission;
      if (permission.is_active === false) return false;
      if (permission.expires_at) {
        const expiresAt = new Date(permission.expires_at);
        if (new Date() > expiresAt) return false;
      }
      return true;
    }
    return false;
  })();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile: same sticky chrome as homepage (logo, auth, tab nav) */}
      <div className="md:hidden sticky top-0 z-50">
        <MobileHeaderChrome />
      </div>

      {/* Desktop tab navigation */}
      <div className="hidden md:block sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-2">
          <div className="flex items-center justify-center py-2 space-x-1">
            <Link
              href="/"
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                isActive('/')
                  ? 'bg-gray-700 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              <span>Home</span>
            </Link>

            <Link
              href="/leaderboard"
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                isActive('/leaderboard')
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
              }`}
            >
              <span>🏆</span>
              <span>Leaderboard</span>
            </Link>

            <Link
              href="/order"
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                isActive('/order')
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <span>🛒</span>
              <span>Order</span>
            </Link>

            <Link
              href="/research"
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                isActive('/research')
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
              }`}
            >
              <span>📚</span>
              <span>Research</span>
            </Link>

            <Link
              href="/hall-of-pride"
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                isActive('/hall-of-pride')
                  ? 'bg-yellow-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-yellow-600 hover:bg-yellow-50'
              }`}
            >
              <span>🌟</span>
              <span>Hall of Pride</span>
            </Link>

            <Link
              href="/doctors"
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                isActive('/doctors')
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <span>👨‍⚕️</span>
              <span>Find Doctors</span>
            </Link>

            {isAuthenticated && (user?.user_type === 'doctor' || hasAdminAccess) && (
              <Link
                href="/messages"
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                  isActive('/messages')
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                <span>Appointments</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}
