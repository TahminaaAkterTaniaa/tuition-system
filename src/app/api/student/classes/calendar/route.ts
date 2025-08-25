import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// Helper function to get monthly calendar data for students
async function getMonthlyCalendarData(studentId: string, year: number, month: number) {
  try {
    // Get the start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get student's enrolled classes with their schedules
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: studentId,
        status: { in: ['enrolled', 'completed'] }
      },
      include: {
        class: {
          include: {
            schedules: {
              include: {
                room: true,
                timeSlot: true
              }
            }
          }
        }
      }
    });

    // Generate calendar entries based on class schedules
    const calendarClasses = [];
    
    for (const enrollment of enrollments) {
      const classItem = enrollment.class;
      
      for (const schedule of classItem.schedules) {
        // Get the day of week for this schedule
        const dayOfWeek = getDayOfWeekNumber(schedule.day);
        
        // Generate all occurrences of this class in the month
        const current = new Date(startDate);
        while (current <= endDate) {
          if (current.getDay() === dayOfWeek) {
            // Check if the class is active on this specific date
            const classStart = new Date(classItem.startDate);
            const classEnd = classItem.endDate ? new Date(classItem.endDate) : new Date('2099-12-31');
            classStart.setHours(0, 0, 0, 0);
            classEnd.setHours(23, 59, 59, 999);
            
            const checkDate = new Date(current);
            checkDate.setHours(0, 0, 0, 0);
            
            // Only include if current date is within class active period
            if (checkDate >= classStart && checkDate <= classEnd) {
            // Format time
            let timeDisplay = schedule.time || 'Time not set';
            if (schedule.timeSlot) {
              if (schedule.timeSlot.label) {
                timeDisplay = schedule.timeSlot.label;
              } else if (schedule.timeSlot.startTime && schedule.timeSlot.endTime) {
                timeDisplay = `${schedule.timeSlot.startTime} - ${schedule.timeSlot.endTime}`;
              }
            }

            calendarClasses.push({
              id: classItem.id,
              name: classItem.name,
              subject: classItem.subject,
              startTime: timeDisplay.split(' - ')[0] || timeDisplay,
              endTime: timeDisplay.split(' - ')[1] || '',
              room: schedule.room?.name || 'Room not assigned',
              date: current.toISOString()
            });
            }
          }
          current.setDate(current.getDate() + 1);
        }
      }
    }

    return NextResponse.json({ classes: calendarClasses });
  } catch (error) {
    console.error('Error fetching monthly calendar data for student:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}

// Helper function to convert day name to day number (0 = Sunday, 1 = Monday, etc.)
function getDayOfWeekNumber(dayName: string): number {
  const days = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };
  return days[dayName as keyof typeof days] ?? 1; // Default to Monday if not found
}

// GET handler for fetching calendar data for the authenticated student
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the student's ID
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student profile not found.' },
        { status: 404 }
      );
    }

    // Check if this is a calendar request with year and month parameters
    const year = req.nextUrl.searchParams.get('year');
    const month = req.nextUrl.searchParams.get('month');
    
    if (year && month) {
      // Return calendar data for the specific month
      return getMonthlyCalendarData(student.id, parseInt(year), parseInt(month));
    }

    // If no year/month provided, return current month
    const now = new Date();
    return getMonthlyCalendarData(student.id, now.getFullYear(), now.getMonth() + 1);
    
  } catch (error) {
    console.error('Error fetching student calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}