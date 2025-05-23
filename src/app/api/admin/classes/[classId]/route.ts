import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET - Fetch a specific class
export async function GET(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { classId } = params;
    
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        enrollments: {
          include: {
            student: {
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
      },
    });
    
    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    return NextResponse.json(classData);
  } catch (error) {
    console.error('Error fetching class:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a class
export async function DELETE(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete classes' }, { status: 403 });
    }
    
    const { classId } = params;
    
    // First check if the class exists
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: true,
        attendances: true,
        assessments: true,
        grades: true,
        resources: true
      }
    });
    
    if (!classExists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    // Check for related records
    const relatedRecordsCount = 
      classExists.enrollments.length + 
      classExists.attendances.length + 
      classExists.assessments.length + 
      classExists.grades.length + 
      classExists.resources.length;
    
    if (relatedRecordsCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete class with related records. Please delete enrollments, attendances, assessments, grades, and resources first.',
        details: {
          enrollments: classExists.enrollments.length,
          attendances: classExists.attendances.length,
          assessments: classExists.assessments.length,
          grades: classExists.grades.length,
          resources: classExists.resources.length
        }
      }, { status: 409 });
    }
    
    // Delete the class
    await prisma.class.delete({
      where: { id: classId },
    });
    
    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          action: 'DELETE',
          entityType: 'CLASS',
          entityId: classId,
          description: `Class ${classExists.name} was deleted`,
          userId: session.user.id,
          metadata: JSON.stringify({ role: session.user.role }),
        },
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json(
      { error: 'Failed to delete class' },
      { status: 500 }
    );
  }
}

// PATCH - Update a class
export async function PATCH(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update classes' }, { status: 403 });
    }
    
    const { classId } = params;
    const body = await req.json();
    
    // Check if class exists
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
    });
    
    if (!classExists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    // Extract and validate the update data
    const { 
      name, 
      subject, 
      description, 
      startDate, 
      endDate, 
      capacity, 
      teacherId, 
      status 
    } = body;
    
    // Prepare the validated update data
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (subject !== undefined) updateData.subject = subject;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (capacity !== undefined) updateData.capacity = Number(capacity);
    if (teacherId !== undefined) updateData.teacherId = teacherId || null;
    if (status !== undefined) updateData.status = status;
    
    // Update the class with validated data
    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: updateData,
      include: {
        teacher: {
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
    });
    
    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'CLASS',
          entityId: classId,
          description: `Class ${updatedClass.name} was updated`,
          userId: session.user.id,
          metadata: JSON.stringify({ role: session.user.role }),
        },
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    return NextResponse.json(
      { error: 'Failed to update class' },
      { status: 500 }
    );
  }
}
