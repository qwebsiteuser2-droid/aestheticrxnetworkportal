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
  PlusIcon,
  UserGroupIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Employee {
  id: string;
  doctor_name: string;
  email: string;
  whatsapp?: string;
  is_approved: boolean;
  is_deactivated?: boolean;
  created_at: string;
  assigned_orders_count?: number;
}

interface Order {
  id: string;
  order_number: string;
  qty: number;
  order_total: number;
  status: string;
  delivery_status: string;
  customer: {
    name: string;
    email: string;
  } | null;
  product: {
    name: string;
  } | null;
  assigned_employee_id?: string;
  delivery_assigned_at?: string;
  delivery_started_at?: string;
  delivery_completed_at?: string;
  created_at: string;
}

export default function EmployeeManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'employees' | 'orders' | 'create'>('employees');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

  const [createForm, setCreateForm] = useState({
    doctor_name: '',
    email: '',
    password: '',
    whatsapp: ''
  });

  useEffect(() => {
    // Wait for auth to load before checking
    if (!authLoading) {
      if (!isAuthenticated || !user?.is_admin) {
        router.push('/login');
        return;
      }
      fetchEmployees();
      fetchOrders();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchEmployees = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }
      
      // Use centralized API instance
      const response = await api.get('/admin/employees');

      if (response.data.success) {
        const data = response.data;
        // Get all employees directly from the endpoint
        const employeeList = data.data || [];
        
        // Get assigned orders count for each employee by querying all orders
        const allOrdersResponse = await api.get('/orders');
        
        let allOrders: any[] = [];
        if (allOrdersResponse.data.success) {
          const allOrdersData = allOrdersResponse.data;
          allOrders = allOrdersData.data?.orders || [];
        }
        
        const employeesWithCounts = employeeList.map((emp: any) => {
          const assignedCount = allOrders.filter((o: any) => 
            o.assigned_employee_id === emp.id && 
            (o.delivery_status === 'assigned' || o.delivery_status === 'in_transit')
          ).length;
          // Ensure is_deactivated is explicitly set (default to false if undefined)
          return { 
            ...emp, 
            assigned_orders_count: assignedCount,
            is_deactivated: emp.is_deactivated ?? false
          };
        });
        
        console.log('Employees fetched:', employeesWithCounts.length, employeesWithCounts.map((e: any) => ({ 
          name: e.doctor_name, 
          is_approved: e.is_approved, 
          is_deactivated: e.is_deactivated 
        })));
        
        setEmployees(employeesWithCounts);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        return;
      }
      
      // Use centralized API instance
      const response = await api.get('/orders');

      if (response.data.success) {
        const data = response.data;
        // Show all orders that are not delivered (pending, accepted, assigned, in_transit)
        const orderList = (data.data?.orders || []).filter((o: any) => 
          o.delivery_status !== 'delivered' && o.status !== 'completed'
        );
        setOrders(orderList.map((o: any) => ({
          ...o,
          customer: o.doctor ? {
            name: o.doctor.doctor_name,
            email: o.doctor.email
          } : null,
          product: o.product ? {
            name: o.product.name
          } : null
        })));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot create employees.');
      return;
    }
    
    if (!createForm.doctor_name || !createForm.email || !createForm.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }
      
      // Use centralized API instance
      const response = await api.post('/auth/register', {
        ...createForm,
        user_type: 'employee'
      });

      // Axios response format: response.data contains the response body
      if (response.data && response.data.success) {
        toast.success('Employee created successfully!');
        setCreateForm({ doctor_name: '', email: '', password: '', whatsapp: '' });
        setShowCreateForm(false);
        fetchEmployees();
      } else {
        toast.error(response.data?.message || 'Failed to create employee');
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error('Failed to create employee');
    }
  };

  const handleAssignOrder = async (orderId?: string, employeeId?: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot assign orders.');
      return;
    }
    
    const orderToAssign = orderId ? orders.find(o => o.id === orderId) : selectedOrder;
    const employeeToAssign = employeeId || selectedEmployee;
    
    if (!orderToAssign) {
      toast.error('Please select an order');
      return;
    }
    
    if (!employeeToAssign) {
      toast.error('Please select an employee');
      return;
    }
    
    // Verify employee is active and not deactivated
    const employee = employees.find(e => e.id === employeeToAssign);
    if (!employee) {
      toast.error('Selected employee not found');
      return;
    }
    
    if (!employee.is_approved) {
      toast.error('Selected employee is not approved');
      return;
    }
    
    if (employee.is_deactivated) {
      toast.error('Selected employee is deactivated. Please reactivate the employee first.');
      return;
    }

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }
      
      // Use centralized API instance with increased timeout
      // Order assignment may involve database updates and notifications, increase timeout
      const response = await api.post('/admin/assign-order', {
        orderId: orderToAssign.id,
        employeeId: employeeToAssign
      }, {
        timeout: 30000 // 30 seconds for order assignment operations
      });

      // Axios response format: response.data contains the response body
      if (response.data && response.data.success) {
        toast.success('Order assigned successfully!');
        // Only clear selection if this was the selected order
        if (orderToAssign.id === selectedOrder?.id) {
          setSelectedOrder(null);
          setSelectedEmployee('');
        }
        fetchOrders();
        fetchEmployees();
      } else {
        toast.error(response.data?.message || 'Failed to assign order');
      }
    } catch (error) {
      console.error('Error assigning order:', error);
      toast.error('Failed to assign order');
    }
  };

  const handleToggleEmployeeStatus = async (employeeId: string, isCurrentlyActive: boolean) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot change employee status.');
      return;
    }
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }
      
      // isCurrentlyActive = true means employee is NOT deactivated, so we want to deactivate
      // isCurrentlyActive = false means employee IS deactivated, so we want to reactivate
      const action = isCurrentlyActive ? 'deactivate' : 'reactivate';
      // Use centralized API instance
      const response = await api.post(`/admin/users/${employeeId}/${action}`);

      // Axios response format: response.data contains the response body
      if (response.data && response.data.success) {
        toast.success(`Employee ${action === 'deactivate' ? 'deactivated' : 'reactivated'} successfully!`);
        fetchEmployees();
      } else {
        toast.error(response.data?.message || `Failed to ${action} employee`);
      }
    } catch (error) {
      console.error('Error updating employee status:', error);
      toast.error('Failed to update employee status');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link 
            href="/admin" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
          <p className="mt-2 text-gray-600">Manage employees, assign orders, and track deliveries</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('employees')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'employees'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserGroupIcon className="w-5 h-5" />
              <span>Employees ({employees.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TruckIcon className="w-5 h-5" />
              <span>Assign Orders ({orders.length})</span>
            </button>
            {!isViewerAdmin ? (
              <button
                onClick={() => {
                  setActiveTab('create');
                  setShowCreateForm(true);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'create'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={isViewerAdmin}
              >
                <PlusIcon className="w-5 h-5" />
                <span>Create Employee</span>
              </button>
            ) : (
              <button
                disabled
                className="py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 border-transparent text-gray-400 opacity-50 cursor-not-allowed"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Create Employee (View Only)</span>
              </button>
            )}
          </nav>
        </div>

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">All Employees</h2>
            </div>
            <div className="p-6">
              {employees.length === 0 ? (
                <div className="text-center py-12">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No employees</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new employee.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          WhatsApp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned Orders
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employees.map((employee) => (
                        <tr key={employee.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{employee.doctor_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{employee.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{employee.whatsapp || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              employee.is_deactivated
                                ? 'bg-red-100 text-red-800'
                                : employee.is_approved
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {employee.is_deactivated ? 'Deactivated' : employee.is_approved ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {employee.assigned_orders_count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              {isViewerAdmin ? (
                                <span className="text-gray-400 text-xs">View Only</span>
                              ) : (
                                <button
                                  onClick={() => handleToggleEmployeeStatus(employee.id, !employee.is_deactivated)}
                                  className={`${
                                    !employee.is_deactivated
                                      ? 'text-red-600 hover:text-red-900'
                                      : 'text-green-600 hover:text-green-900'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  title={!employee.is_deactivated ? 'Deactivate Employee' : 'Reactivate Employee'}
                                  disabled={isViewerAdmin}
                                >
                                  {!employee.is_deactivated ? (
                                    <XCircleIcon className="w-5 h-5" />
                                  ) : (
                                    <CheckCircleIcon className="w-5 h-5" />
                                  )}
                                </button>
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
          </div>
        )}

        {/* Assign Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter Options */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Filter Orders:</label>
                <button
                  onClick={() => setOrderFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    orderFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isViewerAdmin}
                >
                  All Orders
                </button>
                <button
                  onClick={() => setOrderFilter('unassigned')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    orderFilter === 'unassigned'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isViewerAdmin}
                >
                  Unassigned
                </button>
                <button
                  onClick={() => setOrderFilter('assigned')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    orderFilter === 'assigned'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isViewerAdmin}
                >
                  Assigned
                </button>
              </div>
            </div>
            {orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No orders available</h3>
                <p className="mt-1 text-sm text-gray-500">All orders have been assigned or there are no pending orders.</p>
              </div>
            ) : (
              orders
                .filter((order) => {
                  if (orderFilter === 'assigned') return !!order.assigned_employee_id;
                  if (orderFilter === 'unassigned') return !order.assigned_employee_id;
                  return true; // 'all'
                })
                .map((order) => (
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
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.delivery_status === 'assigned'
                        ? 'bg-blue-100 text-blue-800'
                        : order.delivery_status === 'in_transit'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order.delivery_status === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {(order.delivery_status || order.status || 'pending').replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Customer</p>
                      <p className="text-sm text-gray-900">{order.customer?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Amount</p>
                      <p className="text-sm text-gray-900">PKR {Number(order.order_total).toLocaleString()}</p>
                    </div>
                  </div>

                  {!order.assigned_employee_id && (
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assign to Employee
                        </label>
                        <select
                          value={selectedOrder?.id === order.id ? selectedEmployee : ''}
                          onChange={(e) => {
                            if (isViewerAdmin) return;
                            const employeeId = e.target.value;
                            setSelectedEmployee(employeeId);
                            setSelectedOrder(order);
                          }}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          disabled={isViewerAdmin}
                        >
                          <option value="">Select employee...</option>
                          {employees
                            .filter(e => e.is_approved && !e.is_deactivated)
                            .map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.doctor_name} ({emp.email})
                              </option>
                            ))}
                        </select>
                      </div>
                      {isViewerAdmin ? (
                        <button
                          disabled
                          className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                        >
                          Assign (View Only)
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const employeeId = selectedOrder?.id === order.id ? selectedEmployee : '';
                            if (employeeId) {
                              handleAssignOrder(order.id, employeeId);
                            } else {
                              toast.error('Please select an employee first');
                            }
                          }}
                          disabled={!selectedEmployee || selectedOrder?.id !== order.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  )}

                  {order.assigned_employee_id && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Assigned to:</strong> {employees.find(emp => emp.id === order.assigned_employee_id)?.doctor_name || 'N/A'}
                      </p>
                      <p className="text-sm text-blue-800 mt-1">
                        <strong>Delivery Status:</strong> {(order.delivery_status || order.status || 'pending').replace('_', ' ').toUpperCase()}
                      </p>
                      {order.delivery_assigned_at && (
                        <p className="text-xs text-blue-600 mt-1">
                          Assigned: {new Date(order.delivery_assigned_at).toLocaleString()}
                        </p>
                      )}
                      {order.delivery_started_at && (
                        <p className="text-xs text-blue-600 mt-1">
                          Started: {new Date(order.delivery_started_at).toLocaleString()}
                        </p>
                      )}
                      {order.delivery_completed_at && (
                        <p className="text-xs text-green-600 mt-1">
                          Delivered: {new Date(order.delivery_completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Create Employee Tab */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Employee</h2>
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div>
                <label htmlFor="doctor_name" className="block text-sm font-medium text-gray-700">
                  Employee Name *
                </label>
                <input
                  type="text"
                  id="doctor_name"
                  value={createForm.doctor_name}
                  onChange={(e) => setCreateForm({ ...createForm, doctor_name: e.target.value })}
                  className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  required
                  readOnly={isViewerAdmin}
                  disabled={isViewerAdmin}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  required
                  readOnly={isViewerAdmin}
                  disabled={isViewerAdmin}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  required
                  readOnly={isViewerAdmin}
                  disabled={isViewerAdmin}
                />
              </div>

              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
                  WhatsApp (Optional)
                </label>
                <input
                  type="text"
                  id="whatsapp"
                  value={createForm.whatsapp}
                  onChange={(e) => setCreateForm({ ...createForm, whatsapp: e.target.value })}
                  className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="+1234567890"
                  readOnly={isViewerAdmin}
                  disabled={isViewerAdmin}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className={`flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed ${isViewerAdmin ? 'opacity-60' : ''}`}
                  disabled={isViewerAdmin}
                >
                  Create Employee
                </button>
                {isViewerAdmin && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    👁️ Viewer Admin: View-only mode. Cannot create employees.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateForm({ doctor_name: '', email: '', password: '', whatsapp: '' });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

