import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    console.log('Session in admin enrollments API:', session ? 'Session exists' : 'No session');

    // Check if user is authenticated
    if (!session || !session.user) {
      console.log('No authenticated session found in admin enrollments API');
      return NextResponse.json(
        { error: 'You must be logged in to access enrollment applications.' },
        { status: 401 }
      );
    }
    
    // Check if user is an admin
    if (session.user.role !== 'ADMIN') {
      console.log('User is not an admin:', session.user.role);
      return NextResponse.json(
        { error: 'Unauthorized. Only administrators can access enrollment applications.' },
        { status: 403 }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status') || 'all';
    const format = url.searchParams.get('format');

    // Build the query based on the status filter
    const whereClause: any = {};
    if (statusFilter !== 'all') {
      if (statusFilter === 'approved') {
        whereClause.status = 'enrolled';
      } else if (statusFilter === 'pending' || statusFilter === 'rejected') {
        whereClause.status = statusFilter;
      }
    }

    // When requesting for timetable filtering, we only want enrolled students
    if (format === 'byClass') {
      // For timetable filtering, we need enrollments by classId
      const enrollments = await prisma.enrollment.findMany({
        where: { status: 'enrolled' }, // Only include enrolled students
        select: {
          classId: true,
          studentId: true,
          student: {
            select: {
              id: true,
              studentId: true,
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      // Group enrollments by classId for easier filtering in the timetable
      const enrollmentsByClass: Record<string, any[]> = {};
      
      enrollments.forEach(enrollment => {
        const classId = enrollment.classId;
        if (!classId) return; // Skip if classId is undefined
        
        if (!enrollmentsByClass[classId]) {
          enrollmentsByClass[classId] = [];
        }
        
        enrollmentsByClass[classId].push({
          studentId: enrollment.studentId,
          name: enrollment.student?.user?.name || 'Unknown Student',
          id: enrollment.student?.id || enrollment.studentId
        });
      });

      return NextResponse.json(enrollmentsByClass);
    } else {
      // Original enrollment listing functionality
      const enrollments = await prisma.enrollment.findMany({
        where: whereClause,
        include: {
          student: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          class: {
            select: {
              name: true,
              subject: true,
            },
          },
        },
        orderBy: {
          enrollmentDate: 'desc',
        },
      });

      // Process the enrollments to extract application details from notes
      const processedEnrollments = enrollments.map(enrollment => {
        let applicationDetails = null;
        
        // Try to parse the notes field as JSON if it exists
        if (enrollment.notes) {
          try {
            applicationDetails = JSON.parse(enrollment.notes);
          } catch (e) {
            // If parsing fails, leave applicationDetails as null
            console.error('Failed to parse enrollment notes:', e);
          }
        }
        
        return {
          ...enrollment,
          applicationDetails,
        };
      });

      return NextResponse.json(processedEnrollments);
    }
  } catch (error) {
    console.error('Error fetching enrollment applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollment applications' },
      { status: 500 }
    );
  }
}
