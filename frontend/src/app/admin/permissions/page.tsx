'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getAccessToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '@/lib/apiConfig';
import { 
  ShieldCheckIcon,
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  EyeIcon,
  CogIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  UserIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

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
  doctor?: {
    doctor_name: string;
    clinic_name: string;
    email: string;
  };
  granted_by_doctor?: {
    doctor_name: string;
  };
}

interface Doctor {
  id: string;
  doctor_name: string;
  clinic_name: string;
  email: string;
  is_admin: boolean;
}

export default function AdminPermissionsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isViewerAdmin, permissionData, loading: permissionLoading, isParentAdmin } = useAdminPermission();
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<AdminPermission | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [permissionType, setPermissionType] = useState<'viewer' | 'custom' | 'full'>('viewer');
  const [customPermissions, setCustomPermissions] = useState<any>({});
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showUserSearch, setShowUserSearch] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [permissionToDelete, setPermissionToDelete] = useState<string | null>(null);

  // Check if user is admin - wait for auth and permission data to load
  useEffect(() => {
    // Wait for auth and permission data to finish loading
    if (authLoading || permissionLoading) {
      return;
    }

    // Check authentication
    if (isAuthenticated === false) {
      router.push('/login');
      return;
    }
    
    // Check if user has admin access
    // Parent admin: has is_admin flag OR isParentAdmin from permissionData
    // Child admin: has permission record in permissionData
    const isParentAdminUser = user?.is_admin && !permissionData?.isChildAdmin;
    const hasAdminAccess = isParentAdminUser || 
      user?.is_admin || 
      (permissionData?.hasPermission === true) ||
      (permissionData?.permissionType && ['viewer', 'custom', 'full'].includes(permissionData.permissionType));
    
    if (!hasAdminAccess) {
      router.push('/');
      return;
    }
    
    // User has admin access, fetch data
    if (hasAdminAccess) {
      fetchData();
    }
  }, [authLoading, permissionLoading, isAuthenticated, user, permissionData, isParentAdmin, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = getAccessToken();
      
      if (!token) {
        // Redirect to login if no token
        const mockDoctors = [
          {
            id: '1',
            doctor_name: 'Dr. John Smith',
            clinic_name: 'City Medical Center',
            email: 'john.smith@citymedical.com',
            is_admin: false
          },
          {
            id: '2',
            doctor_name: 'Dr. Sarah Johnson',
            clinic_name: 'Health Plus Clinic',
            email: 'sarah.johnson@healthplus.com',
            is_admin: false
          },
          {
            id: '3',
            doctor_name: 'Dr. Michael Brown',
            clinic_name: 'Family Care Center',
            email: 'michael.brown@familycare.com',
            is_admin: false
          }
        ];
        
        setPermissions([]);
        setAvailableDoctors(mockDoctors);
        setAllDoctors(mockDoctors);
        setIsLoading(false);
        return;
      }
      
      // Fetch admin permissions
      const permissionsResponse = await fetch(`${getApiUrl()}/admin/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!permissionsResponse.ok) {
        throw new Error(`Permissions API error: ${permissionsResponse.status}`);
      }
      
      const permissionsResult = await permissionsResponse.json();
      if (permissionsResult.success) {
        setPermissions(permissionsResult.data || []);
      } else {
        console.error('Permissions API error:', permissionsResult.message);
        toast.error(permissionsResult.message || 'Failed to fetch permissions');
      }

      // Fetch available doctors
      const doctorsResponse = await fetch(`${getApiUrl()}/admin/available-doctors`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (doctorsResponse.ok) {
        const doctorsResult = await doctorsResponse.json();
        if (doctorsResult.success) {
          setAvailableDoctors(doctorsResult.data || []);
        }
      }

      // Fetch all doctors for search
      const allDoctorsResponse = await fetch(`${getApiUrl()}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (allDoctorsResponse.ok) {
        const allDoctorsResult = await allDoctorsResponse.json();
        if (allDoctorsResult.success) {
          setAllDoctors(allDoctorsResult.data || []);
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Removed duplicate fetchData call - now handled in the auth check useEffect

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-dropdown')) {
        setShowUserSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot create admin permissions.');
      return;
    }
    
    if (!selectedDoctor) {
      toast.error('Please select a doctor');
      return;
    }

    const token = getAccessToken();
    if (!token) {
      toast.error('Demo mode: This is a demonstration. Please login to create real permissions.');
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/admin/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doctor_id: selectedDoctor,
          permission_type: permissionType,
          permissions: permissionType === 'custom' ? customPermissions : undefined,
          expires_at: expiresAt || null,
          notes: notes || null
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        toast.error(result.message || 'Failed to create permission');
      }
    } catch (error) {
      console.error('Error creating permission:', error);
      toast.error('Failed to create permission');
    }
  };

  const handleUpdatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot update admin permissions.');
      return;
    }
    
    if (!selectedPermission) return;

    try {
      const response = await fetch(`${getApiUrl()}/admin/permissions/${selectedPermission.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doctor_id: selectedPermission.doctor_id,
          permission_type: permissionType,
          permissions: permissionType === 'custom' ? customPermissions : undefined,
          expires_at: expiresAt || null,
          notes: notes || null
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        toast.error(result.message || 'Failed to update permission');
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Failed to update permission');
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot delete admin permissions.');
      return;
    }
    setPermissionToDelete(permissionId);
    setShowDeleteModal(true);
  };

  const confirmDeletePermission = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot delete admin permissions.');
      return;
    }
    if (!permissionToDelete) return;

    try {
      const response = await fetch(`${getApiUrl()}/admin/permissions/${permissionToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Admin permission deleted successfully');
        fetchData();
        setShowDeleteModal(false);
        setPermissionToDelete(null);
      } else {
        toast.error('Failed to delete admin permission');
      }
    } catch (error) {
      console.error('Error deleting permission:', error);
      toast.error('Failed to delete admin permission');
    }
  };

  const resetForm = () => {
    setSelectedPermission(null);
    setSelectedDoctor('');
    setPermissionType('viewer');
    setCustomPermissions({});
    setExpiresAt('');
    setNotes('');
    setSearchTerm('');
    setShowUserSearch(false);
  };

  // Filter doctors based on search term
  const filteredDoctors = allDoctors.filter(doctor => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      doctor.doctor_name?.toLowerCase().includes(searchLower) ||
      doctor.clinic_name?.toLowerCase().includes(searchLower) ||
      doctor.email?.toLowerCase().includes(searchLower) ||
      doctor.id?.toLowerCase().includes(searchLower)
    );
  });

  // Get selected doctor info
  const selectedDoctorInfo = allDoctors.find(d => d.id === selectedDoctor);

  const openModal = (permission?: AdminPermission) => {
    if (permission) {
      setSelectedPermission(permission);
      setSelectedDoctor(permission.doctor_id);
      setPermissionType(permission.permission_type);
      setCustomPermissions(permission.permissions || {});
      setExpiresAt(permission.expires_at ? permission.expires_at.split('T')[0] : '');
      setNotes(permission.notes || '');
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const getPermissionTypeColor = (type: string) => {
    switch (type) {
      case 'full': return 'bg-red-100 text-red-800';
      case 'custom': return 'bg-yellow-100 text-yellow-800';
      case 'viewer': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPermissionTypeIcon = (type: string) => {
    switch (type) {
      case 'full': return <ShieldCheckIcon className="w-4 h-4" />;
      case 'custom': return <CogIcon className="w-4 h-4" />;
      case 'viewer': return <EyeIcon className="w-4 h-4" />;
      default: return <UserPlusIcon className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">Loading admin permissions...</p>
          <p className="text-sm text-gray-500">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  // Show loading state if authentication or permission data is still being checked
  if (authLoading || permissionLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">Loading admin permissions...</p>
          <p className="text-sm text-gray-500">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <button
                  onClick={() => router.push('/admin')}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                  title="Back to Admin Dashboard"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Back</span>
                </button>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Permissions</h1>
              <p className="text-gray-600 mt-2">
                Manage admin access levels and permissions for users
              </p>
            </div>
            {isViewerAdmin ? (
              <button
                disabled
                className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed flex items-center gap-2"
              >
                <UserPlusIcon className="w-5 h-5" />
                Add Admin Permission (View Only)
              </button>
            ) : (
              <button
                onClick={() => openModal()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <UserPlusIcon className="w-5 h-5" />
                Add Admin Permission
              </button>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Admin Permissions ({permissions.length})
              </h2>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search permissions..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      // You can add search functionality here if needed
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permission Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Granted By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {permissions.map((permission) => (
                  <tr key={permission.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {permission.doctor?.doctor_name || 'Unknown Doctor'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {permission.doctor?.clinic_name || 'Unknown Clinic'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {permission.doctor?.email || 'Unknown Email'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getPermissionTypeIcon(permission.permission_type)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPermissionTypeColor(permission.permission_type)}`}>
                          {permission.permission_type.charAt(0).toUpperCase() + permission.permission_type.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {permission.granted_by_doctor?.doctor_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {permission.expires_at 
                        ? new Date(permission.expires_at).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        permission.is_active 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {permission.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {isViewerAdmin ? (
                        <span className="text-gray-400 text-xs">View Only</span>
                      ) : (
                        <>
                          <button
                            onClick={() => openModal(permission)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Edit Permission"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePermission(permission.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Permission"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {permissions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <ShieldCheckIcon className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">No admin permissions found</p>
                        <p className="text-sm text-gray-500 mb-4">
                          Add admin permissions to grant users access to admin features
                        </p>
                        {isViewerAdmin ? (
                          <button
                            disabled
                            className="bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed"
                          >
                            Add First Permission (View Only)
                          </button>
                        ) : (
                          <button
                            onClick={() => openModal()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                          >
                            Add First Permission
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedPermission ? 'Edit Admin Permission' : 'Add Admin Permission'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={selectedPermission ? handleUpdatePermission : handleCreatePermission}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Doctor *
                      </label>
                      
                      {selectedDoctorInfo ? (
                        <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <UserIcon className="w-5 h-5 text-gray-400 mr-3" />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {selectedDoctorInfo.doctor_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {selectedDoctorInfo.clinic_name} • {selectedDoctorInfo.email}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDoctor('');
                                setSearchTerm('');
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative search-dropdown">
                          <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => {
                                if (isViewerAdmin) return;
                                setSearchTerm(e.target.value);
                                setShowUserSearch(true);
                              }}
                              onFocus={() => {
                                if (isViewerAdmin) return;
                                setShowUserSearch(true);
                              }}
                              placeholder="Search by name, clinic, email, or ID..."
                              className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              readOnly={isViewerAdmin}
                              disabled={isViewerAdmin}
                            />
                          </div>
                          
                          {showUserSearch && searchTerm && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {filteredDoctors.length > 0 ? (
                                filteredDoctors.slice(0, 10).map((doctor) => (
                                  <button
                                    key={doctor.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedDoctor(doctor.id);
                                      setSearchTerm('');
                                      setShowUserSearch(false);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="flex items-center">
                                      <UserIcon className="w-4 h-4 text-gray-400 mr-3" />
                                      <div>
                                        <div className="font-medium text-gray-900">
                                          {doctor.doctor_name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {doctor.clinic_name} • {doctor.email}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          ID: {doctor.id}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-gray-500 text-center">
                                  No doctors found matching "{searchTerm}"
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {!selectedDoctor && (
                        <p className="text-sm text-gray-500 mt-1">
                          Search and select a doctor to grant admin permissions
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Permission Type *
                      </label>
                      <select
                        value={permissionType}
                        onChange={(e) => {
                          if (isViewerAdmin) return;
                          setPermissionType(e.target.value as 'viewer' | 'custom' | 'full');
                        }}
                        required
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        disabled={isViewerAdmin}
                      >
                        <option value="viewer">👁️ Viewer - Read-only access to all features</option>
                        <option value="custom">⚙️ Custom - Select specific permissions below</option>
                        <option value="full">🛡️ Full Admin - Complete access to everything</option>
                      </select>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        {permissionType === 'viewer' && (
                          <p>• Can view all data but cannot edit, delete, or create anything</p>
                        )}
                        {permissionType === 'custom' && (
                          <p>• Choose exactly which features this admin can access</p>
                        )}
                        {permissionType === 'full' && (
                          <p>• Complete administrative access equal to main admin</p>
                        )}
                      </div>
                    </div>

                    {permissionType === 'custom' && (
                      <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Custom Permissions</h3>
                        <div className="space-y-4">
                          {/* User Management */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">👥 User Management</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                'can_view_users', 'can_edit_users', 'can_delete_users', 'can_approve_users',
                                'can_deactivate_users', 'can_manage_user_profiles', 'can_view_user_activity'
                              ].map((permission) => (
                                <label key={permission} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={customPermissions[permission] || false}
                                    onChange={(e) => {
                                      if (isViewerAdmin) return;
                                      setCustomPermissions((prev: any) => ({
                                        ...prev,
                                        [permission]: e.target.checked
                                      }));
                                    }}
                                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isViewerAdmin}
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {permission.replace('can_', '').replace(/_/g, ' ')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Employee Management */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">👷 Employee Management</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                'can_view_employees', 'can_create_employees', 'can_edit_employees', 'can_delete_employees',
                                'can_approve_employees', 'can_assign_deliveries', 'can_manage_employee_schedules'
                              ].map((permission) => (
                                <label key={permission} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={customPermissions[permission] || false}
                                    onChange={(e) => {
                                      if (isViewerAdmin) return;
                                      setCustomPermissions((prev: any) => ({
                                        ...prev,
                                        [permission]: e.target.checked
                                      }));
                                    }}
                                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isViewerAdmin}
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {permission.replace('can_', '').replace(/_/g, ' ')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Order & Delivery Management */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">🛒 Order & Delivery</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                'can_view_orders', 'can_edit_orders', 'can_cancel_orders', 'can_assign_orders',
                                'can_view_delivery_tracking', 'can_manage_delivery_status', 'can_view_delivery_reports',
                                'can_export_order_data', 'can_view_payment_records'
                              ].map((permission) => (
                                <label key={permission} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={customPermissions[permission] || false}
                                    onChange={(e) => {
                                      if (isViewerAdmin) return;
                                      setCustomPermissions((prev: any) => ({
                                        ...prev,
                                        [permission]: e.target.checked
                                      }));
                                    }}
                                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isViewerAdmin}
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {permission.replace('can_', '').replace(/_/g, ' ')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Email Management */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">📧 Email Management</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                'can_view_email_analytics', 'can_manage_email_campaigns', 'can_send_emails', 'can_manage_email_templates',
                                'can_view_email_logs', 'can_manage_gmail_messages', 'can_configure_email_settings',
                                'can_view_email_monitoring', 'can_manage_auto_emails', 'can_configure_email_delivery'
                              ].map((permission) => (
                                <label key={permission} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={customPermissions[permission] || false}
                                    onChange={(e) => {
                                      if (isViewerAdmin) return;
                                      setCustomPermissions((prev: any) => ({
                                        ...prev,
                                        [permission]: e.target.checked
                                      }));
                                    }}
                                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isViewerAdmin}
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {permission.replace('can_', '').replace(/_/g, ' ')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Product Management */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">📦 Products & Inventory</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                'can_view_products', 'can_create_products', 'can_edit_products', 'can_delete_products',
                                'can_manage_inventory', 'can_update_stock', 'can_manage_product_categories'
                              ].map((permission) => (
                                <label key={permission} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={customPermissions[permission] || false}
                                    onChange={(e) => {
                                      if (isViewerAdmin) return;
                                      setCustomPermissions((prev: any) => ({
                                        ...prev,
                                        [permission]: e.target.checked
                                      }));
                                    }}
                                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isViewerAdmin}
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {permission.replace('can_', '').replace(/_/g, ' ')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Research Management */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">📚 Research Papers</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                'can_view_research', 'can_approve_research', 'can_reject_research', 'can_delete_research',
                                'can_manage_benefits', 'can_manage_rewards', 'can_view_research_reports',
                                'can_moderate_research', 'can_manage_research_settings'
                              ].map((permission) => (
                                <label key={permission} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={customPermissions[permission] || false}
                                    onChange={(e) => {
                                      if (isViewerAdmin) return;
                                      setCustomPermissions((prev: any) => ({
                                        ...prev,
                                        [permission]: e.target.checked
                                      }));
                                    }}
                                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isViewerAdmin}
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {permission.replace('can_', '').replace(/_/g, ' ')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Leaderboard & Tiers */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">🏆 Leaderboard & Tiers</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                'can_view_tiers', 'can_edit_tiers', 'can_manage_tier_configs', 'can_view_leaderboard',
                                'can_manage_leaderboard', 'can_view_hall_of_pride', 'can_manage_hall_of_pride',
                                'can_issue_certificates', 'can_manage_certificates'
                              ].map((permission) => (
                                <label key={permission} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={customPermissions[permission] || false}
                                    onChange={(e) => {
                                      if (isViewerAdmin) return;
                                      setCustomPermissions((prev: any) => ({
                                        ...prev,
                                        [permission]: e.target.checked
                                      }));
                                    }}
                                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isViewerAdmin}
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {permission.replace('can_', '').replace(/_/g, ' ')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Advertisement Management */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">📺 Advertisements</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                'can_view_advertisements', 'can_create_advertisements', 'can_edit_advertisements', 'can_delete_advertisements',
                                'can_manage_video_ads', 'can_manage_ad_configs', 'can_view_ad_analytics', 'can_manage_ad_schedules'
                              ].map((permission) => (
                                <label key={permission} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={customPermissions[permission] || false}
                                    onChange={(e) => {
                                      if (isViewerAdmin) return;
                                      setCustomPermissions((prev: any) => ({
                                        ...prev,
                                        [permission]: e.target.checked
                                      }));
                                    }}
                                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isViewerAdmin}
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {permission.replace('can_', '').replace(/_/g, ' ')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Financial & Debt Management */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">💰 Financial & Debt</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                'can_view_financial_data', 'can_manage_debt_limits', 'can_override_debt', 'can_view_wallets',
                                'can_manage_payments', 'can_view_payment_history', 'can_manage_debt_thresholds'
                              ].map((permission) => (
                                <label key={permission} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={customPermissions[permission] || false}
                                    onChange={(e) => {
                                      if (isViewerAdmin) return;
                                      setCustomPermissions((prev: any) => ({
                                        ...prev,
                                        [permission]: e.target.checked
                                      }));
                                    }}
                                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isViewerAdmin}
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {permission.replace('can_', '').replace(/_/g, ' ')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* System & Settings */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">⚙️ System & Settings</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                'can_view_settings', 'can_edit_settings', 'can_view_signup_ids', 'can_create_signup_ids',
                                'can_delete_signup_ids', 'can_manage_otp_settings', 'can_manage_backgrounds',
                                'can_manage_contact_info', 'can_manage_gmail_templates', 'can_manage_ai_models',
                                'can_manage_api_tokens', 'can_manage_award_messages', 'can_manage_hall_of_pride'
                              ].map((permission) => (
                                <label key={permission} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={customPermissions[permission] || false}
                                    onChange={(e) => {
                                      if (isViewerAdmin) return;
                                      setCustomPermissions((prev: any) => ({
                                        ...prev,
                                        [permission]: e.target.checked
                                      }));
                                    }}
                                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isViewerAdmin}
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {permission.replace('can_', '').replace(/_/g, ' ')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Reports & Analytics */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">📊 Reports & Analytics</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                'can_view_reports', 'can_export_data', 'can_view_analytics', 'can_view_dashboards',
                                'can_generate_reports', 'can_view_user_activity', 'can_view_system_logs'
                              ].map((permission) => (
                                <label key={permission} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={customPermissions[permission] || false}
                                    onChange={(e) => {
                                      if (isViewerAdmin) return;
                                      setCustomPermissions((prev: any) => ({
                                        ...prev,
                                        [permission]: e.target.checked
                                      }));
                                    }}
                                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isViewerAdmin}
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {permission.replace('can_', '').replace(/_/g, ' ')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Admin Permissions Management */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">🔐 Admin Permissions</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                'can_view_admin_permissions', 'can_create_admin_permissions', 'can_edit_admin_permissions',
                                'can_delete_admin_permissions', 'can_manage_admin_access'
                              ].map((permission) => (
                                <label key={permission} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={customPermissions[permission] || false}
                                    onChange={(e) => {
                                      if (isViewerAdmin) return;
                                      setCustomPermissions((prev: any) => ({
                                        ...prev,
                                        [permission]: e.target.checked
                                      }));
                                    }}
                                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isViewerAdmin}
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {permission.replace('can_', '').replace(/_/g, ' ')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expires At (Optional)
                      </label>
                      <input
                        type="date"
                        value={expiresAt}
                        onChange={(e) => {
                          if (isViewerAdmin) return;
                          setExpiresAt(e.target.value);
                        }}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        readOnly={isViewerAdmin}
                        disabled={isViewerAdmin}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => {
                          if (isViewerAdmin) return;
                          setNotes(e.target.value);
                        }}
                        rows={3}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="Add any notes about this permission..."
                        readOnly={isViewerAdmin}
                        disabled={isViewerAdmin}
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    {isViewerAdmin ? (
                      <button
                        type="button"
                        disabled
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
                      >
                        {selectedPermission ? 'Update Permission (View Only)' : 'Create Permission (View Only)'}
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        {selectedPermission ? 'Update Permission' : 'Create Permission'}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDeleteModal(false)} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                  Delete Admin Permission
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  Are you sure you want to delete this admin permission? This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setPermissionToDelete(null);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeletePermission}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
