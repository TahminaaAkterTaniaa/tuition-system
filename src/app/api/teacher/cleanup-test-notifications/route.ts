import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

/**
 * This is a utility endpoint to remove test notifications and ensure only real data appears
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can use this cleanup endpoint
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can clean up test notifications' }, { status: 403 });
    }

    // Delete notifications with sample class patterns or teacher_notification type
    const deleteResult = await prisma.notification.deleteMany({
      where: {
        OR: [
          { type: 'teacher_notification' }, // Old test notifications with this type
          { message: { contains: 'Sample Class' } }, // Test notifications containing "Sample Class"
          { relatedId: { startsWith: 'sample-class-' } } // Test notifications with sample class IDs
        ]
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${deleteResult.count} test notifications.`,
      count: deleteResult.count
    });
  } catch (error: any) {
    console.error('Error cleaning up test notifications:', error);
    return NextResponse.json(
      { error: 'Failed to clean up test notifications', message: error.message },
      { status: 500 }
    );
  }
}
