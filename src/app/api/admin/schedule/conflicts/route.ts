import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// POST - Check for scheduling conflicts
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can access this endpoint' }, { status: 403 });
    }
    
    const body = await req.json();
    const { schedules, classId, teacherId } = body;
    
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return NextResponse.json(
        { error: 'Valid schedules are required' },
        { status: 400 }
      );
    }
    
    const conflicts = [];
    
    // Check each schedule for conflicts
    for (const schedule of schedules) {
      const { day, time, roomId, roomName } = schedule;
      
      if (!day || !time) {
        return NextResponse.json(
          { error: 'Each schedule must have a day and time' },
          { status: 400 }
        );
      }
      
      // Check for room conflicts if roomId is provided
      if (roomId) {
        const roomConflicts = await prisma.classSchedule.findMany({
          where: {
            day,
            time, // Use the time field directly as it exists in the database
            roomId,
            classId: {
              not: classId // Exclude the current class if provided
            }
          },
          include: {
            class: {
              select: {
                name: true
              }
            }
          }
        });
        
        if (roomConflicts.length > 0) {
          const conflictingClassName = roomConflicts[0]?.class?.name || 'Unknown Class';
          conflicts.push({
            type: 'room',
            day,
            time,
            room: roomName || 'Unknown Room',
            roomId,
            conflictingClass: conflictingClassName
          });
        }
      }
      
      // Check for teacher conflicts if teacherId is provided
      if (teacherId) {
        const teacherConflicts = await prisma.classSchedule.findMany({
          where: {
            day,
            time, // Use the time field directly as it exists in the database
            class: {
              teacherId,
              id: {
                not: classId // Exclude the current class if provided
              }
            }
          },
          include: {
            class: {
              select: {
                name: true
              }
            }
          }
        });
        
        if (teacherConflicts.length > 0) {
          const conflictingClassName = teacherConflicts[0]?.class?.name || 'Unknown Class';
          conflicts.push({
            type: 'teacher',
            day,
            time,
            teacherId,
            conflictingClass: conflictingClassName
          });
        }
      }
    }
    
    return NextResponse.json({
      hasConflicts: conflicts.length > 0,
      conflicts
    });
  } catch (error) {
    console.error('Error checking for conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to check for conflicts' },
      { status: 500 }
    );
  }
}
