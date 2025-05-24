import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET - Fetch schedules for a specific class
export async function GET(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { classId } = params;
    
    // Verify the class exists
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
    });
    
    if (!classExists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    // Fetch class schedules with room and timeSlot information
    const schedules = await prisma.classSchedule.findMany({
      where: { classId },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            capacity: true
          }
        },
        timeSlot: true
      },
      orderBy: [
        {
          day: 'asc',
        },
        {
          time: 'asc',
        },
      ],
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

// POST - Create a new schedule for a class
export async function POST(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can create class schedules' }, { status: 403 });
    }
    
    const { classId } = params;
    const body = await req.json();
    
    // Validate required fields
    if (!body.day || !body.timeSlotId) {
      return NextResponse.json(
        { error: 'Day and timeSlotId are required' },
        { status: 400 }
      );
    }
    
    // Verify the class exists
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
    });
    
    if (!classExists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    // Get the timeSlot information to get start/end times
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: body.timeSlotId }
    });
    
    if (!timeSlot) {
      return NextResponse.json(
        { error: 'Invalid time slot ID' },
        { status: 400 }
      );
    }
    
    // Generate a time string from the timeslot for the schedule
    const time = `${timeSlot.startTime}-${timeSlot.endTime}`;
    
    // Check for scheduling conflicts if room is provided
    if (body.roomId) {
      const conflictingSchedule = await prisma.classSchedule.findFirst({
        where: {
          roomId: body.roomId,
          day: body.day,
          timeSlotId: body.timeSlotId,
          NOT: {
            classId
          }
        },
        include: {
          timeSlot: true
        }
      });
      
      if (conflictingSchedule) {
        return NextResponse.json(
          { error: 'The room is already scheduled for this time' },
          { status: 409 }
        );
      }
    }
    
    // Create the new schedule
    const newSchedule = await prisma.classSchedule.create({
      data: {
        day: body.day,
        time: time, // Use the time string generated from timeSlot
        timeSlotId: body.timeSlotId,
        roomId: body.roomId,
        classId,
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            capacity: true
          }
        },
        timeSlot: true
      }
    });
    
    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          action: 'CREATE',
          entityType: 'ClassSchedule',
          entityId: newSchedule.id,
          description: `Schedule created for class ${classExists.name} on ${body.day}`,
          userId: session.user.id,
          metadata: JSON.stringify({ role: session.user.role }),
        },
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json(newSchedule, { status: 201 });
  } catch (error) {
    console.error('Error creating class schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create class schedule' },
      { status: 500 }
    );
  }
}
