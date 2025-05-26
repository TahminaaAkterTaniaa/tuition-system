import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Check if user is a student
    if (session.user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Unauthorized. Only students can withdraw from classes.' },
        { status: 403 }
      );
    }

    // Get the request body
    const body = await req.json();
    const { enrollmentId } = body;

    if (!enrollmentId) {
      return NextResponse.json(
        { error: 'Enrollment ID is required' },
        { status: 400 }
      );
    }

    // Get the student's ID
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    // Find the enrollment and verify it belongs to this student
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        class: {
          select: {
            name: true,
            subject: true
          }
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    // Verify the enrollment belongs to the student
    if (enrollment.studentId !== student.id) {
      return NextResponse.json(
        { error: 'You do not have permission to withdraw from this class' },
        { status: 403 }
      );
    }

    // Create a withdrawal request that requires admin approval
    console.log('Creating withdrawal request for admin approval for enrollment ID:', enrollmentId);
    
    let withdrawalRequest;
    try {
      // Check if there's already a pending withdrawal request
      const existingRequest = await prisma.withdrawalRequest.findFirst({
        where: {
          enrollmentId: enrollmentId,
          studentId: student.id,
          status: 'pending'
        }
      });

      if (existingRequest) {
        console.log('Found existing withdrawal request:', existingRequest.id);
        withdrawalRequest = existingRequest;
      } else {
        // Create a new withdrawal request
        withdrawalRequest = await prisma.withdrawalRequest.create({
          data: {
            enrollmentId: enrollmentId,
            studentId: student.id,
            classId: enrollment.classId,
            reason: body.reason || 'Student requested withdrawal',
            status: 'pending',
            requestDate: new Date()
          }
        });
        
        console.log('Successfully created withdrawal request:', withdrawalRequest.id);
      }
    } catch (updateError) {
      console.error('Error creating withdrawal request:', updateError);
      return NextResponse.json(
        { error: 'Failed to create withdrawal request', details: updateError instanceof Error ? updateError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Log this activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'REQUEST_WITHDRAWAL',
          description: `Requested withdrawal from class: ${enrollment.class.name} (${enrollment.class.subject})`,
          entityType: 'WITHDRAWAL_REQUEST',
          entityId: withdrawalRequest.id,
          metadata: JSON.stringify({
            className: enrollment.class.name,
            classSubject: enrollment.class.subject,
            enrollmentId: enrollmentId
          })
        }
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }

    return NextResponse.json({
      success: true,
      message: `Your withdrawal request for ${enrollment.class.name} has been submitted and is pending admin approval.`,
      withdrawalRequest: {
        id: withdrawalRequest.id,
        status: 'pending',
        requestDate: withdrawalRequest.requestDate
      },
      enrollment: {
        id: enrollmentId,
        status: enrollment.status // The enrollment status doesn't change until approved
      }
    });
  } catch (error) {
    console.error('Error withdrawing from class:', error);
    return NextResponse.json(
      { error: 'Failed to withdraw from class' },
      { status: 500 }
    );
  }
}
