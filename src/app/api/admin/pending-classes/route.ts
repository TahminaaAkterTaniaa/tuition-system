import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can access this resource' }, { status: 403 });
    }
    
    // Get admin ID
    const admin = await prisma.admin.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!admin) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }
    
    // First, get all pending classes from the Class table
    const pendingClassesFromDB = await prisma.class.findMany({
      where: {
        status: 'pending'
      },
      include: {
        teacher: {
          include: {
            user: true
          }
        }
      }
    });
    
    console.log(`Found ${pendingClassesFromDB.length} pending classes in the database`);
    
    // Create class requests for each pending class
    const pendingClassesWithDetails = await Promise.all(
      pendingClassesFromDB.map(async (classData) => {
        // Fetch room information if room ID exists
        let roomInfo = null;
        if (classData.room) {
          roomInfo = await prisma.room.findUnique({
            where: { id: classData.room },
            select: { id: true, name: true, capacity: true }
          });
        }

        // Try to find an existing class creation request
        let request = await prisma.classCreationRequest.findFirst({
          where: {
            teacherId: classData.teacherId || '',
            name: classData.name,
            subject: classData.subject,
            status: 'pending'
          },
          include: {
            teacher: {
              select: {
                id: true,
                teacherId: true,
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        });
        
        // If no request exists, create a synthetic one for display purposes
        if (!request) {
          request = {
            id: `synthetic-${classData.id}`,
            teacherId: classData.teacherId || '',
            name: classData.name,
            subject: classData.subject,
            status: 'pending',
            createdAt: classData.createdAt,
            updatedAt: classData.updatedAt,
            teacher: classData.teacher || null,
            // Add other required fields with default values
            capacity: classData.capacity,
            fee: classData.fee || 99.99,
            startDate: classData.startDate,
            endDate: classData.endDate,
            description: classData.description,
            // This is a synthetic request
            isSynthetic: true
          };
        }
        
        return {
          ...request,
          class: {
            ...classData,
            roomInfo: roomInfo // Include room details for display
          }
        };
      })
    );
    
    return NextResponse.json(pendingClassesWithDetails);
    
  } catch (error: any) {
    console.error('Error fetching pending class requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending class requests', message: error.message },
      { status: 500 }
    );
  }
}
