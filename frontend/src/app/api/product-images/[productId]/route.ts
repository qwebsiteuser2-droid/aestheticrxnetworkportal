import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl } from '@/lib/getBackendUrl';

/**
 * Proxy product images from the backend so browsers load same-origin URLs
 * (avoids broken cross-origin / wrong API base URL on Vercel).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params;
    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const backendBase = getBackendApiUrl();
    const query = request.nextUrl.searchParams.toString();
    const backendUrl = `${backendBase}/product-images/${productId}${
      query ? `?${query}` : ''
    }`;

    const response = await fetch(backendUrl, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Product image proxy error:', error);
    return NextResponse.json({ error: 'Failed to load image' }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
