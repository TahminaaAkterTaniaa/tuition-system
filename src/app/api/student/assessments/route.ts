import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
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

    // Get the class ID from the query parameters
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    
    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
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
    
    // Check if the student is enrolled in this class
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        classId: classId,
        studentId: student.id,
        status: { in: ['enrolled', 'completed'] }
      }
    });
    
    if (!enrollment) {
      return NextResponse.json(
        { error: 'Student not enrolled in this class' },
        { status: 403 }
      );
    }
    
    // Get all assessments for this class
    const assessments = await prisma.assessment.findMany({
      where: {
        classId: classId,
        dueDate: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30)) // Include assessments from the last 30 days
        }
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        dueDate: true,
        maxScore: true,
        class: {
          select: {
            id: true,
            name: true,
            subject: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });
    
    // Transform the data to match the expected format in the client
    const formattedAssessments = assessments.map(assessment => ({
      id: assessment.id,
      title: assessment.name,  // Map 'name' to 'title' for client consistency
      description: assessment.description,
      type: assessment.type,
      dueDate: assessment.dueDate,
      maxScore: assessment.maxScore,
      class: assessment.class
    }));
    
    return NextResponse.json(formattedAssessments);
  } catch (error) {
    console.error('Error fetching student assessments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}
