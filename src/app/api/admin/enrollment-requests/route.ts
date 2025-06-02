import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { createActivityLog } from '@/app/lib/notifications';

// GET: Fetch all enrollment requests
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can access enrollment requests' }, { status: 403 });
    }
    
    // Get URL parameters for filtering
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending'; // Default to pending requests
    
    // Fetch enrollment requests with related information
    const enrollmentRequests = await prisma.enrollmentRequest.findMany({
      where: {
        status: status
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            teacher: {
              include: {
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        requestDate: 'desc'
      }
    });
    
    return NextResponse.json(enrollmentRequests);
    
  } catch (error: any) {
    console.error('Error fetching enrollment requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollment requests', message: error.message },
      { status: 500 }
    );
  }
}

// POST: Process an enrollment request (approve/reject)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can process enrollment requests' }, { status: 403 });
    }
    
    const data = await req.json();
    const { requestId, action, notes } = data;
    
    if (!requestId || !action) {
      return NextResponse.json({ error: 'Request ID and action are required' }, { status: 400 });
    }
    
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Action must be either "approve" or "reject"' }, { status: 400 });
    }
    
    // Find the enrollment request
    const enrollmentRequest = await prisma.enrollmentRequest.findUnique({
      where: { id: requestId },
      include: {
        student: {
          include: {
            user: true
          }
        },
        class: true
      }
    });
    
    if (!enrollmentRequest) {
      return NextResponse.json({ error: 'Enrollment request not found' }, { status: 404 });
    }
    
    if (enrollmentRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: `This request has already been ${enrollmentRequest.status}` 
      }, { status: 400 });
    }
    
    // Update the enrollment request status
    const updatedRequest = await prisma.enrollmentRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: notes || ''
      }
    });
    
    // If approved, create an actual enrollment record
    let enrollment = null;
    if (action === 'approve') {
      // Check if the class still has capacity
      const classInfo = await prisma.class.findUnique({
        where: { id: enrollmentRequest.classId },
        include: {
          enrollments: {
            where: {
              status: { in: ['enrolled', 'completed'] }
            },
            select: { id: true }
          }
        }
      });
      
      if (!classInfo) {
        return NextResponse.json({ error: 'Class no longer exists' }, { status: 404 });
      }
      
      if (classInfo.enrollments.length >= classInfo.capacity) {
        // Update the enrollment request to indicate class is full
        await prisma.enrollmentRequest.update({
          where: { id: requestId },
          data: {
            status: 'rejected',
            reviewNotes: 'Rejected automatically - class is full'
          }
        });
        
        return NextResponse.json({ 
          error: 'Class is now full. Request automatically rejected.',
          enrollmentRequest: updatedRequest 
        }, { status: 400 });
      }
      
      // Check if there's payment information in the enrollment request notes
      interface PaymentInfo {
        paymentId?: string | null;
        paymentStatus?: string | null;
        paymentDate?: Date | null;
      }
      
      let paymentInfo: PaymentInfo = {
        paymentId: null,
        paymentStatus: null,
        paymentDate: null
      };
      
      try {
        if (enrollmentRequest.notes) {
          const parsedNotes = JSON.parse(enrollmentRequest.notes);
          if (parsedNotes.paymentId && parsedNotes.paymentStatus) {
            console.log('Found payment information in enrollment request:', parsedNotes);
            paymentInfo = {
              paymentId: parsedNotes.paymentId,
              paymentStatus: 'paid', // Mark as paid since admin is approving
              paymentDate: parsedNotes.paymentDate ? new Date(parsedNotes.paymentDate) : new Date()
            };
          }
        }
      } catch (e) {
        console.error('Error parsing payment information from notes:', e);
        // Continue without payment info if there's an error
      }
      
      // Check if the student is already enrolled in this class to prevent duplicate enrollments
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_classId: {
            studentId: enrollmentRequest.studentId,
            classId: enrollmentRequest.classId
          }
        }
      });

      // If the student is already enrolled, use the existing enrollment
      if (existingEnrollment) {
        console.log('Student is already enrolled in this class, updating existing enrollment');
        enrollment = await prisma.enrollment.update({
          where: {
            id: existingEnrollment.id
          },
          data: {
            status: 'enrolled',
            notes: `Re-approved by admin (${session.user.email}) on ${new Date().toLocaleString()}`
          }
        });
      } else {
        // Create a new enrollment record if one doesn't exist
        enrollment = await prisma.enrollment.create({
          data: {
            studentId: enrollmentRequest.studentId,
            classId: enrollmentRequest.classId,
            enrollmentDate: new Date(),
            status: 'enrolled',
            notes: `Approved by admin (${session.user.email}) on ${new Date().toLocaleString()}`
          }
        });
      }
      
      // Create a notification for the student
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          userId: enrollmentRequest.student.userId,
          title: 'Enrollment Approved',
          message: `Your enrollment request for ${enrollmentRequest.class.name} has been approved.`,
          type: 'enrollment_approval',
          relatedId: enrollment.id,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } else {
      // Create a notification for the student about rejection
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          userId: enrollmentRequest.student.userId,
          title: 'Enrollment Rejected',
          message: `Your enrollment request for ${enrollmentRequest.class.name} has been rejected.`,
          type: 'enrollment_rejection',
          relatedId: requestId,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    // Log the activity
    await createActivityLog(
      session.user.id,
      action === 'approve' ? 'APPROVE_ENROLLMENT_REQUEST' : 'REJECT_ENROLLMENT_REQUEST',
      `${action === 'approve' ? 'Approved' : 'Rejected'} enrollment request for student ${enrollmentRequest.student.user.name} in class ${enrollmentRequest.class.name}`,
      'enrollment_request',
      requestId,
      {
        classId: enrollmentRequest.classId,
        studentId: enrollmentRequest.studentId,
        requestId: requestId
      }
    );
    
    return NextResponse.json({
      success: true,
      message: `Enrollment request has been ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      enrollmentRequest: updatedRequest,
      enrollment: enrollment
    });
    
  } catch (error: any) {
    console.error('Error processing enrollment request:', error);
    return NextResponse.json(
      { error: 'Failed to process enrollment request', message: error.message },
      { status: 500 }
    );
  }
}
