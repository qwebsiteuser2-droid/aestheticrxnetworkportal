'use client';

import { useState, useEffect } from 'react';
import { DevicePhoneMobileIcon, ComputerDesktopIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
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
  allowed_content_types: string[] | null;
  max_file_size_mb: number | null;
  max_duration_seconds: number | null;
  allowed_formats: string[] | null;
  preview_image_url?: string | null; // Screenshot showing where ad appears
}

interface AdvertisementAreaSelectorProps {
  onAreaSelect: (area: AdvertisementArea) => void;
  selectedArea?: AdvertisementArea | null;
}

export default function AdvertisementAreaSelector({ 
  onAreaSelect, 
  selectedArea 
}: AdvertisementAreaSelectorProps) {
  const [areas, setAreas] = useState<AdvertisementArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceView, setDeviceView] = useState<'mobile' | 'desktop'>('desktop');
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const token = getAccessToken();
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/video-advertisements/areas`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAreas(data.data || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to load advertisement areas. Please check your connection.');
      }
    } catch (error) {
      console.error('Error fetching advertisement areas:', error);
      toast.error('Network error or server is unreachable. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getAreasForDevice = () => {
    return areas.filter(area => {
      if (deviceView === 'mobile') {
        return area.device_type === 'mobile' || area.device_type === 'all';
      } else {
        return area.device_type === 'desktop' || area.device_type === 'all';
      }
    });
  };

  const handleAreaClick = (area: AdvertisementArea) => {
    onAreaSelect(area);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredAreas = getAreasForDevice();

  return (
    <div className="space-y-6">
      {/* Device View Toggle */}
      <div className="flex items-center justify-center space-x-4 bg-gray-100 p-4 rounded-lg">
        <button
          onClick={() => setDeviceView('mobile')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
            deviceView === 'mobile'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <DevicePhoneMobileIcon className="w-5 h-5" />
          <span>Mobile View</span>
        </button>
        <button
          onClick={() => setDeviceView('desktop')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
            deviceView === 'desktop'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ComputerDesktopIcon className="w-5 h-5" />
          <span>Desktop View</span>
        </button>
      </div>

      {/* Visual Preview Area */}
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Select Advertisement Placement Area
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Click on an area below to see where your advertisement will appear on {deviceView === 'mobile' ? 'mobile' : 'desktop'} devices
        </p>

        {/* Mockup Preview */}
        <div className={`relative border-2 border-gray-300 rounded-lg overflow-hidden mb-6 ${
          deviceView === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
        }`}>
          {/* Device Frame */}
          <div className={`bg-gray-50 ${
            deviceView === 'mobile' ? 'aspect-[9/16]' : 'aspect-[16/9]'
          } relative`}>
            {/* Preview Image or Mock Layout */}
            {deviceView === 'mobile' ? (
              <MobileLayoutPreview 
                areas={filteredAreas}
                selectedArea={selectedArea}
                hoveredArea={hoveredArea}
                onAreaHover={setHoveredArea}
                onAreaClick={handleAreaClick}
              />
            ) : (
              <DesktopLayoutPreview 
                areas={filteredAreas}
                selectedArea={selectedArea}
                hoveredArea={hoveredArea}
                onAreaHover={setHoveredArea}
                onAreaClick={handleAreaClick}
              />
            )}
          </div>
        </div>

        {/* Area List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAreas.map((area) => (
            <div
              key={area.id}
              onClick={() => handleAreaClick(area)}
              onMouseEnter={() => setHoveredArea(area.id)}
              onMouseLeave={() => setHoveredArea(null)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedArea?.id === area.id
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : hoveredArea === area.id
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{area.display_name}</h4>
                <MapPinIcon className="w-5 h-5 text-gray-400" />
              </div>
              
              {area.description && (
                <p className="text-sm text-gray-600 mb-3">{area.description}</p>
              )}

              <div className="space-y-2 text-xs">
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
                  <span className="font-semibold text-blue-600">PKR {area.base_hourly_rate}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Capacity:</span>
                  <span className="font-medium">
                    {area.current_active_ads} / {area.max_concurrent_ads} ads
                  </span>
                </div>
              </div>

              {selectedArea?.id === area.id && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    Selected
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredAreas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No advertisement areas available for {deviceView} devices.</p>
            <p className="text-sm mt-2">Please contact admin to configure areas.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Mobile Layout Preview Component
function MobileLayoutPreview({
  areas,
  selectedArea,
  hoveredArea,
  onAreaHover,
  onAreaClick
}: {
  areas: AdvertisementArea[];
  selectedArea?: AdvertisementArea | null;
  hoveredArea: string | null;
  onAreaHover: (id: string | null) => void;
  onAreaClick: (area: AdvertisementArea) => void;
}) {
  return (
    <div className="w-full h-full bg-white relative">
      {/* Header Banner Area */}
      {areas.find(a => a.area_name === 'mobile_header_banner') && (
        <div
          className="absolute top-0 left-0 right-0 h-16 bg-blue-100 border-2 border-dashed border-blue-300 flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-all"
          style={{
            borderColor: selectedArea?.area_name === 'mobile_header_banner' ? '#2563eb' : hoveredArea === areas.find(a => a.area_name === 'mobile_header_banner')?.id ? '#60a5fa' : '#93c5fd',
            backgroundColor: selectedArea?.area_name === 'mobile_header_banner' ? '#dbeafe' : hoveredArea === areas.find(a => a.area_name === 'mobile_header_banner')?.id ? '#bfdbfe' : '#dbeafe',
          }}
          onMouseEnter={() => onAreaHover(areas.find(a => a.area_name === 'mobile_header_banner')?.id || null)}
          onMouseLeave={() => onAreaHover(null)}
          onClick={() => {
            const area = areas.find(a => a.area_name === 'mobile_header_banner');
            if (area) onAreaClick(area);
          }}
        >
          <span className="text-xs text-gray-600 font-medium">Header Banner</span>
        </div>
      )}

      {/* Content Top */}
      {areas.find(a => a.area_name === 'mobile_content_top') && (
        <div
          className="absolute top-16 left-0 right-0 h-24 bg-green-100 border-2 border-dashed border-green-300 flex items-center justify-center cursor-pointer hover:bg-green-200 transition-all"
          style={{
            borderColor: selectedArea?.area_name === 'mobile_content_top' ? '#2563eb' : hoveredArea === areas.find(a => a.area_name === 'mobile_content_top')?.id ? '#60a5fa' : '#86efac',
            backgroundColor: selectedArea?.area_name === 'mobile_content_top' ? '#dbeafe' : hoveredArea === areas.find(a => a.area_name === 'mobile_content_top')?.id ? '#bbf7d0' : '#dcfce7',
          }}
          onMouseEnter={() => onAreaHover(areas.find(a => a.area_name === 'mobile_content_top')?.id || null)}
          onMouseLeave={() => onAreaHover(null)}
          onClick={() => {
            const area = areas.find(a => a.area_name === 'mobile_content_top');
            if (area) onAreaClick(area);
          }}
        >
          <span className="text-xs text-gray-600 font-medium">Content Top</span>
        </div>
      )}

      {/* Content Middle */}
      {areas.find(a => a.area_name === 'mobile_content_middle') && (
        <div
          className="absolute top-40 left-0 right-0 h-24 bg-yellow-100 border-2 border-dashed border-yellow-300 flex items-center justify-center cursor-pointer hover:bg-yellow-200 transition-all"
          style={{
            borderColor: selectedArea?.area_name === 'mobile_content_middle' ? '#2563eb' : hoveredArea === areas.find(a => a.area_name === 'mobile_content_middle')?.id ? '#60a5fa' : '#fde047',
            backgroundColor: selectedArea?.area_name === 'mobile_content_middle' ? '#dbeafe' : hoveredArea === areas.find(a => a.area_name === 'mobile_content_middle')?.id ? '#fef08a' : '#fef9c3',
          }}
          onMouseEnter={() => onAreaHover(areas.find(a => a.area_name === 'mobile_content_middle')?.id || null)}
          onMouseLeave={() => onAreaHover(null)}
          onClick={() => {
            const area = areas.find(a => a.area_name === 'mobile_content_middle');
            if (area) onAreaClick(area);
          }}
        >
          <span className="text-xs text-gray-600 font-medium">Content Middle</span>
        </div>
      )}

      {/* Content Bottom */}
      {areas.find(a => a.area_name === 'mobile_content_bottom') && (
        <div
          className="absolute bottom-16 left-0 right-0 h-24 bg-purple-100 border-2 border-dashed border-purple-300 flex items-center justify-center cursor-pointer hover:bg-purple-200 transition-all"
          style={{
            borderColor: selectedArea?.area_name === 'mobile_content_bottom' ? '#2563eb' : hoveredArea === areas.find(a => a.area_name === 'mobile_content_bottom')?.id ? '#60a5fa' : '#c084fc',
            backgroundColor: selectedArea?.area_name === 'mobile_content_bottom' ? '#dbeafe' : hoveredArea === areas.find(a => a.area_name === 'mobile_content_bottom')?.id ? '#e9d5ff' : '#f3e8ff',
          }}
          onMouseEnter={() => onAreaHover(areas.find(a => a.area_name === 'mobile_content_bottom')?.id || null)}
          onMouseLeave={() => onAreaHover(null)}
          onClick={() => {
            const area = areas.find(a => a.area_name === 'mobile_content_bottom');
            if (area) onAreaClick(area);
          }}
        >
          <span className="text-xs text-gray-600 font-medium">Content Bottom</span>
        </div>
      )}

      {/* Footer Banner */}
      {areas.find(a => a.area_name === 'mobile_footer_banner') && (
        <div
          className="absolute bottom-0 left-0 right-0 h-16 bg-red-100 border-2 border-dashed border-red-300 flex items-center justify-center cursor-pointer hover:bg-red-200 transition-all"
          style={{
            borderColor: selectedArea?.area_name === 'mobile_footer_banner' ? '#2563eb' : hoveredArea === areas.find(a => a.area_name === 'mobile_footer_banner')?.id ? '#60a5fa' : '#f87171',
            backgroundColor: selectedArea?.area_name === 'mobile_footer_banner' ? '#dbeafe' : hoveredArea === areas.find(a => a.area_name === 'mobile_footer_banner')?.id ? '#fecaca' : '#fee2e2',
          }}
          onMouseEnter={() => onAreaHover(areas.find(a => a.area_name === 'mobile_footer_banner')?.id || null)}
          onMouseLeave={() => onAreaHover(null)}
          onClick={() => {
            const area = areas.find(a => a.area_name === 'mobile_footer_banner');
            if (area) onAreaClick(area);
          }}
        >
          <span className="text-xs text-gray-600 font-medium">Footer Banner</span>
        </div>
      )}
    </div>
  );
}

// Desktop Layout Preview Component
function DesktopLayoutPreview({
  areas,
  selectedArea,
  hoveredArea,
  onAreaHover,
  onAreaClick
}: {
  areas: AdvertisementArea[];
  selectedArea?: AdvertisementArea | null;
  hoveredArea: string | null;
  onAreaHover: (id: string | null) => void;
  onAreaClick: (area: AdvertisementArea) => void;
}) {
  return (
    <div className="w-full h-full bg-white relative">
      {/* Header Banner */}
      {areas.find(a => a.area_name === 'desktop_header_banner') && (
        <div
          className="absolute top-0 left-0 right-0 h-20 bg-blue-100 border-2 border-dashed border-blue-300 flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-all"
          style={{
            borderColor: selectedArea?.area_name === 'desktop_header_banner' ? '#2563eb' : hoveredArea === areas.find(a => a.area_name === 'desktop_header_banner')?.id ? '#60a5fa' : '#93c5fd',
            backgroundColor: selectedArea?.area_name === 'desktop_header_banner' ? '#dbeafe' : hoveredArea === areas.find(a => a.area_name === 'desktop_header_banner')?.id ? '#bfdbfe' : '#dbeafe',
          }}
          onMouseEnter={() => onAreaHover(areas.find(a => a.area_name === 'desktop_header_banner')?.id || null)}
          onMouseLeave={() => onAreaHover(null)}
          onClick={() => {
            const area = areas.find(a => a.area_name === 'desktop_header_banner');
            if (area) onAreaClick(area);
          }}
        >
          <span className="text-xs text-gray-600 font-medium">Header Banner</span>
        </div>
      )}

      {/* Sidebar Top */}
      {areas.find(a => a.area_name === 'desktop_sidebar_top') && (
        <div
          className="absolute top-20 right-0 w-64 h-48 bg-green-100 border-2 border-dashed border-green-300 flex items-center justify-center cursor-pointer hover:bg-green-200 transition-all"
          style={{
            borderColor: selectedArea?.area_name === 'desktop_sidebar_top' ? '#2563eb' : hoveredArea === areas.find(a => a.area_name === 'desktop_sidebar_top')?.id ? '#60a5fa' : '#86efac',
            backgroundColor: selectedArea?.area_name === 'desktop_sidebar_top' ? '#dbeafe' : hoveredArea === areas.find(a => a.area_name === 'desktop_sidebar_top')?.id ? '#bbf7d0' : '#dcfce7',
          }}
          onMouseEnter={() => onAreaHover(areas.find(a => a.area_name === 'desktop_sidebar_top')?.id || null)}
          onMouseLeave={() => onAreaHover(null)}
          onClick={() => {
            const area = areas.find(a => a.area_name === 'desktop_sidebar_top');
            if (area) onAreaClick(area);
          }}
        >
          <span className="text-xs text-gray-600 font-medium">Sidebar Top</span>
        </div>
      )}

      {/* Content Top */}
      {areas.find(a => a.area_name === 'desktop_content_top') && (
        <div
          className="absolute top-20 left-0 right-64 h-24 bg-yellow-100 border-2 border-dashed border-yellow-300 flex items-center justify-center cursor-pointer hover:bg-yellow-200 transition-all"
          style={{
            borderColor: selectedArea?.area_name === 'desktop_content_top' ? '#2563eb' : hoveredArea === areas.find(a => a.area_name === 'desktop_content_top')?.id ? '#60a5fa' : '#fde047',
            backgroundColor: selectedArea?.area_name === 'desktop_content_top' ? '#dbeafe' : hoveredArea === areas.find(a => a.area_name === 'desktop_content_top')?.id ? '#fef08a' : '#fef9c3',
          }}
          onMouseEnter={() => onAreaHover(areas.find(a => a.area_name === 'desktop_content_top')?.id || null)}
          onMouseLeave={() => onAreaHover(null)}
          onClick={() => {
            const area = areas.find(a => a.area_name === 'desktop_content_top');
            if (area) onAreaClick(area);
          }}
        >
          <span className="text-xs text-gray-600 font-medium">Content Top</span>
        </div>
      )}

      {/* Content Middle */}
      {areas.find(a => a.area_name === 'desktop_content_middle') && (
        <div
          className="absolute top-44 left-0 right-64 h-24 bg-purple-100 border-2 border-dashed border-purple-300 flex items-center justify-center cursor-pointer hover:bg-purple-200 transition-all"
          style={{
            borderColor: selectedArea?.area_name === 'desktop_content_middle' ? '#2563eb' : hoveredArea === areas.find(a => a.area_name === 'desktop_content_middle')?.id ? '#60a5fa' : '#c084fc',
            backgroundColor: selectedArea?.area_name === 'desktop_content_middle' ? '#dbeafe' : hoveredArea === areas.find(a => a.area_name === 'desktop_content_middle')?.id ? '#e9d5ff' : '#f3e8ff',
          }}
          onMouseEnter={() => onAreaHover(areas.find(a => a.area_name === 'desktop_content_middle')?.id || null)}
          onMouseLeave={() => onAreaHover(null)}
          onClick={() => {
            const area = areas.find(a => a.area_name === 'desktop_content_middle');
            if (area) onAreaClick(area);
          }}
        >
          <span className="text-xs text-gray-600 font-medium">Content Middle</span>
        </div>
      )}

      {/* Sidebar Bottom */}
      {areas.find(a => a.area_name === 'desktop_sidebar_bottom') && (
        <div
          className="absolute bottom-20 right-0 w-64 h-48 bg-pink-100 border-2 border-dashed border-pink-300 flex items-center justify-center cursor-pointer hover:bg-pink-200 transition-all"
          style={{
            borderColor: selectedArea?.area_name === 'desktop_sidebar_bottom' ? '#2563eb' : hoveredArea === areas.find(a => a.area_name === 'desktop_sidebar_bottom')?.id ? '#60a5fa' : '#f9a8d4',
            backgroundColor: selectedArea?.area_name === 'desktop_sidebar_bottom' ? '#dbeafe' : hoveredArea === areas.find(a => a.area_name === 'desktop_sidebar_bottom')?.id ? '#fce7f3' : '#fdf2f8',
          }}
          onMouseEnter={() => onAreaHover(areas.find(a => a.area_name === 'desktop_sidebar_bottom')?.id || null)}
          onMouseLeave={() => onAreaHover(null)}
          onClick={() => {
            const area = areas.find(a => a.area_name === 'desktop_sidebar_bottom');
            if (area) onAreaClick(area);
          }}
        >
          <span className="text-xs text-gray-600 font-medium">Sidebar Bottom</span>
        </div>
      )}

      {/* Footer Banner */}
      {areas.find(a => a.area_name === 'desktop_footer_banner') && (
        <div
          className="absolute bottom-0 left-0 right-0 h-20 bg-red-100 border-2 border-dashed border-red-300 flex items-center justify-center cursor-pointer hover:bg-red-200 transition-all"
          style={{
            borderColor: selectedArea?.area_name === 'desktop_footer_banner' ? '#2563eb' : hoveredArea === areas.find(a => a.area_name === 'desktop_footer_banner')?.id ? '#60a5fa' : '#f87171',
            backgroundColor: selectedArea?.area_name === 'desktop_footer_banner' ? '#dbeafe' : hoveredArea === areas.find(a => a.area_name === 'desktop_footer_banner')?.id ? '#fecaca' : '#fee2e2',
          }}
          onMouseEnter={() => onAreaHover(areas.find(a => a.area_name === 'desktop_footer_banner')?.id || null)}
          onMouseLeave={() => onAreaHover(null)}
          onClick={() => {
            const area = areas.find(a => a.area_name === 'desktop_footer_banner');
            if (area) onAreaClick(area);
          }}
        >
          <span className="text-xs text-gray-600 font-medium">Footer Banner</span>
        </div>
      )}
    </div>
  );
}

