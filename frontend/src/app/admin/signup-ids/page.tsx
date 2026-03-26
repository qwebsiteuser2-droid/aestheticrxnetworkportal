'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getAccessToken } from '@/lib/auth';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';

interface SignupId {
  id: string;
  signup_id: string;
  is_used: boolean;
  used_by_email?: string;
  used_at?: string;
  created_at: string;
}

export default function SignupIdsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [signupIds, setSignupIds] = useState<SignupId[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'used'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newSignupId, setNewSignupId] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [signupIdToDelete, setSignupIdToDelete] = useState<{ id: string; signupId: string } | null>(null);

  // Get admin permissions
  const { isViewerAdmin, isFullAdmin, permissionData, loading: permissionLoading } = useAdminPermission();

  useEffect(() => {
    // Check authentication - allow Viewer Admins (child admins) to access
    if (!authLoading && !permissionLoading) {
      const hasAdminAccess = user?.is_admin || 
        (permissionData?.hasPermission === true) || 
        (permissionData?.permissionType && ['viewer', 'custom', 'full'].includes(permissionData.permissionType));
      
      if (!isAuthenticated || !hasAdminAccess) {
        router.push('/login');
        return;
      }
      fetchSignupIds();
    }
  }, [authLoading, permissionLoading, isAuthenticated, user, permissionData, router]);

  const fetchSignupIds = async () => {
    try {
      const token = getAccessToken();
      const response = await api.get('/admin/signup-ids', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setSignupIds(response.data.data);
      } else {
        toast.error('Failed to fetch signup IDs');
      }
    } catch (error: unknown) {
      console.error('Error fetching signup IDs:', error);
      toast.error('Error loading signup IDs');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSignupId = async () => {
    // Prevent adding for viewer admin
    if (isViewerAdmin) {
      toast.error('You have view-only access. Cannot add signup IDs.');
      return;
    }

    if (!newSignupId.trim()) {
      toast.error('Please enter a signup ID');
      return;
    }

    if (!/^\d{5}$/.test(newSignupId)) {
      toast.error('Signup ID must be exactly 5 digits');
      return;
    }

    try {
      const token = getAccessToken();
      const response = await api.post('/admin/signup-ids', { signup_id: newSignupId }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Signup ID added successfully');
        setNewSignupId('');
        fetchSignupIds();
      } else {
        toast.error(response.data.message || 'Failed to add signup ID');
      }
    } catch (error: unknown) {
      console.error('Error adding signup ID:', error);
      toast.error('Error adding signup ID');
    }
  };

  const handleDeleteClick = (id: string, signupId: string) => {
    // Prevent deleting for viewer admin
    if (isViewerAdmin) {
      toast.error('You have view-only access. Cannot delete signup IDs.');
      return;
    }

    setSignupIdToDelete({ id, signupId });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!signupIdToDelete) return;

    try {
      const token = getAccessToken();
      const response = await api.delete(`/admin/signup-ids/${signupIdToDelete.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Signup ID deleted successfully');
        setShowDeleteModal(false);
        setSignupIdToDelete(null);
        fetchSignupIds();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to delete signup ID');
      }
    } catch (error: unknown) {
      console.error('Error deleting signup ID:', error);
      toast.error('Error deleting signup ID');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSignupIdToDelete(null);
  };

  const filteredSignupIds = (signupIds || []).filter(signupId => {
    const matchesFilter = filter === 'all' || 
      (filter === 'available' && !signupId.is_used) ||
      (filter === 'used' && signupId.is_used);
    
    const matchesSearch = searchTerm === '' ||
      signupId.signup_id.includes(searchTerm) ||
      (signupId.used_by_email && signupId.used_by_email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{authLoading ? 'Checking authentication...' : 'Loading signup IDs...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Signup ID Management</h1>
                {isViewerAdmin && (
                  <div className="flex items-center mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      👁️ View Only Mode
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add New Signup ID */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Signup ID</h2>
          {isFullAdmin ? (
            <>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Enter 5-digit signup ID (e.g., 12345)"
                  value={newSignupId}
                  onChange={(e) => setNewSignupId(e.target.value)}
                  maxLength={5}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleAddSignupId}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  disabled={isViewerAdmin}
                >
                  Add ID
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Signup IDs must be exactly 5 digits and will be used by doctors during registration.
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-gray-400 text-sm">View Only - Cannot add signup IDs</div>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All IDs ({signupIds?.length || 0})
              </button>
              <button
                onClick={() => setFilter('available')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'available'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Available ({(signupIds || []).filter(id => !id.is_used).length})
              </button>
              <button
                onClick={() => setFilter('used')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'used'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Used ({(signupIds || []).filter(id => id.is_used).length})
              </button>
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by signup ID or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Signup IDs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signup ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Used By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Used At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  {isFullAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSignupIds.map((signupId) => (
                  <tr key={signupId.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {signupId.signup_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        signupId.is_used 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {signupId.is_used ? 'Used' : 'Available'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {signupId.used_by_email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {signupId.used_at ? new Date(signupId.used_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(signupId.created_at).toLocaleDateString()}
                    </td>
                    {isFullAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {!signupId.is_used && (
                          <button
                            onClick={() => handleDeleteClick(signupId.id, signupId.signup_id)}
                            className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            title="Delete signup ID"
                          >
                            Delete
                          </button>
                        )}
                        {signupId.is_used && (
                          <span className="text-gray-400 text-xs">Cannot delete used ID</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredSignupIds.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No signup IDs found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'No signup IDs match the current filter.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && signupIdToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Signup ID
              </h3>
              <button
                onClick={handleDeleteCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-4">
                    Are you sure you want to delete signup ID <span className="font-semibold text-gray-900">"{signupIdToDelete.signupId}"</span>?
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Warning:</strong> This action cannot be undone. The signup ID will be permanently removed from the system.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Delete Signup ID
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
