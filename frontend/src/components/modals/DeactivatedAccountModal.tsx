'use client';

import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface DeactivatedAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeactivatedAccountModal({ isOpen, onClose }: DeactivatedAccountModalProps) {
  if (!isOpen) return null;

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
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Account Deactivated
            </h3>

            {/* Message */}
            <div className="mt-4 text-sm text-gray-600 space-y-2">
              <p className="font-medium text-gray-900">
                Your account has been deactivated.
              </p>
              <p>
                You no longer have access to your account. All your data remains in the system, but you cannot log in or use the services.
              </p>
              <p className="mt-4 font-semibold text-gray-900">
                Please contact support for assistance.
              </p>
            </div>

            {/* Action Button */}
            <div className="mt-6">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
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

