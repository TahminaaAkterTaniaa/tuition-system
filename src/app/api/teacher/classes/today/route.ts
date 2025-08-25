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
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get tomorrow's date
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = today.getDay();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = daysOfWeek[dayOfWeek];
    
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
    
    // Use the shared utility to get today's classes with proper date validation
    const todaysClasses = getTodaysClasses(classScheduleData, today);
    
    // Debug logging for troubleshooting
    console.log(`Today's date: ${today.toISOString().split('T')[0]} (${todayName})`);
    console.log(`Found ${allClasses.length} total classes, ${todaysClasses.length} active today`);
    
    // Optional: Enable detailed debugging for each class
    if (process.env.NODE_ENV === 'development') {
      classScheduleData.forEach(classItem => {
        debugClassValidation(classItem, today);
      });
    }
    
    // Convert CalendarEntry format back to the expected API response format
    const formattedClasses = todaysClasses.map(entry => ({
      id: entry.id,
      name: entry.name,
      subject: entry.subject,
      schedule: `${todayName} at ${entry.startTime}`,
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
