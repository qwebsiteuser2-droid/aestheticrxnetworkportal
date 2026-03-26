'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

export default function ResubscribePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userId && token) {
      handleResubscribe();
    }
  }, [userId, token]);

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
      } else {
        setError(result.message || 'Failed to resubscribe');
      }
    } catch (err: unknown) {
      setError('Failed to process resubscribe request');
      console.error('Error resubscribing:', err);
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  if (loading || processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {success ? (
          <>
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Successfully Resubscribed!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Homepage
            </Link>
          </>
        ) : (
          <>
            <XCircleIcon className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Resubscription Failed</h1>
            <p className="text-gray-600 mb-6">{error || 'Failed to resubscribe. The link may be invalid or expired.'}</p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Homepage
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

