import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { createAdminNotification, createActivityLog } from '@/app/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can create class requests' }, { status: 403 });
    }
    
    const data = await req.json();
    
    // Get teacher ID from session
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }
    
    // Create the class with pending status
    const newClass = await prisma.class.create({
      data: {
        name: data.name,
        subject: data.subject,
        description: data.description || null,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        capacity: parseInt(data.capacity),
        teacherId: teacher.id,
        status: 'pending', // Default is pending
        fee: data.fee || 99.99,
        // Add schedules if provided
        schedules: data.schedules ? {
          create: data.schedules.map((schedule: any) => ({
            day: schedule.day,
            time: schedule.time,
            roomId: schedule.roomId || null,
            timeSlotId: schedule.timeSlotId || null
          }))
        } : undefined
      }
    });
    
    // Create the class creation request
    const classCreationRequest = await prisma.classCreationRequest.create({
      data: {
        classId: newClass.id,
        teacherId: teacher.id,
        notes: data.notes || 'New class creation request',
      }
    });
    
    // Create notification for admins
    await createAdminNotification(
      'class_creation_request',
      classCreationRequest.id,
      `New class creation request: ${data.name} (${data.subject}) by ${session.user.name || 'a teacher'}`
    );
    
    // Log the activity
    await createActivityLog(
      session.user.id,
      'CREATE_CLASS_REQUEST',
      `Requested to create class: ${data.name}`,
      'class_creation_request',
      classCreationRequest.id,
      {
        classId: newClass.id,
        requestId: classCreationRequest.id
      }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Class creation request submitted successfully. It will be reviewed by an administrator.',
      classId: newClass.id,
      requestId: classCreationRequest.id
    });
    
  } catch (error: any) {
    console.error('Error creating class request:', error);
    return NextResponse.json(
      { error: 'Failed to create class request', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const teacherId = url.searchParams.get('teacherId');
    
    let whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (session.user.role === 'TEACHER') {
      // Teachers can only see their own requests
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!teacher) {
        return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
      }
      
      whereClause.teacherId = teacher.id;
    } else if (teacherId && session.user.role === 'ADMIN') {
      // Admins can filter by teacher
      whereClause.teacherId = teacherId;
    }
    
    const requests = await prisma.classCreationRequest.findMany({
      where: whereClause,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            status: true,
            startDate: true,
            capacity: true,
            fee: true
          }
        },
        teacher: {
          select: {
            id: true,
            teacherId: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(requests);
    
  } catch (error: any) {
    console.error('Error fetching class creation requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class creation requests', message: error.message },
      { status: 500 }
    );
  }
}
