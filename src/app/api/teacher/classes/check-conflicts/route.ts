import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a teacher
    if (!session || !session.user || session.user.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Unauthorized. Only teachers can check for conflicts.' },
        { status: 403 }
      );
    }

    // Get the teacher's ID
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found.' },
        { status: 404 }
      );
    }

    // Parse the request body
    const body = await req.json();
    
    // Validate required fields
    if (!body.schedules || !Array.isArray(body.schedules) || body.schedules.length === 0) {
      return NextResponse.json(
        { error: 'Schedules array is required.' },
        { status: 400 }
      );
    }

    // Check for conflicts in each schedule
    const conflicts = [];
    
    for (const schedule of body.schedules) {
      // Validate schedule data
      if (!schedule.day || !schedule.timeSlotId || !schedule.roomId) {
        return NextResponse.json(
          { error: 'Each schedule must include day, timeSlotId, and roomId.' },
          { status: 400 }
        );
      }
      
      // Get room information for better conflict reporting
      const roomInfo = await prisma.room.findUnique({
        where: { id: schedule.roomId },
        select: { name: true, building: true }
      });

      const roomName = roomInfo ? 
        roomInfo.building ? `${roomInfo.name} (${roomInfo.building})` : roomInfo.name 
        : 'Unknown room';

      // Get time slot information
      const timeSlotInfo = await prisma.timeSlot.findUnique({
        where: { id: schedule.timeSlotId },
        select: { label: true, startTime: true, endTime: true }
      });

      const timeSlotLabel = timeSlotInfo?.label || 
        (timeSlotInfo ? `${timeSlotInfo.startTime} - ${timeSlotInfo.endTime}` : 'Unknown time');

      // Check for room conflicts (same room, same day, same time)
      const roomConflict = await prisma.classSchedule.findFirst({
        where: {
          day: schedule.day,
          timeSlotId: schedule.timeSlotId,
          roomId: schedule.roomId
        },
        include: {
          class: {
            select: {
              name: true,
              teacher: {
                select: {
                  user: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          },
          room: true,
          timeSlot: true
        }
      });
      
      if (roomConflict) {
        // Log detailed room conflict info for debugging
        console.log('Room conflict found:', {
          roomId: schedule.roomId,
          roomInfo,
          conflictRoomData: roomConflict.room,
          day: schedule.day,
          timeSlot: timeSlotLabel
        });

        conflicts.push({
          type: 'room',
          day: schedule.day,
          timeSlot: roomConflict.timeSlot?.label || timeSlotLabel,
          room: roomName,
          conflictingClass: roomConflict.class?.name || 'Unknown class',
          teacher: roomConflict.class?.teacher?.user?.name || 'Unknown teacher'
        });
      }
      
      // Check for teacher conflicts (same teacher, same day, same time)
      const teacherConflict = await prisma.classSchedule.findFirst({
        where: {
          day: schedule.day,
          timeSlotId: schedule.timeSlotId,
          class: {
            teacherId: teacher.id
          }
        },
        include: {
          class: {
            select: {
              name: true
            }
          },
          room: true,
          timeSlot: true
        }
      });
      
      if (teacherConflict) {
        // Get room name from the conflict data or use the previously fetched room info
        const conflictRoomName = teacherConflict.room ? 
          teacherConflict.room.building ? 
            `${teacherConflict.room.name} (${teacherConflict.room.building})` : 
            teacherConflict.room.name
          : roomName;

        // Log detailed teacher conflict info for debugging
        console.log('Teacher conflict found:', {
          teacherId: teacher.id,
          roomData: teacherConflict.room,
          conflictRoomName,
          day: schedule.day,
          timeSlot: timeSlotLabel
        });

        conflicts.push({
          type: 'teacher',
          day: schedule.day,
          timeSlot: teacherConflict.timeSlot?.label || timeSlotLabel,
          room: conflictRoomName,
          conflictingClass: teacherConflict.class?.name || 'Unknown class'
        });
      }
    }
    
    // Return conflict check results
    return NextResponse.json({
      hasConflicts: conflicts.length > 0,
      conflicts: conflicts
    });
    
  } catch (error) {
    console.error('Error checking for conflicts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check for conflicts' },
      { status: 500 }
    );
  }
}
