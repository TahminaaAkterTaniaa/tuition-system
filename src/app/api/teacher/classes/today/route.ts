import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

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
    
    // Get classes taught by this teacher
    const classes = await prisma.class.findMany({
      where: { 
        teacherId: teacher.id,
        status: 'active',
        OR: [
          {
            // Classes with schedule containing today's day name
            schedule: {
              contains: todayName,
            },
          },
          {
            // Also include classes with no specific schedule as a fallback
            schedule: null,
          },
        ],
      },
      include: {
        enrollments: {
          where: {
            status: 'enrolled',
          },
        },
        schedules: {
          where: {
            day: todayName,
          },
        },
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });
    
    // Format the class data
    const processedClasses = classes.map((classItem: any) => {
      // Get schedule information
      let schedule = classItem.schedule || 'Not scheduled';
      let startTime = null;
      let endTime = null;
      let roomName = classItem.room || 'No room assigned';
      
      // If we have schedules for today, use that information
      if (classItem.schedules && classItem.schedules.length > 0) {
        const todaySchedule = classItem.schedules[0]; // We already filtered for today's day
        startTime = todaySchedule.time;
        endTime = null; // We don't have end time in the schema
        schedule = `${todaySchedule.day} at ${todaySchedule.time}`;
        roomName = todaySchedule.roomId || classItem.room || 'No room assigned';
      }
      
      return {
        id: classItem.id,
        name: classItem.name,
        subject: classItem.subject,
        schedule: schedule,
        room: roomName,
        startTime: startTime,
        endTime: endTime,
        studentCount: classItem.enrollments.length,
      };
    });
    
    // Sort classes by start time
    processedClasses.sort((a: ProcessedClass, b: ProcessedClass) => {
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return 0;
    });
    
    // Format times for display if needed
    const formattedClasses = processedClasses.map((cls: ProcessedClass) => {
      // Format time strings if needed
      const formatTime = (time: string | null): string => {
        if (!time) return 'Time not set';
        return time; // Return as is or apply formatting as needed
      };
      
      return {
        ...cls,
        startTime: formatTime(cls.startTime),
        endTime: formatTime(cls.endTime),
      };
    });
    
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
