'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/app/providers';
import { BRAND } from '@/lib/brandColors';

type TabStyle = {
  activeBg: string;
  idleBg: string;
  idleColor: string;
  idleBorder: string;
};

function tabStyle(active: boolean, colors: TabStyle): CSSProperties {
  if (active) {
    return { backgroundColor: colors.activeBg, color: '#fff', borderColor: colors.activeBg };
  }
  return {
    backgroundColor: colors.idleBg,
    color: colors.idleColor,
    borderColor: colors.idleBorder,
  };
}

export function MobileTabNavigation() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const showAppointmentStatus =
    isAuthenticated && (user?.user_type === 'doctor' || user?.is_admin);

  const secondaryTabs = [
    {
      href: '/leaderboard',
      label: 'Leaderboard',
      icon: '🏆',
      colors: {
        activeBg: '#f59e0b',
        idleBg: '#fffbeb',
        idleColor: '#b45309',
        idleBorder: '#fde68a',
      },
    },
    {
      href: '/appointments',
      label: 'Appointments',
      icon: '📅',
      colors: {
        activeBg: '#10b981',
        idleBg: '#ecfdf5',
        idleColor: '#047857',
        idleBorder: '#a7f3d0',
      },
    },
    {
      href: '/research',
      label: 'Research',
      icon: '📚',
      colors: {
        activeBg: '#8b5cf6',
        idleBg: '#f5f3ff',
        idleColor: '#6d28d9',
        idleBorder: '#ddd6fe',
      },
    },
    {
      href: '/hall-of-pride',
      label: 'Hall of Pride',
      icon: '🌟',
      colors: {
        activeBg: '#eab308',
        idleBg: '#fefce8',
        idleColor: '#a16207',
        idleBorder: '#fef08a',
      },
    },
    ...(showAppointmentStatus
      ? [
          {
            href: '/messages',
            label: 'Appt Status',
            icon: '💬',
            colors: {
              activeBg: '#6366f1',
              idleBg: '#eef2ff',
              idleColor: '#4338ca',
              idleBorder: '#c7d2fe',
            },
          },
        ]
      : []),
  ];

  return (
    <nav className="py-1.5 px-1 space-y-1.5" aria-label="Main navigation">
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

      {/* Secondary features — visible on mobile homepage/header (not only in profile) */}
      <div
        className="flex gap-1 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-thin"
        style={{ WebkitOverflowScrolling: 'touch' }}
        aria-label="More features"
      >
        {secondaryTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center justify-center px-2 py-1.5 rounded-lg transition-all min-w-[4.75rem] min-h-[48px] touch-manipulation border shrink-0"
            style={tabStyle(isActive(tab.href), tab.colors)}
            title={tab.label}
            aria-label={tab.label}
          >
            <span className="text-base leading-none shrink-0" aria-hidden>
              {tab.icon}
            </span>
            <span className="text-[9px] font-semibold mt-0.5 leading-tight text-center whitespace-nowrap">
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
