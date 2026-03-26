'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { XMarkIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { getAccessToken } from '@/lib/auth';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

interface ContactAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  advertisementTitle?: string;
  advertisementId?: string;
}

export default function ContactAdminModal({ 
  isOpen, 
  onClose, 
  advertisementTitle = '',
  advertisementId = ''
}: ContactAdminModalProps) {
  const [formData, setFormData] = useState({
    subject: `Advertisement Application Inquiry - ${advertisementTitle}`,
    message: '',
    advertisementId: advertisementId
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.message.trim()) {
      toast.error('Please enter your message.');
      return;
    }

    setSubmitting(true);

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required. Please login again.');
        return;
      }

      // Use centralized API instance
      const response = await api.post('/contact-admin', formData);

      if (response.data.success) {
        toast.success('Message sent successfully! Admin will respond soon.');
        setFormData({
          subject: `Advertisement Application Inquiry - ${advertisementTitle}`,
          message: '',
          advertisementId: advertisementId
        });
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to send message.');
      }
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <EnvelopeIcon className="w-6 h-6 mr-2 text-blue-600" />
              Contact Admin
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-800 mb-2">💬 Need Help?</h3>
            <p className="text-sm text-blue-700">
              Have questions about your advertisement application? Our admin team is here to help. 
              Send us a message and we'll get back to you as soon as possible.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                rows={6}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Please describe your question or concern..."
                required
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-800 mb-2">📧 Direct Contact</h4>
            <p className="text-sm text-gray-600">
              You can also email us directly at:{' '}
              <a 
                href="mailto:asadkhanbloch4949@gmail.com" 
                className="text-blue-600 hover:text-blue-800 underline"
              >
                asadkhanbloch4949@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
