import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const imagePath = params.path.join('/');
    
    // Security check - only allow specific directories
    if (!imagePath.startsWith('products_pics/') && !imagePath.startsWith('uploads/')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Construct the backend URL - use environment variable helper
    const { getBackendApiUrl } = await import('@/lib/getBackendUrl');
    const backendBaseUrl = getBackendApiUrl();
    const backendUrl = `${backendBaseUrl}/images/${imagePath}`;
    
    // Fetch the image from the backend
    const response = await fetch(backendUrl);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    
    // Get content type from backend response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
