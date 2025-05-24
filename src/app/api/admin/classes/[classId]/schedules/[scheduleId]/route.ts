import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET - Fetch a specific schedule
export async function GET(
  req: NextRequest,
  { params }: { params: { classId: string; scheduleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { classId, scheduleId } = params;
    
    // Fetch the specific schedule
    const schedule = await prisma.classSchedule.findUnique({
      where: {
        id: scheduleId,
        classId: classId,
      },
      include: {
        room: true,
      },
    });
    
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    
    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// PATCH - Update a specific schedule
export async function PATCH(
  req: NextRequest,
  { params }: { params: { classId: string; scheduleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update schedules' }, { status: 403 });
    }
    
    const { classId, scheduleId } = params;
    const body = await req.json();
    
    // Verify the schedule exists
    const scheduleExists = await prisma.classSchedule.findUnique({
      where: {
        id: scheduleId,
        classId: classId,
      },
    });
    
    if (!scheduleExists) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    
    // Check for scheduling conflicts if room is provided and being changed
    if (body.roomId && body.roomId !== scheduleExists.roomId) {
      const conflictingSchedule = await prisma.classSchedule.findFirst({
        where: {
          roomId: body.roomId,
          day: body.day || scheduleExists.day,
          NOT: {
            id: scheduleId,
          },
          OR: [
            {
              // New schedule starts during an existing schedule
              AND: [
                { startTime: { lte: body.startTime || scheduleExists.startTime } },
                { endTime: { gt: body.startTime || scheduleExists.startTime } }
              ]
            },
            {
              // New schedule ends during an existing schedule
              AND: [
                { startTime: { lt: body.endTime || scheduleExists.endTime } },
                { endTime: { gte: body.endTime || scheduleExists.endTime } }
              ]
            },
            {
              // New schedule completely contains an existing schedule
              AND: [
                { startTime: { gte: body.startTime || scheduleExists.startTime } },
                { endTime: { lte: body.endTime || scheduleExists.endTime } }
              ]
            }
          ]
        }
      });
      
      if (conflictingSchedule) {
        return NextResponse.json(
          { error: 'The room is already scheduled for this time' },
          { status: 409 }
        );
      }
    }
    
    // Update the schedule
    const updatedSchedule = await prisma.classSchedule.update({
      where: {
        id: scheduleId,
      },
      data: {
        day: body.day,
        startTime: body.startTime,
        endTime: body.endTime,
        roomId: body.roomId,
      },
      include: {
        room: true,
      },
    });
    
    // Log the activity
    try {
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        select: { name: true }
      });
      
      await prisma.activityLog.create({
        data: {
          action: 'UPDATE',
          entity: 'ClassSchedule',
          entityId: scheduleId,
          description: `Schedule updated for class ${classData?.name || classId} on ${updatedSchedule.day} at ${updatedSchedule.startTime}`,
          performedById: session.user.id,
          performedByRole: session.user.role,
        },
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a specific schedule
export async function DELETE(
  req: NextRequest,
  { params }: { params: { classId: string; scheduleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete schedules' }, { status: 403 });
    }
    
    const { classId, scheduleId } = params;
    
    // Verify the schedule exists and belongs to the specified class
    const scheduleExists = await prisma.classSchedule.findUnique({
      where: {
        id: scheduleId,
        classId: classId,
      },
      include: {
        class: {
          select: {
            name: true
          }
        }
      }
    });
    
    if (!scheduleExists) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    
    // Store schedule data for logging before deletion
    const scheduleDay = scheduleExists.day;
    const scheduleTime = scheduleExists.startTime;
    const className = scheduleExists.class?.name || classId;
    
    // Delete the schedule
    await prisma.classSchedule.delete({
      where: {
        id: scheduleId,
      },
    });
    
    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          action: 'DELETE',
          entity: 'ClassSchedule',
          entityId: scheduleId,
          description: `Schedule removed for class ${className} on ${scheduleDay} at ${scheduleTime}`,
          performedById: session.user.id,
          performedByRole: session.user.role,
        },
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}
