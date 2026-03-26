'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { getAccessToken } from '@/lib/auth';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [advertisement, setAdvertisement] = useState<any>(null);
  const adId = searchParams.get('adId');
  const isPopup = searchParams.get('popup') === 'true';
  const isSimulation = searchParams.get('simulation') === 'true';

  useEffect(() => {
    // Send payment confirmation immediately when page loads (ONLY ONCE)
    const sendPaymentConfirmation = async () => {
      if (!adId) {
        console.warn('No advertisement ID found in URL');
        setIsLoading(false);
        return;
      }

      // Check if we've already sent confirmation for this ad ID
      const confirmationKey = `ad_payment_confirmed_${adId}`;
      if (sessionStorage.getItem(confirmationKey)) {
        console.log('⏭️ Payment confirmation already sent for this advertisement, skipping...');
        // Still fetch ad details
        await fetchAdvertisementDetails();
        return;
      }

      try {
        console.log('📧 Sending payment confirmation to backend...');
        console.log('   Advertisement ID:', adId);
        
        // Get token using the proper auth function
        const token = getAccessToken();
        
        if (!token) {
          console.error('❌ No authentication token found');
          toast.error('Authentication required. Please login again.');
          setIsLoading(false);
          return;
        }
        
        console.log('🔐 Using token for payment confirmation');
        
        // Use centralized API instance
        const response = await api.post(`/video-advertisements/${adId}/confirm-payment`, {
          adId: adId,
          paymentMethod: 'payfast_online'
        });

        if (response.data.success) {
          const data = response.data;
          console.log('✅ Payment confirmation sent:', data);
          // Mark as sent to prevent duplicate calls
          sessionStorage.setItem(confirmationKey, 'true');
          toast.success('Payment confirmed! Your advertisement will be reviewed and activated shortly.');
          
          // Fetch advertisement details
          if (data.data?.advertisement) {
            setAdvertisement(data.data.advertisement);
          } else {
            await fetchAdvertisementDetails();
          }
        } else {
          const error = response.data;
          console.error('❌ Failed to send payment confirmation:', error);
          toast.error('Payment confirmed, but notification failed. Please contact support.');
          await fetchAdvertisementDetails();
        }
      } catch (error) {
        console.error('❌ Error sending payment confirmation:', error);
        toast.error('Payment confirmed, but notification failed. Please contact support.');
        await fetchAdvertisementDetails();
      }
    };

    const fetchAdvertisementDetails = async () => {
      if (!adId) return;
      
      try {
        const token = getAccessToken();
        if (!token) return;

        // Use centralized API instance
        const response = await api.get(`/video-advertisements/${adId}`);

        if (response.data.success) {
          const data = response.data;
          if (data.success && data.data) {
            setAdvertisement(data.data);
          }
        }
      } catch (error) {
        console.error('Error fetching advertisement details:', error);
      }
    };

    // Send confirmation immediately (only once per session)
    sendPaymentConfirmation();

    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // If this is a popup, close it after showing success message
      if (isPopup) {
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [adId, isPopup]);

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleViewAdvertisements = () => {
    router.push('/advertisement/my-advertisements');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {isSimulation ? 'Payment Simulation Successful!' : 'Payment Successful!'}
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            {isSimulation ? (
              <>
                This was a payment simulation for testing purposes. In production, this would process the actual PayFast payment.
                <span className="block mt-2 text-sm text-blue-600">
                  For real payments, use Cash on Delivery or contact support.
                </span>
              </>
            ) : (
              <>
                Thank you for your payment. Your advertisement has been confirmed and will be reviewed shortly.
                {isPopup && (
                  <span className="block mt-2 text-sm text-blue-600">
                    This window will close automatically in a few seconds.
                  </span>
                )}
              </>
            )}
          </p>

          {/* Advertisement Details */}
          {advertisement && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Advertisement Details</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span className="font-medium">Title:</span>
                  <span>{advertisement.title}</span>
                </div>
                {advertisement.total_cost && (
                  <div className="flex justify-between">
                    <span className="font-medium">Amount Paid:</span>
                    <span className="font-semibold text-green-600">PKR {parseFloat(advertisement.total_cost).toLocaleString()}</span>
                  </div>
                )}
                {advertisement.payment_status && (
                  <div className="flex justify-between">
                    <span className="font-medium">Payment Status:</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      advertisement.payment_status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {advertisement.payment_status.toUpperCase()}
                    </span>
                  </div>
                )}
                {advertisement.status && (
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      advertisement.status === 'approved' || advertisement.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : advertisement.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {advertisement.status.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* What happens next */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What happens next?</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium">Payment Confirmed</p>
                  <p>We've received your payment and confirmed your advertisement.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium">Review & Approval</p>
                  <p>Our team will review your advertisement content and approve it.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium">Go Live</p>
                  <p>Your advertisement will go live on the scheduled start date.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleBackToHome}
              className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Back to Home</span>
            </button>
          </div>

          {/* Support Information */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Need help?</strong> If you have any questions about your advertisement, 
              please contact our support team or check your advertisement status in your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

