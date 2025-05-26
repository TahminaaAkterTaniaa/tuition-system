import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { createAdminNotification, createActivityLog } from '@/app/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can create enrollment requests' }, { status: 403 });
    }
    
    const data = await req.json();
    const { classId, notes } = data;
    
    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }
    
    // Get student ID from session
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }
    
    // Check if class exists and is active
    const classDetails = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: true
      }
    });
    
    if (!classDetails) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    if (classDetails.status !== 'active') {
      return NextResponse.json({ error: 'This class is not currently accepting enrollments' }, { status: 400 });
    }
    
    // Check if class is full
    if (classDetails.enrollments.length >= classDetails.capacity) {
      return NextResponse.json({ error: 'This class is full' }, { status: 400 });
    }
    
    // Check if student already has a pending or approved enrollment request for this class
    const existingRequest = await prisma.enrollmentRequest.findFirst({
      where: {
        studentId: student.id,
        classId: classId,
        status: { in: ['pending', 'approved'] }
      }
    });
    
    if (existingRequest) {
      return NextResponse.json({ 
        error: 'You already have a pending or approved enrollment request for this class',
        requestId: existingRequest.id,
        status: existingRequest.status
      }, { status: 400 });
    }
    
    // Check if student is already enrolled in this class
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_classId: {
          studentId: student.id,
          classId: classId
        }
      }
    });
    
    if (existingEnrollment) {
      return NextResponse.json({ 
        error: 'You are already enrolled in this class',
        enrollmentId: existingEnrollment.id,
        status: existingEnrollment.status
      }, { status: 400 });
    }
    
    // Create the enrollment request
    const enrollmentRequest = await prisma.enrollmentRequest.create({
      data: {
        studentId: student.id,
        classId: classId,
        notes: notes || 'Enrollment request',
      }
    });
    
    // Create notification for admins
    await createAdminNotification(
      'enrollment_request',
      enrollmentRequest.id,
      `New enrollment request for class: ${classDetails.name} by ${session.user.name || 'a student'}`
    );
    
    // Log the activity
    await createActivityLog(
      session.user.id,
      'CREATE_ENROLLMENT_REQUEST',
      `Requested enrollment in class: ${classDetails.name}`,
      'enrollment_request',
      enrollmentRequest.id,
      {
        classId: classId,
        requestId: enrollmentRequest.id
      }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Enrollment request submitted successfully. It will be reviewed by an administrator.',
      requestId: enrollmentRequest.id
    });
    
  } catch (error: any) {
    console.error('Error creating enrollment request:', error);
    return NextResponse.json(
      { error: 'Failed to create enrollment request', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const classId = url.searchParams.get('classId');
    const studentId = url.searchParams.get('studentId');
    const userId = url.searchParams.get('userId'); // Add support for userId parameter
    
    let whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (classId) {
      whereClause.classId = classId;
    }
    
    // Handle direct check via userId parameter (for EnrollmentButton component)
    if (userId && classId) {
      // This is a direct check for a specific user's enrollment request
      const student = await prisma.student.findUnique({
        where: { userId: userId }
      });
      
      if (!student) {
        return NextResponse.json({ 
          success: false,
          error: 'Student profile not found',
          requests: [] 
        });
      }
      
      whereClause.studentId = student.id;
      
      // For direct checks, we only care about pending or approved requests
      whereClause.status = { in: ['pending', 'approved'] };
    } else if (session.user.role === 'STUDENT') {
      // Students can only see their own requests
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!student) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
      }
      
      whereClause.studentId = student.id;
    } else if (session.user.role === 'ADMIN') {
      // Admins can filter by student
      if (studentId) {
        whereClause.studentId = studentId;
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const requests = await prisma.enrollmentRequest.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            status: true,
            capacity: true,
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
        createdAt: 'desc'
      }
    });
    // For direct checks from EnrollmentButton component, use a standardized response format
    if (userId && classId) {
      return NextResponse.json({
        success: true,
        requests: requests,
      });
    }
    
    // For other cases, just return the array
    return NextResponse.json(requests);
    
  } catch (error: any) {
    console.error('Error fetching enrollment requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollment requests', message: error.message },
      { status: 500 }
    );
  }
}
