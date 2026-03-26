'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getAccessToken } from '@/lib/auth';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, XMarkIcon, ExclamationTriangleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

interface HallOfPrideEntry {
  id: string;
  doctor: {
    id: string;
    doctor_name: string;
    clinic_name: string;
    profile_photo_url?: string;
  };
  title: string;
  description: string;
  achievement_type: string;
  category?: string;
  reason?: string;
  image_url?: string;
  is_active: boolean;
  display_order: number;
  created_by_doctor?: {
    id: string;
    doctor_name: string;
  };
  created_at: string;
  updated_at: string;
}

interface Doctor {
  id: string;
  doctor_name: string;
  clinic_name: string;
  email: string;
  profile_photo_url?: string;
}

export default function HallOfPridePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const [entries, setEntries] = useState<HallOfPrideEntry[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<HallOfPrideEntry | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<HallOfPrideEntry | null>(null);
  const [formData, setFormData] = useState({
    doctor_id: '',
    title: '',
    description: '',
    achievement_type: '',
    reason: '',
    image_url: '',
    display_order: 0,
    is_active: true
  });

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
      // Fetch entries and doctors in parallel
      const [entriesResponse, doctorsResponse] = await Promise.all([
        api.get('/admin/hall-of-pride'),
        api.get('/admin/available-doctors-hall-of-pride')
      ]);

      if (entriesResponse.data.success) {
        setEntries(entriesResponse.data.data || []);
      } else {
        toast.error('Failed to fetch Hall of Pride entries');
      }

      if (doctorsResponse.data.success) {
        setDoctors(doctorsResponse.data.data || []);
      } else {
        toast.error('Failed to fetch available doctors');
      }
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot save entries.');
      return;
    }
    e.preventDefault();

    if (!formData.doctor_id || !formData.title || !formData.description || !formData.achievement_type) {
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
      const response = editingEntry
        ? await api.put(`/admin/hall-of-pride/${editingEntry.id}`, formData)
        : await api.post('/admin/hall-of-pride', formData);

      if (response.data.success) {
        toast.success(editingEntry ? 'Hall of Pride entry updated successfully!' : 'Hall of Pride entry created successfully!');
        setShowModal(false);
        setEditingEntry(null);
        resetForm();
        fetchData();
      } else {
        toast.error(response.data.message || 'Failed to save Hall of Pride entry');
      }
    } catch (error: unknown) {
      console.error('Error saving Hall of Pride entry:', error);
      toast.error('Error saving Hall of Pride entry');
    }
  };

  const handleDeleteClick = (entry: HallOfPrideEntry) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot delete entries.');
      return;
    }
    setEntryToDelete(entry);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        setShowDeleteModal(false);
        setEntryToDelete(null);
        return;
      }

      // Use centralized API instance
      const response = await api.delete(`/admin/hall-of-pride/${entryToDelete.id}`);

      if (response.data.success) {
        toast.success('Hall of Pride entry deleted successfully!');
        fetchData();
        setShowDeleteModal(false);
        setEntryToDelete(null);
      } else {
        toast.error('Failed to delete Hall of Pride entry');
      }
    } catch (error: unknown) {
      console.error('Error deleting Hall of Pride entry:', error);
      toast.error('Error deleting Hall of Pride entry');
    }
  };

  const openEditModal = (entry: HallOfPrideEntry) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot edit entries.');
      return;
    }
    setEditingEntry(entry);
    setFormData({
      doctor_id: entry.doctor.id,
      title: entry.title,
      description: entry.description,
      achievement_type: entry.achievement_type,
      reason: entry.reason || '',
      image_url: entry.image_url || '',
      display_order: entry.display_order,
      is_active: entry.is_active
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot add entries.');
      return;
    }
    setEditingEntry(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      doctor_id: '',
      title: '',
      description: '',
      achievement_type: '',
      reason: '',
      image_url: '',
      display_order: 0,
      is_active: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Hall of Pride entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/admin"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Admin
        </Link>

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hall of Pride Management</h1>
            <p className="mt-2 text-gray-600">Manage Hall of Pride entries to recognize exceptional achievements</p>
          </div>
          {isViewerAdmin ? (
            <button
              disabled
              className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add New Entry (View Only)
            </button>
          ) : (
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add New Entry
            </button>
          )}
        </div>

        {/* Entries Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg bg-blue-600">
                  🏆
                </div>
                <div className="flex space-x-2">
                  {isViewerAdmin ? (
                    <span className="text-gray-400 text-xs">View Only</span>
                  ) : (
                    <>
                      <button
                        onClick={() => openEditModal(entry)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Edit entry"
                        disabled={isViewerAdmin}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(entry)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete entry"
                        disabled={isViewerAdmin}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{entry.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{entry.doctor.doctor_name}</p>
              <p className="text-sm text-gray-500 mb-2">{entry.doctor.clinic_name}</p>
              
              <div className="mb-3">
                <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {entry.category}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-3">{entry.description}</p>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Type: {entry.achievement_type}</span>
                <span className={`px-2 py-1 rounded-full ${entry.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {entry.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {entries.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Hall of Pride entries</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first Hall of Pride entry.</p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add New Entry
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingEntry ? 'Edit Hall of Pride Entry' : 'Add New Hall of Pride Entry'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doctor *
                  </label>
                  <select
                    value={formData.doctor_id}
                    onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    required
                    disabled={isViewerAdmin}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="e.g., Excellence in Surgery"
                    required
                    readOnly={isViewerAdmin}
                    disabled={isViewerAdmin}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason
                  </label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="e.g., Outstanding contribution to surgery"
                    readOnly={isViewerAdmin}
                    disabled={isViewerAdmin}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Achievement Type *
                  </label>
                  <input
                    type="text"
                    value={formData.achievement_type}
                    onChange={(e) => setFormData({ ...formData, achievement_type: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="e.g., Excellence in Surgery"
                    required
                    readOnly={isViewerAdmin}
                    disabled={isViewerAdmin}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Describe the achievement..."
                    required
                    readOnly={isViewerAdmin}
                    disabled={isViewerAdmin}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="https://example.com/image.jpg"
                    readOnly={isViewerAdmin}
                    disabled={isViewerAdmin}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    min="0"
                    readOnly={isViewerAdmin}
                    disabled={isViewerAdmin}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isViewerAdmin}
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                    Active (visible to users)
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    disabled={isViewerAdmin}
                  >
                    {editingEntry ? 'Update Entry' : 'Create Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && entryToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
              setShowDeleteModal(false);
              setEntryToDelete(null);
            }} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Delete Hall of Pride Entry</h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEntryToDelete(null);
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
                      Are you sure you want to delete this Hall of Pride entry?
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">Title:</p>
                  <p className="text-sm text-gray-900 break-words mb-2">{entryToDelete.title}</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">Doctor:</p>
                  <p className="text-sm text-gray-900 break-words mb-2">{entryToDelete.doctor.doctor_name} - {entryToDelete.doctor.clinic_name}</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">Achievement Type:</p>
                  <p className="text-sm text-gray-900">{entryToDelete.achievement_type}</p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEntryToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                >
                  <TrashIcon className="w-5 h-5 mr-2" />
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
