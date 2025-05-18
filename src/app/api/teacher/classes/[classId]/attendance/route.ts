import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const classId = params.classId;
    
    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
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
    
    // Verify that the class belongs to this teacher
    const classDetails = await prisma.class.findUnique({
      where: { 
        id: classId,
        teacherId: teacher.id
      }
    });
    
    if (!classDetails) {
      return NextResponse.json(
        { error: 'Class not found or you do not have permission to access it' },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { date, records } = body;
    
    if (!date || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }
    
    // Format the date
    const attendanceDate = new Date(date);
    
    // Process each attendance record
    const results = await Promise.all(
      records.map(async (record: { studentId: string; status: string }) => {
        const { studentId, status } = record;
        
        if (!studentId || !status) {
          return { success: false, studentId, error: 'Missing required fields' };
        }
        
        // Verify that the student is enrolled in this class
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            studentId,
            classId,
            status: 'enrolled'
          }
        });
        
        if (!enrollment) {
          return { success: false, studentId, error: 'Student not enrolled in this class' };
        }
        
        try {
          // Check if attendance record already exists for this date and student
          const existingAttendance = await prisma.attendance.findFirst({
            where: {
              studentId,
              date: {
                gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
                lt: new Date(attendanceDate.setHours(23, 59, 59, 999))
              }
            }
          });
          
          if (existingAttendance) {
            // Update existing record
            await prisma.attendance.update({
              where: { id: existingAttendance.id },
              data: { status }
            });
            
            return { success: true, studentId, action: 'updated' };
          } else {
            // Create new record
            await prisma.attendance.create({
              data: {
                studentId,
                date: attendanceDate,
                status,
                classId  // Include the classId from the route params
              }
            });
            
            return { success: true, studentId, action: 'created' };
          }
        } catch (error) {
          console.error(`Error processing attendance for student ${studentId}:`, error);
          return { success: false, studentId, error: 'Database error' };
        }
      })
    );
    
    // Count successes and failures
    const successes = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Processed ${successes} attendance records successfully${failures > 0 ? `, with ${failures} failures` : ''}`,
      results
    });
    
  } catch (error) {
    console.error('Error saving attendance records:', error);
    return NextResponse.json(
      { error: 'Failed to save attendance records' },
      { status: 500 }
    );
  }
}
