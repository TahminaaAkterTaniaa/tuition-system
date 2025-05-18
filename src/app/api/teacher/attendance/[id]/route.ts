import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const attendanceId = params.id;
    
    if (!attendanceId) {
      return NextResponse.json(
        { error: 'Attendance ID is required' },
        { status: 400 }
      );
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
    
    // Verify that the attendance record belongs to a student in one of the teacher's classes
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        student: {
          include: {
            enrollments: {
              include: {
                class: true
              }
            }
          }
        }
      }
    });
    
    if (!attendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }
    
    // Check if this student is in one of the teacher's classes
    const isTeacherStudent = attendance.student?.enrollments.some(
      enrollment => enrollment.class.teacherId === teacher.id
    );
    
    if (!isTeacherStudent) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this attendance record' },
        { status: 403 }
      );
    }
    
    // Delete the attendance record
    await prisma.attendance.delete({
      where: { id: attendanceId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to delete attendance record' },
      { status: 500 }
    );
  }
}
