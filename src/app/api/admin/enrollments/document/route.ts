import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    console.log('Session in admin document API:', session ? 'Session exists' : 'No session');

    // Check if user is authenticated
    if (!session || !session.user) {
      console.log('No authenticated session found in admin document API');
      return NextResponse.json(
        { error: 'You must be logged in to view enrollment documents.' },
        { status: 401 }
      );
    }
    
    // Check if user is an admin
    if (session.user.role !== 'ADMIN') {
      console.log('User is not an admin:', session.user.role);
      return NextResponse.json(
        { error: 'Unauthorized. Only administrators can view enrollment documents.' },
        { status: 403 }
      );
    }

    // Get the document path from the query parameters
    const url = new URL(req.url);
    const documentPath = url.searchParams.get('path');

    if (!documentPath) {
      return NextResponse.json(
        { error: 'Document path is required' },
        { status: 400 }
      );
    }

    // Validate the path to prevent directory traversal attacks
    const normalizedPath = path.normalize(documentPath);
    if (normalizedPath.includes('..')) {
      return NextResponse.json(
        { error: 'Invalid document path' },
        { status: 400 }
      );
    }

    // Construct the full path to the document
    const fullPath = path.join(process.cwd(), normalizedPath);

    try {
      // Read the file
      const fileBuffer = await readFile(fullPath);

      // Determine the content type based on the file extension
      const ext = path.extname(fullPath).toLowerCase();
      let contentType = 'application/octet-stream'; // Default content type

      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      } else if (ext === '.gif') {
        contentType = 'image/gif';
      } else if (ext === '.txt') {
        contentType = 'text/plain';
      }

      // Create a response with the file content
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${path.basename(fullPath)}"`,
        },
      });
    } catch (fileError) {
      console.error('Error reading document file:', fileError);
      return NextResponse.json(
        { error: 'Document not found or could not be read' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error serving document:', error);
    return NextResponse.json(
      { error: 'Failed to serve document' },
      { status: 500 }
    );
  }
}
