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
    
    // Explicitly select only the fields that exist in the database
    const enrollments = await prisma.enrollment.findMany({
      select: {
        id: true,
        enrollmentDate: true,
        status: true,
        student: {
          select: {
            user: {
              select: {
                name: true
              }
            }
          }
        },
        class: {
          select: {
            name: true,
            fee: true
          }
        }
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    });
    
    // Format the data for the frontend
    const formattedPayments = enrollments.map(enrollment => ({
      id: enrollment.id,
      amount: enrollment.class.fee || 0,
      status: enrollment.status === 'enrolled' ? 'COMPLETED' : 
              enrollment.status === 'rejected' ? 'FAILED' : 'PENDING',
      paymentDate: enrollment.enrollmentDate,
      studentName: enrollment.student.user?.name || 'Unknown Student',
      className: enrollment.class.name || 'Unknown Class',
      paymentMethod: 'Direct',
      transactionId: `TRX-${enrollment.id.substring(0, 8)}`,
    }));
    
    // Log this activity (wrapped in try/catch to prevent API failure if logging fails)
    try {
      if (session.user?.id) {
        await createActivityLog(
          session.user.id,
          'VIEW',
          'Viewed all payment records',
          'ENROLLMENT',
          'all', // Avoid empty string for entityId
        );
      }
    } catch (logError) {
      console.error('Error logging activity (non-fatal):', logError);
      // Continue processing despite logging error
    }
    
    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
