import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a teacher
    if (!session || !session.user || session.user.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Unauthorized. Only teachers can create classes.' },
        { status: 403 }
      );
    }

    // Get the teacher's ID
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found.' },
        { status: 404 }
      );
    }

    // Parse the request body
    const body = await req.json();
    
    // Validate required fields
    if (!body.name || !body.subject) {
      return NextResponse.json(
        { error: 'Name and subject are required fields.' },
        { status: 400 }
      );
    }

    // Use a transaction for all database operations
    const result = await prisma.$transaction(async (tx) => {
      // Get teacher's user data first
      const teacherWithUser = await tx.teacher.findUnique({
        where: { id: teacher.id },
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      });

      if (!teacherWithUser || !teacherWithUser.user) {
        throw new Error('Teacher data not found');
      }

      const teacherName = teacherWithUser.user.name;

      // Process fee if provided, otherwise use default
      const fee = body.fee ? parseFloat(body.fee) : 99.99;
      
      // Validate fee is a positive number
      if (isNaN(fee) || fee < 0) {
        throw new Error('Fee must be a positive number');
      }
      
      // Create the new class
      const newClass = await tx.class.create({
        data: {
          name: body.name,
          subject: body.subject,
          description: body.description || null,
          status: 'pending', // Teacher-created classes need admin approval
          startDate: body.startDate ? new Date(body.startDate) : new Date(),
          endDate: body.endDate ? new Date(body.endDate) : null,
          capacity: body.capacity ? parseInt(body.capacity) : 30,
          fee: fee, // Use the validated fee from the form
          teacherId: teacher.id
        }
      });

      // Create schedules if provided
      let schedules = [];
      if (body.selectedDays?.length > 0 && body.selectedTimeSlot) {
        // Get the timeSlot information
        const timeSlot = await tx.timeSlot.findUnique({
          where: { id: body.selectedTimeSlot }
        });
        
        if (!timeSlot) {
          throw new Error('Invalid time slot selected');
        }

        // Check for scheduling conflicts if room is provided
        if (body.selectedRoom) {
          const conflicts = await Promise.all(body.selectedDays.map(async (day: string) => {
            return tx.classSchedule.findFirst({
              where: {
                roomId: body.selectedRoom,
                day: day,
                timeSlotId: body.selectedTimeSlot,
                NOT: {
                  classId: newClass.id
                }
              }
            });
          }));

          if (conflicts.some(conflict => conflict !== null)) {
            throw new Error('The room is already scheduled for one or more selected time slots');
          }
        }

        // Create schedules for each selected day
        schedules = await Promise.all(body.selectedDays.map(async (day: string) => {
          return tx.classSchedule.create({
            data: {
              day,
              time: `${timeSlot.startTime} - ${timeSlot.endTime}`,
              timeSlotId: timeSlot.id,
              roomId: body.selectedRoom || null,
              classId: newClass.id
            },
            include: {
              timeSlot: true,
              room: true
            }
          });
        }));
      }

      // Create admin notification for the new class request
      const notificationMessage = `Teacher ${teacherName} has requested approval for a new class: ${newClass.name}`;
      
      // Get all admin users
      const admins = await tx.admin.findMany({
        select: { userId: true }
      });

      // Create notifications for all admins
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map(admin => ({
            id: uuidv4(),
            userId: admin.userId,
            title: 'New Class Request',
            message: notificationMessage,
            type: 'class_creation_request',
            relatedId: newClass.id,
            read: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }))
        });
      }

      return { newClass, schedules };
    }, {
      timeout: 10000, // 10 second timeout
      maxWait: 5000, // 5 seconds max wait for transaction
      isolationLevel: 'Serializable' // Highest isolation level for consistency
    });

    return NextResponse.json({
      message: 'Class created successfully',
      class: result.newClass,
      schedules: result.schedules
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create class' },
      { status: 500 }
    );
  }
}
