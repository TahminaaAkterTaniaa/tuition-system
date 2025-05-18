import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET endpoint to fetch a specific grade by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gradeId = params.id;
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Verify that the teacher has access to this grade
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
    
    // Get the grade with related data
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        },
        class: {
          select: {
            name: true,
            teacherId: true
          }
        }
      }
    });
    
    if (!grade) {
      return NextResponse.json(
        { error: 'Grade not found' },
        { status: 404 }
      );
    }
    
    // Check if the grade belongs to a class taught by this teacher
    if (grade.class.teacherId !== teacher.id) {
      return NextResponse.json(
        { error: 'You do not have permission to access this grade' },
        { status: 403 }
      );
    }
    
    // Format the response
    const formattedGrade = {
      id: grade.id,
      studentId: grade.studentId,
      studentName: grade.student.user.name,
      classId: grade.classId,
      className: grade.class.name,
      assessmentName: grade.assessmentName,
      assessmentType: grade.assessmentType,
      score: grade.score,
      maxScore: grade.maxScore,
      weight: grade.weight,
      feedback: grade.feedback
    };
    
    return NextResponse.json({
      grade: formattedGrade
    });
  } catch (error) {
    console.error('Error fetching grade:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grade' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a grade
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gradeId = params.id;
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get the request body
    const body = await request.json();
    const { score, feedback } = body;
    
    if (score === undefined) {
      return NextResponse.json(
        { error: 'Score is required' },
        { status: 400 }
      );
    }
    
    // Verify that the teacher has access to this grade
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
    
    // Get the grade to check permissions and max score
    const existingGrade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        class: {
          select: {
            teacherId: true
          }
        }
      }
    });
    
    if (!existingGrade) {
      return NextResponse.json(
        { error: 'Grade not found' },
        { status: 404 }
      );
    }
    
    // Check if the grade belongs to a class taught by this teacher
    if (existingGrade.class.teacherId !== teacher.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this grade' },
        { status: 403 }
      );
    }
    
    // Validate the score
    if (score < 0 || score > existingGrade.maxScore) {
      return NextResponse.json(
        { error: `Score must be between 0 and ${existingGrade.maxScore}` },
        { status: 400 }
      );
    }
    
    // Calculate the percentage and letter grade
    const percentage = (score / existingGrade.maxScore) * 100;
    
    // Update the grade
    const updatedGrade = await prisma.grade.update({
      where: { id: gradeId },
      data: {
        score,
        feedback,
        gradedDate: new Date()
      }
    });
    
    // Log this activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'UPDATE_GRADE',
          description: `Updated grade for ${existingGrade.assessmentName}.`,
          entityType: 'GRADE',
          entityId: gradeId,
          metadata: JSON.stringify({
            assessmentName: existingGrade.assessmentName,
            assessmentType: existingGrade.assessmentType,
            score,
            maxScore: existingGrade.maxScore
          })
        }
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json({
      success: true,
      grade: updatedGrade
    });
  } catch (error: any) {
    console.error('Error updating grade:', error);
    
    return NextResponse.json(
      { error: 'Failed to update grade: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
