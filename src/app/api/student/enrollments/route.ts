import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    console.log('Student enrollments API called');
    
    // Get query parameters
    const url = new URL(req.url);
    const classId = url.searchParams.get('classId');
    const status = url.searchParams.get('status');
    
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    console.log('Session in student enrollments API:', session ? 'Session exists' : 'No session');
    
    // Get the userId from the query parameter as a fallback
    const userId = url.searchParams.get('userId');
    
    // Use the userId from the session if available, otherwise use the query parameter
    const effectiveUserId = session?.user?.id || userId;
    
    if (!effectiveUserId) {
      console.log('No user ID found in student enrollments API');
      // Return empty array instead of error to avoid breaking the UI
      return NextResponse.json([]);
    }
    
    console.log('Using user ID for student enrollments:', effectiveUserId);
    
    // Get the student's ID
    const student = await prisma.student.findUnique({
      where: { userId: effectiveUserId },
      select: { id: true }
    });
    
    if (!student) {
      console.log('Student not found for user ID:', effectiveUserId);
      // Return empty array instead of error to avoid breaking the UI
      return NextResponse.json([]);
    }
    
    // Build the query for enrollments
    const where: any = {
      studentId: student.id
    };
    
    // Add classId filter if provided
    if (classId) {
      where.classId = classId;
    }
    
    // Add status filter if provided
    if (status) {
      where.status = status;
    }
    
    // Get the student's enrollments with class information
    const enrollments = await prisma.enrollment.findMany({
      where,
      select: {
        id: true,
        classId: true,
        status: true,
        enrollmentDate: true,
        notes: true,
        paymentStatus: true,
        paymentDate: true,
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            schedule: true,
            teacher: {
              select: {
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        enrollmentDate: 'desc'
      }
    });
    
    console.log(`Found ${enrollments.length} regular enrollments for student`);
    
    // Also get the student's enrollment requests (for the admin approval workflow)
    let enrollmentRequestWhere: any = {
      studentId: student.id
    };
    
    // Add classId filter if provided
    if (classId) {
      enrollmentRequestWhere.classId = classId;
    }
    
    // Add status filter if provided
    if (status) {
      enrollmentRequestWhere.status = status;
    }
    
    const enrollmentRequests = await prisma.enrollmentRequest.findMany({
      where: enrollmentRequestWhere,
      select: {
        id: true,
        classId: true,
        status: true,
        requestDate: true,
        notes: true,
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            schedule: true,
            teacher: {
              select: {
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        requestDate: 'desc'
      }
    });
    
    console.log(`Found ${enrollmentRequests.length} enrollment requests for student`);
    
    // Transform the regular enrollments data to include class information
    const transformedEnrollments = enrollments.map(enrollment => {
      // Parse the notes field to check if application is submitted
      let applicationSubmitted = false;
      try {
        if (enrollment.notes) {
          const notesObj = JSON.parse(enrollment.notes);
          applicationSubmitted = notesObj.applicationSubmitted || false;
        }
      } catch (e) {
        console.error('Error parsing enrollment notes:', e);
      }
      
      return {
        id: enrollment.id,
        classId: enrollment.classId,
        status: enrollment.status,
        enrollmentDate: enrollment.enrollmentDate,
        className: enrollment.class?.name || 'Unknown Class',
        subject: enrollment.class?.subject || 'Unknown Subject',
        schedule: enrollment.class?.schedule || 'No Schedule',
        teacherName: enrollment.class?.teacher?.user?.name || 'Not Assigned',
        applicationSubmitted: applicationSubmitted,
        recordType: 'enrollment'
      };
    });
    
    // Transform the enrollment requests to the same format
    const transformedRequests = enrollmentRequests.map(request => {
      // Parse the notes field to check if application is submitted
      let applicationSubmitted = false;
      try {
        if (request.notes) {
          const notesObj = JSON.parse(request.notes);
          applicationSubmitted = notesObj.applicationSubmitted || false;
        }
      } catch (e) {
        console.error('Error parsing enrollment request notes:', e);
      }
      
      return {
        id: request.id,
        classId: request.classId,
        status: request.status,
        enrollmentDate: request.requestDate, // Use requestDate as enrollmentDate
        className: request.class?.name || 'Unknown Class',
        subject: request.class?.subject || 'Unknown Subject',
        schedule: request.class?.schedule || 'No Schedule',
        teacherName: request.class?.teacher?.user?.name || 'Not Assigned',
        applicationSubmitted: applicationSubmitted,
        recordType: 'enrollmentRequest'
      };
    });
    
    // Combine both regular enrollments and enrollment requests
    const allEnrollments = [...transformedEnrollments, ...transformedRequests];
    
    // Sort the combined list by date (most recent first)
    allEnrollments.sort((a, b) => {
      return new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime();
    });
    
    return NextResponse.json(allEnrollments);
  } catch (error) {
    console.error('Error fetching student enrollments:', error);
    // Return empty array instead of error to avoid breaking the UI
    return NextResponse.json([]);
  }
}
