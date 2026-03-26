'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
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
  UserIcon
} from '@heroicons/react/24/outline';

interface Doctor {
  id: string;
  doctor_name: string;
  clinic_name: string;
  email: string;
  is_admin: boolean;
}

interface AdminPermission {
  id: string;
  doctor_id: string;
  permission_type: 'viewer' | 'custom' | 'full';
  permissions: { [key: string]: boolean };
  granted_by: string;
  expires_at?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  doctor?: Doctor;
  granted_by_doctor?: {
    doctor_name: string;
  };
}

export default function AdminPermissionsDemoPage() {
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<AdminPermission | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [permissionType, setPermissionType] = useState<'viewer' | 'custom' | 'full'>('viewer');
  const [customPermissions, setCustomPermissions] = useState<any>({});
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showUserSearch, setShowUserSearch] = useState<boolean>(false);

  // Mock data for demonstration
  useEffect(() => {
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
      },
      {
        id: '4',
        doctor_name: 'Dr. Emily Davis',
        clinic_name: 'Metro Health Clinic',
        email: 'emily.davis@metrohealth.com',
        is_admin: false
      },
      {
        id: '5',
        doctor_name: 'Dr. Robert Wilson',
        clinic_name: 'Central Medical Group',
        email: 'robert.wilson@centralmedical.com',
        is_admin: false
      }
    ];

    const mockPermissions = [
      {
        id: '1',
        doctor_id: '1',
        permission_type: 'viewer' as const,
        permissions: {} as { [key: string]: boolean },
        granted_by: 'admin',
        expires_at: '2025-12-31',
        notes: 'Viewer access for research review',
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        doctor: mockDoctors[0],
        granted_by_doctor: { doctor_name: 'Admin User' }
      },
      {
        id: '2',
        doctor_id: '2',
        permission_type: 'custom' as const,
        permissions: {
          can_view_users: true,
          can_edit_users: false,
          can_view_research: true,
          can_approve_research: true
        },
        granted_by: 'admin',
        expires_at: undefined,
        notes: 'Custom permissions for research management',
        is_active: true,
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        doctor: mockDoctors[1],
        granted_by_doctor: { doctor_name: 'Admin User' }
      }
    ];

    setPermissions(mockPermissions);
    setAvailableDoctors(mockDoctors);
    setAllDoctors(mockDoctors);
  }, []);

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

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDoctor) {
      toast.error('Please select a doctor');
      return;
    }

    // Demo mode - just show success message
    toast.success('Demo: Admin permission would be created successfully!');
    setShowModal(false);
    resetForm();
  };

  const handleUpdatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPermission) return;

    // Demo mode - just show success message
    toast.success('Demo: Admin permission would be updated successfully!');
    setShowModal(false);
    resetForm();
  };

  const handleDeletePermission = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admin permission?')) return;
    
    // Demo mode - just show success message
    toast.success('Demo: Admin permission would be deleted successfully!');
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Permission Management</h1>
          <p className="text-gray-600 mt-2">
            🎯 <strong>DEMO MODE:</strong> This is a demonstration of the admin permissions interface with enhanced search functionality.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Admin Permissions ({permissions.length})
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                List of all assigned admin roles and their access levels.
              </p>
            </div>
            <button
              onClick={() => openModal()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <UserPlusIcon className="w-4 h-4" />
              Add Admin Permission
            </button>
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Granted By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {permissions.map((perm) => (
                  <tr key={perm.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {perm.doctor?.doctor_name || 'Unknown Doctor'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {perm.doctor?.clinic_name || 'Unknown Clinic'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPermissionTypeColor(perm.permission_type)}`}>
                        {getPermissionTypeIcon(perm.permission_type)}
                        <span className="ml-1">{perm.permission_type.charAt(0).toUpperCase() + perm.permission_type.slice(1)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${perm.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {perm.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {perm.granted_by_doctor?.doctor_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {perm.expires_at ? new Date(perm.expires_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openModal(perm)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                        title="Edit Permission"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePermission(perm.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Permission"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {permissions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <ShieldCheckIcon className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">No admin permissions assigned</p>
                        <p className="text-sm text-gray-500 mb-4">
                          Click "Add Admin Permission" to grant access to a doctor.
                        </p>
                        <button
                          onClick={() => openModal()}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                          Add Admin Permission
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Permission Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full p-6">
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
                                setSearchTerm(e.target.value);
                                setShowUserSearch(true);
                              }}
                              onFocus={() => setShowUserSearch(true)}
                              placeholder="Search by name, clinic, email, or ID..."
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        onChange={(e) => setPermissionType(e.target.value as 'viewer' | 'custom' | 'full')}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Custom Permissions</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                          {[
                            { key: 'can_view_users', label: 'View Users' },
                            { key: 'can_edit_users', label: 'Edit Users' },
                            { key: 'can_view_products', label: 'View Products' },
                            { key: 'can_create_products', label: 'Create Products' },
                            { key: 'can_view_research', label: 'View Research' },
                            { key: 'can_approve_research', label: 'Approve Research' },
                            { key: 'can_manage_benefits', label: 'Manage Benefits' },
                            { key: 'can_view_reports', label: 'View Reports' },
                            { key: 'can_export_data', label: 'Export Data' }
                          ].map((option) => (
                            <div key={option.key} className="flex items-center">
                              <input
                                type="checkbox"
                                id={option.key}
                                checked={!!customPermissions[option.key]}
                                onChange={(e) => {
                                  setCustomPermissions((prev: any) => ({
                                    ...prev,
                                    [option.key]: e.target.checked
                                  }));
                                }}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor={option.key} className="ml-2 text-sm text-gray-700">
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expires At (Optional)
                        </label>
                        <input
                          type="date"
                          value={expiresAt}
                          onChange={(e) => setExpiresAt(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add any notes about this permission assignment..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      {selectedPermission ? 'Update Permission' : 'Add Permission'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
