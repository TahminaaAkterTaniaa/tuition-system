import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a student
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Unauthorized. Only students can access this endpoint.' },
        { status: 403 }
      );
    }

    // Get the student's ID
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student profile not found.' },
        { status: 404 }
      );
    }

    // Get the classes the student is enrolled in
    const enrollments = await prisma.enrollment.findMany({
      where: { 
        studentId: student.id,
        status: { in: ['enrolled', 'completed'] }
      },
      select: {
        classId: true
      }
    });

    const classIds = enrollments.map(enrollment => enrollment.classId);

    // Get resources for the student's classes that are published
    const resources = await prisma.resource.findMany({
      where: { 
        classId: { in: classIds },
        isPublished: true,
        publishDate: {
          lte: new Date()
        },
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: new Date() } }
        ]
      },
      include: {
        class: {
          select: {
            name: true,
            subject: true
          }
        },
        teacher: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        publishDate: 'desc'
      }
    });

    return NextResponse.json(resources);
  } catch (error) {
    console.error('Error fetching student resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}
