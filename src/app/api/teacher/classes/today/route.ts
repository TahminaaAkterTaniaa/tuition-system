import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { getTodaysClasses, ClassScheduleData, debugClassValidation } from '@/app/lib/calendar-utils';

// Type definitions for class data
type ClassWithEnrollments = {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  room: string;
  startTime: string | null;
  endTime: string | null;
  enrollments: {
    studentId: string;
  }[];
};

type ProcessedClass = {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  room: string;
  startTime: string | null;
  endTime: string | null;
  studentCount: number;
};

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get teacher profile
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    });
    
    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found.' },
        { status: 404 }
      );
    }
    
    // Get the target date from query parameters or default to today
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    
    let targetDate: Date;
    if (dateParam) {
      // Parse the provided date (YYYY-MM-DD format) as local date to avoid timezone issues
      const [year, month, day] = dateParam.split('-').map(Number);
      targetDate = new Date(year, month - 1, day); // month is 0-indexed
      // Ensure it's a valid date
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Please use YYYY-MM-DD.' },
          { status: 400 }
        );
      }
    } else {
      // Default to today
      targetDate = new Date();
    }
    
    // Normalize the date to start of day
    targetDate.setHours(0, 0, 0, 0);
    
    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = targetDate.getDay();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = daysOfWeek[dayOfWeek];
    
    // Get classes taught by this teacher with proper date validation
    const allClasses = await prisma.class.findMany({
      where: { 
        teacherId: teacher.id,
        status: 'active',
      },
      include: {
        enrollments: {
          where: {
            status: 'enrolled',
          },
        },
        schedules: {
          include: {
            room: true,
            timeSlot: true,
          },
        },
      },
    });
    
    // Transform to ClassScheduleData format for the utility function
    const classScheduleData: ClassScheduleData[] = allClasses.map((classItem: any) => ({
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
    
    // Use the shared utility to get classes for the target date with proper date validation
    const targetDateClasses = getTodaysClasses(classScheduleData, targetDate);
    
    // Debug logging for troubleshooting
    console.log(`API: Received dateParam: ${dateParam}`);
    console.log(`API: Parsed target date: ${targetDate.toString()} (${dayName})`);
    console.log(`API: Target date local: ${targetDate.toISOString().split('T')[0]}`);
    console.log(`Found ${allClasses.length} total classes, ${targetDateClasses.length} active on target date`);
    
    // Optional: Enable detailed debugging for each class
    if (process.env.NODE_ENV === 'development') {
      classScheduleData.forEach(classItem => {
        debugClassValidation(classItem, targetDate);
      });
    }
    
    // Convert CalendarEntry format back to the expected API response format
    const formattedClasses = targetDateClasses.map(entry => ({
      id: entry.id,
      name: entry.name,
      subject: entry.subject,
      schedule: `${dayName} at ${entry.startTime}`,
      room: entry.room,
      startTime: entry.startTime,
      endTime: entry.endTime || null,
      studentCount: entry.studentCount || 0,
    }));
    
    return NextResponse.json({ classes: formattedClasses });
  } catch (error) {
    console.error('Error fetching today\'s classes:', error);
    // Return an empty array instead of an error to prevent UI issues
    return NextResponse.json({ classes: [] }, { status: 200 });
    // Uncomment below for stricter error handling
    // return NextResponse.json(
    //   { error: 'Failed to fetch today\'s classes' },
    //   { status: 500 }
    // );
  }
}
