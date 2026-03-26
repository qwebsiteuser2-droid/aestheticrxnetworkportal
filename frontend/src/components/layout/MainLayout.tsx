'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { 
  ChatBubbleLeftRightIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, isAuthenticated } = useAuth();
  const { permissionData } = useAdminPermission();
  const pathname = usePathname();
  
  // Check if current path matches
  const isActive = (path: string) => pathname === path;
  
  // Check if user has admin access
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
      {/* Top Tab Navigation - Always visible */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-2">
          {/* Desktop Tab Navigation */}
          <div className="hidden md:flex items-center justify-center py-2 space-x-1">
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
              href="/appointments"
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                isActive('/appointments') 
                  ? 'bg-emerald-500 text-white shadow-md' 
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <span>👨‍⚕️</span>
              <span>Set Appointments</span>
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
          
          {/* Mobile Tab Navigation - Horizontal scrollable */}
          <div className="md:hidden overflow-x-auto py-2 -mx-2 px-2">
            <div className="flex space-x-2 min-w-max">
              <Link
                href="/"
                className={`flex flex-col items-center px-3 py-1.5 rounded-lg transition-all min-w-[60px] ${
                  isActive('/') 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <HomeIcon className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-0.5">Home</span>
              </Link>
              
              <Link
                href="/leaderboard"
                className={`flex flex-col items-center px-3 py-1.5 rounded-lg transition-all min-w-[60px] ${
                  isActive('/leaderboard') 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <span className="text-lg">🏆</span>
                <span className="text-[10px] font-medium">Ranks</span>
              </Link>
              
              <Link
                href="/order"
                className={`flex flex-col items-center px-3 py-1.5 rounded-lg transition-all min-w-[60px] ${
                  isActive('/order') 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                <span className="text-lg">🛒</span>
                <span className="text-[10px] font-medium">Order</span>
              </Link>
              
              <Link
                href="/research"
                className={`flex flex-col items-center px-3 py-1.5 rounded-lg transition-all min-w-[60px] ${
                  isActive('/research') 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                }`}
              >
                <span className="text-lg">📚</span>
                <span className="text-[10px] font-medium">Research</span>
              </Link>
              
              <Link
                href="/hall-of-pride"
                className={`flex flex-col items-center px-3 py-1.5 rounded-lg transition-all min-w-[60px] ${
                  isActive('/hall-of-pride') 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}
              >
                <span className="text-lg">🌟</span>
                <span className="text-[10px] font-medium">Pride</span>
              </Link>
              
              <Link
                href="/appointments"
                className={`flex flex-col items-center px-3 py-1.5 rounded-lg transition-all min-w-[60px] ${
                  isActive('/appointments') 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                <span className="text-lg">👨‍⚕️</span>
                <span className="text-[10px] font-medium">Doctors</span>
              </Link>
              
              {isAuthenticated && (user?.user_type === 'doctor' || hasAdminAccess) && (
                <Link
                  href="/messages"
                  className={`flex flex-col items-center px-3 py-1.5 rounded-lg transition-all min-w-[60px] ${
                    isActive('/messages') 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Appoints</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Page Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

