import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// Using the shared Prisma client instance from @/app/lib/prisma

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get teacher profile
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    });
    
    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found.' },
        { status: 404 }
      );
    }
    
    // Get classes taught by this teacher
    const classes = await prisma.class.findMany({
      where: { teacherId: teacher.id },
      select: { id: true },
    });
    
    const classIds = classes.map((cls: { id: string }) => cls.id);
    
    if (classIds.length === 0) {
      return NextResponse.json({ parents: [] });
    }
    
    // Get enrollments for these classes
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: { in: classIds } },
      select: { studentId: true },
    });
    
    const studentIds = [...new Set(enrollments.map((enrollment: { studentId: string }) => enrollment.studentId))];
    
    if (studentIds.length === 0) {
      return NextResponse.json({ parents: [] });
    }
    
    // Get parent-student relationships
    const parentStudents = await prisma.parentStudent.findMany({
      where: { studentId: { in: studentIds } },
      include: {
        parent: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
              },
            },
          },
        },
        student: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    
    // Format the response
    const parents = parentStudents.map((ps: any) => ({
      id: ps.parent.user.id,
      name: ps.parent.user.name,
      email: ps.parent.user.email,
      role: ps.parent.user.role,
      image: ps.parent.user.image,
      studentName: ps.student.user.name || 'Unknown Student',
    }));
    
    // Remove duplicates (parents with multiple children in the teacher's classes)
    const uniqueParents = Array.from(
      new Map(parents.map((parent: { id: string }) => [parent.id, parent])).values()
    );
    
    return NextResponse.json({ parents: uniqueParents });
  } catch (error) {
    console.error('Error fetching parents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parents' },
      { status: 500 }
    );
  }
}
