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
    
    // Get all enrollment payment statuses in a single query for better performance
    const enrollmentIds = parentStudents.flatMap(ps => 
      ps.student.enrollments.map(enrollment => enrollment.id)
    );
    
    const enrollmentPayments = await prisma.enrollment.findMany({
      where: {
        id: { in: enrollmentIds }
      },
      select: {
        id: true,
        classId: true,
        paymentStatus: true,
        paymentId: true,
        paymentDate: true
      }
    });
    
    // Get all classes to access their fees
    const classIds = parentStudents.flatMap(ps => 
      ps.student.enrollments.map(enrollment => enrollment.classId)
    );
    
    const classes = await prisma.class.findMany({
      where: {
        id: { in: classIds }
      },
      select: {
        id: true,
        fee: true
      }
    });
    
    // Create maps for quick lookup
    const enrollmentPaymentMap = new Map();
    enrollmentPayments.forEach(ep => {
      enrollmentPaymentMap.set(ep.id, ep);
    });
    
    const classFeesMap = new Map();
    classes.forEach(cls => {
      classFeesMap.set(cls.id, cls.fee);
    });
    
    // Create a structured response with payment status for each child's courses
    const childrenPayments = parentStudents.map(ps => {
      const childEnrollments = ps.student.enrollments.map(enrollment => {
        // Find payments related to this enrollment
        const classPayments = payments.filter(payment => 
          payment.description.includes(enrollment.class.name) || 
          payment.description.includes(enrollment.class.subject)
        );
        
        // Get payment status from our map
        const enrollmentWithPayment = enrollmentPaymentMap.get(enrollment.id);
        
        return {
          classId: enrollment.classId,
          className: enrollment.class.name,
          subject: enrollment.class.subject,
          enrollmentStatus: enrollment.status,
          enrollmentPaymentStatus: enrollmentWithPayment?.paymentStatus || 'pending',
          enrollmentPaymentId: enrollmentWithPayment?.paymentId,
          enrollmentPaymentDate: enrollmentWithPayment?.paymentDate,
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
          paymentStatus: enrollmentWithPayment?.paymentStatus === 'paid' 
            ? 'Fully Paid'
            : classPayments.length > 0 
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
    
    // Calculate payment summary based on enrollment status and class fees
    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    
    // Count enrollments by status
    enrollmentPayments.forEach(enrollment => {
      const classFee = classFeesMap.get(enrollment.classId) || 0;
      
      totalAmount += classFee;
      
      if (enrollment.paymentStatus === 'paid') {
        paidAmount += classFee;
        totalPaid++;
      } else if (enrollment.paymentStatus === 'pending') {
        pendingAmount += classFee;
        totalPending++;
      } else if (enrollment.paymentStatus === 'overdue') {
        overdueAmount += classFee;
        totalOverdue++;
      }
    });
    
    const paymentSummary = {
      totalPayments: totalPaid + totalPending + totalOverdue,
      totalPaid,
      totalPending,
      totalOverdue,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
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
