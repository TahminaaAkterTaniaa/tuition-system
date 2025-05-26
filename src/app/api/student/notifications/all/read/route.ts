import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function PUT() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Mark all unread notifications as read
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read', message: error.message },
      { status: 500 }
    );
  }
}
