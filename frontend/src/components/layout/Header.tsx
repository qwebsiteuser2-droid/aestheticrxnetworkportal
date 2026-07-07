'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { User } from '@/types';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { toast } from 'react-hot-toast';
import { 
  Bars3Icon, 
  XMarkIcon, 
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  DocumentTextIcon,
  StarIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline';
import NotificationBell from '@/components/NotificationBell';
import { BrandTitle } from '@/components/BrandTitle';
import { MobileHeaderChrome } from '@/components/layout/MobileHeaderChrome';

interface HeaderProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  isAuthenticated: boolean;
  user: User | null;
  onSearchClick?: () => void;
}

export function Header({ onLoginClick, onRegisterClick, isAuthenticated, user, onSearchClick }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { logout } = useAuth();
  const { permissionData, isFullAdmin, isCustomAdmin, isViewerAdmin } = useAdminPermission();
  const pathname = usePathname();
  const router = useRouter();
  
  // Check if current path matches
  const isActive = (path: string) => pathname === path;

  // Handle nav click - redirect to login if not authenticated
  const handleProtectedNav = (e: React.MouseEvent, targetPath: string) => {
    if (!isAuthenticated) {
      e.preventDefault();
      toast('Please sign in to access this feature', { icon: '🔒' });
      router.push(`/login?redirect=${encodeURIComponent(targetPath)}`);
    }
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    window.location.href = '/';
  };

  // Check if user has admin access (main admin or child admin with active, non-expired permissions)
  const hasAdminAccess = (() => {
    // Parent admin (main admin without permission record)
    if (user?.is_admin && !permissionData?.permission) {
      return true;
    }
    
    // Child admin - must have active, non-expired permission
    if (permissionData?.hasPermission === true && permissionData?.permission) {
      const permission = permissionData.permission;
      
      // Check if permission is active
      if (permission.is_active === false) {
        return false; // Permission is inactive
      }
      
      // Check if permission is expired
      if (permission.expires_at) {
        const expiresAt = new Date(permission.expires_at);
        const now = new Date();
        if (now > expiresAt) {
          return false; // Permission is expired
        }
      }
      
      // Permission is active and not expired
      return true;
    }
    
    // No valid admin access
    return false;
  })();

  // Get admin badge text
  const getAdminBadge = () => {
    if (user?.is_admin && !permissionData?.permission) {
      return { text: '🔑 Full Administrator', color: 'bg-red-100 text-red-800 border-red-200' };
    }
    if (permissionData?.permissionType === 'full') {
      return { text: '🛡️ Full Admin', color: 'bg-red-100 text-red-800 border-red-200' };
    }
    if (permissionData?.permissionType === 'custom') {
      return { text: '⚙️ Custom Admin', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    }
    if (permissionData?.permissionType === 'viewer') {
      return { text: '👁️ Viewer Admin', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    }
    return null;
  };

  // Check if user is a regular user (auto-approved)
  const isRegularUser = user?.user_type === 'regular' || (user as any)?.user_type === 'regular_user';

  const getDashboardLink = () => {
    // Regular users should not see Dashboard at all - return null
    if (isRegularUser) {
      return null;
    }
    if (user?.is_approved) {
      return { name: 'Order Products', href: '/order', icon: UserCircleIcon };
    } else {
      // Only show Dashboard for unapproved doctors/employees (not regular users)
      return { name: 'Dashboard', href: '/waiting-approval', icon: UserCircleIcon };
    }
  };

  const dashboardLink = getDashboardLink();
  const userNavigation = [
    ...(dashboardLink ? [dashboardLink] : []), // Only add if not null
    // Add Admin Dashboard to dropdown if user has admin access
    ...(hasAdminAccess ? [{ name: 'Admin Dashboard', href: '/admin', icon: Cog6ToothIcon }] : []),
  ];

  return (
    <>
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 relative pl-0 overflow-visible md:overflow-visible">
      <MobileHeaderChrome onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} />
      {/* Desktop Meta Attribution Banner - Hidden on mobile */}
      <div className="hidden md:block bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-center">
            <p className="text-xs text-gray-600 flex items-center space-x-2">
              <span>🤖</span>
              <span>AI Research Assistant powered by</span>
              <a 
                href="https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium underline"
              >
                LLaMA 3.1 by Meta
              </a>
              <span>via Hugging Face</span>
            </p>
          </div>
        </div>
      </div>
      
      <nav className="w-full max-w-[1920px] mx-auto px-0 sm:px-1 lg:px-2 hidden md:block">
        {/* Desktop Header Layout */}
        <div className="hidden md:flex justify-between items-center min-h-[5rem] relative py-1">
          {/* Logo + wordmark + tagline — top-left, vertically centered */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center -ml-1 sm:-ml-2 lg:-ml-3">
            <Link href="/" className="flex items-center gap-2.5 pl-0">
              <img 
                src="/logo.png" 
                alt="AestheticRx Network" 
                className="w-[4.5rem] h-[4.5rem] lg:w-20 lg:h-20 object-contain drop-shadow-sm shrink-0"
              />
              <div className="hidden lg:block">
                <BrandTitle size="sm" showTagline />
              </div>
              <div className="hidden md:block lg:hidden">
                <BrandTitle size="sm" />
              </div>
            </Link>
          </div>

          <div className="flex-1 min-w-[10rem] md:min-w-[12rem] lg:min-w-[18rem] xl:min-w-[22rem]" aria-hidden />

          {/* Main Navigation Links - Desktop - Tab Style */}
          <div className="flex items-center space-x-0.5 bg-gray-100 p-1 rounded-xl">
            <Link
              href="/leaderboard"
              onClick={(e) => handleProtectedNav(e, '/leaderboard')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all font-medium text-sm ${
                isActive('/leaderboard') 
                  ? 'bg-amber-500 text-white shadow-md' 
                  : 'text-gray-600 hover:text-amber-600 hover:bg-white'
              }`}
              title="Track your progress and get rewards"
            >
              <span>🏆</span>
              <span>Leaderboard</span>
            </Link>
            
            <Link
              href="/order"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all font-medium text-sm ${
                isActive('/order') 
                  ? 'bg-blue-500 text-white shadow-md' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-white'
              }`}
              title="Order medical supplies and products"
            >
              <span>🛒</span>
              <span>Order</span>
            </Link>

            <Link
              href="/doctors"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all font-medium text-sm ${
                isActive('/doctors') 
                  ? 'bg-emerald-500 text-white shadow-md' 
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-white'
              }`}
              title="Find doctors near you"
            >
              <span>👨‍⚕️</span>
              <span>Find Doctors</span>
            </Link>
            
            <Link
              href="/research"
              onClick={(e) => handleProtectedNav(e, '/research')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all font-medium text-sm ${
                isActive('/research') 
                  ? 'bg-purple-500 text-white shadow-md' 
                  : 'text-gray-600 hover:text-purple-600 hover:bg-white'
              }`}
              title="Write, comment and get rewards"
            >
              <span>📚</span>
              <span>Research</span>
            </Link>
            
            <Link
              href="/hall-of-pride"
              onClick={(e) => handleProtectedNav(e, '/hall-of-pride')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all font-medium text-sm ${
                isActive('/hall-of-pride') 
                  ? 'bg-yellow-500 text-white shadow-md' 
                  : 'text-gray-600 hover:text-yellow-600 hover:bg-white'
              }`}
              title="Celebrate achievements and milestones"
            >
              <span>🌟</span>
              <span>Hall of Pride</span>
            </Link>
            
            <Link
              href="/appointments"
              onClick={(e) => handleProtectedNav(e, '/appointments')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all font-medium text-sm ${
                isActive('/appointments') 
                  ? 'bg-emerald-500 text-white shadow-md' 
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-white'
              }`}
              title="Find and book appointments with doctors"
            >
              <span>👨‍⚕️</span>
              <span>Set Appointments</span>
            </Link>
            
            {isAuthenticated && (user?.user_type === 'doctor' || hasAdminAccess) && (
              <Link
                href="/messages"
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all font-medium text-sm ${
                  isActive('/messages') 
                    ? 'bg-indigo-500 text-white shadow-md' 
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-white'
                }`}
                title={hasAdminAccess ? "View all appointment requests (Admin)" : "View and respond to appointment requests"}
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                <span>Appointment Status</span>
              </Link>
            )}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-50"
                  >
                    <UserCircleIcon className="w-6 h-6" />
                    <span className="text-sm font-medium max-w-32 truncate">{user?.doctor_name}</span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="py-2">
                        <div className="px-4 py-3 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-900 truncate">{user?.doctor_name}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.clinic_name}</p>
                          {hasAdminAccess && (() => {
                            const badge = getAdminBadge();
                            return badge ? (
                              <div className="mt-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
                                  {badge.text}
                                </span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                        
                        {userNavigation.map((item) => (
                          <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.name}
                          </Link>
                        ))}
                        
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onLoginClick) {
                      onLoginClick();
                    }
                  }}
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm lg:text-base px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer relative z-50"
                  type="button"
                  aria-label="Sign In"
                >
                  Sign In
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onRegisterClick) {
                      onRegisterClick();
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer relative z-50"
                  type="button"
                  aria-label="Get Started"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
    </>
  );
}
