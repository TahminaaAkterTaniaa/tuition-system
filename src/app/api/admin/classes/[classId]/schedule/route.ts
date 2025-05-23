import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/prisma';

// POST /api/admin/classes/[classId]/schedule - Create a new schedule for a class
export async function POST(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the class ID from the URL params
    const classId = params.classId;

    // Get the schedule data from the request body
    const data = await request.json();
    const { day, timeSlotId, roomId } = data;

    // Validate required fields
    if (!day || !timeSlotId) {
      return NextResponse.json(
        { error: 'Day and timeSlotId are required' },
        { status: 400 }
      );
    }

    // Check if the class exists
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classExists) {
      return NextResponse.json(
        { error: 'Class not found' },
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

    // Create the schedule with both time and timeSlotId
    try {
      const schedule = await prisma.classSchedule.create({
        data: {
          classId,
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

      return NextResponse.json(schedule, { status: 201 });
    } catch (error) {
      console.error('Error creating schedule:', error);
      return NextResponse.json(
        { error: 'Failed to create schedule', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}

// GET /api/admin/classes/[classId]/schedule - Get all schedules for a class
export async function GET(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the class ID from the URL params
    const classId = params.classId;

    // Get all schedules for the class
    const schedules = await prisma.classSchedule.findMany({
      where: { classId },
      include: {
        timeSlot: true,
        room: true,
      },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}
