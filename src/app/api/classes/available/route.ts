import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    
    // We'll allow all users to view available classes, even if not logged in
    // But we'll still get the session to check enrollment status for logged-in students

    // Get all classes regardless of status
    const allClasses = await prisma.class.findMany({
      where: {
        // No status filter - show all classes
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        },
        // Count current enrollments to check available seats
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

    // Transform the data to include available seats
    const classesWithAvailability = allClasses.map((classItem: any) => {
      const enrolledCount = classItem.enrollments.length;
      const availableSeats = classItem.capacity - enrolledCount;
      
      // Remove the enrollments array from the response
      const { enrollments, ...classWithoutEnrollments } = classItem;
      
      return {
        ...classWithoutEnrollments,
        enrolledCount,
        availableSeats,
        isFull: availableSeats <= 0
      };
    });

    // If the user is a student, check which classes they're already enrolled in
    if (session && session.user && session.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });

      if (student) {
        // Get the student's current enrollments
        const studentEnrollments = await prisma.enrollment.findMany({
          where: {
            studentId: student.id,
            status: { in: ['enrolled', 'completed', 'pending'] }
          },
          select: {
            classId: true,
            status: true
          }
        });

        // Create a map of class IDs to enrollment status
        const enrollmentStatusMap = studentEnrollments.reduce((map, enrollment) => {
          map[enrollment.classId] = enrollment.status;
          return map;
        }, {} as Record<string, string>);

        // Add enrollment status to each class
        return NextResponse.json(
          classesWithAvailability.map((classItem: any) => ({
            ...classItem,
            enrollmentStatus: enrollmentStatusMap[classItem.id] || null
          }))
        );
      }
    }

    // For non-student users or unauthenticated users, return classes without enrollment status
    return NextResponse.json(
      classesWithAvailability.map((classItem: any) => ({
        ...classItem,
        enrollmentStatus: null
      }))
    );
  } catch (error) {
    console.error('Error fetching available classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available classes' },
      { status: 500 }
    );
  }
}
