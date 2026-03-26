'use client';

import { ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface AdvertisementGuidelinesProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function AdvertisementGuidelines({ isOpen, onClose, onAccept }: AdvertisementGuidelinesProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 mr-2" />
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Advertisement Guidelines</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
            <div className="flex items-start">
              <InformationCircleIcon className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-yellow-900 mb-2">Important Notice</h3>
                <p className="text-sm text-yellow-700">
                  By submitting an advertisement, you acknowledge that you have read and agree to these guidelines. 
                  You are solely responsible for the content of your advertisement.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">✅ Allowed Content</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Promotional content for medical services, clinics, and healthcare facilities</li>
                <li>Educational content related to healthcare and medical practices</li>
                <li>Announcements for medical events, seminars, or workshops</li>
                <li>Information about new services, equipment, or facilities</li>
                <li>Professional medical practice advertisements</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">❌ Prohibited Content</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>Defamatory or harmful content</strong> that directly or indirectly harms other companies, clinics, or individuals</li>
                <li>False or misleading medical claims</li>
                <li>Content that violates medical ethics or professional standards</li>
                <li>Spam, phishing, or fraudulent content</li>
                <li>Content that violates intellectual property rights</li>
                <li>Illegal or inappropriate content</li>
                <li>Content that discriminates against any group or individual</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Content Requirements</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>Videos:</strong> Any length (auto-rotates every 5 seconds), Maximum 50MB file size, MP4, WebM, or MOV format</li>
                <li><strong>Images:</strong> Maximum 2MB, JPG or PNG format</li>
                <li><strong>Animations:</strong> Maximum 5MB, GIF format</li>
                <li>All content must be appropriate for a professional medical platform</li>
                <li>Content must comply with local advertising regulations</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">⚠️ Responsibility & Liability</h3>
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                <p className="text-sm text-red-800 font-medium mb-2">
                  <strong>You are posting this advertisement at your own conviction.</strong>
                </p>
                <p className="text-sm text-red-700">
                  We will not be held responsible for any content, claims, or consequences resulting from your advertisement. 
                  You are solely liable for:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-red-700">
                  <li>The accuracy and truthfulness of all information in your advertisement</li>
                  <li>Any legal consequences arising from your advertisement content</li>
                  <li>Any disputes or conflicts with other parties related to your advertisement</li>
                  <li>Compliance with all applicable laws and regulations</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">🔍 Review Process</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>All advertisements are subject to review by our admin team</li>
                <li>We reserve the right to reject, modify, or remove any advertisement that violates these guidelines</li>
                <li>Approved advertisements will be displayed in the selected placement area</li>
                <li>Advertisements will rotate with other ads in the same area</li>
                <li>You will be notified of approval or rejection via email</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">💳 Payment Terms</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Payment can be made via PayFast (online) or Cash on Delivery / End of Month</li>
                <li>Advertisements will only be activated after payment is confirmed</li>
                <li>Refunds are not available for approved and displayed advertisements</li>
                <li>Pricing is based on the selected area and duration</li>
              </ul>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 rounded-b-lg">
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                id="accept-guidelines"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                I have read and agree to the advertisement guidelines
              </span>
            </label>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const checkbox = document.getElementById('accept-guidelines') as HTMLInputElement;
                  if (checkbox?.checked) {
                    onAccept();
                  } else {
                    alert('Please accept the guidelines to continue');
                  }
                }}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

