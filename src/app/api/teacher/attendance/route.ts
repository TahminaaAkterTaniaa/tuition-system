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
        teacherId: teacher.id
      },
      include: {
        enrollments: {
          where: {
            status: 'enrolled',
          },
          include: {
            student: {
              include: {
                attendances: {
                  orderBy: {
                    date: 'desc'
                  },
                  take: 10
                },
                user: {
                  select: {
                    name: true,
                    email: true
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
      let totalAttendanceRecords = 0;
      let totalPresentRecords = 0;
      
      // Get the most recent attendance date for this class
      let lastAttendanceDate: Date | null = null;
      
      // Process each student's attendance
      classItem.enrollments.forEach(enrollment => {
        if (enrollment.student?.attendances) {
          enrollment.student.attendances.forEach(attendance => {
            totalAttendanceRecords++;
            if (attendance.status === 'present') {
              totalPresentRecords++;
            }
            
            // Check if this is the most recent attendance date
            if (!lastAttendanceDate || new Date(attendance.date) > new Date(lastAttendanceDate)) {
              lastAttendanceDate = attendance.date;
            }
          });
        }
      });
      
      // Calculate attendance rate
      const attendanceRate = totalAttendanceRecords > 0 
        ? Math.round((totalPresentRecords / totalAttendanceRecords) * 100) 
        : 0;
      
      // Format the class data
      return {
        id: classItem.id,
        name: classItem.name,
        subject: classItem.subject,
        schedule: classItem.schedule,
        room: classItem.room,
        students: studentCount,
        lastAttendance: lastAttendanceDate ? new Date(lastAttendanceDate).toISOString().split('T')[0] : null,
        attendanceRate: `${attendanceRate}%`,
        enrollments: classItem.enrollments.map(enrollment => ({
          id: enrollment.id,
          studentId: enrollment.studentId,
          studentName: enrollment.student?.user?.name || 'Unknown',
          studentEmail: enrollment.student?.user?.email || 'No email',
          attendances: enrollment.student?.attendances || []
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
        time: attendance.date.toISOString().split('T')[1].substring(0, 5),
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
