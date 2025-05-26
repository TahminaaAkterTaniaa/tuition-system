import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { createActivityLog } from '@/app/lib/notifications';

// GET: Fetch all withdrawal requests
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can access withdrawal requests' }, { status: 403 });
    }
    
    // Get URL parameters for filtering
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending'; // Default to pending requests
    
    // Fetch withdrawal requests with related information
    const withdrawalRequests = await prisma.withdrawalRequest.findMany({
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
    
    return NextResponse.json(withdrawalRequests);
    
  } catch (error: any) {
    console.error('Error fetching withdrawal requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch withdrawal requests', message: error.message },
      { status: 500 }
    );
  }
}

// POST: Process a withdrawal request (approve/reject)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can process withdrawal requests' }, { status: 403 });
    }
    
    const data = await req.json();
    const { requestId, action, notes } = data;
    
    if (!requestId || !action) {
      return NextResponse.json({ error: 'Request ID and action are required' }, { status: 400 });
    }
    
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Action must be either "approve" or "reject"' }, { status: 400 });
    }
    
    // Find the withdrawal request
    const withdrawalRequest = await prisma.withdrawalRequest.findUnique({
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
    
    if (!withdrawalRequest) {
      return NextResponse.json({ error: 'Withdrawal request not found' }, { status: 404 });
    }
    
    if (withdrawalRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: `This request has already been ${withdrawalRequest.status}` 
      }, { status: 400 });
    }
    
    // Update the withdrawal request status
    const updatedRequest = await prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: notes || ''
      }
    });
    
    // If approved, update the enrollment status
    let enrollment = null;
    if (action === 'approve') {
      // Update the enrollment status to withdrawn
      enrollment = await prisma.enrollment.update({
        where: { id: withdrawalRequest.enrollmentId },
        data: {
          status: 'withdrawn',
          notes: `Withdrawal approved by admin (${session.user.email}) on ${new Date().toLocaleString()}`
        }
      });
      
      // Create a notification for the student
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          userId: withdrawalRequest.student.userId,
          title: 'Withdrawal Approved',
          message: `Your withdrawal request from class ${withdrawalRequest.class.name} has been approved.`,
          type: 'withdrawal_approval',
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
          userId: withdrawalRequest.student.userId,
          title: 'Withdrawal Rejected',
          message: `Your withdrawal request from class ${withdrawalRequest.class.name} has been rejected.`,
          type: 'withdrawal_rejection',
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
      action === 'approve' ? 'APPROVE_WITHDRAWAL_REQUEST' : 'REJECT_WITHDRAWAL_REQUEST',
      `${action === 'approve' ? 'Approved' : 'Rejected'} withdrawal request for student ${withdrawalRequest.student.user.name} from class ${withdrawalRequest.class.name}`,
      'withdrawal_request',
      requestId,
      {
        classId: withdrawalRequest.classId,
        studentId: withdrawalRequest.studentId,
        enrollmentId: withdrawalRequest.enrollmentId,
        requestId: requestId
      }
    );
    
    return NextResponse.json({
      success: true,
      message: `Withdrawal request has been ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      withdrawalRequest: updatedRequest,
      enrollment: enrollment
    });
    
  } catch (error: any) {
    console.error('Error processing withdrawal request:', error);
    return NextResponse.json(
      { error: 'Failed to process withdrawal request', message: error.message },
      { status: 500 }
    );
  }
}
