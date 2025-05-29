import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { createActivityLog, createAdminNotification } from '@/app/lib/notifications';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const enrollmentId = params.id;
    const { status } = await request.json();
    
    if (!['PENDING', 'COMPLETED', 'FAILED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }
    
    // Map payment status to enrollment status
    const enrollmentStatus = 
      status === 'COMPLETED' ? 'enrolled' : 
      status === 'FAILED' ? 'rejected' : 'pending';
    
    // Get the enrollment before updating to log details
    const enrollmentBefore = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          include: {
            user: true
          }
        },
        class: true
      }
    });
    
    if (!enrollmentBefore) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }
    
    // Update enrollment status
    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: enrollmentStatus },
      include: {
        student: {
          include: {
            user: true
          }
        },
        class: true
      }
    });
    
    // Create notification for admins about the payment status change
    // Using 'enrollment_request' type since payments are related to enrollments
    try {
      await createAdminNotification(
        'enrollment_request',
        enrollmentId,
        `Payment for ${updatedEnrollment.student?.user?.name || 'a student'} in class ${updatedEnrollment.class.name} has been marked as ${status.toLowerCase()}.`
      );
    } catch (notificationError) {
      console.error('Error creating notification (non-fatal):', notificationError);
      // Continue processing despite notification error
    }
    
    // Log this activity
    try {
      if (session.user?.id) {
        await createActivityLog(
          session.user.id,
          'UPDATE',
          `Updated payment status to ${status} (enrollment status: ${enrollmentStatus}) for ${updatedEnrollment.student?.user?.name || 'Unknown Student'} - ${updatedEnrollment.class?.name || 'Unknown Class'}`,
          'ENROLLMENT',
          enrollmentId || 'unknown',
        );
      }
    } catch (logError) {
      console.error('Error logging activity (non-fatal):', logError);
      // Continue processing despite logging error
    }
    
    return NextResponse.json({
      id: updatedEnrollment.id,
      status: status, // Return the payment status format for UI consistency
      amount: updatedEnrollment.class.fee || 0,
      studentName: updatedEnrollment.student.user?.name || 'Unknown Student',
      className: updatedEnrollment.class.name || 'Unknown Class',
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
