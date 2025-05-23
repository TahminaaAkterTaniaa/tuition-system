import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/prisma';

// PUT /api/admin/schedules/[id] - Update a schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the schedule ID from the URL params
    const scheduleId = params.id;

    // Get the updated schedule data from the request body
    const data = await request.json();
    const { day, timeSlotId, roomId } = data;

    // Validate required fields
    if (!day || !timeSlotId) {
      return NextResponse.json(
        { error: 'Day and timeSlotId are required' },
        { status: 400 }
      );
    }

    // Check if the schedule exists
    const scheduleExists = await prisma.classSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!scheduleExists) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Check if the time slot exists
    const timeSlotExists = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
    });

    if (!timeSlotExists) {
      return NextResponse.json(
        { error: 'Time slot not found' },
        { status: 404 }
      );
    }

    // Get the time slot to extract the time string
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId }
    });

    // Update the schedule with both time and timeSlotId
    try {
      const updatedSchedule = await prisma.classSchedule.update({
        where: { id: scheduleId },
        data: {
          day,
          time: timeSlot?.startTime || '08:00', // Use startTime in HH:MM format to match the database
          timeSlotId,
          roomId,
        },
        include: {
          timeSlot: true,
          room: true,
        },
      });

      return NextResponse.json(updatedSchedule);
    } catch (error) {
      console.error('Error updating schedule:', error);
      return NextResponse.json(
        { error: 'Failed to update schedule', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/schedules/[id] - Delete a schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the schedule ID from the URL params
    const scheduleId = params.id;

    // Check if the schedule exists
    const scheduleExists = await prisma.classSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!scheduleExists) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Delete the schedule
    await prisma.classSchedule.delete({
      where: { id: scheduleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}
