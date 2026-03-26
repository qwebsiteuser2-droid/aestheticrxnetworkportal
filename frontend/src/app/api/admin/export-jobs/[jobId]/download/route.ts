import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl } from '@/lib/getBackendUrl';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    const response = await fetch(`${getBackendApiUrl()}/admin/export-jobs/${jobId}/download`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="export_${jobId}.zip"`,
      },
    });
  } catch (error) {
    console.error('Error downloading export:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to download export' },
      { status: 500 }
    );
  }
}
