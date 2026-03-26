'use client';

import { ExclamationTriangleIcon, XMarkIcon, TrophyIcon } from '@heroicons/react/24/outline';

interface TierRestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredTier: string;
  currentTier: string;
}

export default function TierRestrictionModal({ 
  isOpen, 
  onClose, 
  requiredTier,
  currentTier
}: TierRestrictionModalProps) {
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
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 text-yellow-600 mb-4">
              <ExclamationTriangleIcon className="h-10 w-10" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Tier Requirement Not Met
            </h3>

            {/* Message */}
            <div className="mt-4 text-sm text-gray-600 space-y-3">
              <p className="text-base">
                You need to reach <span className="font-semibold text-primary-600">{requiredTier}</span> rank or higher to approve research papers.
              </p>
              
              <div className="flex items-center justify-center gap-4 pt-2 pb-2 border-t border-b border-gray-200">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <TrophyIcon className="w-5 h-5 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-500">Current Rank</span>
                  </div>
                  <p className="font-semibold text-gray-700">{currentTier}</p>
                </div>
                
                <div className="text-gray-300">→</div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <TrophyIcon className="w-5 h-5 text-primary-600 mr-1" />
                    <span className="text-xs text-gray-500">Required Rank</span>
                  </div>
                  <p className="font-semibold text-primary-600">{requiredTier}</p>
                </div>
              </div>

              <p className="text-gray-500 text-sm pt-2">
                Continue making sales and orders to progress to the required tier.
              </p>
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

