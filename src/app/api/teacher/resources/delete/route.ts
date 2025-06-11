import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { deleteFromBlob } from '@/app/lib/blob-storage';

export async function DELETE(request: Request) {
  console.log('[API:Delete] Resource delete request received');
  const requestStartTime = Date.now();
  
  try {
    console.log('[API:Delete] Verifying authentication and authorization');
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('[API:Delete] Unauthorized: No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[API:Delete] User session found:', {
      userId: session.user.id,
      role: session.user.role,
      email: session.user.email
    });
    
    if (session.user.role !== 'TEACHER') {
      console.log('[API:Delete] Forbidden: User is not a teacher');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get teacher profile
    console.log('[API:Delete] Fetching teacher profile for userId:', session.user.id);
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    }).catch(err => {
      console.error('[API:Delete] Database error when fetching teacher profile:', err);
      throw err;
    });
    
    if (!teacher) {
      console.log('[API:Delete] Teacher profile not found for user ID:', session.user.id);
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      );
    }
    
    console.log('[API:Delete] Teacher profile found:', { teacherId: teacher.id });
    
    // Parse request body to get resource ID and blob ID
    console.log('[API:Delete] Parsing request body');
    let body;
    try {
      body = await request.json();
      console.log('[API:Delete] Request body:', body);
    } catch (parseError) {
      console.error('[API:Delete] Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { resourceId, blobId } = body;
    console.log('[API:Delete] Extracted from body:', { resourceId, hasBlobId: !!blobId });
    
    if (!resourceId) {
      console.log('[API:Delete] Missing required resourceId');
      return NextResponse.json(
        { error: 'Resource ID is required' },
        { status: 400 }
      );
    }
    
    // Verify the resource belongs to this teacher
    console.log('[API:Delete] Verifying resource ownership, resourceId:', resourceId);
    let resource;
    try {
      resource = await prisma.resource.findFirst({
        where: {
          id: resourceId,
          teacherId: teacher.id,
        },
      });
    } catch (dbError) {
      console.error('[API:Delete] Database error when fetching resource:', dbError);
      throw dbError;
    }
    
    if (!resource) {
      console.log('[API:Delete] Resource not found or doesn\'t belong to teacher:', {
        resourceId,
        teacherId: teacher.id
      });
      return NextResponse.json(
        { error: 'Resource not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    console.log('[API:Delete] Resource found:', {
      id: resource.id,
      title: resource.title,
      hasBlobId: !!resource.blobId,
      storedBlobId: resource.blobId || 'none'
    });
    
    // First delete the blob from storage if blobId is provided
    let blobIdToDelete = blobId || resource.blobId;
    
    if (blobIdToDelete) {
      console.log('[API:Delete] Attempting to delete blob with ID:', blobIdToDelete);
      try {
        const deleteResult = await deleteFromBlob(blobIdToDelete);
        if (!deleteResult) {
          console.warn(`[API:Delete] Failed to delete blob with ID ${blobIdToDelete}, but continuing with database deletion`);
        } else {
          console.log(`[API:Delete] Successfully deleted blob with ID ${blobIdToDelete}`);
        }
      } catch (blobError) {
        console.error('[API:Delete] Error deleting blob:', blobError);
        // Continue with database deletion even if blob deletion failed
      }
    } else {
      console.log('[API:Delete] No blob ID provided or found in resource record');
    }
    
    // Then delete the resource record from the database
    console.log('[API:Delete] Deleting resource record from database, id:', resourceId);
    try {
      await prisma.resource.delete({
        where: {
          id: resourceId,
        },
      });
      console.log('[API:Delete] Successfully deleted resource record from database');
    } catch (dbError) {
      console.error('[API:Delete] Database error when deleting resource:', dbError);
      throw dbError;
    }
    
    console.log(`[API:Delete] Request completed successfully in ${Date.now() - requestStartTime}ms`);
    return NextResponse.json({
      success: true,
      message: 'Resource deleted successfully'
    });
    
  } catch (error) {
    console.error('[API:Delete] Uncaught error processing deletion:', error);
    
    // Get more details about the error
    let errorMessage = 'Failed to delete resource';
    if (error instanceof Error) {
      console.error('[API:Delete] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      errorMessage = `Delete failed: ${error.message}`;
    }
    
    console.log(`[API:Delete] Request failed in ${Date.now() - requestStartTime}ms`);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
