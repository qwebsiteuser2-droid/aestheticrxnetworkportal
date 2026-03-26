'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/getApiUrl';

interface Advertisement {
  id: string;
  title: string;
  description: string;
  type: string;
  image_url: string;
  target_url: string;
  button_text: string;
  button_color: string;
  background_color: string;
  text_color: string;
  placement: {
    id: string;
    name: string;
    type: string;
    position: string;
    dimensions: {
      width: number;
      height: number;
    };
    styles: {
      background_color?: string;
      border_radius?: number;
      padding?: number;
      margin?: number;
      z_index?: number;
    };
  };
}

interface AdvertisementDisplayProps {
  placementId?: string;
  placementType?: string;
  placementPosition?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  className?: string;
  style?: React.CSSProperties;
}

export default function AdvertisementDisplay({ 
  placementId, 
  placementType, 
  placementPosition, 
  deviceType,
  className = '', 
  style = {} 
}: AdvertisementDisplayProps) {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [detectedDeviceType, setDetectedDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  // Device detection
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDetectedDeviceType('mobile');
      } else if (width < 1024) {
        setDetectedDeviceType('tablet');
      } else {
        setDetectedDeviceType('desktop');
      }
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  useEffect(() => {
    fetchAdvertisements();
  }, [placementId, placementType, placementPosition, deviceType, detectedDeviceType]);

  const fetchAdvertisements = async () => {
    try {
      const params = new URLSearchParams();
      if (placementId) params.append('placement_id', placementId);
      if (placementType) params.append('placement_type', placementType);
      if (placementPosition) params.append('placement_position', placementPosition);
      
      // Use provided deviceType or detected device type
      const currentDeviceType = deviceType || detectedDeviceType;
      params.append('device_type', currentDeviceType);
      
      // Add guest_view parameter for non-authenticated users
      params.append('guest_view', 'true');

      const response = await fetch(`${getApiUrl()}/active?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setAdvertisements(data.data || []);
      }
    } catch (error: unknown) {
      console.error('Error fetching advertisements:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackImpression = async (adId: string) => {
    try {
      await fetch(`${getApiUrl()}/${adId}/impression`, {
        method: 'POST'
      });
    } catch (error: unknown) {
      console.error('Error tracking impression:', error);
    }
  };

  const trackClick = async (adId: string) => {
    try {
      await fetch(`${getApiUrl()}/${adId}/click`, {
        method: 'POST'
      });
    } catch (error: unknown) {
      console.error('Error tracking click:', error);
    }
  };

  const handleAdClick = (ad: Advertisement) => {
    trackClick(ad.id);
    if (ad.target_url) {
      window.open(ad.target_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Auto-rotate ads if multiple ads in same placement
  useEffect(() => {
    if (advertisements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
      }, 10000); // Rotate every 10 seconds

      return () => clearInterval(interval);
    }
  }, [advertisements.length]);

  // Track impression when ad is displayed
  useEffect(() => {
    if (advertisements.length > 0) {
      trackImpression(advertisements[currentAdIndex].id);
    }
  }, [advertisements, currentAdIndex]);

  if (loading) {
    return (
      <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} style={style}>
        <div className="h-32 flex items-center justify-center">
          <span className="text-gray-400 text-sm">Loading advertisement...</span>
        </div>
      </div>
    );
  }

  if (advertisements.length === 0) {
    return null; // Don't render anything if no ads
  }

  const currentAd = advertisements[currentAdIndex];
  const placement = currentAd.placement;

  // Get responsive dimensions based on device type
  const getResponsiveDimensions = () => {
    const currentDeviceType = deviceType || detectedDeviceType;
    const responsiveBreakpoints = (placement as any).responsive_breakpoints;
    
    if (responsiveBreakpoints && responsiveBreakpoints[currentDeviceType]) {
      return responsiveBreakpoints[currentDeviceType];
    }
    
    return placement.dimensions;
  };

  const responsiveDimensions = getResponsiveDimensions();

  const adStyle: React.CSSProperties = {
    backgroundColor: currentAd.background_color || placement.styles?.background_color || '#ffffff',
    color: currentAd.text_color || '#000000',
    borderRadius: placement.styles?.border_radius || 8,
    padding: placement.styles?.padding || 16,
    margin: placement.styles?.margin || 0,
    zIndex: placement.styles?.z_index || 1,
    width: '100%',
    maxWidth: responsiveDimensions.width,
    height: responsiveDimensions.height,
    ...style
  };

  return (
    <div className={`advertisement-container ${className}`} style={adStyle}>
      <div 
        className="advertisement-content cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => handleAdClick(currentAd)}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {/* Image */}
        {currentAd.image_url && (
          <div className="advertisement-image mb-3">
            <img
              src={currentAd.image_url}
              alt={currentAd.title}
              className="w-full h-auto rounded"
              style={{ maxHeight: '60%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Content */}
        <div className="advertisement-text flex-1">
          <h3 className="advertisement-title font-semibold text-lg mb-2" style={{ color: currentAd.text_color }}>
            {currentAd.title}
          </h3>
          {currentAd.description && (
            <p className="advertisement-description text-sm mb-3" style={{ color: currentAd.text_color }}>
              {currentAd.description}
            </p>
          )}
        </div>

        {/* Button */}
        {currentAd.button_text && currentAd.target_url && (
          <div className="advertisement-button mt-auto">
            <button
              className="px-4 py-2 rounded font-medium text-sm transition-colors"
              style={{
                backgroundColor: currentAd.button_color || '#3b82f6',
                color: '#ffffff',
                border: 'none'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleAdClick(currentAd);
              }}
            >
              {currentAd.button_text}
            </button>
          </div>
        )}

        {/* Ad indicator removed */}
      </div>

      {/* Multiple ads indicator */}
      {advertisements.length > 1 && (
        <div className="advertisement-dots flex justify-center mt-2 space-x-1">
          {advertisements.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentAdIndex ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              onClick={() => setCurrentAdIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Device-specific placement components
export function HeaderBanner({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <AdvertisementDisplay
      placementType="banner"
      placementPosition="desktop-top"
      deviceType="desktop"
      className={`header-banner ${className}`}
      style={style}
    />
  );
}

export function MobileHeaderBanner({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <AdvertisementDisplay
      placementType="banner"
      placementPosition="mobile-top"
      deviceType="mobile"
      className={`mobile-header-banner ${className}`}
      style={style}
    />
  );
}

export function TabletHeaderBanner({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <AdvertisementDisplay
      placementType="banner"
      placementPosition="tablet-top"
      deviceType="tablet"
      className={`tablet-header-banner ${className}`}
      style={style}
    />
  );
}

export function SidebarAd({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <AdvertisementDisplay
      placementType="sidebar"
      placementPosition="desktop-sidebar-top"
      deviceType="desktop"
      className={`sidebar-ad ${className}`}
      style={style}
    />
  );
}

export function MobileSidebarAd({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <AdvertisementDisplay
      placementType="sidebar"
      placementPosition="mobile-sidebar"
      deviceType="mobile"
      className={`mobile-sidebar-ad ${className}`}
      style={style}
    />
  );
}

export function TabletSidebarAd({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <AdvertisementDisplay
      placementType="sidebar"
      placementPosition="tablet-sidebar"
      deviceType="tablet"
      className={`tablet-sidebar-ad ${className}`}
      style={style}
    />
  );
}

export function ContentAd({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <AdvertisementDisplay
      placementType="content"
      placementPosition="desktop-content"
      deviceType="desktop"
      className={`content-ad ${className}`}
      style={style}
    />
  );
}

export function MobileContentAd({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <AdvertisementDisplay
      placementType="content"
      placementPosition="mobile-content"
      deviceType="mobile"
      className={`mobile-content-ad ${className}`}
      style={style}
    />
  );
}

export function FooterBanner({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <AdvertisementDisplay
      placementType="footer"
      placementPosition="desktop-bottom"
      deviceType="desktop"
      className={`footer-banner ${className}`}
      style={style}
    />
  );
}

export function MobileFooterBanner({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <AdvertisementDisplay
      placementType="footer"
      placementPosition="mobile-bottom"
      deviceType="mobile"
      className={`mobile-footer-banner ${className}`}
      style={style}
    />
  );
}

// Responsive components that automatically detect device
export function ResponsiveHeaderBanner({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <HeaderBanner className={className} style={style} />
      </div>
      {/* Tablet */}
      <div className="hidden md:block lg:hidden">
        <TabletHeaderBanner className={className} style={style} />
      </div>
      {/* Mobile */}
      <div className="block md:hidden">
        <MobileHeaderBanner className={className} style={style} />
      </div>
    </>
  );
}

export function ResponsiveFooterBanner({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <FooterBanner className={className} style={style} />
      </div>
      {/* Mobile */}
      <div className="block lg:hidden">
        <MobileFooterBanner className={className} style={style} />
      </div>
    </>
  );
}

// Legacy component for backward compatibility
export function MobileBanner({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return <MobileHeaderBanner className={className} style={style} />;
}
