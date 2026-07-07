'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';

export function MobileUserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { permissionData } = useAdminPermission();

  const hasAdminAccess = (() => {
    if (user?.is_admin && !permissionData?.permission) return true;
    if (permissionData?.hasPermission === true && permissionData?.permission) {
      const permission = permissionData.permission;
      if (permission.is_active === false) return false;
      if (permission.expires_at && new Date() > new Date(permission.expires_at)) return false;
      return true;
    }
    return false;
  })();

  const isRegularUser =
    user?.user_type === 'regular' || (user as { user_type?: string })?.user_type === 'regular_user';

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    window.location.href = '/';
  };

  const displayName = user?.doctor_name?.split(' ')[0] || 'Account';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-0.5 max-w-[88px] px-1.5 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 touch-manipulation"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserCircleIcon className="w-5 h-5 shrink-0" />
        <span className="text-[10px] font-medium truncate">{displayName}</span>
        <ChevronDownIcon className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/20 md:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full mt-1 w-[min(16rem,calc(100vw-1rem))] bg-white rounded-xl shadow-xl border border-gray-200 z-[100] py-1 overflow-hidden"
            role="menu"
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.doctor_name}</p>
              {user?.clinic_name && (
                <p className="text-xs text-gray-500 truncate">{user.clinic_name}</p>
              )}
            </div>

            {!isRegularUser && user?.is_approved && (
              <Link
                href="/order"
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                <UserCircleIcon className="w-5 h-5" />
                Order Products
              </Link>
            )}

            {!isRegularUser && !user?.is_approved && (
              <Link
                href="/waiting-approval"
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                <UserCircleIcon className="w-5 h-5" />
                Dashboard
              </Link>
            )}

            {user?.user_type === 'employee' && user?.is_approved && (
              <Link
                href="/employee/dashboard"
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                <UserCircleIcon className="w-5 h-5" />
                Employee Dashboard
              </Link>
            )}

            {hasAdminAccess && (
              <Link
                href="/admin"
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                <Cog6ToothIcon className="w-5 h-5" />
                Admin Dashboard
              </Link>
            )}

            <Link
              href="/messages"
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Appointment Status
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
