'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon } from '@heroicons/react/24/outline';
import { BRAND } from '@/lib/brandColors';

export function MobileTabNavigation() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="py-1.5 px-1" aria-label="Main navigation">
      <div className="grid grid-cols-3 gap-1 w-full">
        <Link
          href="/"
          className="flex flex-col items-center justify-center px-1 py-1.5 rounded-lg transition-all flex-1 min-w-0 min-h-[52px] touch-manipulation border"
          style={
            isActive('/')
              ? { backgroundColor: BRAND.blueDark, color: '#fff', borderColor: BRAND.blueDark }
              : { backgroundColor: '#f3f4f6', color: '#4b5563', borderColor: '#e5e7eb' }
          }
        >
          <HomeIcon className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-semibold mt-0.5 leading-tight text-center">Home</span>
        </Link>

        <Link
          href="/order"
          className="flex flex-col items-center justify-center px-1 py-1.5 rounded-lg transition-all flex-1 min-w-0 min-h-[52px] touch-manipulation border"
          style={
            isActive('/order')
              ? { backgroundColor: BRAND.blue, color: '#fff', borderColor: BRAND.blue }
              : { backgroundColor: '#eff6ff', color: BRAND.blueDark, borderColor: '#bfdbfe' }
          }
          title="Order skincare & aesthetic products"
          aria-label="Order skincare & aesthetic products"
        >
          <span className="text-lg leading-none shrink-0">🛒</span>
          <span className="text-[9px] font-semibold mt-0.5 leading-tight text-center whitespace-normal px-0.5">
            Order skincare & aesthetic products
          </span>
        </Link>

        <Link
          href="/doctors?focus=search"
          className="flex flex-col items-center justify-center px-1 py-1.5 rounded-lg transition-all flex-1 min-w-0 min-h-[52px] touch-manipulation border"
          style={
            isActive('/doctors')
              ? { backgroundColor: BRAND.teal, color: '#fff', borderColor: BRAND.teal }
              : { backgroundColor: '#f0fdfa', color: '#0f766e', borderColor: '#99f6e4' }
          }
          title="Looking for skincare & aesthetic doctors nearby"
          aria-label="Looking for skincare & aesthetic doctors nearby"
        >
          <span className="text-lg leading-none shrink-0" aria-hidden>
            👨‍⚕️
          </span>
          <span className="text-[9px] font-semibold mt-0.5 leading-tight text-center whitespace-normal px-0.5">
            Looking for skincare & aesthetic doctors nearby
          </span>
        </Link>
      </div>
    </nav>
  );
}
