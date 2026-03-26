'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, TrashIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { tierConfigApi } from '@/lib/api';
import api from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { Tier } from '@/types';

export default function TierConfigsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tierToDelete, setTierToDelete] = useState<Tier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    threshold: '',
    color: 'gray',
    description: '',
    benefits: '',
    icon: '⚪',
    display_order: 0,
    is_active: true,
    debt_limit: '',
    // Motivational message fields
    achievement_message: '',
    progress_message_25: '',
    progress_message_50: '',
    progress_message_75: '',
    progress_message_90: '',
    max_tier_message: ''
  });

  // Get admin permissions
  const { isViewerAdmin } = useAdminPermission();

  useEffect(() => {
    // Check authentication
    if (!authLoading) {
      if (!isAuthenticated || !user?.is_admin) {
        router.push('/login');
        return;
      }
      fetchTierConfigs();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchTierConfigs = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }
      
      const response = await api.get('/admin/tier-configs', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setTiers(response.data.data.tiers || []);
      } else {
        toast.error('Failed to fetch tier configurations');
      }
    } catch (error) {
      console.error('Error fetching tier configs:', error);
      toast.error('Error loading tier configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot modify tier configurations.');
      return;
    }

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        return;
      }

      const tierData = {
        ...formData,
        threshold: parseFloat(formData.threshold),
        display_order: parseInt(formData.display_order.toString())
      };

      let response;
      if (editingTier) {
        response = await api.put(`/admin/tier-configs/${editingTier.id}`, tierData, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } else {
        response = await api.post('/admin/tier-configs', tierData, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      if (response.data.success) {
        toast.success(editingTier ? 'Tier configuration updated successfully' : 'Tier configuration created successfully');
        setShowAddModal(false);
        setEditingTier(null);
        resetForm();
        fetchTierConfigs();
      } else {
        toast.error(response.data.message || 'Failed to save tier configuration');
      }
    } catch (error) {
      console.error('Error saving tier config:', error);
      toast.error('Error saving tier configuration');
    }
  };

  const handleDeleteClick = (tier: Tier) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot delete tier configurations.');
      return;
    }
    setTierToDelete(tier);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!tierToDelete || !tierToDelete.id) {
      return;
    }

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        setShowDeleteModal(false);
        setTierToDelete(null);
        return;
      }

      const response = await api.delete(`/admin/tier-configs/${tierToDelete.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Tier configuration deleted successfully');
        fetchTierConfigs();
        setShowDeleteModal(false);
        setTierToDelete(null);
      } else {
        toast.error(response.data.message || 'Failed to delete tier configuration');
      }
    } catch (error) {
      console.error('Error deleting tier config:', error);
      toast.error('Error deleting tier configuration');
    }
  };

  const handleUpdateAllTiers = async () => {
    if (!confirm('This will update all user tiers based on their current sales. Continue?')) {
      return;
    }

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        return;
      }

      const response = await api.post('/admin/tier-configs/update-all-tiers', {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'User tiers updated successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to update user tiers');
      }
    } catch (error) {
      console.error('Error updating user tiers:', error);
      toast.error('Failed to update user tiers');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      threshold: '',
      color: 'gray',
      description: '',
      benefits: '',
      icon: '⚪',
      display_order: 0,
      is_active: true,
      debt_limit: '',
      // Motivational message fields
      achievement_message: '',
      progress_message_25: '',
      progress_message_50: '',
      progress_message_75: '',
      progress_message_90: '',
      max_tier_message: ''
    });
  };

  const openEditModal = (tier: Tier) => {
    setEditingTier(tier);
    setFormData({
      name: tier.name,
      threshold: tier.threshold.toString(),
      color: tier.color,
      description: tier.description,
      benefits: tier.benefits,
      icon: tier.icon,
      display_order: tier.display_order || 0,
      is_active: tier.is_active !== undefined ? tier.is_active : true,
      debt_limit: (tier as any).debt_limit ? (tier as any).debt_limit.toString() : '',
      // Motivational message fields
      achievement_message: tier.achievement_message || '',
      progress_message_25: tier.progress_message_25 || '',
      progress_message_50: tier.progress_message_50 || '',
      progress_message_75: tier.progress_message_75 || '',
      progress_message_90: tier.progress_message_90 || '',
      max_tier_message: tier.max_tier_message || ''
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingTier(null);
    resetForm();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tier configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Admin Dashboard
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tier Configuration Management</h1>
            <p className="text-gray-600 mt-2">Manage the leaderboard tier system and requirements</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleUpdateAllTiers}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              disabled={isViewerAdmin}
              title={isViewerAdmin ? "Viewer Admin - View Only" : "Update all user tiers"}
            >
              Update All User Tiers
            </button>
            {!isViewerAdmin ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                disabled={isViewerAdmin}
              >
                Add New Tier
              </button>
            ) : (
              <button
                disabled
                className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed"
              >
                Add New Tier (View Only)
              </button>
            )}
          </div>
        </div>

        {/* Tier Configurations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Display Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Icon & Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales Threshold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debt Threshold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Benefits
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
                {tiers.map((tier) => (
                  <tr key={tier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tier.display_order || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{tier.icon}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{tier.name}</div>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${tier.color}-100 text-${tier.color}-800`}>
                            {tier.color}
                          </div>
                        </div>
                      </div>
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tier.threshold === 0 ? 'Starting tier' : `${tier.threshold.toLocaleString()} PKR`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(tier as any).debt_limit ? `${(tier as any).debt_limit.toLocaleString()} PKR` : 'Not set'}
                        </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={tier.description}>
                        {tier.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={tier.benefits}>
                        {tier.benefits}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tier.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {isViewerAdmin ? (
                        <span className="text-gray-400 text-sm">View Only</span>
                      ) : (
                        <>
                          <button
                            onClick={() => openEditModal(tier)}
                            className="text-blue-600 hover:text-blue-900 mr-3 disabled:text-gray-400 disabled:cursor-not-allowed"
                            disabled={isViewerAdmin}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(tier)}
                            className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                            disabled={isViewerAdmin || !tier.id}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingTier ? 'Edit Tier Configuration' : 'Add New Tier Configuration'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      required
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sales Threshold (PKR)</label>
                    <div className="mt-1 relative">
                      <input
                        type="number"
                        value={formData.threshold}
                        onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                        className={`block w-full border border-gray-300 rounded-md px-3 py-2 pr-16 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        required
                        min="0"
                        placeholder="0"
                        readOnly={isViewerAdmin}
                        disabled={isViewerAdmin}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">PKR</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Minimum total sales required for this tier
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Debt Limit (PKR)</label>
                    <div className="mt-1 relative">
                      <input
                        type="number"
                        value={formData.debt_limit}
                        onChange={(e) => setFormData({ ...formData, debt_limit: e.target.value })}
                        className={`block w-full border border-gray-300 rounded-md px-3 py-2 pr-16 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        required
                        min="0"
                        placeholder="50000"
                        readOnly={isViewerAdmin}
                        disabled={isViewerAdmin}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">PKR</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum debt allowed for users in this tier
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Color</label>
                    <select
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      disabled={isViewerAdmin}
                    >
                      <option value="gray">Gray</option>
                      <option value="green">Green</option>
                      <option value="blue">Blue</option>
                      <option value="purple">Purple</option>
                      <option value="red">Red</option>
                      <option value="yellow">Yellow</option>
                      <option value="orange">Orange</option>
                      <option value="pink">Pink</option>
                      <option value="indigo">Indigo</option>
                      <option value="teal">Teal</option>
                      <option value="cyan">Cyan</option>
                      <option value="lime">Lime</option>
                      <option value="amber">Amber</option>
                      <option value="emerald">Emerald</option>
                      <option value="violet">Violet</option>
                      <option value="rose">Rose</option>
                      <option value="sky">Sky</option>
                      <option value="slate">Slate</option>
                      <option value="zinc">Zinc</option>
                      <option value="neutral">Neutral</option>
                      <option value="stone">Stone</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      required
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Benefits</label>
                    <textarea
                      value={formData.benefits}
                      onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      rows={3}
                      required
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                  </div>

                  {/* Motivational Messages Section */}
                  <div className="col-span-2">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Motivational Messages</h3>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">🎉 Encouraging Message (Achievement Message)</label>
                    <textarea
                      value={formData.achievement_message}
                      onChange={(e) => setFormData({ ...formData, achievement_message: e.target.value })}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      rows={2}
                      placeholder="🎉 Congratulations! You've achieved the [Tier Name] tier!"
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                    <p className="mt-1 text-xs text-gray-500">This encouraging message is displayed in the "Your Current Tier" section when users reach this tier</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">25% Progress Message</label>
                    <textarea
                      value={formData.progress_message_25}
                      onChange={(e) => setFormData({ ...formData, progress_message_25: e.target.value })}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      rows={2}
                      placeholder="⭐ Great start! Every order brings you closer to the next tier!"
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                    <p className="mt-1 text-xs text-gray-500">Message shown at 25% progress</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">50% Progress Message</label>
                    <textarea
                      value={formData.progress_message_50}
                      onChange={(e) => setFormData({ ...formData, progress_message_50: e.target.value })}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      rows={2}
                      placeholder="🚀 Halfway there! Your dedication is paying off!"
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                    <p className="mt-1 text-xs text-gray-500">Message shown at 50% progress</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">75% Progress Message</label>
                    <textarea
                      value={formData.progress_message_75}
                      onChange={(e) => setFormData({ ...formData, progress_message_75: e.target.value })}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      rows={2}
                      placeholder="💪 You're making great progress! Keep it up!"
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                    <p className="mt-1 text-xs text-gray-500">Message shown at 75% progress</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">90% Progress Message</label>
                    <textarea
                      value={formData.progress_message_90}
                      onChange={(e) => setFormData({ ...formData, progress_message_90: e.target.value })}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      rows={2}
                      placeholder="🔥 So close! Just a few more orders to reach the next tier!"
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                    <p className="mt-1 text-xs text-gray-500">Message shown at 90% progress</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Tier Message</label>
                    <textarea
                      value={formData.max_tier_message}
                      onChange={(e) => setFormData({ ...formData, max_tier_message: e.target.value })}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      rows={2}
                      placeholder="🎉 Congratulations! You've achieved your current tier!"
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                    <p className="mt-1 text-xs text-gray-500">Message shown when this is the highest tier</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Icon</label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="⚪"
                      required
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Display Order</label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                      className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${isViewerAdmin ? 'cursor-not-allowed opacity-50' : ''}`}
                      disabled={isViewerAdmin}
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                      Active
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed ${isViewerAdmin ? 'opacity-60' : ''}`}
                      disabled={isViewerAdmin}
                    >
                      {editingTier ? 'Update' : 'Create'}
                    </button>
                    {isViewerAdmin && (
                      <p className="text-sm text-gray-500 text-center mt-2">
                        👁️ Viewer Admin: View-only mode. Changes cannot be saved.
                      </p>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && tierToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
                setShowDeleteModal(false);
                setTierToDelete(null);
              }} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Delete Tier Configuration</h3>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setTierToDelete(null);
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
                        Are you sure you want to delete this tier configuration?
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Tier Name:</p>
                    <p className="text-sm text-gray-900 break-words mb-2">{tierToDelete.name}</p>
                    <p className="text-sm font-medium text-gray-700 mb-1">Sales Threshold:</p>
                    <p className="text-sm text-gray-900">
                      {tierToDelete.threshold === 0 ? 'Starting tier' : `${tierToDelete.threshold.toLocaleString()} PKR`}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setTierToDelete(null);
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
    </div>
  );
}
