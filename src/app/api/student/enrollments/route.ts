import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
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
      include: {
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            schedule: true,
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
      },
      orderBy: {
        enrollmentDate: 'desc'
      }
    });
    
    console.log(`Found ${enrollments.length} enrollments for student`);
    
    // Transform the data to include class information
    const transformedEnrollments = enrollments.map(enrollment => {
      return {
        id: enrollment.id,
        classId: enrollment.classId,
        status: enrollment.status,
        enrollmentDate: enrollment.enrollmentDate,
        className: enrollment.class?.name || 'Unknown Class',
        subject: enrollment.class?.subject || 'Unknown Subject',
        schedule: enrollment.class?.schedule || 'No Schedule',
        teacherName: enrollment.class?.teacher?.user?.name || 'Not Assigned',
      };
    });
    
    return NextResponse.json(transformedEnrollments);
  } catch (error) {
    console.error('Error fetching student enrollments:', error);
    // Return empty array instead of error to avoid breaking the UI
    return NextResponse.json([]);
  }
}
