'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getAccessToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface APIToken {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  provider: string;
  token_value: string; // This will be masked
  is_active: boolean;
  is_default: boolean;
  metadata?: any;
  last_used_at?: string;
  last_validated_at?: string;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminAPITokensPage() {
  const { user, isAuthenticated } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const [tokens, setTokens] = useState<APIToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingToken, setEditingToken] = useState<APIToken | null>(null);
  const [validatingToken, setValidatingToken] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    provider: 'huggingface',
    token_value: '',
    is_active: true,
    is_default: false,
    metadata: {}
  });

  useEffect(() => {
    if (isAuthenticated && user?.is_admin) {
      fetchTokens();
    }
  }, [isAuthenticated, user]);

  const fetchTokens = async () => {
    try {
      // Use centralized API instance
      const response = await api.get('/api-tokens');

      if (response.data.success) {
        setTokens(response.data.data.tokens || []);
      } else {
        toast.error('Failed to fetch API tokens');
      }
    } catch (error) {
      console.error('Error fetching API tokens:', error);
      toast.error('Failed to fetch API tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot save API tokens.');
      return;
    }
    
    try {
      const apiUrl = getApiUrl();
      const token = getAccessToken();
      
      const url = editingToken 
        ? `${apiUrl}/api-tokens/${editingToken.id}`
        : `${apiUrl}/api-tokens`;
      
      const method = editingToken ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingToken ? 'API token updated successfully' : 'API token created successfully');
        setShowModal(false);
        setEditingToken(null);
        resetForm();
        fetchTokens();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save API token');
      }
    } catch (error) {
      console.error('Error saving API token:', error);
      toast.error('Failed to save API token');
    }
  };

  const handleEdit = (token: APIToken) => {
    setEditingToken(token);
    setFormData({
      name: token.name,
      display_name: token.display_name,
      description: token.description || '',
      provider: token.provider,
      token_value: '', // Don't pre-fill token value for security
      is_active: token.is_active,
      is_default: token.is_default,
      metadata: token.metadata || {}
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot delete API tokens.');
      return;
    }
    if (!confirm('Are you sure you want to delete this API token?')) return;
    
    try {
      // Use centralized API instance
      const response = await api.delete(`/api-tokens/${id}`);

      if (response.data.success) {
        toast.success('API token deleted successfully');
        fetchTokens();
      } else {
        toast.error(response.data.message || 'Failed to delete API token');
      }
    } catch (error) {
      console.error('Error deleting API token:', error);
      toast.error('Failed to delete API token');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      // Use centralized API instance
      const response = await api.patch(`/api-tokens/${id}/toggle-status`);

      if (response.data.success) {
        toast.success('API token status updated');
        fetchTokens();
      } else {
        toast.error(response.data.message || 'Failed to update API token status');
      }
    } catch (error) {
      console.error('Error toggling API token status:', error);
      toast.error('Failed to update API token status');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      // Use centralized API instance
      const response = await api.patch(`/api-tokens/${id}/set-default`);

      if (response.data.success) {
        toast.success('Default API token updated');
        fetchTokens();
      } else {
        toast.error(response.data.message || 'Failed to set default API token');
      }
    } catch (error) {
      console.error('Error setting default API token:', error);
      toast.error('Failed to set default API token');
    }
  };

  const handleValidateToken = async (id: number) => {
    setValidatingToken(id);
    try {
      // Use centralized API instance
      const response = await api.post(`/api-tokens/${id}/validate`);

      if (response.data.success) {
        if (response.data.data.isValid) {
          toast.success('API token is valid');
        } else {
          toast.error(`API token validation failed: ${response.data.data.errorMessage}`);
        }
        fetchTokens();
      } else {
        toast.error(response.data.message || 'Failed to validate API token');
      }
    } catch (error) {
      console.error('Error validating API token:', error);
      toast.error('Failed to validate API token');
    } finally {
      setValidatingToken(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      provider: 'huggingface',
      token_value: '',
      is_active: true,
      is_default: false,
      metadata: {}
    });
  };

  const openModal = () => {
    setEditingToken(null);
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingToken(null);
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
          <p className="mt-4 text-gray-600">Loading API tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">API Tokens Management</h1>
              <p className="mt-2 text-gray-600">Manage API tokens for AI services</p>
            </div>
            {isViewerAdmin ? (
              <button
                disabled
                className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add New Token (View Only)
              </button>
            ) : (
              <button
                onClick={openModal}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add New Token
              </button>
            )}
          </div>
        </div>

        {/* Tokens Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Validation
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
                {tokens.map((token) => (
                  <tr key={token.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {token.display_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {token.token_value}
                        </div>
                        {token.description && (
                          <div className="text-xs text-gray-400 mt-1">
                            {token.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {token.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(token.id)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          token.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {token.is_active ? (
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircleIcon className="w-3 h-3 mr-1" />
                        )}
                        {token.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          token.is_valid
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {token.is_valid ? (
                            <ShieldCheckIcon className="w-3 h-3 mr-1" />
                          ) : (
                            <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                          )}
                          {token.is_valid ? 'Valid' : 'Invalid'}
                        </div>
                        <button
                          onClick={() => handleValidateToken(token.id)}
                          disabled={validatingToken === token.id}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          {validatingToken === token.id ? 'Testing...' : 'Test'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {token.is_default ? (
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <StarIcon className="w-3 h-3 mr-1" />
                          Default
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(token.id)}
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
                            onClick={() => handleEdit(token)}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit token"
                            disabled={isViewerAdmin}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          {!token.is_default && (
                            <button
                              onClick={() => handleDelete(token.id)}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete token"
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
                  {editingToken ? 'Edit API Token' : 'Add New API Token'}
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Token Value</label>
                    <input
                      type="password"
                      value={formData.token_value}
                      onChange={(e) => setFormData({...formData, token_value: e.target.value})}
                      className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder={editingToken ? "Leave empty to keep current token" : "Enter API token"}
                      required={!editingToken}
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
                      {editingToken ? 'Update' : 'Create'}
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
