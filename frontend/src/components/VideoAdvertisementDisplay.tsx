'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/getApiUrl';

interface Slide {
  url: string;
  type: 'image' | 'video' | 'animation';
  title?: string;
  description?: string;
  duration?: number;
  thumbnail?: string;
}

interface VideoAdvertisement {
  id: string;
  title: string;
  description: string;
  type: string;
  video_url?: string;
  thumbnail_url?: string;
  image_url?: string;
  content?: string;
  target_url?: string;
  button_text?: string;
  button_color?: string;
  background_color?: string;
  text_color?: string;
  duration_seconds: number;
  selected_area: string;
  doctor?: {
    doctor_name: string;
    clinic_name: string;
  };
  is_quitable?: boolean;
  is_closed_by_user?: boolean;
  // Slides support
  slides?: Slide[];
  slide_count?: number;
  slide_interval_seconds?: number;
  auto_slide_enabled?: boolean;
  // Audio support
  audio_enabled?: boolean;
}

interface VideoAdvertisementDisplayProps {
  areaName: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop'; // Optional - auto-detected if not provided
  className?: string;
  style?: React.CSSProperties;
}

export default function VideoAdvertisementDisplay({ 
  areaName, 
  deviceType, // Now optional - will auto-detect
  className = '', 
  style = {} 
}: VideoAdvertisementDisplayProps) {
  const [advertisements, setAdvertisements] = useState<VideoAdvertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0); // For slides within an ad
  const [detectedDeviceType, setDetectedDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [closedAds, setClosedAds] = useState<Set<string>>(new Set());
  const [rotationInterval, setRotationInterval] = useState<NodeJS.Timeout | null>(null);
  const [slideInterval, setSlideInterval] = useState<NodeJS.Timeout | null>(null);
  const [isSlidePaused, setIsSlidePaused] = useState(false); // User can pause slides
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [areaConfig, setAreaConfig] = useState<{ ads_closeable?: boolean; display_type?: string } | null>(null);
  const [rotationConfig, setRotationConfig] = useState<{
    rotation_interval_seconds: number;
    auto_rotation_enabled: boolean;
    max_concurrent_ads?: number;
  } | null>(null);
  const [trackedImpressions, setTrackedImpressions] = useState<Set<string>>(new Set());
  const [rotationCountdown, setRotationCountdown] = useState<number | null>(null);

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

  // Ad rotation logic (between different ads) - Uses admin settings
  useEffect(() => {
    // Clear any existing interval first
      if (rotationInterval) {
        clearInterval(rotationInterval);
      setRotationInterval(null);
      }

    // Only set up rotation if:
    // 1. There are multiple ads
    // 2. Rotation config exists
    // 3. Auto-rotation is enabled
    if (advertisements.length > 1 && rotationConfig && rotationConfig.auto_rotation_enabled) {
      // Use the rotation interval from admin settings (convert seconds to milliseconds)
      const intervalSeconds = (rotationConfig.rotation_interval_seconds || 5) * 1000;
      const rotationSeconds = rotationConfig.rotation_interval_seconds || 5;
      
      // Initialize countdown
      setRotationCountdown(rotationSeconds);
      
      console.log(`🔄 Setting up auto-rotation: ${rotationSeconds}s interval for ${advertisements.length} ads`);
      
      // Countdown timer (updates every second)
      const countdownInterval = setInterval(() => {
        setRotationCountdown(prev => {
          if (prev === null || prev <= 1) {
            return rotationSeconds; // Reset to full interval
          }
          return prev - 1;
        });
      }, 1000);
      
      // Rotation interval (rotates ads)
      const interval = setInterval(() => {
        setCurrentAdIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % advertisements.length;
          console.log(`🔄 Rotating to ad ${nextIndex + 1} of ${advertisements.length}`);
          // Reset countdown when rotation happens
          setRotationCountdown(rotationSeconds);
          return nextIndex;
        });
      }, intervalSeconds);

      setRotationInterval(interval);

      return () => {
        clearInterval(interval);
        clearInterval(countdownInterval);
        setRotationInterval(null);
        setRotationCountdown(null);
      };
    } else if (advertisements.length > 1 && rotationConfig && !rotationConfig.auto_rotation_enabled) {
      // Auto-rotation is disabled - manual rotation only
      console.log('⏸️ Auto-rotation disabled - manual rotation only');
      setRotationCountdown(null);
    } else if (advertisements.length <= 1) {
      // Only one ad - no rotation needed
      console.log('ℹ️ Only one ad - no rotation needed');
      setRotationCountdown(null);
    } else {
      // No rotation config or no ads - clear everything
      setRotationCountdown(null);
    }
  }, [advertisements.length, rotationConfig?.rotation_interval_seconds, rotationConfig?.auto_rotation_enabled, rotationConfig]);

  // Slide rotation logic (within a single ad)
  useEffect(() => {
    if (advertisements.length === 0) return;
    
    const adjustedIndex = Math.min(currentAdIndex, advertisements.length - 1);
    const currentAd = advertisements[adjustedIndex];
    
    if (currentAd?.slides && currentAd.slides.length > 1 && currentAd.auto_slide_enabled !== false && !isSlidePaused) {
      // Set up slide rotation interval (default 10 seconds, or use configured value)
      const slideIntervalSeconds = (currentAd.slide_interval_seconds || 10) * 1000;
      const interval = setInterval(() => {
        setCurrentSlideIndex(prevIndex => (prevIndex + 1) % currentAd.slides!.length);
      }, slideIntervalSeconds);

      setSlideInterval(interval);

      return () => {
        clearInterval(interval);
      };
    } else {
      // Clear interval if paused or no slides
      if (slideInterval) {
        clearInterval(slideInterval);
        setSlideInterval(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAdIndex, advertisements.length, isSlidePaused]);

  // Reset pause state when ad changes
  useEffect(() => {
    setIsSlidePaused(false);
    setCurrentSlideIndex(0);
  }, [currentAdIndex]);

  // Touch/swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    const currentAd = advertisements[currentAdIndex];
    if (currentAd?.slides && currentAd.slides.length > 1) {
      if (isLeftSwipe) {
        // Swipe left - next slide
        setCurrentSlideIndex(prev => (prev + 1) % currentAd.slides!.length);
      } else if (isRightSwipe) {
        // Swipe right - previous slide
        setCurrentSlideIndex(prev => (prev - 1 + currentAd.slides!.length) % currentAd.slides!.length);
      }
    }
    
    setTouchStartX(null);
    setTouchEndX(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const currentAd = advertisements[currentAdIndex];
      if (currentAd?.slides && currentAd.slides.length > 1) {
        if (e.key === 'ArrowLeft') {
          setCurrentSlideIndex(prev => (prev - 1 + currentAd.slides!.length) % currentAd.slides!.length);
        } else if (e.key === 'ArrowRight') {
          setCurrentSlideIndex(prev => (prev + 1) % currentAd.slides!.length);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentAdIndex, advertisements]);

  // Toggle pause/play
  const toggleSlidePause = () => {
    setIsSlidePaused(prev => !prev);
  };

  useEffect(() => {
    fetchAdvertisements();
    fetchRotationConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaName, deviceType, detectedDeviceType]);

  // Re-fetch rotation config periodically to pick up admin changes (every 30 seconds)
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchRotationConfig();
    }, 30000); // Refresh every 30 seconds to pick up admin changes

    return () => clearInterval(refreshInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaName]);

  // Helper function to normalize API URL (remove trailing /api if present)
  const normalizeApiUrl = (baseUrl: string): string => {
    if (!baseUrl) {
      const apiUrl = getApiUrl();
      return apiUrl.replace(/\/api$/, '');
    }
    const url = baseUrl.trim();
    // Remove trailing /api if present
    if (url.endsWith('/api')) {
      return url.slice(0, -4);
    }
    return url;
  };

  // Helper function to build media URL with proper error handling
  const buildMediaUrl = (url: string | null | undefined): string | null => {
    if (!url || typeof url !== 'string') return null;
    
    // Filter out malformed placeholder URLs
    if (url.includes('FFFFFF?text=') || 
        url.includes('via.placeholder.com') || 
        url.match(/^[A-F0-9]+\?text=/i) ||
        url.trim() === '' ||
        url === 'null' ||
        url === 'undefined') {
      return null;
    }
    
    // If already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Ensure URL starts with / if it doesn't
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    // Use dynamic API URL detection
    const apiBaseUrl = getApiBaseUrl();
    // Remove /api suffix if present (since we're building media URLs)
    const baseUrl = apiBaseUrl.replace(/\/api$/, '');
    
    // Remove any double slashes (except after http://)
    const fullUrl = `${baseUrl}${normalizedUrl}`.replace(/([^:]\/)\/+/g, '$1');
    
    return fullUrl;
  };

  // Helper function to get the correct API URL (uses centralized getApiUrl)
  const getApiBaseUrl = (): string => {
    return getApiUrl();
  };

  const fetchAdvertisements = async () => {
    try {
      const params = new URLSearchParams();
      params.append('area_name', areaName);
      
      // Use provided deviceType or detected device type
      const currentDeviceType = deviceType || detectedDeviceType;
      params.append('device_type', currentDeviceType);

      console.log('📺 Fetching ads for area:', areaName, 'device:', currentDeviceType);

      // Use dynamic API URL detection
      const apiBaseUrl = getApiBaseUrl();
      const apiUrl = `${apiBaseUrl}/video-advertisements/active?${params.toString()}`;
      
      console.log('📺 API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (response && response.ok) {
        const data = await response.json();
        const ads = data.data || [];
        
        console.log('📺 Fetched ads:', ads.length, 'for area:', areaName);
        if (ads.length > 0) {
          ads.forEach((ad: any, index: number) => {
            console.log(`  Ad ${index + 1}:`, {
              title: ad.title,
              type: ad.type,
              area: ad.selected_area,
              video_url: ad.video_url,
              image_url: ad.image_url,
              thumbnail_url: ad.thumbnail_url
            });
          });
        } else {
          console.warn('⚠️ No ads found for area:', areaName, 'device:', currentDeviceType);
        }
        
        setAdvertisements(ads);
        // Store area config if provided
        if (data.area_config) {
          setAreaConfig(data.area_config);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch ads:', response.status, response.statusText, errorText);
      }
    } catch (error) {
      console.error('Error fetching video advertisements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRotationConfig = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      // First try to get rotation config
      const rotationResponse = await fetch(`${apiBaseUrl}/video-advertisements/rotation-configs/${areaName}`);
      if (rotationResponse.ok) {
        const rotationData = await rotationResponse.json();
        if (rotationData.data) {
          setRotationConfig(rotationData.data);
          console.log(`✅ Rotation config loaded: ${rotationData.data.rotation_interval_seconds}s, auto: ${rotationData.data.auto_rotation_enabled}`);
          return;
        }
      }
      
      // If rotation config doesn't exist, try to get from area config
      const areasResponse = await fetch(`${apiBaseUrl}/video-advertisements/areas`);
      if (areasResponse.ok) {
        const areasData = await areasResponse.json();
        const area = areasData.data?.find((a: any) => a.area_name === areaName);
        if (area) {
          const config = {
            rotation_interval_seconds: area.rotation_interval_seconds || 5,
            auto_rotation_enabled: area.auto_rotation_enabled !== undefined ? area.auto_rotation_enabled : true,
            max_concurrent_ads: area.max_concurrent_ads
          };
          setRotationConfig(config);
          console.log(`✅ Area config loaded for rotation: ${config.rotation_interval_seconds}s, auto: ${config.auto_rotation_enabled}`);
          return;
        }
      }
      
      // Use default config if both fail
        setRotationConfig({
          rotation_interval_seconds: 5,
          auto_rotation_enabled: true
        });
    } catch (error) {
      console.error('Error fetching rotation config:', error);
      // Use default config if fetch fails
      setRotationConfig({
        rotation_interval_seconds: 5,
        auto_rotation_enabled: true
      });
    }
  };

  const trackImpression = async (adId: string) => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      await fetch(`${apiBaseUrl}/video-advertisements/${adId}/impression`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  };

  const trackClick = async (adId: string) => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      await fetch(`${apiBaseUrl}/video-advertisements/${adId}/click`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  const trackView = async (adId: string) => {
    try {
      await fetch(`${getApiUrl()}/video-advertisements/${adId}/view`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleAdClick = (ad: VideoAdvertisement) => {
    trackClick(ad.id);
    if (ad.target_url) {
      window.open(ad.target_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCloseAd = (adId: string) => {
    setClosedAds(prev => {
      const newSet = new Set(prev);
      newSet.add(adId);
      return newSet;
    });
    
    // Track that user closed the ad
    fetch(`/api/video-advertisements/${adId}/close`, {
      method: 'POST',
    }).catch(console.error);
  };

  const handleVideoEnd = (adId: string) => {
    trackView(adId);
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

  // Determine if ads in this area are closeable (moved up for use in tracking)
  const isAreaCloseable = areaConfig?.ads_closeable !== false;
  const isAdCloseable = (ad: VideoAdvertisement) => {
    if (!isAreaCloseable) return false;
    return ad.is_quitable !== false;
  };

  // Filter out closed ads
  const availableAds = advertisements.filter(ad => 
    !closedAds.has(ad.id) && 
    (isAdCloseable(ad) || !ad.is_closed_by_user)
  );

  // Track impression when ad is displayed (only once per ad)
  useEffect(() => {
    if (availableAds.length > 0) {
      const adjustedIndex = Math.min(currentAdIndex, availableAds.length - 1);
      const currentAd = availableAds[adjustedIndex];
      if (currentAd && !trackedImpressions.has(currentAd.id)) {
        trackImpression(currentAd.id);
        setTrackedImpressions(prev => new Set(prev).add(currentAd.id));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAdIndex, availableAds.length]);

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

  if (availableAds.length === 0) {
    return null; // Don't render anything if all ads are closed
  }

  // Adjust current index if it's beyond available ads
  const adjustedIndex = Math.min(currentAdIndex, availableAds.length - 1);
  const currentAd = availableAds[adjustedIndex];

  const adStyle: React.CSSProperties = {
    backgroundColor: currentAd.background_color || '#ffffff',
    color: currentAd.text_color || '#000000',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s ease',
    ...style
  };

  return (
    <div 
      className={`video-advertisement-container ${className} hover:shadow-lg hover:scale-105 transition-all duration-300`} 
      style={adStyle}
    >
      <div 
        className="advertisement-content hover:opacity-90 transition-opacity"
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {/* Slides/Animation Carousel - Show if area is set to 'slides' type OR if ad has slides */}
        {(areaConfig?.display_type === 'slides' || (currentAd.slides && currentAd.slides.length > 0)) ? (
          <div 
            className="advertisement-slides mb-3 relative overflow-hidden rounded-lg"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full" style={{ aspectRatio: '16/9', minHeight: '200px' }}>
              {currentAd.slides && currentAd.slides.map((slide, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    index === currentSlideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
                >
                  {(() => {
                    const slideUrl = buildMediaUrl(slide.url);
                    const slideThumbnail = buildMediaUrl(slide.thumbnail);
                    if (!slideUrl) return null;
                    
                    return slide.type === 'video' ? (
                      <video
                        src={slideUrl}
                        poster={slideThumbnail || undefined}
                        autoPlay={index === currentSlideIndex && !isSlidePaused}
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          if (process.env.NODE_ENV === 'development') {
                            console.error('Slide video load error:', e, slideUrl);
                          }
                          // Hide video on error
                          const videoElement = e.target as HTMLVideoElement;
                          if (videoElement.parentElement) {
                            videoElement.parentElement.style.display = 'none';
                          }
                        }}
                        onLoadedData={() => {
                          if (index === currentSlideIndex && !trackedImpressions.has(currentAd.id)) {
                            trackImpression(currentAd.id);
                            setTrackedImpressions(prev => new Set(prev).add(currentAd.id));
                          }
                        }}
                      />
                    ) : slide.type === 'animation' ? (
                      <img
                        src={slideUrl}
                        alt={slide.title || currentAd.title}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          if (process.env.NODE_ENV === 'development') {
                            console.error('Slide animation load error:', e, slideUrl);
                          }
                          // Hide image on error
                          const imgElement = e.target as HTMLImageElement;
                          if (imgElement.parentElement) {
                            imgElement.parentElement.style.display = 'none';
                          }
                        }}
                        onLoad={() => {
                          if (index === currentSlideIndex && !trackedImpressions.has(currentAd.id)) {
                            trackImpression(currentAd.id);
                            setTrackedImpressions(prev => new Set(prev).add(currentAd.id));
                          }
                        }}
                      />
                    ) : (
                      <img
                        src={slideUrl}
                        alt={slide.title || currentAd.title}
                        className="w-full h-full object-cover rounded-lg hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          if (process.env.NODE_ENV === 'development') {
                            console.error('Slide image load error:', e, slideUrl);
                          }
                          // Hide image on error
                          const imgElement = e.target as HTMLImageElement;
                          if (imgElement.parentElement) {
                            imgElement.parentElement.style.display = 'none';
                          }
                        }}
                        onLoad={() => {
                          if (index === currentSlideIndex && !trackedImpressions.has(currentAd.id)) {
                            trackImpression(currentAd.id);
                            setTrackedImpressions(prev => new Set(prev).add(currentAd.id));
                          }
                        }}
                      />
                    );
                  })()}
                  {(slide.title || slide.description) && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-lg">
                      {slide.title && (
                        <h4 className="text-white font-semibold text-sm mb-1">{slide.title}</h4>
                      )}
                      {slide.description && !slide.description.toLowerCase().includes('this is slide') && !slide.description.toLowerCase().includes('of the desktop header banner') && (
                        <p className="text-white text-xs opacity-90">{slide.description}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Navigation arrows */}
              {currentAd.slides && currentAd.slides.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlideIndex(prev => (prev - 1 + currentAd.slides!.length) % currentAd.slides!.length);
                      setIsSlidePaused(true);
                    }}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full z-20 transition-all"
                    aria-label="Previous slide"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlideIndex(prev => (prev + 1) % currentAd.slides!.length);
                      setIsSlidePaused(true);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full z-20 transition-all"
                    aria-label="Next slide"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
            
            {/* Slide indicators (dots) - Enhanced */}
            {currentAd.slides && currentAd.slides.length > 1 && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20 bg-black/30 px-3 py-2 rounded-full">
                {currentAd.slides.map((_, index) => (
                  <button
                    key={index}
                    className={`transition-all duration-300 rounded-full ${
                      index === currentSlideIndex 
                        ? 'bg-white w-3 h-3 scale-125' 
                        : 'bg-white/50 hover:bg-white/75 w-2 h-2'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlideIndex(index);
                      setIsSlidePaused(true);
                    }}
                    aria-label={`Go to slide ${index + 1}`}
                    title={`Slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
            
            {/* Controls: Slide counter and Pause/Play button */}
            {currentAd.slides && currentAd.slides.length > 1 && (
              <div className="absolute top-2 right-2 flex items-center gap-2 z-20">
                <div className="bg-black/50 text-white px-2 py-1 rounded text-xs">
                  {currentSlideIndex + 1} / {currentAd.slides.length}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSlidePause();
                  }}
                  className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-all"
                  aria-label={isSlidePaused ? 'Resume slideshow' : 'Pause slideshow'}
                  title={isSlidePaused ? 'Resume auto-rotation' : 'Pause auto-rotation'}
                >
                  {isSlidePaused ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            )}
            
            {/* Swipe hint for mobile */}
            {currentAd.slides && currentAd.slides.length > 1 && detectedDeviceType === 'mobile' && (
              <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 text-white text-xs bg-black/30 px-3 py-1 rounded-full z-20">
                Swipe to navigate
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Animation Advertisement - MUST CHECK FIRST before image/video */}
            {(() => {
              // Check if it's an animation: type is 'animation' OR image_url/video_url ends with .gif
              // Also check video_url in case GIF was mistakenly saved there
              const imageUrl = currentAd.image_url;
              const videoUrl = currentAd.video_url;
              const hasGifInImage = imageUrl && (imageUrl.toLowerCase().endsWith('.gif') || imageUrl.toLowerCase().includes('/animations/'));
              const hasGifInVideo = videoUrl && (videoUrl.toLowerCase().endsWith('.gif') || videoUrl.toLowerCase().includes('/animations/'));
              
              const isAnimation = currentAd.type === 'animation' || hasGifInImage || hasGifInVideo;
              
              // Use image_url if available, otherwise check video_url (for misplaced GIFs)
              const gifUrl = hasGifInImage ? imageUrl : (hasGifInVideo ? videoUrl : null);
              
              if (isAnimation && gifUrl) {
                const animationUrl = buildMediaUrl(gifUrl);
                console.log('🎬 Animation check:', {
                  type: currentAd.type,
                  image_url: currentAd.image_url,
                  video_url: currentAd.video_url,
                  hasGifInImage,
                  hasGifInVideo,
                  isAnimation,
                  gifUrl,
                  animationUrl,
                  adId: currentAd.id,
                  adTitle: currentAd.title
                });
                return animationUrl ? (
                  <div 
                    className="advertisement-animation mb-3 relative overflow-hidden rounded-lg cursor-pointer"
                    onClick={() => handleAdClick(currentAd)}
                  >
                    <img
                      src={animationUrl}
                      alt={currentAd.title}
                      className="w-full h-auto rounded-lg hover:scale-105 transition-transform duration-300"
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '400px', 
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        display: 'block',
                        margin: '0 auto',
                        pointerEvents: 'none' // Allow clicks to pass through to parent
                      }}
                      onError={(e) => {
                        console.error('❌ Animation load error:', e, animationUrl);
                        // Hide animation element on error
                        const imgElement = e.target as HTMLImageElement;
                        if (imgElement.parentElement) {
                          imgElement.parentElement.style.display = 'none';
                        }
                      }}
                      onLoad={() => {
                        console.log('✅ GIF Animation loaded successfully:', animationUrl);
                        if (!trackedImpressions.has(currentAd.id)) {
                          trackImpression(currentAd.id);
                          setTrackedImpressions(prev => new Set(prev).add(currentAd.id));
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none"></div>
                    <div className="absolute top-2 right-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium pointer-events-none">
                      GIF
                    </div>
                  </div>
                ) : null;
              }
              return null;
            })()}

            {/* Video Advertisement - Skip if it's actually a GIF */}
            {currentAd.type === 'video' && currentAd.video_url && (() => {
              // Don't show as video if it's actually a GIF
              const isGif = currentAd.video_url.toLowerCase().endsWith('.gif') ||
                currentAd.video_url.toLowerCase().includes('/animations/');
              if (isGif) {
                console.log('⚠️ Skipping video display - this is a GIF:', currentAd.video_url);
                return null; // Let animation handler display it
              }
              
              const videoUrl = buildMediaUrl(currentAd.video_url);
              const posterUrl = buildMediaUrl(currentAd.thumbnail_url);
              if (!videoUrl) {
                console.warn('Video URL is invalid or filtered:', currentAd.video_url);
                return null;
              }
              return (
                <div className="advertisement-video mb-3 relative overflow-hidden rounded-lg">
                  <video
                    key={videoUrl} // Force re-render if URL changes
                    src={videoUrl}
                    poster={posterUrl || undefined}
                    autoPlay
                    muted={!currentAd.audio_enabled}
                    loop
                    playsInline
                    controls={currentAd.audio_enabled}
                    onEnded={() => handleVideoEnd(currentAd.id)}
                    onError={(e) => {
                      const videoElement = e.target as HTMLVideoElement;
                      const error = videoElement.error;
                      console.error('❌ Video load error:', {
                        errorCode: error?.code,
                        errorMessage: error?.message,
                        videoUrl,
                        originalUrl: currentAd.video_url,
                        networkState: videoElement.networkState,
                        readyState: videoElement.readyState
                      });
                      
                      // Try to load with different approach if network error
                      if (error && error.code === MediaError.MEDIA_ERR_NETWORK) {
                        console.warn('Network error detected, video may not be accessible:', videoUrl);
                      }
                    }}
                    onLoadedData={() => {
                      console.log('Video loaded successfully:', videoUrl);
                      if (!trackedImpressions.has(currentAd.id)) {
                        trackImpression(currentAd.id);
                        setTrackedImpressions(prev => new Set(prev).add(currentAd.id));
                      }
                    }}
                    onLoadStart={() => {
                      console.log('Video loading started:', videoUrl);
                    }}
                    className="w-full h-auto rounded-lg"
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '400px', 
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto'
                    }}
                  />
                </div>
              );
            })()}

        {/* Image Advertisement - Only show if NOT an animation */}
        {currentAd.type === 'image' && currentAd.image_url && (() => {
          // Don't show as image if it's actually a GIF animation
          const isGifAnimation = currentAd.image_url.toLowerCase().endsWith('.gif') ||
            currentAd.image_url.toLowerCase().includes('/animations/');
          if (isGifAnimation) {
            console.log('⚠️ Skipping image display - this is a GIF animation:', currentAd.image_url);
            return null; // Let animation handler display it
          }
          const imageUrl = buildMediaUrl(currentAd.image_url);
          if (!imageUrl) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Image URL filtered out:', currentAd.image_url);
            }
            return null;
          }
          return (
            <div className="advertisement-image mb-3 relative overflow-hidden rounded-lg">
              <img
                key={imageUrl} // Force re-render if URL changes
                src={imageUrl}
                alt={currentAd.title}
                className="w-full h-auto rounded-lg hover:scale-105 transition-transform duration-300"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '400px', 
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto'
                }}
                onError={(e) => {
                  const imgElement = e.target as HTMLImageElement;
                  console.error('❌ Image load error:', {
                    imageUrl,
                    originalUrl: currentAd.image_url,
                    naturalWidth: imgElement.naturalWidth,
                    naturalHeight: imgElement.naturalHeight
                  });
                  // Show placeholder instead of hiding
                  imgElement.style.display = 'none';
                  if (imgElement.parentElement) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'w-full h-32 bg-gray-200 flex items-center justify-center rounded-lg';
                    placeholder.innerHTML = '<span class="text-gray-400">Image not available</span>';
                    imgElement.parentElement.appendChild(placeholder);
                  }
                }}
                onLoad={() => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('✅ Image loaded successfully:', imageUrl);
                  }
                  if (!trackedImpressions.has(currentAd.id)) {
                    trackImpression(currentAd.id);
                    setTrackedImpressions(prev => new Set(prev).add(currentAd.id));
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none"></div>
            </div>
          );
        })()}

          </>
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
          {currentAd.content && (
            <p className="advertisement-content text-sm mb-3" style={{ color: currentAd.text_color }}>
              {currentAd.content}
            </p>
          )}
        </div>

        {/* Button */}
        {currentAd.button_text && currentAd.target_url && (
          <div className="advertisement-button mt-auto">
            <button
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 hover:shadow-md"
              style={{
                backgroundColor: currentAd.button_color || '#3b82f6',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
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

        {/* Close button only (Ad indicator removed) */}
        {isAdCloseable(currentAd) && (
          <div className="absolute top-2 right-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCloseAd(currentAd.id);
              }}
              className="text-red-600 hover:text-red-700 bg-white/90 backdrop-blur-sm p-1 rounded-full shadow-sm border border-red-300 hover:bg-red-50 transition-colors"
              title="Close advertisement"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Doctor info */}
         <div className="advertisement-doctor text-xs text-gray-500 mt-2 flex items-center justify-between">
           <span className="flex items-center">
             <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
             {currentAd.doctor?.doctor_name || currentAd.doctor?.clinic_name || 'Medical Professional'}
           </span>
           <span className="text-gray-400">•</span>
         </div>
      </div>

      {/* Rotation info - Always show when auto-rotation is enabled */}
      {rotationConfig?.auto_rotation_enabled && (
        <div className="advertisement-rotation-info mt-2">
          <div className="flex items-center justify-center space-x-2">
      {availableAds.length > 1 && (
              <>
                <span className="text-xs text-gray-500">
                  Ad {adjustedIndex + 1} of {availableAds.length}
                </span>
                <span className="text-xs text-gray-400">•</span>
              </>
            )}
            <span className="text-xs text-gray-500 font-medium">
              Auto-rotating ({rotationCountdown !== null ? rotationCountdown : rotationConfig.rotation_interval_seconds}s)
            </span>
          </div>
          {availableAds.length > 1 && (
            <div className="advertisement-dots flex justify-center space-x-1 mt-2">
              {availableAds.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === adjustedIndex ? 'bg-blue-500 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  onClick={() => {
                    setCurrentAdIndex(index);
                    // Reset countdown when manually switching ads
                    if (rotationConfig) {
                      setRotationCountdown(rotationConfig.rotation_interval_seconds);
                    }
                  }}
                  title={`View ad ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual rotation indicator (when auto-rotation is disabled) */}
      {rotationConfig && !rotationConfig.auto_rotation_enabled && availableAds.length > 1 && (
        <div className="advertisement-rotation-info mt-2">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xs text-gray-500">
              Ad {adjustedIndex + 1} of {availableAds.length}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">
              Manual rotation
            </span>
          </div>
          <div className="advertisement-dots flex justify-center space-x-1 mt-2">
            {availableAds.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === adjustedIndex ? 'bg-blue-500 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                onClick={() => {
                  setCurrentAdIndex(index);
                  // Reset countdown when manually switching ads
                  if (rotationConfig) {
                    setRotationCountdown(rotationConfig.rotation_interval_seconds);
                  }
                }}
                title={`View ad ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Device-specific placement components
export function DesktopHeaderBanner({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <VideoAdvertisementDisplay
      areaName="desktop_header_banner"
      deviceType="desktop"
      className={`desktop-header-banner ${className}`}
      style={style}
    />
  );
}

export function MobileHeaderBanner({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <VideoAdvertisementDisplay
      areaName="mobile_header_banner"
      deviceType="mobile"
      className={`mobile-header-banner ${className}`}
      style={style}
    />
  );
}

export function TabletHeaderBanner({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <VideoAdvertisementDisplay
      areaName="tablet_header_banner"
      deviceType="tablet"
      className={`tablet-header-banner ${className}`}
      style={style}
    />
  );
}

export function DesktopSidebarTop({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <VideoAdvertisementDisplay
      areaName="desktop_sidebar_top"
      deviceType="desktop"
      className={`desktop-sidebar-top ${className}`}
      style={style}
    />
  );
}

export function DesktopSidebarBottom({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <VideoAdvertisementDisplay
      areaName="desktop_sidebar_bottom"
      deviceType="desktop"
      className={`desktop-sidebar-bottom ${className}`}
      style={style}
    />
  );
}

export function DesktopContentTop({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <VideoAdvertisementDisplay
      areaName="desktop_content_top"
      deviceType="desktop"
      className={`desktop-content-top ${className}`}
      style={style}
    />
  );
}

export function DesktopContentMiddle({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <VideoAdvertisementDisplay
      areaName="desktop_content_middle"
      deviceType="desktop"
      className={`desktop-content-middle ${className}`}
      style={style}
    />
  );
}

export function DesktopContentBottom({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <VideoAdvertisementDisplay
      areaName="desktop_content_bottom"
      deviceType="desktop"
      className={`desktop-content-bottom ${className}`}
      style={style}
    />
  );
}

export function MobileContentTop({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <VideoAdvertisementDisplay
      areaName="mobile_content_top"
      deviceType="mobile"
      className={`mobile-content-top ${className}`}
      style={style}
    />
  );
}

export function MobileContentMiddle({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <VideoAdvertisementDisplay
      areaName="mobile_content_middle"
      deviceType="mobile"
      className={`mobile-content-middle ${className}`}
      style={style}
    />
  );
}

export function MobileContentBottom({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <VideoAdvertisementDisplay
      areaName="mobile_content_bottom"
      deviceType="mobile"
      className={`mobile-content-bottom ${className}`}
      style={style}
    />
  );
}

export function DesktopFooterBanner({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <VideoAdvertisementDisplay
      areaName="desktop_footer_banner"
      deviceType="desktop"
      className={`desktop-footer-banner ${className}`}
      style={style}
    />
  );
}

export function MobileFooterBanner({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <VideoAdvertisementDisplay
      areaName="mobile_footer_banner"
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
        <DesktopHeaderBanner className={className} style={style} />
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
        <DesktopFooterBanner className={className} style={style} />
      </div>
      {/* Mobile */}
      <div className="block lg:hidden">
        <MobileFooterBanner className={className} style={style} />
      </div>
    </>
  );
}

export function ResponsiveContentTop({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <DesktopContentTop className={className} style={style} />
      </div>
      {/* Mobile */}
      <div className="block lg:hidden">
        <MobileContentTop className={className} style={style} />
      </div>
    </>
  );
}

export function ResponsiveContentMiddle({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <DesktopContentMiddle className={className} style={style} />
      </div>
      {/* Mobile */}
      <div className="block lg:hidden">
        <MobileContentMiddle className={className} style={style} />
      </div>
    </>
  );
}

export function ResponsiveContentBottom({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <DesktopContentBottom className={className} style={style} />
      </div>
      {/* Mobile */}
      <div className="block lg:hidden">
        <MobileContentBottom className={className} style={style} />
      </div>
    </>
  );
}
