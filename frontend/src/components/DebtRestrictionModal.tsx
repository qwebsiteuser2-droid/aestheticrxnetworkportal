'use client';

import { useEffect } from 'react';
import { ExclamationTriangleIcon, CurrencyDollarIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface DebtRestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtStatus: {
    currentDebt: number;
    debtLimit: number;
    tierName: string;
    remainingLimit: number;
  };
}

export default function DebtRestrictionModal({ isOpen, onClose, debtStatus }: DebtRestrictionModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isZeroLimitConfig = debtStatus.debtLimit === 0 && debtStatus.currentDebt === 0;
  const overLimitAmount = Math.max(0, debtStatus.currentDebt - debtStatus.debtLimit);
  const debtPercentage = debtStatus.debtLimit > 0 
    ? Math.min(100, (debtStatus.currentDebt / debtStatus.debtLimit) * 100) 
    : 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 overflow-y-auto h-full w-full z-[100] flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-auto transform transition-all animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Header with Icon */}
        <div className={`bg-gradient-to-r ${isZeroLimitConfig ? 'from-orange-500 to-orange-600' : 'from-red-500 to-red-600'} rounded-t-2xl p-6 text-center`}>
          <div className={`flex items-center justify-center w-20 h-20 mx-auto bg-white rounded-full mb-4 shadow-lg`}>
            <ExclamationTriangleIcon className={`h-12 w-12 ${isZeroLimitConfig ? 'text-orange-600' : 'text-red-600'}`} />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {isZeroLimitConfig ? 'No Debt Limit Configured' : 'Debt Limit Reached'}
          </h2>
          <p className="text-white/80 mt-2 text-sm">
            {isZeroLimitConfig
              ? 'Your tier has no debt limit set'
              : 'Your order cannot be placed at this time'}
          </p>
        </div>

        <div className="p-6">
          {/* Tier Badge */}
          <div className="flex items-center justify-center mb-4">
            <span className="px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
              {debtStatus.tierName} Tier
            </span>
          </div>

          {/* Debt Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Debt Usage</span>
              <span className="font-semibold text-red-600">{debtPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-red-500 to-red-600"
                style={{ width: `${Math.min(100, debtPercentage)}%` }}
              />
            </div>
          </div>

          {/* Debt Summary */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 mb-5">
            <h3 className="font-semibold text-red-900 mb-3 flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 mr-2" />
              Outstanding Debt Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-red-200">
                <span className="text-red-700">Current Debt:</span>
                <span className="font-bold text-red-900 text-lg">
                  PKR {debtStatus.currentDebt.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-red-200">
                <span className="text-red-700">Debt Limit:</span>
                <span className="font-semibold text-red-800">
                  PKR {debtStatus.debtLimit.toLocaleString()}
                </span>
              </div>
              {overLimitAmount > 0 && (
                <div className="flex justify-between items-center pt-1 bg-red-100 -mx-2 px-3 py-2 rounded-lg">
                  <span className="text-red-700 font-medium">Over Limit By:</span>
                  <span className="font-bold text-red-600 text-lg">
                    PKR {overLimitAmount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* What to do */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <h4 className="font-semibold text-blue-900 mb-3">
              💡 What you need to do:
            </h4>
            {isZeroLimitConfig ? (
              <p className="text-sm text-blue-800">
                Your tier currently has <strong>no debt limit configured (PKR 0)</strong>. Please contact admin to have a debt limit assigned to your tier before placing orders.
              </p>
            ) : (
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span><strong>Pay outstanding debts</strong> to reduce your total debt below the limit</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span><strong>Contact admin</strong> if you need to request a temporary limit increase</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>Once your debt is below <strong>PKR {debtStatus.debtLimit.toLocaleString()}</strong>, you can place new orders</span>
                </li>
              </ul>
            )}
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-gray-600">
              Need help? Contact our support team for assistance with your account.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            autoFocus
            className="w-full px-6 py-4 text-base font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            I Understand - Close
          </button>
        </div>
      </div>
    </div>
  );
}
