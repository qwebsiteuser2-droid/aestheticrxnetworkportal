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
  const isPopup = searchParams.get('popup') === 'true';
  const isSimulation = searchParams.get('simulation') === 'true';

  useEffect(() => {
    // Send payment confirmation immediately when page loads (ONLY ONCE)
    const sendPaymentConfirmation = async () => {
      const orderIds = searchParams.get('orderIds')?.split(',') || [];
      
      if (orderIds.length > 0) {
        // Check if we've already sent confirmation for these order IDs
        const confirmationKey = `payment_confirmed_${orderIds.join('_')}`;
        if (sessionStorage.getItem(confirmationKey)) {
          console.log('⏭️ Payment confirmation already sent for these orders, skipping...');
          return;
        }

        try {
          console.log('📧 Sending payment confirmation to backend...');
          console.log('   Order IDs:', orderIds);
          
          // Get token using the proper auth function
          const token = getAccessToken();
          
          if (!token) {
            console.error('❌ No authentication token found');
            toast.error('Authentication required. Please login again.');
            return;
          }
          
          console.log('🔐 Using token for payment confirmation');
          
          // Use centralized API instance
          console.log('🌐 Payment confirmation API URL');
          const response = await api.post('/payments/confirm-success', {
            orderIds: orderIds,
            paymentMethod: 'payfast_online'
          });

          if (response.data.success) {
            const data = response.data;
            console.log('✅ Payment confirmation sent to admins:', data);
            // Mark as sent to prevent duplicate calls
            sessionStorage.setItem(confirmationKey, 'true');
            toast.success('Payment confirmed! Admins have been notified.');
          } else {
            console.error('❌ Failed to send payment confirmation:', response.data);
            toast.error('Payment confirmed, but notification failed. Please contact support.');
          }
        } catch (error) {
          console.error('❌ Error sending payment confirmation:', error);
          toast.error('Payment confirmed, but notification failed. Please contact support.');
        }
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
  }, [isPopup, searchParams]);

  const handleBackToOrders = async () => {
    // Just navigate - confirmation was already sent in useEffect
    router.push('/order');
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
                Thank you for your payment. Your order has been confirmed and will be processed shortly.
                {isPopup && (
                  <span className="block mt-2 text-sm text-blue-600">
                    This window will close automatically in a few seconds.
                  </span>
                )}
              </>
            )}
          </p>

          {/* Order Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What happens next?</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium">Order Confirmed</p>
                  <p>We've received your payment and confirmed your order.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium">Processing</p>
                  <p>We're preparing your items for delivery.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium">Delivery</p>
                  <p>Your order will be delivered to your specified address.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleBackToOrders}
              className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Continue Shopping</span>
            </button>
          </div>

          {/* Support Information */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Need help?</strong> If you have any questions about your order, 
              please contact our support team or check your order status in your account.
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
