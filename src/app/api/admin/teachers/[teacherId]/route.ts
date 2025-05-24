import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET - Fetch a specific teacher
export async function GET(
  req: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can access teacher details' }, { status: 403 });
    }
    
    const { teacherId } = params;
    
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        classes: {
          include: {
            enrollments: true,
            schedules: {
              include: {
                timeSlot: true
              }
            }
          }
        },
      },
    });
    
    // Enhance teacher data with additional information
    let enhancedTeacher;
    
    if (teacher) {
      // Calculate workload
      const classCount = teacher.classes.length;
      const totalStudents = teacher.classes.reduce((sum, cls) => sum + (cls.enrollments?.length || 0), 0);
      
      // Calculate weekly hours from schedules
      let weeklyHours = 0;
      teacher.classes.forEach(cls => {
        cls.schedules?.forEach(schedule => {
          if (schedule.timeSlot) {
            // Convert HH:MM format to minutes
            const startTimeParts = schedule.timeSlot.startTime.split(':').map(Number);
            const endTimeParts = schedule.timeSlot.endTime.split(':').map(Number);
            const startMinutes = startTimeParts[0] * 60 + startTimeParts[1];
            const endMinutes = endTimeParts[0] * 60 + endTimeParts[1];
            const durationHours = (endMinutes - startMinutes) / 60;
            weeklyHours += durationHours;
          }
        });
      });
      
      // Determine if teacher is overloaded (example threshold: more than 5 classes or 20 weekly hours)
      const isOverloaded = classCount > 5 || weeklyHours > 20 || totalStudents > 100;
      
      // Enhance classes with enrollment counts
      const enhancedClasses = teacher.classes.map(cls => {
        // Generate a readable schedule string
        let scheduleText = '';
        if (cls.schedules && cls.schedules.length > 0) {
          scheduleText = cls.schedules.map(s => {
            return `${s.day} ${s.timeSlot ? s.timeSlot.label : s.time}`;
          }).join(', ');
        }
        
        return {
          id: cls.id,
          name: cls.name || '',
          subject: cls.subject || '',
          schedule: scheduleText || cls.schedule || '',
          enrolledCount: cls.enrollments?.length || 0,
          capacity: cls.capacity || 0
        };
      });
      
      enhancedTeacher = {
        ...teacher,
        classes: enhancedClasses,
        workload: {
          classCount,
          totalStudents,
          weeklyHours: parseFloat(weeklyHours.toFixed(1)),
          isOverloaded
        }
      };
    }
    
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }
    
    return NextResponse.json(enhancedTeacher || teacher);
  } catch (error) {
    console.error('Error fetching teacher:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teacher' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a teacher
export async function DELETE(
  req: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete teachers' }, { status: 403 });
    }
    
    const { teacherId } = params;
    
    // First check if the teacher exists
    const teacherExists = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        classes: true,
        user: true
      }
    });
    
    if (!teacherExists) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }
    
    // Check if teacher has any classes assigned
    if (teacherExists.classes.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete teacher with assigned classes. Please reassign or delete the classes first.' 
      }, { status: 409 });
    }
    
    // Delete the teacher
    await prisma.teacher.delete({
      where: { id: teacherId },
    });
    
    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          action: 'DELETE',
          entityType: 'Teacher',
          entityId: teacherId,
          description: `Teacher ${teacherExists.user?.name || 'Unknown'} was deleted`,
          userId: session.user.id,
          metadata: JSON.stringify({ role: session.user.role }),
        },
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json(
      { error: 'Failed to delete teacher' },
      { status: 500 }
    );
  }
}

// PATCH - Update a teacher
export async function PATCH(
  req: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update teachers' }, { status: 403 });
    }
    
    const { teacherId } = params;
    const body = await req.json();
    
    // Check if teacher exists
    const teacherExists = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });
    
    if (!teacherExists) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }
    
    // Update the teacher
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: body,
    });
    
    return NextResponse.json(updatedTeacher);
  } catch (error) {
    console.error('Error updating teacher:', error);
    return NextResponse.json(
      { error: 'Failed to update teacher' },
      { status: 500 }
    );
  }
}
