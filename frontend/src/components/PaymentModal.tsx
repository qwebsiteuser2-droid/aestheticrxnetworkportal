'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  orderNumber: string;
  orderTotal: number;
  currentPaid: number;
}

export function PaymentModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  orderNumber, 
  orderTotal, 
  currentPaid 
}: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const remainingAmount = orderTotal - currentPaid;

  useEffect(() => {
    if (isOpen) {
      setAmount('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || isNaN(Number(amount))) {
      toast.error('Please enter a valid amount');
      return;
    }

    const paymentAmount = Number(amount);
    
    if (paymentAmount < 0) {
      toast.error('Payment amount cannot be negative');
      return;
    }

    if (paymentAmount > remainingAmount) {
      toast.error(`Payment amount cannot exceed remaining amount of PKR ${remainingAmount.toLocaleString()}`);
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm(paymentAmount);
      onClose();
    } catch (error) {
      console.error('Payment confirmation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Partial Payment</h3>
                <p className="text-sm text-gray-500">Order {orderNumber}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Order Total:</span>
                  <p className="font-semibold text-gray-900">PKR {orderTotal.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Current Paid:</span>
                  <p className="font-semibold text-green-600">PKR {currentPaid.toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Remaining Amount:</span>
                  <p className="font-semibold text-orange-600">PKR {remainingAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="payment-amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">PKR</span>
                  </div>
                  <input
                    type="number"
                    id="payment-amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="block w-full pl-7 pr-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    placeholder="0.00"
                    min="0"
                    max={remainingAmount}
                    step="0.01"
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Enter amount between PKR 0 and PKR {remainingAmount.toLocaleString()}
                </p>
              </div>

              {/* Quick Amount Buttons */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Quick Amounts:</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '25%', value: remainingAmount * 0.25 },
                    { label: '50%', value: remainingAmount * 0.5 },
                    { label: '75%', value: remainingAmount * 0.75 },
                    { label: '100%', value: remainingAmount },
                    { label: 'PKR 100', value: Math.min(100, remainingAmount) },
                    { label: 'PKR 500', value: Math.min(500, remainingAmount) }
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setAmount(option.value.toFixed(2))}
                      disabled={isLoading || option.value <= 0}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !amount || Number(amount) <= 0}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    'Confirm Payment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
