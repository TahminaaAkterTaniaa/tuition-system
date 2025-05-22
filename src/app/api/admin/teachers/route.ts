import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET - Fetch all teachers with their classes for admin dashboard
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
    
    // Get all teachers with their classes and user information
    const teachers = await prisma.teacher.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        classes: {
          select: {
            id: true,
            name: true,
            subject: true,
            schedule: true,
            room: true,
            capacity: true,
            startDate: true,
            endDate: true,
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });
    
    // Calculate workload metrics for each teacher
    const teachersWithWorkload = teachers.map(teacher => {
      const classCount = teacher.classes.length;
      const totalStudents = teacher.classes.reduce((sum, cls) => sum + cls._count.enrollments, 0);
      const uniqueSubjects = new Set(teacher.classes.map(cls => cls.subject)).size;
      
      // Calculate weekly teaching hours based on scheduled classes
      let weeklyHours = 0;
      const scheduledClasses = teacher.classes.filter(cls => cls.schedule);
      
      // Assuming each class is 1 hour long
      weeklyHours = scheduledClasses.length;
      
      return {
        ...teacher,
        workload: {
          classCount,
          totalStudents,
          uniqueSubjects,
          weeklyHours,
          isOverloaded: weeklyHours > 20 || classCount > 5,
        },
      };
    });
    
    // Activity logging temporarily disabled due to foreign key constraint issues
    // Will be re-enabled once user data is properly seeded
    
    return NextResponse.json(teachersWithWorkload);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teachers' },
      { status: 500 }
    );
  }
}
