import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can sync notifications' }, { status: 403 });
    }
    
    // Get admin users
    const admins = await prisma.admin.findMany({
      select: {
        userId: true
      }
    });
    
    if (admins.length === 0) {
      return NextResponse.json({ error: 'No admin users found' }, { status: 404 });
    }
    
    const notifications = [];
    const now = new Date();
    
    // Get all pending enrollment requests
    const enrollmentRequests = await prisma.enrollmentRequest.findMany({
      where: { status: 'pending' },
      include: {
        student: {
          include: {
            user: true
          }
        },
        class: true
      }
    });
    
    // Get all pending withdrawal requests
    const withdrawalRequests = await prisma.withdrawalRequest.findMany({
      where: { status: 'pending' },
      include: {
        student: {
          include: {
            user: true
          }
        },
        class: true
      }
    });
    
    // Get all pending class creation requests with teacher information
    const classRequests = await prisma.classCreationRequest.findMany({
      where: { status: 'pending' },
      include: {
        teacher: {
          include: {
            user: true
          }
        }
      }
    });
    
    // Get class details separately for each request
    const classDetails = await Promise.all(
      classRequests.map(async (request: any) => {
        // Find the class based on name, subject, and teacher
        const classInfo = await prisma.class.findFirst({
          where: { 
            teacherId: request.teacherId,
            name: request.name,
            subject: request.subject,
            status: 'pending'
          }
        });
        return { requestId: request.id, classInfo };
      })
    );
    
    // Create notifications for the current admin
    const adminId = session.user.id;
    
    // First, clear existing notifications for this admin to avoid duplicates
    await prisma.notification.deleteMany({
      where: {
        userId: adminId,
        type: 'admin_notification'
      }
    });
    
    // Create notifications for enrollment requests
    for (const request of enrollmentRequests) {
      try {
        const studentName = request.student?.user?.name || 'Unknown student';
        const className = request.class?.name || 'Unknown class';
        
        const notification = await prisma.notification.create({
          data: {
            id: uuidv4(),
            userId: adminId,
            title: 'Enrollment Request',
            message: `Student ${studentName} wants to enroll in class ${className}`,
            type: 'enrollment',
            relatedId: request.id,
            read: false,
            createdAt: now,
            updatedAt: now
          }
        });
        notifications.push(notification);
      } catch (error) {
        console.error('Error creating enrollment notification:', error);
      }
    }
    
    // Create notifications for withdrawal requests
    for (const request of withdrawalRequests) {
      try {
        const studentName = request.student?.user?.name || 'Unknown student';
        const className = request.class?.name || 'Unknown class';
        
        const notification = await prisma.notification.create({
          data: {
            id: uuidv4(),
            userId: adminId,
            title: 'Withdrawal Request',
            message: `Student ${studentName} wants to withdraw from class ${className}`,
            type: 'withdrawal',
            relatedId: request.id,
            read: false,
            createdAt: now,
            updatedAt: now
          }
        });
        notifications.push(notification);
      } catch (error) {
        console.error('Error creating withdrawal notification:', error);
      }
    }
    
    // Create notifications for class creation requests
    for (const request of classRequests) {
      try {
        // Find the class details for this request
        const classDetail = classDetails.find(detail => detail.requestId === request.id);
        const className = request.name || classDetail?.classInfo?.name || 'Unknown class';
        const classSubject = request.subject || classDetail?.classInfo?.subject || 'Unknown subject';
        const teacherName = request.teacher?.user?.name || 'Unknown teacher';
        
        const notification = await prisma.notification.create({
          data: {
            id: uuidv4(),
            userId: adminId,
            title: 'Class Creation Request',
            message: `Teacher ${teacherName} wants to create a class for ${className} (${classSubject})`,
            type: 'class_creation',
            relatedId: request.id,
            read: false,
            createdAt: now,
            updatedAt: now
          }
        });
        notifications.push(notification);
      } catch (error) {
        console.error('Error creating class creation notification:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Generated ${notifications.length} notifications for admin`,
      notificationsCount: notifications.length
    });
    
  } catch (error: any) {
    console.error('Error syncing notifications:', error);
    return NextResponse.json(
      { error: 'Failed to sync notifications', message: error.message },
      { status: 500 }
    );
  }
}
