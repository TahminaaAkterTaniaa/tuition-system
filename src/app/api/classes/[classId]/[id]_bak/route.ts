import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const classId = params.id;
    
    console.log(`Fetching class details for ID: ${classId}`);
    
    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      );
    }
    
    // Get the class details
    const classDetails = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true
              }
            }
          }
        }
      }
    });
    
    if (!classDetails) {
      console.log(`Class not found with ID: ${classId}`);
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }
    
    // Format the response
    const formattedClass = {
      id: classDetails.id,
      name: classDetails.name,
      subject: classDetails.subject,
      description: classDetails.description,
      startDate: classDetails.startDate,
      endDate: classDetails.endDate,
      schedule: classDetails.schedule,
      capacity: classDetails.capacity,
      room: classDetails.room,
      status: classDetails.status,
      teacher: classDetails.teacher ? {
        id: classDetails.teacher.id,
        name: classDetails.teacher.user.name,
        email: classDetails.teacher.user.email,
        image: classDetails.teacher.user.image
      } : null
    };
    
    console.log(`Successfully fetched class details for ID: ${classId}`);
    
    return NextResponse.json(formattedClass);
  } catch (error) {
    console.error('Error fetching class details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class details' },
      { status: 500 }
    );
  }
}
