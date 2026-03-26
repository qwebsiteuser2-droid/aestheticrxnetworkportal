'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getAccessToken } from '@/lib/auth';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

interface ExportConfig {
  timeRange: string;
  dataTypes: string[];
  format: string;
  includeMetadata: boolean;
}

interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  fileSize?: number;
  downloadUrl?: string;
  error?: string;
}

export default function DataExportPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    timeRange: '30d',
    dataTypes: ['users', 'orders', 'products'],
    format: 'csv',
    includeMetadata: true
  });
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [fullDbLoading, setFullDbLoading] = useState(false);

  useEffect(() => {
    // Check authentication
    if (!authLoading) {
      if (!isAuthenticated || !user?.is_admin) {
        router.push('/login');
        return;
      }
      console.log('🔍 Admin authenticated, fetching data...');
      fetchExportJobs();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchExportJobs = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      // Use centralized API instance
      const response = await api.get('/admin/export-jobs');
      if (response.data.success) {
        setExportJobs(response.data.data || []);
      } else {
        console.error('Failed to fetch export jobs:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching export jobs:', error);
    }
  };


  const startExport = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot export data.');
      return;
    }
    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) return;

      // Validate custom date range if selected
      if (exportConfig.timeRange === 'custom') {
        if (!customStartDate || !customEndDate) {
          toast.error('Please select both start and end dates for custom range');
          setLoading(false);
          return;
        }
        if (new Date(customStartDate) > new Date(customEndDate)) {
          toast.error('Start date must be before end date');
          setLoading(false);
          return;
        }
      }

      // Prepare export config with custom dates if applicable
      const exportPayload = {
        ...exportConfig,
        ...(exportConfig.timeRange === 'custom' && {
          customStartDate,
          customEndDate
        })
      };

      console.log('🚀 Starting export with config:', exportPayload);

      // Use centralized API instance
      const response = await api.post('/admin/export-data', exportPayload);

      if (response.data.success) {
        toast.success('Export job started successfully!');
        fetchExportJobs(); // Refresh the jobs list
      } else {
        toast.error(response.data.message || 'Failed to start export job');
      }
    } catch (error) {
      console.error('Error starting export:', error);
      toast.error('Failed to start export job');
    } finally {
      setLoading(false);
    }
  };

  const downloadExport = async (jobId: string) => {
    try {
      const token = getAccessToken();
      if (!token) return;

      // Use centralized API instance
      const response = await api.get(`/admin/export-jobs/${jobId}/download`, {
        responseType: 'blob'
      });
      if (response.data) {
        const blob = response.data;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_${jobId}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Download started!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to download export file');
      }
    } catch (error) {
      console.error('Error downloading export:', error);
      toast.error('Failed to download export file');
    }
  };

  const startFullDatabaseExport = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot export database.');
      return;
    }
    try {
      setFullDbLoading(true);
      const token = getAccessToken();
      if (!token) return;

      console.log('🗄️ Starting full database export...');

      const response = await api.post('/admin/export-full-database');

      if (response.data.success) {
        toast.success('Full database export started! This may take a few minutes.');
        fetchExportJobs(); // Refresh the jobs list
      } else {
        toast.error(response.data.message || 'Failed to start full database export');
      }
    } catch (error) {
      console.error('Error starting full database export:', error);
      toast.error('Failed to start full database export');
    } finally {
      setFullDbLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

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

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">📥 Data Export</h1>
          <p className="text-gray-600">Export your database data for backup and analysis</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Export Configuration */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Export Configuration</h3>
            
            <div className="space-y-4">
              {/* Time Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
                <select
                  value={exportConfig.timeRange}
                  onChange={(e) => setExportConfig({ ...exportConfig, timeRange: e.target.value })}
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  disabled={isViewerAdmin}
                >
                  <option value="1d">Last 1 Day</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="1y">Last Year</option>
                  <option value="all">All Time</option>
                  <option value="custom">Custom Range</option>
                </select>
                
                {/* Custom Date Range Inputs */}
                {exportConfig.timeRange === 'custom' && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required={exportConfig.timeRange === 'custom'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required={exportConfig.timeRange === 'custom'}
                        min={customStartDate}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Data Types */}
              <div>
                {(() => {
                  const dataTypesList = [
                    // Core User Data
                    { value: 'users', label: '👥 Users & Profiles (All User Types)' },
                    { value: 'employees', label: '👷 Employees & Delivery Personnel' },
                    { value: 'doctors', label: '👨‍⚕️ Doctors & Clinics' },
                    { value: 'badges', label: '🎖️ User Badges & Achievements' },
                    
                    // Orders & Delivery
                    { value: 'orders', label: '🛒 Orders & Payments' },
                    { value: 'delivery_tracking', label: '🚚 Delivery Tracking & Status' },
                    { value: 'payfast_itn', label: '💳 PayFast Payment Records (ITN)' },
                    
                    // Products & Inventory
                    { value: 'products', label: '📦 Products & Inventory' },
                    
                    // Research & Academic
                    { value: 'research_papers', label: '📚 Research Papers' },
                    { value: 'research_reports', label: '📋 Research Reports & Moderation' },
                    { value: 'research_views', label: '👁️ Research Paper Views' },
                    { value: 'research_upvotes', label: '👍 Research Paper Upvotes' },
                    { value: 'research_benefits', label: '🎁 Research Benefits & Rewards' },
                    { value: 'research_benefit_configs', label: '⚙️ Research Benefit Configurations' },
                    { value: 'research_reward_eligibility', label: '🎯 Research Reward Eligibility' },
                    { value: 'research_settings', label: '⚙️ Research Settings' },
                    
                    // Leaderboard & Tiers
                    { value: 'leaderboard', label: '🏆 Leaderboard Data & Snapshots' },
                    { value: 'tier_configs', label: '⚙️ Tier Configurations' },
                    { value: 'hall_of_pride', label: '🏅 Hall of Pride Entries' },
                    { value: 'certificates', label: '📜 Certificates & Achievements' },
                    
                    // Advertisements
                    { value: 'advertisements', label: '📺 Advertisements (Regular)' },
                    { value: 'video_advertisements', label: '🎬 Video Advertisements' },
                    { value: 'banner_advertisements', label: '🖼️ Banner Advertisements' },
                    { value: 'advertisement_applications', label: '📝 Advertisement Applications & Approvals' },
                    { value: 'advertisement_placements', label: '📍 Advertisement Placements' },
                    { value: 'advertisement_configs', label: '⚙️ Advertisement Area Configurations' },
                    { value: 'advertisement_pricing_configs', label: '💰 Advertisement Pricing Configurations' },
                    { value: 'advertisement_rotation_configs', label: '🔄 Advertisement Rotation Configurations' },
                    
                    // Admin & Permissions
                    { value: 'admin_permissions', label: '🔐 Admin Permissions & Access' },
                    { value: 'signup_ids', label: '🆔 Allowed Signup IDs' },
                    
                    // Financial & Debt
                    { value: 'user_wallets', label: '💰 User Wallets (Summary)' },
                    { value: 'user_wallets_full', label: '💳 User Wallets (Full Details)' },
                    { value: 'debt_management', label: '💸 Debt Management & Limits' },
                    { value: 'debt_thresholds', label: '📊 Debt Thresholds Configuration' },
                    
                    // Notifications & Communication
                    { value: 'notifications', label: '🔔 Notifications & Alerts' },
                    { value: 'gmail_messages', label: '📧 Gmail Sent Messages' },
                    { value: 'email_deliveries', label: '📬 Email Delivery Tracking' },
                    { value: 'auto_email_configs', label: '⚙️ Auto Email Configurations' },
                    { value: 'otp_codes', label: '🔐 OTP Codes (History)' },
                    { value: 'otp_configs', label: '⚙️ OTP Configuration Settings' },
                    
                    // Teams & Collaboration
                    { value: 'teams', label: '👥 Teams & Groups' },
                    { value: 'team_members', label: '👤 Team Members' },
                    { value: 'team_invitations', label: '📨 Team Invitations' },
                    { value: 'team_tier_configs', label: '⚙️ Team Tier Configurations' },
                    
                    // System & Configuration
                    { value: 'award_message_templates', label: '🏆 Award Message Templates' },
                    { value: 'ai_models', label: '🤖 AI Models Configuration' },
                    { value: 'api_tokens', label: '🔑 API Tokens & Keys' },
                    
                    // Analytics & Reports
                    { value: 'analytics', label: '📊 Analytics & Metrics' },
                    { value: 'user_activity', label: '📈 User Activity Logs' },
                    { value: 'order_statistics', label: '📉 Order Statistics & Trends' }
                  ];
                  
                  const allDataTypes = dataTypesList.map(t => t.value);
                  const allSelected = exportConfig.dataTypes.length === allDataTypes.length;
                  
                  return (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Data Types to Export</label>
                        <button
                          type="button"
                          onClick={() => {
                            if (allSelected) {
                              // Deselect all
                              setExportConfig({ ...exportConfig, dataTypes: [] });
                            } else {
                              // Select all
                              setExportConfig({ ...exportConfig, dataTypes: allDataTypes });
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {dataTypesList.map((type) => (
                    <label key={type.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportConfig.dataTypes.includes(type.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExportConfig({
                              ...exportConfig,
                              dataTypes: [...exportConfig.dataTypes, type.value]
                            });
                          } else {
                            setExportConfig({
                              ...exportConfig,
                              dataTypes: exportConfig.dataTypes.filter(t => t !== type.value)
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{type.label}</span>
                    </label>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Export Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                <select
                  value={exportConfig.format}
                  onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="csv">CSV (Excel Compatible)</option>
                  <option value="json">JSON (Structured Data)</option>
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="sql">SQL Dump</option>
                </select>
              </div>


              {/* Additional Options */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportConfig.includeMetadata}
                    onChange={(e) => setExportConfig({ ...exportConfig, includeMetadata: e.target.checked })}
                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isViewerAdmin}
                  />
                  <span className="ml-2 text-sm text-gray-700">Include metadata and timestamps</span>
                </label>
              </div>

              {/* Start Export Button */}
              <button
                onClick={startExport}
                disabled={loading || exportConfig.dataTypes.length === 0 || isViewerAdmin}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Starting Export...' : '🚀 Start Export'}
              </button>

              {/* Full Database Export Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-800 mb-3">🗄️ Complete Database Backup</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Export your entire database including all tables, data, and schema. 
                  This creates a complete backup that can be stored in Google Drive, 
                  local storage, or any cloud service for disaster recovery.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">⚠️ Important:</span> Full database export includes ALL data 
                    and may take several minutes for large databases. The export will include:
                  </p>
                  <ul className="text-xs text-yellow-700 mt-2 ml-4 list-disc">
                    <li>SQL files for each table (for database restore)</li>
                    <li>JSON files for programmatic access</li>
                    <li>Database schema definition</li>
                    <li>Restore instructions</li>
                  </ul>
                </div>
                <button
                  onClick={startFullDatabaseExport}
                  disabled={fullDbLoading || isViewerAdmin}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fullDbLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Starting Full Database Export...
                    </span>
                  ) : (
                    '🗄️ Export Entire Database'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Export Jobs History */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Export Jobs History</h3>
            
            {exportJobs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No export jobs yet</p>
            ) : (
              <div className="space-y-4">
                {exportJobs.map((job) => (
                  <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Export #{job.id.slice(-8)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Created: {formatDate(job.createdAt)}</div>
                      {job.completedAt && <div>Completed: {formatDate(job.completedAt)}</div>}
                      {job.fileSize && <div>Size: {formatFileSize(job.fileSize)}</div>}
                      {job.error && <div className="text-red-500">Error: {job.error}</div>}
                    </div>

                    {job.status === 'completed' && (
                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={() => downloadExport(job.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                        >
                          📥 Download
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Export Information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">ℹ️ Export Information</h3>
          <div className="text-blue-800 space-y-2">
            <p>• <strong>CSV Format:</strong> Best for Excel analysis and data manipulation</p>
            <p>• <strong>JSON Format:</strong> Best for programming and API integration</p>
            <p>• <strong>Excel Format:</strong> Best for business reporting and presentations</p>
            <p>• <strong>SQL Format:</strong> Best for database backup and migration</p>
            <p>• <strong>Large Exports:</strong> May take several minutes to process - you'll be notified when complete</p>
          </div>
        </div>

        {/* Full Database Backup Info */}
        <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">🗄️ Full Database Backup</h3>
          <div className="text-purple-800 space-y-2">
            <p>• <strong>Complete Backup:</strong> Exports ALL tables with data and schema</p>
            <p>• <strong>Disaster Recovery:</strong> Can restore your entire database from the backup</p>
            <p>• <strong>Storage Options:</strong> Download to local storage, upload to Google Drive, or any cloud storage</p>
            <p>• <strong>Includes:</strong> SQL dump files, JSON data, schema definition, and restore instructions</p>
            <p>• <strong>Recommended:</strong> Create regular backups (weekly/monthly) for data safety</p>
          </div>
        </div>
      </div>
    </div>
  );
}
