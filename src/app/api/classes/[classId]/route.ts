import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    // Extract classId from the URL path directly
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    // Use the last part of the path as the classId
    const classId = pathParts[pathParts.length - 1];
    
    console.log('Class details API called for classId:', classId);
    
    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      );
    }

    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    
    // Fetch the class details
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
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

    if (!classInfo) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Transform the data to include available seats
    const enrolledCount = classInfo.enrollments.length;
    const availableSeats = classInfo.capacity - enrolledCount;
    
    // Remove the enrollments array from the response
    const { enrollments, ...classWithoutEnrollments } = classInfo;
    
    let classWithAvailability: any = {
      ...classWithoutEnrollments,
      enrolledCount,
      availableSeats,
      isFull: availableSeats <= 0,
      enrollmentStatus: null
    };

    // If the user is a student, check if they're already enrolled
    if (session && session.user && session.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });

      if (student) {
        // Check if the student is enrolled in this class
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            studentId: student.id,
            classId,
            status: { in: ['enrolled', 'completed', 'pending'] }
          },
          select: {
            status: true
          }
        });

        if (enrollment) {
          classWithAvailability.enrollmentStatus = enrollment.status;
        }
      }
    }

    return NextResponse.json(classWithAvailability);
  } catch (error) {
    console.error('Error fetching class details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class details' },
      { status: 500 }
    );
  }
}
