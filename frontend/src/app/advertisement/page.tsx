'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { getAccessToken, isAuthenticated } from '../../lib/auth';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '@/lib/getApiUrl';
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
  };
  allow_user_selection: boolean;
  visible_to_guests: boolean;
  status: string;
  priority: number;
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
}

export default function AdvertisementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [placements, setPlacements] = useState<AdvertisementPlacement[]>([]);
  const [applications, setApplications] = useState<AdvertisementApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'apply' | 'my-applications'>('apply');
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  // Form state
  const [applicationForm, setApplicationForm] = useState({
    title: '',
    description: '',
    image_url: '',
    target_url: '',
    button_text: 'Learn More',
    button_color: '#3b82f6',
    background_color: '#ffffff',
    text_color: '#000000',
    budget: 0,
    start_date: '',
    end_date: '',
    requested_placements: [] as string[],
    contact_preferences: ''
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    // Allow any authenticated user to access advertisement features

    fetchData();
  }, [router, user]);

  const fetchData = async () => {
    try {
      const token = getAccessToken();
      // Use centralized API instance
      const [placementsRes, applicationsRes] = await Promise.all([
        api.get('/placements/available'),
        api.get('/applications/my')
      ]);

      if (placementsRes.data.success) {
        const placementsData = placementsRes.data;
        setPlacements(placementsData.data);
      }

      if (applicationsRes.data.success) {
        const applicationsData = applicationsRes.data;
        setApplications(applicationsData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAccessToken();
      // Use centralized API instance
      const response = await api.post('/applications', applicationForm);

      if (response.data.success) {
        await fetchData();
        setShowApplicationForm(false);
        setApplicationForm({
          title: '',
          description: '',
          image_url: '',
          target_url: '',
          button_text: 'Learn More',
          button_color: '#3b82f6',
          background_color: '#ffffff',
          text_color: '#000000',
          budget: 0,
          start_date: '',
          end_date: '',
          requested_placements: [],
          contact_preferences: ''
        });
        alert('Advertisement application submitted successfully!');
      } else {
        alert('Error submitting application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Error submitting application');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading advertisement page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📢 Advertisement Opportunities</h1>
          <p className="mt-2 text-gray-600">Apply for paid advertisements to grow your clinic's visibility</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('apply')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'apply'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📝 Apply for Advertisement
              </button>
              <button
                onClick={() => setActiveTab('my-applications')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'my-applications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📋 My Applications ({applications.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Apply Tab */}
        {activeTab === 'apply' && (
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Advertisement Placements</h2>
              <p className="text-gray-600 mb-4">
                Choose from the available advertisement placements below. Note that admin may adjust the final placement 
                for optimal user experience. If you have specific placement requirements, please contact us using the 
                contact information on the landing page.
              </p>
              
              <div className="grid gap-4 md:grid-cols-2">
                {placements.map((placement) => (
                  <div key={placement.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{placement.name}</h3>
                      <span className="text-sm text-gray-500">
                        {placement.current_ads}/{placement.max_ads} ads
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{placement.description}</p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Type: {placement.type}</div>
                      <div>Position: {placement.position}</div>
                      <div>Size: {placement.dimensions.width}×{placement.dimensions.height}px</div>
                      <div>Visible to guests: {placement.visible_to_guests ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Submit Advertisement Application</h2>
                <button
                  onClick={() => setShowApplicationForm(!showApplicationForm)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showApplicationForm ? 'Cancel' : 'New Application'}
                </button>
              </div>

              {showApplicationForm && (
                <form onSubmit={handleSubmitApplication} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Advertisement Title *</label>
                      <input
                        type="text"
                        value={applicationForm.title}
                        onChange={(e) => setApplicationForm({ ...applicationForm, title: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your advertisement title"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Target URL *</label>
                      <input
                        type="url"
                        value={applicationForm.target_url}
                        onChange={(e) => setApplicationForm({ ...applicationForm, target_url: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://your-website.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                    <textarea
                      value={applicationForm.description}
                      onChange={(e) => setApplicationForm({ ...applicationForm, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="Describe your advertisement content and goals"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                    <input
                      type="url"
                      value={applicationForm.image_url}
                      onChange={(e) => setApplicationForm({ ...applicationForm, image_url: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Button Text</label>
                      <input
                        type="text"
                        value={applicationForm.button_text}
                        onChange={(e) => setApplicationForm({ ...applicationForm, button_text: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Learn More"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Button Color</label>
                      <input
                        type="color"
                        value={applicationForm.button_color}
                        onChange={(e) => setApplicationForm({ ...applicationForm, button_color: e.target.value })}
                        className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                      <input
                        type="color"
                        value={applicationForm.background_color}
                        onChange={(e) => setApplicationForm({ ...applicationForm, background_color: e.target.value })}
                        className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Budget (PKR) *</label>
                      <input
                        type="number"
                        value={applicationForm.budget}
                        onChange={(e) => setApplicationForm({ ...applicationForm, budget: parseInt(e.target.value) })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="10000"
                        min="1000"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Placements</label>
                      <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                        {placements.map((placement) => (
                          <label key={placement.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={applicationForm.requested_placements.includes(placement.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setApplicationForm({
                                    ...applicationForm,
                                    requested_placements: [...applicationForm.requested_placements, placement.id]
                                  });
                                } else {
                                  setApplicationForm({
                                    ...applicationForm,
                                    requested_placements: applicationForm.requested_placements.filter(id => id !== placement.id)
                                  });
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">{placement.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                      <input
                        type="date"
                        value={applicationForm.start_date}
                        onChange={(e) => setApplicationForm({ ...applicationForm, start_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                      <input
                        type="date"
                        value={applicationForm.end_date}
                        onChange={(e) => setApplicationForm({ ...applicationForm, end_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Preferences</label>
                    <textarea
                      value={applicationForm.contact_preferences}
                      onChange={(e) => setApplicationForm({ ...applicationForm, contact_preferences: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Any specific contact preferences or additional information"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <span className="text-yellow-400">⚠️</span>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Important Notice</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>
                            While you can select preferred advertisement placements, the admin reserves the right to 
                            adjust the final placement for optimal user experience and website performance. If you have 
                            specific placement requirements, please contact us using the contact information on the 
                            landing page.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowApplicationForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Submit Application
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* My Applications Tab */}
        {activeTab === 'my-applications' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">My Advertisement Applications</h2>
            
            {applications.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <span className="text-4xl mb-4 block">📝</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
                <p className="text-gray-600 mb-4">You haven't submitted any advertisement applications yet.</p>
                <button
                  onClick={() => setActiveTab('apply')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply for Advertisement
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <div key={application.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{application.title}</h3>
                        <p className="text-sm text-gray-600">Budget: PKR {application.budget.toLocaleString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                        {application.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-4">{application.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Duration:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(application.start_date).toLocaleDateString()} - {new Date(application.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Submitted:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(application.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {application.approved_placement && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                        <h4 className="font-medium text-green-800 mb-1">Approved Placement</h4>
                        <p className="text-sm text-green-700">{application.approved_placement.name}</p>
                        {application.placement_change_notified && (
                          <p className="text-xs text-green-600 mt-1">
                            Note: Your placement was adjusted by admin for optimal user experience.
                          </p>
                        )}
                      </div>
                    )}

                    {application.rejection_reason && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <h4 className="font-medium text-red-800 mb-1">Rejection Reason</h4>
                        <p className="text-sm text-red-700">{application.rejection_reason}</p>
                      </div>
                    )}

                    {application.admin_notes && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="font-medium text-blue-800 mb-1">Admin Notes</h4>
                        <p className="text-sm text-blue-700">{application.admin_notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
