'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { getApiUrl } from '@/lib/getApiUrl';

interface UnsubscribeData {
  userId: string;
  email: string;
  doctorName: string;
  isUnsubscribed: boolean;
  token: string;
}

export default function UnsubscribePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [data, setData] = useState<UnsubscribeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userId && token) {
      fetchUnsubscribeData();
    }
  }, [userId, token]);

  const fetchUnsubscribeData = async () => {
    try {
      setLoading(true);
      // Use centralized API instance
      const response = await api.get(`/unsubscribe/${userId}/${token}`);

      if (response.data.success) {
        const result = response.data;
        setData(result.data);
      } else {
        setError(result.message || 'Invalid unsubscribe link');
      }
    } catch (err: unknown) {
      setError('Failed to load unsubscribe page');
      console.error('Error fetching unsubscribe data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!userId || !token) return;

    try {
      setProcessing(true);
      // Use centralized API instance
      const response = await api.post(`/unsubscribe/${userId}/${token}`);

      if (response.data.success) {
        const result = response.data;
        setSuccess(true);
        setMessage(result.message || 'You have been successfully unsubscribed from marketing emails.');
        if (data) {
          setData({ ...data, isUnsubscribed: true });
        }
      } else {
        setError(result.message || 'Failed to unsubscribe');
      }
    } catch (err: unknown) {
      setError('Failed to process unsubscribe request');
      console.error('Error unsubscribing:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleResubscribe = async () => {
    if (!userId || !token) return;

    try {
      setProcessing(true);
      // Use centralized API instance
      const response = await api.post(`/unsubscribe/resubscribe/${userId}/${token}`);

      if (response.data.success) {
        const result = response.data;
        setSuccess(true);
        setMessage(result.message || 'You have been successfully resubscribed to marketing emails.');
        if (data) {
          setData({ ...data, isUnsubscribed: false });
        }
      } else {
        setError(result.message || 'Failed to resubscribe');
      }
    } catch (err: unknown) {
      setError('Failed to process resubscribe request');
      console.error('Error resubscribing:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircleIcon className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {success ? (
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Success!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {data?.isUnsubscribed ? 'Resubscribe to Emails' : 'Unsubscribe from Marketing Emails'}
              </h1>
              {data && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Email:</strong> {data.email}
                  </p>
                  {data.doctorName && (
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Name:</strong> {data.doctorName}
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                {data?.isUnsubscribed
                  ? 'You are currently unsubscribed from marketing emails. Click the button below to resubscribe and start receiving promotional emails again.'
                  : 'Are you sure you want to unsubscribe from marketing emails? You will no longer receive promotional emails, but you will still receive important transactional emails.'}
              </p>
              
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-900 mb-2">📧 You will still receive:</p>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Order confirmations and payment notifications</li>
                  <li>Tier advancement updates</li>
                  <li>Account approval and status updates</li>
                  <li>Delivery notifications</li>
                  <li>Advertisement status updates (when your ad goes live)</li>
                </ul>
                <p className="text-xs font-semibold text-blue-900 mt-3 mb-2">🚫 You will NOT receive:</p>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Promotional messages from admin</li>
                  <li>Automatic email campaigns</li>
                  <li>Marketing and advertising emails</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                {data?.isUnsubscribed ? (
                  <button
                    onClick={handleResubscribe}
                    disabled={processing}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {processing ? 'Processing...' : 'Resubscribe to Emails'}
                  </button>
                ) : (
                  <button
                    onClick={handleUnsubscribe}
                    disabled={processing}
                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {processing ? 'Processing...' : 'Unsubscribe'}
                  </button>
                )}
                <Link
                  href="/"
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors text-center font-medium"
                >
                  Cancel
                </Link>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                You can always resubscribe later using the link in any marketing email you receive.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

