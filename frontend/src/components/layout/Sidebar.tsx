'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { getProfileImageUrl } from '@/lib/apiConfig';
import { 
  HomeIcon,
  ShoppingCartIcon,
  TrophyIcon,
  DocumentTextIcon,
  StarIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const allNavigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Order Product', href: '/order', icon: ShoppingCartIcon },
    { name: 'Leaderboard', href: '/leaderboard', icon: TrophyIcon },
    { name: 'Research Papers', href: '/research', icon: DocumentTextIcon },
    { name: 'Research Lab', href: '/research-lab', icon: DocumentTextIcon, doctorOnly: true, desktopOnly: true },
    { name: 'Your Research', href: '/user/research', icon: DocumentTextIcon, doctorOnly: true },
    { name: 'Hall of Pride', href: '/hall-of-pride', icon: StarIcon },
  ];
  
  // Filter navigation based on user type and device type
  const navigation = allNavigation.filter(item => {
    // Hide desktop-only items on mobile devices
    if (item.desktopOnly && isMobile) return false;
    // Show all items to admins
    if (user?.is_admin) return true;
    // Hide doctor-only items from regular users and employees
    if (item.doctorOnly && user?.user_type !== 'doctor') return false;
    return true;
  });

  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin', icon: Cog6ToothIcon },
    { name: 'User Management', href: '/admin/users', icon: UserGroupIcon },
    { name: 'Product Management', href: '/admin/products', icon: ShoppingCartIcon },
    { name: 'Research Management', href: '/admin/research-management', icon: DocumentTextIcon },
    { name: 'Research Reports', href: '/admin/research-reports', icon: DocumentTextIcon },
    { name: 'Tier Configuration', href: '/admin/tier-configs', icon: TrophyIcon },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <Link href="/" className="flex items-center space-x-2">
              <img 
                src="/logo.png" 
                alt="BioAestheticAx Network" 
                className="w-12 h-12 object-contain shadow-md rounded-lg"
              />
              <span className="text-xl font-bold text-gray-900">BioAestheticAx</span>
            </Link>
            
            {/* Close button for mobile */}
            <button
              onClick={onToggle}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  {getProfileImageUrl(user.profile_photo_url) ? (
                    <img
                      src={getProfileImageUrl(user.profile_photo_url)!}
                      alt={user.doctor_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-primary-600">
                      {user.doctor_name.split(' ').map(n => n[0]).join('')}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.doctor_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.clinic_name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {/* Main Navigation */}
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    nav-link group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive(item.href)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  onClick={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
                  }}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive(item.href) ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Admin Navigation */}
            {user?.is_admin && (
              <>
                <div className="pt-4">
                  <div className="px-3 mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Admin
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {adminNavigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`
                          nav-link group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                          ${isActive(item.href)
                            ? 'bg-primary-100 text-primary-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                        onClick={() => {
                          // Close sidebar on mobile after navigation
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <item.icon
                          className={`
                            mr-3 h-5 w-5 flex-shrink-0
                            ${isActive(item.href) ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}
                          `}
                        />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              <p>BioAestheticAx Network Platform</p>
              <p>Version 1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

