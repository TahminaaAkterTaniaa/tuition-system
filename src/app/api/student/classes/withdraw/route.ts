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

    // Update the enrollment status to 'withdrawn'
    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { 
        status: 'withdrawn'
        // Note: If you want to track withdrawal date, you would need to add a withdrawnDate field to the Enrollment model in your schema
      }
    });

    // Log this activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'WITHDRAW_CLASS',
        description: `Withdrew from class: ${enrollment.class.name} (${enrollment.class.subject})`,
        entityType: 'ENROLLMENT',
        entityId: enrollmentId,
        metadata: JSON.stringify({
          className: enrollment.class.name,
          classSubject: enrollment.class.subject
        })
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully withdrawn from ${enrollment.class.name}`,
      enrollment: updatedEnrollment
    });
  } catch (error) {
    console.error('Error withdrawing from class:', error);
    return NextResponse.json(
      { error: 'Failed to withdraw from class' },
      { status: 500 }
    );
  }
}
