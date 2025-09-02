import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// Define types for the enrollment with included relations
type EnrollmentWithStudent = {
  studentId: string;
  student: {
    id: string;
    studentId: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
    attendances: Array<{
      date: Date;
      status: string;
    }>;
  };
};

// Define type for the processed student data
type ProcessedStudent = {
  id: string;
  name: string | null;
  studentId: string;
  email: string;
  attendanceRate: number;
  lastAttendance?: {
    date: string;
    status: string;
  };
};

// Using the shared Prisma client instance from @/app/lib/prisma

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { classId } = await params;
    
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
    
    // Get class data with schedules and room info
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        schedules: {
          include: {
            room: {
              select: {
                name: true,
                building: true,
                floor: true
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
        }
      }
    });
    
    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found.' },
        { status: 404 }
      );
    }
    
    if (classData.teacherId !== teacher.id) {
      return NextResponse.json(
        { error: 'You are not authorized to view students in this class.' },
        { status: 403 }
      );
    }
    
    // Get enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: {
        classId,
        status: 'enrolled',
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            attendances: {
              where: {
                classId,
              },
              orderBy: {
                date: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });
    
    // Calculate attendance rates
    const students = await Promise.all(
      enrollments.map(async (enrollment: EnrollmentWithStudent) => {
        // Get total attendance records for this student in this class
        const attendanceCount = await prisma.attendance.count({
          where: {
            studentId: enrollment.studentId,
            classId,
          },
        });
        
        // Get present/late attendance records
        const presentCount = await prisma.attendance.count({
          where: {
            studentId: enrollment.studentId,
            classId,
            status: {
              in: ['present', 'late'],
            },
          },
        });
        
        // Calculate attendance rate
        const attendanceRate = attendanceCount > 0
          ? Math.round((presentCount / attendanceCount) * 100)
          : 100; // Default to 100% if no attendance records
        
        const lastAttendance = enrollment.student.attendances[0]
          ? {
              date: enrollment.student.attendances[0].date.toISOString(),
              status: enrollment.student.attendances[0].status,
            }
          : undefined;
        
        return {
          id: enrollment.student.id,
          name: enrollment.student.user.name,
          studentId: enrollment.student.studentId,
          email: enrollment.student.user.email,
          attendanceRate,
          lastAttendance,
        };
      })
    );
    
    // Format schedule display
    const schedulesDisplay = classData.schedules.length > 0 
      ? classData.schedules.map(schedule => {
          let timeDisplay = schedule.time || 'Time not set';
          if (schedule.timeSlot?.label) {
            timeDisplay = schedule.timeSlot.label;
          } else if (schedule.timeSlot?.startTime && schedule.timeSlot?.endTime) {
            timeDisplay = `${schedule.timeSlot.startTime} - ${schedule.timeSlot.endTime}`;
          }
          return `${schedule.day} ${timeDisplay}`;
        }).join(', ')
      : 'No schedule set';
    
    // Format room display
    const roomDisplay = classData.schedules.length > 0 && classData.schedules[0]?.room
      ? `${classData.schedules[0].room.name}${classData.schedules[0].room.building ? ` (${classData.schedules[0].room.building}${classData.schedules[0].room.floor ? `, Floor ${classData.schedules[0].room.floor}` : ''})` : ''}`
      : classData.room || 'No room assigned';
    
    // Return class details along with students
    return NextResponse.json({
      className: classData.name,
      subject: classData.subject,
      schedule: schedulesDisplay,
      room: roomDisplay,
      teacherId: classData.teacherId,
      students
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}
