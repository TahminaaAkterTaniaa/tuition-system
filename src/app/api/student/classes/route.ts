import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    console.log('Session data:', session ? 'Session exists' : 'No session');

    // For development purposes, if session is not available, return empty classes array
    if (!session || !session.user) {
      console.log('No authenticated session found');
      // During development, return an empty array instead of an error
      // This allows the UI to display properly even without authentication
      return NextResponse.json([]);
    }

    // Check if user is a student
    if (session.user.role !== 'STUDENT') {
      console.log('User is not a student:', session.user.role);
      return NextResponse.json(
        { error: 'Unauthorized. Only students can access this endpoint.' },
        { status: 403 }
      );
    }

    // Get the student's ID
    console.log('Looking up student with userId:', session.user.id);
    let student;
    
    try {
      student = await prisma.student.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });
    } catch (dbError) {
      console.error('Database error when finding student:', dbError);
      return NextResponse.json(
        { error: 'Database error when finding student profile.' },
        { status: 500 }
      );
    }
    
    console.log('Student lookup result:', student ? 'Found' : 'Not found');

    // If student profile doesn't exist, return empty array for development
    if (!student) {
      console.log('No student profile found for user ID:', session.user.id);
      // During development, return an empty array instead of an error
      return NextResponse.json([]);
    }

    // Get all active enrollments for the student
    console.log('Fetching enrollments for studentId:', student.id);
    try {
      // 1. Fetch regular enrollments with active classes only
      const enrollments = await prisma.enrollment.findMany({
        where: { 
          studentId: student.id,
          status: { in: ['enrolled', 'completed', 'pending'] },
          class: {
            status: 'active'  // Only include active classes
          }
        },
        include: {
          class: {
            include: {
              teacher: {
                include: {
                  user: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      console.log(`Found ${enrollments.length} regular enrollments`);

      // 2. Fetch pending enrollment requests for active classes only
      const enrollmentRequests = await prisma.enrollmentRequest.findMany({
        where: {
          studentId: student.id,
          status: 'pending',
          class: {
            status: 'active'  // Only include active classes
          }
        },
        include: {
          class: {
            include: {
              teacher: {
                include: {
                  user: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      console.log(`Found ${enrollmentRequests.length} pending enrollment requests`);

      // 3. Fetch pending withdrawal requests for active classes only
      const withdrawalRequests = await prisma.withdrawalRequest.findMany({
        where: {
          studentId: student.id,
          status: 'pending',
          class: {
            status: 'active'  // Only include active classes
          }
        },
        include: {
          class: {
            include: {
              teacher: {
                include: {
                  user: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      console.log(`Found ${withdrawalRequests.length} pending withdrawal requests`);
      
      // Define a type for our class object with enrollment status
      type ClassWithEnrollmentStatus = typeof enrollments[0]['class'] & {
        enrollmentStatus: string;
        enrollmentId?: string;
        enrollmentRequestId?: string;
        withdrawalRequestId?: string;
        requestStatus?: string | null;
      };

      // Extract the classes from enrollments and add enrollment status
      let classes: ClassWithEnrollmentStatus[] = enrollments.map(enrollment => {
        const classData = enrollment.class;
        
        // Check if there's a pending withdrawal request for this enrollment
        const pendingWithdrawal = withdrawalRequests.find(wr => 
          wr.classId === enrollment.classId && wr.status === 'pending'
        );
        
        // Add enrollment status information
        return {
          ...classData,
          enrollmentStatus: pendingWithdrawal ? 'withdrawal_pending' : enrollment.status,
          enrollmentId: enrollment.id,
          withdrawalRequestId: pendingWithdrawal?.id,
          requestStatus: pendingWithdrawal ? 'withdrawal_pending' : null
        };
      });
      
      // Process pending enrollment requests without creating duplicates
      const classIdMap = new Map<string, ClassWithEnrollmentStatus>();
      
      // First, add all classes from enrollments to the map with their IDs as keys
      classes.forEach(classItem => {
        classIdMap.set(classItem.id, classItem);
      });
      
      // Then, add classes from pending enrollment requests if they don't already exist
      enrollmentRequests.forEach(request => {
        const classData = request.class;
        
        // If class doesn't exist in map yet, add it as a pending enrollment
        if (!classIdMap.has(classData.id)) {
          classIdMap.set(classData.id, {
            ...classData,
            enrollmentStatus: 'enrollment_pending',
            enrollmentRequestId: request.id,
            requestStatus: 'enrollment_pending'
          } as ClassWithEnrollmentStatus);
        }
        // If it does exist, don't create a duplicate
      });
      
      // Convert map back to array
      classes = Array.from(classIdMap.values());
      
      console.log(`Returning ${classes.length} unique classes with enrollment status`);
      
      // Return the classes (will be an empty array if no enrollments or requests)
      return NextResponse.json(classes);
    } catch (enrollmentError) {
      console.error('Error in enrollment query:', enrollmentError);
      return NextResponse.json(
        { error: 'Database error when fetching enrollments.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching student classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}
