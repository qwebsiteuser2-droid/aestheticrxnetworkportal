import { NextRequest, NextResponse } from 'next/server';

/**
 * One-Click Unsubscribe Endpoint (RFC 8058)
 * 
 * This endpoint handles one-click unsubscribe requests from email clients (Gmail, Outlook, etc.)
 * when users click the native "Unsubscribe" button in their email client.
 * 
 * The email client sends a POST request with the List-Unsubscribe-Post header,
 * and we need to extract the user information from the request.
 * 
 * IMPORTANT: Email clients may send user info in different ways:
 * - Some send it in the request body
 * - Some send it in query parameters
 * - Some include it in the List-Unsubscribe header
 * 
 * For maximum compatibility, we try multiple methods to extract user info.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body (email clients may send user info here)
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body might be empty or not JSON
    }
    
    // Extract user information from multiple sources
    const userId = body.userId || body.user_id || request.nextUrl.searchParams.get('userId');
    const token = body.token || request.nextUrl.searchParams.get('token');
    const email = body.email || request.nextUrl.searchParams.get('email');

    // If we have userId and token, process unsubscribe
    if (userId && token) {
      // Forward the unsubscribe request to the backend
      const { getBackendApiUrl } = await import('@/lib/getBackendUrl');
      const backendUrl = getBackendApiUrl();
      const backendResponse = await fetch(`${backendUrl}/unsubscribe/${userId}/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (backendResponse.ok) {
        const result = await backendResponse.json();
        
        // Return success response (email clients expect 200 OK)
        return NextResponse.json({
          success: true,
          message: result.message || 'Successfully unsubscribed',
        }, { status: 200 });
      } else {
        // If backend fails, still return success to email client
        // (to prevent retry loops) but log the error
        const errorText = await backendResponse.text();
        console.error('One-click unsubscribe failed:', errorText);
        
        // Return error but don't cause retry loops
        return NextResponse.json({
          success: false,
          message: 'Unable to process unsubscribe. Please use the unsubscribe link in the email.',
        }, { status: 200 }); // Return 200 to prevent retry
      }
    }

    // If we don't have user info, return error but don't cause retry loops
    console.warn('One-click unsubscribe: Missing user info', { 
      body, 
      searchParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
      headers: Object.fromEntries(request.headers.entries())
    });
    
    return NextResponse.json({
      success: false,
      message: 'Unable to process one-click unsubscribe. Please use the unsubscribe link in the email.',
    }, { status: 200 }); // Return 200 to prevent email client retry loops
  } catch (error) {
    console.error('Error processing one-click unsubscribe:', error);
    
    // On error, return success to prevent retry loops
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please use the unsubscribe link in the email.',
    }, { status: 200 }); // Return 200 to prevent retry
  }
}

/**
 * GET handler for one-click unsubscribe (fallback)
 * Some email clients may use GET instead of POST
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId');
  const token = searchParams.get('token');

  // Get frontend URL from request or use default
  const getFrontendUrl = () => {
    // In API routes, we can't access window, so use env or construct from headers
    if (process.env.NEXT_PUBLIC_FRONTEND_URL) {
      return process.env.NEXT_PUBLIC_FRONTEND_URL;
    }
    // Try to get from request headers
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    if (host) {
      return `${protocol}://${host}`;
    }
    // Fallback
    return 'http://localhost:3000';
  };

  if (userId && token) {
    // Redirect to the unsubscribe page with the token
    const frontendUrl = getFrontendUrl();
    return NextResponse.redirect(`${frontendUrl}/unsubscribe/${userId}/${token}`);
  }

  // If no token, redirect to home
  const frontendUrl = getFrontendUrl();
  return NextResponse.redirect(`${frontendUrl}/`);
}
