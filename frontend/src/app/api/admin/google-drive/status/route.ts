import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl } from '@/lib/getBackendUrl';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Extract the access token from cookies
    const accessToken = request.cookies.get('accessToken')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'No authentication token found' },
        { status: 401 }
      );
    }

    const response = await fetch(`${getBackendApiUrl()}/admin/google-drive/status`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Backend responded with ${response.status}: ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error checking Google Drive status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check Google Drive status' },
      { status: 500 }
    );
  }
}
