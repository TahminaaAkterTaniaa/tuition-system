import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is a teacher or admin
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const body = await req.json();
    const { schedules, teacherId } = body;
    
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return NextResponse.json({ error: 'Invalid schedules provided' }, { status: 400 });
    }
    
    let conflicts = [];
    
    // Check for room conflicts
    for (const schedule of schedules) {
      const { day, time, roomId } = schedule;
      
      if (!day || !time || !roomId) {
        continue;
      }
      
      // Check for room conflicts
      const roomConflicts = await prisma.classSchedule.findMany({
        where: {
          day,
          time,
          roomId,
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
            }
          },
          room: {
            select: {
              name: true,
            }
          }
        }
      });
      
      if (roomConflicts.length > 0) {
        conflicts.push(
          ...roomConflicts.map(conflict => ({
            type: 'room',
            day,
            time,
            roomId,
            roomName: conflict.room?.name || 'Unknown Room',
            classId: conflict.class?.id,
            className: conflict.class?.name,
          }))
        );
      }
      
      // Check for teacher conflicts if teacherId is provided
      if (teacherId) {
        const teacherConflicts = await prisma.classSchedule.findMany({
          where: {
            day,
            time,
            class: {
              teacherId,
            }
          },
          include: {
            class: {
              select: {
                id: true,
                name: true,
              }
            },
            room: {
              select: {
                name: true,
              }
            }
          }
        });
        
        if (teacherConflicts.length > 0) {
          conflicts.push(
            ...teacherConflicts.map(conflict => ({
              type: 'teacher',
              day,
              time,
              roomId: conflict.roomId,
              roomName: conflict.room?.name || 'Unknown Room',
              classId: conflict.class?.id,
              className: conflict.class?.name,
            }))
          );
        }
      }
    }
    
    return NextResponse.json({
      hasConflicts: conflicts.length > 0,
      conflicts,
    });
  } catch (error) {
    console.error('Error checking for conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to check for conflicts' },
      { status: 500 }
    );
  }
}
