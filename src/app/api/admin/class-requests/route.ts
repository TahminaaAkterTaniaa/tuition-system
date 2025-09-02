import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { createActivityLog, createTeacherNotification } from '@/app/lib/notifications';

export async function POST(req: NextRequest) {
  console.log('Class request API called');
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can approve or reject class requests' }, { status: 403 });
    }
    
    // Get admin ID
    const admin = await prisma.admin.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!admin) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }
    
    const data = await req.json();
    const { requestId, action, notes } = data;
    
    console.log('Request data received:', { requestId, action, notes });
    
    if (!requestId || !action) {
      console.error('Missing required fields:', { requestId, action });
      return NextResponse.json({ error: 'Request ID and action are required' }, { status: 400 });
    }
    
    if (action !== 'approve' && action !== 'reject') {
      console.error('Invalid action:', action);
      return NextResponse.json({ error: 'Action must be either "approve" or "reject"' }, { status: 400 });
    }
    
    // Check if this is a synthetic request (created on-the-fly for display)
    const isSyntheticRequest = requestId.startsWith('synthetic-');
    console.log('Is synthetic request:', isSyntheticRequest);
    
    let request;
    let classToUpdate;
    let teacherName = 'Unknown Teacher';
    
    // Step 1: Find the request and class to update
    if (isSyntheticRequest) {
      // For synthetic requests, we only need to update the class
      // Extract the class ID from the synthetic request ID
      const classId = requestId.replace('synthetic-', '');
      console.log('Extracted class ID:', classId);
      
      // Find the class and include the teacher with user information
      classToUpdate = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          teacher: {
            include: {
              user: true
            }
          }
        }
      });
      
      console.log('Found class to update:', classToUpdate ? 'Yes' : 'No');
      
      if (!classToUpdate) {
        console.error('Class not found for ID:', classId);
        return NextResponse.json({ error: 'Class not found', classId }, { status: 404 });
      }
      
      console.log('Class status:', classToUpdate.status);
      if (classToUpdate.status !== 'pending') {
        return NextResponse.json({ 
          error: `This class has already been ${classToUpdate.status}` 
        }, { status: 400 });
      }
      
      // Create a request object for consistency in the response
      request = {
        id: requestId,
        teacherId: classToUpdate.teacherId || '',
        name: classToUpdate.name,
        subject: classToUpdate.subject,
        status: 'pending',
        createdAt: classToUpdate.createdAt,
        updatedAt: classToUpdate.updatedAt,
        isSynthetic: true
      };
      
      // Get teacher name for activity log
      if (classToUpdate.teacher && classToUpdate.teacher.user) {
        teacherName = classToUpdate.teacher.user.name || 'Unknown Teacher';
      }
      
      console.log('Created synthetic request object:', request);
    } else {
      console.log('Processing real request with ID:', requestId);
      // This is a real request, find it in the database
      request = await prisma.classCreationRequest.findUnique({
        where: { id: requestId },
        include: {
          teacher: {
            select: {
              id: true,
              teacherId: true,
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });
      
      console.log('Found request:', request ? 'Yes' : 'No');
      
      if (!request) {
        console.error('Request not found for ID:', requestId);
        return NextResponse.json({ error: 'Class creation request not found' }, { status: 404 });
      }
      
      console.log('Request status:', request.status);
      if (request.status !== 'pending') {
        return NextResponse.json({ 
          error: `This request has already been ${request.status}` 
        }, { status: 400 });
      }
      
      // Find the corresponding class
      classToUpdate = await prisma.class.findFirst({
        where: {
          teacherId: request.teacherId,
          name: request.name,
          subject: request.subject,
          status: 'pending'
        }
      });
      
      console.log('Found corresponding class:', classToUpdate ? 'Yes' : 'No');
      
      if (!classToUpdate) {
        console.error('No corresponding class found for request:', requestId);
        return NextResponse.json({ error: 'No corresponding class found for this request' }, { status: 404 });
      }
      
      // Get teacher name for activity log
      if (request.teacher && request.teacher.user) {
        teacherName = request.teacher.user.name || 'Unknown Teacher';
      }
    }
    
    // Step 2: Update the request and class
    let updatedRequest;
    let updatedClass;
    
    // Update the request status if it's a real request
    if (!isSyntheticRequest) {
      updatedRequest = await prisma.classCreationRequest.update({
        where: { id: requestId },
        data: {
          status: action === 'approve' ? 'approved' : 'rejected',
          updatedAt: new Date()
        }
      });
      console.log('Request updated successfully:', updatedRequest.id);
    } else {
      // For synthetic requests, just use the request object we created
      updatedRequest = {
        ...request,
        status: action === 'approve' ? 'approved' : 'rejected',
        updatedAt: new Date()
      };
      console.log('Synthetic request "updated":', updatedRequest.id);
    }
    
    // Update the class status
    updatedClass = await prisma.class.update({
      where: { id: classToUpdate.id },
      data: {
        status: action === 'approve' ? 'active' : 'rejected'
      }
    });
    console.log('Class updated successfully:', updatedClass.id);
    
    // Step 3: Create activity log
    if (session && session.user) {
      await createActivityLog(
        session.user.id,
        action === 'approve' ? 'APPROVE_CLASS_REQUEST' : 'REJECT_CLASS_REQUEST',
        `${action === 'approve' ? 'Approved' : 'Rejected'} class creation request for ${request.name} (${request.subject})`,
        'class_creation_request',
        requestId,
        {
          classId: classToUpdate.id,
          requestId: requestId,
          teacherId: request.teacherId,
          teacherName: teacherName
        }
      );
      console.log('Activity log created successfully');
      
      // Step 3.5: Create notification for the teacher
      try {
        const notificationType = action === 'approve' ? 'class_approval' : 'class_rejection';
        const notificationMessage = action === 'approve' 
          ? `Your class "${request.name}" (${request.subject}) has been approved and is now active.` 
          : `Your class "${request.name}" (${request.subject}) has been rejected.\n\nReason: ${notes || 'No specific reason provided.'}\n\nPlease contact administration if you need further clarification.`;
        
        await createTeacherNotification(
          request.teacherId,
          notificationType,
          classToUpdate.id,
          notificationMessage
        );
        
        console.log('Teacher notification created successfully');
      } catch (notificationError) {
        console.error('Error creating teacher notification:', notificationError);
        // Continue execution even if notification fails
      }
    }
    
    // Step 4: Return success response
    return NextResponse.json({
      success: true,
      message: `Class creation request has been ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      request: updatedRequest,
      class: updatedClass
    });
    
  } catch (error: any) {
    console.error('Error processing class request:', error);
    return NextResponse.json(
      { error: 'Failed to process class request', message: error.message },
      { status: 500 }
    );
  }
}
