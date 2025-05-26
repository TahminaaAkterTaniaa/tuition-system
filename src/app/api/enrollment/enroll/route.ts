import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const { classId, userId } = await req.json();

    console.log('Enrollment request received:', { classId, userId });

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('Using user ID for enrollment:', userId);
    
    // Get the student's ID
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true }
    });
    
    console.log('Student lookup result:', student ? 'Found' : 'Not found');

    if (!student) {
      return NextResponse.json(
        { error: 'Student profile not found.' },
        { status: 404 }
      );
    }

    // Check if the student is already enrolled in this class
    console.log(`Checking if student ${student.id} is already enrolled in class ${classId}`);
  
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        classId,
        status: { in: ['enrolled', 'completed', 'pending'] }
      },
      select: {
        id: true,
        status: true,
        enrollmentDate: true
      }
    });

    // Also check if there's an existing enrollment request
    const existingEnrollmentRequest = await prisma.enrollmentRequest.findFirst({
      where: {
        studentId: student.id,
        classId,
        status: 'pending'
      },
      select: {
        id: true,
        status: true,
        requestDate: true
      }
    });

    if (existingEnrollment) {
      console.log(`Found existing enrollment with status: ${existingEnrollment.status}`);
      
      // If already enrolled or completed, return an error
      if (existingEnrollment.status === 'enrolled' || existingEnrollment.status === 'completed') {
        return NextResponse.json({
          error: `You are already ${existingEnrollment.status} in this class.`,
          enrollment: existingEnrollment
        }, { status: 400 });
      }
      
      // If pending, return the existing enrollment
      if (existingEnrollment.status === 'pending') {
        // We'll check for application submission in the client
        // by querying the student/enrollments endpoint
        return NextResponse.json({
          success: true,
          message: 'Continuing with existing enrollment process.',
          enrollment: {
            id: existingEnrollment.id,
            status: existingEnrollment.status,
            enrollmentDate: existingEnrollment.enrollmentDate
          }
        });
      }
    }
    
    // If there's an existing enrollment request, return that instead of creating a new one
    if (existingEnrollmentRequest) {
      console.log(`Found existing enrollment request with ID: ${existingEnrollmentRequest.id}`);
      return NextResponse.json({
        success: true,
        message: 'Your enrollment request is already pending approval.',
        enrollmentRequest: {
          id: existingEnrollmentRequest.id,
          status: existingEnrollmentRequest.status,
          requestDate: existingEnrollmentRequest.requestDate
        }
      });
    }

    // Check if the class exists and has available seats
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: {
          where: {
            status: { in: ['enrolled', 'completed'] }
          },
          select: { id: true }
        }
      }
    });

    if (!classInfo) {
      return NextResponse.json(
        { error: 'Class not found.' },
        { status: 404 }
      );
    }

    if (classInfo.status !== 'active') {
      return NextResponse.json(
        { error: 'This class is not currently accepting enrollments.' },
        { status: 400 }
      );
    }

    const enrolledCount = classInfo.enrollments.length;
    if (enrolledCount >= classInfo.capacity) {
      return NextResponse.json(
        { error: 'This class is full. No more seats available.' },
        { status: 400 }
      );
    }

    // Create an enrollment request that requires admin approval
    console.log('Creating enrollment request for admin approval');
    try {
      // Create an EnrollmentRequest first - this requires admin approval
      const enrollmentRequest = await prisma.enrollmentRequest.create({
        data: {
          studentId: student.id,
          classId: classId,
          status: 'pending',
          notes: 'Enrollment request initiated by student through online application',
          requestDate: new Date(),
        }
      });
      
      console.log('Enrollment request created successfully with ID:', enrollmentRequest.id);

      // Return the enrollment request details
      return NextResponse.json({
        success: true,
        message: 'Your enrollment request has been submitted and is pending admin approval.',
        enrollmentRequest: {
          id: enrollmentRequest.id,
          status: enrollmentRequest.status,
          requestDate: enrollmentRequest.requestDate
        }
      });
    } catch (error) {
      console.error('Error creating enrollment:', error);
      return NextResponse.json(
        { error: 'Failed to create enrollment. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error enrolling in class:', error);
    return NextResponse.json(
      { error: 'Failed to enroll in class' },
      { status: 500 }
    );
  }
}
