import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

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

    // Create the new class
    const newClass = await prisma.class.create({
      data: {
        name: body.name,
        subject: body.subject,
        description: body.description || null,
        schedule: body.schedule || null,
        room: body.room || null,
        status: body.status || 'active',
        // Convert string dates to DateTime objects or use current date
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : null,
        // Add the required capacity field (default to 30 if not provided)
        capacity: body.capacity ? parseInt(body.capacity) : 30,
        teacherId: teacher.id
      }
    });

    return NextResponse.json({
      message: 'Class created successfully',
      class: newClass
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}
