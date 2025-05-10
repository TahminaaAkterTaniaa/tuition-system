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

    // Get all enrollments for the student
    console.log('Fetching enrollments for studentId:', student.id);
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { 
          studentId: student.id,
          status: { in: ['enrolled', 'completed', 'pending'] } // Include pending enrollments too
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

      console.log(`Found ${enrollments.length} enrollments`);
      
      // Extract the classes from enrollments and add enrollment status
      const classes = enrollments.map(enrollment => {
        // Make sure we're properly extracting all class data
        const classData = enrollment.class;
        
        // Add enrollment status information
        return {
          ...classData,
          enrollmentStatus: enrollment.status,
          enrollmentId: enrollment.id
        };
      });
      
      console.log(`Returning ${classes.length} classes with enrollment status`);
      console.log('Classes data:', JSON.stringify(classes, null, 2));
      
      // Return the classes (will be an empty array if no enrollments)
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
