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
            timeSlot: true, // Include timeSlot relation for each schedule
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
      let roomName = 'No room assigned';
      
      // If we have schedules, use that information
      if (classItem.schedules && classItem.schedules.length > 0) {
        // Find a schedule for today if possible
        const todaySchedule = classItem.schedules.find((s: any) => s.day === todayName);
        
        if (todaySchedule) {
          // Extract time from timeSlot relation
          if (todaySchedule.timeSlot) {
            startTime = todaySchedule.timeSlot.startTime || null;
            endTime = todaySchedule.timeSlot.endTime || null;
          }
          
          schedule = `${todayName} at ${startTime || 'Time not set'}`;
          
          // Get room information
          if (todaySchedule.room && todaySchedule.room.name) {
            roomName = todaySchedule.room.name;
          }
        } else {
          // Use any schedule if no specific one for today
          const anySchedule = classItem.schedules[0];
          
          // Extract time from timeSlot relation
          if (anySchedule.timeSlot) {
            startTime = anySchedule.timeSlot.startTime || null;
            endTime = anySchedule.timeSlot.endTime || null;
          }
          
          schedule = `${anySchedule.day || 'Day not set'} at ${startTime || 'Time not set'}`;
          
          // Get room information
          if (anySchedule.room && anySchedule.room.name) {
            roomName = anySchedule.room.name;
          }
        }
      }
      
      // Count enrolled students properly from enrollments with status = 'enrolled'
      const studentCount = classItem.enrollments?.length || 0;
      
      // Format times from schedules for display
      let formattedStartTime = 'Time not set';
      let formattedEndTime = null;
      
      if (startTime && typeof startTime === 'string' && startTime.includes(':')) {
        try {
          // Format time to be more readable
          const startDate = new Date(`1970-01-01T${startTime}Z`);
          formattedStartTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
          console.error('Error formatting start time:', e);
        }
      }
      
      if (endTime && typeof endTime === 'string' && endTime.includes(':')) {
        try {
          // Format end time if available
          const endDate = new Date(`1970-01-01T${endTime}Z`);
          formattedEndTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
          console.error('Error formatting end time:', e);
        }
      }
      
      // Add console log to debug
      console.log(`Class: ${classItem.name}, Students: ${studentCount}, Time: ${formattedStartTime}`);
      
      return {
        id: classItem.id,
        name: classItem.name,
        subject: classItem.subject,
        schedule: schedule,
        room: roomName,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        studentCount: studentCount,
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
