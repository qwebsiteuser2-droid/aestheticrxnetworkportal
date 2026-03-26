'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getAccessToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';
import { 
  DocumentTextIcon,
  TrophyIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  EyeIcon,
  TrashIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface ResearchPaper {
  id: string;
  title: string;
  abstract: string;
  upvote_count: number;
  view_count: number;
  is_approved: boolean;
  created_at: string;
  doctor?: {
    doctor_name: string;
    tier: string;
  };
}

interface ResearchBenefit {
  id: string;
  doctor_id: string;
  research_paper_id: string;
  benefit_type: string;
  benefit_value: number;
  gift_description: string;
  is_claimed: boolean;
  created_at: string;
}

interface RewardEligibility {
  id: string;
  doctor_id: string;
  benefit_config_id: string;
  approval_count: number;
  is_eligible: boolean;
  status: 'eligible' | 'delivered' | 'cancelled';
  delivered_at?: string;
  delivered_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  doctor?: {
    doctor_name: string;
    clinic_name: string;
    email: string;
  };
  benefit_config?: {
    title: string;
    benefit_type: string;
    benefit_value: string;
    gift_description?: string;
    display_color: string;
  };
  delivered_by_doctor?: {
    doctor_name: string;
  };
  research_paper_id?: string | null;
  research_paper?: {
    id: string;
    title: string;
    upvote_count: number;
  };
}

interface ResearchReport {
  id: string;
  research_paper_id: string;
  reporter_id: string;
  report_type: string;
  description: string;
  admin_notes?: string | null;
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  updated_at: string;
  research_paper?: {
    id: string;
    title: string;
    abstract?: string;
    upvote_count?: number;
    view_count?: number;
    doctor?: {
      doctor_name: string;
      clinic_name?: string;
    };
  };
  reporter?: {
    id: string;
    doctor_name: string;
    clinic_name?: string;
    email?: string;
  };
  reviewer?: {
    id: string;
    doctor_name: string;
  };
}

export default function AdminResearchManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const [activeTab, setActiveTab] = useState('overview');
  const [researchPapers, setResearchPapers] = useState<ResearchPaper[]>([]);
  const [benefits, setBenefits] = useState<ResearchBenefit[]>([]);
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [benefitConfigs, setBenefitConfigs] = useState<any[]>([]);
  const [rewardEligibilities, setRewardEligibilities] = useState<RewardEligibility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(null);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [selectedEligibility, setSelectedEligibility] = useState<RewardEligibility | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<{ id: string; title: string } | null>(null);
  const [showDeleteAwardModal, setShowDeleteAwardModal] = useState(false);
  const [awardToDelete, setAwardToDelete] = useState<{ id: string; title: string; threshold: string } | null>(null);
  const [showDeleteBenefitModal, setShowDeleteBenefitModal] = useState(false);
  const [benefitToDelete, setBenefitToDelete] = useState<{ id: string; doctorName: string; benefitType: string } | null>(null);
  const [showSettingsSuccessModal, setShowSettingsSuccessModal] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState(3);
  const [minimumTier, setMinimumTier] = useState('Lead Contributor');
  const [availableTiers, setAvailableTiers] = useState<Array<{ name: string; display_order: number }>>([]);
  const [eligibilityFilter, setEligibilityFilter] = useState<'all' | 'delivered' | 'not_delivered' | 'rejected' | 'not_eligible'>('all');
  const [eligibilitySearch, setEligibilitySearch] = useState('');
  const [notEligibleData, setNotEligibleData] = useState<any[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // isViewerAdmin is already defined from useAdminPermission() hook above
  const isFullAdmin = user?.is_admin && !isViewerAdmin;
  const isAdmin = user?.is_admin; // Both viewer and full admin

  // Check authentication but don't redirect automatically
  useEffect(() => {
    // Removed automatic redirects - let the component handle access control
  }, [isAuthenticated, user]);

  const fetchEligibility = async () => {
    try {
      const params = new URLSearchParams();
      if (eligibilityFilter !== 'all') {
        params.append('filter', eligibilityFilter);
      }
      if (eligibilitySearch.trim()) {
        params.append('search', eligibilitySearch.trim());
      }
      
      // Use centralized API instance
      const eligibilityResponse = await api.get('/admin/reward-eligibility', {
        params: Object.fromEntries(params.entries())
      });
      const eligibilityResult = eligibilityResponse.data;
      if (eligibilityResult.success) {
        if (eligibilityResult.filter === 'not_eligible') {
          // Handle not eligible data format - it's an array of objects with doctor, config, reason
          setNotEligibleData(eligibilityResult.data || []);
          setRewardEligibilities([]);
        } else {
          setNotEligibleData([]);
          setRewardEligibilities(eligibilityResult.data || []);
        }
      } else {
        setRewardEligibilities([]);
        setNotEligibleData([]);
      }
    } catch (error) {
      console.error('Error fetching eligibility:', error);
      setRewardEligibilities([]);
      setNotEligibleData([]);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch research papers - Use centralized API instance
      const papersResponse = await api.get('/research');
      const papersResult = papersResponse.data;
      if (papersResult.success) {
        setResearchPapers(papersResult.data.papers || []);
      }

      // Fetch research benefits - Use centralized API instance
      const benefitsResponse = await api.get('/admin/research-benefits');
      const benefitsResult = benefitsResponse.data;
      if (benefitsResult.success) {
        const benefitsData = benefitsResult.data || [];
        setBenefits(Array.isArray(benefitsData) ? benefitsData : []);
        console.log('Benefits fetched:', benefitsData.length);
      } else {
        console.error('Failed to fetch benefits:', benefitsResult);
        setBenefits([]);
      }

      // Fetch research reports - Use centralized API instance
      const reportsResponse = await api.get('/admin/research-reports');
      const reportsResult = reportsResponse.data;
      if (reportsResult.success) {
        const reportsData = reportsResult.data || [];
        setReports(Array.isArray(reportsData) ? reportsData : []);
        const pendingCount = reportsData.filter((r: any) => r.status && r.status.toLowerCase() === 'pending').length;
        console.log('Reports fetched:', reportsData.length, 'Pending:', pendingCount);
      } else {
        console.error('Failed to fetch reports:', reportsResult);
        setReports([]);
      }

      // Fetch benefit configurations - Use centralized API instance
      const configsResponse = await api.get('/admin/research-benefit-configs');
      const configsResult = configsResponse.data;
      if (configsResult.success) {
        setBenefitConfigs(configsResult.data || []);
      }

      // Fetch reward eligibility
      await fetchEligibility();

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.is_admin) {
      fetchData();
      fetchResearchSettings();
      fetchTierConfigs();
    }
  }, [user]);

  // Fetch eligibility when filter changes
  useEffect(() => {
    if (user && user.is_admin) {
      fetchEligibility();
    }
  }, [user, eligibilityFilter]);

  // Debounced search - fetch eligibility after user stops typing
  useEffect(() => {
    if (user && user.is_admin) {
      // Clear previous timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      // Set new timeout
      const timeout = setTimeout(() => {
        fetchEligibility();
      }, 500); // Wait 500ms after user stops typing
      
      setSearchTimeout(timeout);
      
      // Cleanup
      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }
  }, [eligibilitySearch]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, []);

  const handleApprovePaper = async (paperId: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot approve papers.');
      return;
    }
    try {
      // Use centralized API instance
      const response = await api.post(`/admin/research-papers/${paperId}/approve`);
      
      const result = response.data;
      
      if (result.success) {
        toast.success('Research paper approved successfully');
        fetchData();
      } else {
        toast.error(result.message || 'Failed to approve research paper');
      }
    } catch (error) {
      console.error('Error approving paper:', error);
      toast.error('Failed to approve research paper');
    }
  };

  const handleRejectPaper = async (paperId: string, reason: string) => {
    try {
      // Use centralized API instance
      const response = await api.post(`/admin/research-papers/${paperId}/reject`, { reason });
      
      const result = response.data;
      
      if (result.success) {
        toast.success('Research paper rejected successfully');
        fetchData();
      } else {
        toast.error(result.message || 'Failed to reject research paper');
      }
    } catch (error) {
      console.error('Error rejecting paper:', error);
      toast.error('Failed to reject research paper');
    }
  };

  const handleRemovePaper = async (paperId: string) => {
    // Find the paper to get its title for the confirmation modal
    const paper = researchPapers.find(p => p.id === paperId);
    if (paper) {
      setPaperToDelete({ id: paperId, title: paper.title });
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteAward = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot delete awards.');
      return;
    }
    if (!awardToDelete) return;

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
      return;
    }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/admin/research-benefit-configs/${awardToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || 'Failed to delete award configuration' };
        }
        console.error('Delete award error:', response.status, errorData);
        toast.error(errorData.message || `Failed to delete award configuration (${response.status})`);
        return;
      }
      
      const result = await response.json();
      if (result.success) {
        toast.success('Award configuration deleted successfully');
        // Remove from local state immediately
        setBenefitConfigs(prev => prev.filter(c => c.id !== awardToDelete.id));
        // Refresh data to ensure consistency
        fetchData();
        // Close modal and reset state
        setShowDeleteAwardModal(false);
        setAwardToDelete(null);
      } else {
        toast.error(result.message || 'Failed to delete award configuration');
      }
    } catch (error) {
      console.error('Error deleting award configuration:', error);
      toast.error(error instanceof Error ? error.message : 'Error deleting award configuration');
    }
  };

  const fetchTierConfigs = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      // Use centralized API instance
      const response = await api.get('/admin/tier-configs');

      if (response.data.success) {
        const data = response.data;
        if (data.data?.tiers) {
          // Sort by display_order and filter active tiers
          const sortedTiers = data.data.tiers
            .filter((tier: any) => tier.is_active)
            .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
          setAvailableTiers(sortedTiers);
        }
      } else {
        console.error('Failed to fetch tier configs:', response.status);
      }
    } catch (error) {
      console.error('Error fetching tier configs:', error);
    }
  };

  const fetchResearchSettings = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      // Use centralized API instance
      const response = await api.get('/admin/research-settings');

      if (response.data.success) {
        const result = response.data;
        if (result.success && result.data) {
          setMonthlyLimit(result.data.monthly_submission_limit || 3);
          setMinimumTier(result.data.minimum_tier_for_approval || 'Lead Contributor');
        }
      }
    } catch (error) {
      console.error('Error fetching research settings:', error);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot save settings.');
      return;
    }
    e.preventDefault();
    
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Use centralized API instance
      const response = await api.put('/admin/research-settings', {
        monthly_submission_limit: monthlyLimit,
        minimum_tier_for_approval: minimumTier
      });

      if (!response.data.success) {
        toast.error(response.data.message || 'Failed to save settings');
        return;
      }

      const result = response.data;
      if (result.success) {
        setShowSettingsSuccessModal(true);
        // Auto-close modal after 3 seconds
        setTimeout(() => {
          setShowSettingsSuccessModal(false);
        }, 3000);
      } else {
        toast.error(result.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
    }
  };

  const confirmDeletePaper = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot delete papers.');
      return;
    }
    if (!paperToDelete) return;

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required. Please login again.');
        return;
      }

      // Use centralized API instance
      const response = await api.post(`/admin/research-papers/${paperToDelete.id}/remove`, {
        reason: 'Removed by admin'
      });
      
      if (!response.data.success) {
        console.error('Delete paper error response:', response.status, response.data);
        toast.error(response.data.message || `Failed to remove research paper (${response.status})`);
        return;
      }
      
      const result = response.data;
      
      if (result.success) {
        toast.success('Research paper removed successfully');
        // Remove from local state immediately for better UX
        setResearchPapers(prev => prev.filter(p => p.id !== paperToDelete.id));
        // Also refresh data to ensure consistency
        fetchData();
        // Close modal and reset state
        setShowDeleteModal(false);
        setPaperToDelete(null);
      } else {
        console.error('Delete paper failed:', result);
        toast.error(result.message || 'Failed to remove research paper');
      }
    } catch (error) {
      console.error('Error removing paper:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove research paper. Please try again.');
    }
  };

  const handleCheckEligibility = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot check eligibility.');
      return;
    }
    try {
      const response = await fetch(`${getApiUrl()}/admin/reward-eligibility/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        fetchData(); // Refresh data
      } else {
        toast.error('Failed to check eligibility');
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      toast.error('Failed to check eligibility');
    }
  };

  const handleDeleteBenefit = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot delete benefits.');
      return;
    }
    if (!benefitToDelete) return;

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Use centralized API instance
      const response = await api.delete(`/admin/research-benefits/${benefitToDelete.id}`);

      if (!response.data.success) {
        console.error('Delete benefit error:', response.status, response.data);
        toast.error(response.data.message || `Failed to delete research benefit (${response.status})`);
        return;
      }

      const result = response.data;
      if (result.success) {
        toast.success('Research benefit deleted successfully');
        // Remove from local state immediately
        setBenefits(prev => prev.filter(b => b.id !== benefitToDelete.id));
        // Refresh data to ensure consistency
        fetchData();
        // Close modal and reset state
        setShowDeleteBenefitModal(false);
        setBenefitToDelete(null);
      } else {
        toast.error(result.message || 'Failed to delete research benefit');
      }
    } catch (error) {
      console.error('Error deleting research benefit:', error);
      toast.error(error instanceof Error ? error.message : 'Error deleting research benefit');
    }
  };

  const handleUpdateStatus = async (eligibilityId: string, status: string, notes?: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot update reward status.');
      return;
    }
    // Check if reward is already delivered and trying to set to delivered again
    const currentEligibility = rewardEligibilities.find(e => e.id === eligibilityId);
    if (currentEligibility?.status === 'delivered' && status === 'delivered') {
      toast.error('This reward has already been delivered. Please select a different status.');
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/admin/reward-eligibility/${eligibilityId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        setShowStatusModal(false);
        setSelectedEligibility(null);
        fetchData(); // Refresh data
      } else {
        toast.error(result.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'plagiarism': return 'bg-red-100 text-red-800';
      case 'misinformation': return 'bg-orange-100 text-orange-800';
      case 'inappropriate_content': return 'bg-purple-100 text-purple-800';
      case 'spam': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Wait for auth to finish loading before checking access
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check for tokens in multiple places (only in browser)
  const hasTokenInCookies = typeof window !== 'undefined' ? document.cookie.includes('accessToken=') : false;
  const hasTokenInLocalStorage = typeof window !== 'undefined' ? getAccessToken() : undefined;
  const hasUserData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  
  // Parse user data if it exists
  let parsedUserData = null;
  if (hasUserData) {
    try {
      parsedUserData = JSON.parse(hasUserData);
    } catch (e) {
      // Silent error handling
    }
  }
  
  // Allow access if we have tokens OR if we're the specific admin email
  const shouldAllowAccess = 
    (isAuthenticated && user?.is_admin) || 
    hasTokenInCookies || 
    !!hasTokenInLocalStorage ||
    (parsedUserData && parsedUserData.email === 'asadkhanbloch4949@gmail.com') ||
    (parsedUserData && parsedUserData.is_admin === true);

  if (!shouldAllowAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need admin privileges to access this page.</p>
          <a 
            href="/login" 
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'papers', name: 'Research Papers', icon: DocumentTextIcon },
    { id: 'benefits', name: 'Awards and Benefits Eligibility', icon: TrophyIcon },
    { id: 'benefit-configs', name: 'Manage Awards', icon: Cog6ToothIcon },
    { id: 'reports', name: 'Reports', icon: ExclamationTriangleIcon },
    { id: 'settings', name: 'Settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Admin Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Research Management</h1>
              <p className="text-gray-600 mt-2">
                Manage research papers, awards, benefits, and reports
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner w-8 h-8"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Papers
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {researchPapers.length}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CheckCircleIcon className="h-6 w-6 text-green-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Approved Papers
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {researchPapers.filter(p => p.is_approved).length}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <TrophyIcon className="h-6 w-6 text-yellow-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Benefits Awarded
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {benefits.length + rewardEligibilities.filter(e => e.status === 'delivered').length}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Pending Reports
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {(reports?.filter(r => r && r.status && r.status.toLowerCase() === 'pending').length || 0)}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Research Papers Tab */}
            {activeTab === 'papers' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">
                    Research Papers ({researchPapers.length})
                  </h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paper
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Author
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stats
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {researchPapers.map((paper) => (
                        <tr key={paper.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {paper.title}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {paper.abstract}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {paper.doctor?.doctor_name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {paper.doctor?.tier || 'Unknown Tier'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(paper.is_approved ? 'approved' : 'pending')}`}>
                              {paper.is_approved ? 'Approved' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{paper.view_count} views</div>
                            <div>{paper.upvote_count} approvals</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => {
                                setSelectedPaper(paper);
                                setShowPaperModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            {!paper.is_approved && isFullAdmin && (
                              <button
                                onClick={() => handleApprovePaper(paper.id)}
                                disabled={isViewerAdmin}
                                className={`text-green-600 hover:text-green-900 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Approve Paper"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                              </button>
                            )}
                            {isFullAdmin && (
                              <button
                                onClick={() => handleRemovePaper(paper.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Remove Paper"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Benefits Tab - Reward Eligibility */}
            {activeTab === 'benefits' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">
                        Reward Eligibility ({eligibilityFilter === 'not_eligible' ? notEligibleData.length : rewardEligibilities.length})
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Users eligible for research rewards based on approval counts and views
                      </p>
                    </div>
                    {isFullAdmin && (
                      <button
                        onClick={handleCheckEligibility}
                        className={`bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 ${isViewerAdmin ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : ''}`}
                        disabled={isViewerAdmin}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isViewerAdmin ? 'Check Eligibility (View Only)' : 'Check Eligibility'}
                      </button>
                    )}
                  </div>
                  
                  {/* Search Bar */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search by doctor name, clinic, or award..."
                      value={eligibilitySearch}
                      onChange={(e) => setEligibilitySearch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Eligibility Category Tabs */}
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Eligibility Categories">
                      <button
                        onClick={() => setEligibilityFilter('all')}
                        className={`${
                          eligibilityFilter === 'all'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        All Eligibility
                      </button>
                      <button
                        onClick={() => setEligibilityFilter('not_eligible')}
                        className={`${
                          eligibilityFilter === 'not_eligible'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        Not Eligible
                      </button>
                      <button
                        onClick={() => setEligibilityFilter('delivered')}
                        className={`${
                          eligibilityFilter === 'delivered'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        Eligible but Delivered
                      </button>
                      <button
                        onClick={() => setEligibilityFilter('not_delivered')}
                        className={`${
                          eligibilityFilter === 'not_delivered'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        Eligible but Not Delivered (Pending)
                      </button>
                      <button
                        onClick={() => setEligibilityFilter('rejected')}
                        className={`${
                          eligibilityFilter === 'rejected'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        Rejected
                      </button>
                    </nav>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Doctor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Award
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Research Paper
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Approvals
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        {eligibilityFilter !== 'not_eligible' ? (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Delivered By
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                          </>
                        ) : (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reason
                          </th>
                        )}
                        {isFullAdmin && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {eligibilityFilter === 'not_eligible' ? (
                        // Display not eligible data
                        notEligibleData.length > 0 ? (
                          notEligibleData.map((item, index) => (
                            <tr key={`not-eligible-${index}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.doctor?.doctor_name || 'Unknown Doctor'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {item.doctor?.clinic_name || 'Unknown Clinic'}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: item.config?.display_color || '#6B7280' }}
                                  />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {item.config?.title || 'Unknown Award'}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {item.config?.benefit_type || 'Unknown Type'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-400 italic">-</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div>
                                  <div>Approvals: {item.approvalCount || 0}</div>
                                  {item.config?.view_threshold && (
                                    <div className="text-xs text-gray-500">Views: {item.viewCount || 0}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  Not Eligible
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.reason || 'Does not meet criteria'}
                              </td>
                              {isFullAdmin && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  -
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={isFullAdmin ? 6 : 5} className="px-6 py-12 text-center text-gray-500">
                              <div className="flex flex-col items-center">
                                <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-lg font-medium text-gray-900 mb-2">No not eligible records found</p>
                                <p className="text-sm text-gray-500">
                                  {eligibilitySearch 
                                    ? 'No results found for your search'
                                    : 'All doctors meet eligibility criteria'}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )
                      ) : (
                        // Display regular eligibility data
                        rewardEligibilities.map((eligibility) => (
                        <tr key={eligibility.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {eligibility.doctor?.doctor_name || 'Unknown Doctor'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {eligibility.doctor?.clinic_name || 'Unknown Clinic'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: eligibility.benefit_config?.display_color || '#6B7280' }}
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {eligibility.benefit_config?.title || 'Unknown Award'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {eligibility.benefit_config?.benefit_type || 'Unknown Type'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {eligibility.research_paper ? (
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {eligibility.research_paper.title || 'Unknown Paper'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {eligibility.research_paper.upvote_count || 0} upvotes
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 italic">Not specified</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {eligibility.approval_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                eligibility.status === 'delivered' 
                                  ? 'bg-green-100 text-green-800'
                                  : eligibility.status === 'cancelled' || (eligibility as any).category === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {eligibility.status === 'delivered' 
                                  ? 'Delivered'
                                  : eligibility.status === 'cancelled' || (eligibility as any).category === 'rejected'
                                  ? 'Rejected'
                                  : 'Pending'}
                              </span>
                              {eligibility.status === 'cancelled' && eligibility.notes && (
                                <div className="mt-1 text-xs text-gray-500">
                                  {eligibility.notes}
                                </div>
                              )}
                            </div>
                          </td>
                          {(eligibilityFilter === 'all' || eligibilityFilter === 'delivered' || eligibilityFilter === 'not_delivered' || eligibilityFilter === 'rejected') && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {eligibility.delivered_by_doctor?.doctor_name || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {eligibility.delivered_at 
                                  ? new Date(eligibility.delivered_at).toLocaleDateString()
                                  : new Date(eligibility.created_at).toLocaleDateString()
                                }
                              </td>
                            </>
                          )}
                          {isFullAdmin && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedEligibility(eligibility);
                                  setShowStatusModal(true);
                                }}
                                  className="text-blue-600 hover:text-blue-900"
                                title="Update Status"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                                {eligibility.doctor && (
                                  <button
                                    onClick={() => {
                                      // Find the corresponding benefit for this eligibility
                                      const benefit = benefits.find(b => 
                                        b.doctor_id === eligibility.doctor_id && 
                                        b.benefit_type === eligibility.benefit_config?.benefit_type
                                      );
                                      if (benefit) {
                                        setBenefitToDelete({
                                          id: benefit.id,
                                          doctorName: eligibility.doctor?.doctor_name || 'Unknown',
                                          benefitType: benefit.benefit_type || 'Unknown'
                                        });
                                        setShowDeleteBenefitModal(true);
                                      } else {
                                        toast.error('No benefit record found for this eligibility');
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete Benefit"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                        ))
                      )}
                      {eligibilityFilter !== 'not_eligible' && rewardEligibilities.length === 0 && (
                        <tr>
                          <td colSpan={isFullAdmin ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-lg font-medium text-gray-900 mb-2">
                                {eligibilitySearch 
                                  ? 'No results found for your search'
                                  : `No ${eligibilityFilter === 'all' ? 'eligible rewards' : eligibilityFilter.replace('_', ' ')} found`}
                              </p>
                              <p className="text-sm text-gray-500 mb-4">
                                {eligibilitySearch 
                                  ? 'Try a different search term'
                                  : 'Click "Check Eligibility" to scan for users who qualify for rewards'}
                              </p>
                              {isFullAdmin && !eligibilitySearch && (
                                <button
                                  onClick={handleCheckEligibility}
                                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                >
                                  {isViewerAdmin ? 'Check Eligibility (View Only)' : 'Check Eligibility'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Benefit Configurations Tab */}
            {activeTab === 'benefit-configs' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      Manage Research Awards & Benefits ({benefitConfigs.length})
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Configure rewards, thresholds, and anti-gaming controls
                    </p>
                  </div>
                  {isViewerAdmin ? (
                    <button
                      disabled
                      className="bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add New Award (View Only)
                    </button>
                  ) : (
                  <button
                    onClick={() => {
                      setSelectedConfig(null);
                      setShowConfigModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Award
                  </button>
                  )}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Award Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Threshold
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type & Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Anti-Gaming
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
                      {benefitConfigs.map((config) => (
                        <tr key={config.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-3"
                                style={{ backgroundColor: config.display_color }}
                              ></div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {config.title}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {config.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {config.approval_threshold_max 
                                ? `${config.approval_threshold}-${config.approval_threshold_max}`
                                : `${config.approval_threshold}+`
                              } approvals
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <span className="capitalize">{config.benefit_type.replace('_', ' ')}</span>
                              {config.benefit_type === 'tier_progress' && (
                                <span className="text-blue-600"> (+{config.benefit_value}%)</span>
                              )}
                              {config.benefit_type === 'gift' && (
                                <span className="text-purple-600"> ({config.gift_description})</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs text-gray-500">
                              <div>Max: {config.max_awards_per_doctor}x per doctor</div>
                              {config.cooldown_days > 0 && (
                                <div>Cooldown: {config.cooldown_days} days</div>
                              )}
                              {config.requires_manual_approval && (
                                <div className="text-orange-600">Manual approval required</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              config.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {config.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {isViewerAdmin ? (
                              <span className="text-gray-400 text-xs">View Only</span>
                            ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedConfig(config);
                                  setShowConfigModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              <button
                                  onClick={() => {
                                    const threshold = config.approval_threshold_max 
                                      ? `${config.approval_threshold}-${config.approval_threshold_max}`
                                      : `${config.approval_threshold}+`;
                                    setAwardToDelete({ 
                                      id: config.id, 
                                      title: config.title,
                                      threshold: threshold
                                    });
                                    setShowDeleteAwardModal(true);
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {benefitConfigs.length === 0 && (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No award configurations</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by creating a new award configuration.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">
                    Research Reports ({reports.length})
                  </h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Research Paper
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reporter
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Admin Notes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reviewed By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reviewed At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IP Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User Agent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Updated At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reports.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                            {report.id.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {report.research_paper?.title || 'Unknown Paper'}
                            </div>
                            {report.research_paper?.doctor && (
                              <div className="text-xs text-gray-500 mt-1">
                                By: {report.research_paper.doctor.doctor_name}
                                {report.research_paper.doctor.clinic_name && ` (${report.research_paper.doctor.clinic_name})`}
                              </div>
                            )}
                            {report.research_paper?.upvote_count !== undefined && (
                              <div className="text-xs text-gray-400 mt-1">
                                {report.research_paper.upvote_count} upvotes, {report.research_paper.view_count || 0} views
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {report.reporter?.doctor_name || 'Unknown Reporter'}
                            </div>
                            {report.reporter?.clinic_name && (
                              <div className="text-xs text-gray-500">{report.reporter.clinic_name}</div>
                            )}
                            {report.reporter?.email && (
                              <div className="text-xs text-gray-400">{report.reporter.email}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getReportTypeColor(report.report_type)}`}>
                              {report.report_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <div className="text-sm text-gray-900 break-words">
                              {report.description || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                              report.status === 'dismissed' ? 'bg-gray-100 text-gray-800' :
                              report.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {report.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <div className="text-sm text-gray-900 break-words">
                              {report.admin_notes || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {report.reviewer?.doctor_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {report.reviewed_at ? new Date(report.reviewed_at).toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                            {report.ip_address || '-'}
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <div className="text-xs text-gray-500 break-words">
                              {report.user_agent || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(report.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(report.updated_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => {
                                setSelectedPaper(report.research_paper ? { id: report.research_paper_id, title: report.research_paper.title } as any : null);
                                setShowPaperModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Report Details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            {isFullAdmin && (
                              <>
                              <button
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to dismiss this report?')) {
                                      try {
                                        const token = getAccessToken();
                                        // Use centralized API instance
                                        const response = await api.post(`/admin/research-reports/${report.id}/dismiss`);
                                        
                                        if (response.data.success) {
                                          const result = response.data;
                                          if (result.success) {
                                            toast.success('Report dismissed successfully');
                                            setReports(prev => prev.filter(r => r.id !== report.id));
                                            fetchData();
                                          } else {
                                            toast.error(result.message || 'Failed to dismiss report');
                                          }
                                        } else {
                                          toast.error('Failed to dismiss report');
                                        }
                                      } catch (error) {
                                        console.error('Error dismissing report:', error);
                                        toast.error('Failed to dismiss report');
                                      }
                                    }
                                  }}
                                  className="text-yellow-600 hover:text-yellow-900"
                                  title="Dismiss Report"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
                                      try {
                                        const token = getAccessToken();
                                        if (!token) {
                                          toast.error('Authentication required');
                                          return;
                                        }
                                        
                                        // Use centralized API instance
                                        const response = await api.delete(`/admin/research-reports/${report.id}`);
                                        
                                        if (response.data.success) {
                                          const result = response.data;
                                          if (result.success) {
                                            toast.success('Report deleted successfully');
                                            setReports(prev => prev.filter(r => r.id !== report.id));
                                            fetchData();
                                          } else {
                                            toast.error(result.message || 'Failed to delete report');
                                          }
                                        } else {
                                          const errorData = await response.json();
                                          toast.error(errorData.message || 'Failed to delete report');
                                        }
                                      } catch (error) {
                                        console.error('Error deleting report:', error);
                                        toast.error('Failed to delete report');
                                      }
                                    }
                                  }}
                                className="text-red-600 hover:text-red-900"
                                  title="Delete Report"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                                <button
                                  onClick={() => handleRemovePaper(report.research_paper_id)}
                                  className="text-orange-600 hover:text-orange-900 ml-2"
                                  title="Remove Research Paper"
                                >
                                  Remove Paper
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
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Research Settings</h2>
                <form onSubmit={handleSaveSettings}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Monthly Paper Submission Limit
                    </label>
                    <input
                      type="number"
                        value={monthlyLimit}
                        onChange={(e) => {
                          if (isViewerAdmin) return;
                          setMonthlyLimit(parseInt(e.target.value) || 0);
                        }}
                        min="1"
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm px-3 py-2 border ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        required
                        readOnly={isViewerAdmin}
                        disabled={isViewerAdmin}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Maximum number of research papers a user can submit per month
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Minimum Tier for Approval
                    </label>
                      <select 
                        value={minimumTier}
                        onChange={(e) => {
                          if (isViewerAdmin) return;
                          setMinimumTier(e.target.value);
                        }}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm px-3 py-2 border ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        disabled={isViewerAdmin}
                      >
                      {availableTiers.length > 0 ? (
                        availableTiers.map((tier) => (
                          <option key={tier.name} value={tier.name}>
                            {tier.name}
                          </option>
                        ))
                      ) : (
                        // Fallback options if tiers haven't loaded yet - matches actual tier system
                        <>
                          <option value="Lead Starter">Lead Starter</option>
                          <option value="Lead Contributor">Lead Contributor</option>
                          <option value="Lead Expert">Lead Expert</option>
                          <option value="Grand Lead">Grand Lead</option>
                          <option value="Elite Lead">Elite Lead</option>
                        </>
                      )}
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      Minimum tier required to approve research papers
                    </p>
                  </div>
                  
                    {isViewerAdmin ? (
                      <button 
                        type="button"
                        disabled
                        className="bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed"
                      >
                        Save Settings (View Only)
                      </button>
                    ) : (
                      <button 
                        type="submit"
                        className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
                      >
                    Save Settings
                  </button>
                    )}
                </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* Research Paper Details Modal */}
        {showPaperModal && selectedPaper && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Research Paper Details
                  </h2>
                  <button
                    onClick={() => setShowPaperModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPaper.title}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Abstract</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                      {selectedPaper.abstract}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Author</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedPaper.doctor?.doctor_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tier</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedPaper.doctor?.tier || 'Unknown'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Views</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedPaper.view_count}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Approvals</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedPaper.upvote_count}</p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-6">
                  {!selectedPaper.is_approved && isFullAdmin && (
                    <button
                      onClick={() => {
                        handleApprovePaper(selectedPaper.id);
                        setShowPaperModal(false);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Approve Paper
                    </button>
                  )}
                  {isFullAdmin && (
                    <button
                      onClick={() => {
                        handleRemovePaper(selectedPaper.id);
                        setShowPaperModal(false);
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Remove Paper
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Benefit Configuration Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedConfig ? 'Edit Award Configuration' : 'Create New Award Configuration'}
                  </h2>
                  <button
                    onClick={() => setShowConfigModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const data = {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    approval_threshold: parseInt(formData.get('approval_threshold') as string),
                    approval_threshold_max: formData.get('approval_threshold_max') ? parseInt(formData.get('approval_threshold_max') as string) : null,
                    view_threshold: formData.get('view_threshold') ? parseInt(formData.get('view_threshold') as string) : null,
                    benefit_type: formData.get('benefit_type'),
                    benefit_value: parseFloat(formData.get('benefit_value') as string),
                    gift_description: formData.get('gift_description'),
                    is_active: formData.get('is_active') === 'on',
                    display_color: formData.get('display_color'),
                    max_awards_per_doctor: parseInt(formData.get('max_awards_per_doctor') as string),
                    cooldown_days: parseInt(formData.get('cooldown_days') as string),
                    requires_manual_approval: formData.get('requires_manual_approval') === 'on'
                  };

                  try {
                    const url = selectedConfig 
                      ? `${getApiUrl()}/admin/research-benefit-configs/${selectedConfig.id}`
                      : `${getApiUrl()}/admin/research-benefit-configs`;
                    
                    const response = await fetch(url, {
                      method: selectedConfig ? 'PUT' : 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getAccessToken()}`
                      },
                      body: JSON.stringify(data)
                    });

                    if (response.ok) {
                      toast.success(selectedConfig ? 'Award updated successfully' : 'Award created successfully');
                      setShowConfigModal(false);
                      fetchData();
                    } else {
                      toast.error('Failed to save award configuration');
                    }
                  } catch (error) {
                    toast.error('Error saving award configuration');
                  }
                }} className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Award Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        defaultValue={selectedConfig?.title || ''}
                        required
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="e.g., 50+ Approvals"
                        readOnly={isViewerAdmin}
                        disabled={isViewerAdmin}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Color
                      </label>
                      <input
                        type="color"
                        name="display_color"
                        defaultValue={selectedConfig?.display_color || '#4F46E5'}
                        className={`w-full h-10 border border-gray-300 rounded-md ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isViewerAdmin}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      defaultValue={selectedConfig?.description || ''}
                      rows={2}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="Describe what this award is for..."
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Approvals *
                      </label>
                      <input
                        type="number"
                        name="approval_threshold"
                        defaultValue={selectedConfig?.approval_threshold || ''}
                        required
                        min="1"
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="20"
                        readOnly={isViewerAdmin}
                        disabled={isViewerAdmin}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Approvals (Optional)
                      </label>
                      <input
                        type="number"
                        name="approval_threshold_max"
                        defaultValue={selectedConfig?.approval_threshold_max || ''}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="99 (for ranges like 80-99)"
                        readOnly={isViewerAdmin}
                        disabled={isViewerAdmin}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Benefit Type *
                      </label>
                      <select
                        name="benefit_type"
                        defaultValue={selectedConfig?.benefit_type === 'gift' ? 'gift' : ''}
                        required
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        disabled={isViewerAdmin}
                      >
                        <option value="">Select type...</option>
                        <option value="gift">Gift/Reward</option>
                      </select>
                      {(selectedConfig?.benefit_type === 'bonus_approvals' || selectedConfig?.benefit_type === 'tier_progress') && (
                        <p className="mt-1 text-sm text-amber-600">
                          ⚠️ This award uses "{selectedConfig?.benefit_type === 'bonus_approvals' ? 'Bonus Approvals' : 'Tier Progress Boost'}" which is no longer available. Please select "Gift/Reward" as the benefit type.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Benefit Value *
                      </label>
                      <input
                        type="number"
                        name="benefit_value"
                        defaultValue={selectedConfig?.benefit_value || ''}
                        required
                        step="0.01"
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="Enter benefit value"
                        readOnly={isViewerAdmin}
                        disabled={isViewerAdmin}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gift Description (for gift type)
                    </label>
                    <input
                      type="text"
                      name="gift_description"
                      defaultValue={selectedConfig?.gift_description || ''}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="Monthly company gift"
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Anti-Gaming Controls</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Awards per Doctor
                        </label>
                        <input
                          type="number"
                          name="max_awards_per_doctor"
                          defaultValue={selectedConfig?.max_awards_per_doctor || 1}
                          min="1"
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          readOnly={isViewerAdmin}
                          disabled={isViewerAdmin}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cooldown Days
                        </label>
                        <input
                          type="number"
                          name="cooldown_days"
                          defaultValue={selectedConfig?.cooldown_days || 0}
                          min="0"
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          readOnly={isViewerAdmin}
                          disabled={isViewerAdmin}
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="requires_manual_approval"
                          defaultChecked={selectedConfig?.requires_manual_approval || false}
                          className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={isViewerAdmin}
                        />
                        <span className="ml-2 text-sm text-gray-700">Requires manual admin approval</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="is_active"
                          defaultChecked={selectedConfig?.is_active !== false}
                          className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={isViewerAdmin}
                        />
                        <span className="ml-2 text-sm text-gray-700">Active (award will be given automatically)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    {isViewerAdmin ? (
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
                      >
                        {selectedConfig ? 'Update Award (View Only)' : 'Create Award (View Only)'}
                      </button>
                    ) : (
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      {selectedConfig ? 'Update Award' : 'Create Award'}
                    </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Status Update Modal */}
        {showStatusModal && selectedEligibility && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Update Reward Status
                  </h2>
                  <button
                    onClick={() => {
                      setShowStatusModal(false);
                      setSelectedEligibility(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Reward Details</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Doctor:</span> {selectedEligibility.doctor?.doctor_name}
                      </div>
                      <div>
                        <span className="font-medium">Award:</span> {selectedEligibility.benefit_config?.title}
                      </div>
                      <div>
                        <span className="font-medium">Approvals:</span> {selectedEligibility.approval_count}
                      </div>
                      <div>
                        <span className="font-medium">Current Status:</span> 
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                          selectedEligibility.status === 'delivered' 
                            ? 'bg-green-100 text-green-800'
                            : selectedEligibility.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedEligibility.status.charAt(0).toUpperCase() + selectedEligibility.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const status = formData.get('status') as string;
                  const notes = formData.get('notes') as string;
                  handleUpdateStatus(selectedEligibility.id, status, notes);
                }}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Status *
                    </label>
                    <select
                      name="status"
                      required
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      disabled={isViewerAdmin}
                    >
                      <option value="eligible">Eligible</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      name="notes"
                      rows={3}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="Add any notes about the delivery or status change..."
                      defaultValue={selectedEligibility.notes || ''}
                      readOnly={isViewerAdmin}
                      disabled={isViewerAdmin}
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowStatusModal(false);
                        setSelectedEligibility(null);
                      }}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    {isViewerAdmin ? (
                      <button
                        type="button"
                        disabled
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
                      >
                        Update Status (View Only)
                      </button>
                    ) : (
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Update Status
                    </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Research Paper Confirmation Modal */}
        {showDeleteModal && paperToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
                setShowDeleteModal(false);
                setPaperToDelete(null);
              }} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Delete Research Paper</h3>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setPaperToDelete(null);
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
                        Are you sure you want to delete this research paper?
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Paper Title:</p>
                    <p className="text-sm text-gray-900 break-words">{paperToDelete.title}</p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setPaperToDelete(null);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeletePaper}
                    disabled={isViewerAdmin}
                    className={`flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Delete Paper
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Award Configuration Confirmation Modal */}
        {showDeleteAwardModal && awardToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
                setShowDeleteAwardModal(false);
                setAwardToDelete(null);
              }} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Delete Award Configuration</h3>
                  <button
                    onClick={() => {
                      setShowDeleteAwardModal(false);
                      setAwardToDelete(null);
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
                        Are you sure you want to delete this award configuration?
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Award Title:</p>
                    <p className="text-sm text-gray-900 break-words mb-2">{awardToDelete.title}</p>
                    <p className="text-sm font-medium text-gray-700 mb-1">Threshold:</p>
                    <p className="text-sm text-gray-900">{awardToDelete.threshold} approvals</p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteAwardModal(false);
                      setAwardToDelete(null);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteAward}
                    disabled={isViewerAdmin}
                    className={`flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Delete Award
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Research Benefit Confirmation Modal */}
        {showDeleteBenefitModal && benefitToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
                setShowDeleteBenefitModal(false);
                setBenefitToDelete(null);
              }} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Delete Research Benefit</h3>
                  <button
                    onClick={() => {
                      setShowDeleteBenefitModal(false);
                      setBenefitToDelete(null);
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
                        Are you sure you want to delete this research benefit?
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Doctor:</p>
                    <p className="text-sm text-gray-900 break-words mb-2">{benefitToDelete.doctorName}</p>
                    <p className="text-sm font-medium text-gray-700 mb-1">Benefit Type:</p>
                    <p className="text-sm text-gray-900 capitalize">{benefitToDelete.benefitType.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteBenefitModal(false);
                      setBenefitToDelete(null);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteBenefit}
                    disabled={isViewerAdmin}
                    className={`flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Delete Benefit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Saved Success Modal */}
        {showSettingsSuccessModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowSettingsSuccessModal(false)} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Settings Saved</h3>
                  <button
                    onClick={() => setShowSettingsSuccessModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="w-12 h-12 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        Research settings have been saved successfully!
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Your changes have been applied and will take effect immediately.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Updated Settings:</p>
                    <ul className="text-sm text-gray-900 space-y-1">
                      <li>• Monthly Submission Limit: {monthlyLimit} papers</li>
                      <li>• Minimum Tier for Approval: {minimumTier}</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSettingsSuccessModal(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    OK
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
