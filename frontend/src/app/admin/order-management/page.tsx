'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/auth';
import { PaymentModal } from '@/components/PaymentModal';
import { TrashIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';

interface Order {
  id: string;
  order_number: string;
  doctor_name: string;
  doctor_email: string;
  product_name: string;
  product_price: number;
  qty: number;
  order_total: number;
  payment_amount: number;
  remaining_amount: number;
  payment_status: 'completed' | 'partial' | 'pending';
  payment_method: string;
  order_date: string;
  payment_date?: string;
  notes?: string;
  status: string;
}

interface OrderStatistics {
  totalOrders: number;
  completedOrders: number;
  partialOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  partialRevenue: number;
  pendingRevenue: number;
}

export default function OrderManagementPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statistics, setStatistics] = useState<OrderStatistics>({
    totalOrders: 0,
    completedOrders: 0,
    partialOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    partialRevenue: 0,
    pendingRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updateData, setUpdateData] = useState({
    paymentStatus: '',
    paymentAmount: 0,
    notes: ''
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllStep, setDeleteAllStep] = useState<1 | 2 | 3>(1);
  const [deleteAllConfirmationText, setDeleteAllConfirmationText] = useState('');

  useEffect(() => {
    // Check authentication
    if (!isLoading && (!isAuthenticated || !user?.is_admin)) {
      toast.error('Access denied. Admin privileges required.');
      router.push('/login');
      return;
    }
    
    if (isAuthenticated && user?.is_admin) {
      fetchOrders();
    }
  }, [isAuthenticated, user, isLoading, router]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Get token from cookies (using auth library)
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }
      
      const response = await api.get('/order-management', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setOrders(response.data.data || []);
        setStatistics(response.data.statistics || {});
      } else {
        toast.error('Failed to fetch orders');
      }
    } catch (error) {
      toast.error('Error fetching orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrder = (order: Order) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot update orders.');
      return;
    }
    setSelectedOrder(order);
    setUpdateData({
      paymentStatus: order.payment_status,
      paymentAmount: order.payment_amount,
      notes: order.notes || ''
    });
    setShowUpdateModal(true);
  };

  const handleSaveUpdate = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot update orders.');
      setShowUpdateModal(false);
      return;
    }
    if (!selectedOrder) return;

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const response = await api.put(`/order-management/${selectedOrder.id}/status`, updateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Order updated successfully');
        setShowUpdateModal(false);
        fetchOrders();
      } else {
        console.error('Update order error:', response.status, response.data);
        toast.error(`Failed to update order: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error updating order');
    }
  };

  const handleAddPayment = async (order: Order) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot add payments.');
      return;
    }
    setPaymentOrder(order);
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async (amount: number) => {
    if (!paymentOrder) return;

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      // If this is from a status change to partial, update the order status
      if (showPaymentModal) {
        const response = await api.put(`/order-management/${paymentOrder.id}/status`, {
          paymentStatus: 'partial',
          paymentAmount: amount,
          notes: `Partial payment of PKR ${amount.toLocaleString()}`
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.data.success) {
          toast.success(`Order status updated to partial with payment of PKR ${amount.toLocaleString()}`);
          fetchOrders();
        } else {
          console.error('Update order error:', response.status, response.data);
          toast.error(`Failed to update order: ${response.data.message || 'Unknown error'}`);
        }
      } else {
        // This is from the "Add Payment" button
        const response = await api.post(`/order-management/${paymentOrder.id}/payment`, { paymentAmount: amount }, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.data.success) {
          toast.success('Payment added successfully');
          fetchOrders();
        } else {
          console.error('Add payment error:', response.status, response.data);
          toast.error(`Failed to add payment: ${response.data.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Error processing payment');
    }
  };

  // Bulk operations
  const handleSelectOrder = (orderId: string) => {
    if (isViewerAdmin) {
      return; // Viewer Admin cannot select orders
    }
    setSelectedOrders((prev: string[]) => 
      prev.includes(orderId) 
        ? prev.filter((id: string) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (isViewerAdmin) {
      return; // Viewer Admin cannot select orders
    }
    if (selectAll) {
      setSelectedOrders([]);
      setSelectAll(false);
    } else {
      setSelectedOrders(filteredOrders.map((order: Order) => order.id));
      setSelectAll(true);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot update orders.');
      return;
    }
    if (selectedOrders.length === 0) {
      toast.error('Please select orders to update');
      return;
    }

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const promises = selectedOrders.map((orderId: string) => {
        const order = filteredOrders.find((o: Order) => o.id === orderId);
        return api.put(`/order-management/${orderId}/status`, {
          paymentStatus: newStatus,
          paymentAmount: newStatus === 'completed' ? order?.order_total || 0 : 0,
          notes: `Bulk status update to ${newStatus}`
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      });

      const results = await Promise.all(promises);
      const successCount = results.filter((r: any) => r.data.success).length;
      
      if (successCount === selectedOrders.length) {
        toast.success(`Successfully updated ${successCount} orders to ${newStatus}`);
        setSelectedOrders([]);
        setSelectAll(false);
        fetchOrders();
      } else {
        toast.error(`Updated ${successCount} out of ${selectedOrders.length} orders`);
      }
    } catch (error) {
      toast.error('Error updating orders');
    }
  };

  const handleQuickStatusChange = async (orderId: string, newStatus: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot change order status.');
      return;
    }
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const order = filteredOrders.find((o: Order) => o.id === orderId);
      let paymentAmount = 0;

      // If setting to partial, show payment modal
      if (newStatus === 'partial') {
        setPaymentOrder(order || null);
        setShowPaymentModal(true);
        return; // Don't proceed with the API call yet
      } else if (newStatus === 'completed') {
        paymentAmount = order?.order_total || 0;
      }

      const response = await api.put(`/order-management/${orderId}/status`, {
        paymentStatus: newStatus,
        paymentAmount: paymentAmount,
        notes: `Quick status change to ${newStatus}`
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success(`Order status updated to ${newStatus}`);
        fetchOrders();
      } else {
        toast.error('Failed to update order status');
      }
    } catch (error) {
      toast.error('Error updating order status');
    }
  };

    const filteredOrders = orders.filter((order: Order) => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        order.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        order.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'partial': return '⚠️';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <a href="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Admin Dashboard
          </a>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">🛒 Order Management System</h1>
        <p className="text-gray-600 mb-8">Track and manage all orders, payments, and payment status.</p>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <div 
            className={`bg-white p-6 rounded-lg shadow cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
              statusFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => setStatusFilter('all')}
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.totalOrders}</p>
              </div>
            </div>
          </div>

          <div 
            className={`bg-white p-6 rounded-lg shadow cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
              statusFilter === 'completed' ? 'ring-2 ring-green-500 bg-green-50' : ''
            }`}
            onClick={() => setStatusFilter('completed')}
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.completedOrders}</p>
              </div>
            </div>
          </div>

          <div 
            className={`bg-white p-6 rounded-lg shadow cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
              statusFilter === 'partial' ? 'ring-2 ring-yellow-500 bg-yellow-50' : ''
            }`}
            onClick={() => setStatusFilter('partial')}
          >
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Partial Payments</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.partialOrders}</p>
                <p className="text-sm text-gray-500">PKR {statistics.partialRevenue?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </div>

          <div 
            className={`bg-white p-6 rounded-lg shadow cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
              statusFilter === 'pending' ? 'ring-2 ring-red-500 bg-red-50' : ''
            }`}
            onClick={() => setStatusFilter('pending')}
          >
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.pendingOrders}</p>
              </div>
            </div>
          </div>

          <div 
            className={`bg-white p-6 rounded-lg shadow cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
              statusFilter === 'completed' ? 'ring-2 ring-green-500 bg-green-50' : ''
            }`}
            onClick={() => setStatusFilter('completed')}
            title="Click to view completed orders (revenue collected)"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue Collected</p>
                <p className="text-lg font-bold text-gray-900">PKR {statistics.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div 
            className={`bg-white p-6 rounded-lg shadow cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
              statusFilter === 'pending' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
            }`}
            onClick={() => setStatusFilter('pending')}
            title="Click to view pending orders (revenue pending)"
          >
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Revenue</p>
                <p className="text-lg font-bold text-gray-900">PKR {typeof statistics.pendingRevenue === 'string' ? '0' : statistics.pendingRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Indicator */}
        {statusFilter !== 'all' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
                <span className="text-sm font-medium text-blue-900">
                  Showing: {statusFilter === 'completed' ? 'Completed Orders' : 
                           statusFilter === 'partial' ? 'Partial Payment Orders' : 
                           statusFilter === 'pending' ? 'Pending Orders' : 'All Orders'}
                </span>
              </div>
              <button
                onClick={() => setStatusFilter('all')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear Filter
              </button>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search orders, doctors, or order numbers..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="partial">Partial Payments</option>
                <option value="pending">Pending</option>
              </select>
              <button
                onClick={fetchOrders}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={() => {
                  if (isViewerAdmin) {
                    toast.error('Viewer Admin: You have view-only access. Cannot delete orders.');
                    return;
                  }
                  setDeleteAllStep(1);
                  setDeleteAllConfirmationText('');
                  setShowDeleteAllModal(true);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                disabled={isViewerAdmin}
              >
                <TrashIcon className="w-5 h-5 mr-2" />
                Delete All Orders
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedOrders.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBulkStatusUpdate('completed')}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    disabled={isViewerAdmin}
                  >
                    Mark as Completed
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('partial')}
                    className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    disabled={isViewerAdmin}
                  >
                    Mark as Partial
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('pending')}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    disabled={isViewerAdmin}
                  >
                    Mark as Pending
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedOrders([]);
                  setSelectAll(false);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Orders ({filteredOrders.length})</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  disabled={isViewerAdmin}
                >
                  {selectAll ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>
          </div>
          
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Orders Found</h3>
              <p className="mt-1 text-sm text-gray-500">No orders match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isViewerAdmin}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order: Order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isViewerAdmin}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                        <div className="text-sm text-gray-500">Qty: {order.qty}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.doctor_name}</div>
                        <div className="text-sm text-gray-500">{order.doctor_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.product_name}</div>
                        <div className="text-sm text-gray-500">PKR {order.product_price}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">PKR {order.order_total.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">
                          Paid: PKR {order.payment_amount.toLocaleString()}
                          {order.remaining_amount > 0 && (
                            <span className="text-red-600"> (Remaining: PKR {order.remaining_amount.toLocaleString()})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.payment_status)}`}>
                            {getStatusIcon(order.payment_status)} {order.payment_status.toUpperCase()}
                          </span>
                          <select
                            value={order.payment_status}
                            onChange={(e) => handleQuickStatusChange(order.id, e.target.value)}
                            className={`text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            disabled={isViewerAdmin}
                          >
                            <option value="pending">Pending</option>
                            <option value="partial">Partial</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.order_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {isViewerAdmin ? (
                            <span className="text-gray-400 text-sm">View Only</span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleUpdateOrder(order)}
                                className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                                disabled={isViewerAdmin}
                              >
                                Update
                              </button>
                              {order.payment_status !== 'completed' && (
                                <button
                                  onClick={() => handleAddPayment(order)}
                                  className="text-green-600 hover:text-green-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                                  disabled={isViewerAdmin}
                                >
                                  Add Payment
                                </button>
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
          )}
        </div>

        {/* Update Modal */}
        {showUpdateModal && selectedOrder && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Update Order: {selectedOrder.order_number}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                    <select
                      value={updateData.paymentStatus}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUpdateData({ ...updateData, paymentStatus: e.target.value })}
                      className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      disabled={isViewerAdmin}
                    >
                      <option value="pending">Pending</option>
                      <option value="partial">Partial Payment</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Amount</label>
                    <input
                      type="number"
                      value={updateData.paymentAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUpdateData({ ...updateData, paymentAmount: Number(e.target.value) })}
                      className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="Enter payment amount"
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={updateData.notes}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUpdateData({ ...updateData, notes: e.target.value })}
                      className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      rows={3}
                      placeholder="Add notes about this order"
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowUpdateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveUpdate}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentOrder(null);
          }}
          onConfirm={handlePaymentConfirm}
          orderNumber={paymentOrder?.order_number || ''}
          orderTotal={paymentOrder?.order_total || 0}
          currentPaid={paymentOrder?.payment_amount || 0}
        />

        {/* Delete All Orders Three-Step Confirmation Modal */}
        {showDeleteAllModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
                if (deleteAllStep === 1) {
                  setShowDeleteAllModal(false);
                  setDeleteAllStep(1);
                  setDeleteAllConfirmationText('');
                }
              }} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {deleteAllStep === 1 && 'Delete All Orders - Step 1'}
                    {deleteAllStep === 2 && 'Delete All Orders - Step 2'}
                    {deleteAllStep === 3 && 'Delete All Orders - Final Confirmation'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowDeleteAllModal(false);
                      setDeleteAllStep(1);
                      setDeleteAllConfirmationText('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Step 1: Initial Confirmation */}
                {deleteAllStep === 1 && (
                  <div>
                    <div className="mb-6">
                      <div className="flex items-center mb-4">
                        <div className="flex-shrink-0">
                          <ExclamationTriangleIcon className="w-12 h-12 text-red-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            Are you sure you want to delete all orders?
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            This is a critical action that cannot be undone.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteAllModal(false);
                          setDeleteAllStep(1);
                          setDeleteAllConfirmationText('');
                        }}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteAllStep(2)}
                        className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Type Confirmation Text */}
                {deleteAllStep === 2 && (
                  <div>
                    <div className="mb-6">
                      <div className="flex items-center mb-4">
                        <div className="flex-shrink-0">
                          <ExclamationTriangleIcon className="w-12 h-12 text-orange-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            Type "DELETE ALL" to confirm
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            This ensures you understand the severity of this action.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <input
                          type="text"
                          value={deleteAllConfirmationText}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteAllConfirmationText(e.target.value)}
                          placeholder="Type DELETE ALL here"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteAllStep(1);
                          setDeleteAllConfirmationText('');
                        }}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (deleteAllConfirmationText === 'DELETE ALL') {
                            setDeleteAllStep(3);
                          } else {
                            toast.error('Please type "DELETE ALL" exactly to continue');
                          }
                        }}
                        disabled={deleteAllConfirmationText !== 'DELETE ALL'}
                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Final Confirmation */}
                {deleteAllStep === 3 && (
                  <div>
                    <div className="mb-6">
                      <div className="flex items-center mb-4">
                        <div className="flex-shrink-0">
                          <ExclamationTriangleIcon className="w-12 h-12 text-red-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-bold text-red-900">
                            FINAL WARNING
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            This action cannot be undone.
                          </p>
                        </div>
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
                        <p className="text-sm font-medium text-red-900 mb-2">
                          You are about to delete:
                        </p>
                        <p className="text-2xl font-bold text-red-600 mb-2">
                          {statistics.totalOrders} orders
                        </p>
                        <p className="text-sm text-red-700">
                          All order data, payment information, and order history will be permanently deleted.
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteAllStep(2);
                        }}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const token = getAccessToken();
                            if (!token) {
                              toast.error('Authentication token not found');
                              return;
                            }

                            const response = await api.delete('/order-management/all', {
                              headers: {
                                'Authorization': `Bearer ${token}`,
                              },
                            });

                            if (response.ok) {
                              const data = await response.json();
                              toast.success(`Successfully deleted ${data.deletedCount || statistics.totalOrders} orders`);
                              setShowDeleteAllModal(false);
                              setDeleteAllStep(1);
                              setDeleteAllConfirmationText('');
                              fetchOrders();
                            } else {
                              toast.error(response.data.message || 'Failed to delete all orders');
                            }
                          } catch (error) {
                            console.error('Error deleting all orders:', error);
                            toast.error('Error deleting all orders');
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                      >
                        <TrashIcon className="w-5 h-5 mr-2" />
                        Delete All Orders
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
