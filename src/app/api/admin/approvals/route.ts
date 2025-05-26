import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can approve or reject requests' }, { status: 403 });
    }
    
    const data = await req.json();
    const { requestType, requestId, action, notes } = data;
    
    if (!requestType || !requestId || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields: requestType, requestId, and action are required' 
      }, { status: 400 });
    }
    
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ 
        error: 'Invalid action. Must be either "approve" or "reject"' 
      }, { status: 400 });
    }
    
    // Get admin ID
    const admin = await prisma.admin.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!admin) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }
    
    let result;
    
    switch (requestType) {
      case 'enrollment':
        result = await handleEnrollmentRequest(requestId, action, session.user.id, notes);
        break;
      case 'withdrawal':
        result = await handleWithdrawalRequest(requestId, action, session.user.id, notes);
        break;
      case 'class_creation':
        result = await handleClassCreationRequest(requestId, action, session.user.id, notes);
        break;
      default:
        return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Error processing approval request:', error);
    return NextResponse.json(
      { error: 'Failed to process approval request', message: error.message },
      { status: 500 }
    );
  }
}

async function handleEnrollmentRequest(requestId: string, action: string, adminId: string, notes?: string) {
  // Find the enrollment request
  const request = await prisma.enrollmentRequest.findUnique({
    where: { id: requestId },
    include: {
      student: {
        select: {
          id: true,
          user: {
            select: { name: true, email: true }
          }
        }
      },
      class: {
        select: {
          id: true,
          name: true,
          subject: true,
          capacity: true,
          enrollments: true
        }
      }
    }
  });
  
  if (!request) {
    throw new Error('Enrollment request not found');
  }
  
  if (request.status !== 'pending') {
    throw new Error(`This request has already been ${request.status}`);
  }
  
  // Check if class is full before approving
  if (action === 'approve' && request.class.enrollments.length >= request.class.capacity) {
    throw new Error('This class is now full. Cannot approve enrollment.');
  }
  
  // Update the request status
  const updatedRequest = await prisma.enrollmentRequest.update({
    where: { id: requestId },
    data: {
      status: action === 'approve' ? 'approved' : 'rejected',
      adminId: adminId,
      responseDate: new Date(),
      responseNotes: notes
    }
  });
  
  // If approved, create the enrollment
  if (action === 'approve') {
    // Check if enrollment already exists
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_classId: {
          studentId: request.studentId,
          classId: request.classId
        }
      }
    });
    
    if (!existingEnrollment) {
      // Create new enrollment
      await prisma.enrollment.create({
        data: {
          studentId: request.studentId,
          classId: request.classId,
          status: 'enrolled',
          notes: `Enrollment approved by admin on ${new Date().toISOString().split('T')[0]}`
        }
      });
    } else {
      // Update existing enrollment
      await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          status: 'enrolled',
          notes: `Enrollment re-approved by admin on ${new Date().toISOString().split('T')[0]}`
        }
      });
    }
  }
  
  // Create notification for the student
  await prisma.activityLog.create({
    data: {
      userId: adminId,
      action: action.toUpperCase(),
      entityType: 'ENROLLMENT_REQUEST',
      entityId: requestId,
      description: `${action === 'approve' ? 'Approved' : 'Rejected'} enrollment request for class: ${request.class.name}`,
      metadata: JSON.stringify({
        studentId: request.studentId,
        classId: request.classId,
        requestId: requestId
      })
    }
  });
  
  return {
    success: true,
    message: `Enrollment request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    requestId: requestId,
    status: updatedRequest.status
  };
}

async function handleWithdrawalRequest(requestId: string, action: string, adminId: string, notes?: string) {
  // Find the withdrawal request
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id: requestId },
    include: {
      student: {
        select: {
          id: true,
          user: {
            select: { name: true, email: true }
          }
        }
      },
      class: {
        select: {
          id: true,
          name: true,
          subject: true
        }
      }
    }
  });
  
  if (!request) {
    throw new Error('Withdrawal request not found');
  }
  
  if (request.status !== 'pending') {
    throw new Error(`This request has already been ${request.status}`);
  }
  
  // Update the request status
  const updatedRequest = await prisma.withdrawalRequest.update({
    where: { id: requestId },
    data: {
      status: action === 'approve' ? 'approved' : 'rejected',
      adminId: adminId,
      responseDate: new Date(),
      responseNotes: notes
    }
  });
  
  // If approved, update the enrollment status
  if (action === 'approve') {
    // Find the enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: request.enrollmentId }
    });
    
    if (enrollment) {
      // Update enrollment status
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'withdrawn',
          notes: `Withdrawal approved by admin on ${new Date().toISOString().split('T')[0]}`
        }
      });
    }
  }
  
  // Create activity log
  await prisma.activityLog.create({
    data: {
      userId: adminId,
      action: action.toUpperCase(),
      entityType: 'WITHDRAWAL_REQUEST',
      entityId: requestId,
      description: `${action === 'approve' ? 'Approved' : 'Rejected'} withdrawal request from class: ${request.class.name}`,
      metadata: JSON.stringify({
        studentId: request.studentId,
        classId: request.classId,
        enrollmentId: request.enrollmentId,
        requestId: requestId
      })
    }
  });
  
  return {
    success: true,
    message: `Withdrawal request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    requestId: requestId,
    status: updatedRequest.status
  };
}

async function handleClassCreationRequest(requestId: string, action: string, adminId: string, notes?: string) {
  // Find the class creation request
  const request = await prisma.classCreationRequest.findUnique({
    where: { id: requestId },
    include: {
      teacher: {
        select: {
          id: true,
          user: {
            select: { name: true, email: true }
          }
        }
      },
      class: {
        select: {
          id: true,
          name: true,
          subject: true,
          status: true
        }
      }
    }
  });
  
  if (!request) {
    throw new Error('Class creation request not found');
  }
  
  if (request.status !== 'pending') {
    throw new Error(`This request has already been ${request.status}`);
  }
  
  // Update the request status
  const updatedRequest = await prisma.classCreationRequest.update({
    where: { id: requestId },
    data: {
      status: action === 'approve' ? 'approved' : 'rejected',
      adminId: adminId,
      responseDate: new Date(),
      responseNotes: notes
    }
  });
  
  // If approved, update the class status
  if (action === 'approve') {
    await prisma.class.update({
      where: { id: request.classId },
      data: {
        status: 'active'
      }
    });
  } else {
    // If rejected, mark the class as rejected
    await prisma.class.update({
      where: { id: request.classId },
      data: {
        status: 'rejected'
      }
    });
  }
  
  // Create activity log
  await prisma.activityLog.create({
    data: {
      userId: adminId,
      action: action.toUpperCase(),
      entityType: 'CLASS_CREATION_REQUEST',
      entityId: requestId,
      description: `${action === 'approve' ? 'Approved' : 'Rejected'} class creation request: ${request.class.name}`,
      metadata: JSON.stringify({
        teacherId: request.teacherId,
        classId: request.classId,
        requestId: requestId
      })
    }
  });
  
  return {
    success: true,
    message: `Class creation request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    requestId: requestId,
    status: updatedRequest.status
  };
}
