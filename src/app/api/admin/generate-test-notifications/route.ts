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
      return NextResponse.json({ error: 'Only administrators can generate test notifications' }, { status: 403 });
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
          select: {
            user: { select: { name: true } }
          }
        },
        class: { select: { name: true } }
      }
    });
    
    // Get all pending withdrawal requests
    const withdrawalRequests = await prisma.withdrawalRequest.findMany({
      where: { status: 'pending' },
      include: {
        student: {
          select: {
            user: { select: { name: true } }
          }
        },
        class: { select: { name: true } }
      }
    });
    
    // Get all pending class creation requests with related class and teacher info
    const classCreationRequests = await prisma.classCreationRequest.findMany({
      where: { status: 'pending' },
      include: {
        teacher: {
          include: {
            user: true
          }
        },
        class: true
      }
    });
    
    // Create notifications for each admin for each pending request
    for (const admin of admins) {
      // Create notifications for enrollment requests
      for (const request of enrollmentRequests) {
        try {
          const notification = await prisma.notification.create({
            data: {
              id: uuidv4(),
              userId: admin.userId,
              title: 'enrollment_request',
              message: `New enrollment request: ${request.student.user.name} for class ${request.class.name}`,
              type: 'admin_notification',
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
          const notification = await prisma.notification.create({
            data: {
              id: uuidv4(),
              userId: admin.userId,
              title: 'withdrawal_request',
              message: `New withdrawal request: ${request.student.user.name} from class ${request.class.name}`,
              type: 'admin_notification',
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
      for (const request of classCreationRequests) {
        try {
          // Get class and teacher details safely
          const className = request.class?.name || 'Unknown class';
          const classSubject = request.class?.subject || 'Unknown subject';
          const teacherName = request.teacher?.user?.name || 'Unknown teacher';
          
          const notification = await prisma.notification.create({
            data: {
              id: uuidv4(),
              userId: admin.userId,
              title: 'class_creation_request',
              message: `New class creation request: ${className} (${classSubject}) by ${teacherName}`,
              type: 'admin_notification',
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
    }
    
    return NextResponse.json({
      success: true,
      message: `Generated ${notifications.length} notifications for ${admins.length} admins`,
      notificationsCount: notifications.length
    });
    
  } catch (error: any) {
    console.error('Error generating test notifications:', error);
    return NextResponse.json(
      { error: 'Failed to generate test notifications', message: error.message },
      { status: 500 }
    );
  }
}
