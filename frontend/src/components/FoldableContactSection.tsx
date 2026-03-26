'use client';

import { useState, useEffect } from 'react';
import { 
  PhoneIcon, 
  EnvelopeIcon, 
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ShareIcon,
  LinkIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  CameraIcon,
  DocumentTextIcon,
  HeartIcon,
  StarIcon,
  FireIcon,
  BoltIcon,
  SparklesIcon,
  GiftIcon
} from '@heroicons/react/24/outline';
import api from '@/lib/api';

interface ContactPlatform {
  id: string;
  platform_name: string;
  platform_type: string;
  display_name: string;
  contact_value: string;
  icon_name: string;
  custom_icon_url?: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

export default function FoldableContactSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [platforms, setPlatforms] = useState<ContactPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContactPlatforms();
  }, []);

  const fetchContactPlatforms = async () => {
    try {
      // Use centralized API instance
      const response = await api.get('/contact-platforms');
      
      if (response.data.success) {
        setPlatforms(response.data.platforms || []);
      } else {
        setError(response.data.message || 'Failed to load contact platforms.');
      }
    } catch (error: unknown) {
      console.error('Error fetching contact platforms:', error);
      setError('Network error or server is unreachable.');
    } finally {
      setLoading(false);
    }
  };

  const getIconComponent = (platform: ContactPlatform) => {
    // If custom icon URL exists, use it
    if (platform.custom_icon_url) {
      const { getApiUrl } = require('@/lib/getApiUrl');
      const apiUrl = getApiUrl().replace('/api', '');
      return (
        <div className="w-6 h-6 bg-white rounded flex items-center justify-center overflow-hidden shadow-sm">
          <img 
            src={`${apiUrl}${platform.custom_icon_url}`} 
            alt={platform.display_name}
            className="w-full h-full object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              const fallbackUrl = `${apiUrl}/api/images${platform.custom_icon_url}`;
              if (target.src !== fallbackUrl) {
                target.src = fallbackUrl;
              } else {
                if (target) {
                  target.style.display = 'none';
                  if (target.nextElementSibling) {
                    (target.nextElementSibling as HTMLElement).classList.remove('hidden');
                  }
                }
              }
            }}
          />
          <div className="hidden w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
            📷
          </div>
        </div>
      );
    }
    
    // Otherwise use the predefined icon
    switch (platform.icon_name) {
      case 'PhoneIcon': return <PhoneIcon className="w-6 h-6" />;
      case 'EnvelopeIcon': return <EnvelopeIcon className="w-6 h-6" />;
      case 'GlobeAltIcon': return <GlobeAltIcon className="w-6 h-6" />;
      case 'ChatBubbleLeftRightIcon': return <ChatBubbleLeftRightIcon className="w-6 h-6" />;
      case 'ShareIcon': return <ShareIcon className="w-6 h-6" />;
      case 'LinkIcon': return <LinkIcon className="w-6 h-6" />;
      case 'UserIcon': return <UserIcon className="w-6 h-6" />;
      case 'CalendarIcon': return <CalendarIcon className="w-6 h-6" />;
      case 'ClockIcon': return <ClockIcon className="w-6 h-6" />;
      case 'MapPinIcon': return <MapPinIcon className="w-6 h-6" />;
      case 'VideoCameraIcon': return <VideoCameraIcon className="w-6 h-6" />;
      case 'MicrophoneIcon': return <MicrophoneIcon className="w-6 h-6" />;
      case 'CameraIcon': return <CameraIcon className="w-6 h-6" />;
      case 'DocumentTextIcon': return <DocumentTextIcon className="w-6 h-6" />;
      case 'HeartIcon': return <HeartIcon className="w-6 h-6" />;
      case 'StarIcon': return <StarIcon className="w-6 h-6" />;
      case 'FireIcon': return <FireIcon className="w-6 h-6" />;
      case 'LightningBoltIcon': return <BoltIcon className="w-6 h-6" />;
      case 'SparklesIcon': return <SparklesIcon className="w-6 h-6" />;
      case 'GiftIcon': return <GiftIcon className="w-6 h-6" />;
      default: return <GlobeAltIcon className="w-6 h-6" />;
    }
  };

  const getContactLink = (platform: ContactPlatform) => {
    switch (platform.platform_type) {
      case 'phone':
        return `https://wa.me/${platform.contact_value.replace(/\D/g, '')}`;
      case 'email':
        return `mailto:${platform.contact_value}`;
      case 'social':
      case 'website':
      case 'other':
        return platform.contact_value;
      default:
        return platform.contact_value;
    }
  };

  const getContactTarget = (platform: ContactPlatform) => {
    return platform.platform_type === 'email' ? '_self' : '_blank';
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg p-6">
        <div className="text-center py-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || platforms.length === 0) {
      return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg p-4 sm:p-6">
          <div className="text-center py-3 sm:py-4 px-2">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 mr-2 sm:mr-3 text-blue-600" />
              Contact Us
            </h2>
            <p className="text-xs sm:text-sm lg:text-md text-gray-600">
              {error || 'No contact information available at the moment.'}
            </p>
          </div>
        </div>
      );
  }

  return (
    <div
      className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg p-4 sm:p-6 transition-all duration-300 ease-in-out"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Folded Header - Always Visible */}
      <div className="text-center py-3 sm:py-4 cursor-pointer px-2" onClick={() => setIsExpanded(!isExpanded)}>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center justify-center">
          <ChatBubbleLeftRightIcon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 mr-2 sm:mr-3 text-blue-600" />
          Contact Us
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5 sm:w-6 sm:h-6 ml-2 text-gray-600" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 sm:w-6 sm:h-6 ml-2 text-gray-600" />
          )}
        </h2>
        <p className="text-xs sm:text-sm lg:text-md text-gray-600">
          {isExpanded ? 'Tap to collapse' : 'Tap to expand for contact options'}
        </p>
      </div>

      {/* Expanded Content - Visible on hover/click */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-screen opacity-100 mt-4 sm:mt-6' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {platforms
            .filter(platform => platform.is_active)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((platform) => (
              <a
                key={platform.id}
                href={getContactLink(platform)}
                target={getContactTarget(platform)}
                rel="noopener noreferrer"
                className="flex items-center p-3 sm:p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 group"
              >
                <div 
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white mr-3 sm:mr-4 group-hover:scale-110 transition-transform flex-shrink-0"
                  style={{ backgroundColor: platform.color }}
                >
                  {getIconComponent(platform)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{platform.display_name}</p>
                  <p className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                    {platform.contact_value}
                  </p>
                </div>
              </a>
            ))}
        </div>

        {/* Contact Message */}
        <div className="mt-4 sm:mt-6 bg-blue-100 p-3 sm:p-4 rounded-lg border border-blue-200">
          <p className="text-xs sm:text-sm text-blue-800 text-center">
            <strong>Need help?</strong> Reach out to us through any of the channels above. 
            We're here to assist you with any questions or concerns.
          </p>
        </div>
      </div>
    </div>
  );
}