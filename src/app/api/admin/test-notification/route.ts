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
      return NextResponse.json({ error: 'Only administrators can create test notifications' }, { status: 403 });
    }
    
    // Create a test notification
    const now = new Date();
    const notification = await prisma.notification.create({
      data: {
        id: uuidv4(),
        userId: session.user.id,
        title: 'Test Notification',
        message: 'This is a test notification created at ' + now.toISOString(),
        type: 'test',
        read: false,
        createdAt: now,
        updatedAt: now
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Test notification created successfully',
      notification
    });
    
  } catch (error: any) {
    console.error('Error creating test notification:', error);
    return NextResponse.json(
      { error: 'Failed to create test notification', message: error.message },
      { status: 500 }
    );
  }
}
