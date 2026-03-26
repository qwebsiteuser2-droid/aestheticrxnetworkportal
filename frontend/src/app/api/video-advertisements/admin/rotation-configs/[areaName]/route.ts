import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl } from '@/lib/getBackendUrl';

export async function GET(
  request: NextRequest,
  { params }: { params: { areaName: string } }
) {
  try {
    const { areaName } = params;

    if (!areaName) {
      return NextResponse.json(
        { success: false, message: 'Area name is required' },
        { status: 400 }
      );
    }

    // Proxy the request to the backend
    const backendUrl = `${getBackendApiUrl()}/video-advertisements/admin/rotation-configs/${areaName}`;
    
    const response = await fetch(backendUrl);
    
    if (!response.ok) {
      // Return default config if backend is not available
      return NextResponse.json({
        success: true,
        data: {
          rotation_interval_seconds: 5,
          auto_rotation_enabled: true
        }
      });
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying rotation config request:', error);
    // Return default config on error
    return NextResponse.json({
      success: true,
      data: {
        rotation_interval_seconds: 5,
        auto_rotation_enabled: true
      }
    });
  }
}
