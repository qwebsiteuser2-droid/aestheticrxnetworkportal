'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getAccessToken } from '@/lib/auth';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ActionSuccessModal from '@/components/modals/ActionSuccessModal';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

interface User {
  id: string;
  doctor_id?: number;
  email: string;
  doctor_name: string;
  clinic_name?: string;
  whatsapp?: string;
  is_approved: boolean;
  is_admin: boolean;
  is_deactivated: boolean;
  created_at: string;
  approved_at?: string;
  user_type?: 'doctor' | 'regular_user' | 'employee';
}

export default function UsersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'doctors' | 'regular_users' | 'employees'>('doctors');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'deactivated'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Hide specific user from UI (keep in database, just hide from display)
  const hiddenUserEmail = 'asadkhanbloch4949@gmail.com';
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState('');
  const [userToDeactivate, setUserToDeactivate] = useState<{ id: string; name: string } | null>(null);
  const [userToReactivate, setUserToReactivate] = useState<{ id: string; name: string } | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; email: string } | null>(null);
  const [userToReject, setUserToReject] = useState<{ id: string; name: string; email: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{ title: string; message: string; type: 'delete' | 'deactivate' | 'reactivate' } | null>(null);

  useEffect(() => {
    // Check authentication
    if (!authLoading) {
      if (!isAuthenticated || !user?.is_admin) {
        router.push('/login');
        return;
      }
      fetchUsers();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchUsers = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }
      
      console.log('👥 Fetching users with token:', token.substring(0, 20) + '...');
      
      // Use centralized API instance
      console.log('👥 Fetching users...');
      
      const response = await api.get('/admin/users');

      console.log('👥 Response status:', response.status);
      console.log('👥 Response success:', response.data.success);

      if (response.data.success) {
        const data = response.data;
        console.log('👥 Users data:', data);
        const usersData = data.data || [];
        
        // Debug: Log user types
        console.log('👥 User types breakdown:', {
          doctors: usersData.filter((u: User) => u.user_type === 'doctor').length,
          regular_users: usersData.filter((u: User) => u.user_type === 'regular_user').length,
          employees: usersData.filter((u: User) => u.user_type === 'employee').length,
          undefined: usersData.filter((u: User) => !u.user_type).length,
          all: usersData.length
        });
        
        // Ensure user_type is set correctly - if missing, infer from other fields
        const processedUsers = usersData.map((user: User) => {
          // If user_type is missing, try to infer it
          if (!user.user_type) {
            // Employees typically have a specific pattern or field
            // Regular users might not have doctor_id
            // For now, we'll keep it as is and let the backend handle it
            console.warn('👥 User missing user_type:', user.email, user);
          }
          return user;
        });
        
        // Filter out the specific user from UI (keep in database, just hide from display)
        // Hide user with email: asadkhanbloch4949@gmail.com
        const filteredUsersForUI = processedUsers.filter((user: User) => {
          return user.email !== 'asadkhanbloch4949@gmail.com';
        });
        
        setUsers(filteredUsersForUI);
      } else {
        const errorData = await response.json();
        console.error('👥 Error fetching users:', errorData);
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('👥 Error fetching users:', error);
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }
      
      // Use centralized API instance
      const response = await api.post(`/admin/users/${userId}/approve`);

      if (response.data.success) {
        toast.success('User approved successfully');
        fetchUsers(); // Refresh the list
      } else {
        toast.error(response.data.message || 'Failed to approve user');
      }
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Error approving user');
    }
  };

  const handleRejectClick = (userId: string, userName: string, userEmail: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot reject users.');
      return;
    }
    setUserToReject({ id: userId, name: userName, email: userEmail });
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot reject users.');
      setShowRejectModal(false);
      setUserToReject(null);
      return;
    }

    if (!userToReject) return;

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }
      
      // Use centralized API instance
      const response = await api.post(`/admin/users/${userToReject.id}/reject`, {
        reason: rejectionReason
      });

      if (response.data.success) {
        toast.success('User rejected successfully');
        setShowRejectModal(false);
        setUserToReject(null);
        fetchUsers(); // Refresh the list
      } else {
        toast.error(response.data.message || 'Failed to reject user');
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Error rejecting user');
    }
  };

  const handleDeactivateClick = (userId: string, userName: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot deactivate users.');
      return;
    }
    setUserToDeactivate({ id: userId, name: userName });
    setShowDeactivateModal(true);
  };

  const handleDeactivate = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot deactivate users.');
      setShowDeactivateModal(false);
      setUserToDeactivate(null);
      return;
    }
    
    if (!userToDeactivate) return;

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }
      
      console.log('🚫 Attempting to deactivate user:', { userId: userToDeactivate.id, userName: userToDeactivate.name, token: token.substring(0, 20) + '...' });
      
      const apiUrl = `${getApiUrl()}/admin/users/${userToDeactivate.id}/deactivate`;
      console.log('🚫 API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('🚫 Response status:', response.status);
      console.log('🚫 Response ok:', response.ok);

      if (response.ok) {
        const responseData = await response.json();
        console.log('🚫 Success response:', responseData);
        setShowDeactivateModal(false);
        setUserToDeactivate(null);
        setSuccessModalData({
          title: 'User Deactivated',
          message: 'The user has been deactivated successfully. They will no longer have access to their account, but all their data remains in the system.',
          type: 'deactivate'
        });
        setShowSuccessModal(true);
        fetchUsers(); // Refresh the list
      } else {
        const errorData = await response.json();
        console.error('🚫 Error response:', errorData);
        toast.error(errorData.message || 'Failed to deactivate user');
      }
    } catch (error) {
      console.error('🚫 Error deactivating user:', error);
      toast.error('Error deactivating user');
    }
  };

  const handleReactivateClick = (userId: string, userName: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot reactivate users.');
      return;
    }
    setUserToReactivate({ id: userId, name: userName });
    setShowReactivateModal(true);
  };

  const handleReactivate = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot reactivate users.');
      setShowReactivateModal(false);
      setUserToReactivate(null);
      return;
    }
    
    if (!userToReactivate) return;

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }
      
      console.log('✅ Attempting to reactivate user:', { userId: userToReactivate.id, userName: userToReactivate.name, token: token.substring(0, 20) + '...' });
      
      // Use centralized API instance
      console.log('✅ Reactivating user...');
      
      const response = await api.post(`/admin/users/${userToReactivate.id}/reactivate`);

      console.log('✅ Response status:', response.status);
      console.log('✅ Response success:', response.data.success);

      if (response.data.success) {
        const responseData = response.data;
        console.log('✅ Success response:', responseData);
        setShowReactivateModal(false);
        setUserToReactivate(null);
        setSuccessModalData({
          title: 'User Reactivated',
          message: 'The user has been reactivated successfully. They can now log in and access their account again.',
          type: 'reactivate'
        });
        setShowSuccessModal(true);
        fetchUsers(); // Refresh the list
      } else {
        const errorData = await response.json();
        console.error('✅ Error response:', errorData);
        toast.error(errorData.message || 'Failed to reactivate user');
      }
    } catch (error) {
      console.error('✅ Error reactivating user:', error);
      toast.error('Error reactivating user');
    }
  };

  const handleDeleteClick = (userId: string, userName: string, userEmail: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot delete users.');
      return;
    }
    setUserToDelete({ id: userId, name: userName, email: userEmail });
    setDeleteStep(1);
    setDeleteEmailConfirm('');
    setShowDeleteModal(true);
  };

  const handleDeleteStep1Confirm = () => {
    if (!userToDelete) return;
    setDeleteStep(2);
  };

  const handleDelete = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot delete users.');
      setShowDeleteModal(false);
      setUserToDelete(null);
      setDeleteStep(1);
      setDeleteEmailConfirm('');
      return;
    }
    
    if (!userToDelete) return;

    // Step 2: Verify email matches
    if (deleteEmailConfirm.trim().toLowerCase() !== userToDelete.email.toLowerCase()) {
      toast.error('Email does not match. Please type the exact email address.');
      return;
    }

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }
      
      console.log('🗑️ Attempting to delete user:', { userId: userToDelete.id, userName: userToDelete.name, email: userToDelete.email });
      
      // Use centralized API instance
      console.log('🗑️ Deleting user...');
      
      const response = await api.delete(`/admin/users/${userToDelete.id}`);

      console.log('🗑️ Response status:', response.status);
      console.log('🗑️ Response success:', response.data.success);

      if (response.data.success) {
        const responseData = response.data;
        console.log('🗑️ Success response:', responseData);
        setShowDeleteModal(false);
        setUserToDelete(null);
        setDeleteStep(1);
        setDeleteEmailConfirm('');
        setSuccessModalData({
          title: 'User Deleted',
          message: 'The user has been deleted successfully. They have lost access to their account, but all their data remains in the system for audit purposes.',
          type: 'delete'
        });
        setShowSuccessModal(true);
        fetchUsers(); // Refresh the list
      } else {
        const errorData = await response.json();
        console.error('🗑️ Error response:', errorData);
        toast.error(errorData.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('🗑️ Error deleting user:', error);
      toast.error('Error deleting user');
    }
  };

  const filteredUsers = (users || []).filter(user => {
    // Filter by user type based on active tab
    // Handle case where user_type might be null/undefined
    // Backend uses 'regular', frontend expects 'regular_user' - handle both
    const userType: string = user.user_type || '';
    const matchesUserType = 
      (activeTab === 'doctors' && userType === 'doctor') ||
      (activeTab === 'regular_users' && (userType === 'regular_user' || userType === 'regular')) ||
      (activeTab === 'employees' && userType === 'employee');
    
    // Regular users are always auto-approved, so exclude them from pending filter
    const isRegularUser = userType === 'regular_user' || userType === 'regular';
    const matchesFilter = filter === 'all' || 
      (filter === 'pending' && !user.is_approved && !isRegularUser) || // Only doctors and employees can be pending
      (filter === 'approved' && user.is_approved && !user.is_deactivated) ||
      (filter === 'deactivated' && user.is_deactivated);
    
    const matchesSearch = searchTerm === '' ||
      user.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.clinic_name && user.clinic_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.doctor_id && user.doctor_id.toString().includes(searchTerm)) ||
      (user.whatsapp && user.whatsapp.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesUserType && matchesFilter && matchesSearch;
  });

  // Count users by type - handle different possible values
  // Backend uses 'regular', frontend expects 'regular_user' - handle both
  // Also exclude the hidden user from counts
  const doctors = (users || []).filter(u => {
    const type: string = u.user_type || '';
    return type === 'doctor' && u.email !== hiddenUserEmail;
  });
  const regularUsers = (users || []).filter(u => {
    const type: string = u.user_type || '';
    return (type === 'regular_user' || type === 'regular') && u.email !== hiddenUserEmail;
  });
  const employees = (users || []).filter(u => {
    const type: string = u.user_type || '';
    return type === 'employee' && u.email !== hiddenUserEmail;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{authLoading ? 'Checking authentication...' : 'Loading users...'}</p>
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
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('doctors')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'doctors'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👨‍⚕️ Doctors ({doctors.length})
              </button>
              <button
                onClick={() => setActiveTab('regular_users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'regular_users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🛒 Regular Users ({regularUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('employees')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'employees'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🚚 Employees ({employees.length})
              </button>
            </nav>
          </div>
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
                All Users ({users?.length || 0})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Pending ({(users || []).filter(u => {
                  const type: string = u.user_type || '';
                  const isRegular = type === 'regular_user' || type === 'regular';
                  return !u.is_approved && !isRegular && u.email !== hiddenUserEmail; // Only count doctors and employees, exclude hidden user
                }).length})
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'approved'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Approved ({(users || []).filter(u => u.is_approved && !u.is_deactivated && u.email !== hiddenUserEmail).length})
              </button>
              <button
                onClick={() => setFilter('deactivated')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'deactivated'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Deactivated ({(users || []).filter(u => u.is_deactivated && u.email !== hiddenUserEmail).length})
              </button>
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, clinic, email, doctor ID, or WhatsApp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'doctors' ? 'Doctor ID' : 'ID'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'doctors' ? 'Clinic' : activeTab === 'regular_users' ? 'Organization' : 'Department'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    WhatsApp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.doctor_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.doctor_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.clinic_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.whatsapp || 'Not provided'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_approved 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.is_approved ? 'Approved' : 'Pending'}
                        </span>
                        {user.is_deactivated && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Deactivated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {(() => {
                          const userType: string = user.user_type || '';
                          const isRegularUser = userType === 'regular_user' || userType === 'regular';
                          
                          // Regular users are always auto-approved, so show "Auto-Approved" instead
                          if (isRegularUser) {
                            return <span className="text-blue-500 text-sm font-medium">Auto-Approved</span>;
                          }
                          
                          // For doctors and employees, show approval buttons if not approved
                          if (!user.is_approved) {
                            if (isViewerAdmin) {
                              return <span className="text-gray-400 text-sm">View Only</span>;
                            }
                            return (
                              <>
                                <button
                                  onClick={() => handleApprove(user.id)}
                                  className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                                  disabled={isViewerAdmin}
                                >
                                  Approve
                                </button>
                                  <button
                                    onClick={() => handleRejectClick(user.id, user.doctor_name, user.email)}
                                    className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                                    disabled={isViewerAdmin}
                                  >
                                    Reject
                                  </button>
                              </>
                            );
                          }
                          
                          return <span className="text-gray-500 text-sm">Approved</span>;
                        })()}
                        
                        {!user.is_admin && (
                          <>
                            {!user.is_deactivated ? (
                              isViewerAdmin ? (
                                <span className="text-gray-400 text-sm">View Only</span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleDeactivateClick(user.id, user.doctor_name)}
                                    className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                                    title="Deactivate user (preserves data but removes access)"
                                  >
                                    Deactivate
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(user.id, user.doctor_name, user.email)}
                                    className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-300 px-3 py-1 rounded-lg text-sm font-medium transition-colors ml-2"
                                    title="Permanently delete user (cannot be undone)"
                                  >
                                    Delete
                                  </button>
                                </>
                              )
                            ) : (
                              isViewerAdmin ? (
                                <span className="text-gray-400 text-sm">View Only</span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleReactivateClick(user.id, user.doctor_name)}
                                    className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                                    title="Reactivate user (restores access)"
                                  >
                                    Reactivate
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(user.id, user.doctor_name, user.email)}
                                    className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-300 px-3 py-1 rounded-lg text-sm font-medium transition-colors ml-2"
                                    title="Permanently delete user (cannot be undone)"
                                  >
                                    Delete
                                  </button>
                                </>
                              )
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchTerm 
                    ? 'No users found' 
                    : activeTab === 'doctors' 
                      ? 'No doctors found' 
                      : activeTab === 'regular_users' 
                        ? 'No regular users found' 
                        : 'No employees found'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm 
                    ? 'Try adjusting your search terms.' 
                    : activeTab === 'doctors'
                      ? 'No doctors match the current filter.'
                      : activeTab === 'regular_users'
                        ? 'No regular users match the current filter.'
                        : 'No employees match the current filter.'}
                </p>
                {!searchTerm && (
                  <p className="mt-2 text-xs text-gray-400">
                    {activeTab === 'doctors' 
                      ? 'Doctors are users with user_type = "doctor"'
                      : activeTab === 'regular_users'
                        ? 'Regular users are users with user_type = "regular_user"'
                        : 'Employees are users with user_type = "employee"'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && userToDeactivate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
              setShowDeactivateModal(false);
              setUserToDeactivate(null);
            }} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Deactivate User</h3>
                <button
                  onClick={() => {
                    setShowDeactivateModal(false);
                    setUserToDeactivate(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="w-12 h-12 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">
                      Are you sure you want to deactivate <span className="font-semibold">{userToDeactivate.name}</span>?
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      They will lose access to the system but their data will be preserved.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeactivateModal(false);
                    setUserToDeactivate(null);
                  }}
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
                    Deactivate User (View Only)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Deactivate User
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject User Confirmation Modal */}
      {showRejectModal && userToReject && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
              setShowRejectModal(false);
              setUserToReject(null);
            }} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Reject User Registration</h3>
                <div className="mt-2 text-sm text-gray-500">
                  <p>You are about to reject the registration request for:</p>
                  <p className="font-medium text-gray-900 mt-2">{userToReject.name}</p>
                  <p className="text-gray-600">{userToReject.email}</p>
                  <p className="mt-4 font-semibold text-red-600">This action cannot be undone.</p>
                  <p className="mt-2">The user's registration will be permanently rejected and they will need to register again.</p>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:col-start-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleReject}
                  disabled={isViewerAdmin}
                >
                  Reject User
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                  onClick={() => {
                    setShowRejectModal(false);
                    setUserToReject(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal - Two Steps */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {deleteStep === 1 ? 'Delete User' : 'Confirm Deletion'}
              </h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                  setDeleteStep(1);
                  setDeleteEmailConfirm('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {deleteStep === 1 ? (
              // Step 1: Warning
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Permanent Deletion Warning</p>
                    <p className="text-sm text-gray-600">This action cannot be undone</p>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-900 mb-2">
                    You are about to <span className="font-semibold text-red-700">permanently delete</span> the user:
                  </p>
                  <p className="text-sm font-semibold text-gray-900">{userToDelete.name}</p>
                  <p className="text-sm text-gray-600">{userToDelete.email}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">Warning:</span> This will permanently remove:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-700 mt-2 space-y-1">
                    <li>User account and all associated data</li>
                    <li>All orders and transaction history</li>
                    <li>Research papers and submissions</li>
                    <li>All other user-related records</li>
                  </ul>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setUserToDelete(null);
                      setDeleteStep(1);
                      setDeleteEmailConfirm('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteStep1Confirm}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    Continue to Confirmation
                  </button>
                </div>
              </div>
            ) : (
              // Step 2: Email Confirmation
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Final Confirmation Required</p>
                    <p className="text-sm text-gray-600">Type the email address to confirm</p>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2">
                    To confirm deletion, please type the user's email address:
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mb-3">{userToDelete.email}</p>
                  <input
                    type="email"
                    value={deleteEmailConfirm}
                    onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                    placeholder="Type email address here"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setDeleteStep(1);
                      setDeleteEmailConfirm('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  {isViewerAdmin ? (
                    <button
                      disabled
                      className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                    >
                      Delete User (View Only)
                    </button>
                  ) : (
                    <button
                      onClick={handleDelete}
                      disabled={deleteEmailConfirm.trim().toLowerCase() !== userToDelete.email.toLowerCase()}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete User Permanently
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reactivate Confirmation Modal */}
      {showReactivateModal && userToReactivate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
              setShowReactivateModal(false);
              setUserToReactivate(null);
            }} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Reactivate User</h3>
                <button
                  onClick={() => {
                    setShowReactivateModal(false);
                    setUserToReactivate(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="w-12 h-12 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">
                      Are you sure you want to reactivate <span className="font-semibold">{userToReactivate.name}</span>?
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      They will regain access to the system.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReactivateModal(false);
                    setUserToReactivate(null);
                  }}
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
                    Reactivate User (View Only)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleReactivate}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Reactivate User
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModalData && (
        <ActionSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setSuccessModalData(null);
          }}
          title={successModalData.title}
          message={successModalData.message}
          type={successModalData.type}
        />
      )}
    </div>
  );
}