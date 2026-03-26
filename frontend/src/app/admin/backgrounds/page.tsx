'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getAccessToken, isTokenExpired } from '@/lib/auth';
import AuthGuard from '@/components/AuthGuard';
import ConfirmationModal from '@/components/ConfirmationModal';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Background {
  id: string;
  name: string;
  description?: string;
  background_type: string;
  background_value: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  occasion_type?: string;
  created_at: string;
  updated_at: string;
}

interface NewBackgroundForm {
  name: string;
  description: string;
  background_type: string;
  background_value: string;
  start_date: string;
  end_date: string;
  occasion_type: string;
}

const BACKGROUND_TYPES = [
  { value: 'image', label: 'Image' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'color', label: 'Solid Color' }
];

const OCCASION_TYPES = [
  { value: 'independence_day', label: '🇵🇰 Independence Day (14th August)' },
  { value: 'defence_day', label: '🛡️ Defence Day (6th September)' },
  { value: 'ramadan', label: '🌙 Ramadan' },
  { value: 'eid_ul_fitr', label: '🎉 Eid-ul-Fitr' },
  { value: 'eid_ul_adha', label: '🐑 Eid-ul-Adha' },
  { value: 'muharram', label: '⚫ Muharram' },
  { value: 'rabi_ul_awwal', label: '🕌 Rabi-ul-Awwal' },
  { value: 'shab_e_meraj', label: '🌌 Shab-e-Meraj' },
  { value: 'shab_e_barat', label: '🌠 Shab-e-Barat' },
  { value: 'lailatul_qadr', label: '✨ Lailatul Qadr' },
  { value: 'new_year', label: '🎊 New Year' },
  { value: 'general', label: '🎨 General' }
];

export default function BackgroundManagement() {
  const { isAuthenticated, user, authLoading } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const router = useRouter();
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBackground, setEditingBackground] = useState<Background | null>(null);
  const [newBackground, setNewBackground] = useState<NewBackgroundForm>({
    name: '',
    description: '',
    background_type: 'image',
    background_value: '',
    start_date: '',
    end_date: '',
    occasion_type: 'general'
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [backgroundToDelete, setBackgroundToDelete] = useState<Background | null>(null);

  useEffect(() => {
    console.log('🎨 Admin Backgrounds - Component mounted, fetching backgrounds');
    fetchBackgrounds();
  }, []);

  const fetchBackgrounds = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        console.log('No authentication token available');
        setLoading(false);
        return;
      }

      if (isTokenExpired()) {
        console.log('Token is expired, redirecting to login');
        router.push('/login');
        return;
      }

      // Use centralized API instance
      const response = await api.get('/backgrounds/admin');

      if (response.data.success) {
        setBackgrounds(response.data.backgrounds || []);
      } else {
        console.error('Failed to load backgrounds:', response.status);
        if (response.status === 401 || response.status === 403) {
          console.log('Authentication failed, redirecting to login');
          router.push('/login');
        } else {
          toast.error('Failed to load backgrounds');
        }
      }
    } catch (error) {
      console.error('Error fetching backgrounds:', error);
      // Don't show toast error on network issues
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('Network error, will retry later');
      } else {
        toast.error('Error loading backgrounds');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof NewBackgroundForm, value: string) => {
    setNewBackground(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size too large. Maximum 5MB allowed.');
      return;
    }

    setUploadingImage(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const formData = new FormData();
      formData.append('background', file);

      // Use centralized API instance
      const response = await api.post('/backgrounds/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const data = response.data;
        setNewBackground(prev => ({
          ...prev,
          background_value: data.imageUrl
        }));
        toast.success('Background image uploaded successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error uploading image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot save backgrounds.');
      return;
    }
    e.preventDefault();
    setSaving(true);

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Use centralized API instance
      const response = await api.post('/backgrounds/admin', newBackground);

      if (response.data.success) {
        toast.success('Background created successfully!');
        setShowAddForm(false);
        setNewBackground({
          name: '',
          description: '',
          background_type: 'image',
          background_value: '',
          start_date: '',
          end_date: '',
          occasion_type: 'general'
        });
        fetchBackgrounds();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to create background');
      }
    } catch (error) {
      console.error('Error creating background:', error);
      toast.error('Error creating background');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot activate backgrounds.');
      return;
    }
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      if (!id || id.trim() === '') {
        toast.error('Background ID is required');
        return;
      }

      // Use centralized API instance
      // Ensure ID is properly encoded
      const encodedId = encodeURIComponent(id);
      const response = await api.post(`/backgrounds/admin/${encodedId}/activate`);

      if (response.data.success) {
        toast.success(response.data.message || 'Background activated successfully!');
        fetchBackgrounds();
      } else {
        console.error('Activate background error:', response.data);
        toast.error(response.data.message || 'Failed to activate background');
      }
    } catch (error) {
      console.error('Error activating background:', error);
      toast.error(error instanceof Error ? error.message : 'Error activating background');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot deactivate backgrounds.');
      return;
    }
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      if (!id || id.trim() === '') {
        toast.error('Background ID is required');
        return;
      }

      // Get API URL - NEXT_PUBLIC_API_URL should already include /api
      // Use centralized API instance
      // Ensure ID is properly encoded
      const encodedId = encodeURIComponent(id);
      const response = await api.post(`/backgrounds/admin/${encodedId}/deactivate`);

      if (response.data.success) {
        toast.success(response.data.message || 'Background deactivated successfully!');
        fetchBackgrounds();
      } else {
        console.error('Deactivate background error:', response.data);
        toast.error(response.data.message || 'Failed to deactivate background');
      }
    } catch (error) {
      console.error('Error deactivating background:', error);
      toast.error(error instanceof Error ? error.message : 'Error deactivating background');
    }
  };

  const handleDelete = (background: Background) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot delete backgrounds.');
      return;
    }
    setBackgroundToDelete(background);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!backgroundToDelete) return;

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Use centralized API instance
      const response = await api.delete(`/backgrounds/admin/${backgroundToDelete.id}`);

      if (response.data.success) {
        toast.success('Background deleted successfully!');
        fetchBackgrounds();
      } else {
        toast.error(response.data.message || 'Failed to delete background');
      }
    } catch (error) {
      console.error('Error deleting background:', error);
      toast.error('Error deleting background');
    } finally {
      setDeleteModalOpen(false);
      setBackgroundToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setBackgroundToDelete(null);
  };

  const getBackgroundPreview = (background: Background) => {
    switch (background.background_type) {
      case 'image':
        // Use Next.js API proxy route for images
        const imageUrl = background.background_value.startsWith('/')
          ? `/api/images${background.background_value}`
          : `/api/images/${background.background_value}`;
        const directUrl = background.background_value.startsWith('/')
          ? `${getApiUrl().replace('/api', '')}${background.background_value}`
          : `${getApiUrl().replace('/api', '')}/${background.background_value}`;
        
        return (
          <div className="w-16 h-10 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
            <img 
              src={imageUrl}
              alt={background.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                // Try direct backend URL as fallback
                if (target.src !== directUrl) {
                  target.src = directUrl;
                } else {
                  // Show placeholder if both fail
                  target.style.display = 'none';
                  const placeholder = target.nextElementSibling as HTMLElement;
                  if (placeholder) {
                    placeholder.classList.remove('hidden');
                  }
                }
              }}
            />
            <div className="hidden w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
              ❌
            </div>
          </div>
        );
      case 'gradient':
        return (
          <div 
            className="w-16 h-10 rounded"
            style={{ background: background.background_value }}
          />
        );
      case 'color':
        return (
          <div 
            className="w-16 h-10 rounded"
            style={{ backgroundColor: background.background_value }}
          />
        );
      default:
        return <div className="w-16 h-10 bg-gray-200 rounded" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthGuard requireAdmin={true}>
      <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Admin Dashboard
              </button>
              {/* Debug button - remove this later */}
            </div>
            {isViewerAdmin ? (
              <button
                disabled
                className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed flex items-center"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add New Background (View Only)
              </button>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add New Background
              </button>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Manage Backgrounds</h1>
          <p className="text-gray-600 mt-2">
            Customize website backgrounds for special occasions like Independence Day, Ramadan, Eid, and more.
          </p>
        </div>

        {/* Add Background Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Background</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newBackground.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="e.g., Independence Day 2024"
                    required
                    readOnly={isViewerAdmin}
                    disabled={isViewerAdmin}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Occasion Type
                  </label>
                  <select
                    value={newBackground.occasion_type}
                    onChange={(e) => handleInputChange('occasion_type', e.target.value)}
                    className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    disabled={isViewerAdmin}
                  >
                    {OCCASION_TYPES.map(occasion => (
                      <option key={occasion.value} value={occasion.value}>{occasion.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Background Type
                  </label>
                  <select
                    value={newBackground.background_type}
                    onChange={(e) => handleInputChange('background_type', e.target.value)}
                    className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    disabled={isViewerAdmin}
                  >
                    {BACKGROUND_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newBackground.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Optional description"
                    readOnly={isViewerAdmin}
                    disabled={isViewerAdmin}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newBackground.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    readOnly={isViewerAdmin}
                    disabled={isViewerAdmin}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newBackground.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                    className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    readOnly={isViewerAdmin}
                    disabled={isViewerAdmin}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Value *
                </label>
                {newBackground.background_type === 'image' ? (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <label
                        htmlFor="background-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (isViewerAdmin) return;
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(file);
                            }
                          }}
                          className="hidden"
                          id="background-upload"
                          disabled={isViewerAdmin}
                        />
                        {uploadingImage ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        ) : (
                          <div className="text-gray-400">
                            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                        )}
                        <span className="text-sm text-gray-600">
                          {uploadingImage ? 'Uploading...' : 'Upload Background Image'}
                        </span>
                        <span className="text-xs text-gray-400">PNG, JPG, SVG, WebP (max 5MB)</span>
                        {newBackground.background_value && (
                          <span className="text-xs text-green-600 mt-1">
                            ✓ Image ready
                          </span>
                        )}
                      </label>
                    </div>
                    {newBackground.background_value && (
                      <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-md">
                        <div className="w-16 h-10 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                          <img 
                            src={newBackground.background_value.startsWith('/')
                              ? `/api/images${newBackground.background_value}`
                              : `/api/images/${newBackground.background_value}`}
                            alt="Background preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              const fallbackUrl = newBackground.background_value.startsWith('/')
                                ? `${getApiUrl().replace('/api', '')}${newBackground.background_value}`
                                : `${getApiUrl().replace('/api', '')}/${newBackground.background_value}`;
                              if (target.src !== fallbackUrl) {
                                target.src = fallbackUrl;
                              } else {
                                target.style.display = 'none';
                                const placeholder = target.nextElementSibling as HTMLElement;
                                if (placeholder) {
                                  placeholder.classList.remove('hidden');
                                }
                              }
                            }}
                          />
                          <div className="hidden w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                            📷
                          </div>
                        </div>
                        <span className="text-sm text-green-700">Background uploaded</span>
                      </div>
                    )}
                  </div>
                ) : newBackground.background_type === 'gradient' ? (
                  <input
                    type="text"
                    value={newBackground.background_value}
                    onChange={(e) => handleInputChange('background_value', e.target.value)}
                    className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    readOnly={isViewerAdmin}
                    disabled={isViewerAdmin}
                  />
                ) : (
                  <input
                    type="color"
                    value={newBackground.background_value}
                    onChange={(e) => handleInputChange('background_value', e.target.value)}
                    className={`w-full h-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isViewerAdmin}
                  />
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newBackground.name || !newBackground.background_value || isViewerAdmin}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating...' : 'Create Background'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Backgrounds List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Backgrounds ({backgrounds.length})</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {backgrounds.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">No backgrounds found. Create your first background!</p>
              </div>
            ) : (
              backgrounds.map((background) => (
                <div key={background.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getBackgroundPreview(background)}
                      <div>
                        <h3 className="font-semibold text-gray-900">{background.name}</h3>
                        <p className="text-sm text-gray-600">{background.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            background.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {background.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {background.background_type}
                          </span>
                          {background.occasion_type && (
                            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                              {OCCASION_TYPES.find(o => o.value === background.occasion_type)?.label || background.occasion_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isViewerAdmin ? (
                        <span className="text-gray-400 text-xs">View Only</span>
                      ) : (
                        <>
                          {background.is_active ? (
                            <button
                              onClick={() => handleDeactivate(background.id)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isViewerAdmin}
                              title="Deactivate"
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(background.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isViewerAdmin}
                              title="Activate"
                            >
                              <CheckIcon className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(background)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isViewerAdmin}
                            title="Delete"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Confirmation Modal */}
    <ConfirmationModal
      isOpen={deleteModalOpen}
      onClose={cancelDelete}
      onConfirm={confirmDelete}
      title="Delete Background"
      message={`Are you sure you want to delete "${backgroundToDelete?.name}"? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      type="danger"
    />
    </AuthGuard>
  );
}
