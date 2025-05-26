import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

/**
 * GET - Fetch teacher notifications
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only teachers can access this endpoint
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can access notifications' }, { status: 403 });
    }

    // Get teacher ID
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Use a simple approach like the student notifications API
    // Get notifications for the current user without complex filtering
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });
    
    console.log('Found notifications:', notifications.length);
    
    // Count unread notifications with a simple query
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false
      }
    });
    
    console.log('Unread count:', unreadCount);

    // Return the notifications and unread count
    return NextResponse.json({
      notifications,
      unreadCount,
      total: await prisma.notification.count({ 
        where: { userId: session.user.id } 
      })
    });
  } catch (error: any) {
    console.error('Error fetching teacher notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Mark a notification as read
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only teachers can update their notifications
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can update notifications' }, { status: 403 });
    }

    const data = await req.json();
    const { notificationId } = data;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    // Find the notification to verify it belongs to this teacher
    const notification = await prisma.notification.findUnique({
      where: {
        id: notificationId
      }
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Verify the notification belongs to this user
    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: 'You can only update your own notifications' }, { status: 403 });
    }

    // Update the notification
    const updatedNotification = await prisma.notification.update({
      where: {
        id: notificationId
      },
      data: {
        read: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
      notification: updatedNotification
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to update notification', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT - Mark all notifications as read
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only teachers can update their notifications
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can update notifications' }, { status: 403 });
    }

    // Mark all notifications as read using Prisma client
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false
      },
      data: {
        read: true
      }
    });

    // Get updated notifications
    const updatedNotifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
      notifications: updatedNotifications,
      unreadCount: 0
    });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read', message: error.message },
      { status: 500 }
    );
  }
}
