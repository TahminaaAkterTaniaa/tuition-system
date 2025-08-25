import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { getTodaysClasses, ClassScheduleData, debugClassValidation } from '@/app/lib/calendar-utils';

// Type definitions for class data
type StudentClassWithEnrollments = {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  room: string;
  startTime: string | null;
  endTime: string | null;
  teacher: string;
};

type StudentProcessedClass = {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  room: string;
  startTime: string | null;
  endTime: string | null;
  teacher: string;
};

export async function GET(request: Request) {
  try {
    console.log('=== Student Today Classes API Called ===');
    const session = await getServerSession(authOptions);
    console.log('Session exists:', !!session, 'User role:', session?.user?.role);
    
    if (!session) {
      console.log('No session found, returning Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'STUDENT') {
      console.log('User is not a student, role:', session.user.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get student profile
    console.log('Looking up student with userId:', session.user.id);
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    });
    console.log('Student found:', !!student, student?.id);
    
    if (!student) {
      console.log('Student profile not found for userId:', session.user.id);
      return NextResponse.json(
        { error: 'Student profile not found.' },
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
    
    // Get student's enrolled classes with proper date validation
    const enrollments = await prisma.enrollment.findMany({
      where: { 
        studentId: student.id,
        status: { in: ['enrolled', 'completed'] }
      },
      include: {
        class: {
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Filter out enrollments with inactive classes
    const activeEnrollments = enrollments.filter(enrollment => enrollment.class !== null);
    
    // Get class IDs to fetch schedules separately  
    const classIds = activeEnrollments.map(enrollment => enrollment.class.id);
    
    // Fetch schedules for all classes
    const classSchedules = await prisma.classSchedule.findMany({
      where: {
        classId: { in: classIds }
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            building: true
          }
        },
        timeSlot: {
          select: {
            startTime: true,
            endTime: true,
            label: true
          }
        }
      }
    });
    
    // Group schedules by classId
    const schedulesByClass: Record<string, any[]> = {};
    classSchedules.forEach(schedule => {
      if (!schedulesByClass[schedule.classId]) {
        schedulesByClass[schedule.classId] = [];
      }
      schedulesByClass[schedule.classId].push(schedule);
    });
    
    // Transform to ClassScheduleData format for the utility function
    const classScheduleData: ClassScheduleData[] = activeEnrollments.map((enrollment: any) => ({
      id: enrollment.class.id,
      name: enrollment.class.name,
      subject: enrollment.class.subject,
      startDate: new Date(enrollment.class.startDate),
      endDate: enrollment.class.endDate ? new Date(enrollment.class.endDate) : null,
      schedules: (schedulesByClass[enrollment.class.id] || []).map((schedule: any) => ({
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
      enrollments: [], // Not needed for student view
      teacher: enrollment.class.teacher?.user?.name || 'Not assigned',
    }));
    
    // Use the shared utility to get classes for the target date with proper date validation
    const targetDateClasses = getTodaysClasses(classScheduleData, targetDate);
    
    // Debug logging for troubleshooting
    console.log(`Student API: Received dateParam: ${dateParam}`);
    console.log(`Student API: Parsed target date: ${targetDate.toString()} (${dayName})`);
    console.log(`Student API: Target date local: ${targetDate.toISOString().split('T')[0]}`);
    console.log(`Found ${activeEnrollments.length} total active enrollments, ${targetDateClasses.length} classes active on target date`);
    console.log('Active enrollments:', activeEnrollments.map(e => ({
      id: e.id,
      status: e.status,
      classId: e.classId,
      className: e.class?.name,
      classStatus: e.class?.status,
      scheduleCount: e.class?.schedules?.length || 0,
    })));
    console.log('Transformed class schedule data:', classScheduleData.map(c => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      startDate: c.startDate.toISOString().split('T')[0],
      endDate: c.endDate?.toISOString().split('T')[0],
      scheduleCount: c.schedules.length,
      schedules: c.schedules.map(s => ({ day: s.day, time: s.time }))
    })));
    
    // Optional: Enable detailed debugging for each class
    if (process.env.NODE_ENV === 'development') {
      classScheduleData.forEach(classItem => {
        debugClassValidation(classItem, targetDate);
      });
    }
    
    // Convert CalendarEntry format back to the expected API response format
    const formattedClasses = targetDateClasses.map(entry => {
      // Find the original enrollment to get teacher info
      const originalEnrollment = activeEnrollments.find(e => e.class.id === entry.id);
      const teacherName = originalEnrollment?.class?.teacher?.user?.name || 'Not assigned';
      
      return {
        id: entry.id,
        name: entry.name,
        subject: entry.subject,
        schedule: `${dayName} at ${entry.startTime}`,
        room: entry.room,
        startTime: entry.startTime,
        endTime: entry.endTime || null,
        teacher: teacherName,
      };
    });
    
    return NextResponse.json({ classes: formattedClasses });
  } catch (error) {
    console.error('Error fetching student\'s classes:', error);
    // Return an empty array instead of an error to prevent UI issues
    return NextResponse.json({ classes: [] }, { status: 200 });
  }
}