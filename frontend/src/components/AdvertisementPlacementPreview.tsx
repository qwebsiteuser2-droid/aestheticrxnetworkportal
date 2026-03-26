'use client';

import React from 'react';

interface AdvertisementPlacementPreviewProps {
  selectedArea?: string;
}

export default function AdvertisementPlacementPreview({ selectedArea }: AdvertisementPlacementPreviewProps) {
  // Only the 4 active placements
  const placements = [
    {
      areaName: 'top_banner_highest_visibility',
      displayName: 'Top Banner (Highest Visibility)',
      position: { top: '0', left: '0', width: '100%', height: '90px' },
      section: 'header'
    },
    {
      areaName: 'hero_section_main',
      displayName: 'Hero Section Main',
      position: { top: '90px', left: '0', width: '100%', height: '300px' },
      section: 'hero'
    },
    {
      areaName: 'purple_pink_content_area',
      displayName: 'Purple/Pink Content Area',
      position: { top: '390px', left: '0', width: '100%', height: '150px' },
      section: 'content'
    },
    {
      areaName: 'main_blue_area_b2b_platform',
      displayName: 'Main Blue Area (B2B Platform)',
      position: { top: '540px', left: '0', width: '100%', height: '200px' },
      section: 'features'
    }
  ];

  // Also support frontend area names that map to these placements
  const areaMapping: Record<string, string> = {
    'desktop-header-banner': 'top_banner_highest_visibility',
    'mobile-header-banner': 'top_banner_highest_visibility',
    'desktop-footer-banner': 'purple_pink_content_area',
    'mobile-footer-banner': 'purple_pink_content_area',
    'main_blue_area_prime_real_estate': 'main_blue_area_b2b_platform'
  };

  // Map selected area to placement area name
  const mappedSelectedArea = selectedArea && areaMapping[selectedArea] ? areaMapping[selectedArea] : selectedArea;

  return (
    <div className="bg-gray-100 rounded-lg p-6 border border-gray-200">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">📍 Advertisement Placement Preview</h4>
      <p className="text-sm text-gray-600 mb-4">
        This shows where your advertisement will appear on the landing page. Selected areas are highlighted in blue.
      </p>
      
      <div className="relative bg-white rounded-lg shadow-sm overflow-hidden" style={{ height: '750px', width: '100%' }}>
        {/* Simplified landing page mockup */}
        <div className="absolute inset-0 flex flex-col">
          {/* Header */}
          <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-center relative">
            <span className="text-sm font-semibold text-gray-700">Header</span>
            {placements.find(p => p.section === 'header' && (p.areaName === mappedSelectedArea || mappedSelectedArea === p.areaName)) && (
              <div
                className="absolute inset-0 border-4 border-blue-600 bg-blue-500 bg-opacity-30 z-10 flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="text-xs font-bold text-white">TOP BANNER (HIGHEST VISIBILITY)</div>
                  <div className="text-xs text-white mt-1">✓ Your Ad Here</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Hero Section (Blue Area) */}
          <div className="flex-1 bg-gradient-to-r from-blue-100 to-blue-200 relative flex items-center justify-center min-h-[300px]">
            <span className="text-sm font-semibold text-gray-700">Hero Section (Blue Area)</span>
            {placements.find(p => p.section === 'hero' && (p.areaName === mappedSelectedArea || mappedSelectedArea === p.areaName)) && (
              <div
                className="absolute inset-0 border-4 border-blue-600 bg-blue-500 bg-opacity-30 z-10 flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="text-xs font-bold text-white">HERO SECTION MAIN</div>
                  <div className="text-xs text-white mt-1">✓ Your Ad Here</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Purple/Pink Content Area (Research Papers Section) */}
          <div className="h-32 bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center border-t border-gray-200 relative">
            <span className="text-sm font-semibold text-gray-700">Research Papers Section</span>
            {placements.find(p => p.section === 'content' && (p.areaName === mappedSelectedArea || mappedSelectedArea === p.areaName)) && (
              <div
                className="absolute inset-0 border-4 border-blue-600 bg-blue-500 bg-opacity-30 z-10 flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="text-xs font-bold text-white">PURPLE/PINK CONTENT AREA</div>
                  <div className="text-xs text-white mt-1">✓ Your Ad Here</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Features Section (Main Blue Area B2B Platform) */}
          <div className="h-32 bg-gradient-to-r from-blue-50 to-blue-100 flex items-center justify-center border-t border-gray-200 relative">
            <span className="text-sm font-semibold text-gray-700">Features Section</span>
            {placements.find(p => p.section === 'features' && (p.areaName === mappedSelectedArea || mappedSelectedArea === p.areaName)) && (
              <div
                className="absolute inset-0 border-4 border-blue-600 bg-blue-500 bg-opacity-30 z-10 flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="text-xs font-bold text-white">MAIN BLUE AREA (B2B PLATFORM)</div>
                  <div className="text-xs text-white mt-1">✓ Your Ad Here</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="h-16 bg-gray-900 flex items-center justify-center">
            <span className="text-sm font-semibold text-white">Footer</span>
          </div>
        </div>
      </div>
      
      {selectedArea && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Selected:</span> {
              placements.find(p => p.areaName === mappedSelectedArea || mappedSelectedArea === p.areaName)?.displayName ||
              selectedArea.replace(/_/g, ' ').replace(/-/g, ' ')
            }
          </p>
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500">
        <p>💡 <strong>Tip:</strong> Quitable ads can be closed by users, while persistent ads remain visible until they expire.</p>
      </div>
    </div>
  );
}
