'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import DOMPurify from 'dompurify';
import { ArrowLeftIcon, PhotoIcon, VideoCameraIcon, SparklesIcon, CreditCardIcon, BanknotesIcon, CalendarIcon } from '@heroicons/react/24/outline';
import AdvertisementAreaSelector from '@/components/AdvertisementAreaSelector';
import AdvertisementPricingModal from '@/components/AdvertisementPricingModal';
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

interface PricingData {
  area: AdvertisementArea;
  durationType: 'hours' | 'days' | 'weeks';
  duration: number;
  totalCost: number;
  totalHours: number;
}

type AdvertisementType = 'video' | 'image' | 'animation';
type PaymentMethod = 'payfast' | 'cash_on_delivery' | 'end_of_month';

export default function ApplyAdvertisementPageNew() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  // Step management
  const [currentStep, setCurrentStep] = useState<'area' | 'pricing' | 'upload' | 'payment'>('area');
  
  // Area selection
  const [selectedArea, setSelectedArea] = useState<AdvertisementArea | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingData, setPricingData] = useState<PricingData | null>(null);

  // Upload
  const [adType, setAdType] = useState<AdvertisementType>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    // Allow any authenticated user to create advertisements
  }, [authLoading, isAuthenticated, user, router]);

  const handleAreaSelect = (area: AdvertisementArea) => {
    setSelectedArea(area);
    setShowPricingModal(true);
  };

  const handlePricingProceed = (data: PricingData) => {
    setPricingData(data);
    setShowPricingModal(false);
    setCurrentStep('upload');
  };

  // File size limits (in bytes) - matching backend limits
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB (matches backend)
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB (matches backend)
  const MAX_ANIMATION_SIZE = 5 * 1024 * 1024; // 5MB (matches backend)
  // No duration restrictions - users can upload videos of any length
  // Auto-rotation handles display timing (default 5 seconds per ad)

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const fileType = selectedFile.type;
    const fileName = selectedFile.name.toLowerCase();
    const fileExtension = fileName.split('.').pop();

    if (adType === 'video') {
      if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(fileType) && !['mp4', 'webm', 'mov'].includes(fileExtension || '')) {
        toast.error('Please upload a video file (MP4, WebM, or MOV)');
        return;
      }
      
      // Check file size
      if (selectedFile.size > MAX_VIDEO_SIZE) {
        toast.error(
          `Video file is too large! Maximum size: ${formatFileSize(MAX_VIDEO_SIZE)}. Your file: ${formatFileSize(selectedFile.size)}`,
          { duration: 6000 }
        );
        return;
      }
      
      // No duration validation - accept videos of any length
      // Auto-rotation (default 5 seconds) will handle display timing
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
      toast.success(`Video selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`, { duration: 3000 });
    } else if (adType === 'image') {
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(fileType) && !['jpg', 'jpeg', 'png'].includes(fileExtension || '')) {
        toast.error('Please upload an image file (JPG or PNG)');
        return;
      }
      
      // Check file size
      if (selectedFile.size > MAX_IMAGE_SIZE) {
        toast.error(
          `Image file is too large! Maximum size: ${formatFileSize(MAX_IMAGE_SIZE)}. Your file: ${formatFileSize(selectedFile.size)}`,
          { duration: 6000 }
        );
        return;
      }
      
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
      toast.success(`Image selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`, { duration: 3000 });
    } else if (adType === 'animation') {
      if (!['image/gif'].includes(fileType) && !['gif'].includes(fileExtension || '')) {
        toast.error('Please upload a GIF animation file');
        return;
      }
      
      // Check file size
      if (selectedFile.size > MAX_ANIMATION_SIZE) {
        toast.error(
          `Animation file is too large! Maximum size: ${formatFileSize(MAX_ANIMATION_SIZE)}. Your file: ${formatFileSize(selectedFile.size)}`,
          { duration: 6000 }
        );
        return;
      }
      
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
      toast.success(`Animation selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`, { duration: 3000 });
    }
  };

  const handleSubmit = async () => {
    if (!pricingData || !file || !title || !paymentMethod) {
      toast.error('Please complete all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const token = getAccessToken();
      const apiUrl = getApiUrl();
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description || '');
      formData.append('type', adType);
      formData.append('selected_area', pricingData.area.area_name);
      formData.append('duration_type', pricingData.durationType);
      formData.append('duration_value', pricingData.duration.toString());
      formData.append('total_cost', pricingData.totalCost.toString());
      formData.append('payment_method', paymentMethod);
      formData.append('start_date', new Date().toISOString().split('T')[0]); // Today's date
      formData.append('is_quitable', 'true'); // Default to quitable
      
      // Append file based on type
      if (adType === 'video') {
        formData.append('video_file', file);
      } else if (adType === 'image') {
        formData.append('image_file', file);
      } else if (adType === 'animation') {
        formData.append('animation_file', file);
      }

      console.log('📤 Submitting advertisement to:', `${apiUrl}/video-advertisements/create`);
      console.log('📤 FormData entries:', Array.from(formData.entries()).map(([key]) => key));
      console.log('📤 Token present:', !!token);
      
      // Use centralized API instance
      // Note: For FormData, we need to use the api instance with proper headers
      const response = await api.post('/video-advertisements/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response success:', response.data.success);
      
      if (!response.data.success) {
        const errorData = response.data;
        const errorMessage = errorData.message || `Server error: ${response.status}`;
        console.error('❌ API Error Response:', errorData);
        toast.error(errorMessage);
        return;
      }

      const result = response.data;
      console.log('✅ API Response:', result);

      if (result.success) {
        if (paymentMethod === 'payfast' && result.data.payment) {
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
            } else {
              toast.error('Payment form not available. Please contact support.');
            }
          } else if (result.data.payment_url) {
            window.location.href = result.data.payment_url;
          } else {
            toast.success('Advertisement created successfully! Redirecting to payment...');
            // Fallback: redirect to payment page
            router.push(`/payment?adId=${result.data.id}`);
          }
        } else {
          toast.success('Advertisement application submitted successfully! We will review and contact you for payment.');
          router.push('/');
        }
      } else {
        // Check if it's a time slot conflict error
        if (result.details && result.details.conflicts) {
          const conflictMessage = `${result.message}\n\n${result.details.suggestion}\n\nConflicting advertisements:\n${result.details.conflicts.map((c: any) => `• ${c.title} (${c.start} - ${c.end})`).join('\n')}`;
          toast.error(conflictMessage, {
            duration: 8000,
            style: {
              whiteSpace: 'pre-line',
              maxWidth: '500px'
            }
          });
        } else {
          toast.error(result.message || 'Failed to submit advertisement application.');
        }
      }
    } catch (err: any) {
      console.error('❌ Network/Fetch Error:', err);
      console.error('❌ Error type:', err?.constructor?.name);
      console.error('❌ Error message:', err?.message);
      console.error('❌ Error stack:', err?.stack);
      
      let errorMessage = 'Network error or server is unreachable.';
      
      if (err?.message) {
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = `Cannot connect to server. Please check:\n• Your internet connection\n• Server is running at ${apiUrl}\n• Firewall allows connections`;
        } else if (err.message.includes('CORS')) {
          errorMessage = 'CORS error: Server may not allow requests from this origin.';
        } else {
          errorMessage = `Error: ${err.message}`;
        }
      }
      
      toast.error(errorMessage, {
        duration: 6000,
        style: {
          whiteSpace: 'pre-line',
          maxWidth: '400px'
        }
      });
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => router.back()} 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Apply for Paid Advertisement</h1>
          <p className="text-gray-600 mt-2">
            Promote your clinic and services to our medical community. Choose your placement area, upload your content, and select payment method.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { key: 'area', label: 'Select Area', step: 1 },
              { key: 'upload', label: 'Upload Content', step: 2 },
              { key: 'payment', label: 'Payment', step: 3 }
            ].map((step, index) => (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep === step.key || (step.key === 'upload' && pricingData) || (step.key === 'payment' && file)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.step}
                  </div>
                  <span className={`mt-2 text-sm font-medium ${
                    currentStep === step.key || (step.key === 'upload' && pricingData) || (step.key === 'payment' && file)
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < 2 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    (step.key === 'area' && pricingData) || (step.key === 'upload' && file)
                      ? 'bg-blue-600'
                      : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Area Selection */}
        {currentStep === 'area' && (
          <AdvertisementAreaSelector
            onAreaSelect={handleAreaSelect}
            selectedArea={selectedArea}
          />
        )}

        {/* Step 2: Upload Content */}
        {currentStep === 'upload' && pricingData && (
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Your Advertisement</h2>

            {/* Advertisement Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Advertisement Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setAdType('video');
                    setFile(null);
                    setFilePreview(null);
                  }}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    adType === 'video'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <VideoCameraIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <div className="text-sm font-medium">Video</div>
                  <div className="text-xs text-gray-500 mt-1">Max 100MB</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdType('image');
                    setFile(null);
                    setFilePreview(null);
                  }}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    adType === 'image'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <PhotoIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <div className="text-sm font-medium">Image</div>
                  <div className="text-xs text-gray-500 mt-1">JPG or PNG</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdType('animation');
                    setFile(null);
                    setFilePreview(null);
                  }}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    adType === 'animation'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <div className="text-sm font-medium">Animation</div>
                  <div className="text-xs text-gray-500 mt-1">GIF format</div>
                </button>
              </div>
            </div>

            {/* Title and Description */}
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Advertisement Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
                maxLength={100}
                placeholder="e.g., Premium Healthcare Services"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                maxLength={500}
                placeholder="Describe your clinic, services, or special offers..."
              />
            </div>

            {/* File Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {adType === 'video' ? 'Video File' : adType === 'image' ? 'Image File' : 'Animation File'} <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
                <div className="space-y-1 text-center">
                  {filePreview ? (
                    <div className="mt-2">
                      {adType === 'video' ? (
                        <video src={filePreview} controls className="max-w-full max-h-64 rounded-lg" />
                      ) : (
                        <img src={filePreview} alt="Preview" className="max-w-full max-h-64 rounded-lg mx-auto" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setFilePreview(null);
                        }}
                        className="mt-2 text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      {adType === 'video' ? (
                        <VideoCameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                      ) : (
                        <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                      )}
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept={
                              adType === 'video' ? 'video/mp4,video/webm,video/quicktime' :
                              adType === 'image' ? 'image/jpeg,image/png,image/jpg' :
                              'image/gif'
                            }
                            onChange={handleFileChange}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {adType === 'video' ? `MP4, WebM (any length), Max ${formatFileSize(MAX_VIDEO_SIZE)}` :
                         adType === 'image' ? `PNG, JPG up to ${formatFileSize(MAX_IMAGE_SIZE)}` :
                         `GIF animation up to ${formatFileSize(MAX_ANIMATION_SIZE)}`}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md mb-6">
              <h3 className="text-lg font-medium text-blue-900 mb-3">Pricing Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-700 font-medium">Area</p>
                  <p className="text-blue-900 font-bold">{pricingData.area.display_name}</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Duration</p>
                  <p className="text-blue-900 font-bold">{pricingData.duration} {pricingData.durationType}</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Total Cost</p>
                  <p className="text-blue-900 font-bold text-lg">PKR {pricingData.totalCost.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setCurrentStep('area')}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-lg font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (file && title) {
                    setCurrentStep('payment');
                  } else {
                    toast.error('Please upload a file and enter a title');
                  }
                }}
                disabled={!file || !title}
                className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {currentStep === 'payment' && pricingData && file && (
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Payment Method</h2>

            {/* Payment Options */}
            <div className="space-y-4 mb-6">
              <button
                type="button"
                onClick={() => setPaymentMethod('payfast')}
                className={`w-full p-6 border-2 rounded-lg text-left transition-all ${
                  paymentMethod === 'payfast'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <CreditCardIcon className="w-8 h-8 text-gray-600 mr-4" />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">PayFast Online Payment</div>
                    <div className="text-sm text-gray-600 mt-1">Pay securely online with credit/debit card</div>
                  </div>
                  {paymentMethod === 'payfast' && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash_on_delivery')}
                className={`w-full p-6 border-2 rounded-lg text-left transition-all ${
                  paymentMethod === 'cash_on_delivery'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <BanknotesIcon className="w-8 h-8 text-gray-600 mr-4" />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">Cash on Delivery / End of Month</div>
                    <div className="text-sm text-gray-600 mt-1">Pay when advertisement starts or at end of month</div>
                  </div>
                  {paymentMethod === 'cash_on_delivery' && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Final Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Area:</span>
                  <span className="font-medium">{pricingData.area.display_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{pricingData.duration} {pricingData.durationType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Content Type:</span>
                  <span className="font-medium capitalize">{adType}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-blue-600">PKR {pricingData.totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setCurrentStep('upload')}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-lg font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!paymentMethod) {
                    toast.error('Please select a payment method');
                    return;
                  }
                  if (!file || !title) {
                    toast.error('Please complete all required fields');
                    return;
                  }
                  handleSubmit();
                }}
                disabled={!paymentMethod || submitting || !file || !title}
                className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : paymentMethod === 'payfast' ? 'Proceed to Payment' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}

        {/* Pricing Modal */}
        <AdvertisementPricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          area={selectedArea}
          adType={adType}
          onProceed={handlePricingProceed}
        />
      </div>
    </div>
  );
}

