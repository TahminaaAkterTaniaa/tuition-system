import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    console.log('Session data:', JSON.stringify(session, null, 2));

    // Check if user is authenticated and is a teacher
    if (!session || !session.user || session.user.role !== 'TEACHER') {
      console.log('Authentication issue:', { session: !!session, user: !!session?.user, role: session?.user?.role });
      return NextResponse.json(
        { error: 'Unauthorized. Only teachers can access this endpoint.' },
        { status: 403 }
      );
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
      
      // Return the classes (will be an empty array if no classes)
      return NextResponse.json(classesWithStudentCount);
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
