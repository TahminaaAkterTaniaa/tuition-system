import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { Resource } from '@prisma/client';

// Extended Resource type with Blob fields
type ResourceWithBlob = Resource & {
  blobUrl?: string;
  blobId?: string;
  class?: any;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Allow both teachers and students to download resources
    if (session.user.role !== 'TEACHER' && session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resourceId = params.id;
    
    if (!resourceId) {
      return NextResponse.json({ error: 'Resource ID is required' }, { status: 400 });
    }
    
    // Get the resource
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        class: {
          include: {
            enrollments: {
              where: {
                student: {
                  userId: session.user.role === 'STUDENT' ? session.user.id : undefined
                }
              }
            }
          }
        }
      }
    });
    
    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }
    
    // Check if user has access to this resource
    if (session.user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });
      
      if (!teacher || teacher.id !== resource.teacherId) {
        return NextResponse.json({ error: 'You do not have access to this resource' }, { status: 403 });
      }
    } else if (session.user.role === 'STUDENT') {
      // Check if student is enrolled in the class
      if (!resource.class?.enrollments || resource.class.enrollments.length === 0) {
        return NextResponse.json({ error: 'You do not have access to this resource' }, { status: 403 });
      }
    }
    
    // Type assertion to include the new blob fields
    const resourceWithBlob = resource as unknown as ResourceWithBlob;
    
    // Check if the resource has a Vercel Blob URL
    if (resourceWithBlob.blobUrl) {
      // If the resource has a Blob URL, redirect to it for direct download
      return NextResponse.redirect(resourceWithBlob.blobUrl);
    }
    
    // If there's no blob URL, check for a traditional file path
    const filePath = resource.filePath;
    
    if (!filePath) {
      return NextResponse.json({ error: 'No download URL or file path found' }, { status: 404 });
    }
    
    try {
      // Legacy fallback for resources without blob URLs
      // This section would handle local file paths if applicable
      // Since we're migrating to Vercel Blob, this is mainly for backward compatibility
      
      // For now, return an error indicating the resource needs to be updated
      return NextResponse.json({ 
        error: 'This resource is not available for download using the legacy method. Please use the direct download link.'
      }, { status: 404 });
      
      // With Vercel Blob, we should never reach here if there's a blobUrl
      // This is a fallback for legacy files
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return NextResponse.json({ error: 'Error reading file' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error downloading resource:', error);
    return NextResponse.json({ error: 'Failed to download resource' }, { status: 500 });
  }
}
