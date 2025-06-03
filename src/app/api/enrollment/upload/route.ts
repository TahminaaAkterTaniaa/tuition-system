import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { saveFile } from '@/app/lib/fileStorage';

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

    // Use the utility function to save the file
    console.log(`Saving ${fileType} file ${file.name}...`);
    const result = await saveFile(file, fileType);

    if (!result.success) {
      console.error('File save failed:', result.error);
      return new NextResponse(JSON.stringify({ 
        error: result.error || 'Failed to save file' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('File saved successfully:', result.path);
    
    // Return the relative path to the file
    return new NextResponse(JSON.stringify({
      success: true,
      path: result.path,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
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
