'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, CurrencyDollarIcon, ClockIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { getAccessToken } from '@/lib/auth';
import { getApiUrl } from '@/lib/getApiUrl';

interface AdvertisementArea {
  id: string;
  area_name: string;
  display_name: string;
  description: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'all';
  position: string;
  dimensions: {
    width: number;
    height: number;
  };
  base_hourly_rate: number;
  max_concurrent_ads: number;
  current_active_ads: number;
  max_duration_seconds: number | null;
  allowed_formats: string[] | null;
  allowed_content_types: string[] | null;
  max_file_size_mb: number | null;
  preview_image_url?: string | null;
}

interface AdvertisementPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  area: AdvertisementArea | null;
  adType?: 'video' | 'image' | 'animation'; // Optional: defaults to 'video' if not provided
  onProceed: (data: {
    area: AdvertisementArea;
    durationType: 'hours' | 'days' | 'weeks';
    duration: number;
    totalCost: number;
    totalHours: number;
  }) => void;
}

export default function AdvertisementPricingModal({
  isOpen,
  onClose,
  area,
  adType = 'video', // Default to 'video' if not provided
  onProceed
}: AdvertisementPricingModalProps) {
  const [durationType, setDurationType] = useState<'hours' | 'days' | 'weeks'>('hours');
  const [duration, setDuration] = useState<number>(1);
  const [calculatedCost, setCalculatedCost] = useState<number>(0);
  const [calculatedHours, setCalculatedHours] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (area && isOpen) {
      calculateCost();
    }
  }, [area, durationType, duration, isOpen]);

  const calculateCost = async () => {
    if (!area) return;

    setLoading(true);
    try {
      const token = getAccessToken();
      
      const response = await fetch(`${getApiUrl()}/video-advertisements/calculate-cost`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          area_name: area.area_name,
          duration_type: durationType,
          duration_value: duration,
          ad_type: adType // Use the provided ad type (video, image, or animation)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCalculatedCost(parseFloat(data.data.total_cost));
          setCalculatedHours(data.data.duration_hours);
        }
      }
    } catch (error) {
      console.error('Error calculating cost:', error);
      // Fallback calculation
      let hours = 0;
      switch (durationType) {
        case 'hours':
          hours = duration;
          break;
        case 'days':
          hours = duration * 24;
          break;
        case 'weeks':
          hours = duration * 24 * 7;
          break;
      }
      const cost = hours * area.base_hourly_rate;
      setCalculatedCost(cost);
      setCalculatedHours(hours);
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (!area) return;
    
    onProceed({
      area,
      durationType,
      duration,
      totalCost: calculatedCost,
      totalHours: calculatedHours
    });
  };

  if (!isOpen || !area) return null;

  const maxDuration = durationType === 'hours' ? 168 : durationType === 'days' ? 30 : 4; // Max 1 week in hours, 30 days, 4 weeks

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Advertisement Pricing</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Selected: {area.display_name}</p>
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
          {/* Area Information */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
            <div className="flex items-start">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Area Details</h3>
                <div className="space-y-1 text-sm text-blue-700">
                  <p><span className="font-medium">Position:</span> {area.display_name}</p>
                  <p><span className="font-medium">Hourly Rate:</span> PKR {area.base_hourly_rate.toFixed(2)}</p>
                  <p><span className="font-medium">Available Slots:</span> {area.max_concurrent_ads - area.current_active_ads} of {area.max_concurrent_ads}</p>
                  {area.max_duration_seconds && (
                    <p><span className="font-medium">Max Video Duration:</span> {area.max_duration_seconds} seconds</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Duration Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ClockIcon className="w-4 h-4 inline mr-1" />
              Duration Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDurationType('hours')}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  durationType === 'hours'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                Hours
              </button>
              <button
                type="button"
                onClick={() => setDurationType('days')}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  durationType === 'days'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                Days
              </button>
              <button
                type="button"
                onClick={() => setDurationType('weeks')}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  durationType === 'weeks'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                Weeks
              </button>
            </div>
          </div>

          {/* Duration Value */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              Duration ({durationType === 'hours' ? 'Hours' : durationType === 'days' ? 'Days' : 'Weeks'}) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="duration"
              min="1"
              max={maxDuration}
              value={duration}
              onChange={(e) => setDuration(Math.max(1, Math.min(maxDuration, parseInt(e.target.value) || 1)))}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum: {maxDuration} {durationType}
            </p>
          </div>

          {/* Cost Calculation */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CurrencyDollarIcon className="w-5 h-5 mr-2 text-blue-600" />
              Pricing Summary
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Hourly Rate:</span>
                  <span className="font-medium text-gray-900">PKR {area.base_hourly_rate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Total Duration:</span>
                  <span className="font-medium text-gray-900">
                    {calculatedHours} {calculatedHours === 1 ? 'hour' : 'hours'}
                  </span>
                </div>
                <div className="border-t border-blue-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total Cost:</span>
                    <span className="text-2xl font-bold text-blue-600">PKR {calculatedCost.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-xs text-gray-600">
                    <strong>Note:</strong> Your advertisement will be displayed in a slideshow rotation with other ads in this area. 
                    The slideshow will automatically rotate every few seconds until your advertisement duration expires.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-lg font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProceed}
              disabled={loading || calculatedCost === 0}
              className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

