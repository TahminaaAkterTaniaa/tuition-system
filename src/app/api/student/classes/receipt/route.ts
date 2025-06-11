import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has student role
    if (session?.user?.role !== Role.STUDENT) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { enrollmentId } = body;

    if (!enrollmentId) {
      return NextResponse.json({ success: false, error: 'Enrollment ID is required' }, { status: 400 });
    }

    // Get user ID from session
    const userId = session.user.id;

    // Get student record
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true, user: { select: { name: true } } }
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student record not found' }, { status: 404 });
    }

    // Fetch enrollment with payment
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        Payment: true,
        class: {
          select: {
            name: true,
            subject: true,
            fee: true
          }
        },
        student: {
          select: {
            user: {
              select: { name: true }
            }
          }
        }
      }
    });

    // Check if enrollment exists
    if (!enrollment) {
      return NextResponse.json({ success: false, error: 'Enrollment not found' }, { status: 404 });
    }

    // Check if the enrollment belongs to the student
    if (enrollment.studentId !== student.id) {
      return NextResponse.json({ success: false, error: 'Access denied to this enrollment' }, { status: 403 });
    }

    // Check if payment exists
    if (!enrollment.Payment) {
      return NextResponse.json({ success: false, error: 'No payment record found for this enrollment' }, { status: 404 });
    }

    // Format date to YYYY-MM-DD
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    // Build receipt data
    const receipt = {
      receiptNumber: `RCPT-${enrollment.Payment.id.substring(0, 8)}`,
      transactionId: enrollment.Payment.transactionId || enrollment.Payment.id,
      date: formatDate(enrollment.Payment.createdAt),
      studentName: student.user.name || 'Student',
      className: enrollment.class.name,
      amount: enrollment.class.fee || 0,
      paymentMethod: enrollment.Payment.paymentMethod || 'Online Payment',
      status: enrollment.Payment.status || 'Paid'
    };

    return NextResponse.json({ 
      success: true, 
      receipt,
      enrollmentId: enrollment.id,
      paymentId: enrollment.Payment.id
    });

  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Error fetching receipt data' }, 
      { status: 500 }
    );
  }
}
