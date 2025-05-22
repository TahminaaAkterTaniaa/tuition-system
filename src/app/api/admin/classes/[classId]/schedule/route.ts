import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// PUT - Update class schedule
export async function PUT(
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
      return NextResponse.json({ error: 'Only admins can update class schedules' }, { status: 403 });
    }
    
    const { classId } = params;
    const body = await req.json();
    const { day, time, room, schedules, action } = body;
    
    // Check if we're handling multiple schedules
    if (schedules && Array.isArray(schedules)) {
      return handleMultipleSchedules(classId, schedules, action);
    }
    
    // Valid time and day options
    const validTimes = ['8:00 AM', '9:30 AM', '11:00 AM', '12:30 PM', '2:00 PM', '3:30 PM', '5:00 PM'];
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Time format mapping for normalization
    const timeFormatMap: Record<string, string> = {
      // Handle various time formats that might be in the request
      '8:00 AM': '8:00 AM', '8:00': '8:00 AM', '08:00': '8:00 AM', '08:00 AM': '8:00 AM', '8:00AM': '8:00 AM', '08:00AM': '8:00 AM',
      '9:00 AM': '9:30 AM', '9:00': '9:30 AM', '09:00': '9:30 AM', '09:00 AM': '9:30 AM', '9:00AM': '9:30 AM', '09:00AM': '9:30 AM',
      '9:30 AM': '9:30 AM', '9:30': '9:30 AM', '09:30': '9:30 AM', '09:30 AM': '9:30 AM', '9:30AM': '9:30 AM', '09:30AM': '9:30 AM',
      '10:00 AM': '11:00 AM', '10:00': '11:00 AM', '10:00AM': '11:00 AM',
      '11:00 AM': '11:00 AM', '11:00': '11:00 AM', '11:00AM': '11:00 AM',
      '12:00 PM': '12:30 PM', '12:00': '12:30 PM', '12:00PM': '12:30 PM',
      '12:30 PM': '12:30 PM', '12:30': '12:30 PM', '12:30PM': '12:30 PM',
      '1:00 PM': '2:00 PM', '1:00': '2:00 PM', '13:00': '2:00 PM', '01:00 PM': '2:00 PM', '1:00PM': '2:00 PM', '13:00PM': '2:00 PM',
      '2:00 PM': '2:00 PM', '2:00': '2:00 PM', '14:00': '2:00 PM', '02:00 PM': '2:00 PM', '2:00PM': '2:00 PM', '14:00PM': '2:00 PM',
      '3:00 PM': '3:30 PM', '3:00': '3:30 PM', '15:00': '3:30 PM', '03:00 PM': '3:30 PM', '3:00PM': '3:30 PM', '15:00PM': '3:30 PM',
      '3:30 PM': '3:30 PM', '3:30': '3:30 PM', '15:30': '3:30 PM', '03:30 PM': '3:30 PM', '3:30PM': '3:30 PM', '15:30PM': '3:30 PM',
      '4:00 PM': '5:00 PM', '4:00': '5:00 PM', '16:00': '5:00 PM', '04:00 PM': '5:00 PM', '4:00PM': '5:00 PM', '16:00PM': '5:00 PM',
      '5:00 PM': '5:00 PM', '5:00': '5:00 PM', '17:00': '5:00 PM', '05:00 PM': '5:00 PM', '5:00PM': '5:00 PM', '17:00PM': '5:00 PM',
    };
    
    // Day format mapping for normalization
    const dayFormatMap: Record<string, string> = {
      'monday': 'Monday', 'Monday': 'Monday', 'mon': 'Monday', 'Mon': 'Monday', 'MONDAY': 'Monday',
      'tuesday': 'Tuesday', 'Tuesday': 'Tuesday', 'tue': 'Tuesday', 'Tue': 'Tuesday', 'TUESDAY': 'Tuesday',
      'wednesday': 'Wednesday', 'Wednesday': 'Wednesday', 'wed': 'Wednesday', 'Wed': 'Wednesday', 'WEDNESDAY': 'Wednesday',
      'thursday': 'Thursday', 'Thursday': 'Thursday', 'thu': 'Thursday', 'Thu': 'Thursday', 'THURSDAY': 'Thursday',
      'friday': 'Friday', 'Friday': 'Friday', 'fri': 'Friday', 'Fri': 'Friday', 'FRIDAY': 'Friday',
      'saturday': 'Saturday', 'Saturday': 'Saturday', 'sat': 'Saturday', 'Sat': 'Saturday', 'SATURDAY': 'Saturday',
    };
    
    // Normalize day and time if provided
    let normalizedDay = day;
    let normalizedTime = time;
    
    if (day && typeof day === 'string') {
      normalizedDay = dayFormatMap[day] || day;
    }
    
    if (time && typeof time === 'string') {
      normalizedTime = timeFormatMap[time] || time;
    }
    
    // Validate normalized day and time
    if (normalizedDay && !validDays.includes(normalizedDay)) {
      return NextResponse.json({ 
        error: `Invalid day: ${day}. Must be one of: ${validDays.join(', ')}` 
      }, { status: 400 });
    }
    
    if (normalizedTime && !validTimes.includes(normalizedTime)) {
      return NextResponse.json({ 
        error: `Invalid time: ${time}. Must be one of: ${validTimes.join(', ')}` 
      }, { status: 400 });
    }
    
    // Create the schedule string using normalized values
    const schedule = normalizedDay && normalizedTime ? `${normalizedDay} at ${normalizedTime}` : null;
    
    console.log(`Setting schedule for class ${classId}: ${schedule} (original: ${day} at ${time})`);

    
    // Check if class exists
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: true,
      },
    });
    
    if (!classExists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    // If schedule is provided, check for conflicts
    if (schedule) {
      // We already validated the day and time above, so we can safely split the schedule
      const [day, time] = schedule.split(' at ');
      
      if (classExists.teacherId) {
        const teacherConflicts = await prisma.class.findMany({
          where: {
            teacherId: classExists.teacherId,
            schedule,
            id: { not: classId }, // Exclude the current class
          },
        });
        
        if (teacherConflicts.length > 0) {
          return NextResponse.json(
            { 
              error: 'Teacher conflict detected',
              details: `Teacher is already scheduled for ${teacherConflicts[0]?.name || 'another class'} at this time`
            },
            { status: 409 }
          );
        }
      }
      
      // Check for room conflicts if room is provided
      if (room) {
        const roomConflicts = await prisma.class.findMany({
          where: {
            room,
            schedule,
            id: { not: classId }, // Exclude the current class
          },
        });
        
        if (roomConflicts.length > 0) {
          return NextResponse.json(
            { 
              error: 'Room conflict detected',
              details: `Room ${room} is already scheduled for ${roomConflicts[0]?.name || 'another class'} at this time`
            },
            { status: 409 }
          );
        }
      }
    }
    
    // Update the class schedule
    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: {
        schedule,
        room,
      },
    });
    
    // Activity logging temporarily disabled due to foreign key constraint issues
    // Will be re-enabled once user data is properly seeded
    
    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error('Error updating class schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update class schedule' },
      { status: 500 }
    );
  }
}

// Helper function to handle multiple schedules
async function handleMultipleSchedules(classId: string, schedules: any[], action: string = 'replace') {
  try {
    // Validate class exists
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
    });
    
    if (!classExists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    // If action is replace, delete all existing schedules for this class
    if (action === 'replace') {
      await prisma.classSchedule.deleteMany({
        where: { classId }
      });
    }
    
    // Process each schedule
    const results = [];
    
    for (const schedule of schedules) {
      const { day, time, room } = schedule;
      
      if (!day || !time) {
        continue; // Skip invalid schedules
      }
      
      try {
        // Create a new schedule entry
        const newSchedule = await prisma.classSchedule.create({
          data: {
            classId,
            day,
            time,
            roomId: room
          }
        });
        
        results.push(newSchedule);
      } catch (scheduleError) {
        console.error('Error creating individual schedule:', scheduleError);
        // Continue with other schedules even if one fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Created ${results.length} schedules for class ${classId}`,
      schedules: results
    });
  } catch (error) {
    console.error('Error handling multiple schedules:', error);
    return NextResponse.json(
      { error: 'Failed to update class schedules' },
      { status: 500 }
    );
  }
}
