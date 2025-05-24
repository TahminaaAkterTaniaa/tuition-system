import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const { studentId } = params;
    console.log('Fetching student details for ID:', studentId);
    
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can access student details' }, { status: 403 });
    }
    
    if (!studentId) {
      console.error('No studentId provided');
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }
    
    console.log('Attempting to fetch student with ID:', studentId);
    // Fetch student details including parent contacts and enrolled classes
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        parentStudents: {
          include: {
            parent: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        enrollments: {
          include: {
            class: {
              include: {
                teacher: {
                  include: {
                    user: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
                schedules: true,
              },
            },
          },
        },
      },
    });
    
    if (!student) {
      console.error('Student not found with ID:', studentId);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    console.log('Student found:', student.studentId, 'Status:', student.status);
    
    // Transform the data to a more usable format for the frontend
    const formattedStudent = {
      id: student.id,
      studentId: student.studentId,
      user: student.user,
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().split('T')[0] : null,
      address: student.address,
      phone: student.phoneNumber,
      grade: student.academicLevel,
      status: student.status,
      enrollmentDate: student.enrollmentDate.toISOString(),
      // Format parent contacts from parentStudents relationship
      parentContacts: (student.parentStudents || []).map(ps => ({
        id: ps.parent.id,
        name: ps.parent.user?.name || 'Unknown',
        relationship: ps.relationship || 'Parent/Guardian',
        email: ps.parent.user?.email || '',
        phone: ps.parent.alternatePhone || '',
        isEmergencyContact: ps.isPrimary
      })),
      // Format enrolled classes
      enrolledClasses: (student.enrollments || []).map((enrollment: any) => {
        // Format schedules into a readable string
        const schedules = enrollment.class.schedules || [];
        const scheduleString = schedules.length > 0 
          ? schedules.map((s: any) => `${s.day} ${s.time}`).join(', ')
          : null;
        
        return {
          id: enrollment.class.id,
          name: enrollment.class.name,
          subject: enrollment.class.subject,
          teacherName: enrollment.class.teacher?.user?.name || null,
          schedule: scheduleString,
          status: enrollment.status,
        };
      }),
    };
    
    console.log('Formatted student data successfully');
    
    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          action: 'VIEW',
          entityType: 'STUDENT',
          entityId: student.id,
          description: `Viewed student profile: ${student.user?.name || student.studentId}`,
          userId: session.user.id,
          metadata: JSON.stringify({ role: session.user.role }),
        },
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json(formattedStudent);
  } catch (error: any) {
    console.error('Error fetching student details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student details', message: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
