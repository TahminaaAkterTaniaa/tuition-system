import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

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
    
    // Get all classes for this teacher
    const classes = await prisma.class.findMany({
      where: { 
        teacherId: teacher.id,
        OR: [
          { status: { equals: 'active', mode: 'insensitive' } },
          { status: { equals: 'approved', mode: 'insensitive' } },
          { status: { equals: 'Active', mode: 'insensitive' } },
          { status: { equals: 'Approved', mode: 'insensitive' } }
        ]
      },
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
        },
        enrollments: {
          where: {
            status: 'enrolled',
          }
        },
        attendances: {
          where: {
            class: {
              teacherId: teacher.id
            }
          },
          orderBy: {
            date: 'desc'
          },
          include: {
            student: {
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
    
    // Process the data to include attendance statistics
    const classesWithAttendance = classes.map(classItem => {
      // Calculate attendance statistics for this class
      const studentCount = classItem.enrollments.length;
      
      // Get attendance records for this specific class
      const classAttendances = classItem.attendances || [];
      
      // Group attendance by date to calculate class session attendance rates
      const attendanceByDate: Record<string, typeof classAttendances> = {};
      classAttendances.forEach(attendance => {
        const dateKey = attendance.date.toISOString().split('T')[0];
        if (!attendanceByDate[dateKey]) {
          attendanceByDate[dateKey] = [];
        }
        attendanceByDate[dateKey].push(attendance);
      });
      
      // Calculate attendance rate based on class sessions
      let totalSessionAttendanceRate = 0;
      let sessionCount = 0;
      
      Object.entries(attendanceByDate).forEach(([, attendances]) => {
        const presentCount = attendances.filter(a => a.status === 'present').length;
        const sessionAttendanceRate = studentCount > 0 ? (presentCount / studentCount) * 100 : 0;
        totalSessionAttendanceRate += sessionAttendanceRate;
        sessionCount++;
      });
      
      // Overall attendance rate for the class
      const attendanceRate = sessionCount > 0 
        ? Math.round(totalSessionAttendanceRate / sessionCount)
        : 0;
      
      // Get the most recent attendance date for this class
      const lastAttendanceDate = classAttendances.length > 0 
        ? classAttendances[0]?.date || null
        : null;
      
      // Format schedule display
      const schedulesDisplay = classItem.schedules.length > 0 
        ? classItem.schedules.map(schedule => {
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
      const formattedRoom = classItem.schedules.length > 0 && classItem.schedules[0]?.room
        ? `${classItem.schedules[0].room.name}${classItem.schedules[0].room.building ? ` (${classItem.schedules[0].room.building}${classItem.schedules[0].room.floor ? `, Floor ${classItem.schedules[0].room.floor}` : ''})` : ''}`
        : classItem.room || 'No room assigned';

      // Format the class data
      return {
        id: classItem.id,
        name: classItem.name,
        subject: classItem.subject,
        schedule: schedulesDisplay,
        room: formattedRoom,
        students: studentCount,
        lastAttendance: lastAttendanceDate ? new Date(lastAttendanceDate).toISOString().split('T')[0] : null,
        attendanceRate: `${attendanceRate}%`,
        totalSessions: sessionCount,
        enrollments: classItem.enrollments.map(enrollment => ({
          id: enrollment.id,
          studentId: enrollment.studentId
        }))
      };
    });
    
    // Get recent attendance records
    const recentAttendances = await prisma.attendance.findMany({
      where: {
        student: {
          enrollments: {
            some: {
              class: {
                teacherId: teacher.id
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 20,
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true
              }
            },
            enrollments: {
              where: {
                class: {
                  teacherId: teacher.id
                }
              },
              include: {
                class: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Process attendance records
    const processedAttendances = recentAttendances.map(attendance => {
      // Add null checks for student and enrollments
      const student = attendance.student || { enrollments: [], user: { name: null } };
      const enrollment = student.enrollments && student.enrollments.length > 0 ? student.enrollments[0] : null;
      const className = enrollment?.class?.name || 'Unknown Class';
      const classId = enrollment?.class?.id || '';
      
      return {
        id: attendance.id,
        classId,
        className,
        date: attendance.date.toISOString().split('T')[0],
        time: attendance.date.toISOString().split('T')[1]?.substring(0, 5) || '00:00',
        status: attendance.status,
        studentName: attendance.student?.user?.name || 'Unknown Student',
        studentId: attendance.studentId
      };
    });
    
    // Group attendance records by date
    const attendanceByDate: Record<string, any[]> = {};
    processedAttendances.forEach(record => {
      const date = record.date;
      if (date && !attendanceByDate[date]) {
        attendanceByDate[date] = [];
      }
      if (date) {
        attendanceByDate[date].push(record);
      }
    });
    
    return NextResponse.json({
      classes: classesWithAttendance,
      recentAttendance: processedAttendances,
      attendanceDates: attendanceByDate
    });
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance data' },
      { status: 500 }
    );
  }
}
