'use client';

import { CalendarIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface MonthlyLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  limit?: number;
}

export default function MonthlyLimitModal({ 
  isOpen, 
  onClose, 
  message,
  limit
}: MonthlyLimitModalProps) {
  if (!isOpen) return null;

  // Extract limit from message if not provided
  const extractedLimit = limit || (message.match(/\d+/) ? parseInt(message.match(/\d+/)![0]) : null);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>

          <div className="text-center">
            {/* Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 text-orange-600 mb-4">
              <CalendarIcon className="h-10 w-10" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Monthly Submission Limit Reached
            </h3>

            {/* Message */}
            <div className="mt-4 text-sm text-gray-600 space-y-3">
              <div className="flex items-start justify-center gap-3 bg-orange-50 rounded-lg p-4">
                <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-base text-left text-gray-700">
                  {message}
                </p>
              </div>
              
              {extractedLimit && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <CalendarIcon className="w-5 h-5" />
                    <p className="text-sm">
                      Current limit: <span className="font-semibold text-gray-700">{extractedLimit} papers per month</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Good news:</strong> You can still edit and improve your existing research papers. 
                  The limit resets at the beginning of each month.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-6">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

