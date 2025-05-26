import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can view pending requests' }, { status: 403 });
    }
    
    // Get the student's ID
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });
    
    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }
    
    // Get pending enrollment requests
    const enrollmentRequests = await prisma.enrollmentRequest.findMany({
      where: {
        studentId: student.id,
        status: 'pending'
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            teacher: {
              select: {
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // First, get all pending withdrawal requests for the student
    const withdrawalRequests = await prisma.withdrawalRequest.findMany({
      where: {
        studentId: student.id,
        status: 'pending'
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            teacher: {
              select: {
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Format the withdrawal requests to match the expected structure
    const formattedWithdrawalRequests = withdrawalRequests
      .map(request => ({
        id: request.id,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        class: request.class ? {
          id: request.class.id,
          name: request.class.name,
          subject: request.class.subject,
          teacher: request.class.teacher ? {
            user: {
              name: request.class.teacher.user?.name || null
            }
          } : null
        } : null
      }))
      .filter((request): request is {
        id: string;
        status: string;
        createdAt: string;
        class: {
          id: string;
          name: string;
          subject: string;
          teacher: { user: { name: string | null } } | null;
        };
      } => request.class !== null);
    
    return NextResponse.json({
      success: true,
      enrollmentRequests: enrollmentRequests.map(req => ({
        ...req,
        createdAt: req.createdAt.toISOString()
      })),
      withdrawalRequests: formattedWithdrawalRequests
    });
    
  } catch (error: any) {
    console.error('Error fetching pending requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending requests', message: error.message },
      { status: 500 }
    );
  }
}
