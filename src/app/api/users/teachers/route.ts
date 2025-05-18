import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET - Fetch all teachers for messaging
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get all users with teacher role
    const teachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        teacher: {
          select: {
            teacherId: true,
            qualification: true,
            specialization: true,
          },
        },
      },
    });
    
    return NextResponse.json({ teachers });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teachers' },
      { status: 500 }
    );
  }
}
