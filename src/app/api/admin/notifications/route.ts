import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can access notifications' }, { status: 403 });
    }
    
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    // Get admin ID
    const admin = await prisma.admin.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!admin) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }
    
    // Build the query
    let whereClause: any = {
      userId: session.user.id // Filter by the current admin's userId
    };
    
    if (unreadOnly) {
      whereClause.read = false;
    }
    
    try {
      // Get notifications using Prisma client
      const notifications = await prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });
      
      // Get unread count
      const unreadCount = await prisma.notification.count({
        where: {
          userId: session.user.id,
          read: false
        }
      });
      
      // Return the notifications and unread count
      return NextResponse.json({
        notifications,
        unreadCount
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }
    
    // The response is now handled in the try block above
    
  } catch (error: any) {
    console.error('Error fetching admin notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can update notifications' }, { status: 403 });
    }
    
    const data = await req.json();
    const { notificationId, action } = data;
    
    if (!notificationId || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields: notificationId and action are required' 
      }, { status: 400 });
    }
    
    if (action !== 'markAsRead' && action !== 'markAsUnread' && action !== 'delete') {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "markAsRead", "markAsUnread", or "delete"' 
      }, { status: 400 });
    }
    
    // Get admin ID
    const admin = await prisma.admin.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!admin) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }
    
    try {
      // Find the notification
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
      });
      
      if (!notification) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }
      
      // Process the action
      switch (action) {
        case 'markAsRead':
          const updatedNotification = await prisma.notification.update({
            where: { id: notificationId },
            data: {
              read: true,
              readAt: new Date()
            }
          });
          return NextResponse.json({
            success: true,
            message: 'Notification marked as read',
            notification: updatedNotification
          });
        case 'markAsUnread':
          const updatedNotificationUnread = await prisma.notification.update({
            where: { id: notificationId },
            data: { read: false }
          });
          return NextResponse.json({
            success: true,
            message: 'Notification marked as unread',
            notification: updatedNotificationUnread
          });
        case 'delete':
          await prisma.notification.delete({
            where: { id: notificationId }
          });
          break;
      }
    } catch (error) {
      console.error('Error processing notification action:', error);
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Notification ${action === 'delete' ? 'deleted' : 'updated'} successfully`,
      notification: null
    });
    
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification', message: error.message },
      { status: 500 }
    );
  }
}

// Mark all notifications as read
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can update notifications' }, { status: 403 });
    }
    
    // Get admin ID
    const admin = await prisma.admin.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!admin) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }
    
    try {
      // Mark all notifications as read using Prisma client
      await prisma.notification.updateMany({
        where: { read: false },
        data: { read: true }
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }
    
    // Get updated notifications
    const updatedNotifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    // No need to map fields since they already match
    const formattedNotifications = updatedNotifications;
    
    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
      notifications: formattedNotifications,
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
