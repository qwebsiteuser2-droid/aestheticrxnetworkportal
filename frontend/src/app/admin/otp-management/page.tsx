'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getAccessToken } from '@/lib/auth';
import api from '@/lib/api';
import { 
  ShieldCheckIcon, 
  ClockIcon, 
  UserIcon, 
  CogIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface OTPConfig {
  id?: string;
  userType: 'regular' | 'admin';
  duration: number; // in hours
  durationType: 'hours' | 'days' | 'weeks' | 'months';
  isRequired: boolean;
  description: string;
}

const DURATION_OPTIONS = [
  { value: 0, label: 'Not Required', type: 'hours' as const, description: 'No OTP verification needed' },
  { value: 1, label: 'Every Time', type: 'hours' as const, description: 'OTP required for every login' },
  { value: 24, label: '1 Day', type: 'hours' as const, description: 'OTP required once per day' },
  { value: 48, label: '2 Days', type: 'hours' as const, description: 'OTP required once every 2 days' },
  { value: 72, label: '3 Days', type: 'hours' as const, description: 'OTP required once every 3 days' },
  { value: 168, label: '1 Week', type: 'hours' as const, description: 'OTP required once per week' },
  { value: 360, label: '15 Days', type: 'hours' as const, description: 'OTP required once every 15 days' },
  { value: 720, label: '1 Month', type: 'hours' as const, description: 'OTP required once per month' }
];

export default function OTPManagementPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const router = useRouter();
  const [configs, setConfigs] = useState<OTPConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('OTP Management - Auth state:', { authLoading, isAuthenticated, user: user?.email, is_admin: user?.is_admin });
  }, [authLoading, isAuthenticated, user]);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    // Only check authentication after auth loading is complete
    if (!authLoading) {
      if (!isAuthenticated || !user?.is_admin) {
        console.log('OTP Management - Redirecting to login. isAuthenticated:', isAuthenticated, 'user.is_admin:', user?.is_admin);
        router.push('/login');
        return;
      }
      // Load OTP configurations after authentication is confirmed
      loadOTPConfigs();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const loadOTPConfigs = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }

      const response = await api.get('/otp/configs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Axios response format: response.data
      if (response.data && response.data.success) {
        setConfigs(response.data.data || []);
      } else {
        toast.error('Failed to load OTP configurations');
        // If no configs exist, create default ones
        setConfigs([
          {
            userType: 'regular',
            duration: 24,
            durationType: 'hours',
            isRequired: true,
            description: 'OTP required once per day'
          },
          {
            userType: 'admin',
            duration: 1,
            durationType: 'hours',
            isRequired: true,
            description: 'OTP required for every login'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading OTP configs:', error);
      // Set default configs on error
      setConfigs([
        {
          userType: 'regular',
          duration: 24,
          durationType: 'hours',
          isRequired: true,
          description: 'OTP required once per day'
        },
        {
          userType: 'admin',
          duration: 1,
          durationType: 'hours',
          isRequired: true,
          description: 'OTP required for every login'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (userType: 'regular' | 'admin', newConfig: Partial<OTPConfig>) => {
    setConfigs(prev => prev.map(config => 
      config.userType === userType 
        ? { ...config, ...newConfig }
        : config
    ));
  };

  const saveConfigs = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot save OTP configurations.');
      return;
    }
    setSaving(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }

      // Explicitly use axios format - ensure we're not using fetch API
      const response = await api.post('/otp/configs', { configs }, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      // Axios response format: response.data (NOT response.json())
      // Ensure we're accessing the data property correctly
      if (response && typeof response === 'object' && 'data' in response) {
        const responseData = (response as any).data;
        if (responseData && responseData.success) {
          toast.success('OTP configurations saved successfully!');
          // Reload configs to show updated values
          await loadOTPConfigs();
        } else {
          const errorMessage = responseData?.message || 'Failed to save configurations';
          toast.error(errorMessage);
        }
      } else {
        // Fallback if response format is unexpected
        console.error('Unexpected response format:', response);
        toast.error('Unexpected response format from server');
      }
    } catch (error: any) {
      console.error('Error saving OTP configs:', error);
      // Handle axios error format - axios errors have error.response.data
      if (error && typeof error === 'object') {
        if ('response' in error && error.response && 'data' in error.response) {
          const errorMessage = error.response.data?.message || 'Failed to save configurations';
          toast.error(errorMessage);
        } else if ('message' in error) {
          toast.error(error.message || 'Failed to save configurations');
        } else {
          toast.error('Failed to save configurations');
        }
      } else {
        toast.error('Failed to save configurations');
      }
    } finally {
      setSaving(false);
    }
  };

  const getDurationLabel = (duration: number, durationType: string) => {
    if (duration === 0) return 'Not Required';
    if (duration === 1 && durationType === 'hours') return 'Every Time';
    if (duration === 24) return '1 Day';
    if (duration === 48) return '2 Days';
    if (duration === 72) return '3 Days';
    if (duration === 168) return '1 Week';
    if (duration === 360) return '15 Days';
    if (duration === 720) return '1 Month';
    return `${duration} ${durationType}`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {authLoading ? 'Checking authentication...' : 'Loading OTP configurations...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ShieldCheckIcon className="h-8 w-8 text-blue-600 mr-3" />
                Manage OTP Duration
              </h1>
              <p className="mt-2 text-gray-600">
                Configure OTP verification requirements for different user types
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <XMarkIcon className="h-5 w-5 mr-2" />
              Back
            </button>
          </div>
        </div>

        {/* OTP Configuration Cards */}
        <div className="space-y-6">
          {configs.map((config) => (
            <div key={config.userType} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  {config.userType === 'admin' ? (
                    <CogIcon className="h-6 w-6 text-red-600 mr-3" />
                  ) : (
                    <UserIcon className="h-6 w-6 text-blue-600 mr-3" />
                  )}
                  <h3 className="text-xl font-semibold text-gray-900 capitalize">
                    {config.userType === 'regular' ? 'Regular Users & Doctors' : 'Admin Users'}
                  </h3>
                </div>
                <div className="flex items-center">
                  {isViewerAdmin ? (
                    <div className="flex items-center">
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.isRequired ? 'bg-blue-600' : 'bg-gray-200'
                      } opacity-50 cursor-not-allowed`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          config.isRequired ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-500">
                        OTP Required (View Only)
                      </span>
                    </div>
                  ) : (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.isRequired}
                        onChange={(e) => updateConfig(config.userType, { 
                          isRequired: e.target.checked,
                          duration: e.target.checked ? config.duration : 0
                        })}
                        className="sr-only"
                      />
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.isRequired ? 'bg-blue-600' : 'bg-gray-200'
                      }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          config.isRequired ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        OTP Required
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {config.isRequired && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      OTP Duration
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {DURATION_OPTIONS.map((option) => (
                        <button
                          key={`${option.value}-${option.type}`}
                          onClick={() => updateConfig(config.userType, {
                            duration: option.value,
                            durationType: option.type,
                            description: option.description,
                            isRequired: option.value > 0
                          })}
                          className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                            config.duration === option.value
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          } ${isViewerAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={isViewerAdmin}
                        >
                          <div className="flex items-center justify-center">
                            <ClockIcon className="h-4 w-4 mr-2" />
                            {option.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-sm text-gray-700">
                        <strong>Current Setting:</strong> {config.description}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!config.isRequired && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <XMarkIcon className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="text-sm text-yellow-700">
                      OTP verification is disabled for {config.userType === 'regular' ? 'regular users & doctors' : 'admin users'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={saveConfigs}
            disabled={saving || isViewerAdmin}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="h-5 w-5 mr-2" />
                Save Configurations
              </>
            )}
          </button>
        </div>

        {/* Information Panel */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-blue-900 mb-3">
            OTP Duration Guidelines
          </h4>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• <strong>Every Time:</strong> Maximum security, OTP required for every login</p>
            <p>• <strong>Daily:</strong> Good balance of security and convenience</p>
            <p>• <strong>Weekly/Monthly:</strong> Less frequent verification, suitable for trusted environments</p>
            <p>• <strong>Not Required:</strong> Disables OTP verification (not recommended for production)</p>
            <p>• <strong>Admin users</strong> should typically use "Every Time" for maximum security</p>
          </div>
        </div>
      </div>
    </div>
  );
}
