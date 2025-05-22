import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET - Fetch all classes for admin dashboard
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can access this endpoint' }, { status: 403 });
    }
    
    // Get all classes with teacher information and enrollment counts
    const classes = await prisma.class.findMany({
      include: {
        teacher: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    // Activity logging temporarily disabled due to foreign key constraint issues
    // Will be re-enabled once user data is properly seeded
    
    return NextResponse.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

// POST - Create a new class
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can create classes' }, { status: 403 });
    }
    
    const body = await req.json();
    const { name, subject, description, startDate, endDate, capacity, room, teacherId } = body;
    
    // Validate required fields
    if (!name || !subject || !startDate || !capacity) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, startDate, and capacity are required' },
        { status: 400 }
      );
    }
    
    // Check if teacher exists if teacherId is provided
    if (teacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        include: {
          classes: true,
        },
      });
      
      if (!teacher) {
        return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
      }
      
      // Check teacher workload
      if (teacher.classes.length >= 5) {
        return NextResponse.json(
          { error: 'Teacher has reached maximum workload (5 classes)' },
          { status: 400 }
        );
      }
    }
    
    // Create the new class
    const newClass = await prisma.class.create({
      data: {
        name,
        subject,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        capacity: parseInt(capacity),
        room,
        teacherId,
      },
    });
    
    // Try to log this activity, but don't fail if it doesn't work
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          description: `Admin created a new class: ${name}`,
          entityType: 'CLASS',
          entityId: newClass.id,
        },
      });
    } catch (logError) {
      // Just log the error but don't fail the class creation
      console.warn('Failed to create activity log, but class was created successfully:', logError);
    }
    
    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}
