'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { toast } from 'react-hot-toast';
import { getAccessToken } from '@/lib/auth';
import { getApiUrl } from '@/lib/getApiUrl';
import { XMarkIcon, CalendarIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface AdvertisementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdvertisementModal({ isOpen, onClose }: AdvertisementModalProps) {
  const { user, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationType: 'days', // 'days' or 'hours'
    duration: 1,
    startDate: '',
    startTime: '',
    totalShows: 0,
    totalCost: 0
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && isOpen) {
      toast.error('You must be logged in to apply for an advertisement.');
      onClose();
    }
  }, [isAuthenticated, isOpen, onClose]);

  useEffect(() => {
    // Calculate total shows and cost
    const baseRate = 10; // PKR 10 per show
    const showsPerDay = 24; // Assuming 24 shows per day
    const showsPerHour = 1; // 1 show per hour
    
    let totalShows = 0;
    if (formData.durationType === 'days') {
      totalShows = formData.duration * showsPerDay;
    } else {
      totalShows = formData.duration * showsPerHour;
    }
    
    const totalCost = totalShows * baseRate;
    
    setFormData(prev => ({
      ...prev,
      totalShows,
      totalCost
    }));
  }, [formData.duration, formData.durationType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !user) {
      toast.error('You must be logged in to apply for an advertisement.');
      return;
    }

    if (!formData.title || !formData.startDate || !formData.startTime) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    
    try {
      const token = getAccessToken();
      
      console.log('Advertisement Modal - Token:', token ? 'exists' : 'missing');
      console.log('Advertisement Modal - API URL:', getApiUrl());
      
      if (!token) {
        toast.error('Authentication token not found. Please login again.');
        return;
      }
      
      // Calculate total shows and cost
      const baseRate = 10; // PKR 10 per show
      const calculatedTotalShows = formData.durationType === 'days' 
        ? formData.duration * 24 
        : formData.duration;
      const calculatedTotalCost = calculatedTotalShows * baseRate;

      const advertisementData = {
        title: formData.title,
        description: formData.description,
        duration_type: formData.durationType,
        duration: formData.duration,
        start_date: formData.startDate,
        start_time: formData.startTime,
        total_shows: calculatedTotalShows,
        total_cost: calculatedTotalCost,
        doctor_id: user?.id,
      };

      console.log('Advertisement Modal - Sending data:', advertisementData);

      const response = await fetch(`${getApiUrl()}/advertisements/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(advertisementData),
      });

      console.log('Advertisement Modal - Response status:', response.status);
      console.log('Advertisement Modal - Response headers:', response.headers);

      const result = await response.json();
      console.log('Advertisement Modal - Response data:', result);

      if (response.status === 401) {
        toast.error('Authentication failed. Please login again.');
        return;
      }

      if (result.success) {
        toast.success('Advertisement application submitted successfully! We will review and contact you soon.');
        onClose();
        // Reset form
        setFormData({
          title: '',
          description: '',
          durationType: 'days',
          duration: 1,
          startDate: '',
          startTime: '',
          totalShows: 0,
          totalCost: 0
        });
      } else {
        toast.error(result.message || 'Failed to submit advertisement application.');
      }
    } catch (err) {
      console.error('Error submitting advertisement:', err);
      toast.error('Network error or server is unreachable.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Apply for Paid Advertisement</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">Promote your clinic and services to our medical community. Grow with us through targeted advertising.</p>
        </div>

        <div className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Advertisement Title <span className="text-red-500">*</span> (Max 100 characters)
              </label>
              <input
                type="text"
                id="title"
                name="title"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.title}
                onChange={handleInputChange}
                required
                maxLength={100}
                placeholder="e.g., Premium Healthcare Services"
              />
              <p className="text-xs text-gray-500 mt-1">{formData.title?.length || 0}/100 characters</p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description (Max 500 characters)
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.description}
                onChange={handleInputChange}
                maxLength={500}
                placeholder="Describe your clinic, services, or special offers..."
              />
              <p className="text-xs text-gray-500 mt-1">{formData.description?.length || 0}/500 characters</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="durationType" className="block text-sm font-medium text-gray-700 mb-2">
                  Duration Type
                </label>
                <select
                  id="durationType"
                  name="durationType"
                  className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.durationType}
                  onChange={handleInputChange}
                >
                  <option value="days">Days</option>
                </select>
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Duration ({formData.durationType === 'days' ? 'Days' : 'Hours'}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="1"
                  max={formData.durationType === 'days' ? '30' : '24'}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Pricing Information */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
              <h3 className="text-lg font-medium text-blue-900 mb-3 flex items-center">
                <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                Pricing Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-700 font-medium">Base Rate</p>
                  <p className="text-blue-900 font-bold">PKR 10 per show</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Total Shows</p>
                  <p className="text-blue-900 font-bold">{formData.totalShows} shows</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Total Cost</p>
                  <p className="text-blue-900 font-bold text-lg">PKR {formData.totalCost}</p>
                </div>
              </div>
              <p className="text-blue-600 text-xs mt-2">
                * Shows are displayed every hour. {formData.durationType === 'days' ? '24 shows per day.' : '1 show per hour.'}
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-lg font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
