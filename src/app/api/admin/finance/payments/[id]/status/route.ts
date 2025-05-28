import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { createActivityLog } from '@/app/lib/notifications';

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
    
    const paymentId = params.id;
    const { status } = await request.json();
    
    if (!['PENDING', 'COMPLETED', 'FAILED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }
    
    // Get the payment before updating to log details
    const paymentBefore = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: true
              }
            },
            class: true
          }
        }
      }
    });
    
    if (!paymentBefore) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    
    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: true
              }
            },
            class: true
          }
        }
      }
    });
    
    // Log this activity
    await createActivityLog(
      session.user.id,
      'UPDATE',
      `Updated payment status from ${paymentBefore.status} to ${status} for ${updatedPayment.enrollment?.student?.user?.name || 'Unknown Student'} - ${updatedPayment.enrollment?.class?.name || 'Unknown Class'}`,
      'PAYMENT',
      paymentId,
    );
    
    return NextResponse.json({
      id: updatedPayment.id,
      status: updatedPayment.status,
      amount: updatedPayment.amount,
      studentName: updatedPayment.enrollment.student.user.name,
      className: updatedPayment.enrollment.class.name,
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
