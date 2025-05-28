import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { createActivityLog } from '@/app/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Fetch all payments with student and class information
    const payments = await prisma.payment.findMany({
      select: {
        id: true,
        amount: true,
        status: true,
        paymentDate: true,
        paymentMethod: true,
        transactionId: true,
        enrollment: {
          select: {
            student: {
              select: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            class: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });
    
    // Format the data for the frontend
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      paymentDate: payment.paymentDate,
      studentName: payment.enrollment?.student?.user?.name || 'Unknown Student',
      className: payment.enrollment?.class?.name || 'Unknown Class',
      paymentMethod: payment.paymentMethod || 'Unknown',
      transactionId: payment.transactionId || 'N/A',
    }));
    
    // Log this activity
    await createActivityLog(
      session.user.id,
      'VIEW',
      'Viewed all payment records',
      'PAYMENT',
      '',
    );
    
    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
