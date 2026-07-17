'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { BrandTitle } from '@/components/BrandTitle';
import { MobileTabNavigation } from '@/components/layout/MobileTabNavigation';
import { MobileUserMenu } from '@/components/layout/MobileUserMenu';
import NotificationBell from '@/components/NotificationBell';

type MobileHeaderChromeProps = {
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
};

export function MobileHeaderChrome({ onLoginClick, onRegisterClick }: MobileHeaderChromeProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const goLogin = () => {
    if (onLoginClick) onLoginClick();
    else router.push('/login');
  };

  const goRegister = () => {
    if (onRegisterClick) onRegisterClick();
    else router.push('/signup/select-type');
  };

  return (
    <div className="md:hidden bg-white border-b border-gray-200 shadow-sm relative z-50">
      <div className="px-2 pt-1.5 pb-0">
        <div className="flex items-center justify-between gap-2 min-h-[40px]">
          <Link href="/" className="flex items-center gap-1.5 min-w-0 flex-1">
            <img
              src="/logo.png"
              alt="AestheticRxNetwork"
              className="w-9 h-9 object-contain shrink-0"
            />
            <BrandTitle size="xs" className="min-w-0" />
          </Link>

          <div className="flex items-center gap-1 shrink-0 relative z-[60]">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <MobileUserMenu />
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={goLogin}
                  className="px-2 py-1 text-[11px] font-semibold text-gray-700 border border-gray-300 rounded-md hover:border-blue-400 hover:text-blue-600"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={goRegister}
                  className="px-2 py-1 text-[11px] font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="px-1 border-t border-gray-100">
        <Suspense fallback={<div className="h-12" aria-hidden />}>
          <MobileTabNavigation />
        </Suspense>
      </div>
    </div>
  );
}
