import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    console.log('Enrolled classes API called');
    
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    console.log('Session in enrolled classes API:', session ? 'Session exists' : 'No session');
    
    if (!session || !session.user) {
      console.log('No session found in enrolled classes API');
      return NextResponse.json([]);
    }
    
    // Get the student's ID
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });
    
    if (!student) {
      console.log('Student not found for user ID:', session.user.id);
      return NextResponse.json([]);
    }
    
    console.log('Found student with ID:', student.id);
    
    // Get all enrollments with status 'enrolled' or 'completed'
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
    
    console.log(`Found ${enrollments.length} enrolled classes for student ${student.id}`);
    
    // Transform the enrollments to class objects
    const enrolledClasses = enrollments.map(enrollment => {
      const classData = enrollment.class;
      
      return {
        id: classData.id,
        name: classData.name,
        subject: classData.subject,
        description: classData.description || '',
        schedule: classData.schedule || '',
        room: classData.room || '',
        teacher: classData.teacher,
        startDate: classData.startDate,
        endDate: classData.endDate,
        capacity: classData.capacity,
        enrolledCount: 0, // This is a placeholder
        availableSeats: 0, // This is a placeholder
        isFull: false, // This is a placeholder
        enrollmentStatus: enrollment.status,
        enrollmentId: enrollment.id
      };
    });
    
    return NextResponse.json(enrolledClasses);
  } catch (error) {
    console.error('Error fetching enrolled classes:', error);
    return NextResponse.json([]);
  }
}
