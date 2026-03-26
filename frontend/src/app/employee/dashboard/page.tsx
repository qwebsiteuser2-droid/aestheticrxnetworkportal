'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { toast } from 'react-hot-toast';
import { getAccessToken } from '@/lib/auth';
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

interface Order {
  id: string;
  order_number: string;
  qty: number;
  order_total: number;
  status: string;
  delivery_status: string;
  order_location: {
    address: string;
    lat: number;
    lng: number;
  };
  customer: {
    name: string;
    email: string;
    whatsapp?: string;
    clinic_name?: string;
  } | null;
  product: {
    name: string;
    description?: string;
  } | null;
  delivery_assigned_at?: string;
  delivery_started_at?: string;
  delivery_completed_at?: string;
}

// Running animation keyframes
const runningStyle = `
  @keyframes run {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(3px) rotate(5deg); }
    75% { transform: translateX(-3px) rotate(-5deg); }
  }
`;

export default function EmployeeDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [inProgressOrders, setInProgressOrders] = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-orders' | 'in-progress' | 'done'>('my-orders');
  const [startingDelivery, setStartingDelivery] = useState<string | null>(null);
  const [confirmStartDelivery, setConfirmStartDelivery] = useState<string | null>(null);
  const [markingDelivered, setMarkingDelivered] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // CRITICAL: Check if employee is deactivated
    if (user?.is_deactivated) {
      toast.error('Your account has been deactivated. Please contact support.');
      router.push('/login');
      return;
    }

    // Check if user is approved
    if (!user?.is_admin && !user?.is_approved) {
      router.push('/dashboard');
      return;
    }

    if (user?.user_type !== 'employee') {
      toast.error('Access denied. Employee access only.');
      router.push('/');
      return;
    }

    const loadData = async () => {
      await fetchOrders();
      await fetchInProgressOrders();
      await fetchDeliveredOrders();
    };
    loadData();
  }, [isAuthenticated, user, router]);

  const fetchOrders = async () => {
    try {
      // Use centralized API instance
      const response = await api.get('/employee/orders');

      if (response.data.success) {
        const data = response.data;
        const allOrders = data.data || [];
        console.log('📦 All orders from API:', allOrders.length);
        console.log('📦 Order statuses (full):', JSON.stringify(allOrders.map((o: any) => ({ 
          id: o.id, 
          order_number: o.order_number,
          delivery_status: o.delivery_status, 
          status: o.status,
          assigned_employee_id: o.assigned_employee_id
        })), null, 2));
        
        // Only show orders with 'assigned' or 'pending' status in "My Orders" tab (not in_transit or delivered)
        const assignedOrders = allOrders.filter((o: any) => {
          const deliveryStatus = String(o.delivery_status || '').toLowerCase().trim();
          const isInTransit = deliveryStatus === 'in_transit' || 
                             deliveryStatus === 'in-transit' || 
                             deliveryStatus === 'in transit' ||
                             deliveryStatus === 'intransit';
          const isDelivered = deliveryStatus === 'delivered' || o.status === 'completed';
          
          // Exclude orders that are already in transit or delivered
          if (isInTransit || isDelivered) {
            console.log('❌ Excluding from My Orders:', o.order_number, 'delivery_status:', o.delivery_status, 'status:', o.status);
            return false;
          }
          // Include orders that are assigned or accepted/pending without delivery_status
          const shouldInclude = o.delivery_status === 'assigned' || (!o.delivery_status && (o.status === 'accepted' || o.status === 'pending'));
          if (shouldInclude) {
            console.log('✅ Including in My Orders:', o.order_number, 'delivery_status:', o.delivery_status, 'status:', o.status);
          }
          return shouldInclude;
        });
        setOrders(assignedOrders);
        console.log('📦 Filtered assigned orders:', assignedOrders.length);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleStartDeliveryClick = (orderId: string) => {
    setConfirmStartDelivery(orderId);
  };

  const handleConfirmStartDelivery = async () => {
    if (!confirmStartDelivery) return;
    
    const orderId = confirmStartDelivery;
    setConfirmStartDelivery(null);
    
    try {
      setStartingDelivery(orderId);
      
      // Use centralized API instance
      const response = await api.post('/employee/start-delivery', { orderId });

      if (response.data.success) {
        const data = response.data;
        console.log('✅ Delivery started response:', data);
        toast.success('🚚 Delivery started! Start time recorded. Customer and admins have been notified via email.');
        
        // Get the order before removing it
        const orderToMove = orders.find(o => o.id === orderId);
        console.log('📦 Order to move:', orderToMove);
        
        // Immediately update the order status in the UI - remove from assigned, add to in-progress
        setOrders(prevOrders => {
          const filtered = prevOrders.filter(order => order.id !== orderId);
          console.log('📋 Removed from My Orders, remaining:', filtered.length);
          return filtered;
        });
        
        if (orderToMove) {
          // Use the order data from server response if available, otherwise use local data
          const updatedOrder = data.data ? {
            ...orderToMove,
            ...data.data,
            delivery_status: 'in_transit',
            delivery_started_at: data.data.delivery_started_at || new Date().toISOString()
          } : {
            ...orderToMove,
            delivery_status: 'in_transit',
            delivery_started_at: new Date().toISOString()
          };
          
          setInProgressOrders(prevOrders => {
            // Check if order already exists to avoid duplicates
            if (prevOrders.some(o => o.id === orderId)) {
              const updated = prevOrders.map(o => o.id === orderId ? updatedOrder : o);
              console.log('🔄 Updated existing in-progress order');
              return updated;
            }
            const added = [...prevOrders, updatedOrder];
            console.log('➕ Added to In Progress, total:', added.length);
            return added;
          });
        }
        
        // Refresh orders to get latest data from server
        setTimeout(async () => {
          await fetchOrders();
          await fetchInProgressOrders();
          await fetchDeliveredOrders();
        }, 500);
      } else {
        const data = await response.json();
        console.error('❌ Failed to start delivery:', data);
        toast.error(data.message || 'Failed to start delivery');
      }
    } catch (error) {
      console.error('Error starting delivery:', error);
      toast.error('Failed to start delivery');
    } finally {
      // Keep animation for a bit longer to show feedback
      setTimeout(() => {
        setStartingDelivery(null);
      }, 2000);
    }
  };

  const fetchInProgressOrders = async () => {
    try {
      // Use centralized API instance
      const response = await api.get('/employee/orders');

      if (response.data.success) {
        const data = response.data;
        const allOrders = data.data || [];
        // Filter only in-transit orders (check multiple possible values)
        const inProgress = allOrders.filter((o: any) => {
          const deliveryStatus = String(o.delivery_status || '').toLowerCase().trim();
          const isInTransit = deliveryStatus === 'in_transit' || 
                             deliveryStatus === 'in-transit' || 
                             deliveryStatus === 'in transit' ||
                             deliveryStatus === 'intransit';
          
          if (isInTransit) {
            console.log('✅ Found in-transit order:', o.order_number, 'delivery_status:', o.delivery_status);
          }
          return isInTransit;
        });
        setInProgressOrders(inProgress);
        console.log('🚚 ========== IN PROGRESS FILTERING ==========');
        console.log('🚚 All orders from API:', allOrders.length);
        console.log('🚚 All order delivery_statuses:', JSON.stringify(allOrders.map((o: any) => ({ 
          order_number: o.order_number,
          delivery_status: o.delivery_status,
          delivery_status_type: typeof o.delivery_status,
          status: o.status
        })), null, 2));
        console.log('🚚 Filtered in-transit orders:', inProgress.length);
        console.log('🚚 In-transit order details:', JSON.stringify(inProgress.map((o: any) => ({ 
          id: o.id, 
          order_number: o.order_number,
          delivery_status: o.delivery_status 
        })), null, 2));
        console.log('🚚 ============================================');
      }
    } catch (error) {
      console.error('Error fetching in-progress orders:', error);
    }
  };

  const fetchDeliveredOrders = async () => {
    try {
      // Use centralized API instance
      const response = await api.get('/employee/orders');

      if (response.data.success) {
        const data = response.data;
        // Filter only delivered orders
        const delivered = (data.data || []).filter((o: any) => 
          o.delivery_status === 'delivered' || o.status === 'completed'
        );
        setDeliveredOrders(delivered);
      }
    } catch (error) {
      console.error('Error fetching delivered orders:', error);
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    // Prevent multiple clicks or if already marking
    if (markingDelivered === orderId || markingDelivered !== null) {
      console.log('⚠️ Already processing delivery, ignoring duplicate click');
      return;
    }

    try {
      setMarkingDelivered(orderId);
      console.log('📦 Marking order as delivered:', orderId);
      // Use centralized API instance
      const response = await api.post('/employee/mark-delivered', { orderId });

      if (response.data.success) {
        const data = response.data;
        toast.success('✓ Order marked as delivered successfully! Admins have been notified via email.');
        
        // Get the order before removing it
        const orderToMove = inProgressOrders.find(o => o.id === orderId);
        
        // Immediately update the order status in the UI - remove from in-progress, add to delivered
        setInProgressOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        
        if (orderToMove) {
          const updatedOrder = data.data ? {
            ...orderToMove,
            ...data.data,
            delivery_status: 'delivered',
            delivery_completed_at: data.data.delivery_completed_at || new Date().toISOString(),
            status: 'completed'
          } : {
            ...orderToMove,
            delivery_status: 'delivered',
            delivery_completed_at: new Date().toISOString(),
            status: 'completed'
          };
          
          setDeliveredOrders(prevOrders => {
            // Check if order already exists to avoid duplicates
            if (prevOrders.some(o => o.id === orderId)) {
              return prevOrders.map(o => o.id === orderId ? updatedOrder : o);
            }
            return [...prevOrders, updatedOrder];
          });
        }
        
        // Refresh orders to get latest data from server
        setTimeout(async () => {
          await fetchOrders();
          await fetchInProgressOrders();
          await fetchDeliveredOrders();
        }, 500);
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to mark as delivered');
      }
    } catch (error) {
      console.error('Error marking as delivered:', error);
      toast.error('Failed to mark as delivered');
    } finally {
      setMarkingDelivered(null);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    const statusValue = status || 'pending';
    switch (statusValue) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filterOrders = (orderList: Order[]) => {
    if (!searchTerm.trim()) return orderList;
    const search = searchTerm.toLowerCase();
    return orderList.filter(order => 
      order.order_number.toLowerCase().includes(search) ||
      order.customer?.name.toLowerCase().includes(search) ||
      order.product?.name.toLowerCase().includes(search) ||
      order.customer?.email.toLowerCase().includes(search)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{runningStyle}</style>
      {/* Confirmation Modal */}
      {confirmStartDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Start Delivery</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to start delivery for this order? This will notify the customer and admins that the order is on its way.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmStartDelivery(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStartDelivery}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Yes, Start Delivery
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            <span>Back</span>
          </button>
        </div>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Employee Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage your delivery tasks</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search orders by order number, customer name, or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('my-orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('in-progress')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'in-progress'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              In Progress ({inProgressOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('done')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'done'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Done ({deliveredOrders.length})
            </button>
          </nav>
        </div>

        {/* My Orders Tab */}
        {activeTab === 'my-orders' && (
          <div className="space-y-4">
            {filterOrders(orders).length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">
                  {orders.length === 0 
                    ? 'No orders assigned to you yet.' 
                    : `No orders found matching "${searchTerm}"`}
                </p>
              </div>
            ) : (
              filterOrders(orders).map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.order_number}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {order.product?.name} × {order.qty}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.delivery_status || order.status || 'pending')}`}>
                      {(order.delivery_status || order.status || 'pending').replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Customer</p>
                      <p className="text-sm text-gray-900">{order.customer?.name}</p>
                      {order.customer?.whatsapp && (
                        <p className="text-xs text-gray-500">📱 {order.customer.whatsapp}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Delivery Address</p>
                      <p className="text-sm text-gray-900">{order.order_location?.address || 'N/A'}</p>
                    </div>
                    {order.delivery_assigned_at && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Assigned At</p>
                        <p className="text-sm text-gray-900">{new Date(order.delivery_assigned_at).toLocaleString()}</p>
                      </div>
                    )}
                    {order.delivery_started_at && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Started At</p>
                        <p className="text-sm text-gray-900">{new Date(order.delivery_started_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 items-center">
                    {/* Only show Start Delivery button for assigned or pending orders */}
                    {(order.delivery_status === 'assigned' || 
                      (!order.delivery_status && (order.status === 'accepted' || order.status === 'pending'))) ? (
                      <button
                        onClick={() => handleStartDeliveryClick(order.id)}
                        disabled={startingDelivery === order.id}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {startingDelivery === order.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>🚚 Starting Delivery...</span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg" style={{ animation: 'run 1s ease-in-out infinite' }}>🏃</span>
                            <span>Start Delivery</span>
                          </>
                        )}
                      </button>
                    ) : order.delivery_status === 'in_transit' ? (
                      <div className="w-full">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-800 rounded-lg flex-1">
                            <div className="relative">
                              <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            </div>
                            <div className="text-sm flex-1">
                              <p className="font-medium">🚚 Delivery In Progress</p>
                              {order.delivery_started_at && (
                                <p className="text-xs text-blue-600">
                                  Started: {new Date(order.delivery_started_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleMarkDelivered(order.id)}
                            disabled={markingDelivered === order.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {markingDelivered === order.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                                Marking...
                              </>
                            ) : (
                              '✓ Mark as Delivered'
                            )}
                          </button>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full animate-pulse" 
                            style={{ width: '75%' }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Delivery in progress... 75%</p>
                      </div>
                    ) : (
                      <div className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
                        Status: {(order.delivery_status || order.status || 'pending').replace('_', ' ').toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Done Tab - Delivered Orders */}
        {activeTab === 'done' && (
          <div className="space-y-4">
            {filterOrders(deliveredOrders).length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">
                  {deliveredOrders.length === 0 
                    ? 'No delivered orders yet.' 
                    : `No orders found matching "${searchTerm}"`}
                </p>
              </div>
            ) : (
              filterOrders(deliveredOrders).map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.order_number}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {order.product?.name} × {order.qty}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      DELIVERED
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Customer</p>
                      <p className="text-sm text-gray-900">{order.customer?.name}</p>
                      {order.customer?.whatsapp && (
                        <p className="text-xs text-gray-500">📱 {order.customer.whatsapp}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Delivery Address</p>
                      <p className="text-sm text-gray-900">{order.order_location?.address || 'N/A'}</p>
                    </div>
                    {order.delivery_assigned_at && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Assigned At</p>
                        <p className="text-sm text-gray-900">{new Date(order.delivery_assigned_at).toLocaleString()}</p>
                      </div>
                    )}
                    {order.delivery_started_at && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Started At</p>
                        <p className="text-sm text-gray-900">{new Date(order.delivery_started_at).toLocaleString()}</p>
                      </div>
                    )}
                    {order.delivery_completed_at && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Delivered At</p>
                        <p className="text-sm text-gray-900 font-semibold text-green-600">
                          {new Date(order.delivery_completed_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-800 rounded-lg">
                    <span className="text-lg">✓</span>
                    <div className="text-sm">
                      <p className="font-medium">Successfully Delivered</p>
                      {order.delivery_completed_at && (
                        <p className="text-xs text-green-600">
                          Completed: {new Date(order.delivery_completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* In Progress Tab */}
        {activeTab === 'in-progress' && (
          <div className="space-y-4">
            {filterOrders(inProgressOrders).length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">
                  {inProgressOrders.length === 0 
                    ? 'No orders in progress at the moment.' 
                    : `No orders found matching "${searchTerm}"`}
                </p>
              </div>
            ) : (
              filterOrders(inProgressOrders).map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.order_number}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {order.product?.name} × {order.qty}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      IN TRANSIT
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Customer</p>
                      <p className="text-sm text-gray-900">{order.customer?.name}</p>
                      {order.customer?.whatsapp && (
                        <p className="text-xs text-gray-500">📱 {order.customer.whatsapp}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Delivery Address</p>
                      <p className="text-sm text-gray-900">{order.order_location?.address || 'N/A'}</p>
                    </div>
                    {order.delivery_assigned_at && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Assigned At</p>
                        <p className="text-sm text-gray-900">{new Date(order.delivery_assigned_at).toLocaleString()}</p>
                      </div>
                    )}
                    {order.delivery_started_at && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Started At</p>
                        <p className="text-sm text-gray-900 font-semibold text-blue-600">
                          {new Date(order.delivery_started_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="w-full">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-800 rounded-lg flex-1">
                        <div className="relative">
                          <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        </div>
                        <div className="text-sm flex-1">
                          <p className="font-medium">🚚 Delivery In Progress</p>
                          {order.delivery_started_at && (
                            <p className="text-xs text-blue-600">
                              Started: {new Date(order.delivery_started_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                        <button
                          onClick={() => handleMarkDelivered(order.id)}
                          disabled={markingDelivered === order.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {markingDelivered === order.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                              Marking...
                            </>
                          ) : (
                            '✓ Mark as Delivered'
                          )}
                        </button>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full animate-pulse" 
                        style={{ width: '75%' }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Delivery in progress... 75%</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
    </>
  );
}
