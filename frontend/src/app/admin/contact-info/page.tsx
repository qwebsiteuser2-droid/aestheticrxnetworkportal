'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getAccessToken } from '@/lib/auth';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';
import {
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ChatBubbleLeftRightIcon,
  ShareIcon,
  LinkIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  CameraIcon,
  DocumentTextIcon,
  HeartIcon,
  StarIcon,
  FireIcon,
  BoltIcon,
  SparklesIcon,
  GiftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface ContactPlatform {
  id: string;
  platform_name: string;
  platform_type: string;
  display_name: string;
  contact_value: string;
  icon_name: string;
  custom_icon_url?: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface NewPlatformForm {
  platform_name: string;
  platform_type: string;
  display_name: string;
  contact_value: string;
  icon_name: string;
  custom_icon_url?: string;
  color: string;
  sort_order: number;
}

const PLATFORM_TYPES = [
  { value: 'phone', label: 'Phone/WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'social', label: 'Social Media' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Other' }
];

const ICON_OPTIONS = [
  { value: 'PhoneIcon', label: '📞 Phone' },
  { value: 'EnvelopeIcon', label: '✉️ Email' },
  { value: 'GlobeAltIcon', label: '🌐 Website/Globe' },
  { value: 'ChatBubbleLeftRightIcon', label: '💬 Chat' },
  { value: 'ShareIcon', label: '📤 Share' },
  { value: 'LinkIcon', label: '🔗 Link' },
  { value: 'UserIcon', label: '👤 User' },
  { value: 'CalendarIcon', label: '📅 Calendar' },
  { value: 'ClockIcon', label: '🕐 Clock' },
  { value: 'MapPinIcon', label: '📍 Location' },
  { value: 'VideoCameraIcon', label: '📹 Video' },
  { value: 'MicrophoneIcon', label: '🎤 Microphone' },
  { value: 'CameraIcon', label: '📷 Camera' },
  { value: 'DocumentTextIcon', label: '📄 Document' },
  { value: 'HeartIcon', label: '❤️ Heart' },
  { value: 'StarIcon', label: '⭐ Star' },
  { value: 'FireIcon', label: '🔥 Fire' },
  { value: 'LightningBoltIcon', label: '⚡ Lightning' },
  { value: 'SparklesIcon', label: '✨ Sparkles' },
  { value: 'GiftIcon', label: '🎁 Gift' }
];

export default function ContactInfoManagementPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const router = useRouter();
  
  const [platforms, setPlatforms] = useState<ContactPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<ContactPlatform | null>(null);
  const [newPlatform, setNewPlatform] = useState<NewPlatformForm>({
    platform_name: '',
    platform_type: 'social',
    display_name: '',
    contact_value: '',
    icon_name: 'GlobeAltIcon',
    custom_icon_url: '',
    color: '#6B7280',
    sort_order: 0
  });
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [platformToDelete, setPlatformToDelete] = useState<ContactPlatform | null>(null);

  useEffect(() => {
    console.log('Auth check - authLoading:', authLoading, 'isAuthenticated:', isAuthenticated, 'user:', user);
    
    if (authLoading) {
      return;
    }
    
    if (!isAuthenticated) {
      console.log('Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }
    
    if (!user?.is_admin) {
      console.log('Not admin, redirecting to home');
      router.push('/');
      return;
    }
    
    console.log('Admin authenticated, loading contact platforms');
    fetchContactPlatforms();
  }, [authLoading, isAuthenticated, user, router]);

  const fetchContactPlatforms = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        console.error('No access token found');
        toast.error('Authentication required');
        return;
      }

      // Use centralized API instance
      console.log('Fetching contact platforms...');
      
      const response = await api.get('/contact-platforms/admin');

      console.log('Contact platforms fetch response status:', response.status);

      if (response.data.success) {
        console.log('Fetched contact platforms:', response.data);
        setPlatforms(response.data.platforms || []);
      } else {
        console.error('Failed to fetch contact platforms:', response.status);
        console.error('Error data:', response.data);
        toast.error('Failed to load contact platforms');
      }
    } catch (error: unknown) {
      console.error('Error fetching contact platforms:', error);
      toast.error('Error loading contact platforms');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof NewPlatformForm, value: string | number) => {
    setNewPlatform(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleIconUpload = async (file: File) => {
    setUploadingIcon(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const formData = new FormData();
      formData.append('icon', file);

      // Use centralized API instance
      const response = await api.post('/icons/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const data = response.data;
        setNewPlatform(prev => ({
          ...prev,
          custom_icon_url: data.iconUrl,
          icon_name: 'custom' // Mark as custom icon
        }));
        toast.success('Icon uploaded successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to upload icon');
      }
    } catch (error: unknown) {
      console.error('Error uploading icon:', error);
      toast.error('Error uploading icon');
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleEditInputChange = (field: keyof ContactPlatform, value: string | number | boolean) => {
    if (editingPlatform) {
      setEditingPlatform(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const handleAddPlatform = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot add platforms.');
      return;
    }
    if (!newPlatform.platform_name || !newPlatform.display_name || !newPlatform.contact_value) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Use centralized API instance
      const response = await api.post('/contact-platforms/admin', newPlatform);

      if (response.data.success) {
        toast.success('Contact platform added successfully!');
        setShowAddForm(false);
        setNewPlatform({
          platform_name: '',
          platform_type: 'social',
          display_name: '',
          contact_value: '',
          icon_name: 'GlobeAltIcon',
          color: '#6B7280',
          sort_order: 0
        });
        fetchContactPlatforms();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to add contact platform');
      }
    } catch (error: unknown) {
      console.error('Error adding contact platform:', error);
      toast.error('Error adding contact platform');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlatform = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot update platforms.');
      return;
    }
    if (!editingPlatform) return;

    setSaving(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Use centralized API instance
      const response = await api.put(`/contact-platforms/admin/${editingPlatform.id}`, editingPlatform);

      if (response.data.success) {
        toast.success('Contact platform updated successfully!');
        setEditingPlatform(null);
        fetchContactPlatforms();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to update contact platform');
      }
    } catch (error: unknown) {
      console.error('Error updating contact platform:', error);
      toast.error('Error updating contact platform');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (platform: ContactPlatform) => {
    setPlatformToDelete(platform);
    setShowDeleteModal(true);
  };

  const confirmDeletePlatform = async () => {
    if (!platformToDelete) return;

    setSaving(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        setShowDeleteModal(false);
        setPlatformToDelete(null);
        return;
      }

      // Use centralized API instance
      const response = await api.delete(`/contact-platforms/admin/${platformToDelete.id}`);

      if (response.data.success) {
        toast.success('Contact platform deleted successfully!');
        fetchContactPlatforms();
        setShowDeleteModal(false);
        setPlatformToDelete(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to delete contact platform');
      }
    } catch (error: unknown) {
      console.error('Error deleting contact platform:', error);
      toast.error('Error deleting contact platform');
    } finally {
      setSaving(false);
    }
  };

  const togglePlatformStatus = async (platform: ContactPlatform) => {
    const updatedPlatform = { ...platform, is_active: !platform.is_active };
    
    setSaving(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Use centralized API instance
      const response = await api.put(`/contact-platforms/admin/${platform.id}`, {
        is_active: !platform.is_active
      });

      if (response.data.success) {
        toast.success(`Platform ${!platform.is_active ? 'activated' : 'deactivated'} successfully!`);
        fetchContactPlatforms();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to update platform status');
      }
    } catch (error: unknown) {
      console.error('Error updating platform status:', error);
      toast.error('Error updating platform status');
    } finally {
      setSaving(false);
    }
  };

  const getIconComponent = (platform: ContactPlatform) => {
    // If custom icon URL exists, use it
    if (platform.custom_icon_url) {
      const { getApiUrl } = require('@/lib/getApiUrl');
      const apiUrl = getApiUrl().replace('/api', '');
      return (
        <div className="w-5 h-5 bg-white rounded flex items-center justify-center overflow-hidden shadow-sm">
          <img 
            src={`${apiUrl}${platform.custom_icon_url}`} 
            alt={platform.display_name}
            className="w-full h-full object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              const fallbackUrl = `${apiUrl}/api/images${platform.custom_icon_url}`;
              if (target.src !== fallbackUrl) {
                target.src = fallbackUrl;
              } else {
                if (target) {
                  target.style.display = 'none';
                  if (target.nextElementSibling) {
                    (target.nextElementSibling as HTMLElement).classList.remove('hidden');
                  }
                }
              }
            }}
          />
          <div className="hidden w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
            📷
          </div>
        </div>
      );
    }
    
    // Otherwise use the predefined icon
    switch (platform.icon_name) {
      case 'PhoneIcon': return <PhoneIcon className="w-5 h-5" />;
      case 'EnvelopeIcon': return <EnvelopeIcon className="w-5 h-5" />;
      case 'GlobeAltIcon': return <GlobeAltIcon className="w-5 h-5" />;
      case 'ChatBubbleLeftRightIcon': return <ChatBubbleLeftRightIcon className="w-5 h-5" />;
      case 'ShareIcon': return <ShareIcon className="w-5 h-5" />;
      case 'LinkIcon': return <LinkIcon className="w-5 h-5" />;
      case 'UserIcon': return <UserIcon className="w-5 h-5" />;
      case 'CalendarIcon': return <CalendarIcon className="w-5 h-5" />;
      case 'ClockIcon': return <ClockIcon className="w-5 h-5" />;
      case 'MapPinIcon': return <MapPinIcon className="w-5 h-5" />;
      case 'VideoCameraIcon': return <VideoCameraIcon className="w-5 h-5" />;
      case 'MicrophoneIcon': return <MicrophoneIcon className="w-5 h-5" />;
      case 'CameraIcon': return <CameraIcon className="w-5 h-5" />;
      case 'DocumentTextIcon': return <DocumentTextIcon className="w-5 h-5" />;
      case 'HeartIcon': return <HeartIcon className="w-5 h-5" />;
      case 'StarIcon': return <StarIcon className="w-5 h-5" />;
      case 'FireIcon': return <FireIcon className="w-5 h-5" />;
      case 'LightningBoltIcon': return <BoltIcon className="w-5 h-5" />;
      case 'SparklesIcon': return <SparklesIcon className="w-5 h-5" />;
      case 'GiftIcon': return <GiftIcon className="w-5 h-5" />;
      default: return <GlobeAltIcon className="w-5 h-5" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Access Denied:</strong> You must be logged in as an administrator to access this page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <a href="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </a>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Contact Platforms</h1>
          {isViewerAdmin ? (
            <button
              disabled
              className="bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed flex items-center"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add New Platform (View Only)
            </button>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add New Platform
            </button>
          )}
        </div>

        {/* Add New Platform Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Add New Contact Platform</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Name (unique identifier) *
                </label>
                <input
                  type="text"
                  value={newPlatform.platform_name}
                  onChange={(e) => handleInputChange('platform_name', e.target.value)}
                  className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="e.g., telegram, discord, youtube"
                  readOnly={isViewerAdmin}
                  disabled={isViewerAdmin}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={newPlatform.display_name}
                  onChange={(e) => handleInputChange('display_name', e.target.value)}
                  className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="e.g., Telegram, Discord, YouTube"
                  readOnly={isViewerAdmin}
                  disabled={isViewerAdmin}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Type
                </label>
                <select
                  value={newPlatform.platform_type}
                  onChange={(e) => handleInputChange('platform_type', e.target.value)}
                  className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  disabled={isViewerAdmin}
                >
                  {PLATFORM_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Value *
                </label>
                <input
                  type="text"
                  value={newPlatform.contact_value}
                  onChange={(e) => handleInputChange('contact_value', e.target.value)}
                  className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Phone number, email, or URL"
                  readOnly={isViewerAdmin}
                  disabled={isViewerAdmin}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <div className="space-y-3">
                  <select
                    value={newPlatform.icon_name}
                    onChange={(e) => handleInputChange('icon_name', e.target.value)}
                    className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    disabled={isViewerAdmin}
                  >
                    {ICON_OPTIONS.map(icon => (
                      <option key={icon.value} value={icon.value}>{icon.label}</option>
                    ))}
                  </select>
                  
                  <div className="text-center text-gray-500 text-sm">OR</div>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleIconUpload(file);
                        }
                      }}
                      className="hidden"
                      id="icon-upload"
                    />
                    <label
                      htmlFor="icon-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      {uploadingIcon ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      ) : (
                        <div className="text-gray-400">
                          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                      )}
                      <span className="text-sm text-gray-600">
                        {uploadingIcon ? 'Uploading...' : 'Upload Custom Icon'}
                      </span>
                      <span className="text-xs text-gray-400">PNG, JPG, SVG, WebP (max 2MB)</span>
                    </label>
                  </div>
                  
                  {newPlatform.custom_icon_url && (
                    <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-md">
                      <div className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center overflow-hidden shadow-sm">
                        <img 
                          src={`${getApiUrl().replace('/api', '')}${newPlatform.custom_icon_url}`}
                          alt="Custom icon preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.currentTarget;
                            const fallbackUrl = `${getApiUrl()}/images${newPlatform.custom_icon_url}`;
                            if (target.src !== fallbackUrl) {
                              target.src = fallbackUrl;
                            } else {
                              if (target) {
                                target.style.display = 'none';
                                if (target.nextElementSibling) {
                                  (target.nextElementSibling as HTMLElement).classList.remove('hidden');
                                }
                              }
                            }
                          }}
                        />
                        <div className="hidden w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                          📷
                        </div>
                      </div>
                      <span className="text-sm text-green-700">Custom icon uploaded</span>
                      <button
                        type="button"
                        onClick={() => setNewPlatform(prev => ({ ...prev, custom_icon_url: '', icon_name: 'GlobeAltIcon' }))}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <input
                  type="color"
                  value={newPlatform.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlatform}
                disabled={saving || isViewerAdmin}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : 'Add Platform'}
              </button>
            </div>
          </div>
        )}

        {/* Existing Platforms */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Contact Platforms ({platforms.length})</h2>
          </div>
          <div className="divide-y">
            {platforms.map((platform) => (
              <div key={platform.id} className="p-6">
                {editingPlatform?.id === platform.id ? (
                  // Edit Form
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platform Name
                      </label>
                      <input
                        type="text"
                        value={editingPlatform.platform_name}
                        onChange={(e) => handleEditInputChange('platform_name', e.target.value)}
                        className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        readOnly={isViewerAdmin}
                        disabled={isViewerAdmin}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={editingPlatform.display_name}
                        onChange={(e) => handleEditInputChange('display_name', e.target.value)}
                        className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        readOnly={isViewerAdmin}
                        disabled={isViewerAdmin}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Value
                      </label>
                      <input
                        type="text"
                        value={editingPlatform.contact_value}
                        onChange={(e) => handleEditInputChange('contact_value', e.target.value)}
                        className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        readOnly={isViewerAdmin}
                        disabled={isViewerAdmin}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color
                      </label>
                      <input
                        type="color"
                        value={editingPlatform.color}
                        onChange={(e) => handleEditInputChange('color', e.target.value)}
                        className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isViewerAdmin}
                      />
                    </div>
                    <div className="md:col-span-2 flex justify-end space-x-4">
                      <button
                        onClick={() => setEditingPlatform(null)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdatePlatform}
                        disabled={saving || isViewerAdmin}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: platform.color }}
                      >
                        {getIconComponent(platform)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{platform.display_name}</h3>
                        <p className="text-sm text-gray-600">{platform.contact_value}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            platform.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {platform.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                            {platform.platform_type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isViewerAdmin ? (
                        <span className="text-gray-400 text-xs">View Only</span>
                      ) : (
                        <>
                          <button
                            onClick={() => togglePlatformStatus(platform)}
                            className={`p-2 rounded-md ${
                              platform.is_active 
                                ? 'text-red-600 hover:bg-red-50' 
                                : 'text-green-600 hover:bg-green-50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={platform.is_active ? 'Deactivate' : 'Activate'}
                            disabled={isViewerAdmin}
                          >
                            {platform.is_active ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => setEditingPlatform(platform)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit"
                            disabled={isViewerAdmin}
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(platform)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                            disabled={isViewerAdmin}
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && platformToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
                setShowDeleteModal(false);
                setPlatformToDelete(null);
              }} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Delete Contact Platform</h3>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setPlatformToDelete(null);
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
                        Are you sure you want to delete this contact platform?
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Platform Name:</p>
                    <p className="text-sm text-gray-900 break-words mb-2">{platformToDelete.display_name}</p>
                    <p className="text-sm font-medium text-gray-700 mb-1">Contact Value:</p>
                    <p className="text-sm text-gray-900 break-words">{platformToDelete.contact_value}</p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setPlatformToDelete(null);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeletePlatform}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    <TrashIcon className="w-5 h-5 mr-2" />
                    {saving ? 'Deleting...' : 'Delete'}
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