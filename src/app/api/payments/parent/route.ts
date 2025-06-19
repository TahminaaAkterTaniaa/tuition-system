import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET - Fetch payment status for a parent's children's courses
export async function GET(req: NextRequest) {
  try {
    // Step 1: Verify session and user role
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is a parent
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Only parents can access this endpoint' }, { status: 403 });
    }
    
    // Step 2: Get the parent ID with better error handling
    let parent;
    try {
      parent = await prisma.parent.findUnique({
        where: { userId: session.user.id },
      });
      
      if (!parent) {
        return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
      }
    } catch (dbError) {
      console.error('Database error fetching parent:', dbError);
      return NextResponse.json({ error: 'Error fetching parent profile' }, { status: 500 });
    }
    
    // Step 3: Get all payments for this parent with error handling
    let payments = [];
    try {
      payments = await prisma.payment.findMany({
        where: {
          parentId: parent.id,
        },
        orderBy: {
          dueDate: 'desc',
        },
      });
    } catch (dbError) {
      console.error('Database error fetching payments:', dbError);
      return NextResponse.json({ error: 'Error fetching payment information' }, { status: 500 });
    }
    
    // Step 4: Get all children linked to this parent with error handling
    let parentStudents = [];
    try {
      parentStudents = await prisma.parentStudent.findMany({
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
    } catch (dbError) {
      console.error('Database error fetching parent students:', dbError);
      return NextResponse.json({ error: 'Error fetching student information' }, { status: 500 });
    }
    
    // Step 5: Get all enrollment payment statuses in a single query for better performance
    const enrollmentIds = parentStudents.flatMap(ps => 
      ps.student.enrollments.map(enrollment => enrollment.id)
    );
    
    let enrollmentPayments = [];
    try {
      // Fix the TypeScript error by using proper Prisma schema fields
      enrollmentPayments = await prisma.enrollment.findMany({
        where: {
          id: { in: enrollmentIds }
        },
        select: {
          id: true,
          classId: true,
          status: true, // Using 'status' instead of 'paymentStatus'
          // Remove paymentId and paymentDate if they don't exist in the schema
        }
      });
    } catch (dbError) {
      console.error('Database error fetching enrollment payments:', dbError);
      return NextResponse.json({ error: 'Error fetching enrollment payment information' }, { status: 500 });
    }
    
    // Step 6: Get all classes to access their fees
    const classIds = parentStudents.flatMap(ps => 
      ps.student.enrollments.map(enrollment => enrollment.classId)
    );
    
    let classes = [];
    try {
      classes = await prisma.class.findMany({
        where: {
          id: { in: classIds }
        },
        select: {
          id: true,
          fee: true
        }
      });
    } catch (dbError) {
      console.error('Database error fetching classes:', dbError);
      return NextResponse.json({ error: 'Error fetching class information' }, { status: 500 });
    }
    
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
          // Use status field for payment status since paymentStatus doesn't exist
          enrollmentPaymentStatus: enrollmentWithPayment?.status || 'pending',
          // Remove enrollmentPaymentId and enrollmentPaymentDate or set to null if needed
          enrollmentPaymentId: null,
          enrollmentPaymentDate: null,
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
          // Use status field instead of paymentStatus and handle various payment states
          paymentStatus: enrollmentWithPayment?.status === 'Paid' 
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
      
      // Use status field instead of paymentStatus
      // Map status values to payment categories based on enrollment status
      const status = enrollment.status.toLowerCase();
      
      if (status === 'paid' || status === 'approved') {
        paidAmount += classFee;
        totalPaid++;
      } else if (status === 'pending') {
        pendingAmount += classFee;
        totalPending++;
      } else if (status === 'overdue' || status === 'rejected') {
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
