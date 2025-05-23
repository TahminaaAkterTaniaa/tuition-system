import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET - Fetch all class schedules
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin or teacher
    if (!['ADMIN', 'TEACHER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Only admins and teachers can access this endpoint' }, { status: 403 });
    }
    
    // Get all class schedules with room and timeSlot information
    const schedules = await prisma.classSchedule.findMany({
      include: {
        room: {
          select: {
            id: true,
            name: true,
          },
        },
        timeSlot: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            label: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
          },
        },
      },
      orderBy: {
        day: 'asc',
      },
    });
    
    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching class schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class schedules' },
      { status: 500 }
    );
  }
}
