'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getAccessToken } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  CogIcon,
  ArrowLeftIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface AIModel {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  model_id: string;
  is_active: boolean;
  is_default: boolean;
  max_tokens: number;
  temperature: number;
  max_requests_per_minute: number;
  provider?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export default function AdminAIModelsPage() {
  const { user, isAuthenticated } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<AIModel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    model_id: '',
    max_tokens: 2000,
    temperature: 0.7,
    max_requests_per_minute: 20,
    provider: 'huggingface',
    is_active: true,
    is_default: false,
    metadata: {}
  });

  useEffect(() => {
    if (isAuthenticated && user?.is_admin) {
      fetchModels();
    }
  }, [isAuthenticated, user]);

  const fetchModels = async () => {
    try {
      // Use centralized API instance
      const response = await api.get('/ai-models');

      if (response.data.success) {
        setModels(response.data.data.models || []);
      } else {
        toast.error('Failed to fetch AI models');
      }
    } catch (error: unknown) {
      console.error('Error fetching AI models:', error);
      toast.error('Failed to fetch AI models');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot save AI models.');
      return;
    }
    
    try {
      const { getApiUrl } = require('@/lib/getApiUrl');
      const apiUrl = getApiUrl();
      const token = getAccessToken();
      
      const url = editingModel 
        ? `${apiUrl}/ai-models/${editingModel.id}`
        : `${apiUrl}/ai-models`;
      
      const method = editingModel ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingModel ? 'AI model updated successfully' : 'AI model created successfully');
        setShowModal(false);
        setEditingModel(null);
        resetForm();
        fetchModels();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save AI model');
      }
    } catch (error: unknown) {
      console.error('Error saving AI model:', error);
      toast.error('Failed to save AI model');
    }
  };

  const handleEdit = (model: AIModel) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      display_name: model.display_name,
      description: model.description || '',
      model_id: model.model_id,
      max_tokens: model.max_tokens,
      temperature: model.temperature,
      max_requests_per_minute: model.max_requests_per_minute,
      provider: model.provider || 'huggingface',
      is_active: model.is_active,
      is_default: model.is_default,
      metadata: model.metadata || {}
    });
    setShowModal(true);
  };

  const handleDeleteClick = (model: AIModel) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot delete AI models.');
      return;
    }
    setModelToDelete(model);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!modelToDelete) return;
    
    try {
      // Use centralized API instance
      const response = await api.delete(`/ai-models/${modelToDelete.id}`);

      if (response.data.success) {
        toast.success('AI model deleted successfully');
        fetchModels();
        setShowDeleteModal(false);
        setModelToDelete(null);
      } else {
        toast.error(response.data.message || 'Failed to delete AI model');
      }
    } catch (error: unknown) {
      console.error('Error deleting AI model:', error);
      toast.error('Failed to delete AI model');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      // Use centralized API instance
      const response = await api.patch(`/ai-models/${id}/toggle-status`);

      if (response.data.success) {
        toast.success('AI model status updated');
        fetchModels();
      } else {
        toast.error(response.data.message || 'Failed to update AI model status');
      }
    } catch (error: unknown) {
      console.error('Error toggling AI model status:', error);
      toast.error('Failed to update AI model status');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      // Use centralized API instance
      const response = await api.patch(`/ai-models/${id}/set-default`);

      if (response.data.success) {
        toast.success('Default AI model updated');
        fetchModels();
      } else {
        toast.error(response.data.message || 'Failed to set default AI model');
      }
    } catch (error: unknown) {
      console.error('Error setting default AI model:', error);
      toast.error('Failed to set default AI model');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      model_id: '',
      max_tokens: 2000,
      temperature: 0.7,
      max_requests_per_minute: 20,
      provider: 'huggingface',
      is_active: true,
      is_default: false,
      metadata: {}
    });
  };

  const openModal = () => {
    setEditingModel(null);
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingModel(null);
    resetForm();
  };

  if (!isAuthenticated || !user?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AI models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Models Management</h1>
              <p className="mt-2 text-gray-600">Manage AI models available for the chatbot</p>
            </div>
            {isViewerAdmin ? (
              <button
                disabled
                className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add New Model (View Only)
              </button>
            ) : (
              <button
                onClick={openModal}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add New Model
              </button>
            )}
          </div>
        </div>

        {/* Models Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Default
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {models.map((model) => (
                  <tr key={model.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {model.display_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {model.model_id}
                        </div>
                        {model.description && (
                          <div className="text-xs text-gray-400 mt-1">
                            {model.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {model.provider || 'huggingface'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(model.id)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          model.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {model.is_active ? (
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircleIcon className="w-3 h-3 mr-1" />
                        )}
                        {model.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {model.is_default ? (
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <StarIcon className="w-3 h-3 mr-1" />
                          Default
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(model.id)}
                          className="text-gray-400 hover:text-yellow-600"
                          title="Set as default"
                        >
                          <StarIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {isViewerAdmin ? (
                        <span className="text-gray-400 text-xs">View Only</span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(model)}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit model"
                            disabled={isViewerAdmin}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          {!model.is_default && (
                            <button
                              onClick={() => handleDeleteClick(model)}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete model"
                              disabled={isViewerAdmin}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingModel ? 'Edit AI Model' : 'Add New AI Model'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      required
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Display Name</label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      required
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Model ID</label>
                    <input
                      type="text"
                      value={formData.model_id}
                      onChange={(e) => setFormData({...formData, model_id: e.target.value})}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="e.g., meta-llama/Meta-Llama-3-8B-Instruct:novita"
                      required
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      rows={3}
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max Tokens</label>
                      <input
                        type="number"
                        value={formData.max_tokens}
                        onChange={(e) => setFormData({...formData, max_tokens: parseInt(e.target.value)})}
                        className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        min="1"
                        readOnly={isViewerAdmin}
                        disabled={isViewerAdmin}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Temperature</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.temperature}
                        onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                        className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        min="0"
                        max="2"
                        readOnly={isViewerAdmin}
                        disabled={isViewerAdmin}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Requests/Minute</label>
                    <input
                      type="number"
                      value={formData.max_requests_per_minute}
                      onChange={(e) => setFormData({...formData, max_requests_per_minute: parseInt(e.target.value)})}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      min="1"
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Provider</label>
                    <select
                      value={formData.provider}
                      onChange={(e) => setFormData({...formData, provider: e.target.value})}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      disabled={isViewerAdmin}
                    >
                      <option value="huggingface">Hugging Face</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                        className={`rounded border-gray-300 text-primary-600 focus:ring-primary-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isViewerAdmin}
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_default}
                        onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                        className={`rounded border-gray-300 text-primary-600 focus:ring-primary-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isViewerAdmin}
                      />
                      <span className="ml-2 text-sm text-gray-700">Default</span>
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                      disabled={isViewerAdmin}
                    >
                      {editingModel ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && modelToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
                setShowDeleteModal(false);
                setModelToDelete(null);
              }} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Delete AI Model</h3>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setModelToDelete(null);
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
                        Are you sure you want to delete this AI model?
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Model Name:</p>
                    <p className="text-sm text-gray-900 break-words mb-2">{modelToDelete.display_name}</p>
                    <p className="text-sm font-medium text-gray-700 mb-1">Model ID:</p>
                    <p className="text-sm text-gray-900 break-words">{modelToDelete.model_id}</p>
                    {modelToDelete.description && (
                      <>
                        <p className="text-sm font-medium text-gray-700 mb-1 mt-2">Description:</p>
                        <p className="text-sm text-gray-900 break-words line-clamp-2">{modelToDelete.description}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setModelToDelete(null);
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
