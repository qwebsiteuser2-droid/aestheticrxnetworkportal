'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { getAccessToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '@/lib/apiConfig';
import { 
  ExclamationTriangleIcon, 
  EyeIcon, 
  TrashIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ResearchReport {
  id: string;
  research_paper_id: string;
  reporter_id: string;
  report_type: string;
  description: string;
  status: string;
  created_at: string;
  research_paper?: {
    id: string;
    title: string;
    doctor_id: string;
    doctor?: {
      doctor_name: string;
    };
  };
  reporter?: {
    doctor_name: string;
  };
}

export default function AdminResearchReportsPage() {
  const { user, isAuthenticated } = useAuth();
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/';
      return;
    }
    if (user && !user.is_admin) {
      window.location.href = '/';
      return;
    }
  }, [isAuthenticated, user]);

  const fetchReports = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/admin/research-reports`, {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });
      const result = await response.json();
      
      if (result.success) {
        setReports(result.data);
      } else {
        toast.error('Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to fetch reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.is_admin) {
      fetchReports();
    }
  }, [user]);

  const handleViewReport = (report: ResearchReport) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/admin/research-reports/${reportId}/dismiss`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Report dismissed successfully');
        fetchReports();
      } else {
        toast.error(result.message || 'Failed to dismiss report');
      }
    } catch (error) {
      console.error('Error dismissing report:', error);
      toast.error('Failed to dismiss report');
    }
  };

  const handleRemoveResearchPaper = async (paperId: string) => {
    if (!confirm('Are you sure you want to remove this research paper? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/admin/research-papers/${paperId}/remove`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'Removed due to community guidelines violation'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Research paper removed successfully');
        fetchReports();
      } else {
        toast.error(result.message || 'Failed to remove research paper');
      }
    } catch (error) {
      console.error('Error removing research paper:', error);
      toast.error('Failed to remove research paper');
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
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Research Reports Management</h1>
          <p className="text-gray-600 mt-2">
            Manage reports submitted by users about research papers
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner w-8 h-8"></div>
            <span className="ml-3 text-gray-600">Loading reports...</span>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Research Reports ({reports.length})
              </h2>
            </div>
            
            {reports.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                <p className="text-gray-600">There are no research reports to review at this time.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Research Paper
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reporter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Report Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {report.research_paper?.title || 'Unknown Paper'}
                          </div>
                          <div className="text-sm text-gray-500">
                            By: {report.research_paper?.doctor?.doctor_name || 'Unknown Author'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {report.reporter?.doctor_name || 'Unknown Reporter'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getReportTypeColor(report.report_type)}`}>
                            {report.report_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                            {report.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(report.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleViewReport(report)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDismissReport(report.id)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Dismiss Report"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveResearchPaper(report.research_paper_id)}
                            className="text-red-600 hover:text-red-900"
                            title="Remove Research Paper"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Report Details Modal */}
        {showReportModal && selectedReport && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Report Details
                  </h2>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Research Paper</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReport.research_paper?.title}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reporter</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReport.reporter?.doctor_name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Report Type</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getReportTypeColor(selectedReport.report_type)}`}>
                      {selectedReport.report_type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                      {selectedReport.description}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reported On</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedReport.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3 pt-6">
                  <button
                    onClick={() => handleDismissReport(selectedReport.id)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Dismiss Report
                  </button>
                  <button
                    onClick={() => handleRemoveResearchPaper(selectedReport.research_paper_id)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Remove Research Paper
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
