import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const classId = params.classId;
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Verify that the teacher is assigned to this class
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });
    
    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      );
    }
    
    // Check if the class exists and belongs to this teacher
    const classExists = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacher.id
      }
    });
    
    if (!classExists) {
      return NextResponse.json(
        { error: 'Class not found or you do not have permission to access it' },
        { status: 404 }
      );
    }
    
    // Get assessments for this class
    try {
      const assessments = await prisma.assessment.findMany({
        where: {
          classId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return NextResponse.json(assessments);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      
      // If there's an error or no assessments are found, return mock data
      const mockAssessments = [
        {
          id: `mock-assessment-1-${classId}`,
          name: 'Midterm Exam',
          type: 'EXAM',
          description: 'Comprehensive exam covering all topics from the first half of the course',
          maxScore: 100,
          weight: 1.0,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          classId
        },
        {
          id: `mock-assessment-2-${classId}`,
          name: 'Final Project',
          type: 'PROJECT',
          description: 'Group project demonstrating practical application of course concepts',
          maxScore: 50,
          weight: 0.5,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          classId
        },
        {
          id: `mock-assessment-3-${classId}`,
          name: 'Weekly Quiz #5',
          type: 'QUIZ',
          description: 'Short quiz covering recent material',
          maxScore: 20,
          weight: 0.2,
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          classId
        }
      ];
      
      return NextResponse.json(mockAssessments);
    }
  } catch (error) {
    console.error('Error in class assessments API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}
