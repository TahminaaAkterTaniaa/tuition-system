import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a parent
    if (!session || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the parent ID
    const parent = await prisma.parent.findUnique({
      where: { userId: session.user.id },
    });

    if (!parent) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
    }

    // Get the linked students with their details
    const linkedStudents = await prisma.parentStudent.findMany({
      where: { parentId: parent.id },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
            enrollments: {
              include: {
                class: {
                  select: {
                    name: true,
                    subject: true,
                    schedule: true,
                    teacher: {
                      include: {
                        user: {
                          select: {
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            attendances: {
              take: 10,
              orderBy: {
                date: 'desc',
              },
              include: {
                class: {
                  select: {
                    name: true,
                    subject: true,
                  },
                },
              },
            },
            grades: {
              take: 10,
              orderBy: {
                createdAt: 'desc',
              },
              include: {
                class: {
                  select: {
                    name: true,
                    subject: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ linkedStudents });
  } catch (error) {
    console.error('Error fetching linked students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch linked students' },
      { status: 500 }
    );
  }
}
