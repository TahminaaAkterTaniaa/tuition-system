import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// Helper function to format room information from schedules
function formatRoomInfo(schedules: any[]) {
  if (!schedules || schedules.length === 0) {
    return 'Not assigned';
  }
  
  // Get room info from the first schedule with a room
  const scheduleWithRoom = schedules.find(s => s.room);
  if (!scheduleWithRoom?.room) {
    return 'Not assigned';
  }
  
  // Format as Room Name (Building) if building exists, otherwise just Room Name
  return scheduleWithRoom.room.building
    ? `${scheduleWithRoom.room.name} (${scheduleWithRoom.room.building})`
    : scheduleWithRoom.room.name;
}

// Helper function to format schedules in Day.TimeSlot format
function formatSchedulesDisplay(schedules: any[]) {
  if (!schedules || schedules.length === 0) {
    return 'Not scheduled';
  }
  
  // Create formatted schedules string with Day.TimeSlot format
  return schedules.map(schedule => 
    `${schedule.day}.${schedule.time}`
  ).join(', ');
}

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

    // Get all enrollments for the student
    console.log('Fetching enrollments for studentId:', student.id);
    try {
      // 1. Fetch regular enrollments (don't restrict by class status)
      const enrollments = await prisma.enrollment.findMany({
        where: { 
          studentId: student.id,
          status: { in: ['enrolled', 'completed', 'pending'] }
          // Removed class status filter to show all classes
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
      // Log additional details about the enrollments for debugging
      if (enrollments.length > 0) {
        const enrollment = enrollments[0];
        if (enrollment && enrollment.class) {
          const classData = enrollment.class;
          console.log('Sample enrollment data:', {
            id: enrollment.id,
            studentId: enrollment.studentId,
            classId: enrollment.classId,
            status: enrollment.status,
            classData: {
              id: classData.id,
              name: classData.name,
              status: classData.status
            }
          });
        }
      } else {
        console.log('No enrollments found. Check if student has any classes assigned.');
      }

      // 2. Fetch pending enrollment requests (don't restrict by class status)
      const enrollmentRequests = await prisma.enrollmentRequest.findMany({
        where: {
          studentId: student.id,
          status: 'pending'
          // Removed class status filter to show all classes
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
      // Log additional details about enrollment requests for debugging
      if (enrollmentRequests.length > 0) {
        const request = enrollmentRequests[0];
        if (request && request.class) {
          const requestClassData = request.class;
          console.log('Sample enrollment request data:', {
            id: request.id,
            studentId: request.studentId,
            classId: request.classId,
            status: request.status,
            classData: {
              id: requestClassData.id,
              name: requestClassData.name,
              status: requestClassData.status
            }
          });
        }
      }

      // 3. Fetch pending withdrawal requests (don't restrict by class status)
      const withdrawalRequests = await prisma.withdrawalRequest.findMany({
        where: {
          studentId: student.id,
          status: 'pending'
          // Removed class status filter to show all classes
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

      // Get all class schedules for relevant classes
      const classIds = [
        ...enrollments.map(e => e.classId), 
        ...enrollmentRequests.map(er => er.classId)
      ];
      const schedules = await prisma.classSchedule.findMany({
        where: {
          classId: { in: classIds }
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              building: true
            }
          }
        }
      });
      
      // Group schedules by classId
      const schedulesByClass: Record<string, any[]> = {};
      schedules.forEach(schedule => {
        if (!schedulesByClass[schedule.classId]) {
          schedulesByClass[schedule.classId] = [];
        }
        schedulesByClass[schedule.classId].push(schedule);
      });
      
      // Extract the classes from enrollments and add enrollment status
      let classes: ClassWithEnrollmentStatus[] = enrollments.map(enrollment => {
        const classData = enrollment.class;
        if (!classData) return null; // Skip if class data is missing
        
        // Check if there's a pending withdrawal request for this enrollment
        const pendingWithdrawal = withdrawalRequests.find(wr => 
          wr.classId === enrollment.classId && wr.status === 'pending'
        );
        
        // Format schedules for this class
        const classSchedules = schedulesByClass[classData.id] || [];
        const formattedRoom = formatRoomInfo(classSchedules);
        const schedulesDisplay = formatSchedulesDisplay(classSchedules);
        
        // Add enrollment status information
        return {
          ...classData,
          enrollmentStatus: pendingWithdrawal ? 'withdrawal_pending' : enrollment.status,
          enrollmentId: enrollment.id,
          withdrawalRequestId: pendingWithdrawal?.id,
          requestStatus: pendingWithdrawal ? 'withdrawal_pending' : null,
          formattedRoom,
          schedulesDisplay
        };
      }).filter(Boolean) as ClassWithEnrollmentStatus[]; // Filter out null values
      
      // Process pending enrollment requests without creating duplicates
      const classIdMap = new Map<string, ClassWithEnrollmentStatus>();
      
      // First, add all classes from enrollments to the map with their IDs as keys
      classes.forEach(classItem => {
        classIdMap.set(classItem.id, classItem);
      });
      
      // Then, add classes from pending enrollment requests if they don't already exist
      enrollmentRequests.forEach(request => {
        const classData = request.class;
        if (!classData) return; // Skip if class data is missing
        
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
      
      // Add additional debug information about the classes being returned
      if (classes.length > 0) {
        const firstClass = classes[0];
        if (firstClass && firstClass.teacher) {
          const teacher = firstClass.teacher;
          console.log('First class being returned:', {
            id: firstClass.id,
            name: firstClass.name,
            status: firstClass.status,
            enrollmentStatus: firstClass.enrollmentStatus,
            teacherName: teacher.user ? teacher.user.name : 'No teacher'
          });
        }
      } else {
        console.log('No classes found to return. This could be because:');
        console.log('1. Student has no enrollments or enrollment requests');
        console.log('2. Classes exist but have a status filter preventing them from showing');
        console.log('3. Database relations are not properly set up');
      }
      
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
