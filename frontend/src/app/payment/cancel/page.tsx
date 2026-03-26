'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, XCircleIcon } from '@heroicons/react/24/outline';

function PaymentCancelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const isPopup = searchParams.get('popup') === 'true';

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // If this is a popup, close it after showing cancel message
      if (isPopup) {
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isPopup]);

  const handleBackToOrders = () => {
    router.push('/order');
  };

  const handleTryAgain = () => {
    router.push('/order');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Cancel Icon */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
            <XCircleIcon className="h-12 w-12 text-red-600" />
          </div>

          {/* Cancel Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Cancelled
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            Your payment was cancelled. No charges have been made to your account.
            {isPopup && (
              <span className="block mt-2 text-sm text-blue-600">
                This window will close automatically in a few seconds.
              </span>
            )}
          </p>

          {/* Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What happened?</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-yellow-600 text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="font-medium">Payment Cancelled</p>
                  <p>You chose to cancel the payment process or there was an issue with the payment.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-600 text-xs font-bold">✓</span>
                </div>
                <div>
                  <p className="font-medium">No Charges</p>
                  <p>No money has been deducted from your account.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">↻</span>
                </div>
                <div>
                  <p className="font-medium">Try Again</p>
                  <p>You can try the payment again or choose a different payment method.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleTryAgain}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Try Payment Again
            </button>
            
            <button
              onClick={handleBackToOrders}
              className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Back to Orders</span>
            </button>
          </div>

          {/* Support Information */}
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Having trouble?</strong> If you're experiencing payment issues, 
              you can also choose "Cash on Delivery" as an alternative payment method.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentCancelContent />
    </Suspense>
  );
}
