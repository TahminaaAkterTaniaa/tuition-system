import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const classId = params.classId;
    
    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      );
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
    
    // Get class details
    const classData = await prisma.class.findUnique({
      where: {
        id: classId,
        teacherId: teacher.id, // Ensure the class belongs to this teacher
      },
      include: {
        teacher: true,
      },
    });
    
    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found or you do not have permission to view it' },
        { status: 404 }
      );
    }
    
    // Format the response
    const formattedClass = {
      id: classData.id,
      name: classData.name,
      subject: classData.subject,
      description: classData.description,
      startDate: classData.startDate,
      endDate: classData.endDate,
      schedule: classData.schedule,
      room: classData.room,
      capacity: classData.capacity,
      teacherId: classData.teacherId,
      // Get teacher name from user relation if available
      teacherName: 'Teacher',
      createdAt: classData.createdAt,
      updatedAt: classData.updatedAt,
    };
    
    return NextResponse.json(formattedClass);
  } catch (error) {
    console.error('Error fetching class details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class details' },
      { status: 500 }
    );
  }
}
