import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { classId, studentId, assessmentId, score, feedback } = body;
    
    console.log('POST /api/teacher/grades - Request body:', body);
    
    if (!classId || !studentId || !assessmentId || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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
        { error: 'Class not found or you do not have permission to grade students in this class' },
        { status: 404 }
      );
    }
    
    // Check if the student is enrolled in this class
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        classId,
        studentId,
        status: { in: ['enrolled', 'completed'] }
      }
    });
    
    if (!enrollment) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this class' },
        { status: 400 }
      );
    }
    
    // Check if the assessment exists and belongs to this class
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        classId
      }
    });
    
    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found for this class' },
        { status: 404 }
      );
    }
    
    // Check if the score is within the valid range
    if (score < 0 || score > assessment.maxScore) {
      return NextResponse.json(
        { error: `Score must be between 0 and ${assessment.maxScore}` },
        { status: 400 }
      );
    }
    
    // Check if a grade already exists for this student and assessment
    const existingGrade = await prisma.grade.findFirst({
      where: {
        studentId,
        classId,
        assessmentName: assessment.name
      }
    });
    
    let grade;
    
    if (existingGrade) {
      // Update existing grade
      grade = await prisma.grade.update({
        where: {
          id: existingGrade.id
        },
        data: {
          score,
          feedback,
          gradedDate: new Date()
        }
      });
      
      console.log('Updated existing grade:', grade);
    } else {
      // Create new grade
      grade = await prisma.grade.create({
        data: {
          studentId,
          classId,
          assessmentName: assessment.name,
          assessmentType: assessment.type,
          score,
          maxScore: assessment.maxScore,
          weight: assessment.weight,
          feedback,
          gradedDate: new Date()
        }
      });
      
      console.log('Created new grade:', grade);
    }
    
    // Log this activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: existingGrade ? 'UPDATE_GRADE' : 'CREATE_GRADE',
          description: `${existingGrade ? 'Updated' : 'Created'} grade for ${assessment.name} for a student in ${classExists.name} class.`,
          entityType: 'GRADE',
          entityId: grade.id,
          metadata: JSON.stringify({
            assessmentName: assessment.name,
            assessmentType: assessment.type,
            score,
            maxScore: assessment.maxScore
          })
        }
      });
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue even if logging fails
    }
    
    return NextResponse.json({
      success: true,
      grade
    });
  } catch (error: any) {
    console.error('Error creating/updating grade:', error);
    
    return NextResponse.json(
      { error: 'Failed to create/update grade: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
