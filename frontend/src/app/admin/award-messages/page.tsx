'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getAccessToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import DOMPurify from 'dompurify';
import { ExclamationTriangleIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';
import { getApiUrl } from '@/lib/getApiUrl';

// Success Modal Component
function SuccessModal({ 
  isOpen, 
  onClose, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  message: string; 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center justify-center h-20 w-20 rounded-full bg-green-100 shadow-lg">
              <CheckCircleIcon className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">
            {title}
          </h3>
          <p className="text-gray-600 text-center mb-8 text-base">
            {message}
          </p>
          <button
            onClick={onClose}
            autoFocus
            className="w-full px-6 py-4 text-base font-semibold text-white bg-green-600 border border-transparent rounded-xl hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

interface AwardMessageTemplate {
  id: string;
  template_key: string;
  template_name: string;
  template_type: 'email' | 'certificate' | 'notification';
  subject_template: string;
  content_template: string;
  certificate_title?: string;
  certificate_subtitle?: string;
  certificate_achievement_text?: string;
  certificate_description?: string;
  certificate_footer?: string;
  is_active: boolean;
  language: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface Doctor {
  id: number;
  doctor_id: number;
  doctor_name: string;
  clinic_name: string;
  email: string;
}

interface TierConfig {
  id: number;
  name: string;
  min_sales: number;
  max_sales: number;
  color: string;
  icon: string;
}

export default function AwardMessagesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isViewerAdmin, permissionData, loading: permissionLoading, isParentAdmin, isFullAdmin } = useAdminPermission();
  const [templates, setTemplates] = useState<AwardMessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<AwardMessageTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'email' | 'certificate' | 'notification'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<AwardMessageTemplate | null>(null);
  
  // Preview functionality state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierConfig | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectionChanged, setSelectionChanged] = useState(false);
  
  // Email preview state
  const [emailPreview, setEmailPreview] = useState<{
    subject: string;
    htmlContent: string;
    doctor: any;
    tier: any;
  } | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalTitle, setSuccessModalTitle] = useState('');
  const [successModalMessage, setSuccessModalMessage] = useState('');

  // Check if user is admin - wait for auth and permission data to load
  useEffect(() => {
    // Wait for auth and permission data to finish loading
    if (authLoading || permissionLoading) {
      return;
    }

    // Check authentication
    if (isAuthenticated === false) {
      router.push('/login');
      return;
    }
    
    // Check if user has admin access
    // Parent admin: has is_admin flag OR isParentAdmin from permissionData
    // Child admin: has permission record in permissionData
    const isParentAdminUser = user?.is_admin && !permissionData?.isChildAdmin;
    const hasAdminAccess = isParentAdminUser || 
      user?.is_admin || 
      (permissionData?.hasPermission === true) ||
      (permissionData?.permissionType && ['viewer', 'custom', 'full'].includes(permissionData.permissionType));
    
    if (!hasAdminAccess) {
      router.push('/admin');
      return;
    }
    
    // User has admin access, fetch data
    if (hasAdminAccess) {
      fetchTemplates();
    }
  }, [authLoading, permissionLoading, isAuthenticated, user, permissionData, isParentAdmin, router]);

  // Ensure default selections are set when data is loaded
  useEffect(() => {
    if (doctors.length > 0 && !selectedDoctor) {
      setSelectedDoctor(doctors[0]);
    }
    if (tiers.length > 0 && !selectedTier) {
      setSelectedTier(tiers[0]);
      setSelectionChanged(false);
    }
  }, [doctors, tiers, selectedDoctor, selectedTier]);

  const fetchTemplates = async () => {
    try {
      const token = getAccessToken();
      console.log('Fetching templates with token:', token ? 'Token exists' : 'No token');
      
      // Fetch templates, doctors, and tiers in parallel
      const [templatesResponse, doctorsResponse, tiersResponse] = await Promise.all([
        api.get('/admin/award-messages', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        api.get('/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        api.get('/admin/tier-configs', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      console.log('Response status:', templatesResponse.status);
      
      if (templatesResponse.data.success) {
        const data = templatesResponse.data;
        console.log('Templates data:', data);
        setTemplates(data.data || []);
      } else {
        console.error('Failed to fetch templates:', templatesResponse.data);
        toast.error(templatesResponse.data.message || 'Failed to fetch templates');
      }

      // Fetch doctors and tiers for preview functionality
      if (doctorsResponse.data.success && tiersResponse.data.success) {
        const doctorsData = doctorsResponse.data;
        const tiersData = tiersResponse.data;
        
        console.log('Doctors data:', doctorsData);
        console.log('Tiers data:', tiersData);
        
        setDoctors(doctorsData.data || []);
        
        // Handle different possible tier data structures
        let tiersArray = [];
        if (tiersData.data?.tiers) {
          tiersArray = tiersData.data.tiers;
        } else if (tiersData.data) {
          tiersArray = tiersData.data;
        } else if (Array.isArray(tiersData)) {
          tiersArray = tiersData;
        }
        
        console.log('Processed tiers array:', tiersArray);
        setTiers(tiersArray);
        
        // Set default selections for preview
        if (doctorsData.data?.length > 0) {
          setSelectedDoctor(doctorsData.data[0]);
        }
        if (tiersArray.length > 0) {
          setSelectedTier(tiersArray[0]);
          setSelectionChanged(false); // Reset selection changed flag when setting default
        }
      }
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error('Error fetching templates: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData: Partial<AwardMessageTemplate>) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot save templates.');
      return;
    }
    try {
      const token = getAccessToken();
      let response;
      const isUpdate = !!editingTemplate;
      
      if (editingTemplate) {
        response = await api.put(`/admin/award-messages/${editingTemplate.id}`, templateData, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });
      } else {
        response = await api.post('/admin/award-messages', templateData, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });
      }

      if (response.data.success) {
        await fetchTemplates();
        setEditingTemplate(null);
        setShowCreateModal(false);
        
        // Show success modal
        setSuccessModalTitle(isUpdate ? 'Template Updated!' : 'Template Created!');
        setSuccessModalMessage(
          isUpdate 
            ? 'Your template has been updated successfully. The changes are now live.'
            : 'Your new template has been created successfully and is ready to use.'
        );
        setShowSuccessModal(true);
      } else {
        toast.error(response.data.message || 'Failed to save template');
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.message || 'Error saving template');
    }
  };

  const handleDeleteClick = (template: AwardMessageTemplate) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot delete templates.');
      return;
    }
    setTemplateToDelete(template);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      const token = getAccessToken();
      const response = await api.delete(`/admin/award-messages/${templateToDelete.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Template deleted successfully');
        setShowDeleteModal(false);
        setTemplateToDelete(null);
        await fetchTemplates();
      } else {
        toast.error(response.data.message || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Error deleting template');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setTemplateToDelete(null);
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const token = getAccessToken();
      const response = await api.patch(`/admin/award-messages/${id}/toggle`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data.success) {
        await fetchTemplates();
      } else {
        toast.error('Failed to toggle template status');
      }
    } catch (error: any) {
      console.error('Error toggling template status:', error);
      toast.error(error.response?.data?.message || 'Error toggling template status');
    }
  };

  // Preview functionality
  const generatePreview = async () => {
    if (!selectedDoctor || !selectedTier) return;

    setGenerating(true);
    try {
      const token = getAccessToken();
      const response = await api.post('/admin/certificate-preview', {
        doctor: selectedDoctor,
        tier: selectedTier
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob',
      });

      if (response.status === 200) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setSelectionChanged(false); // Reset the flag after successful preview generation
        toast.success('Certificate preview generated successfully!');
      } else {
        toast.error('Error generating preview');
      }
    } catch (error: any) {
      console.error('Error generating preview:', error);
      toast.error(error.response?.data?.message || 'Error generating preview');
    } finally {
      setGenerating(false);
    }
  };

  const sendTestCertificate = async () => {
    if (!selectedDoctor || !selectedTier) return;

    if (!confirm(`Send test certificate to admin email?`)) return;

    try {
      const token = getAccessToken();
      const response = await api.post('/admin/send-test-certificate', {
        doctor: selectedDoctor,
        tier: selectedTier
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data.success) {
        setSuccessModalTitle('Test Certificate Sent!');
        setSuccessModalMessage('Test certificate has been sent successfully to the admin email address.');
        setShowSuccessModal(true);
      } else {
        toast.error(response.data.message || 'Error sending test certificate');
      }
    } catch (error: any) {
      console.error('Error sending test certificate:', error);
      toast.error(error.response?.data?.message || 'Error sending test certificate');
    }
  };

  // Email preview functionality
  const generateEmailPreview = async () => {
    if (!selectedDoctor || !selectedTier) {
      console.log('Cannot generate email preview: missing doctor or tier');
      return;
    }

    console.log('Generating email preview for:', selectedDoctor, selectedTier);
    setGeneratingEmail(true);
    try {
      const token = getAccessToken();
      console.log('Sending request to email-preview endpoint');
      const response = await api.post('/admin/email-preview', {
        doctor: selectedDoctor,
        tier: selectedTier
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('Email preview response status:', response.status);
      if (response.data.success) {
        const data = response.data;
        console.log('Email preview data received:', data);
        setEmailPreview(data.data);
        setSelectionChanged(false); // Reset the flag after successful preview generation
        toast.success('Email preview generated successfully!');
      } else {
        console.error('Email preview error:', response.data);
        toast.error('Error generating email preview: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error generating email preview:', error);
      toast.error(error.response?.data?.message || 'Error generating email preview');
    } finally {
      setGeneratingEmail(false);
    }
  };

  const sendTestEmail = async () => {
    if (!selectedDoctor || !selectedTier) {
      console.log('Cannot send test email: missing doctor or tier');
      return;
    }

    if (!confirm(`Send test email to admin email?`)) return;

    console.log('Sending test email for:', selectedDoctor, selectedTier);
    try {
      const token = getAccessToken();
      console.log('Sending request to send-test-email endpoint');
      const response = await api.post('/admin/send-test-email', {
        doctor: selectedDoctor,
        tier: selectedTier
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('Send test email response status:', response.status);
      if (response.data.success) {
        const data = response.data;
        console.log('Test email sent successfully:', data);
        setSuccessModalTitle('Test Email Sent!');
        setSuccessModalMessage('Test email has been sent successfully to the admin email address.');
        setShowSuccessModal(true);
      } else {
        console.error('Send test email error:', response.data);
        toast.error('Error sending test email: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error(error.response?.data?.message || 'Error sending test email');
    }
  };

  const filteredTemplates = templates.filter(template => 
    filter === 'all' || template.template_type === filter
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'certificate': return 'bg-green-100 text-green-800';
      case 'notification': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Show loading state while checking authentication
  if (authLoading || permissionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user has admin access
  const isParentAdminUser = user?.is_admin && !permissionData?.isChildAdmin;
  const hasAdminAccess = isParentAdminUser || 
    user?.is_admin || 
    (permissionData?.hasPermission === true) ||
    (permissionData?.permissionType && ['viewer', 'custom', 'full'].includes(permissionData.permissionType));

  // Show access denied if not authenticated or no admin access
  if (!isAuthenticated || !hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need admin privileges to access this page.</p>
          <a 
            href="/admin" 
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Admin Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Manage Awards and Messages</h1>
          <p className="mt-2 text-gray-600">
            Edit email templates, certificate content, and notification messages
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All ({templates.length})
              </button>
              <button
                onClick={() => setFilter('email')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'email'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Emails ({templates.filter(t => t.template_type === 'email').length})
              </button>
              <button
                onClick={() => setFilter('certificate')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'certificate'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Certificates ({templates.filter(t => t.template_type === 'certificate').length})
              </button>
              <button
                onClick={() => setFilter('notification')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'notification'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Notifications ({templates.filter(t => t.template_type === 'notification').length})
              </button>
            </div>
            <button
              onClick={() => {
                if (isViewerAdmin) {
                  toast.error('Viewer Admin: You have view-only access. Cannot create templates.');
                  return;
                }
                setShowCreateModal(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              disabled={isViewerAdmin}
            >
              + Create New Template
            </button>
          </div>
        </div>

        {/* Preview Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Template Preview & Testing</h2>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>
          
          {showPreview && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Preview Controls */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-4">Quick Preview Test</h3>
                
                {/* Doctor Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Doctor
                  </label>
                  <select
                    value={selectedDoctor?.id || ''}
                    onChange={(e) => {
                      const doctor = doctors.find(d => String(d.id) === e.target.value);
                      setSelectedDoctor(doctor || null);
                      setSelectionChanged(true);
                      setPreviewUrl(null); // Clear previous preview
                      setEmailPreview(null); // Clear previous email preview
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.doctor_name} - {doctor.clinic_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tier Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Tier
                  </label>
                  <select
                    value={selectedTier?.id || ''}
                    onChange={(e) => {
                      console.log('Tier selection changed:', e.target.value);
                      console.log('Available tiers:', tiers);
                      const tier = tiers.find(t => String(t.id) === e.target.value);
                      console.log('Found tier:', tier);
                      setSelectedTier(tier || null);
                      setSelectionChanged(true);
                      setPreviewUrl(null); // Clear previous preview
                      setEmailPreview(null); // Clear previous email preview
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a tier...</option>
                    {tiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.icon} {tier.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Certificate Preview Buttons */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Certificate Preview</h4>
                    <button
                      onClick={generatePreview}
                      disabled={generating || !selectedDoctor || !selectedTier}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {generating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating Preview...
                        </>
                      ) : (
                        '📄 Preview Certificate PDF'
                      )}
                    </button>

                    <button
                      onClick={sendTestCertificate}
                      disabled={!selectedDoctor || !selectedTier || selectionChanged || generating}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      📧 Send Test Certificate to Admin
                    </button>
                  </div>

                  {/* Email Preview Buttons */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Email Preview</h4>
                    <button
                      onClick={generateEmailPreview}
                      disabled={generatingEmail || !selectedDoctor || !selectedTier}
                      className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {generatingEmail ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating Email Preview...
                        </>
                      ) : (
                        '📧 Preview Achievement Email'
                      )}
                    </button>

                    <button
                      onClick={sendTestEmail}
                      disabled={!selectedDoctor || !selectedTier || selectionChanged || generatingEmail}
                      className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      📨 Send Test Email to Admin
                    </button>
                  </div>
                </div>

                {selectionChanged && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      <strong>Selection Changed:</strong> Please generate a new preview before sending test emails.
                    </p>
                  </div>
                )}

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Test emails are sent to the admin email address to verify templates without affecting users.
                  </p>
                </div>
              </div>

              {/* Certificate Preview */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-4">Certificate Preview</h3>
                
                {previewUrl ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 text-center">
                      <div className="flex items-center justify-center mb-4">
                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-200">
                          <CheckCircleIcon className="h-10 w-10 text-green-600" />
                        </div>
                      </div>
                      <h4 className="text-lg font-semibold text-green-800 mb-2">Certificate Generated!</h4>
                      <p className="text-sm text-green-700 mb-4">
                        Your certificate preview has been generated successfully.
                      </p>
                      <div className="flex flex-col gap-2">
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open PDF in New Tab
                        </a>
                        <a
                          href={previewUrl}
                          download="certificate-preview.pdf"
                          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download PDF
                        </a>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 border-t">
                      <p className="text-sm text-gray-600 text-center">
                        This is how the certificate will appear when sent to users.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">Click "Preview Certificate PDF" to see how the certificate looks</p>
                  </div>
                )}
              </div>

              {/* Email Preview */}
              <div className="lg:col-span-1">
                <h3 className="text-md font-medium text-gray-900 mb-4">Email Preview</h3>
                
                {emailPreview ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    {/* Email Header */}
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-purple-600">📧</span>
                            <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">Email Preview</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-800">{emailPreview.subject}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">To:</p>
                          <p className="text-xs font-medium text-gray-700">{emailPreview.doctor?.doctor_name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{emailPreview.doctor?.email || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Email Body */}
                    <div className="p-4 bg-white max-h-96 overflow-y-auto">
                      <div 
                        className="prose prose-sm max-w-none"
                        style={{
                          fontSize: '14px',
                          lineHeight: '1.6'
                        }}
                        dangerouslySetInnerHTML={{ 
                          __html: typeof window !== 'undefined' 
                            ? DOMPurify.sanitize(emailPreview.htmlContent, {
                                ALLOWED_TAGS: ['div', 'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img', 'hr'],
                                ALLOWED_ATTR: ['href', 'target', 'style', 'class', 'src', 'alt', 'width', 'height', 'align', 'bgcolor', 'color']
                              })
                            : emailPreview.htmlContent
                        }}
                      />
                    </div>
                    
                    {/* Email Footer */}
                    <div className="p-3 bg-gray-50 border-t">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          This is how the email will appear to users.
                        </p>
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            ✓ Preview Ready
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">Click "Preview Achievement Email" to see how the email looks</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Templates List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Templates</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredTemplates.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">No templates found</p>
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <div key={template.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {template.template_name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(template.template_type)}`}>
                          {template.template_type}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          template.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Key:</strong> {template.template_key}
                      </p>
                      {template.description && (
                        <p className="text-sm text-gray-500 mb-2">{template.description}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        Updated: {new Date(template.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingTemplate(template)}
                        className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(template.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          template.is_active
                            ? 'text-orange-600 hover:text-orange-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {template.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteClick(template)}
                        className="text-red-600 hover:text-red-800 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Edit/Create Modal */}
        {(editingTemplate || showCreateModal) && (
          <TemplateEditModal
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onClose={() => {
              setEditingTemplate(null);
              setShowCreateModal(false);
            }}
          />
        )}

        {/* Success Modal */}
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title={successModalTitle}
          message={successModalMessage}
        />

        {/* Delete Confirmation Modal */}
        {showDeleteModal && templateToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Template
                </h3>
                <button
                  onClick={handleDeleteCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-4">
                      Are you sure you want to delete the template <span className="font-semibold text-gray-900">"{templateToDelete.template_name}"</span>?
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Warning:</strong> This action cannot be undone. The template will be permanently removed from the system.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Delete Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Template Edit Modal Component
function TemplateEditModal({ 
  template, 
  onSave, 
  onClose 
}: { 
  template: AwardMessageTemplate | null; 
  onSave: (data: Partial<AwardMessageTemplate>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    template_key: template?.template_key || '',
    template_name: template?.template_name || '',
    template_type: template?.template_type || 'email',
    subject_template: template?.subject_template || '',
    content_template: template?.content_template || '',
    certificate_title: template?.certificate_title || '',
    certificate_subtitle: template?.certificate_subtitle || '',
    certificate_achievement_text: template?.certificate_achievement_text || '',
    certificate_description: template?.certificate_description || '',
    certificate_footer: template?.certificate_footer || '',
    is_active: template?.is_active ?? true,
    language: template?.language || 'en',
    description: template?.description || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {template ? 'Edit Template' : 'Create New Template'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Key *
              </label>
              <input
                type="text"
                value={formData.template_key}
                onChange={(e) => setFormData({ ...formData, template_key: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                placeholder="e.g., tier_achievement_email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                placeholder="e.g., Tier Achievement Email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Type *
              </label>
              <select
                value={formData.template_type}
                onChange={(e) => setFormData({ ...formData, template_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="email">Email</option>
                <option value="certificate">Certificate</option>
                <option value="notification">Notification</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <input
                type="text"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., en"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Description of what this template is used for"
            />
          </div>

          {formData.template_type === 'email' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Subject Template *
                </label>
                <input
                  type="text"
                  value={formData.subject_template}
                  onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  placeholder="e.g., 🎉 Congratulations! You've Achieved {{tier_name}} Tier!"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{{variable_name}}'} for dynamic content
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Content Template *
                </label>
                <textarea
                  value={formData.content_template}
                  onChange={(e) => setFormData({ ...formData, content_template: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={10}
                  required
                  placeholder="HTML email content template"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{{variable_name}}'} for dynamic content. HTML is supported.
                </p>
              </div>
            </>
          )}

          {formData.template_type === 'certificate' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certificate Title
                </label>
                <input
                  type="text"
                  value={formData.certificate_title}
                  onChange={(e) => setFormData({ ...formData, certificate_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., CERTIFICATE OF ACHIEVEMENT"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certificate Subtitle
                </label>
                <input
                  type="text"
                  value={formData.certificate_subtitle}
                  onChange={(e) => setFormData({ ...formData, certificate_subtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Community Contribution Recognition"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Achievement Text
                </label>
                <input
                  type="text"
                  value={formData.certificate_achievement_text}
                  onChange={(e) => setFormData({ ...formData, certificate_achievement_text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., for outstanding contribution to our medical community"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certificate Description
                </label>
                <textarea
                  value={formData.certificate_description}
                  onChange={(e) => setFormData({ ...formData, certificate_description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Description text for the certificate"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certificate Footer
                </label>
                <input
                  type="text"
                  value={formData.certificate_footer}
                  onChange={(e) => setFormData({ ...formData, certificate_footer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., This certificate is digitally generated and verified by our system."
                />
              </div>
            </>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {template ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
