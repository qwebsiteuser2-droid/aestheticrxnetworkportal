'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/providers';
import {
  ChatBubbleLeftRightIcon,
  HomeIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

const tabClass = (active: boolean, activeCls: string, idleCls: string) =>
  `flex flex-col items-center justify-center px-0.5 py-1.5 rounded-lg transition-all flex-1 min-w-0 min-h-[48px] touch-manipulation ${
    active ? activeCls : idleCls
  }`;

export function MobileTabNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const handleProtectedNav = (e: React.MouseEvent, targetPath: string) => {
    if (!isAuthenticated) {
      e.preventDefault();
      toast('Please sign in to access this feature', { icon: '🔒' });
      router.push(`/login?redirect=${encodeURIComponent(targetPath)}`);
    }
  };

  return (
    <nav className="py-1.5 px-1" aria-label="Main navigation">
      <div className="grid grid-cols-7 gap-0.5 w-full">
        <Link
          href="/"
          className={tabClass(
            isActive('/'),
            'bg-gray-700 text-white shadow-md',
            'bg-gray-100 text-gray-600 border border-gray-200'
          )}
        >
          <HomeIcon className="w-5 h-5" />
          <span className="text-[9px] font-semibold mt-0.5 leading-tight text-center">Home</span>
        </Link>

        <Link
          href="/order"
          className={tabClass(
            isActive('/order'),
            'bg-blue-500 text-white shadow-md',
            'bg-blue-50 text-blue-800 border border-blue-200'
          )}
        >
          <span className="text-lg leading-none">🛒</span>
          <span className="text-[9px] font-semibold mt-0.5 leading-tight text-center">Order</span>
        </Link>

        <Link
          href="/doctors?focus=search"
          className={tabClass(
            isActive('/doctors'),
            'bg-emerald-500 text-white shadow-md',
            'bg-emerald-50 text-emerald-800 border border-emerald-200'
          )}
          aria-label="Find doctors"
        >
          <span className="relative flex items-center justify-center w-8 h-6">
            <span className="text-lg leading-none" aria-hidden>
              👨‍⚕️
            </span>
            <MagnifyingGlassIcon
              className={`absolute -bottom-0.5 -right-1 w-3.5 h-3.5 rounded-full p-0.5 ${
                isActive('/doctors')
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-emerald-700 ring-1 ring-emerald-300'
              }`}
              aria-hidden
            />
          </span>
          <span className="text-[9px] font-semibold mt-0.5 leading-tight text-center">Doctors</span>
        </Link>

        <Link
          href="/messages"
          onClick={(e) => handleProtectedNav(e, '/messages')}
          className={tabClass(
            isActive('/messages'),
            'bg-indigo-500 text-white shadow-md',
            'bg-indigo-50 text-indigo-800 border border-indigo-200'
          )}
        >
          <ChatBubbleLeftRightIcon className="w-5 h-5" />
          <span className="text-[9px] font-semibold mt-0.5 leading-tight text-center">Status</span>
        </Link>

        <Link
          href="/leaderboard"
          onClick={(e) => handleProtectedNav(e, '/leaderboard')}
          className={tabClass(
            isActive('/leaderboard'),
            'bg-amber-500 text-white shadow-md',
            'bg-amber-50 text-amber-800 border border-amber-200'
          )}
        >
          <span className="text-lg leading-none">🏆</span>
          <span className="text-[9px] font-semibold mt-0.5 leading-tight text-center">Ranks</span>
        </Link>

        <Link
          href="/research"
          className={tabClass(
            isActive('/research'),
            'bg-purple-500 text-white shadow-md',
            'bg-purple-50 text-purple-800 border border-purple-200'
          )}
        >
          <span className="text-lg leading-none">📚</span>
          <span className="text-[9px] font-semibold mt-0.5 leading-tight text-center">Research</span>
        </Link>

        <Link
          href="/hall-of-pride"
          onClick={(e) => handleProtectedNav(e, '/hall-of-pride')}
          className={tabClass(
            isActive('/hall-of-pride'),
            'bg-yellow-500 text-white shadow-md',
            'bg-yellow-50 text-yellow-800 border border-yellow-200'
          )}
        >
          <span className="text-lg leading-none">🌟</span>
          <span className="text-[9px] font-semibold mt-0.5 leading-tight text-center">Pride</span>
        </Link>
      </div>
    </nav>
  );
}
