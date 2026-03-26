'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getAccessToken } from '@/lib/auth';
import api, { authApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import OTPModal from '@/components/OTPModal';
import { getApiUrl } from '@/lib/getApiUrl';

interface AdminFeature {
  id: string;
  name: string;
  href: string;
  color: string;
  icon: string;
  permission?: string;
  feature?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { permissionData, loading: permissionLoading, canAccessFeature, isViewerAdmin, isCustomAdmin, isFullAdmin, isParentAdmin, isChildAdmin } = useAdminPermission();
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [checkingOTP, setCheckingOTP] = useState(true);

  // Check OTP requirement for admin access - ONLY for child admins, NOT for parent admins
  useEffect(() => {
    const checkOTPRequirement = async () => {
      if (authLoading || permissionLoading) return;
      
      // First check authentication
      if (!isAuthenticated || !user) {
        router.push('/login');
        return;
      }

      // Check if user has admin access
      // Parent admin: has is_admin flag (even if permissionData is not loaded yet)
      // Child admin: has permission record in permissionData
      const isParentAdminUser = user.is_admin && !permissionData?.isChildAdmin;
      const hasAdminAccess = isParentAdminUser || 
        user?.is_admin || 
        (permissionData?.hasPermission === true) || 
        (permissionData?.permissionType && ['viewer', 'custom', 'full'].includes(permissionData.permissionType));
      
      if (!hasAdminAccess) {
        router.push('/login');
        return;
      }

      // OTP verification for admin dashboard access
      // Check if OTP was already verified during login (stored in session)
      const otpVerifiedInSession = sessionStorage.getItem('admin_otp_verified');
      const loginOtpVerified = sessionStorage.getItem('login_otp_verified');
      
      // If OTP was verified during login or dashboard access, skip
      if (otpVerifiedInSession === 'true' || loginOtpVerified === 'true') {
        console.log('🔐 OTP already verified in session');
        setOtpVerified(true);
        setCheckingOTP(false);
        return;
      }
      
      // For now, skip additional dashboard OTP if user just logged in
      // The login flow should have already enforced OTP based on admin settings
      const fromLogin = sessionStorage.getItem('fromLogin');
      if (fromLogin === 'true') {
        console.log('🔐 User came from login, OTP should have been verified there');
        sessionStorage.removeItem('fromLogin');
        setOtpVerified(true);
        setCheckingOTP(false);
        return;
      }

      // Generate OTP for child admin access
      try {
        const token = getAccessToken();
        if (!token) {
          router.push('/login');
          return;
        }

        console.log('🔐 Generating OTP for child admin dashboard access', { 
          userId: user?.id, 
          email: user?.email,
          is_admin: user?.is_admin,
          hasPermission: permissionData?.hasPermission,
          permissionType: permissionData?.permissionType,
          isChildAdmin: isChildAdmin
        });

        // Generate OTP for admin access (only for child admins)
        // Use centralized API instance with extended timeout for email sending
        const response = await api.post('/otp/generate', {
          userId: user?.id,
          purpose: 'admin_access'
        }, {
          timeout: 60000 // 60 seconds for OTP generation (email can be slow)
        });

        if (response.data.success) {
          console.log('✅ OTP generated successfully for child admin', response.data);
          setShowOTPModal(true);
        } else {
          console.error('❌ OTP generation failed', { status: response.status, error: response.data });
          // Still show OTP modal as fallback - user can try to resend
          setShowOTPModal(true);
        }
      } catch (error: any) {
        console.error('❌ Error generating OTP for child admin access:', error);
        console.error('❌ Error details:', error.message, error.stack);
        // Still show OTP modal as fallback - user can try to resend
        setShowOTPModal(true);
      } finally {
        setCheckingOTP(false);
      }
    };

    checkOTPRequirement();
  }, [authLoading, permissionLoading, isAuthenticated, user, permissionData, isParentAdmin, isChildAdmin, router]);

  const handleOTPVerify = async (otpCode: string) => {
    try {
      // Verify OTP for child admin access
      // Use centralized API instance
      const response = await api.post('/otp/verify', {
        userId: user?.id,
        otpCode: otpCode,
        purpose: 'admin_access'
      });

      if (response.data.success) {
        const result = response.data;
        setOtpVerified(true);
        setShowOTPModal(false);
        sessionStorage.setItem('admin_otp_verified', 'true');
        toast.success('Admin access verified');
      } else {
        toast.error(response.data.message || 'Invalid OTP');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    }
  };

  const handleResendOTP = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token. Please login again.');
        router.push('/login');
        return;
      }

      // Use centralized API instance
      console.log('🔐 Resending OTP for child admin access', { 
        userId: user?.id, 
        email: user?.email 
      });
      
      const response = await api.post('/otp/generate', {
        userId: user?.id,
        purpose: 'admin_access'
      }, {
        timeout: 60000 // 60 seconds for OTP generation (email can be slow)
      });

      if (response.data.success) {
        console.log('✅ OTP resent successfully', response.data);
        toast.success('OTP resent to your email');
      } else {
        const result = response.data;
        console.error('❌ Failed to resend OTP', { status: response.status, error: result });
        toast.error(result.message || 'Failed to resend OTP');
      }
    } catch (error: any) {
      console.error('❌ Error resending OTP:', error);
      toast.error('Failed to resend OTP. Please try again.');
    }
  };

  // Admin features with permission mapping
  const adminFeatures: AdminFeature[] = [
    { id: 'users', name: 'Manage Users', href: '/admin/users', color: 'bg-blue-600 hover:bg-blue-700', icon: '👥', feature: 'users' },
    { id: 'products', name: 'Manage Products', href: '/admin/products', color: 'bg-green-600 hover:bg-green-700', icon: '📦', feature: 'products' },
    { id: 'orders', name: 'Manage Order System', href: '/admin/order-management', color: 'bg-amber-600 hover:bg-amber-700', icon: '🛒', feature: 'orders' },
    { id: 'employees', name: 'Employee Management', href: '/admin/employee-management', color: 'bg-teal-600 hover:bg-teal-700', icon: '👷', feature: 'employees' },
    { id: 'research', name: 'Manage Research Papers', href: '/admin/research-management', color: 'bg-indigo-600 hover:bg-indigo-700', icon: '📚', feature: 'research' },
    { id: 'tiers', name: 'Manage Tier Configurations', href: '/admin/tier-configs', color: 'bg-orange-600 hover:bg-orange-700', icon: '⭐', feature: 'tiers' },
    { id: 'leaderboard', name: 'Manage Team Leaderboard', href: '/admin/leaderboard', color: 'bg-emerald-600 hover:bg-emerald-700', icon: '🏆', feature: 'leaderboard' },
    { id: 'hall-of-pride', name: 'Manage Hall of Pride', href: '/admin/hall-of-pride', color: 'bg-yellow-600 hover:bg-yellow-700', icon: '🏅', feature: 'hall-of-pride' },
    { id: 'badge-management', name: 'Badge Management', href: '/admin/badge-management', color: 'bg-amber-600 hover:bg-amber-700', icon: '💎', feature: 'badges' },
    { id: 'advertisements', name: 'Manage Advertisements', href: '/admin/advertisements', color: 'bg-pink-600 hover:bg-pink-700', icon: '📺', feature: 'advertisements' },
    { id: 'email-analytics', name: 'Email Analytics', href: '/admin/email-analytics', color: 'bg-rose-600 hover:bg-rose-700', icon: '📊', feature: 'email-analytics' },
    { id: 'signup-ids', name: 'Manage Signup IDs', href: '/admin/signup-ids', color: 'bg-purple-600 hover:bg-purple-700', icon: '🔑', feature: 'signup-ids' },
    { id: 'data-export', name: 'Data Export & Google Drive', href: '/admin/data-export', color: 'bg-lime-600 hover:bg-lime-700', icon: '📥', feature: 'data-export' },
    { id: 'user-profiles', name: 'Manage User Profiles', href: '/admin/user-profiles', color: 'bg-indigo-600 hover:bg-indigo-700', icon: '👤', feature: 'users' },
    { id: 'award-messages', name: 'Manage Awards and Messages', href: '/admin/award-messages', color: 'bg-emerald-600 hover:bg-emerald-700', icon: '🎖️', feature: 'research' },
    { id: 'gmail-messages', name: 'Manage Gmail Messages', href: '/admin/gmail-messages', color: 'bg-indigo-600 hover:bg-indigo-700', icon: '📧', feature: 'email-analytics' },
    { id: 'permissions', name: 'Manage Admin Permissions', href: '/admin/permissions', color: 'bg-red-600 hover:bg-red-700', icon: '🔐', feature: 'permissions' },
    { id: 'backgrounds', name: 'Manage Backgrounds', href: '/admin/backgrounds', color: 'bg-cyan-600 hover:bg-cyan-700', icon: '🎨', feature: 'settings' },
    { id: 'contact-info', name: 'Manage Contact Information', href: '/admin/contact-info', color: 'bg-teal-600 hover:bg-teal-700', icon: '📞', feature: 'settings' },
    { id: 'otp-management', name: 'Manage OTP Duration', href: '/admin/otp-management', color: 'bg-violet-600 hover:bg-violet-700', icon: '🔐', feature: 'settings' },
    { id: 'ai-config', name: 'AI Configuration', href: '/admin/ai-config', color: 'bg-slate-600 hover:bg-slate-700', icon: '🤖', feature: 'settings' },
    { id: 'featured', name: 'Featured Items (Landing)', href: '/admin/featured', color: 'bg-fuchsia-600 hover:bg-fuchsia-700', icon: '⭐', feature: 'settings' },
  ];

  // Filter features based on permissions
  // Viewer Admin: Show ALL features (view-only) EXCEPT gmail-messages (award-messages is now allowed)
  // Custom Admin: Show only features they have permissions for
  // Full Admin / Parent Admin: Show ALL features
  const filteredFeatures = adminFeatures.filter(feature => {
    // Viewer Admin: Hide only gmail-messages, allow award-messages
    if (isViewerAdmin) {
      if (feature.id === 'gmail-messages') {
        return false;
      }
      return true;
    }
    
    // Parent Admin or Full Admin sees everything
    if (isParentAdmin || isFullAdmin) {
      return true;
    }
    
    // Custom Admin: Check specific permissions
    // For award-messages, allow access if they have 'research' permission OR if no feature mapping
    if (feature.id === 'award-messages') {
      // Allow access to award-messages for Custom Admins with research permission
      return canAccessFeature('research') || !feature.feature;
    }
    
    if (!feature.feature) return true; // Show features without feature mapping
    return canAccessFeature(feature.feature);
  });

  if (authLoading || permissionLoading || checkingOTP) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if user has admin access
  // Parent admin: has is_admin flag (even if permissionData is not loaded yet)
  // Child admin: has permission record in permissionData
  const isParentAdminUser = user?.is_admin && !permissionData?.isChildAdmin;
  const hasAdminAccess = isParentAdminUser || 
    user?.is_admin || 
    (permissionData?.hasPermission && permissionData.permissionType);
  
  if (!isAuthenticated || !hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need admin privileges to access this page.</p>
          <a 
            href="/login" 
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // Show OTP verification UI if not verified
  if (!otpVerified) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying admin access...</p>
          </div>
        </div>
        {showOTPModal && (
          <OTPModal
            isOpen={showOTPModal}
            onClose={() => {
              setShowOTPModal(false);
              router.push('/');
            }}
            onVerify={handleOTPVerify}
            userId={user?.id || ''}
            userRole={isFullAdmin ? 'full_admin' : isCustomAdmin ? 'custom_admin' : 'viewer_admin'}
            userEmail={user?.email || ''}
            onResendOTP={handleResendOTP}
          />
        )}
      </>
    );
  }

  // Get permission type badge
  const getPermissionBadge = () => {
    if (isFullAdmin) {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">🛡️ Full Admin</span>;
    }
    if (isCustomAdmin) {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⚙️ Custom Admin</span>;
    }
    if (isViewerAdmin) {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">👁️ Viewer Admin</span>;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <a href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </div>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            {getPermissionBadge()}
          </div>
          <p className="text-gray-600">
            {isViewerAdmin && 'View-only access to all admin features'}
            {isCustomAdmin && 'Custom access based on assigned permissions'}
            {isFullAdmin && 'Full administrative access to all features'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          {filteredFeatures.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No admin features available with your current permissions.</p>
              <p className="text-sm text-gray-500">Contact an administrator to request additional permissions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFeatures.map((feature) => (
                <a
                  key={feature.id}
                  href={feature.href}
                  className={`${feature.color} text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2`}
                >
                  <span className="text-xl">{feature.icon}</span>
                  <span>{feature.name}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
