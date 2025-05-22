import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// Handler for multiple schedules
async function handleMultipleSchedules(classId: string, schedules: any[], action: string = 'replace') {
  // Validate schedules
  if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
    throw new Error('Invalid schedules provided');
  }
  
  // If action is 'replace', delete all existing schedules for this class
  if (action === 'replace') {
    await prisma.classSchedule.deleteMany({
      where: { classId }
    });
  }
  
  // Create new schedule entries
  const createdSchedules = [];
  
  for (const schedule of schedules) {
    const { day, time, room } = schedule;
    
    if (!day || !time || !room) {
      throw new Error('Each schedule must include day, time, and room');
    }
    
    const newSchedule = await prisma.classSchedule.create({
      data: {
        classId,
        day,
        time,
        roomId: room,
      }
    });
    
    createdSchedules.push(newSchedule);
  }
  
  return createdSchedules;
}

// PUT handler for updating class schedules
export async function PUT(req: NextRequest, { params }: { params: { classId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { classId } = params;
    
    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }
    
    // Check if the class exists and belongs to the teacher (if the user is a teacher)
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: {
          select: {
            userId: true
          }
        }
      }
    });
    
    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    
    // If the user is a teacher, verify they own this class
    if (session.user.role === 'TEACHER' && classRecord.teacher?.userId !== session.user.id) {
      return NextResponse.json({ error: 'You do not have permission to modify this class' }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
    const { schedules, action = 'replace' } = body;
    
    // Handle multiple schedules
    const updatedSchedules = await handleMultipleSchedules(classId, schedules, action);
    
    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          description: `${session.user.role} updated schedules for class: ${classRecord.name}`,
          entityType: 'CLASS_SCHEDULE',
          entityId: classId,
        },
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Error logging schedule update activity:', logError);
    }
    
    return NextResponse.json({
      message: 'Class schedules updated successfully',
      schedules: updatedSchedules
    });
  } catch (error) {
    console.error('Error updating class schedules:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update class schedules' },
      { status: 500 }
    );
  }
}
