'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { getAccessToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { getApiUrl } from '@/lib/getApiUrl';
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline';

interface EmailStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  pending: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

interface EmailStatsByType {
  marketing: EmailStats;
  transactional: EmailStats;
  campaign: EmailStats;
  otp: EmailStats;
}

interface RecentEmail {
  id: string;
  recipientEmail: string;
  subject: string;
  status: string;
  emailType: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  errorMessage?: string;
  retryCount: number;
  isOpened: boolean;
  isClicked: boolean;
  createdAt: string;
  orderNumber?: string; // Order number for order-related emails
}

interface FailedEmail {
  id: string;
  recipientEmail: string;
  subject: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
}

interface EmailMonitoringData {
  overall: EmailStats;
  byType: EmailStatsByType;
  recentEmails: RecentEmail[];
  failedEmails: FailedEmail[];
}

// Create empty data structure with zeros
const createEmptyData = (): EmailMonitoringData => {
  const emptyStats: EmailStats = {
    total: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    bounced: 0,
    pending: 0,
    opened: 0,
    clicked: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
  };

  return {
    overall: emptyStats,
    byType: {
      marketing: emptyStats,
      transactional: emptyStats,
      campaign: emptyStats,
      otp: emptyStats,
    },
    recentEmails: [],
    failedEmails: [],
  };
};

export default function EmailAnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EmailMonitoringData | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [emailTypeFilter, setEmailTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user?.is_admin) {
      toast.error('Admin access required');
      router.push('/login');
      return;
    }

    fetchEmailStats();
  }, [authLoading, isAuthenticated, user, router, dateRange, emailTypeFilter]);

  const fetchEmailStats = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found');
        router.push('/login');
        return;
      }

      const apiUrl = getApiUrl();
      
      // Calculate date range
      let startDate: string | undefined;
      const endDate = new Date().toISOString();
      
      if (dateRange === '7d') {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === '30d') {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === '90d') {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      }

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (emailTypeFilter !== 'all') params.append('emailType', emailTypeFilter);

      const url = `${apiUrl}/admin/email-monitoring/stats?${params.toString()}`;
      console.log('📧 Fetching email stats from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📧 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('📧 Response data:', result);
        if (result.success && result.data) {
          console.log('✅ Setting email analytics data:', result.data);
          setData(result.data);
          toast.success('Email analytics data refreshed');
        } else {
          console.warn('⚠️ No data in response, showing empty data');
          setData(createEmptyData());
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Email monitoring API error:', response.status, errorText);
        toast.error(`Failed to fetch email analytics: ${response.status}`);
        setData(createEmptyData());
      }
    } catch (error) {
      console.error('❌ Error fetching email stats:', error);
      toast.error('Error fetching email analytics. Please try again.');
      setData(createEmptyData());
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'bounced':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'bounced':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading email analytics...</p>
        </div>
      </div>
    );
  }

  // Use empty data if no data available (show zeros instead of error)
  const displayData = data || createEmptyData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Email Analytics</h1>
              <p className="mt-2 text-gray-600">Monitor email sending and receiving statistics</p>
            </div>
            <button
              onClick={fetchEmailStats}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <ChartBarIcon className="w-5 h-5 mr-2" />
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Type</label>
              <select
                value={emailTypeFilter}
                onChange={(e) => setEmailTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="marketing">Marketing</option>
                <option value="transactional">Transactional</option>
                <option value="campaign">Campaign</option>
                <option value="otp">OTP</option>
              </select>
            </div>
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Emails</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{displayData.overall.total.toLocaleString()}</p>
              </div>
              <EnvelopeIcon className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{displayData.overall.delivered.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{displayData.overall.deliveryRate.toFixed(1)}% delivery rate</p>
              </div>
              <CheckCircleIcon className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Opened</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{displayData.overall.opened.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{displayData.overall.openRate.toFixed(1)}% open rate</p>
              </div>
              <EyeIcon className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clicked</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{displayData.overall.clicked.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{displayData.overall.clickRate.toFixed(1)}% click rate</p>
              </div>
              <CursorArrowRaysIcon className="w-12 h-12 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Status Breakdown</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Sent</span>
                <span className="font-semibold">{displayData.overall.sent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Delivered</span>
                <span className="font-semibold text-green-600">{displayData.overall.delivered.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Failed</span>
                <span className="font-semibold text-red-600">{displayData.overall.failed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Bounced</span>
                <span className="font-semibold text-yellow-600">{displayData.overall.bounced.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending</span>
                <span className="font-semibold text-gray-600">{displayData.overall.pending.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Statistics by Type */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Statistics by Type</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Marketing</span>
                  <span className="text-sm text-gray-600">{displayData.byType.marketing.total} emails</span>
                </div>
                <div className="text-xs text-gray-500">
                  {displayData.byType.marketing.deliveryRate.toFixed(1)}% delivered, {displayData.byType.marketing.openRate.toFixed(1)}% opened
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Transactional</span>
                  <span className="text-sm text-gray-600">{displayData.byType.transactional.total} emails</span>
                </div>
                <div className="text-xs text-gray-500">
                  {displayData.byType.transactional.deliveryRate.toFixed(1)}% delivered, {displayData.byType.transactional.openRate.toFixed(1)}% opened
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Campaign</span>
                  <span className="text-sm text-gray-600">{displayData.byType.campaign.total} emails</span>
                </div>
                <div className="text-xs text-gray-500">
                  {displayData.byType.campaign.deliveryRate.toFixed(1)}% delivered, {displayData.byType.campaign.openRate.toFixed(1)}% opened
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">OTP</span>
                  <span className="text-sm text-gray-600">{displayData.byType.otp.total} emails</span>
                </div>
                <div className="text-xs text-gray-500">
                  {displayData.byType.otp.deliveryRate.toFixed(1)}% delivered
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Emails */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Emails</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayData.recentEmails.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No recent emails found
                    </td>
                  </tr>
                ) : (
                  displayData.recentEmails.slice(0, 20).map((email) => (
                    <tr key={email.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {email.recipientEmail}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {email.subject}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {email.emailType}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {email.orderNumber ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            #{email.orderNumber}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(email.status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(email.status)}`}>
                            {email.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(email.sentAt || email.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          {email.isOpened && <EyeIcon className="w-4 h-4 text-blue-500" title="Opened" />}
                          {email.isClicked && <CursorArrowRaysIcon className="w-4 h-4 text-purple-500" title="Clicked" />}
                          {email.retryCount > 0 && (
                            <span className="text-xs text-gray-500" title={`Retried ${email.retryCount} times`}>
                              🔄 {email.retryCount}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Failed Emails */}
        {displayData.failedEmails.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Failed Emails (Needs Retry)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retry Count</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayData.failedEmails.map((email) => (
                    <tr key={email.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {email.recipientEmail}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {email.subject}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600 max-w-md truncate">
                        {email.errorMessage || 'Unknown error'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {email.retryCount}/3
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(email.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

