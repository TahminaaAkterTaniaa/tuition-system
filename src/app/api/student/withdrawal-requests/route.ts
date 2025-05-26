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
      return NextResponse.json({ error: 'Only students can create withdrawal requests' }, { status: 403 });
    }
    
    const data = await req.json();
    const { enrollmentId, reason } = data;
    
    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID is required' }, { status: 400 });
    }
    
    // Get student ID from session
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }
    
    // Check if enrollment exists and belongs to the student
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        class: true
      }
    });
    
    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }
    
    if (enrollment.studentId !== student.id) {
      return NextResponse.json({ error: 'This enrollment does not belong to you' }, { status: 403 });
    }
    
    // Check if student already has a pending withdrawal request for this enrollment
    const existingRequest = await prisma.withdrawalRequest.findFirst({
      where: {
        enrollmentId: enrollmentId,
        status: 'pending'
      }
    });
    
    if (existingRequest) {
      return NextResponse.json({ 
        error: 'You already have a pending withdrawal request for this class',
        requestId: existingRequest.id
      }, { status: 400 });
    }
    
    // Create the withdrawal request
    const withdrawalRequest = await prisma.withdrawalRequest.create({
      data: {
        enrollmentId: enrollmentId,
        studentId: student.id,
        classId: enrollment.classId,
        reason: reason || 'Withdrawal request',
      }
    });
    
    // Create notification for admins
    await createAdminNotification(
      'withdrawal_request',
      withdrawalRequest.id,
      `New withdrawal request from class: ${enrollment.class.name} by ${session.user.name || 'a student'}`
    );
    
    // Log the activity
    await createActivityLog(
      session.user.id,
      'CREATE_WITHDRAWAL_REQUEST',
      `Requested withdrawal from class: ${enrollment.class.name}`,
      'withdrawal_request',
      withdrawalRequest.id,
      {
        classId: enrollment.classId,
        enrollmentId: enrollmentId,
        requestId: withdrawalRequest.id
      }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted successfully. It will be reviewed by an administrator.',
      requestId: withdrawalRequest.id
    });
    
  } catch (error: any) {
    console.error('Error creating withdrawal request:', error);
    return NextResponse.json(
      { error: 'Failed to create withdrawal request', message: error.message },
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
    
    let whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (classId) {
      whereClause.classId = classId;
    }
    
    if (session.user.role === 'STUDENT') {
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
    
    const requests = await prisma.withdrawalRequest.findMany({
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
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(requests);
    
  } catch (error: any) {
    console.error('Error fetching withdrawal requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch withdrawal requests', message: error.message },
      { status: 500 }
    );
  }
}
