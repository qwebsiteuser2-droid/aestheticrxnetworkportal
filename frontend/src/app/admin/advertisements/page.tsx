'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getAccessToken, isAuthenticated, getCurrentUser, isAdmin } from '@/lib/auth';
import toast from 'react-hot-toast';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

interface AdvertisementPlacement {
  id: string;
  name: string;
  description: string;
  type: string;
  position: string;
  max_ads: number;
  current_ads: number;
  dimensions: {
    width: number;
    height: number;
    min_width?: number;
    max_width?: number;
    min_height?: number;
    max_height?: number;
  };
  styles: {
    background_color?: string;
    border_radius?: number;
    padding?: number;
    margin?: number;
    z_index?: number;
  };
  allow_user_selection: boolean;
  visible_to_guests: boolean;
  device_type: string;
  responsive_breakpoints?: {
    mobile?: { width: number; height: number };
    tablet?: { width: number; height: number };
    desktop?: { width: number; height: number };
  };
  status: string;
  priority: number;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

interface AdvertisementApplication {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url?: string;
  target_url: string;
  button_text: string;
  button_color: string;
  background_color: string;
  text_color: string;
  budget: number;
  start_date: string;
  end_date: string;
  status: string;
  rejection_reason: string;
  admin_notes: string;
  requested_placements: string[];
  approved_placement_id: string;
  doctor: {
    id: string;
    doctor_name: string;
    clinic_name: string;
    email: string;
  };
  approved_placement: AdvertisementPlacement | null;
  contact_preferences: string;
  placement_change_notified: boolean;
  created_at: string;
  updated_at: string;
  impressions?: number;
  clicks?: number;
  views?: number;
}

function getStatusColor(status: string | undefined | null) {
  if (!status) return 'bg-gray-100 text-gray-800';
  switch (status.toLowerCase()) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'inactive': return 'bg-gray-100 text-gray-800';
    case 'maintenance': return 'bg-yellow-100 text-yellow-800';
    case 'pending': return 'bg-blue-100 text-blue-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'completed': return 'bg-blue-100 text-blue-800';
    case 'expired': return 'bg-gray-100 text-gray-800';
    case 'cancelled': return 'bg-gray-100 text-gray-800';
    case 'paused': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

// Helper function to calculate time remaining (client-side only to avoid hydration issues)
const getTimeRemaining = (endDate: string): string => {
  if (typeof window === 'undefined') return 'Calculating...';
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  
  if (diff < 0) {
    return 'Expired';
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

// Helper function to format end time (client-side only to avoid hydration issues)
const getEndTime = (endDate: string): string => {
  if (typeof window === 'undefined') return '';
  const end = new Date(endDate);
  return end.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Application List Item Component
const ApplicationListItem = ({ application, onReview, onStop, onOpenStopModal, currentFilter }: { application: AdvertisementApplication, onReview: () => void, onStop?: (id: string, action: 'pause' | 'resume') => void, onOpenStopModal?: (app: AdvertisementApplication) => void, currentFilter?: 'all' | 'pending' | 'approved' | 'rejected' | 'expired' | 'waiting' | 'stopped' }) => {
  // Use useState to avoid hydration mismatches (calculate on client side)
  const [timeRemaining, setTimeRemaining] = useState<string>('Calculating...');
  const [endTime, setEndTime] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);
  
  useEffect(() => {
    if (application.end_date) {
      // Update immediately
      setTimeRemaining(getTimeRemaining(application.end_date));
      setEndTime(getEndTime(application.end_date));
      setIsExpired(new Date(application.end_date) < new Date());
      
      // Update every second to show live countdown
      const interval = setInterval(() => {
        setTimeRemaining(getTimeRemaining(application.end_date));
        setEndTime(getEndTime(application.end_date));
        setIsExpired(new Date(application.end_date) < new Date());
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [application.end_date]);
  
  return (
    <li>
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <div className="flex-shrink-0">
              {application.image_url && !application.image_url.includes('FFFFFF?text=') && !application.image_url.match(/^[A-F0-9]+\?text=/i) ? (
                application.video_url ? (
                  <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center relative">
                    <span className="text-gray-400 text-lg">🎥</span>
                    {application.image_url && (
                      <img 
                        className="absolute inset-0 w-full h-full rounded-lg object-cover opacity-50" 
                        src={application.image_url} 
                        alt={application.title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <img 
                    className="h-12 w-12 rounded-lg object-cover" 
                    src={application.image_url} 
                    alt={application.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement?.appendChild(
                        Object.assign(document.createElement('div'), {
                          className: 'h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center',
                          innerHTML: '<span class="text-gray-400 text-lg">📢</span>'
                        })
                      );
                    }}
                  />
                )
              ) : (
                <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-lg">📢</span>
                </div>
              )}
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center">
                <p className="text-sm font-medium text-gray-900">{application.title}</p>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                  {application.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">by {application.doctor.doctor_name} ({application.doctor.clinic_name})</p>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-sm text-gray-500">Budget: PKR {application.budget.toLocaleString()}</p>
                {application.impressions !== undefined && (
                  <p className="text-xs text-gray-500">
                    👁️ {application.impressions.toLocaleString()} views
                  </p>
                )}
                {application.clicks !== undefined && (
                  <p className="text-xs text-gray-500">
                    👆 {application.clicks.toLocaleString()} clicks
                  </p>
                )}
              </div>
              {application.start_date && application.end_date && (
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-gray-400">
                    📅 {new Date(application.start_date).toLocaleDateString()} - {new Date(application.end_date).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-blue-600'}`}>
                      ⏰ Ends: {endTime}
                    </span>
                    <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                      ⏳ {isExpired ? 'Expired' : `Time left: ${timeRemaining}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <span className="text-sm text-gray-500">
              {new Date(application.created_at).toLocaleDateString()}
            </span>
            {((application.status?.toLowerCase() === 'active' || 
                application.status?.toLowerCase() === 'approved' || 
                application.status?.toLowerCase() === 'paused' ||
                currentFilter === 'waiting' ||
                currentFilter === 'stopped' ||
                currentFilter === 'all') && (onStop || onOpenStopModal)) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenStopModal) {
                    onOpenStopModal(application);
                  } else if (onStop) {
                    const action = application.status?.toLowerCase() === 'paused' ? 'resume' : 'pause';
                    if (window.confirm(`Are you sure you want to ${action === 'pause' ? 'stop/pause' : 'resume'} this advertisement?`)) {
                      onStop(application.id, action);
                    }
                  }
                }}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  application.status?.toLowerCase() === 'paused'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
                title={application.status?.toLowerCase() === 'paused' ? 'Resume Advertisement' : 'Stop/Pause Advertisement'}
              >
                {application.status?.toLowerCase() === 'paused' ? '▶ Resume' : '⏸ Stop'}
              </button>
            )}
            <button
              onClick={onReview}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Review
            </button>
          </div>
        </div>
      </div>
    </li>
  );
};

export default function AdvertisementManagement() {
  const router = useRouter();
  const { isViewerAdmin, permissionData, loading: permissionLoading } = useAdminPermission();
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopModalApplication, setStopModalApplication] = useState<AdvertisementApplication | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [stopType, setStopType] = useState<'permanent' | 'temporary' | 'change-area'>('permanent');
  const [pauseDuration, setPauseDuration] = useState<number>(1);
  const [pauseDurationUnit, setPauseDurationUnit] = useState<'hours' | 'days' | 'weeks'>('hours');
  const [isFromWaitingTab, setIsFromWaitingTab] = useState(false);
  
  // Bulk toggle states
  const [showBulkToggleModal, setShowBulkToggleModal] = useState(false);
  const [bulkToggleAction, setBulkToggleAction] = useState<'pause' | 'resume' | null>(null);
  const [isBulkToggling, setIsBulkToggling] = useState(false);
  const [placements, setPlacements] = useState<AdvertisementPlacement[]>([]);
  const [applications, setApplications] = useState<AdvertisementApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'placements' | 'applications' | 'pricing' | 'rotation-settings'>('placements');
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'expired' | 'waiting' | 'stopped'>('all');
  const [showCreatePlacement, setShowCreatePlacement] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<AdvertisementApplication | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showApprovalSuccessModal, setShowApprovalSuccessModal] = useState(false);
  
  // Pricing management states
  const [pricingConfigs, setPricingConfigs] = useState<any[]>([]);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [editingPricingConfig, setEditingPricingConfig] = useState<any | null>(null);
  const [showDeletePricingModal, setShowDeletePricingModal] = useState(false);
  const [pricingConfigToDelete, setPricingConfigToDelete] = useState<any | null>(null);
  const [isDeletingPricing, setIsDeletingPricing] = useState(false);
  const [newPricingConfig, setNewPricingConfig] = useState({
    placement_area: 'top_banner_highest_visibility',
    advertisement_type: 'video',
    duration_unit: 'hour',
    is_quitable: true,
    unit_price: 0,
    description: '',
    is_active: true
  });
  
  // Rotation settings states
  const [rotationConfigs, setRotationConfigs] = useState<any[]>([]);
  const [editingRotationConfig, setEditingRotationConfig] = useState<any | null>(null);
  const [isUpdatingRotation, setIsUpdatingRotation] = useState(false);

  // Form states
  const [newPlacement, setNewPlacement] = useState({
    name: '',
    description: '',
    type: 'banner',
    position: '',
    max_ads: 1,
    dimensions: { width: 300, height: 250 },
    styles: { background_color: '#ffffff', border_radius: 8, padding: 10 },
    allow_user_selection: true,
    visible_to_guests: true,
    device_type: 'all',
    responsive_breakpoints: {
      mobile: { width: 300, height: 200 },
      tablet: { width: 500, height: 150 },
      desktop: { width: 300, height: 250 }
    },
    status: 'active',
    priority: 50,
    admin_notes: ''
  });

  useEffect(() => {
    const checkAuth = async () => {
      // Wait a bit for auth and permissions to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }

      const user = getCurrentUser();
      const isUserAdmin = isAdmin();
      const token = getAccessToken();
      
      // Allow Viewer Admins (child admins) to access - check admin permissions
      const hasAdminAccess = isUserAdmin || 
        (permissionData?.hasPermission === true) || 
        (permissionData?.permissionType && ['viewer', 'custom', 'full'].includes(permissionData.permissionType));

      if (!hasAdminAccess) {
        router.push('/');
        return;
      }

      if (!token) {
        console.error('No token available, redirecting to login');
        router.push('/login');
        return;
      }

      fetchData();
    };

    if (!permissionLoading) {
      checkAuth();
    }
  }, [router, permissionData, permissionLoading]);

  const fetchData = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        console.error('No access token found!');
        return;
      }
      
      // Helper function to normalize API URL (remove trailing /api if present)
      const normalizeApiUrl = (baseUrl: string): string => {
        if (!baseUrl) {
          const apiUrl = getApiUrl();
          return apiUrl.replace('/api', '');
        }
        const url = baseUrl.trim();
        // Remove trailing /api if present
        if (url.endsWith('/api')) {
          return url.slice(0, -4);
        }
        return url;
      };
      
      const apiUrl = getApiUrl();
      const baseApiUrl = normalizeApiUrl(apiUrl);
      
      const [placementsRes, applicationsRes, pricingRes, rotationRes] = await Promise.all([
        fetch(`${baseApiUrl}/api/video-advertisements/admin/areas`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${baseApiUrl}/api/video-advertisements/admin/all`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${baseApiUrl}/api/video-advertisements/admin/pricing-configs`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${baseApiUrl}/api/video-advertisements/admin/rotation-configs`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (placementsRes.ok) {
        const placementsData = await placementsRes.json();
        setPlacements(placementsData.data || []);
      }

      if (applicationsRes.ok) {
        const applicationsData = await applicationsRes.json();
        
        // Handle different response structures
        let ads: any[] = [];
        if (applicationsData.success && applicationsData.data?.advertisements) {
          // Backend returns: { success: true, data: { advertisements: [...] } }
          ads = applicationsData.data.advertisements;
        } else if (applicationsData.data?.advertisements) {
          ads = applicationsData.data.advertisements;
        } else if (applicationsData.advertisements) {
          ads = applicationsData.advertisements;
        } else if (Array.isArray(applicationsData.data)) {
          ads = applicationsData.data;
        } else if (Array.isArray(applicationsData)) {
          ads = applicationsData;
        }

      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        if (pricingData.success && pricingData.data) {
          setPricingConfigs(pricingData.data);
        }
      }

      if (rotationRes.ok) {
        const rotationData = await rotationRes.json();
        if (rotationData.success && rotationData.data) {
          setRotationConfigs(rotationData.data);
        }
        }
        
        const transformedApplications = ads.map((ad: any) => {
          // Helper to build full URL for media files
          const buildMediaUrl = (url: string | null | undefined): string => {
            if (!url || typeof url !== 'string') return '';
            // Filter out malformed placeholder URLs
            if (url.includes('FFFFFF?text=') || 
                url.includes('via.placeholder.com') || 
                url.match(/^[A-F0-9]+\?text=/i) ||
                url.trim() === '' ||
                url === 'null' ||
                url === 'undefined') {
              return ''; // Return empty string for malformed URLs
            }
            if (url.startsWith('http://') || url.startsWith('https://')) return url;
            // Ensure URL starts with / if it doesn't
            const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
            // Remove any double slashes (except after http://)
            const fullUrl = `${baseApiUrl}${normalizedUrl}`.replace(/([^:]\/)\/+/g, '$1');
            return fullUrl;
          };
          
          return {
          id: ad.id,
          title: ad.title,
          description: ad.description || '',
          // Only use image_url or thumbnail_url for images, not video_url
          image_url: buildMediaUrl(ad.image_url) || buildMediaUrl(ad.thumbnail_url) || '',
          video_url: buildMediaUrl(ad.video_url) || '',
          target_url: ad.target_url || '',
          button_text: ad.button_text || '',
          button_color: ad.button_color || '',
          background_color: ad.background_color || '',
          text_color: ad.text_color || '',
          budget: ad.total_cost || 0,
          start_date: ad.start_date,
          end_date: ad.end_date,
          status: ad.status,
          rejection_reason: ad.rejection_reason || '',
          admin_notes: ad.admin_notes || '',
          requested_placements: ad.selected_area ? [ad.selected_area] : [],
          approved_placement_id: ad.selected_area || '',
          doctor: ad.doctor || {
            id: ad.doctor_id || '',
            doctor_name: 'Unknown',
            clinic_name: 'N/A',
            email: ''
          },
          approved_placement: null,
          contact_preferences: '',
          placement_change_notified: false,
          created_at: ad.created_at,
          updated_at: ad.updated_at,
          impressions: ad.impressions || 0,
          clicks: ad.clicks || 0,
          views: ad.views || 0
          };
        });
        setApplications(transformedApplications);
      } else {
        const errorText = await applicationsRes.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        console.error('Applications API error:', applicationsRes.status, errorData);
        console.error('Response headers:', Object.fromEntries(applicationsRes.headers.entries()));
      }
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot create placements.');
      return;
    }
    try {
      const token = getAccessToken();
      const response = await api.post('/placements', newPlacement, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data.success) {
        await fetchData();
        setShowCreatePlacement(false);
        setNewPlacement({
          name: '',
          description: '',
          type: 'banner',
          position: '',
          max_ads: 1,
          dimensions: { width: 300, height: 250 },
          styles: { background_color: '#ffffff', border_radius: 8, padding: 10 },
          allow_user_selection: true,
          visible_to_guests: true,
          device_type: 'all',
          responsive_breakpoints: {
            mobile: { width: 300, height: 200 },
            tablet: { width: 500, height: 150 },
            desktop: { width: 300, height: 250 }
          },
          status: 'active',
          priority: 50,
          admin_notes: ''
        });
        alert('Advertisement placement created successfully!');
      } else {
        alert('Error creating placement');
      }
    } catch (error: unknown) {
      console.error('Error creating placement:', error);
      alert('Error creating placement');
    }
  };

  const handleApproveApplication = async (applicationId: string, placementId: string, adminNotes: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot approve applications.');
      return;
    }
    try {
      // Check authentication first
      if (!isAuthenticated()) {
        alert('You must be logged in to perform this action. Please refresh the page and try again.');
        router.push('/login');
        return;
      }

      const token = getAccessToken();
      if (!token) {
        console.error('No access token found. User authenticated:', isAuthenticated());
        alert('Authentication token not found. Please refresh the page and try again.');
        return;
      }

      // Helper function to normalize API URL
      const normalizeApiUrl = (baseUrl: string): string => {
        if (!baseUrl) {
          const apiUrl = getApiUrl();
          return apiUrl.replace('/api', '');
        }
        const url = baseUrl.trim();
        if (url.endsWith('/api')) {
          return url.slice(0, -4);
        }
        return url;
      };

      const apiUrl = getApiUrl();
      const baseApiUrl = normalizeApiUrl(apiUrl);
      
      const response = await api.put(`/video-advertisements/admin/${applicationId}/approve`, {
        admin_notes: adminNotes
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data.success) {
        const result = response.data;
        await fetchData();
        setShowApplicationModal(false);
        setSelectedApplication(null);
        
        if (result.warning && result.conflicts && result.conflicts.length > 0) {
          const conflictList = result.conflicts.map((c: any) => 
            `- ${c.title} (${c.doctor_name}): ${new Date(c.start_date).toLocaleDateString()} - ${new Date(c.end_date).toLocaleDateString()}`
          ).join('\n');
          alert(`⚠️ WARNING: Timing conflicts detected!\n\nConflicting advertisements:\n${conflictList}\n\nAdvertisement approved, but multiple ads will be active in the same area during overlapping periods.`);
      } else {
          setShowApprovalSuccessModal(true);
        }
      } else {
        alert(`Error approving application: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      console.error('Error approving application:', error);
      alert('Error approving application. Please try again.');
    }
  };

  const handleStopAdvertisement = async (applicationId: string, action: 'pause' | 'resume' = 'pause', stopTypeParam?: 'permanent' | 'temporary' | 'change-area', duration?: number, durationUnit?: 'hours' | 'days' | 'weeks') => {
    setIsStopping(true);
    try {
      // Check authentication first
      if (!isAuthenticated()) {
        toast.error('You must be logged in to perform this action. Please refresh the page and try again.', {
          duration: 5000,
        });
        router.push('/login');
        setIsStopping(false);
        return;
      }

      const token = getAccessToken();
      if (!token) {
        console.error('No access token found. User authenticated:', isAuthenticated());
        toast.error('Authentication token not found. Please refresh the page and try again.', {
          duration: 5000,
        });
        setIsStopping(false);
        return;
      }

      // Helper function to normalize API URL
      const normalizeApiUrl = (baseUrl: string): string => {
        if (!baseUrl) {
          const apiUrl = getApiUrl();
          return apiUrl.replace('/api', '');
        }
        const url = baseUrl.trim();
        if (url.endsWith('/api')) {
          return url.slice(0, -4);
        }
        return url;
      };

      const apiUrl = getApiUrl();
      const baseApiUrl = normalizeApiUrl(apiUrl);
      
      const requestBody: any = { action };
      if (action === 'pause' && stopTypeParam) {
        requestBody.stopType = stopTypeParam;
        if (stopTypeParam === 'temporary' && duration && durationUnit) {
          requestBody.duration = duration;
          requestBody.durationUnit = durationUnit;
        } else if (stopTypeParam === 'change-area') {
          // For change-area, backend will handle finding available area
          requestBody.changeArea = true;
        }
      }
      
      const response = await api.put(`/video-advertisements/admin/${applicationId}/toggle`, requestBody, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data.success) {
        const result = response.data;
        await fetchData();
        setShowStopModal(false);
        setStopModalApplication(null);
        // Show success toast notification with appropriate message
        let successMessage = `Advertisement ${action === 'pause' ? 'stopped/paused' : 'resumed'} successfully!`;
        if (action === 'pause' && stopTypeParam) {
          if (stopTypeParam === 'change-area') {
            successMessage = 'Advertisement moved to available area and activated successfully!';
          } else if (stopTypeParam === 'temporary' && duration && durationUnit) {
            successMessage = `Advertisement paused temporarily for ${duration} ${durationUnit}. It will automatically resume.`;
          } else {
            successMessage = 'Advertisement paused permanently. It will remain paused until manually resumed.';
          }
        }
        
        toast.success(successMessage, {
          duration: 4000,
          icon: action === 'pause' ? '⏸' : '▶',
          style: {
            background: '#10B981',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
        });
      } else {
        toast.error(
          `Error ${action === 'pause' ? 'stopping' : 'resuming'} advertisement: ${response.data.message || 'Unknown error'}`,
          {
            duration: 5000,
            style: {
              background: '#EF4444',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
            },
          }
        );
      }
    } catch (error: unknown) {
      console.error(`Error ${action === 'pause' ? 'stopping' : 'resuming'} advertisement:`, error);
      toast.error(
        `Error ${action === 'pause' ? 'stopping' : 'resuming'} advertisement. Please try again.`,
        {
          duration: 5000,
          style: {
            background: '#EF4444',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
        }
      );
    } finally {
      setIsStopping(false);
    }
  };

  const openStopModal = (application: AdvertisementApplication, fromWaitingTab: boolean = false) => {
    setStopModalApplication(application);
    setStopType('permanent'); // Reset to default
    setPauseDuration(1);
    setPauseDurationUnit('hours');
    setIsFromWaitingTab(fromWaitingTab);
    setShowStopModal(true);
  };

  const handleBulkToggle = async (action: 'pause' | 'resume') => {
    setIsBulkToggling(true);
    try {
      // Check authentication first
      if (!isAuthenticated()) {
        alert('You must be logged in to perform this action. Please refresh the page and try again.');
        router.push('/login');
        return;
      }

      const token = getAccessToken();
      if (!token) {
        console.error('No access token found. User authenticated:', isAuthenticated());
        alert('Authentication token not found. Please refresh the page and try again.');
        return;
      }

      // Helper function to normalize API URL
      const normalizeApiUrl = (baseUrl: string): string => {
        if (!baseUrl) {
          const apiUrl = getApiUrl();
          return apiUrl.replace('/api', '');
        }
        const url = baseUrl.trim();
        if (url.endsWith('/api')) {
          return url.slice(0, -4);
        }
        return url;
      };

      const apiUrl = getApiUrl();
      const baseApiUrl = normalizeApiUrl(apiUrl);
      
      const response = await api.put(`/video-advertisements/admin/toggle-all`, { action }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        const result = response.data;
        
        toast.success(result.message || `${action === 'pause' ? 'Stopped' : 'Resumed'} all advertisements successfully!`, {
          duration: 5000,
          icon: action === 'pause' ? '⏸' : '▶',
          style: {
            background: '#10B981',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
        });

        // Refresh data to show updated statuses
        await fetchData();
        
        // Close modal
        setShowBulkToggleModal(false);
        setBulkToggleAction(null);
      } else {
        toast.error(
          `Error ${action === 'pause' ? 'stopping' : 'resuming'} all advertisements: ${response.data.message || 'Unknown error'}`,
          {
            duration: 5000,
            style: {
              background: '#EF4444',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
            },
          }
        );
      }
    } catch (error: unknown) {
      console.error(`Error ${action === 'pause' ? 'stopping' : 'resuming'} all advertisements:`, error);
      toast.error(
        `Error ${action === 'pause' ? 'stopping' : 'resuming'} all advertisements. Please try again.`,
        {
          duration: 5000,
          style: {
            background: '#EF4444',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
        }
      );
    } finally {
      setIsBulkToggling(false);
    }
  };

  const handleRejectApplication = async (applicationId: string, rejectionReason: string, adminNotes: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot reject applications.');
      return;
    }
    try {
      // Check authentication first
      if (!isAuthenticated()) {
        alert('You must be logged in to perform this action. Please refresh the page and try again.');
        router.push('/login');
        return;
      }

      const token = getAccessToken();
      if (!token) {
        console.error('No access token found. User authenticated:', isAuthenticated());
        alert('Authentication token not found. Please refresh the page and try again.');
        return;
      }

      // Helper function to normalize API URL
      const normalizeApiUrl = (baseUrl: string): string => {
        if (!baseUrl) {
          const apiUrl = getApiUrl();
          return apiUrl.replace('/api', '');
        }
        const url = baseUrl.trim();
        if (url.endsWith('/api')) {
          return url.slice(0, -4);
        }
        return url;
      };

      const apiUrl = getApiUrl();
      const baseApiUrl = normalizeApiUrl(apiUrl);
      
      const response = await api.put(`/video-advertisements/admin/${applicationId}/reject`, {
        rejection_reason: rejectionReason,
        admin_notes: adminNotes
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data.success) {
        const result = response.data;
        await fetchData();
        setShowApplicationModal(false);
        setSelectedApplication(null);
        alert('Advertisement application rejected. User has been notified via email.');
      } else {
        alert(`Error rejecting application: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      console.error('Error rejecting application:', error);
      alert('Error rejecting application. Please try again.');
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading advertisement management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <a href="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Admin Dashboard
            </a>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">📢 Advertisement Management</h1>
          <p className="mt-2 text-gray-600">Manage advertisement placements and review applications</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('placements')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'placements'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📍 Advertisement Placements ({placements.length})
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'applications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📋 Applications ({applications.length})
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pricing'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                💰 Pricing Management
              </button>
              <button
                onClick={() => setActiveTab('rotation-settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'rotation-settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⚙️ Rotation & Display Settings
              </button>
            </nav>
          </div>
        </div>

        {/* Placements Tab */}
        {activeTab === 'placements' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Advertisement Placements</h2>
              {isViewerAdmin ? (
                <button
                  disabled
                  className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed"
                >
                  ➕ Create New Placement (View Only)
                </button>
              ) : (
                <button
                  onClick={() => setShowCreatePlacement(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ➕ Create New Placement
                </button>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {placements.map((placement) => (
                <div key={placement.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{placement.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(placement.status)}`}>
                      {placement.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">{placement.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span className="font-medium">{placement.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Position:</span>
                      <span className="font-medium">{placement.position}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Capacity:</span>
                      <span className="font-medium">{placement.current_ads}/{placement.max_ads}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Priority:</span>
                      <span className="font-medium">{placement.priority}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">User Selection:</span>
                      <span className="font-medium">{placement.allow_user_selection ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Guest Visible:</span>
                      <span className="font-medium">{placement.visible_to_guests ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Device Type:</span>
                      <span className={`font-medium px-2 py-1 rounded text-xs ${
                        placement.device_type === 'mobile' ? 'bg-blue-100 text-blue-800' :
                        placement.device_type === 'tablet' ? 'bg-green-100 text-green-800' :
                        placement.device_type === 'desktop' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {placement.device_type.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {placement.admin_notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">
                        <strong>Admin Notes:</strong> {placement.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Advertisement Applications</h2>
              <div className="flex items-center gap-3">
                {/* Bulk Toggle Buttons */}
                {(() => {
                  const activeCount = applications.filter(a => {
                    const status = (a.status || '').toLowerCase();
                    return status === 'active' || status === 'approved';
                  }).length;
                  const pausedCount = applications.filter(a => {
                    const status = (a.status || '').toLowerCase();
                    return status === 'paused';
                  }).length;
                  
                  return (
                    <>
                      {activeCount > 0 && (
                        <button
                          onClick={() => {
                            setBulkToggleAction('pause');
                            setShowBulkToggleModal(true);
                          }}
                          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center gap-2 transition-colors"
                          title={`Stop all ${activeCount} active advertisement(s)`}
                        >
                          <span>⏸</span> Stop All ({activeCount})
                        </button>
                      )}
                      {pausedCount > 0 && (
                          <button
                            onClick={() => {
                            setBulkToggleAction('resume');
                            setShowBulkToggleModal(true);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 transition-colors"
                          title={`Resume all ${pausedCount} paused advertisement(s)`}
                        >
                          <span>▶</span> Resume All ({pausedCount})
                        </button>
                      )}
                    </>
                  );
                })()}
                <button
                  onClick={fetchData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <span>🔄</span> Refresh
                          </button>
                        </div>
                      </div>

            {/* Status Filter Tabs */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                          <button
                  onClick={() => setApplicationStatusFilter('all')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    applicationStatusFilter === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All ({applications.length})
                          </button>
                <button
                  onClick={() => setApplicationStatusFilter('pending')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    applicationStatusFilter === 'pending'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pending ({applications.filter(a => a.status.toLowerCase() === 'pending').length})
                </button>
                <button
                  onClick={() => setApplicationStatusFilter('approved')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    applicationStatusFilter === 'approved'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Approved ({applications.filter(a => a.status.toLowerCase() === 'active' || a.status.toLowerCase() === 'approved').length})
                </button>
                <button
                  onClick={() => setApplicationStatusFilter('rejected')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    applicationStatusFilter === 'rejected'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Rejected ({applications.filter(a => a.status.toLowerCase() === 'rejected').length})
                </button>
                <button
                  onClick={() => setApplicationStatusFilter('expired')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    applicationStatusFilter === 'expired'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Expired ({applications.filter(a => {
                    const status = a.status?.toLowerCase() || '';
                    return status === 'expired' || status === 'completed';
                  }).length})
                </button>
                <button
                  onClick={() => setApplicationStatusFilter('waiting')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    applicationStatusFilter === 'waiting'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Waiting ({(() => {
                    const now = new Date();
                    return applications.filter(a => {
                      const status = (a.status || '').toLowerCase();
                      // Must be approved or active
                      if (status !== 'active' && status !== 'approved') return false;
                      
                      // Must have a selected area
                      const selectedArea = a.approved_placement_id || a.requested_placements?.[0];
                      if (!selectedArea) return false;
                      
                      // Find the matching placement/area (match by name, area_name, or id)
                      const area = placements.find(p => {
                        const pName = (p as any).name || (p as any).area_name;
                        return pName === selectedArea || p.id === selectedArea;
                      });
                      
                      if (!area) return false;
                      
                      // Check if area is full (handle both field name variations)
                      const currentAds = (area as any).current_ads || (area as any).current_active_ads || 0;
                      const maxAds = (area as any).max_ads || (area as any).max_concurrent_ads || 1;
                      const isAreaFull = currentAds >= maxAds;
                      
                      // Check if ad is ready to show (within date range)
                      if (!a.start_date) return false;
                      const startDate = new Date(a.start_date);
                      const endDate = a.end_date ? new Date(a.end_date) : null;
                      const isReadyToShow = startDate <= now && (!endDate || endDate >= now);
                      
                      // Waiting = approved/active, ready to show, but area is full
                      return isReadyToShow && isAreaFull;
                    }).length;
                  })()})
                </button>
                <button
                  onClick={() => setApplicationStatusFilter('stopped')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    applicationStatusFilter === 'stopped'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Stopped ({applications.filter(a => {
                    const status = (a.status || '').toLowerCase();
                    return status === 'paused';
                  }).length})
                </button>
              </nav>
                    </div>

            {/* Filter and categorize applications */}
            {(() => {
              const now = new Date();
              let filteredApplications = applications;

              // Filter by status
              if (applicationStatusFilter !== 'all') {
                filteredApplications = applications.filter(app => {
                  const status = (app.status || '').toLowerCase();
                  if (applicationStatusFilter === 'pending') return status === 'pending';
                  if (applicationStatusFilter === 'approved') return status === 'active' || status === 'approved';
                  if (applicationStatusFilter === 'rejected') return status === 'rejected';
                  if (applicationStatusFilter === 'expired') return status === 'expired' || status === 'completed';
                  if (applicationStatusFilter === 'stopped') return status === 'paused';
                  if (applicationStatusFilter === 'waiting') {
                    // Waiting = approved/active, ready to show, but area is full
                    if (status !== 'active' && status !== 'approved') return false;
                    
                    // Must have a selected area
                    const selectedArea = app.approved_placement_id || app.requested_placements?.[0];
                    if (!selectedArea) return false;
                    
                    // Find the matching placement/area (match by name, area_name, or id)
                    const area = placements.find(p => {
                      const pName = (p as any).name || (p as any).area_name;
                      return pName === selectedArea || p.id === selectedArea;
                    });
                    
                    if (!area) return false;
                    
                    // Check if area is full (handle both field name variations)
                    const currentAds = (area as any).current_ads || (area as any).current_active_ads || 0;
                    const maxAds = (area as any).max_ads || (area as any).max_concurrent_ads || 1;
                    const isAreaFull = currentAds >= maxAds;
                    
                    // Check if ad is ready to show (within date range)
                    if (!app.start_date) return false;
                    const startDate = new Date(app.start_date);
                    const endDate = app.end_date ? new Date(app.end_date) : null;
                    const isReadyToShow = startDate <= now && (!endDate || endDate >= now);
                    
                    // Waiting = approved/active, ready to show, but area is full
                    return isReadyToShow && isAreaFull;
                  }
                  return true;
                });
              }

              // For other filters, show regular list
              if (filteredApplications.length === 0) {
                return (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                    <p className="text-yellow-800">
                      <strong>No {applicationStatusFilter === 'all' ? '' : applicationStatusFilter} applications found.</strong>
                    </p>
                      </div>
                );
              }

              return (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                              {filteredApplications.map((application) => (
                                <ApplicationListItem 
                                  key={application.id} 
                                  application={application} 
                                  onReview={() => {
                                    setSelectedApplication(application);
                                    setShowApplicationModal(true);
                                  }}
                                  onStop={handleStopAdvertisement}
                                  onOpenStopModal={(app) => openStopModal(app, applicationStatusFilter === 'waiting')}
                                  currentFilter={applicationStatusFilter}
                                />
                ))}
              </ul>
            </div>
              );
            })()}
          </div>
        )}

        {/* Pricing Management Tab */}
        {activeTab === 'pricing' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">💰 Pricing Management</h2>
                <button
                onClick={() => {
                  setEditingPricingConfig(null);
                  setNewPricingConfig({
                    placement_area: 'top_banner_highest_visibility',
                    advertisement_type: 'video',
                    duration_unit: 'hour',
                    is_quitable: true,
                    unit_price: 0,
                    description: '',
                    is_active: true
                  });
                  setShowPricingModal(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                disabled={isViewerAdmin}
              >
                ➕ Add New Pricing Configuration
                </button>
            </div>

            {/* Pricing Configurations Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placement</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quitable</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price (PKR)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pricingConfigs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                          No pricing configurations found. Click "Add New Pricing Configuration" to create one.
                        </td>
                      </tr>
                    ) : (
                      pricingConfigs.map((config) => (
                        <tr key={config.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {config.placement_area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                            {config.advertisement_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                            {config.duration_unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              config.is_quitable 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {config.is_quitable ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            PKR {parseFloat(config.unit_price).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              config.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {config.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                              onClick={() => {
                                setEditingPricingConfig(config);
                                setNewPricingConfig({
                                  placement_area: config.placement_area,
                                  advertisement_type: config.advertisement_type,
                                  duration_unit: config.duration_unit,
                                  is_quitable: config.is_quitable,
                                  unit_price: config.unit_price,
                                  description: config.description || '',
                                  is_active: config.is_active
                                });
                                setShowPricingModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                              disabled={isViewerAdmin}
                >
                              Edit
                </button>
                <button
                              onClick={() => {
                                setPricingConfigToDelete(config);
                                setShowDeletePricingModal(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                              disabled={isViewerAdmin}
                >
                              Delete
                </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
                      </div>
        )}

        {/* Delete Pricing Configuration Confirmation Modal */}
        {showDeletePricingModal && pricingConfigToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                      </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Delete Pricing Configuration
                </h3>
                <p className="text-sm text-gray-600 text-center mb-4">
                  Are you sure you want to delete this pricing configuration?
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Configuration Details:</p>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p><strong>Placement:</strong> {pricingConfigToDelete.placement_area?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                    <p><strong>Ad Type:</strong> {pricingConfigToDelete.advertisement_type?.charAt(0).toUpperCase() + pricingConfigToDelete.advertisement_type?.slice(1)}</p>
                    <p><strong>Duration Unit:</strong> {pricingConfigToDelete.duration_unit?.charAt(0).toUpperCase() + pricingConfigToDelete.duration_unit?.slice(1)}</p>
                    <p><strong>Quitable:</strong> {pricingConfigToDelete.is_quitable ? 'Yes' : 'No'}</p>
                    <p><strong>Unit Price:</strong> ${typeof pricingConfigToDelete.unit_price === 'number' ? pricingConfigToDelete.unit_price.toFixed(2) : parseFloat(pricingConfigToDelete.unit_price || '0').toFixed(2)}</p>
                      </div>
                    </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => {
                      setShowDeletePricingModal(false);
                      setPricingConfigToDelete(null);
                    }}
                    disabled={isDeletingPricing}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setIsDeletingPricing(true);
                        const token = getAccessToken();
                        if (!token) {
                          toast.error('Authentication required');
                          setIsDeletingPricing(false);
                          return;
                        }
                        const normalizeApiUrl = (baseUrl: string): string => {
                          if (!baseUrl) {
          const apiUrl = getApiUrl();
          return apiUrl.replace('/api', '');
        }
                          const url = baseUrl.trim();
                          if (url.endsWith('/api')) {
                            return url.slice(0, -4);
                          }
                          return url;
                        };
                        const apiUrl = getApiUrl();
      const baseApiUrl = normalizeApiUrl(apiUrl);
                        
                        const response = await api.delete(`/video-advertisements/admin/pricing-configs/${pricingConfigToDelete.id}`, {
                          headers: {
                            'Authorization': `Bearer ${token}`,
                          },
                        });

                        if (response.data.success) {
                          toast.success('Pricing configuration deleted successfully');
                          setShowDeletePricingModal(false);
                          setPricingConfigToDelete(null);
                          fetchData();
                        } else {
                          toast.error(response.data.message || 'Failed to delete pricing configuration');
                        }
                      } catch (error) {
                        console.error('Error deleting pricing config:', error);
                        toast.error('Error deleting pricing configuration');
                      } finally {
                        setIsDeletingPricing(false);
                      }
                    }}
                    disabled={isDeletingPricing}
                    className="flex-1 px-4 py-2 rounded-md text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700"
                  >
                    {isDeletingPricing ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </span>
                    ) : (
                      'Delete'
                    )}
                    </button>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Configuration Modal */}
        {showPricingModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingPricingConfig ? 'Edit Pricing Configuration' : 'Add New Pricing Configuration'}
                </h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const token = getAccessToken();
                    if (!token) {
                      toast.error('Authentication required');
                      return;
                    }
                    const normalizeApiUrl = (baseUrl: string): string => {
                      if (!baseUrl) {
          const apiUrl = getApiUrl();
          return apiUrl.replace('/api', '');
        }
                      const url = baseUrl.trim();
                      if (url.endsWith('/api')) {
                        return url.slice(0, -4);
                      }
                      return url;
                    };
                    let response;
                    if (editingPricingConfig) {
                      response = await api.put(`/video-advertisements/admin/pricing-configs/${editingPricingConfig.id}`, newPricingConfig, {
                        headers: {
                          'Authorization': `Bearer ${token}`,
                        },
                      });
                    } else {
                      response = await api.post('/video-advertisements/admin/pricing-configs', newPricingConfig, {
                        headers: {
                          'Authorization': `Bearer ${token}`,
                        },
                      });
                    }

                    if (response.data.success) {
                      toast.success(editingPricingConfig ? 'Pricing configuration updated successfully' : 'Pricing configuration created successfully');
                      setShowPricingModal(false);
                      setEditingPricingConfig(null);
                      fetchData();
                    } else {
                      toast.error(response.data.message || 'Failed to save pricing configuration');
                    }
                  } catch (error) {
                    console.error('Error saving pricing config:', error);
                    toast.error('Error saving pricing configuration');
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
          <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Placement Area *</label>
                      <select
                        value={newPricingConfig.placement_area}
                        onChange={(e) => setNewPricingConfig({ ...newPricingConfig, placement_area: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        required
                        disabled={isViewerAdmin || !!editingPricingConfig}
                      >
                        <option value="top_banner_highest_visibility">Top Banner - Highest Visibility</option>
                        <option value="main_blue_area_prime_real_estate">Main Blue Area - Prime Real Estate</option>
                        <option value="main_blue_area_b2b_platform">Main Blue Area - B2B Platform</option>
                        <option value="purple_pink_content_area">Purple Pink Content Area</option>
                      </select>
            </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Advertisement Type *</label>
                      <select
                        value={newPricingConfig.advertisement_type}
                        onChange={(e) => setNewPricingConfig({ ...newPricingConfig, advertisement_type: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        required
                        disabled={isViewerAdmin || !!editingPricingConfig}
                      >
                        <option value="video">Video</option>
                        <option value="image">Image</option>
                        <option value="animation">Animation</option>
                        <option value="general">General</option>
                        <option value="comprehensive">Comprehensive</option>
                        <option value="covering">Covering</option>
                      </select>
                      </div>
                        </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time Unit *</label>
                      <select
                        value={newPricingConfig.duration_unit}
                        onChange={(e) => setNewPricingConfig({ ...newPricingConfig, duration_unit: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        required
                        disabled={isViewerAdmin || !!editingPricingConfig}
                      >
                        <option value="hour">Hour</option>
                        <option value="day">Day</option>
                        <option value="week">Week</option>
                        <option value="month">Month</option>
                      </select>
                        </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quitable/Closable *</label>
                      <select
                        value={newPricingConfig.is_quitable ? 'true' : 'false'}
                        onChange={(e) => setNewPricingConfig({ ...newPricingConfig, is_quitable: e.target.value === 'true' })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        required
                        disabled={isViewerAdmin || !!editingPricingConfig}
                      >
                        <option value="true">Yes (Quitable)</option>
                        <option value="false">No (Non-Quitable)</option>
                    </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (PKR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newPricingConfig.unit_price}
                      onChange={(e) => setNewPricingConfig({ ...newPricingConfig, unit_price: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="0.00"
                      required
                      disabled={isViewerAdmin}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Price per {newPricingConfig.duration_unit} for this configuration
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newPricingConfig.description}
                      onChange={(e) => setNewPricingConfig({ ...newPricingConfig, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      rows={3}
                      placeholder="Optional description for this pricing configuration"
                      disabled={isViewerAdmin}
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newPricingConfig.is_active}
                      onChange={(e) => setNewPricingConfig({ ...newPricingConfig, is_active: e.target.checked })}
                      className="rounded border-gray-300"
                      disabled={isViewerAdmin}
                    />
                    <label className="ml-2 text-sm text-gray-700">Active</label>
                    </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPricingModal(false);
                        setEditingPricingConfig(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      disabled={isViewerAdmin}
                    >
                      {editingPricingConfig ? 'Update' : 'Create'} Pricing Configuration
                  </button>
                </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Create Placement Modal */}
        {showCreatePlacement && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Advertisement Placement</h3>
                <form onSubmit={handleCreatePlacement} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={newPlacement.name}
                      onChange={(e) => setNewPlacement({ ...newPlacement, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newPlacement.description}
                      onChange={(e) => setNewPlacement({ ...newPlacement, description: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <select
                        value={newPlacement.type}
                        onChange={(e) => setNewPlacement({ ...newPlacement, type: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="banner">Banner</option>
                        <option value="sidebar">Sidebar</option>
                        <option value="content">Content</option>
                        <option value="footer">Footer</option>
                        <option value="popup">Popup</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Position</label>
                      <input
                        type="text"
                        value={newPlacement.position}
                        onChange={(e) => setNewPlacement({ ...newPlacement, position: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="e.g., mobile-top, desktop-sidebar"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Device Type</label>
                      <select
                        value={newPlacement.device_type}
                        onChange={(e) => setNewPlacement({ ...newPlacement, device_type: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="all">All Devices</option>
                        <option value="mobile">Mobile Only</option>
                        <option value="tablet">Tablet Only</option>
                        <option value="desktop">Desktop Only</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max Ads</label>
                      <input
                        type="number"
                        value={newPlacement.max_ads}
                        onChange={(e) => setNewPlacement({ ...newPlacement, max_ads: parseInt(e.target.value) })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <input
                        type="number"
                        value={newPlacement.priority}
                        onChange={(e) => setNewPlacement({ ...newPlacement, priority: parseInt(e.target.value) })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPlacement.allow_user_selection}
                        onChange={(e) => setNewPlacement({ ...newPlacement, allow_user_selection: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Allow User Selection</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPlacement.visible_to_guests}
                        onChange={(e) => setNewPlacement({ ...newPlacement, visible_to_guests: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Visible to Guests</span>
                    </label>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreatePlacement(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Create Placement
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Application Review Modal */}
        {showApplicationModal && selectedApplication && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Review Advertisement Application</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Application Details */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Application Details</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Title</label>
                        <p className="text-sm text-gray-900">{selectedApplication.title}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <p className="text-sm text-gray-900">{selectedApplication.description}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Budget</label>
                        <p className="text-sm text-gray-900">PKR {selectedApplication.budget.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Duration</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedApplication.start_date).toLocaleDateString()} - {new Date(selectedApplication.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Applicant</label>
                        <p className="text-sm text-gray-900">
                          {selectedApplication.doctor.doctor_name} ({selectedApplication.doctor.clinic_name})
                        </p>
                        <p className="text-sm text-gray-500">{selectedApplication.doctor.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Available Placements */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Available Placements</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {placements
                        .filter(p => p.status === 'active')
                        .map((placement) => (
                          <div key={placement.id} className="border rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium text-sm">{placement.name}</h5>
                                <p className="text-xs text-gray-500">{placement.description}</p>
                                <p className="text-xs text-gray-500">
                                  Capacity: {placement.current_ads}/{placement.max_ads}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  handleApproveApplication(selectedApplication.id, placement.id, '');
                                }}
                                className={`bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 ${isViewerAdmin ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : ''}`}
                                disabled={placement.current_ads >= placement.max_ads || isViewerAdmin}
                              >
                                Approve
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <div className="flex gap-3">
                    {(selectedApplication.status?.toLowerCase() === 'pending' || selectedApplication.status?.toLowerCase() === 'rejected') && (
                      <>
                  {isViewerAdmin ? (
                    <>
                      <button
                        disabled
                        className="bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed"
                      >
                        ✓ Approve Application (View Only)
                      </button>
                      <button
                        disabled
                        className="bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed"
                      >
                        ✗ Reject Application (View Only)
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          handleApproveApplication(selectedApplication.id, '', '');
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                      >
                        ✓ Approve Application
                      </button>
                      <button
                        onClick={() => {
                          // Use standard rejection reason, no admin notes
                          handleRejectApplication(selectedApplication.id, 'Team did not find it suitable for this', '');
                        }}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                      >
                        ✗ Reject Application
                      </button>
                    </>
                  )}
                      </>
                    )}
                    {((selectedApplication.status?.toLowerCase() === 'active' || selectedApplication.status?.toLowerCase() === 'approved' || selectedApplication.status?.toLowerCase() === 'paused')) && (
                  <button
                    onClick={() => {
                          if (selectedApplication.status?.toLowerCase() === 'paused') {
                            if (window.confirm('Are you sure you want to resume this advertisement? It will start displaying again.')) {
                              handleStopAdvertisement(selectedApplication.id, 'resume');
                              setShowApplicationModal(false);
                              setSelectedApplication(null);
                            }
                          } else {
                            openStopModal(selectedApplication);
                            setShowApplicationModal(false);
                          }
                        }}
                        className={`px-4 py-2 rounded-md text-white transition-colors ${
                          selectedApplication.status?.toLowerCase() === 'paused'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-orange-600 hover:bg-orange-700'
                        }`}
                      >
                        {selectedApplication.status?.toLowerCase() === 'paused' ? '▶ Resume Advertisement' : '⏸ Stop/Pause Advertisement'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowApplicationModal(false);
                      setSelectedApplication(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stop/Resume Advertisement Confirmation Modal */}
        {showStopModal && stopModalApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {stopModalApplication.status?.toLowerCase() === 'paused' ? (
                  // Resume Modal
                  <>
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
                      <span className="text-2xl">▶</span>
      </div>
                    <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                      Resume Advertisement
                    </h3>
                    <p className="text-sm text-gray-600 text-center mb-4">
                      Are you sure you want to resume this advertisement? It will start displaying again.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-1">Advertisement Details:</p>
                      <p className="text-sm text-gray-700"><strong>Title:</strong> {stopModalApplication.title}</p>
                      {stopModalApplication.doctor && (
                        <p className="text-sm text-gray-700">
                          <strong>Advertiser:</strong> {stopModalApplication.doctor.doctor_name} ({stopModalApplication.doctor.clinic_name})
                        </p>
                      )}
                      <p className="text-sm text-gray-700">
                        <strong>Status:</strong> <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusColor(stopModalApplication.status)}`}>
                          {stopModalApplication.status}
                        </span>
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setShowStopModal(false);
                          setStopModalApplication(null);
                        }}
                        disabled={isStopping}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          handleStopAdvertisement(stopModalApplication.id, 'resume');
                        }}
                        disabled={isStopping}
                        className="flex-1 px-4 py-2 rounded-md text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700"
                      >
                        {isStopping ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Resuming...
                          </span>
                        ) : (
                          '▶ Resume'
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  // Stop Modal with Two Types
                  <>
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-orange-100 rounded-full">
                      <span className="text-2xl">⏸</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                      Stop Advertisement
                    </h3>
                    <p className="text-sm text-gray-600 text-center mb-4">
                      Choose how you want to stop this advertisement:
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-1">Advertisement Details:</p>
                      <p className="text-sm text-gray-700"><strong>Title:</strong> {stopModalApplication.title}</p>
                      {stopModalApplication.doctor && (
                        <p className="text-sm text-gray-700">
                          <strong>Advertiser:</strong> {stopModalApplication.doctor.doctor_name} ({stopModalApplication.doctor.clinic_name})
                        </p>
                      )}
                      <p className="text-sm text-gray-700">
                        <strong>Status:</strong> <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusColor(stopModalApplication.status)}`}>
                          {stopModalApplication.status}
                        </span>
                      </p>
                    </div>

                    {/* Stop Type Options */}
                    <div className="mb-4 space-y-3">
                      {isFromWaitingTab && (
                        <label className={`flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${stopType === 'change-area' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                          <input
                            type="radio"
                            name="stopType"
                            value="change-area"
                            checked={stopType === 'change-area'}
                            onChange={(e) => setStopType(e.target.value as 'permanent' | 'temporary' | 'change-area')}
                            className="mt-1 mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 flex items-center">
                              <span className="text-purple-600 mr-2">🔄</span>
                              Change Area (Move to Available Area)
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Move this advertisement to a different area that has available space. This will automatically activate it.</p>
                          </div>
                        </label>
                      )}
                      
                      <label className={`flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${stopType === 'permanent' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                        <input
                          type="radio"
                          name="stopType"
                          value="permanent"
                          checked={stopType === 'permanent'}
                          onChange={(e) => setStopType(e.target.value as 'permanent' | 'temporary' | 'change-area')}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 flex items-center">
                            <span className="text-orange-600 mr-2">⏸</span>
                            Permanent Stop
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Pause indefinitely until manually resumed. You can resume it anytime.</p>
                        </div>
                      </label>

                      <label className={`flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${stopType === 'temporary' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                        <input
                          type="radio"
                          name="stopType"
                          value="temporary"
                          checked={stopType === 'temporary'}
                          onChange={(e) => setStopType(e.target.value as 'permanent' | 'temporary' | 'change-area')}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 flex items-center">
                            <span className="text-blue-600 mr-2">⏱</span>
                            Temporary Stop
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Pause for a specific duration. It will automatically resume after the selected time.</p>
                          {stopType === 'temporary' && (
                            <div className="mt-3 flex items-center space-x-2">
                              <input
                                type="number"
                                min="1"
                                value={pauseDuration}
                                onChange={(e) => setPauseDuration(parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="1"
                              />
                              <select
                                value={pauseDurationUnit}
                                onChange={(e) => setPauseDurationUnit(e.target.value as 'hours' | 'days' | 'weeks')}
                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                                <option value="weeks">Weeks</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setShowStopModal(false);
                          setStopModalApplication(null);
                          setStopType('permanent');
                          setIsFromWaitingTab(false);
                        }}
                        disabled={isStopping}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          handleStopAdvertisement(
                            stopModalApplication.id,
                            'pause',
                            stopType,
                            stopType === 'temporary' ? pauseDuration : undefined,
                            stopType === 'temporary' ? pauseDurationUnit : undefined
                          );
                        }}
                        disabled={isStopping || (stopType === 'temporary' && (!pauseDuration || pauseDuration < 1))}
                        className={`flex-1 px-4 py-2 rounded-md text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          stopType === 'change-area' 
                            ? 'bg-purple-600 hover:bg-purple-700' 
                            : 'bg-orange-600 hover:bg-orange-700'
                        }`}
                      >
                        {isStopping ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {stopType === 'change-area' ? 'Moving...' : 'Stopping...'}
                          </span>
                        ) : (
                          stopType === 'change-area' ? '🔄 Change Area' : '⏸ Stop'
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bulk Toggle Modal */}
        {showBulkToggleModal && bulkToggleAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
              <div className="p-6">
                {bulkToggleAction === 'pause' ? (
                  <>
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-orange-100 rounded-full">
                      <span className="text-2xl">⏸</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                      Stop All Active Advertisements
                    </h3>
                    <p className="text-sm text-gray-600 text-center mb-4">
                      Are you sure you want to stop all active advertisements? This will pause all currently showing ads.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">This will affect:</p>
                      <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                        <li>All active advertisements</li>
                        <li>All approved advertisements</li>
                        <li>Advertisement area counters will be updated</li>
                        <li>You can resume them later using "Resume All"</li>
                      </ul>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setShowBulkToggleModal(false);
                          setBulkToggleAction(null);
                        }}
                        disabled={isBulkToggling}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleBulkToggle('pause')}
                        disabled={isBulkToggling}
                        className="flex-1 px-4 py-2 rounded-md text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-orange-600 hover:bg-orange-700"
                      >
                        {isBulkToggling ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Stopping...
                          </span>
                        ) : (
                          '⏸ Stop All'
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
                      <span className="text-2xl">▶</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                      Resume All Paused Advertisements
                    </h3>
                    <p className="text-sm text-gray-600 text-center mb-4">
                      Are you sure you want to resume all paused advertisements? This will activate all paused ads (if their areas have space).
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">This will affect:</p>
                      <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                        <li>All paused advertisements</li>
                        <li>Only ads in areas with available space will resume</li>
                        <li>Advertisement area counters will be updated</li>
                        <li>Ads in full areas will remain paused</li>
                      </ul>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setShowBulkToggleModal(false);
                          setBulkToggleAction(null);
                        }}
                        disabled={isBulkToggling}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleBulkToggle('resume')}
                        disabled={isBulkToggling}
                        className="flex-1 px-4 py-2 rounded-md text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700"
                      >
                        {isBulkToggling ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Resuming...
                          </span>
                        ) : (
                          '▶ Resume All'
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rotation & Display Settings Tab */}
        {activeTab === 'rotation-settings' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">⚙️ Rotation & Display Settings</h2>
                <p className="mt-1 text-sm text-gray-500">Control how ads rotate and how many can display simultaneously in each placement</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placement Area</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rotation Interval (seconds)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Concurrent Ads</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto Rotation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {placements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No placements found. Please create placements first.
                        </td>
                      </tr>
                    ) : (
                      placements.map((placement) => {
                        const rotationConfig = rotationConfigs.find((rc: any) => rc.area_name === placement.area_name);
                        const isEditing = editingRotationConfig?.area_name === placement.area_name;
                        
                        return (
                          <tr key={placement.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {placement.display_name || placement.area_name?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </div>
                              <div className="text-xs text-gray-500">{placement.area_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="1"
                                  max="300"
                                  value={editingRotationConfig.rotation_interval_seconds || placement.rotation_interval_seconds || 5}
                                  onChange={(e) => setEditingRotationConfig({
                                    ...editingRotationConfig,
                                    rotation_interval_seconds: parseInt(e.target.value) || 5
                                  })}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm"
                                  disabled={isViewerAdmin}
                                />
                              ) : (
                                <span className="text-sm text-gray-900">
                                  {rotationConfig?.rotation_interval_seconds || placement.rotation_interval_seconds || 5} seconds
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={editingRotationConfig.max_concurrent_ads || placement.max_concurrent_ads || 1}
                                  onChange={(e) => setEditingRotationConfig({
                                    ...editingRotationConfig,
                                    max_concurrent_ads: parseInt(e.target.value) || 1
                                  })}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm"
                                  disabled={isViewerAdmin}
                                />
                              ) : (
                                <span className="text-sm text-gray-900">
                                  {rotationConfig?.max_concurrent_ads || placement.max_concurrent_ads || 1} ads
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isEditing ? (
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={editingRotationConfig.auto_rotation_enabled !== undefined ? editingRotationConfig.auto_rotation_enabled : (placement.auto_rotation_enabled !== undefined ? placement.auto_rotation_enabled : true)}
                                    onChange={(e) => setEditingRotationConfig({
                                      ...editingRotationConfig,
                                      auto_rotation_enabled: e.target.checked
                                    })}
                                    className="rounded border-gray-300"
                                    disabled={isViewerAdmin}
                                  />
                                  <span className="ml-2 text-sm text-gray-700">Enabled</span>
                                </label>
                              ) : (
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  (rotationConfig?.auto_rotation_enabled !== undefined ? rotationConfig.auto_rotation_enabled : (placement.auto_rotation_enabled !== undefined ? placement.auto_rotation_enabled : true))
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {(rotationConfig?.auto_rotation_enabled !== undefined ? rotationConfig.auto_rotation_enabled : (placement.auto_rotation_enabled !== undefined ? placement.auto_rotation_enabled : true)) ? 'Enabled' : 'Disabled'}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                (rotationConfig?.is_active !== undefined ? rotationConfig.is_active : (placement.is_active !== undefined ? placement.is_active : true))
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {(rotationConfig?.is_active !== undefined ? rotationConfig.is_active : (placement.is_active !== undefined ? placement.is_active : true)) ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {isEditing ? (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={async () => {
                                      try {
                                        setIsUpdatingRotation(true);
                                        const token = getAccessToken();
                                        if (!token) {
                                          toast.error('Authentication required');
                                          return;
                                        }
                                        const normalizeApiUrl = (baseUrl: string): string => {
                                          if (!baseUrl) {
          const apiUrl = getApiUrl();
          return apiUrl.replace('/api', '');
        }
                                          const url = baseUrl.trim();
                                          if (url.endsWith('/api')) {
                                            return url.slice(0, -4);
                                          }
                                          return url;
                                        };
                                        const apiUrl = getApiUrl();
      const baseApiUrl = normalizeApiUrl(apiUrl);
                                        
                                        // Update area config
                                        const areaResponse = await api.put(`/video-advertisements/admin/areas/${placement.id}`, {
                                          rotation_interval_seconds: editingRotationConfig.rotation_interval_seconds,
                                          max_concurrent_ads: editingRotationConfig.max_concurrent_ads,
                                          auto_rotation_enabled: editingRotationConfig.auto_rotation_enabled
                                        }, {
                                          headers: {
                                            'Authorization': `Bearer ${token}`,
                                          },
                                        });

                                        if (areaResponse.data.success) {
                                          // Update or create rotation config
                                          let rotationResponse;
                                          if (rotationConfig) {
                                            // Update existing rotation config
                                            rotationResponse = await api.put(`/video-advertisements/admin/rotation-configs/${placement.area_name}`, {
                                              rotation_interval_seconds: editingRotationConfig.rotation_interval_seconds,
                                              max_concurrent_ads: editingRotationConfig.max_concurrent_ads,
                                              auto_rotation_enabled: editingRotationConfig.auto_rotation_enabled
                                            }, {
                                              headers: {
                                                'Authorization': `Bearer ${token}`,
                                              },
                                            });
                                          } else {
                                            // Create new rotation config if it doesn't exist
                                            rotationResponse = await api.post('/video-advertisements/admin/rotation-configs', {
                                              area_name: placement.area_name,
                                              rotation_interval_seconds: editingRotationConfig.rotation_interval_seconds,
                                              max_concurrent_ads: editingRotationConfig.max_concurrent_ads,
                                              auto_rotation_enabled: editingRotationConfig.auto_rotation_enabled,
                                              is_active: true
                                            }, {
                                              headers: {
                                                'Authorization': `Bearer ${token}`,
                                              },
                                            });
                                          }
                                          
                                          // Check rotation config response (non-blocking - area config update is primary)
                                          if (!rotationResponse?.data?.success) {
                                            console.warn('Rotation config update/create failed, but area config was updated');
                                          }
                                          
                                          toast.success('Rotation settings updated successfully');
                                          setEditingRotationConfig(null);
                                          fetchData();
                                        } else {
                                          toast.error(areaResponse.data.message || 'Failed to update rotation settings');
                                        }
                                      } catch (error) {
                                        console.error('Error updating rotation settings:', error);
                                        toast.error('Error updating rotation settings');
                                      } finally {
                                        setIsUpdatingRotation(false);
                                      }
                                    }}
                                    disabled={isViewerAdmin || isUpdatingRotation}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    {isUpdatingRotation ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingRotationConfig(null);
                                    }}
                                    className="text-gray-600 hover:text-gray-900"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingRotationConfig({
                                      area_name: placement.area_name,
                                      rotation_interval_seconds: rotationConfig?.rotation_interval_seconds || placement.rotation_interval_seconds || 5,
                                      max_concurrent_ads: rotationConfig?.max_concurrent_ads || placement.max_concurrent_ads || 1,
                                      auto_rotation_enabled: rotationConfig?.auto_rotation_enabled !== undefined ? rotationConfig.auto_rotation_enabled : (placement.auto_rotation_enabled !== undefined ? placement.auto_rotation_enabled : true),
                                      is_active: rotationConfig?.is_active !== undefined ? rotationConfig.is_active : (placement.is_active !== undefined ? placement.is_active : true)
                                    });
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                  disabled={isViewerAdmin}
                                >
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">ℹ️ About Rotation & Display Settings</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li><strong>Rotation Interval:</strong> How long (in seconds) each ad displays before rotating to the next one</li>
                <li><strong>Max Concurrent Ads:</strong> Maximum number of ads that can display simultaneously in this placement</li>
                <li><strong>Auto Rotation:</strong> Whether ads automatically rotate or require manual navigation</li>
              </ul>
            </div>
          </div>
        )}

        {/* Approval Success Modal */}
        {showApprovalSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Advertisement Application Approved Successfully!
                </h3>
                <p className="text-sm text-gray-600 text-center mb-6">
                  User has been notified via email.
                </p>
                <button
                  onClick={() => setShowApprovalSuccessModal(false)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}