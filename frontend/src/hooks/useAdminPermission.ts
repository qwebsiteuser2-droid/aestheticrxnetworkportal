import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { adminApi } from '@/lib/api';

interface AdminPermission {
  id: string;
  doctor_id: string;
  permission_type: 'viewer' | 'custom' | 'full';
  permissions: any;
  granted_by: string;
  expires_at?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface AdminPermissionData {
  hasPermission: boolean;
  permission: AdminPermission | null;
  permissionType: 'viewer' | 'custom' | 'full';
  isMainAdmin: boolean;
  isParentAdmin?: boolean;
  isChildAdmin?: boolean;
}

export function useAdminPermission() {
  const { user, isAuthenticated } = useAuth();
  const [permissionData, setPermissionData] = useState<AdminPermissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermission = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      // Check for admin permissions even if is_admin flag is false
      // Users can have admin permissions without the is_admin flag
      try {
        const response = await adminApi.getCurrentUserPermission();
        
        if (response.success) {
          // API returned successfully - check if user has permission
          if (response.data && response.data.hasPermission) {
            // Verify permission is active and not expired
            const permission = response.data.permission;
            if (permission) {
              // Check if permission is active
              if (permission.is_active === false) {
                setPermissionData({
                  hasPermission: false,
                  permission: null,
                  permissionType: 'viewer',
                  isMainAdmin: false,
                  isParentAdmin: false,
                  isChildAdmin: false
                });
                return;
              }
              
              // Check if permission is expired
              if (permission.expires_at) {
                const expiresAt = new Date(permission.expires_at);
                const now = new Date();
                if (now > expiresAt) {
                  setPermissionData({
                    hasPermission: false,
                    permission: null,
                    permissionType: 'viewer',
                    isMainAdmin: false,
                    isParentAdmin: false,
                    isChildAdmin: false
                  });
                  return;
                }
              }
            }
            
            setPermissionData(response.data);
          } else if (response.data && !response.data.hasPermission) {
            // API says no permission, but check is_admin flag as fallback
            if (user.is_admin) {
              setPermissionData({
                hasPermission: true,
                permission: null,
                permissionType: 'full',
                isMainAdmin: true
              });
            } else {
              setPermissionData({
                hasPermission: false,
                permission: null,
                permissionType: 'viewer',
                isMainAdmin: false
              });
            }
          } else {
            // Response structure might be different
            if (user.is_admin) {
              setPermissionData({
                hasPermission: true,
                permission: null,
                permissionType: 'full',
                isMainAdmin: true
              });
            } else {
              setPermissionData({
                hasPermission: false,
                permission: null,
                permissionType: 'viewer',
                isMainAdmin: false
              });
            }
          }
        } else {
          // API returned success: false - permission deleted or expired
          if (response.data && response.data.hasPermission) {
            // Even if hasPermission is true, verify it's active and not expired
            const permission = response.data.permission;
            if (permission) {
              // Check if permission is active
              if (permission.is_active === false) {
                setPermissionData({
                  hasPermission: false,
                  permission: null,
                  permissionType: 'viewer',
                  isMainAdmin: false,
                  isParentAdmin: false,
                  isChildAdmin: false
                });
                return;
              }
              
              // Check if permission is expired
              if (permission.expires_at) {
                const expiresAt = new Date(permission.expires_at);
                const now = new Date();
                if (now > expiresAt) {
                  setPermissionData({
                    hasPermission: false,
                    permission: null,
                    permissionType: 'viewer',
                    isMainAdmin: false,
                    isParentAdmin: false,
                    isChildAdmin: false
                  });
                  return;
                }
              }
            }
            setPermissionData(response.data);
          } else if (user.is_admin) {
            setPermissionData({
              hasPermission: true,
              permission: null,
              permissionType: 'full',
              isMainAdmin: true
            });
          } else {
            setPermissionData({
              hasPermission: false,
              permission: null,
              permissionType: 'viewer',
              isMainAdmin: false
            });
          }
        }
      } catch (err: any) {
        // If user has is_admin flag, treat as main admin even if API fails
        if (user.is_admin) {
          setPermissionData({
            hasPermission: true,
            permission: null,
            permissionType: 'full',
            isMainAdmin: true
          });
        } else {
          // Check if error is 403 (no permission) vs other errors
          if (err.response?.status === 403) {
            setPermissionData({
              hasPermission: false,
              permission: null,
              permissionType: 'viewer',
              isMainAdmin: false
            });
          } else {
            // Other errors - might be temporary, but still set to no permission
            setError(err.response?.data?.message || 'Failed to fetch admin permission');
            setPermissionData({
              hasPermission: false,
              permission: null,
              permissionType: 'viewer',
              isMainAdmin: false
            });
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPermission();
  }, [isAuthenticated, user?.id, user?.email]);

  const hasPermission = (permission: string): boolean => {
    if (!permissionData || !permissionData.hasPermission) {
      return false;
    }

    // Main admin (parent admin) has full access
    if (permissionData.isMainAdmin || permissionData.isParentAdmin) {
      return true;
    }

    // Full admin has all permissions
    if (permissionData.permissionType === 'full') {
      return true;
    }

    // Viewer admin - can view everything (all view permissions)
    if (permissionData.permissionType === 'viewer') {
      // Viewer admin can see all features, but only view permissions
      return permission.startsWith('can_view_') || permission.startsWith('can_export_');
    }

    // Custom admin - check specific permission
    if (permissionData.permissionType === 'custom' && permissionData.permission) {
      return permissionData.permission.permissions[permission] || false;
    }

    return false;
  };

  const canAccessFeature = (feature: string): boolean => {
    // Viewer Admin: Can see ALL features (view-only access to everything)
    if (permissionData?.permissionType === 'viewer') {
      return true;
    }

    // Main admin (parent admin) or Full Admin: Can see ALL features
    if (permissionData?.isMainAdmin || permissionData?.isParentAdmin || permissionData?.permissionType === 'full') {
      return true;
    }

    // Map features to permissions for Custom Admin
    const featurePermissionMap: { [key: string]: string } = {
      'users': 'can_view_users',
      'products': 'can_view_products',
      'orders': 'can_view_orders',
      'research': 'can_view_research',
      'tiers': 'can_view_tiers',
      'signup-ids': 'can_view_signup_ids',
      'reports': 'can_view_reports',
      'settings': 'can_view_settings',
      'permissions': 'can_view_admin_permissions',
      'employees': 'can_view_employees',
      'email-analytics': 'can_view_email_analytics',
      'advertisements': 'can_view_advertisements',
      'leaderboard': 'can_view_leaderboard',
      'hall-of-pride': 'can_view_hall_of_pride',
      'data-export': 'can_export_data',
    };

    const permission = featurePermissionMap[feature];
    if (!permission) {
      // Unknown feature - allow for main/parent admin, deny for others
      return permissionData?.isMainAdmin || permissionData?.isParentAdmin || false;
    }

    // Custom Admin: Check specific permission
    return hasPermission(permission);
  };

  return {
    permissionData,
    loading,
    error,
    hasPermission,
    canAccessFeature,
    isViewerAdmin: permissionData?.permissionType === 'viewer',
    isCustomAdmin: permissionData?.permissionType === 'custom',
    isFullAdmin: permissionData?.permissionType === 'full' || permissionData?.isMainAdmin,
    isParentAdmin: permissionData?.isParentAdmin || false,
    isChildAdmin: permissionData?.isChildAdmin || false,
  };
}

