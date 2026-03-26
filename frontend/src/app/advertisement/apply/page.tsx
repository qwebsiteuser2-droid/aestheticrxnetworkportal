'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

export default function ApplyAdvertisementPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

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
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Allow any authenticated user to create advertisements
  }, [authLoading, isAuthenticated, user, router]);

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
      router.push('/login');
      return;
    }

    if (!formData.title || !formData.startDate || !formData.startTime) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = getApiUrl();
      
      const advertisementData = {
        title: formData.title,
        description: formData.description,
        duration_type: formData.durationType,
        duration: formData.duration,
        start_date: formData.startDate,
        start_time: formData.startTime,
        total_shows: formData.totalShows,
        total_cost: formData.totalCost,
        base_rate: 10
      };

      // Use centralized API instance
      const response = await api.post('/advertisements/apply', advertisementData);

      if (response.data.success) {
        const result = response.data;
        toast.success('Advertisement application submitted successfully! We will review and contact you soon.');
        router.push('/');
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

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6 sm:p-8 border border-gray-200">
        <div className="mb-6">
          <button onClick={() => router.back()} className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back
          </button>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Apply for Advertisement</h1>
        <p className="text-gray-600 mb-8">Promote your clinic and services to our medical community. Fill out the form below to submit your advertisement application.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Advertisement Title <span className="text-red-500">*</span>
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
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
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
                <option value="hours">Hours</option>
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Advertisement Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
