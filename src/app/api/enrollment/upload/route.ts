import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string;

    if (!file) {
      return new NextResponse('No file uploaded', { status: 400 });
    }

    if (!fileType || !['idDocument', 'transcript'].includes(fileType)) {
      return new NextResponse('Invalid file type', { status: 400 });
    }

    // Get file extension
    const originalName = file.name;
    const ext = originalName.split('.').pop()?.toLowerCase();

    // Validate file type
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    if (!ext || !allowedExtensions.includes(ext)) {
      return new NextResponse('Invalid file format. Only JPG, PNG, and PDF files are allowed.', { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new NextResponse('File size too large. Maximum size is 10MB.', { status: 400 });
    }

    // Generate unique filename
    const uniqueId = randomUUID();
    const fileName = `${fileType}_${uniqueId}.${ext}`;
    const uploadDir = join(process.cwd(), 'uploads');
    const filePath = join(uploadDir, fileName);

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the relative path to the file
    const relativePath = `${fileName}`;

    return new NextResponse(JSON.stringify({
      success: true,
      path: relativePath,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
