'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getAccessToken } from '@/lib/auth';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';
import DOMPurify from 'dompurify';
import AdvertisementPlacementPreview from './AdvertisementPlacementPreview';

interface AdvertisementArea {
  id: string;
  area_name: string;
  display_name: string;
  description: string;
  device_type: string;
  position: string;
  dimensions: {
    width: number;
    height: number;
  };
  base_hourly_rate: number;
  current_hourly_rate: number;
  max_file_size_mb: number;
  max_duration_seconds: number;
  allowed_formats: string[];
  allowed_content_types: string[];
}

interface CostCalculation {
  area_name: string;
  display_name: string;
  hourly_rate: number;
  duration_hours: number;
  total_cost: number;
  max_file_size_mb: number;
  max_duration_seconds: number;
  allowed_formats: string[];
}

interface VideoAdvertisementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoAdvertisementModal({ isOpen, onClose }: VideoAdvertisementModalProps) {
  const [areas, setAreas] = useState<AdvertisementArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [adType, setAdType] = useState<string>('video');
  const [durationType, setDurationType] = useState<string>('hours');
  const [durationValue, setDurationValue] = useState<number>(1);
  const [costCalculation, setCostCalculation] = useState<CostCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<{ message: string; suggestion: string; conflicts: any[] } | null>(null);
  const [waitInQueue, setWaitInQueue] = useState(false);
  const [conflictFormData, setConflictFormData] = useState<FormData | null>(null);
  
  // Form data - ensure all values are defined (not undefined) to avoid controlled/uncontrolled warnings
  const [formData, setFormData] = useState({
    title: '' as string,
    description: '' as string,
    content: '' as string,
    background_color: '#ffffff' as string,
    text_color: '#000000' as string,
    start_date: '' as string,
    start_time: '' as string,
    end_time: '' as string,
    payment_method: 'payfast' as string,
    is_quitable: true as boolean
  });

  // File uploads
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAdvertisementAreas();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedArea && adType && durationType && durationValue) {
      calculateCost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArea, adType, durationType, durationValue, formData.is_quitable]);

  const fetchAdvertisementAreas = async () => {
    setIsLoadingAreas(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Please login to view advertisement areas');
        setIsLoadingAreas(false);
        return;
      }
      
      // Use centralized API instance
      console.log('Fetching areas...');
      
      const response = await api.get('/video-advertisements/areas');
      
      if (response.data.success) {
        const data = response.data;
        const areasList = data.data || data || [];
        console.log('Loaded areas:', areasList.length);
        setAreas(areasList);
        if (areasList.length === 0) {
          toast.error('No advertisement areas available. Please contact admin.');
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to load areas:', response.status, response.statusText, errorData);
        toast.error(errorData.message || 'Failed to load advertisement areas');
      }
    } catch (error) {
      console.error('Error fetching advertisement areas:', error);
      toast.error('Failed to load advertisement areas. Please check your connection.');
    } finally {
      setIsLoadingAreas(false);
    }
  };

  const calculateCost = async () => {
    if (!selectedArea || !adType || !durationType || !durationValue) return;

    setIsCalculating(true);
    try {
      const token = getAccessToken();
      // Map duration type to duration unit
      const durationUnitMap: { [key: string]: string } = {
        'hours': 'hour',
        'days': 'day',
        'weeks': 'week',
        'HOURS': 'hour',
        'DAYS': 'day',
        'WEEKS': 'week'
      };
      const durationUnit = durationUnitMap[durationType] || durationType.toLowerCase();

      // Use centralized API instance
      const response = await api.post('/video-advertisements/calculate-cost', {
        // New parameters (preferred)
        placement_area: selectedArea,
        advertisement_type: adType,
        duration_unit: durationUnit,
        duration_value: durationValue,
        is_quitable: formData.is_quitable !== undefined ? formData.is_quitable : true,
        // Legacy parameters (for backward compatibility)
        area_name: selectedArea,
        duration_type: durationType,
        ad_type: adType
      });

      if (response.data.success) {
        const data = response.data;
        if (data.success && data.data) {
        setCostCalculation(data.data);
        } else {
          throw new Error(data.message || 'Failed to calculate cost');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to calculate cost:', response.status, errorData);
        const errorMessage = errorData.message || 'Failed to calculate cost';
        toast.error(errorMessage);
        setCostCalculation(null); // Clear cost calculation on error
      }
    } catch (error) {
      console.error('Error calculating cost:', error);
      toast.error('Failed to calculate cost. Please try again.');
      setCostCalculation(null); // Clear cost calculation on error
    } finally {
      setIsCalculating(false);
    }
  };

  // File size limits (in bytes) - matching backend limits
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB (matches backend)
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB for images (matches backend)
  const MAX_THUMBNAIL_SIZE = 1 * 1024 * 1024; // 1MB for thumbnails (matches backend)
  const MAX_ANIMATION_SIZE = 5 * 1024 * 1024; // 5MB for GIF animations (matches backend)
  // No duration restrictions - users can upload videos of any length
  // Auto-rotation handles display timing (default 5 seconds per ad)

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileChange = async (field: string, file: File | null) => {
    if (!file) {
      switch (field) {
        case 'video':
          setVideoFile(null);
          break;
        case 'thumbnail':
          setThumbnailFile(null);
          break;
        case 'image':
          setImageFile(null);
          break;
      }
      return;
    }

    // Validate file size
    let maxSize = MAX_IMAGE_SIZE;
    let fileTypeName = 'file';
    
    switch (field) {
      case 'video':
        maxSize = MAX_VIDEO_SIZE;
        fileTypeName = 'video';
        
        // Check video file size
        if (file.size > maxSize) {
          toast.error(
            `Video file is too large! Maximum size: ${formatFileSize(maxSize)}. Your file: ${formatFileSize(file.size)}`,
            { duration: 6000 }
          );
          return;
        }

        // No duration validation - accept videos of any length
        // Auto-rotation (default 5 seconds) will handle display timing
        setVideoFile(file);
        toast.success(`Video selected: ${file.name} (${formatFileSize(file.size)})`, { duration: 3000 });
        break;
        
      case 'thumbnail':
        maxSize = MAX_THUMBNAIL_SIZE;
        fileTypeName = 'thumbnail image';
        
        if (file.size > maxSize) {
          toast.error(
            `Thumbnail image is too large! Maximum size: ${formatFileSize(maxSize)}. Your file: ${formatFileSize(file.size)}`,
            { duration: 6000 }
          );
          return;
        }
        
        // Validate image type
        if (!file.type.startsWith('image/')) {
          toast.error('Thumbnail must be an image file (JPG, PNG, or GIF)', { duration: 5000 });
          return;
        }
        
        setThumbnailFile(file);
        toast.success(`Thumbnail selected: ${file.name} (${formatFileSize(file.size)})`, { duration: 3000 });
        break;
        
      case 'image':
        // Check if it's for animation or regular image
        if (adType === 'animation') {
          maxSize = MAX_ANIMATION_SIZE;
          fileTypeName = 'animation';
          
          if (file.size > maxSize) {
            toast.error(
              `Animation file is too large! Maximum size: ${formatFileSize(maxSize)}. Your file: ${formatFileSize(file.size)}`,
              { duration: 6000 }
            );
            return;
          }
          
          // Validate GIF format for animations
          if (file.type !== 'image/gif' && !file.name.toLowerCase().endsWith('.gif')) {
            toast.error('Animation must be a GIF file', { duration: 5000 });
            return;
          }
        } else {
          maxSize = MAX_IMAGE_SIZE;
          fileTypeName = 'image';
          
          if (file.size > maxSize) {
            toast.error(
              `Image file is too large! Maximum size: ${formatFileSize(maxSize)}. Your file: ${formatFileSize(file.size)}`,
              { duration: 6000 }
            );
            return;
          }
        }
        
        // Validate image type
        if (!file.type.startsWith('image/')) {
          toast.error('Please upload an image file (JPG, PNG, or GIF)', { duration: 5000 });
          return;
        }
        
        setImageFile(file);
        toast.success(`${fileTypeName === 'animation' ? 'Animation' : 'Image'} selected: ${file.name} (${formatFileSize(file.size)})`, { duration: 3000 });
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedArea || !costCalculation) {
      toast.error('Please select an advertisement area');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (adType === 'video' && !videoFile) {
      toast.error('Please upload a video file');
      return;
    }

    if (adType === 'image' && !imageFile) {
      toast.error('Please upload an image file');
      return;
    }

    if (adType === 'animation' && !imageFile) {
      toast.error('Please upload an animation file');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Please login to submit advertisement');
        return;
      }

      const formDataToSend = new FormData();
      
      // Add form fields (excluding start_date to avoid duplication)
      Object.entries(formData).forEach(([key, value]) => {
        // Skip start_date here - we'll add it explicitly below with proper default
        if (key === 'start_date') return;
        // Convert boolean to string for FormData
        const formValue = typeof value === 'boolean' ? String(value) : (value || '');
        formDataToSend.append(key, formValue);
      });
      
      // Add advertisement specific fields
      formDataToSend.append('type', adType);
      formDataToSend.append('selected_area', selectedArea);
      formDataToSend.append('duration_type', durationType);
      formDataToSend.append('duration_value', durationValue.toString());
      formDataToSend.append('total_cost', costCalculation.total_cost.toString());
      // Add start_date with proper default (only once)
      formDataToSend.append('start_date', formData.start_date || new Date().toISOString().split('T')[0]);

      // Add files with correct field names
      if (videoFile) formDataToSend.append('video_file', videoFile);
      if (thumbnailFile) formDataToSend.append('thumbnail', thumbnailFile);
      if (imageFile) {
        if (adType === 'image') {
          formDataToSend.append('image_file', imageFile);
        } else if (adType === 'animation') {
          formDataToSend.append('animation_file', imageFile);
        }
      }

      // Store form data in case we need to resubmit with wait_in_queue flag
      setConflictFormData(formDataToSend);

      // Use centralized API instance - FormData upload
      const response = await api.post('/video-advertisements/create', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = response.data;

      if (result.success) {
        // Handle PayFast payment integration
        if (formData.payment_method === 'payfast' && result.data.payment) {
          // PayFast payment - inject form and submit
          if (result.data.payment.paymentForm) {
            // Create a temporary form and submit it
            // SECURITY: Sanitize HTML before injecting to prevent XSS attacks
            const formDiv = document.createElement('div');
            formDiv.innerHTML = typeof window !== 'undefined' 
              ? DOMPurify.sanitize(result.data.payment.paymentForm, { 
                  ALLOWED_TAGS: ['form', 'input', 'button'],
                  ALLOWED_ATTR: ['name', 'value', 'type', 'action', 'method', 'id', 'class']
                })
              : result.data.payment.paymentForm;
            const form = formDiv.querySelector('form') as HTMLFormElement;
            if (form) {
              document.body.appendChild(form);
              form.submit();
              toast.success('Redirecting to payment...');
              onClose();
              resetForm();
              return;
            } else {
              toast.error('Payment form not available. Please contact support.');
            }
          } else if (result.data.payment_url) {
            window.location.href = result.data.payment_url;
            return;
          } else {
            toast.success('Advertisement created successfully! Redirecting to payment...');
            // Fallback: redirect to payment page
            window.location.href = `/payment?adId=${result.data.id}`;
            return;
          }
        } else {
          toast.success('Advertisement application submitted successfully! We will review and contact you for payment.');
          onClose();
          resetForm();
        }
      } else {
        // Check if it's a time slot conflict error
        if (result.details && result.details.conflicts) {
          setConflictData({
            message: result.message || 'Time slot conflict detected',
            suggestion: result.details.suggestion || 'Please select a different time slot.',
            conflicts: result.details.conflicts || []
          });
          setShowConflictModal(true);
        } else {
          toast.error(result.message || 'Failed to submit advertisement application.');
        }
      }
    } catch (error) {
      console.error('Error submitting advertisement:', error);
      toast.error('Network error or server is unreachable.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '' as string,
      description: '' as string,
      content: '' as string,
      background_color: '#ffffff' as string,
      text_color: '#000000' as string,
      start_date: '' as string,
      start_time: '' as string,
      end_time: '' as string,
      payment_method: 'payfast' as string,
      is_quitable: true as boolean
    });
    setSelectedArea('');
    setAdType('video');
    setDurationType('hours');
    setDurationValue(1);
    setVideoFile(null);
    setThumbnailFile(null);
    setImageFile(null);
    setCostCalculation(null);
    setConflictFormData(null);
    setWaitInQueue(false);
    setShowConflictModal(false);
    setConflictData(null);
  };

  const selectedAreaData = areas.find(area => area.area_name === selectedArea);

  if (!isOpen) return null;

  // Conflict Modal Component
  const ConflictModal = () => {
    if (!showConflictModal || !conflictData) return null;
    
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-gray-900 bg-opacity-75 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-auto animate-fade-in-up">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Time Slot Conflict</h3>
            </div>
            <button
              onClick={() => {
                setShowConflictModal(false);
                setConflictData(null);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-6 py-4">
            <p className="text-gray-700 mb-3">{conflictData.message}</p>
            <p className="text-sm text-gray-600 mb-4">{conflictData.suggestion}</p>
            {conflictData.conflicts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-sm font-medium text-red-800 mb-2">Conflicting Advertisements:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  {conflictData.conflicts.map((c: any, index: number) => (
                    <li key={index}>
                      {c.title} ({c.start || c.start_date} - {c.end || c.end_date})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Option:</strong> You can choose to wait in queue. Your advertisement will be submitted for admin review. After approval, if there's no capacity, it will automatically wait in queue and activate when space becomes available.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConflictModal(false);
                  setConflictData(null);
                  setConflictFormData(null);
                  setWaitInQueue(false);
                }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!conflictFormData) {
                    setShowConflictModal(false);
                    setConflictData(null);
                    return;
                  }
                  
                  // Add wait_in_queue flag to form data
                  conflictFormData.append('wait_in_queue', 'true');
                  
                  setIsSubmitting(true);
                  setShowConflictModal(false);
                  
                  try {
                    const token = getAccessToken();
                    if (!token) {
                      toast.error('Please login to submit advertisement');
                      setShowConflictModal(true);
                      setIsSubmitting(false);
                      return;
                    }
                    // Use centralized API instance - FormData upload
                    const response = await api.post('/video-advertisements/create', conflictFormData, {
                      headers: {
                        'Content-Type': 'multipart/form-data',
                      },
                    });

                    const result = response.data;

                    if (result.success) {
                      toast.success('Advertisement submitted successfully! It will be reviewed by admin. If approved and there\'s no capacity, it will automatically wait in queue until space becomes available.');
                      onClose();
                      resetForm();
                      setConflictFormData(null);
                      setWaitInQueue(false);
                    } else {
                      toast.error(result.message || 'Failed to submit advertisement application.');
                      setShowConflictModal(true); // Re-show modal if error
                    }
                  } catch (error) {
                    console.error('Error submitting advertisement:', error);
                    toast.error('Network error or server is unreachable.');
                    setShowConflictModal(true); // Re-show modal if error
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                ⏳ Wait in Queue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <ConflictModal />
      <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-auto animate-fade-in-up max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Apply for Paid Advertisement</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="mb-4">
            <p className="text-xs sm:text-sm text-gray-600">
              Promote your clinic and services to our medical community. Upload short videos (max 5 seconds) or images and select your preferred placement area.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Advertisement Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Advertisement Type</label>
              <select
                value={adType}
                onChange={(e) => setAdType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="video">Video</option>
                <option value="image">Image</option>
                <option value="animation">Animation (GIF)</option>
              </select>
            </div>

            {/* Advertisement Area Selection - Cards for Doctors */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">Choose Advertisement Area *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                {isLoadingAreas ? (
                  <div className="col-span-2 text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading available areas...</p>
                  </div>
                ) : areas.length === 0 ? (
                  <div className="col-span-2 text-center py-4">
                    <p className="text-sm text-red-600 mb-2">No advertisement areas available</p>
                    <p className="text-xs text-gray-500">Please contact admin to configure advertisement areas.</p>
                  </div>
                ) : (
                  areas.map((area) => (
                    <div
                      key={area.id}
                      onClick={() => setSelectedArea(area.area_name)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedArea === area.area_name
                          ? 'border-blue-600 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 text-sm">{area.display_name}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          selectedArea === area.area_name
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {selectedArea === area.area_name ? 'Selected' : 'Select'}
                        </span>
                      </div>
                      {area.description && (
                        <p className="text-xs text-gray-600 mb-2">{area.description}</p>
                      )}
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Position:</span>
                          <span className="font-medium">{area.position}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Size:</span>
                          <span className="font-medium">{area.dimensions.width} × {area.dimensions.height}px</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Rate:</span>
                          <span className="font-semibold text-blue-600">PKR {area.current_hourly_rate}/hr</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Device:</span>
                          <span className="font-medium capitalize">{area.device_type}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {selectedAreaData && (
                <p className="text-xs text-gray-500 mt-2">
                  {selectedAreaData.description} • {selectedAreaData.device_type} devices
                </p>
              )}
            </div>

            {/* Duration Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration Type</label>
              <select
                value={durationType || 'hours'}
                onChange={(e) => setDurationType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>

            {/* Duration Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration ({durationType || 'hours'})</label>
              <input
                type="number"
                min="1"
                value={durationValue || 1}
                onChange={(e) => setDurationValue(Number(e.target.value) || 1)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Title * (Max 100 characters)</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 100) {
                    setFormData({ ...formData, title: value || '' });
                  }
                }}
                maxLength={100}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter advertisement title"
                required
              />
              <p className="text-xs text-gray-500 mt-1">{formData.title?.length || 0}/100 characters</p>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description (Max 500 characters)</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 500) {
                    setFormData({ ...formData, description: value || '' });
                  }
                }}
                maxLength={500}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Describe your clinic, services, or special offers..."
              />
              <p className="text-xs text-gray-500 mt-1">{formData.description?.length || 0}/500 characters</p>
            </div>

            {/* Advertisement Type */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Advertisement Behavior</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="is_quitable"
                    value="true"
                    checked={formData.is_quitable === true}
                    onChange={(e) => setFormData({ ...formData, is_quitable: e.target.value === 'true' })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Quitable (Users can close)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="is_quitable"
                    value="false"
                    checked={formData.is_quitable === false}
                    onChange={(e) => setFormData({ ...formData, is_quitable: e.target.value === 'true' })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Persistent (Users cannot close)</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Quitable ads can be closed by users with an X button. Persistent ads remain visible until they expire.
              </p>
            </div>

            {/* File Uploads */}
            {adType === 'video' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">🎥 Video File *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={(e) => handleFileChange('video', e.target.files?.[0] || null)}
                    className="hidden"
                    id="video-upload"
                    // Removed 'required' to avoid "invalid form control" error for hidden inputs
                  />
                  <label htmlFor="video-upload" className="cursor-pointer">
                    <div className="text-4xl mb-2">🎥</div>
                    <p className="text-sm text-gray-600 mb-1">Click to upload video</p>
                    <p className="text-xs text-gray-500">
                      Max {formatFileSize(MAX_VIDEO_SIZE)}, MP4, WebM, or MOV format
                    </p>
                  </label>
                </div>
                {videoFile && (
                  <p className="text-sm text-green-600 mt-2">✅ {videoFile.name} selected</p>
                )}
              </div>
            )}

            {adType === 'image' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">🖼️ Image File *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={(e) => handleFileChange('image', e.target.files?.[0] || null)}
                    className="hidden"
                    id="image-upload"
                    // Removed 'required' to avoid "invalid form control" error for hidden inputs
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <div className="text-4xl mb-2">🖼️</div>
                    <p className="text-sm text-gray-600 mb-1">Click to upload image</p>
                    <p className="text-xs text-gray-500">
                      JPG, PNG, or GIF format, Max {formatFileSize(MAX_IMAGE_SIZE)}
                    </p>
                  </label>
                </div>
                {imageFile && (
                  <p className="text-sm text-green-600 mt-2">✅ {imageFile.name} selected</p>
                )}
              </div>
            )}

            {adType === 'animation' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">🎬 Animation File *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/gif"
                    onChange={(e) => handleFileChange('image', e.target.files?.[0] || null)}
                    className="hidden"
                    id="animation-upload"
                    // Removed 'required' to avoid "invalid form control" error for hidden inputs
                  />
                  <label htmlFor="animation-upload" className="cursor-pointer">
                    <div className="text-4xl mb-2">🎬</div>
                    <p className="text-sm text-gray-600 mb-1">Click to upload GIF animation</p>
                    <p className="text-xs text-gray-500">
                      GIF format only, Max {formatFileSize(MAX_ANIMATION_SIZE)}
                    </p>
                  </label>
                </div>
                {imageFile && (
                  <p className="text-sm text-green-600 mt-2">✅ {imageFile.name} selected</p>
                )}
              </div>
            )}

            {/* Thumbnail (for video) */}
            {adType === 'video' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail (Optional)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => handleFileChange('thumbnail', e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Custom thumbnail for your video (JPG or PNG)</p>
              </div>
            )}


            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
              <input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value || '' })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            {/* Payment Method - Enhanced for Doctors */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, payment_method: 'payfast' })}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    formData.payment_method === 'payfast'
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">💳</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      formData.payment_method === 'payfast'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {formData.payment_method === 'payfast' ? 'Selected' : 'Select'}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">PayFast Online</h4>
                  <p className="text-xs text-gray-600">Secure online payment via PayFast gateway</p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, payment_method: 'cash' })}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    formData.payment_method === 'cash'
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">💵</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      formData.payment_method === 'cash'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {formData.payment_method === 'cash' ? 'Selected' : 'Select'}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">Cash on Delivery</h4>
                  <p className="text-xs text-gray-600">Pay when advertisement starts</p>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formData.payment_method === 'payfast' 
                  ? 'You will be redirected to PayFast for secure payment processing'
                  : 'Payment will be collected when your advertisement goes live'}
              </p>
            </div>
          </div>

          {/* Pricing Information */}
          {/* Placement Preview */}
          {selectedArea && (
            <div className="mt-6">
              <AdvertisementPlacementPreview selectedArea={selectedArea} />
            </div>
          )}

          {costCalculation && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-lg font-medium text-blue-900 mb-3">💰 Pricing Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Base Rate:</span>
                  <p className="text-blue-700">PKR {costCalculation.hourly_rate} per hour</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Duration:</span>
                  <p className="text-blue-700">{costCalculation.duration_hours} hours</p>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-blue-800">Total Cost:</span>
                  <p className="text-lg font-bold text-blue-900">PKR {costCalculation.total_cost.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                * Shows are displayed every hour. {costCalculation.duration_hours} shows total.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 sm:px-6 py-2 sm:py-3 border border-transparent rounded-md shadow-sm text-sm sm:text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              disabled={isSubmitting || isCalculating || !selectedArea || !formData.title.trim() || (adType === 'video' && !videoFile) || (adType === 'image' && !imageFile) || (adType === 'animation' && !imageFile)}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : formData.payment_method === 'payfast' ? (
                <>
                  <span>💳</span>
                  <span>Proceed to Payment</span>
                </>
              ) : (
                <>
                  <span>📝</span>
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
