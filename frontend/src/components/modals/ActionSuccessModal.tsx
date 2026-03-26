'use client';

import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ActionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'delete' | 'deactivate' | 'reactivate';
}

export default function ActionSuccessModal({ 
  isOpen, 
  onClose, 
  title, 
  message,
  type = 'delete'
}: ActionSuccessModalProps) {
  if (!isOpen) return null;

  const getIconColor = () => {
    switch (type) {
      case 'delete':
        return 'bg-red-100 text-red-600';
      case 'deactivate':
        return 'bg-yellow-100 text-yellow-600';
      case 'reactivate':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-blue-100 text-blue-600';
    }
  };

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
            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full ${getIconColor()} mb-4`}>
              <CheckCircleIcon className="h-8 w-8" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {title}
            </h3>

            {/* Message */}
            <div className="mt-4 text-sm text-gray-600">
              <p>{message}</p>
            </div>

            {/* Action Button */}
            <div className="mt-6">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

