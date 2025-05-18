import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get teacher profile
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    });
    
    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      );
    }
    
    // In a real implementation, we would use formidable or similar to handle file uploads
    // For now, we'll just create a resource record in the database
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const classId = formData.get('classId') as string;
    const file = formData.get('file') as File;
    
    if (!title || !classId || !file) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate that the class belongs to this teacher
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacher.id,
      },
    });
    
    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found or you do not have permission to add resources to it' },
        { status: 404 }
      );
    }
    
    // In a real implementation, we would upload the file to a storage service
    // and get a URL to store in the database
    // For now, we'll just create a placeholder URL
    const fileUrl = `/resources/${Date.now()}-${file.name}`;
    
    // Create the resource
    const resource = await prisma.resource.create({
      data: {
        title,
        description,
        classId,
        teacherId: teacher.id,
        // In a real implementation, these would be set based on the actual file
        url: fileUrl,
        // Since we don't know the exact schema, use required fields only
        type: 'document', // Default type
        isPublished: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      resource: {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        classId: resource.classId,
        url: resource.url,
        type: resource.type,
        // Use file size from the uploaded file instead of from the resource
        fileSize: `${Math.round(file.size / 1024)} KB`,
        createdAt: resource.createdAt,
      },
    });
  } catch (error) {
    console.error('Error uploading resource:', error);
    return NextResponse.json(
      { error: 'Failed to upload resource' },
      { status: 500 }
    );
  }
}
