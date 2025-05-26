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
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can access this endpoint' }, { status: 403 });
    }
    
    // Get teacher ID
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }
    
    // Get pending class requests for this teacher
    const pendingClasses = await prisma.class.findMany({
      where: {
        teacherId: teacher.id,
        status: 'pending'
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      pendingClasses
    });
    
  } catch (error: any) {
    console.error('Error fetching pending class requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending class requests', message: error.message },
      { status: 500 }
    );
  }
}
