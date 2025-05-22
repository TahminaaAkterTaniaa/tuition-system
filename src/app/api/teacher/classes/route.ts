import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET handler for fetching classes assigned to the logged-in teacher
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the teacher's ID
    console.log('Looking up teacher with userId:', session.user.id);
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });
    
    console.log('Teacher lookup result:', teacher);

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found.' },
        { status: 404 }
      );
    }

    // Get all classes for the teacher
    console.log('Fetching classes for teacherId:', teacher.id);
    try {
      const classes = await prisma.class.findMany({
        where: { 
          teacherId: teacher.id
        },
        include: {
          enrollments: {
            where: {
              status: { in: ['enrolled', 'completed'] }
            },
            select: {
              id: true
            }
          }
        }
      });

      console.log(`Found ${classes.length} classes`);
      
      // Transform the data to include student count
      const classesWithStudentCount = classes.map(classItem => {
        const enrolledCount = classItem.enrollments.length;
        
        // Remove the enrollments array from the response
        const { enrollments, ...classWithoutEnrollments } = classItem;
        
        return {
          ...classWithoutEnrollments,
          students: enrolledCount
        };
      });
      
      console.log(`Returning ${classesWithStudentCount.length} classes`);
      
      // Return the classes with a proper structure
      return NextResponse.json({
        classes: classesWithStudentCount
      });
    } catch (classesError) {
      console.error('Error in classes query:', classesError);
      throw classesError; // Re-throw to be caught by the outer try-catch
    }
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

// POST handler for creating a new class as a teacher
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the teacher's ID
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found.' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { name, subject, description, startDate, endDate, capacity, room } = body;
    
    // Validate required fields
    if (!name || !subject || !startDate || !capacity) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, startDate, and capacity are required' },
        { status: 400 }
      );
    }

    // Create the class
    const newClass = await prisma.class.create({
      data: {
        name,
        subject,
        description: description || '',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        capacity: parseInt(capacity),
        room: room || null, // Using room field from the schema
        teacherId: teacher.id, // Automatically assign the logged-in teacher
      }
    });

    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          description: `Teacher created class: ${name}`,
          entityType: 'CLASS',
          entityId: newClass.id,
        },
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Error logging class creation activity:', logError);
    }

    return NextResponse.json(newClass);
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}
