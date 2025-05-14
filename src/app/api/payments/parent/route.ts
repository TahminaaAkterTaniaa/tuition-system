import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/prisma';

// GET - Fetch payment status for a parent's children's courses
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is a parent
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Only parents can access this endpoint' }, { status: 403 });
    }
    
    // Get the parent ID
    const parent = await prisma.parent.findUnique({
      where: { userId: session.user.id },
    });
    
    if (!parent) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
    }
    
    // Get all payments for this parent
    const payments = await prisma.payment.findMany({
      where: {
        parentId: parent.id,
      },
      orderBy: {
        dueDate: 'desc',
      },
    });
    
    // Get all children linked to this parent
    const parentStudents = await prisma.parentStudent.findMany({
      where: {
        parentId: parent.id,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
            enrollments: {
              include: {
                class: true,
              },
            },
          },
        },
      },
    });
    
    // Create a structured response with payment status for each child's courses
    const childrenPayments = parentStudents.map(ps => {
      const childEnrollments = ps.student.enrollments.map(enrollment => {
        // Find payments related to this enrollment
        const classPayments = payments.filter(payment => 
          payment.description.includes(enrollment.class.name) || 
          payment.description.includes(enrollment.class.subject)
        );
        
        return {
          classId: enrollment.classId,
          className: enrollment.class.name,
          subject: enrollment.class.subject,
          enrollmentStatus: enrollment.status,
          payments: classPayments.map(payment => ({
            id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            description: payment.description,
            invoiceNumber: payment.invoiceNumber,
            dueDate: payment.dueDate,
            paymentDate: payment.paymentDate,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
          })),
          paymentStatus: classPayments.length > 0 
            ? classPayments.every(p => p.status === 'paid') 
              ? 'Fully Paid' 
              : 'Partially Paid'
            : 'No Payments Found',
        };
      });
      
      return {
        studentId: ps.student.id,
        studentName: ps.student.user.name,
        relationship: ps.relationship,
        enrollments: childEnrollments,
      };
    });
    
    // Summary of all payments
    const paymentSummary = {
      totalPayments: payments.length,
      totalPaid: payments.filter(p => p.status === 'paid').length,
      totalPending: payments.filter(p => p.status === 'pending').length,
      totalOverdue: payments.filter(p => p.status === 'overdue').length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      paidAmount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
      overdueAmount: payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0),
    };
    
    return NextResponse.json({ 
      childrenPayments,
      paymentSummary,
      allPayments: payments 
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment status' },
      { status: 500 }
    );
  }
}
