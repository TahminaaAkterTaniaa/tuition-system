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

    // Build the query based on the status filter
    const whereClause: any = {};
    if (statusFilter !== 'all') {
      if (statusFilter === 'approved') {
        whereClause.status = 'enrolled';
      } else if (statusFilter === 'pending' || statusFilter === 'rejected') {
        whereClause.status = statusFilter;
      }
    }

    // Fetch enrollments with related data
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
  } catch (error) {
    console.error('Error fetching enrollment applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollment applications' },
      { status: 500 }
    );
  }
}
