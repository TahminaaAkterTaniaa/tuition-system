import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    // Extract classId from the URL path directly
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    // Use the last part of the path as the classId
    const classId = pathParts[pathParts.length - 1];
    
    console.log('Class details API called for classId:', classId);
    
    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      );
    }

    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    
    // Fetch the class details with all necessary information including schedules
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        },
        // Include class schedules with room details
        schedules: {
          include: {
            room: true
          }
        },
        // Count current enrollments to check available seats
        enrollments: {
          where: {
            status: { in: ['enrolled', 'completed'] }
          },
          select: {
            id: true
          }
        }
      }
    });

    if (!classInfo) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Transform the data to include available seats
    const enrolledCount = classInfo?.enrollments?.length || 0;
    const availableSeats = classInfo ? classInfo.capacity - enrolledCount : 0;
    
    // Format the schedule information from class schedules
    let formattedSchedule = classInfo?.schedule || null;
    let roomDetails = null;
    
    // Process schedules into a readable format if available
    if (classInfo && classInfo.schedules && classInfo.schedules.length > 0) {
      // Group schedules by day
      const scheduleByDay = classInfo.schedules.reduce((acc, schedule) => {
        if (schedule && schedule.day) {
          if (!acc[schedule.day]) {
            acc[schedule.day] = [];
          }
          if (schedule.time) {
            acc[schedule.day].push(schedule.time);
          }
        }
        return acc;
      }, {} as Record<string, string[]>);
      
      // Format as: "Monday: 9:00 AM - 11:00 AM, Wednesday: 2:00 PM - 4:00 PM"
      formattedSchedule = Object.entries(scheduleByDay)
        .map(([day, times]) => `${day}: ${times.join(', ')}`)
        .join('; ');
      
      // Use the first schedule's room if available
      if (classInfo.schedules[0] && classInfo.schedules[0].room) {
        roomDetails = classInfo.schedules[0].room;
      }
    }
    
    // Remove the schedules and enrollments arrays from the response
    const { enrollments, schedules, ...classWithoutArrays } = classInfo;
    
    let classWithAvailability: any = {
      ...classWithoutArrays,
      enrolledCount,
      availableSeats,
      isFull: availableSeats <= 0,
      enrollmentStatus: null,
      roomDetails: roomDetails,
      formattedSchedule // Add the formatted schedule
    };

    // If the user is a student, check if they're already enrolled
    if (session && session.user && session.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });

      if (student) {
        // Check if the student is enrolled in this class
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            studentId: student.id,
            classId,
            status: { in: ['enrolled', 'completed', 'pending'] }
          },
          select: {
            status: true
          }
        });

        if (enrollment) {
          classWithAvailability.enrollmentStatus = enrollment.status;
        }
      }
    }

    return NextResponse.json(classWithAvailability);
  } catch (error) {
    console.error('Error fetching class details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class details' },
      { status: 500 }
    );
  }
}
