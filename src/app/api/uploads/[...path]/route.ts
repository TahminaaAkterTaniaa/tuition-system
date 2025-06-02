import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { stat, readFile } from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Join the path segments to create the full file path
    const filePath = join(process.cwd(), 'uploads', ...params.path);

    try {
      // Check if file exists
      await stat(filePath);
    } catch (e) {
      console.error('File not found:', filePath);
      return new NextResponse('File not found', { status: 404 });
    }

    // Read the file
    const file = await readFile(filePath);

    // Determine content type based on file extension
    const ext = filePath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';

    if (ext === 'pdf') {
      contentType = 'application/pdf';
    } else if (['jpg', 'jpeg'].includes(ext || '')) {
      contentType = 'image/jpeg';
    } else if (ext === 'png') {
      contentType = 'image/png';
    }

    // Return the file with appropriate headers
    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
