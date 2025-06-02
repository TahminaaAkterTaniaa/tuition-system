import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import path from 'path';
import fs from 'fs';

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
      if (resource.class.enrollments.length === 0) {
        return NextResponse.json({ error: 'You do not have access to this resource' }, { status: 403 });
      }
    }
    
    // Get the file path
    const filePath = resource.filePath;
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path not found' }, { status: 404 });
    }
    
    try {
      // Since we don't have actual file storage yet, we'll create a sample file
      // based on the resource type to demonstrate the download functionality
      
      let fileContent = '';
      let contentType = 'text/plain';
      let fileName = `${resource.title || 'resource'}.txt`;
      
      // Determine file type from resource or use a default
      const fileType = resource.type || 'document';
      
      // Generate different sample content based on the resource type
      // This is a placeholder until actual file storage is implemented
      if (fileType.toLowerCase() === 'pdf') {
        fileContent = '%PDF-1.5\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n3 0 obj\n<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer\n<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF';
        contentType = 'application/pdf';
        fileName = `${resource.title || 'resource'}.pdf`;
      } else if (fileType.toLowerCase() === 'docx') {
        // This is not a real DOCX file, just a placeholder
        fileContent = 'This is a sample DOCX file content for ' + resource.title;
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        fileName = `${resource.title || 'resource'}.docx`;
      } else if (fileType.toLowerCase() === 'pptx') {
        fileContent = 'This is a sample PPTX file content for ' + resource.title;
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        fileName = `${resource.title || 'resource'}.pptx`;
      } else {
        // Default to text file
        fileContent = `This is a sample text file for ${resource.title}\n\nThis is a placeholder until actual file storage is implemented.\n\nResource ID: ${resource.id}\nClass: ${resource.classId}\nUploaded by: Teacher`;
        contentType = 'text/plain';
        fileName = `${resource.title || 'resource'}.txt`;
      }
      
      // Return the file with appropriate headers
      return new NextResponse(fileContent, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
        }
      });
      
      // In a real implementation with actual files, you would use something like:
      /*
      const fileContent = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const contentType = determineContentType(fileName);
      
      return new NextResponse(fileContent, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
        }
      });
      */
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return NextResponse.json({ error: 'Error reading file' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error downloading resource:', error);
    return NextResponse.json({ error: 'Failed to download resource' }, { status: 500 });
  }
}
