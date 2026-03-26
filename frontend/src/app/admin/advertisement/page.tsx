'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, isAuthenticated } from '../../../lib/auth';
import api from '@/lib/api';

interface AdvertisementPlacement {
  id: string;
  name: string;
  description: string;
  type: string;
  position: string;
  max_ads: number;
  current_ads: number;
  dimensions: {
    width: number;
    height: number;
    min_width?: number;
    max_width?: number;
    min_height?: number;
    max_height?: number;
  };
  styles: {
    background_color?: string;
    border_radius?: number;
    padding?: number;
    margin?: number;
    z_index?: number;
  };
  allow_user_selection: boolean;
  visible_to_guests: boolean;
  device_type: string;
  responsive_breakpoints?: {
    mobile?: { width: number; height: number };
    tablet?: { width: number; height: number };
    desktop?: { width: number; height: number };
  };
  status: string;
  priority: number;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

interface AdvertisementApplication {
  id: string;
  title: string;
  description: string;
  image_url: string;
  target_url: string;
  button_text: string;
  button_color: string;
  background_color: string;
  text_color: string;
  budget: number;
  start_date: string;
  end_date: string;
  status: string;
  rejection_reason: string;
  admin_notes: string;
  requested_placements: string[];
  approved_placement: AdvertisementPlacement;
  contact_preferences: string;
  placement_change_notified: boolean;
  created_at: string;
  updated_at: string;
  doctor?: {
    id: string;
    doctor_id: number;
    doctor_name: string;
    clinic_name: string;
    email: string;
  };
}

interface PlacementPricing {
  id: string;
  placement_id: string;
  duration_days: number;
  price_per_day: number;
  total_price: number;
  is_active: boolean;
  created_at: string;
}

export default function AdvertisementManagement() {
  const router = useRouter();
  const [placements, setPlacements] = useState<AdvertisementPlacement[]>([]);
  const [applications, setApplications] = useState<AdvertisementApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'placements' | 'applications' | 'page-editor' | 'pricing'>('placements');
  const [showCreatePlacement, setShowCreatePlacement] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<AdvertisementApplication | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<AdvertisementPlacement | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Form states
  const [newPlacement, setNewPlacement] = useState({
    name: '',
    description: '',
    type: 'banner',
    position: '',
    max_ads: 1,
    dimensions: { width: 300, height: 250 },
    styles: { background_color: '#ffffff', border_radius: 8, padding: 10 },
    allow_user_selection: true,
    visible_to_guests: true,
    device_type: 'all',
    responsive_breakpoints: {
      mobile: { width: 300, height: 200 },
      tablet: { width: 500, height: 150 },
      desktop: { width: 300, height: 250 }
    },
    status: 'active',
    priority: 50,
    admin_notes: ''
  });

  const [pricing, setPricing] = useState({
    duration_days: 30,
    price_per_day: 100,
    total_price: 3000
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const token = getAccessToken();
      const [placementsRes, applicationsRes] = await Promise.all([
        api.get('/placements', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        api.get('/applications', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (placementsRes.ok) {
        const placementsData = await placementsRes.json();
        setPlacements(placementsData.data);
      }

      if (applicationsRes.ok) {
        const applicationsData = await applicationsRes.json();
        setApplications(applicationsData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAccessToken();
      const response = await api.get('/placements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPlacement)
      });

      if (response.ok) {
        await fetchData();
        setShowCreatePlacement(false);
        setNewPlacement({
          name: '',
          description: '',
          type: 'banner',
          position: '',
          max_ads: 1,
          dimensions: { width: 300, height: 250 },
          styles: { background_color: '#ffffff', border_radius: 8, padding: 10 },
          allow_user_selection: true,
          visible_to_guests: true,
          device_type: 'all',
          responsive_breakpoints: {
            mobile: { width: 300, height: 200 },
            tablet: { width: 500, height: 150 },
            desktop: { width: 300, height: 250 }
          },
          status: 'active',
          priority: 50,
          admin_notes: ''
        });
        alert('Advertisement placement created successfully!');
      } else {
        alert('Error creating placement');
      }
    } catch (error) {
      console.error('Error creating placement:', error);
      alert('Error creating placement');
    }
  };

  const handleApproveApplication = async (applicationId: string, placementId: string, adminNotes: string) => {
    try {
      const token = getAccessToken();
      const response = await api.post(`/applications/${applicationId}/approve`, {
        placement_id: placementId,
        admin_notes: adminNotes
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data.success) {
        await fetchData();
        setShowApplicationModal(false);
        setSelectedApplication(null);
        alert('Advertisement application approved successfully!');
      } else {
        alert('Error approving application');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      alert('Error approving application');
    }
  };

  const handleRejectApplication = async (applicationId: string, rejectionReason: string, adminNotes: string) => {
    try {
      const token = getAccessToken();
      const response = await api.post(`/applications/${applicationId}/reject`, {
        rejection_reason: rejectionReason,
        admin_notes: adminNotes
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data.success) {
        await fetchData();
        setShowApplicationModal(false);
        setSelectedApplication(null);
        alert('Advertisement application rejected');
      } else {
        alert('Error rejecting application');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Error rejecting application');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading advertisement management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📢 Advertisement Management</h1>
          <p className="mt-2 text-gray-600">Manage advertisement placements, review applications, and design page layouts</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('placements')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'placements'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📍 Advertisement Placements ({placements.length})
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'applications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📋 Applications ({applications.length})
              </button>
              <button
                onClick={() => setActiveTab('page-editor')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'page-editor'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🎨 Page Editor & Preview
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pricing'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                💰 Pricing Management
              </button>
            </nav>
          </div>
        </div>

        {/* Placements Tab */}
        {activeTab === 'placements' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Advertisement Placements</h2>
              <button
                onClick={() => setShowCreatePlacement(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                ➕ Create New Placement
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {placements.map((placement) => (
                <div key={placement.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{placement.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(placement.status)}`}>
                      {placement.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">{placement.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span className="font-medium">{placement.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Position:</span>
                      <span className="font-medium">{placement.position}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Capacity:</span>
                      <span className="font-medium">{placement.current_ads}/{placement.max_ads}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Priority:</span>
                      <span className="font-medium">{placement.priority}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">User Selection:</span>
                      <span className="font-medium">{placement.allow_user_selection ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Guest Visible:</span>
                      <span className="font-medium">{placement.visible_to_guests ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Device Type:</span>
                      <span className={`font-medium px-2 py-1 rounded text-xs ${
                        placement.device_type === 'mobile' ? 'bg-blue-100 text-blue-800' :
                        placement.device_type === 'tablet' ? 'bg-green-100 text-green-800' :
                        placement.device_type === 'desktop' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {placement.device_type.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {placement.admin_notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">
                        <strong>Admin Notes:</strong> {placement.admin_notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedPlacement(placement);
                        setShowPricingModal(true);
                      }}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
                    >
                      💰 Set Pricing
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('page-editor');
                        setPreviewMode(true);
                      }}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                    >
                      👀 Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Advertisement Applications</h2>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {applications.map((application) => (
                  <li key={application.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {application.image_url ? (
                              <img className="h-12 w-12 rounded-lg object-cover" src={application.image_url} alt={application.title} />
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-400 text-lg">📢</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-900">{application.title}</p>
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                                {application.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">by {application.doctor?.doctor_name || 'Unknown'} ({application.doctor?.clinic_name || 'N/A'})</p>
                            <p className="text-sm text-gray-500">Budget: PKR {application.budget.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {new Date(application.created_at).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedApplication(application);
                              setShowApplicationModal(true);
                            }}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Page Editor & Preview Tab */}
        {activeTab === 'page-editor' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">🎨 Page Editor & Preview</h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    previewMode 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {previewMode ? '👀 Preview Mode ON' : '👁️ Enable Preview'}
                </button>
                <button
                  onClick={() => window.open('/landing-page-demo.html', '_blank')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🚀 Open Live Demo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Page Layout Designer */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📐 Page Layout Designer</h3>
                <p className="text-gray-600 mb-4">Design and position advertisement zones on your pages</p>
                
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Landing Page Layout</h4>
                    <div className="space-y-2">
                      <div className="bg-blue-100 p-2 rounded text-sm">
                        📍 Header Banner Zone (728×90px)
                      </div>
                      <div className="bg-green-100 p-2 rounded text-sm">
                        📍 Content Inline Zone (600×200px)
                      </div>
                      <div className="bg-purple-100 p-2 rounded text-sm">
                        📍 Sidebar Zone (300×250px)
                      </div>
                      <div className="bg-orange-100 p-2 rounded text-sm">
                        📍 Footer Banner Zone (728×90px)
                      </div>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Mobile Layout</h4>
                    <div className="space-y-2">
                      <div className="bg-blue-100 p-2 rounded text-sm">
                        📱 Mobile Header (320×50px)
                      </div>
                      <div className="bg-orange-100 p-2 rounded text-sm">
                        📱 Mobile Footer (320×50px)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                    🎨 Open Visual Editor
                  </button>
                </div>
              </div>

              {/* Live Preview */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">👀 Live Preview</h3>
                <p className="text-gray-600 mb-4">See how your website looks with advertisements</p>
                
                <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">👁️</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">Website Preview</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      See how advertisements appear on your landing page
                    </p>
                    <button
                      onClick={() => {
                        // Open frontend URL - use current origin
                        const frontendUrl = typeof window !== 'undefined' 
                          ? window.location.origin 
                          : 'http://localhost:3000';
                        window.open(frontendUrl, '_blank');
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Live Website
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => window.open('/landing-page-demo.html', '_blank')}
                    className="bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    📱 Mobile Demo
                  </button>
                  <button
                    onClick={() => window.open('/landing-page-demo.html', '_blank')}
                    className="bg-purple-600 text-white py-2 px-3 rounded text-sm hover:bg-purple-700 transition-colors"
                  >
                    💻 Desktop Demo
                  </button>
                </div>
              </div>
            </div>

            {/* Advertisement Placement Zones */}
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📍 Current Advertisement Zones</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {placements.slice(0, 6).map((placement) => (
                  <div key={placement.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{placement.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${
                        placement.device_type === 'mobile' ? 'bg-blue-100 text-blue-800' :
                        placement.device_type === 'desktop' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {placement.device_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{placement.description}</p>
                    <div className="text-xs text-gray-500">
                      <div>Size: {placement.dimensions.width}×{placement.dimensions.height}px</div>
                      <div>Capacity: {placement.current_ads}/{placement.max_ads}</div>
                      <div>Priority: {placement.priority}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pricing Management Tab */}
        {activeTab === 'pricing' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">💰 Pricing Management</h2>
              <button
                onClick={() => setShowPricingModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                ➕ Set Placement Pricing
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pricing Overview */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Pricing Overview</h3>
                <div className="space-y-4">
                  {placements.slice(0, 5).map((placement) => (
                    <div key={placement.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{placement.name}</h4>
                        <span className="text-sm text-gray-500">{placement.device_type}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center">
                          <div className="font-medium text-gray-900">7 Days</div>
                          <div className="text-green-600">PKR 700</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-900">30 Days</div>
                          <div className="text-green-600">PKR 2,500</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-900">90 Days</div>
                          <div className="text-green-600">PKR 6,500</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Calculator */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🧮 Pricing Calculator</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Placement</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option>Choose a placement...</option>
                      {placements.map((placement) => (
                        <option key={placement.id} value={placement.id}>
                          {placement.name} ({placement.device_type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Days)</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price per Day (PKR)</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="100"
                    />
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">PKR 3,000</div>
                      <div className="text-sm text-green-700">Total Price for 30 days</div>
                    </div>
                  </div>
                  <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                    💰 Set This Pricing
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Placement Modal */}
        {showCreatePlacement && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Advertisement Placement</h3>
                <form onSubmit={handleCreatePlacement} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={newPlacement.name}
                      onChange={(e) => setNewPlacement({ ...newPlacement, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newPlacement.description}
                      onChange={(e) => setNewPlacement({ ...newPlacement, description: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <select
                        value={newPlacement.type}
                        onChange={(e) => setNewPlacement({ ...newPlacement, type: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="banner">Banner</option>
                        <option value="sidebar">Sidebar</option>
                        <option value="content">Content</option>
                        <option value="footer">Footer</option>
                        <option value="popup">Popup</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Position</label>
                      <input
                        type="text"
                        value={newPlacement.position}
                        onChange={(e) => setNewPlacement({ ...newPlacement, position: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="e.g., mobile-top, desktop-sidebar"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Device Type</label>
                      <select
                        value={newPlacement.device_type}
                        onChange={(e) => setNewPlacement({ ...newPlacement, device_type: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="all">All Devices</option>
                        <option value="mobile">Mobile Only</option>
                        <option value="tablet">Tablet Only</option>
                        <option value="desktop">Desktop Only</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max Ads</label>
                      <input
                        type="number"
                        value={newPlacement.max_ads}
                        onChange={(e) => setNewPlacement({ ...newPlacement, max_ads: parseInt(e.target.value) })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <input
                        type="number"
                        value={newPlacement.priority}
                        onChange={(e) => setNewPlacement({ ...newPlacement, priority: parseInt(e.target.value) })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPlacement.allow_user_selection}
                        onChange={(e) => setNewPlacement({ ...newPlacement, allow_user_selection: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Allow User Selection</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPlacement.visible_to_guests}
                        onChange={(e) => setNewPlacement({ ...newPlacement, visible_to_guests: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Visible to Guests</span>
                    </label>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreatePlacement(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Create Placement
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Modal */}
        {showPricingModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">💰 Set Placement Pricing</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Placement</label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">{selectedPlacement?.name}</div>
                      <div className="text-sm text-gray-600">{selectedPlacement?.device_type} • {selectedPlacement?.dimensions.width}×{selectedPlacement?.dimensions.height}px</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Days)</label>
                    <input
                      type="number"
                      value={pricing.duration_days}
                      onChange={(e) => setPricing({ ...pricing, duration_days: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price per Day (PKR)</label>
                    <input
                      type="number"
                      value={pricing.price_per_day}
                      onChange={(e) => setPricing({ ...pricing, price_per_day: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="100"
                    />
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">PKR {pricing.duration_days * pricing.price_per_day}</div>
                      <div className="text-sm text-green-700">Total Price for {pricing.duration_days} days</div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowPricingModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        alert('Pricing set successfully!');
                        setShowPricingModal(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Set Pricing
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Application Review Modal */}
        {showApplicationModal && selectedApplication && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Review Advertisement Application</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Application Details */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Application Details</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Title</label>
                        <p className="text-sm text-gray-900">{selectedApplication.title}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <p className="text-sm text-gray-900">{selectedApplication.description}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Budget</label>
                        <p className="text-sm text-gray-900">PKR {selectedApplication.budget.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Duration</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedApplication.start_date).toLocaleDateString()} - {new Date(selectedApplication.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Applicant</label>
                        {selectedApplication.doctor ? (
                          <>
                            <p className="text-sm text-gray-900">
                              {selectedApplication.doctor.doctor_name} ({selectedApplication.doctor.clinic_name})
                            </p>
                            <p className="text-sm text-gray-500">{selectedApplication.doctor.email}</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">No doctor information available</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Available Placements */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Available Placements</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {placements
                        .filter(p => p.status === 'active')
                        .map((placement) => (
                          <div key={placement.id} className="border rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium text-sm">{placement.name}</h5>
                                <p className="text-xs text-gray-500">{placement.description}</p>
                                <p className="text-xs text-gray-500">
                                  Capacity: {placement.current_ads}/{placement.max_ads}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  const adminNotes = prompt('Admin notes (optional):');
                                  handleApproveApplication(selectedApplication.id, placement.id, adminNotes || '');
                                }}
                                className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                                disabled={placement.current_ads >= placement.max_ads}
                              >
                                Approve
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <button
                    onClick={() => {
                      const rejectionReason = prompt('Rejection reason:');
                      const adminNotes = prompt('Admin notes (optional):');
                      if (rejectionReason) {
                        handleRejectApplication(selectedApplication.id, rejectionReason, adminNotes || '');
                      }
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                  >
                    Reject Application
                  </button>
                  <button
                    onClick={() => {
                      setShowApplicationModal(false);
                      setSelectedApplication(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Close
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
