import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    console.log('Session in classes API:', session ? 'Session exists' : 'No session');
    
    // Get all active classes (filter out rejected ones)
    const allClasses = await prisma.class.findMany({
      where: {
        status: { not: 'rejected' } // Only show active and pending classes
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

    console.log(`Found ${allClasses.length} classes`);

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
        isFull: availableSeats <= 0,
        enrollmentStatus: null // Default to null, will be updated for students
      };
    });

    // If user is a student, check enrollment status for each class
    if (session?.user?.role === 'STUDENT') {
      console.log('Checking enrollment status for student:', session.user.id);
      
      try {
        const student = await prisma.student.findUnique({
          where: { userId: session.user.id },
          select: { id: true }
        });

        if (student) {
          console.log('Found student profile with ID:', student.id);
          
          // Get ALL enrollments for this student regardless of status
          const studentEnrollments = await prisma.enrollment.findMany({
            where: {
              studentId: student.id
            },
            select: {
              classId: true,
              status: true
            }
          });
          
          // Also check for pending enrollment requests
          const enrollmentRequests = await prisma.enrollmentRequest.findMany({
            where: {
              studentId: student.id,
              status: 'pending'
            },
            select: {
              classId: true
            }
          });

          console.log('Student enrollments found:', studentEnrollments.length);
          console.log('Student enrollment requests found:', enrollmentRequests.length);
          
          // Create a map of class IDs to enrollment status
          const enrollmentStatusMap: Record<string, string> = {};
          
          // Add regular enrollments to the map
          studentEnrollments.forEach(enrollment => {
            enrollmentStatusMap[enrollment.classId] = enrollment.status;
          });
          
          // Add enrollment requests to the map (overriding regular enrollments if they exist)
          enrollmentRequests.forEach(request => {
            enrollmentStatusMap[request.classId] = 'enrollment_pending';
          });

          console.log('Enrollment status map:', JSON.stringify(enrollmentStatusMap));

          // Update classes with enrollment status
          for (const classItem of classesWithAvailability) {
            classItem.enrollmentStatus = enrollmentStatusMap[classItem.id] || null;
            console.log(`Class ${classItem.id} enrollment status: ${classItem.enrollmentStatus}`);
          }
        } else {
          console.log('No student profile found for user');
        }
      } catch (error) {
        console.error('Error checking student enrollment status:', error);
      }
    }

    // Return classes with enrollment status
    return NextResponse.json(classesWithAvailability);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}
