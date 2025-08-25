import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { generateClassOccurrences, ClassScheduleData, getDayOfWeekNumber } from '@/app/lib/calendar-utils';

// Helper function to get monthly calendar data using shared utilities
async function getMonthlyCalendarData(teacherId: string, year: number, month: number) {
  try {
    // Get the start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get classes with their schedules for the teacher
    const classes = await prisma.class.findMany({
      where: {
        teacherId: teacherId,
        status: { in: ['active', 'Active', 'ACTIVE', 'APPROVED', 'Approved', 'approved'] }
      },
      include: {
        schedules: {
          include: {
            room: true,
            timeSlot: true
          }
        },
        enrollments: {
          where: {
            status: 'enrolled',
          },
        }
      }
    });

    // Transform to ClassScheduleData format
    const classScheduleData: ClassScheduleData[] = classes.map((classItem: any) => ({
      id: classItem.id,
      name: classItem.name,
      subject: classItem.subject,
      startDate: new Date(classItem.startDate),
      endDate: classItem.endDate ? new Date(classItem.endDate) : null,
      schedules: classItem.schedules.map((schedule: any) => ({
        id: schedule.id,
        day: schedule.day,
        time: schedule.time || 'Time not set',
        timeSlot: schedule.timeSlot ? {
          startTime: schedule.timeSlot.startTime,
          endTime: schedule.timeSlot.endTime,
          label: schedule.timeSlot.label,
        } : null,
        room: schedule.room ? {
          name: schedule.room.name,
          building: schedule.room.building,
        } : null,
      })),
      enrollments: classItem.enrollments,
    }));

    // Use shared utility to generate calendar entries
    const calendarClasses = [];
    for (const classItem of classScheduleData) {
      const classOccurrences = generateClassOccurrences(classItem, startDate, endDate);
      calendarClasses.push(...classOccurrences);
    }

    console.log(`Calendar: Generated ${calendarClasses.length} entries for ${year}-${month}`);

    return NextResponse.json({ classes: calendarClasses });
  } catch (error) {
    console.error('Error fetching monthly calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}


// GET handler for fetching classes assigned to the logged-in teacher
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the teacher's ID
    console.log('Looking up teacher with userId:', session.user.id);
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });
    
    console.log('Teacher lookup result:', teacher);

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found.' },
        { status: 404 }
      );
    }

    // Check if this is a calendar request with year and month parameters
    const year = req.nextUrl.searchParams.get('year');
    const month = req.nextUrl.searchParams.get('month');
    
    if (year && month) {
      // Return calendar data for the specific month
      return getMonthlyCalendarData(teacher.id, parseInt(year), parseInt(month));
    }

    // Get all classes for the teacher
    console.log('Fetching classes for teacherId:', teacher.id);
    try {
      // For teachers, we want to show all their classes including rejected ones,
      // but with clear status information so they can be displayed differently in the UI
      const classes = await prisma.class.findMany({
        where: { 
          teacherId: teacher.id
        },
        include: {
          enrollments: {
            where: {
              status: { in: ['enrolled', 'completed'] }
            },
            select: {
              id: true
            }
          },
          schedules: {
            include: {
              room: true,
              timeSlot: true
            }
          }
        }
      });

      console.log(`Found ${classes.length} classes`);
      
      // Transform the data to include student count and properly formatted schedules and room info
      // Transform the data to include student count and properly formatted schedules
      const processedClasses = await Promise.all(classes.map(async (classItem) => {
        const enrolledCount = classItem.enrollments.length;

        // Helper function to process a schedule
        async function processSchedule(schedule: any) {
          let timeSlotData = schedule.timeSlot;
          if (!timeSlotData && schedule.timeSlotId) {
            timeSlotData = await prisma.timeSlot.findUnique({
              where: { id: schedule.timeSlotId }
            });
          }
          return { schedule, timeSlotData };
        }

        // Process all schedules
        const scheduleDetails = await Promise.all(
          classItem.schedules.map(async (schedule) => {
            const { timeSlotData } = await processSchedule(schedule);

            // Determine time label in order of preference
            let timeLabel = '—';
            if (timeSlotData?.label) {
              timeLabel = timeSlotData.label;
            } else if (schedule.time && !schedule.time.includes('cmb')) {
              timeLabel = schedule.time;
            } else if (timeSlotData?.startTime && timeSlotData?.endTime) {
              timeLabel = `${timeSlotData.startTime} - ${timeSlotData.endTime}`;
            }

            console.log('Processing schedule:', {
              timeSlot: timeSlotData,
              day: schedule.day,
              time: schedule.time,
              timeLabel
            });

            return {
              day: schedule.day,
              time: timeLabel,
              roomName: schedule.room?.name || 'Not assigned',
              roomBuilding: schedule.room?.building || '',
              roomId: schedule.roomId
            };
          })
        );

        // Sort schedules by day
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        scheduleDetails.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

        // Format room information (use the first schedule's room if available)
        const firstSchedule = scheduleDetails[0];
        const roomDisplay = firstSchedule && firstSchedule.roomName !== 'Not assigned'
          ? firstSchedule.roomBuilding
            ? `${firstSchedule.roomName} (${firstSchedule.roomBuilding})`
            : firstSchedule.roomName
          : 'Not assigned';

        // Create formatted schedules string with Day: Time format
        const schedulesDisplay = scheduleDetails
          .map(s => `${s.day}: ${s.time}`)
          .join('; ');

        return {
          ...classItem,
          roomDisplay,
          schedulesDisplay,
          enrolledCount,
          schedules: scheduleDetails
        };
      }));

      const searchQuery = req.nextUrl.searchParams.get('search');
      if (searchQuery) {
        const filteredClasses = processedClasses.filter(classItem =>
          classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          classItem.subject.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return NextResponse.json(filteredClasses);
      }

      return NextResponse.json(processedClasses);
    } catch (classesError) {
      console.error('Error in classes query:', classesError);
      throw classesError; // Re-throw to be caught by the outer try-catch
    }
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

// POST handler for creating a new class as a teacher
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    // Parse request body
    const body = await req.json();
    const { name, subject, description, startDate, endDate, capacity, room, fee } = body;
    
    // Validate required fields
    if (!name || !subject || !startDate || !capacity || !fee) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, startDate, capacity, and fee are required' },
        { status: 400 }
      );
    }
    
    // Validate fee is a positive number
    const parsedFee = parseFloat(fee);
    if (isNaN(parsedFee) || parsedFee < 0) {
      return NextResponse.json(
        { error: 'Fee must be a positive number' },
        { status: 400 }
      );
    }

    // Create the class
    const newClass = await prisma.class.create({
      data: {
        name,
        subject,
        description: description || '',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        capacity: parseInt(capacity),
        fee: parsedFee, // Use the validated fee from the form
        room: room || null, // Using room field from the schema
        teacherId: teacher.id, // Automatically assign the logged-in teacher
      }
    });

    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          description: `Teacher created class: ${name}`,
          entityType: 'CLASS',
          entityId: newClass.id,
        },
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Error logging class creation activity:', logError);
    }

    return NextResponse.json(newClass);
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}
