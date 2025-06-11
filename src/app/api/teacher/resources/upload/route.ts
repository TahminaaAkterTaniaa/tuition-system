import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { uploadToBlob } from '@/app/lib/blob-storage';

export async function POST(request: Request) {
  console.log('[API:Upload] Resource upload request received');
  const requestStartTime = Date.now();
  
  try {
    console.log('[API:Upload] Verifying authentication and authorization');
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('[API:Upload] Unauthorized: No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[API:Upload] User session found:', {
      userId: session.user.id,
      role: session.user.role,
      email: session.user.email
    });
    
    if (session.user.role !== 'TEACHER') {
      console.log('[API:Upload] Forbidden: User is not a teacher');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get teacher profile
    console.log('[API:Upload] Fetching teacher profile for userId:', session.user.id);
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    }).catch(err => {
      console.error('[API:Upload] Database error when fetching teacher profile:', err);
      throw err;
    });
    
    if (!teacher) {
      console.log('[API:Upload] Teacher profile not found for user ID:', session.user.id);
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      );
    }
    console.log('[API:Upload] Teacher profile found:', { teacherId: teacher.id });
    
    // Extract and validate form data
    console.log('[API:Upload] Extracting form data');
    let formData;
    try {
      formData = await request.formData();
      console.log('[API:Upload] FormData keys:', [...formData.keys()]);
    } catch (formError) {
      console.error('[API:Upload] Error parsing form data:', formError);
      return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 });
    }
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const classId = formData.get('classId') as string;
    const file = formData.get('file') as File;
    
    console.log('[API:Upload] Form data extracted:', { 
      hasTitle: !!title, 
      hasDescription: !!description,
      hasClassId: !!classId,
      hasFile: !!file
    });
    
    if (file) {
      console.log('[API:Upload] File details:', {
        name: file.name,
        type: file.type,
        size: `${Math.round(file.size / 1024)} KB`
      });
    }
    
    if (!title || !classId || !file) {
      console.log('[API:Upload] Missing required fields:', {
        title: !!title,
        classId: !!classId,
        file: !!file
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate that the class belongs to this teacher
    console.log('[API:Upload] Validating class ownership, classId:', classId);
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacher.id,
      },
    }).catch(err => {
      console.error('[API:Upload] Database error when fetching class:', err);
      throw err;
    });
    
    if (!classData) {
      console.log('[API:Upload] Class not found or doesn\'t belong to teacher:', {
        classId,
        teacherId: teacher.id
      });
      return NextResponse.json(
        { error: 'Class not found or you do not have permission to add resources to it' },
        { status: 404 }
      );
    }
    
    console.log('[API:Upload] Class validated successfully:', { className: classData.name });
    
    // Convert the file to buffer for blob storage
    console.log('[API:Upload] Converting file to buffer');
    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
      console.log('[API:Upload] File converted to arrayBuffer successfully, size:', arrayBuffer.byteLength);
    } catch (bufferError) {
      console.error('[API:Upload] Error converting file to arrayBuffer:', bufferError);
      return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
    }
    
    const buffer = Buffer.from(arrayBuffer);
    console.log('[API:Upload] Buffer created with size:', buffer.length);
    
    // Upload to Vercel Blob
    console.log('[API:Upload] Starting upload to Vercel Blob');
    const uploadStartTime = Date.now();
    let uploadResult;
    
    try {
      uploadResult = await uploadToBlob(buffer, file.name, 'teacher_resource');
      console.log(`[API:Upload] Vercel Blob upload completed in ${Date.now() - uploadStartTime}ms:`, {
        success: uploadResult.success,
        hasUrl: !!uploadResult.url,
        hasBlobId: !!uploadResult.blobId,
        error: uploadResult.error || 'none'
      });
    } catch (blobError) {
      console.error('[API:Upload] Uncaught error in Vercel Blob upload:', blobError);
      return NextResponse.json(
        { error: blobError instanceof Error ? blobError.message : 'Unexpected error during file upload' },
        { status: 500 }
      );
    }
    
    if (!uploadResult.success) {
      console.error('[API:Upload] Vercel Blob upload failed:', uploadResult.error);
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload file to storage' },
        { status: 500 }
      );
    }
    
    const fileUrl = uploadResult.url || '';
    console.log('[API:Upload] File URL from blob storage:', fileUrl);
    
    // Get file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Determine file type
    let fileType = 'document';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
      fileType = 'image';
    } else if (['pdf'].includes(fileExtension)) {
      fileType = 'pdf';
    } else if (['doc', 'docx'].includes(fileExtension)) {
      fileType = 'word';
    } else if (['xls', 'xlsx'].includes(fileExtension)) {
      fileType = 'excel';
    } else if (['ppt', 'pptx'].includes(fileExtension)) {
      fileType = 'presentation';
    }
    
    // Create the resource
    console.log('[API:Upload] Creating resource record in database');
    let resource;
    try {
      resource = await prisma.resource.create({
        data: {
          title,
          description,
          classId,
          teacherId: teacher.id,
          url: fileUrl,
          blobUrl: uploadResult.url,
          blobId: uploadResult.blobId,
          type: fileType,
          fileSize: `${Math.round(file.size / 1024)} KB`,
          isPublished: true,
        },
      });
      console.log('[API:Upload] Resource record created successfully:', { resourceId: resource.id });
    } catch (dbError) {
      console.error('[API:Upload] Database error creating resource record:', dbError);
      return NextResponse.json(
        { error: 'Failed to save resource to database' },
        { status: 500 }
      );
    }
    
    const response = {
      success: true,
      resource: {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        classId: resource.classId,
        url: resource.url,
        blobUrl: resource.blobUrl,
        blobId: resource.blobId,
        type: resource.type,
        fileSize: resource.fileSize,
        createdAt: resource.createdAt,
      },
    };
    
    console.log(`[API:Upload] Request completed successfully in ${Date.now() - requestStartTime}ms`);
    return NextResponse.json(response);
  } catch (error) {
    console.error('[API:Upload] Uncaught error processing upload:', error);
    
    // Get more details about the error
    let errorMessage = 'Failed to upload resource';
    if (error instanceof Error) {
      console.error('[API:Upload] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      errorMessage = `Upload failed: ${error.message}`;
    }
    
    console.log(`[API:Upload] Request failed in ${Date.now() - requestStartTime}ms`);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
