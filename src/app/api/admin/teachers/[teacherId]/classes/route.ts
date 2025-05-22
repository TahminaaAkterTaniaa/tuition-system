import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET - Fetch all classes for a specific teacher
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
      return NextResponse.json({ error: 'Only admins can access this endpoint' }, { status: 403 });
    }
    
    const { teacherId } = params;
    
    if (!teacherId) {
      return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 });
    }
    
    // Get all classes for the specified teacher
    const classes = await prisma.class.findMany({
      where: {
        teacherId: teacherId
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        _count: {
          select: {
            enrollments: true,
          }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return NextResponse.json(classes);
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teacher classes' },
      { status: 500 }
    );
  }
}
