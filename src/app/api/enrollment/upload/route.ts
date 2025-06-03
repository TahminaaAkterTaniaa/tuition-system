import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { uploadToBlob } from '@/app/lib/blob-storage';
import { PrismaClient } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    console.log('File upload request received');
    const session = await getServerSession(authOptions);
    if (!session) {
      console.error('Unauthorized: No session found');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string;

    if (!file) {
      console.error('No file in request');
      return new NextResponse(JSON.stringify({ error: 'No file uploaded' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!fileType || !['idDocument', 'transcript'].includes(fileType)) {
      console.error('Invalid file type:', fileType);
      return new NextResponse(JSON.stringify({ error: 'Invalid file type' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get file extension
    const originalName = file.name;
    const ext = originalName.split('.').pop()?.toLowerCase();

    // Validate file type
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    if (!ext || !allowedExtensions.includes(ext)) {
      console.error('Invalid file extension:', ext);
      return new NextResponse(JSON.stringify({ error: 'Invalid file format. Only JPG, PNG, and PDF files are allowed.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error('File too large:', file.size);
      return new NextResponse(JSON.stringify({ error: 'File size too large. Maximum size is 10MB.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Converting file to buffer for Vercel Blob upload...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Upload file to Vercel Blob storage
    const uploadResult = await uploadToBlob(buffer, originalName, fileType);

    if (!uploadResult.success) {
      console.error('Failed to upload file to Vercel Blob:', uploadResult.error);
      return new NextResponse(JSON.stringify({ error: 'Failed to upload file to blob storage' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return the Blob URL and ID
    return new NextResponse(JSON.stringify({
      success: true,
      path: uploadResult.url,
      blobId: uploadResult.blobId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return new NextResponse(JSON.stringify({ 
      error: errorMessage,
      success: false,
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
