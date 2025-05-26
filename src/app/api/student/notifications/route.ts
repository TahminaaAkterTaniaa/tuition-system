import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET: Fetch notifications for the logged-in student
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get notifications for the current user
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20, // Limit to most recent 20 notifications
    });
    
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false
      }
    });
    
    return NextResponse.json({
      notifications,
      unreadCount
    });
    
  } catch (error: any) {
    console.error('Error fetching student notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', message: error.message },
      { status: 500 }
    );
  }
}

// POST: Mark a notification as read
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await req.json();
    const { notificationId, action } = data;
    
    if (!notificationId || action !== 'markAsRead') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    // Make sure the notification belongs to this user
    const notification = await prisma.notification.findUnique({
      where: {
        id: notificationId,
      },
    });
    
    if (!notification || notification.userId !== session.user.id) {
      return NextResponse.json({ error: 'Notification not found or not authorized' }, { status: 404 });
    }
    
    // Mark as read
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
    
    return NextResponse.json(updatedNotification);
    
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification', message: error.message },
      { status: 500 }
    );
  }
}

// PUT: Mark all notifications as read
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Mark all notifications as read
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications', message: error.message },
      { status: 500 }
    );
  }
}
