import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: Request) {
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
        { error: 'Teacher profile not found.' },
        { status: 404 }
      );
    }
    
    // Get resources for classes taught by this teacher
    const resources = await prisma.resource.findMany({
      where: {
        class: {
          teacherId: teacher.id
        }
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            subject: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Format the resources data
    const formattedResources = resources.map(resource => ({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      // Use default values for properties that might not exist in the schema yet
      fileType: 'document',
      fileSize: '1 MB',
      fileUrl: '/resources/sample.pdf',
      uploadDate: resource.createdAt,
      classId: resource.classId,
      className: resource.class.name,
      subject: resource.class.subject
    }));
    
    return NextResponse.json({ resources: formattedResources });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}
