import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { getBackendUrl } from '@/lib/getBackendUrl';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const areaName = searchParams.get('area_name');
    const deviceType = searchParams.get('device_type');

    if (!areaName) {
      return NextResponse.json(
        { success: false, message: 'Area name is required' },
        { status: 400 }
      );
    }

    // Proxy the request to the backend
    const baseBackendUrl = getBackendUrl();
    const backendUrl = `${baseBackendUrl}/api/video-advertisements/active?${searchParams.toString()}`;
    
    const response = await fetch(backendUrl);
    
    if (!response.ok) {
      console.error(`Backend responded with ${response.status} for ${backendUrl}`);
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    
    // Ensure area_config is included in the response
    return NextResponse.json({
      ...data,
      area_config: data.area_config || { ads_closeable: true, display_type: 'simple' }
    });
  } catch (error) {
    console.error('Error proxying video advertisements request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch advertisements' },
      { status: 500 }
    );
  }
}
