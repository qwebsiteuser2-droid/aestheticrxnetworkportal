'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getAccessToken } from '@/lib/auth';
import Image from 'next/image';
import { TrashIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';
import { getApiUrl, getApiBaseUrl as getApiBaseUrlFromLib } from '@/lib/getApiUrl';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  slot_index: number;
  is_visible: boolean;
  category: string;
  unit: string;
  is_featured: boolean;
  stock_quantity: number | null;
  created_at: string;
  updated_at: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    slot_index: '',
    stock_quantity: '',
    image: null as File | null
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
      fetchProducts();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchProducts = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }
      
      const response = await api.get('/admin/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success) {
        setProducts(response.data.data || []);
      } else {
        toast.error('Failed to fetch products');
      }
    } catch (error: unknown) {
      console.error('Error fetching products:', error);
      toast.error('Error loading products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent form submission for viewer admin
    if (isViewerAdmin) {
      toast.error('You have view-only access. Cannot save products.');
      return;
    }
    
    if (!formData.name || !formData.price || !formData.slot_index || !formData.stock_quantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    const slotIndex = parseInt(formData.slot_index);
    if (slotIndex < 1 || slotIndex > 100) {
      toast.error('Slot index must be between 1 and 100');
      return;
    }

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }
      
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('slot_index', formData.slot_index);
      formDataToSend.append('stock_quantity', formData.stock_quantity);
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      let response;
      if (editingProduct) {
        response = await api.put(`/admin/products/${editingProduct.id}`, formDataToSend, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        response = await api.post('/admin/products', formDataToSend, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      if (response.data.success) {
        toast.success(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
        setShowAddModal(false);
        setEditingProduct(null);
        setFormData({ name: '', description: '', price: '', slot_index: '', stock_quantity: '', image: null });
        fetchProducts();
      } else {
        toast.error(response.data.message || 'Failed to save product');
      }
    } catch (error: unknown) {
      console.error('Error saving product:', error);
      toast.error('Error saving product');
    }
  };

  const handleDeleteClick = (product: Product) => {
    // Prevent deleting for viewer admin
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot delete products.');
      return;
    }
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        setShowDeleteModal(false);
        setProductToDelete(null);
        return;
      }
      
      const response = await api.delete(`/admin/products/${productToDelete.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Product deleted successfully!');
        fetchProducts();
        setShowDeleteModal(false);
        setProductToDelete(null);
      } else {
        toast.error('Failed to delete product');
      }
    } catch (error: unknown) {
      console.error('Error deleting product:', error);
      toast.error('Error deleting product');
    }
  };

  const openEditModal = (product: Product) => {
    // Prevent editing for viewer admin
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot edit products.');
      return;
    }
    
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      slot_index: product.slot_index.toString(),
      stock_quantity: product.stock_quantity?.toString() || '0',
      image: null
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '', slot_index: '', stock_quantity: '', image: null });
  };

  // Helper function to get image URL (same as order page)
  const getImageUrl = (imageUrl: string | null | undefined): string => {
    if (!imageUrl) {
      return '';
    }
    
    // If image_url already starts with http:// or https://, use it directly (backend now returns full URLs)
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
  };

  // Get product image URL using the new database-backed endpoint (more reliable on Railway)
  const getProductImageById = (productId: string): string => {
    const baseUrl = getApiUrl();
    return `${baseUrl}/api/product-images/${productId}`;
  };

  // Create a grid of 100 slots
  const createSlotGrid = () => {
    const slots = [];
    for (let i = 1; i <= 100; i++) {
      const product = products.find(p => p.slot_index === i);
      slots.push(
        <div
          key={i}
          className={`relative border-2 border-dashed rounded-lg p-4 min-h-[280px] flex flex-col ${
            product ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'
          }`}
        >
          <div className="text-sm font-medium text-gray-600 mb-2">Slot {i}</div>
          
          {product ? (
            <>
              <div className="w-full h-32 mb-3 rounded-lg overflow-hidden border-2 border-green-500 bg-green-100">
                <img
                  src={getProductImageById(product.id)}
                  alt={product.name}
                  width={200}
                  height={128}
                  className="w-full h-full object-cover"
                  style={{ 
                    minWidth: '100%', 
                    minHeight: '100%',
                    backgroundColor: '#f0f0f0'
                  }}
                  onError={(e) => {
                    console.log('❌ Image failed to load:', product.name, product.id);
                    e.currentTarget.style.backgroundColor = '#ffcccc';
                    e.currentTarget.alt = 'FAILED TO LOAD';
                  }}
                />
              </div>
              <div className="text-center flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                  {product.name}
                </div>
                {product.description && (
                  <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {product.description}
                  </div>
                )}
                <div className="text-sm text-green-600 font-bold">
                  PKR {product.price.toLocaleString()}
                </div>
                <div className={`text-xs font-medium ${product.stock_quantity === 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  Stock: {product.stock_quantity || 0}
                </div>
              </div>
              <div className="absolute top-2 right-2 flex space-x-1">
                {isViewerAdmin ? (
                  <div className="p-1 bg-gray-400 text-white rounded text-xs cursor-not-allowed" title="Viewer Admin - Edit/Delete Disabled">
                    👁️
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title="Edit"
                      disabled={isViewerAdmin}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteClick(product)}
                      className="p-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title="Delete"
                      disabled={isViewerAdmin}
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="text-center flex-1 flex flex-col justify-center">
              <div className="text-gray-400 text-sm mb-3">Empty Slot</div>
              {!isViewerAdmin ? (
                <button
                  onClick={() => {
                    setFormData(prev => ({ ...prev, slot_index: i.toString() }));
                    setShowAddModal(true);
                  }}
                  className="text-blue-500 hover:text-blue-700 text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                  disabled={isViewerAdmin}
                >
                  Add Product
                </button>
              ) : (
                <div className="text-gray-400 text-sm">View Only</div>
              )}
            </div>
          )}
        </div>
      );
    }
    return slots;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{authLoading ? 'Checking authentication...' : 'Loading products...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Product Management - 100 Slots</h1>
              {isViewerAdmin && (
                <div className="flex items-center mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    👁️ View Only Mode
                  </span>
                </div>
              )}
            </div>
            <div className="flex space-x-4">
              {!isViewerAdmin ? (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  disabled={isViewerAdmin}
                >
                  Add New Product
                </button>
              ) : (
                <button
                  disabled
                  className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed"
                >
                  Add New Product (View Only)
                </button>
              )}
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Product Slot System</h3>
            <p className="text-blue-700 text-sm">
              Manage 100 product slots. Each slot can contain one product with image and price. 
              Products will be displayed to users in the Product Ordering page.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {createSlotGrid()}
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (PKR) *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter price"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter stock quantity"
                  min="0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Set to 0 to mark as out of stock
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slot Index *
                </label>
                <input
                  type="number"
                  value={formData.slot_index}
                  onChange={(e) => setFormData(prev => ({ ...prev, slot_index: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter slot number (1-100)"
                  min="1"
                  max="100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.files?.[0] || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {formData.image && (
                  <div className="mt-2">
                    <p className="text-sm text-green-600 mb-2">Selected: {formData.image.name}</p>
                    <img
                      src={URL.createObjectURL(formData.image)}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded border"
                    />
                  </div>
                )}
                {editingProduct && editingProduct.id && !formData.image && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Current image:</p>
                    <img
                      src={getProductImageById(editingProduct.id)}
                      alt="Current"
                      className="w-20 h-20 object-cover rounded border"
                    />
                  </div>
                )}
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && productToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
              setShowDeleteModal(false);
              setProductToDelete(null);
            }} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Delete Product</h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProductToDelete(null);
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
                      Are you sure you want to delete this product?
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">Product Name:</p>
                  <p className="text-sm text-gray-900 break-words mb-2">{productToDelete.name}</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">Price:</p>
                  <p className="text-sm text-gray-900">PKR {productToDelete.price.toLocaleString()}</p>
                  {productToDelete.description && (
                    <>
                      <p className="text-sm font-medium text-gray-700 mb-1 mt-2">Description:</p>
                      <p className="text-sm text-gray-900 break-words line-clamp-2">{productToDelete.description}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProductToDelete(null);
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