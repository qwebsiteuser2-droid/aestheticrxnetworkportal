'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { getAccessToken } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { ResearchPaper } from '@/types';
import { toast } from 'react-hot-toast';
import { researchApi } from '@/lib/api';
import { getApiUrl } from '@/lib/getApiUrl';
import { Bars3Icon, DocumentTextIcon, PlusIcon, EyeIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import TierRestrictionModal from '@/components/modals/TierRestrictionModal';
import MonthlyLimitModal from '@/components/modals/MonthlyLimitModal';

export function ResearchPage() {
  const { user, isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(null);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingPaperId, setReportingPaperId] = useState<string | null>(null);
  const [benefitConfigs, setBenefitConfigs] = useState<any[]>([]);
  const [showTierRestrictionModal, setShowTierRestrictionModal] = useState(false);
  const [tierRestrictionData, setTierRestrictionData] = useState<{ requiredTier: string; currentTier: string } | null>(null);
  const [showMonthlyLimitModal, setShowMonthlyLimitModal] = useState(false);
  const [monthlyLimitMessage, setMonthlyLimitMessage] = useState('');

  // Allow public access to research benefits, but redirect for other features
  useEffect(() => {
    // Only redirect if user is trying to access authenticated features
    // Research benefits should be visible to everyone
  }, [isAuthenticated, user]);

  // Fetch research papers function (public access)
  const fetchPapers = async () => {
    try {
      // Use public endpoint to get research papers
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/research`);
      const result = await response.json();
      
      if (result.success) {
        setPapers(result.data.papers || []);
      } else {
        console.error('Failed to load research papers:', result.message);
        setPapers([]);
      }
    } catch (error) {
      console.error('Error fetching research papers:', error);
      setPapers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch leaderboard data (public)
  const fetchLeaderboard = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/public/leaderboard`);
      const result = await response.json();
      if (result.success) {
        setLeaderboard(result.data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      // Set empty array as fallback
      setLeaderboard([]);
    }
  };

  // Fetch benefit configurations
  const fetchBenefitConfigs = async () => {
    try {
      console.log('Fetching research benefits...');
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/public/research-benefits`);
      const result = await response.json();
      console.log('Research benefits response:', result);
      if (result.success) {
        // Sort by approval threshold and filter only active configs
        const activeConfigs = result.data.filter((config: any) => config.is_active)
          .sort((a: any, b: any) => a.approval_threshold - b.approval_threshold);
        console.log('Active benefit configs:', activeConfigs);
        setBenefitConfigs(activeConfigs);
      }
    } catch (error) {
      console.error('Error fetching benefit configurations:', error);
      // Set empty array as fallback
      setBenefitConfigs([]);
    }
  };

  // Helper function to format benefit display text
  const formatBenefitText = (config: any) => {
    switch (config.benefit_type) {
      case 'gift':
        return config.gift_description || 'Special gift';
      case 'tier_progress':
        return `${config.benefit_value}% tier progress boost`;
      default:
        return config.description || 'Special reward';
    }
  };

  // Helper function to format threshold display
  const formatThreshold = (config: any) => {
    if (config.approval_threshold_max) {
      return `${config.approval_threshold}-${config.approval_threshold_max}`;
    }
    return `${config.approval_threshold}+`;
  };

  // Fetch research papers on component mount
  useEffect(() => {
    fetchPapers();
    fetchLeaderboard();
    fetchBenefitConfigs();
  }, []);

  const handleUpvote = async (paperId: string) => {
    // Check if user is logged in
    if (!user) {
      toast.error('Please log in to approve research papers');
      return;
    }
    
    // Only doctors can upvote research papers
    if (user.user_type !== 'doctor') {
      toast.error('Only doctors can upvote research papers');
      return;
    }

    try {
      // First try to upvote
      const result = await researchApi.upvote(paperId);
      
      if (result.success) {
        // Update the paper in the list with new upvote count
        setPapers(prev => prev.map(paper => 
          paper.id === paperId 
            ? { ...paper, upvote_count: result.data.upvote_count }
            : paper
        ));
        toast.success('Research paper approved successfully!');
      } else {
        toast.error(result.message || 'Failed to approve research paper');
      }
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already upvoted')) {
        // User has already approved, so remove the approval
        try {
          const removeResult = await researchApi.removeUpvote(paperId);
          if (removeResult.success) {
            setPapers(prev => prev.map(paper => 
              paper.id === paperId 
                ? { ...paper, upvote_count: removeResult.data.upvote_count }
                : paper
            ));
            toast.success('Approval removed successfully!');
          }
        } catch (removeError: any) {
          toast.error('Failed to remove approval');
        }
      } else if (error.response?.status === 403) {
        const errorMessage = error.response.data.message || 'Insufficient rank to approve research papers';
        
        // Parse the error message to extract tier information
        // Format: "You need to reach {requiredTier} rank or higher to approve research papers. Your current rank: {currentTier}"
        const tierMatch = errorMessage.match(/reach\s+([^r]+?)\s+rank.*current rank:\s*(.+?)(?:\.|$)/i);
        
        if (tierMatch && tierMatch.length >= 3) {
          const requiredTier = tierMatch[1].trim();
          const currentTier = tierMatch[2].trim();
          setTierRestrictionData({ requiredTier, currentTier });
          setShowTierRestrictionModal(true);
        } else {
          // Fallback: try to extract from message
          const requiredMatch = errorMessage.match(/reach\s+([^r]+?)\s+rank/i);
          const currentMatch = errorMessage.match(/current rank:\s*(.+?)(?:\.|$)/i);
          
          if (requiredMatch && currentMatch) {
            setTierRestrictionData({ 
              requiredTier: requiredMatch[1].trim(), 
              currentTier: currentMatch[1].trim() 
            });
            setShowTierRestrictionModal(true);
          } else {
            // If parsing fails, show generic message
            toast.error(errorMessage);
          }
        }
      } else {
        toast.error('Failed to approve research paper');
      }
    }
  };

  const handleView = async (paperId: string) => {
    try {
      const result = await researchApi.trackView(paperId);
      
      if (result.success) {
        // Update the paper in the list with new view count
        setPapers(prev => prev.map(paper => 
          paper.id === paperId 
            ? { ...paper, view_count: result.data.view_count }
            : paper
        ));
        
        // Also update selectedPaper if it's the same paper
        if (selectedPaper && selectedPaper.id === paperId) {
          setSelectedPaper(prev => prev ? { ...prev, view_count: result.data.view_count } : null);
        }
      }
    } catch (error: any) {
      // Don't show error for view tracking failures - it's not critical
      console.log('View tracking failed (non-critical):', error.response?.status);
    }
  };

  const handleReportPaper = (paperId: string) => {
    setReportingPaperId(paperId);
    setShowReportModal(true);
  };

  const handleSubmitReport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!reportingPaperId) return;
    
    const formData = new FormData(e.currentTarget);
    const reportType = formData.get('reportType') as string;
    const description = formData.get('description') as string;
    
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/research/${reportingPaperId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ report_type: reportType, description })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Research paper reported successfully. Our team will review it.');
        setShowReportModal(false);
        setReportingPaperId(null);
      } else {
        toast.error(result.message || 'Failed to report research paper');
      }
    } catch (error) {
      console.error('Report submission error:', error);
      toast.error('Failed to report research paper');
    }
  };

  const handleSubmitResearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      toast.error('Please log in to submit research papers');
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await researchApi.create(formData);

      if (result.success) {
        const makePublic = formData.get('makePublic') === 'on';
        if (makePublic) {
          toast.success('Research paper submitted and published successfully!');
        } else {
          toast.success('Research paper submitted successfully! It will be reviewed by admins.');
        }
        setShowSubmissionForm(false);
        // Refresh the papers list
        fetchPapers();
      } else {
        // Check if it's a monthly limit error
        if (result.message && (result.message.includes('monthly limit') || result.message.includes('monthly submission limit'))) {
          setMonthlyLimitMessage(result.message);
          setShowMonthlyLimitModal(true);
        } else {
          toast.error(result.message || 'Failed to submit research paper');
        }
      }
    } catch (error: any) {
      console.error('Submit research error:', error);
      
      // Check if it's a monthly limit error from the response
      const errorMessage = error.response?.data?.message || error.message || '';
      if (errorMessage.includes('monthly limit') || errorMessage.includes('monthly submission limit')) {
        setMonthlyLimitMessage(errorMessage);
        setShowMonthlyLimitModal(true);
        return;
      }
      
      // Check if it's an authentication error
      if (error.response?.status === 401 || errorMessage.includes('token')) {
        toast.error('Your session has expired. Please log in again.');
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        toast.error('Failed to submit research paper');
      }
    }
  };

  const handleReadFullPaper = (paper: ResearchPaper) => {
    setSelectedPaper(paper);
    setShowPaperModal(true);
    // Track view
    handleView(paper.id);
  };

  const handleDownloadPDF = async (paper: ResearchPaper) => {
    if (!paper.pdf_file_url) {
      toast.error('PDF file not available for this research paper');
      return;
    }

    try {
      // Create a download link using the new download endpoint
      const apiUrl = getApiUrl();
      const downloadUrl = `${apiUrl}/research/${paper.id}/download`;
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = paper.pdf_file_name || `${paper.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      link.target = '_blank';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('PDF download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download PDF file');
    }
  };

  // Regular users are auto-approved and should have view access
  const userType = user?.user_type || (user as any)?.user_type || '';
  const isRegularUser = userType === 'regular' || userType === 'regular_user';
  const canView = isAuthenticated && (isRegularUser || user?.is_approved || user?.is_admin);
  
  if (!canView) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full">
      {/* Mobile header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 w-full">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Research Papers</h1>
          <div className="w-6" /> {/* Spacer */}
        </div>
      </div>

      <div className="flex overflow-x-hidden w-full">
        {/* Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        />

        {/* Main content */}
        <div className="flex-1 lg:ml-0 overflow-x-hidden w-full min-w-0">
          <div className="p-3 lg:p-6 max-w-full overflow-x-hidden w-full">
            {/* Header */}
            <div className="mb-6 lg:mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <DocumentTextIcon className="w-6 h-6 lg:w-8 lg:h-8 text-primary-600" />
                  <h1 className="text-xl lg:text-3xl font-bold text-gray-900">
                    Research Papers
                  </h1>
                </div>
                {isAuthenticated && user?.user_type === 'doctor' && (
                  <button
                    onClick={() => setShowSubmissionForm(true)}
                    className="btn-primary flex items-center justify-center space-x-2 text-sm lg:text-base"
                  >
                    <PlusIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                    <span>Submit Research</span>
                  </button>
                )}
              </div>
              <p className="text-sm lg:text-base text-gray-600 mt-2">
                Explore research papers submitted by medical professionals in our community.
              </p>
            </div>

            {/* Research Benefits */}
            <div className="mb-6 lg:mb-8 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 lg:p-6">
              <h3 className="text-base lg:text-lg font-semibold text-green-900 mb-3 lg:mb-4">
                🎯 Research Benefits & Rewards
              </h3>
              {benefitConfigs.length > 0 ? (
                <div className={`grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4`}>
                  {benefitConfigs.map((config, index) => (
                    <div 
                      key={config.id} 
                      className="bg-white rounded-lg p-2 lg:p-4 border-2 transition-all hover:shadow-md"
                      style={{ borderColor: config.display_color + '40' }}
                    >
                      <div 
                        className="text-lg lg:text-2xl font-bold mb-1 lg:mb-2"
                        style={{ color: config.display_color }}
                      >
                        {formatThreshold(config)}
                      </div>
                      <div className="text-xs lg:text-sm font-medium text-gray-900 mb-1">Approvals</div>
                      <div className="text-xs text-gray-600">{formatBenefitText(config)}</div>
                      {config.max_awards_per_doctor > 1 && (
                        <div className="text-xs text-blue-600 mt-1">
                          Max {config.max_awards_per_doctor}x per doctor
                        </div>
                      )}
                      {config.cooldown_days > 0 && (
                        <div className="text-xs text-orange-600 mt-1">
                          {config.cooldown_days} day cooldown
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🎁</div>
                  <p>No active rewards configured at the moment.</p>
                  <p className="text-sm">Check back later for exciting benefits!</p>
                </div>
              )}
            </div>

            {/* Citation Guidelines */}
            <div className="mb-6 lg:mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4 lg:p-6">
              <h3 className="text-base lg:text-lg font-semibold text-blue-900 mb-2 lg:mb-3">
                📚 Citation Guidelines
              </h3>
              <div className="text-xs lg:text-sm text-blue-800 space-y-2">
                <p>When submitting research, please ensure proper citation of sources:</p>
                <ul className="list-disc list-inside space-y-1 ml-2 lg:ml-4">
                  <li>Include all references used in your research</li>
                  <li>Use standard medical citation formats (APA, AMA, etc.)</li>
                  <li>Provide DOI links when available</li>
                  <li>Credit all images, charts, and data sources</li>
                </ul>
                <p className="mt-2 lg:mt-3 font-medium">Example citation format:</p>
                <code className="block bg-blue-100 p-2 rounded text-xs mt-1 break-words">
                  Smith, J. (2023). "Medical Research Title." Journal of Medicine, 45(3), 123-145. doi:10.1234/example
                </code>
              </div>
            </div>

            {/* Research Papers */}
            {!isAuthenticated ? (
              <div className="text-center py-12">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
                  <div className="text-6xl mb-4">🔒</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Sign in to View Research Papers</h3>
                  <p className="text-gray-600 mb-6">Access our community's research papers and contribute your own work.</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/login" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                      Sign In
                    </a>
                    <a href="/signup" className="border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors">
                      Get Started
                    </a>
                  </div>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="loading-spinner w-8 h-8"></div>
                <span className="ml-3 text-gray-600">Loading research papers...</span>
              </div>
            ) : (
              <div className="space-y-4 lg:space-y-6">
                {papers.filter(paper => paper.is_approved).map((paper) => (
                  <div key={paper.id} className="card">
                    <div className="card-body p-4 lg:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                        <div className="flex-1">
                          <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">
                            {paper.title}
                          </h3>
                          
                          <p className="text-sm lg:text-base text-gray-600 mb-3 lg:mb-4 line-clamp-2">
                            {paper.abstract}
                          </p>

                          <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6 space-y-2 lg:space-y-0 text-xs lg:text-sm text-gray-500 mb-3 lg:mb-4">
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">By:</span>
                              <span>{paper.doctor?.doctor_name || `Dr. ${paper.doctor_id}`}</span>
                              <span className="text-gray-400">•</span>
                              <span>Research Paper</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>Published:</span>
                              <span>{paper.approved_at ? new Date(paper.approved_at).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'Pending'}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                            <button
                              onClick={() => handleView(paper.id)}
                              className="flex items-center space-x-1 text-gray-600 hover:text-primary-600 transition-colors text-xs lg:text-sm flex-shrink-0"
                            >
                              <EyeIcon className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
                              <span className="whitespace-nowrap">{paper.view_count} views</span>
                            </button>
                            
                            {user?.user_type === 'doctor' ? (
                              <button
                                onClick={() => handleUpvote(paper.id)}
                                className="flex items-center space-x-1 text-gray-600 hover:text-green-600 cursor-pointer transition-colors text-xs lg:text-sm flex-shrink-0"
                                title="Click to approve/remove approval for this research paper"
                              >
                                <CheckCircleIcon className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
                                <span className="whitespace-nowrap">{paper.upvote_count} approvals</span>
                                <span className="text-xs text-green-600 ml-1 hidden lg:inline whitespace-nowrap">(Click to approve/remove)</span>
                              </button>
                            ) : (
                              <div className="flex items-center space-x-1 text-gray-400 text-xs lg:text-sm flex-shrink-0">
                                <CheckCircleIcon className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
                                <span className="whitespace-nowrap">{paper.upvote_count} approvals</span>
                              </div>
                            )}

                            {/* PDF File Indicator */}
                            {paper.pdf_file_url && (
                              <div className="flex items-center space-x-1 text-blue-600 text-xs lg:text-sm flex-shrink-0">
                                <DocumentTextIcon className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
                                <span className="whitespace-nowrap">PDF Available</span>
                              </div>
                            )}

                            {/* Report Button */}
                            <button
                              onClick={() => handleReportPaper(paper.id)}
                              className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition-colors text-xs lg:text-sm flex-shrink-0"
                              title="Report this research paper"
                            >
                              <svg className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span className="whitespace-nowrap">Report</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col lg:flex-row lg:ml-6 space-y-2 lg:space-y-0 lg:space-x-3 flex-shrink-0">
                          <button 
                            onClick={() => handleReadFullPaper(paper)}
                            className="btn-primary text-sm lg:text-base px-3 py-2 lg:px-4 lg:py-2 whitespace-nowrap"
                          >
                            Read Full Paper
                          </button>
                          
                          {/* PDF Download Button */}
                          {paper.pdf_file_url && (
                            <button
                              onClick={() => handleDownloadPDF(paper)}
                              className="inline-flex items-center justify-center px-3 py-2 lg:px-4 lg:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm lg:text-base whitespace-nowrap"
                            >
                              <DocumentTextIcon className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2 flex-shrink-0" />
                              Download PDF
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {papers.filter(paper => paper.is_approved).length === 0 && (
                  <div className="text-center py-12">
                    <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No research papers yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Be the first to submit a research paper to our community.
                    </p>
                    <button
                      onClick={() => setShowSubmissionForm(true)}
                      className="btn-primary"
                    >
                      Submit Research
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Pending Papers (for admins) */}
            {user?.is_admin && papers.filter(paper => !paper.is_approved).length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Pending Approval
                </h2>
                <div className="space-y-4">
                  {papers.filter(paper => !paper.is_approved).map((paper) => (
                    <div key={paper.id} className="card border-yellow-200 bg-yellow-50">
                      <div className="card-body">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {paper.title}
                            </h3>
                            <p className="text-gray-600 mb-2">
                              {paper.abstract}
                            </p>
                            <div className="text-sm text-gray-500">
                              By {paper.doctor?.doctor_name || `Dr. ${paper.doctor_id}`} • Research Paper • Submitted {new Date(paper.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="ml-6 flex space-x-2">
                            <button className="btn-outline btn-sm">
                              Review
                            </button>
                            <button className="btn-primary btn-sm">
                              Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Research Submission Modal */}
      {showSubmissionForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Submit Research Paper
                </h2>
                <button
                  onClick={() => setShowSubmissionForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmitResearch} className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Research Paper Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter the title of your research paper"
                  />
                </div>

                <div>
                  <label htmlFor="abstract" className="block text-sm font-medium text-gray-700 mb-2">
                    Abstract *
                  </label>
                  <textarea
                    id="abstract"
                    name="abstract"
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Provide a brief summary of your research"
                  />
                </div>

                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Content *
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    required
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter the full content of your research paper"
                  />
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter tags separated by commas (e.g., surgery, cardiology, research)"
                  />
                </div>

                <div>
                  <label htmlFor="pdf" className="block text-sm font-medium text-gray-700 mb-2">
                    PDF File
                  </label>
                  <input
                    type="file"
                    id="pdf"
                    name="pdf"
                    accept=".pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">Upload your research paper as a PDF file (max 10MB)</p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="makePublic"
                    name="makePublic"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="makePublic" className="ml-2 block text-sm text-gray-700">
                    Make this research paper public immediately (skip admin approval)
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowSubmissionForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Submit Research Paper
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Research Paper Modal */}
      {showPaperModal && selectedPaper && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedPaper.title}
                </h2>
                <button
                  onClick={() => setShowPaperModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Abstract</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedPaper.abstract}</p>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Full Content</h3>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedPaper.content}
                  </div>
                </div>

                {selectedPaper.tags && selectedPaper.tags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPaper.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Paper Metadata */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Author:</span>
                      <span className="ml-2 text-gray-900">
                        {selectedPaper.doctor?.doctor_name || `Dr. ${selectedPaper.doctor_id}`}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Published:</span>
                      <span className="ml-2 text-gray-900">
                        {selectedPaper.approved_at ? new Date(selectedPaper.approved_at).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'Pending'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Views:</span>
                      <span className="ml-2 text-gray-900">{selectedPaper.view_count}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Approvals:</span>
                      <span className="ml-2 text-gray-900">{selectedPaper.upvote_count}</span>
                    </div>
                  </div>
                </div>

                {selectedPaper.pdf_file_url && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Document</h3>
                    <button
                      onClick={() => handleDownloadPDF(selectedPaper)}
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <DocumentTextIcon className="w-4 h-4 mr-2" />
                      Download PDF
                    </button>
                  </div>
                )}

                {/* Interactive Buttons */}
                <div className="flex items-center justify-center space-x-6 pt-6 border-t border-gray-200">
                  {user?.user_type === 'doctor' && (
                    <button
                      onClick={() => handleUpvote(selectedPaper.id)}
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>Approve Paper</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Report Research Paper
                </h2>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-2">
                    Report Type *
                  </label>
                  <select
                    id="reportType"
                    name="reportType"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a reason</option>
                    <option value="plagiarism">Plagiarism</option>
                    <option value="misinformation">Misinformation</option>
                    <option value="inappropriate_content">Inappropriate Content</option>
                    <option value="spam">Spam</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Please provide details about the issue..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Tier Restriction Modal */}
      {tierRestrictionData && (
        <TierRestrictionModal
          isOpen={showTierRestrictionModal}
          onClose={() => {
            setShowTierRestrictionModal(false);
            setTierRestrictionData(null);
          }}
          requiredTier={tierRestrictionData.requiredTier}
          currentTier={tierRestrictionData.currentTier}
        />
      )}
      
      {/* Monthly Limit Modal */}
      <MonthlyLimitModal
        isOpen={showMonthlyLimitModal}
        onClose={() => {
          setShowMonthlyLimitModal(false);
          setMonthlyLimitMessage('');
        }}
        message={monthlyLimitMessage}
      />
    </div>
  );
}
