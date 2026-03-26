'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getApiUrl } from '@/lib/getApiUrl';
import { getAccessToken } from '@/lib/auth';
import api from '@/lib/api';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Badge {
  id: string;
  doctor_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  badge_type: 'achievement' | 'milestone' | 'special';
  earned_date: string;
  is_active: boolean;
  assigned_by?: string;
  notes?: string;
  doctor?: {
    id: string;
    doctor_name: string;
    clinic_name: string;
    email: string;
  };
}

interface Doctor {
  id: string;
  doctor_name: string;
  clinic_name: string;
  email: string;
}

export default function BadgeManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [badgeToDelete, setBadgeToDelete] = useState<Badge | null>(null);
  const [formData, setFormData] = useState({
    doctor_id: '',
    name: '',
    description: '',
    icon: '🏅',
    color: '#6B46C1',
    badge_type: 'achievement' as 'achievement' | 'milestone' | 'special',
    notes: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !user?.is_admin) {
        router.push('/login');
        return;
      }
      fetchData();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchData = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }

      // Use centralized API instance
      // Fetch badges and doctors in parallel
      const [badgesResponse, doctorsResponse] = await Promise.all([
        api.get('/badges'),
        api.get('/admin/available-doctors-hall-of-pride')
      ]);

      if (!badgesResponse.data.success || !doctorsResponse.data.success) {
        throw new Error('Failed to fetch data');
      }

      setBadges(badgesResponse.data.data || []);
      setDoctors(doctorsResponse.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load badges. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.doctor_id || !formData.name || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        return;
      }

      // Use centralized API instance
      const response = editingBadge
        ? await api.put(`/badges/${editingBadge.id}`, formData)
        : await api.post('/badges', formData);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to save badge');
      }

      toast.success(editingBadge ? 'Badge updated successfully!' : 'Badge created and assigned successfully!');
      setShowModal(false);
      setEditingBadge(null);
      setFormData({
        doctor_id: '',
        name: '',
        description: '',
        icon: '🏅',
        color: '#6B46C1',
        badge_type: 'achievement',
        notes: ''
      });
      fetchData();
    } catch (error: any) {
      console.error('Error saving badge:', error);
      toast.error(error.message || 'Failed to save badge. Please try again.');
    }
  };

  const handleEdit = (badge: Badge) => {
    setEditingBadge(badge);
    setFormData({
      doctor_id: badge.doctor_id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      color: badge.color,
      badge_type: badge.badge_type,
      notes: badge.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!badgeToDelete) return;

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        return;
      }

      // Use centralized API instance
      const response = await api.delete(`/badges/${badgeToDelete.id}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete badge');
      }

      toast.success('Badge deleted successfully!');
      setShowDeleteModal(false);
      setBadgeToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting badge:', error);
      toast.error('Failed to delete badge. Please try again.');
    }
  };

  const filteredBadges = badges.filter(badge => {
    const matchesSearch = badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      badge.doctor?.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      badge.doctor?.clinic_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || badge.badge_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading badges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <a href="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Admin Dashboard
          </a>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Badge Management</h1>
              <p className="text-gray-600 mt-1">Create and assign badges to users</p>
            </div>
            {isViewerAdmin ? (
              <button
                disabled
                className="mt-4 md:mt-0 bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Add Badge (View Only)
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingBadge(null);
                  setFormData({
                    doctor_id: '',
                    name: '',
                    description: '',
                    icon: '🏅',
                    color: '#6B46C1',
                    badge_type: 'achievement',
                    notes: ''
                  });
                  setShowModal(true);
                }}
                className="mt-4 md:mt-0 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Add Badge
              </button>
            )}
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by badge name, doctor name, or clinic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="achievement">Achievement</option>
              <option value="milestone">Milestone</option>
              <option value="special">Special</option>
            </select>
          </div>

          {/* Badges List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Badge</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earned Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBadges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No badges found
                    </td>
                  </tr>
                ) : (
                  filteredBadges.map((badge) => (
                    <tr key={badge.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">{badge.icon}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{badge.name}</div>
                            <div className="text-sm text-gray-500">{badge.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{badge.doctor?.doctor_name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{badge.doctor?.clinic_name || ''}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          badge.badge_type === 'achievement' ? 'bg-blue-100 text-blue-800' :
                          badge.badge_type === 'milestone' ? 'bg-purple-100 text-purple-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {badge.badge_type}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(badge.earned_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          badge.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {badge.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isViewerAdmin ? (
                          <span className="text-gray-400">View Only</span>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(badge)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setBadgeToDelete(badge);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingBadge ? 'Edit Badge' : 'Create New Badge'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingBadge(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Doctor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.doctor_id}
                    onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                    required
                    disabled={!!editingBadge}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.doctor_name} - {doctor.clinic_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Badge Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Hall of Pride Winner"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe what this badge represents..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon (Emoji)
                    </label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      maxLength={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="🏅"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Badge Type
                  </label>
                  <select
                    value={formData.badge_type}
                    onChange={(e) => setFormData({ ...formData, badge_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="achievement">Achievement</option>
                    <option value="milestone">Milestone</option>
                    <option value="special">Special</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Internal notes about why this badge was assigned..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingBadge(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingBadge ? 'Update Badge' : 'Create Badge'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && badgeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3" />
                <h3 className="text-lg font-bold text-gray-900">Delete Badge</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the badge <strong>"{badgeToDelete.name}"</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setBadgeToDelete(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

