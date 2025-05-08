import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a student
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Unauthorized. Only students can access this endpoint.' },
        { status: 403 }
      );
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

    // Get all attendance records for the student
    const attendanceRecords = await prisma.attendance.findMany({
      where: { 
        studentId: student.id 
      },
      include: {
        class: {
          select: {
            name: true,
            subject: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Calculate attendance summary
    const totalClasses = attendanceRecords.length;
    const present = attendanceRecords.filter(record => record.status === 'present').length;
    const absent = attendanceRecords.filter(record => record.status === 'absent').length;
    const late = attendanceRecords.filter(record => record.status === 'late').length;
    const excused = attendanceRecords.filter(record => record.status === 'excused').length;
    
    // Calculate attendance rate (present + half credit for late)
    const attendanceRate = totalClasses > 0 
      ? ((present + (late * 0.5)) / totalClasses) * 100 
      : 0;

    const summary = {
      totalClasses,
      present,
      absent,
      late,
      excused,
      attendanceRate: parseFloat(attendanceRate.toFixed(2))
    };

    return NextResponse.json({
      records: attendanceRecords,
      summary
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance records' },
      { status: 500 }
    );
  }
}
