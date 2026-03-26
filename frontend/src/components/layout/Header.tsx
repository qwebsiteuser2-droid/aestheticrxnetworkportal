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
  HomeIcon
} from '@heroicons/react/24/outline';
import NotificationBell from '@/components/NotificationBell';

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
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 relative">
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
      
      <nav className="container mx-auto px-2 sm:px-4">
        {/* Mobile Header Layout - Simplified */}
        <div className="md:hidden">
          {/* Top Row: Logo + BAx + Auth */}
          <div className="flex items-center justify-between py-2">
            {/* Logo and BAx */}
            <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
              <div className="relative p-1 bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-50 rounded-xl shadow-md border border-amber-200/50">
                <img 
                  src="/logo.png" 
                  alt="BioAestheticAx Network" 
                  className="w-10 h-10 object-contain"
                />
              </div>
              <span className="text-lg font-black bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 bg-clip-text text-transparent">BAx</span>
            </Link>
            
            {/* Auth Section */}
            <div className="flex items-center space-x-2">
              {isAuthenticated ? (
                <>
                  <NotificationBell />
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-1 px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                  >
                    <UserCircleIcon className="w-5 h-5" />
                    <span className="text-xs font-medium truncate max-w-[60px]">{user?.doctor_name?.split(' ')[0]}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onLoginClick}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 border border-gray-300 rounded-lg hover:border-blue-300"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={onRegisterClick}
                    className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Mobile AI Attribution - Below logo in one line */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg px-2 py-1 mb-2">
            <p className="text-[10px] text-gray-600 text-center">
              🤖 AI powered by <a href="https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium">LLaMA 3.1 Meta</a> via Hugging Face
            </p>
          </div>
          
          {/* Mobile User Menu Dropdown */}
          {isUserMenuOpen && isAuthenticated && (
            <div className="absolute right-2 top-14 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
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
        
        {/* Desktop Header Layout */}
        <div className="hidden md:flex justify-between items-center h-16">
          {/* Logo - Desktop */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative p-1.5 bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-50 rounded-2xl shadow-lg border border-amber-200/50">
                <img 
                  src="/logo.png" 
                  alt="BioAestheticAx Network" 
                  className="w-16 h-16 lg:w-20 lg:h-20 object-contain"
                />
              </div>
              <span className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 bg-clip-text text-transparent hidden lg:block">BioAestheticAx</span>
              <span className="text-2xl font-black bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 bg-clip-text text-transparent lg:hidden">BAx</span>
            </Link>
          </div>

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
              onClick={(e) => handleProtectedNav(e, '/order')}
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
                <span>Appoint Status</span>
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
    
    {/* Mobile Bottom Navigation - Fixed at bottom, persists across all pages */}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 pb-safe">
      <div className="grid grid-cols-6 gap-0">
        {/* Leaderboard */}
        <Link
          href="/leaderboard"
          onClick={(e) => handleProtectedNav(e, '/leaderboard')}
          className={`flex flex-col items-center justify-center py-2 transition-colors ${
            isActive('/leaderboard') 
              ? 'text-amber-600 bg-amber-50 border-t-2 border-amber-500' 
              : 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
          }`}
        >
          <span className="text-lg">🏆</span>
          <span className={`text-[9px] mt-0.5 ${isActive('/leaderboard') ? 'font-bold' : 'font-medium'}`}>Ranks</span>
        </Link>
        
        {/* Order */}
        <Link
          href="/order"
          onClick={(e) => handleProtectedNav(e, '/order')}
          className={`flex flex-col items-center justify-center py-2 transition-colors ${
            isActive('/order') 
              ? 'text-blue-600 bg-blue-50 border-t-2 border-blue-500' 
              : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
          }`}
        >
          <span className="text-lg">🛒</span>
          <span className={`text-[9px] mt-0.5 ${isActive('/order') ? 'font-bold' : 'font-medium'}`}>Order</span>
        </Link>
        
        {/* Research */}
        <Link
          href="/research"
          onClick={(e) => handleProtectedNav(e, '/research')}
          className={`flex flex-col items-center justify-center py-2 transition-colors ${
            isActive('/research') 
              ? 'text-purple-600 bg-purple-50 border-t-2 border-purple-500' 
              : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
          }`}
        >
          <span className="text-lg">📚</span>
          <span className={`text-[9px] mt-0.5 ${isActive('/research') ? 'font-bold' : 'font-medium'}`}>Research</span>
        </Link>
        
        {/* Hall of Pride */}
        <Link
          href="/hall-of-pride"
          onClick={(e) => handleProtectedNav(e, '/hall-of-pride')}
          className={`flex flex-col items-center justify-center py-2 transition-colors ${
            isActive('/hall-of-pride') 
              ? 'text-yellow-600 bg-yellow-50 border-t-2 border-yellow-500' 
              : 'text-gray-500 hover:text-yellow-600 hover:bg-yellow-50'
          }`}
        >
          <span className="text-lg">🌟</span>
          <span className={`text-[9px] mt-0.5 ${isActive('/hall-of-pride') ? 'font-bold' : 'font-medium'}`}>Pride</span>
        </Link>
        
        {/* Appointments with Doctors */}
        <Link
          href="/appointments"
          onClick={(e) => handleProtectedNav(e, '/appointments')}
          className={`flex flex-col items-center justify-center py-2 transition-colors ${
            isActive('/appointments') 
              ? 'text-emerald-600 bg-emerald-50 border-t-2 border-emerald-500' 
              : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
          }`}
        >
          <span className="text-lg">👨‍⚕️</span>
          <span className={`text-[9px] mt-0.5 ${isActive('/appointments') ? 'font-bold' : 'font-medium'}`}>Doctors</span>
        </Link>
        
        {/* Appointments or Home */}
        {isAuthenticated && (user?.user_type === 'doctor' || hasAdminAccess) ? (
          <Link
            href="/messages"
            className={`flex flex-col items-center justify-center py-2 transition-colors ${
              isActive('/messages') 
                ? 'text-indigo-600 bg-indigo-50 border-t-2 border-indigo-500' 
                : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
            <span className={`text-[9px] mt-0.5 ${isActive('/messages') ? 'font-bold' : 'font-medium'}`}>Appoints</span>
          </Link>
        ) : (
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-2 transition-colors ${
              isActive('/') 
                ? 'text-gray-900 bg-gray-100 border-t-2 border-gray-500' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <HomeIcon className="w-5 h-5" />
            <span className={`text-[9px] mt-0.5 ${isActive('/') ? 'font-bold' : 'font-medium'}`}>Home</span>
          </Link>
        )}
      </div>
    </nav>
    
    {/* Spacer for bottom navigation on mobile */}
    <div className="md:hidden h-16"></div>
    </>
  );
}
