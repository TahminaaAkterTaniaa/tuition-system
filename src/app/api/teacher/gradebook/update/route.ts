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
    
    // Get teacher profile
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    });
    
    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { gradeId, studentId, classId, assessmentName, assessmentType, score, maxScore, feedback } = body;
    
    // Validate required fields
    if (!studentId || !classId || !assessmentName || !assessmentType || score === undefined || maxScore === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate score and maxScore
    if (typeof score !== 'number' || typeof maxScore !== 'number' || score < 0 || maxScore <= 0 || score > maxScore) {
      return NextResponse.json(
        { error: 'Invalid score or maxScore' },
        { status: 400 }
      );
    }
    
    // Verify that the class belongs to this teacher
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacher.id,
      },
    });
    
    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found or you do not have permission to update grades for this class' },
        { status: 404 }
      );
    }
    
    // Verify that the student is enrolled in this class
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        classId,
      },
    });
    
    if (!enrollment) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this class' },
        { status: 404 }
      );
    }
    
    let grade;
    
    if (gradeId) {
      // Update existing grade
      grade = await prisma.grade.update({
        where: {
          id: gradeId,
        },
        data: {
          assessmentName,
          assessmentType,
          score,
          maxScore,
          feedback,
          gradedDate: new Date(),
        },
      });
    } else {
      // Check if a grade already exists for this student, class, and assessment
      const existingGrade = await prisma.grade.findFirst({
        where: {
          studentId,
          classId,
          assessmentName,
        },
      });
      
      if (existingGrade) {
        // Update existing grade
        grade = await prisma.grade.update({
          where: {
            id: existingGrade.id,
          },
          data: {
            assessmentType,
            score,
            maxScore,
            feedback,
            gradedDate: new Date(),
          },
        });
      } else {
        // Create new grade
        grade = await prisma.grade.create({
          data: {
            studentId,
            classId,
            assessmentName,
            assessmentType,
            score,
            maxScore,
            feedback,
            gradedDate: new Date(),
            weight: 1.0, // Default weight
          },
        });
      }
    }
    
    // Create an activity log for this grade update
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: gradeId ? 'UPDATE_GRADE' : 'CREATE_GRADE',
          description: `${gradeId ? 'Updated' : 'Created'} grade for ${assessmentName} in ${classData.name}`,
          entityType: 'GRADE',
          entityId: grade.id,
          metadata: JSON.stringify({
            classId,
            className: classData.name,
            studentId,
            assessmentName,
            score,
            maxScore,
          }),
        },
      });
    } catch (error: unknown) {
      // Log error but don't fail the request
      console.error('Failed to create activity log:', error);
    }
    
    return NextResponse.json({
      success: true,
      grade,
    });
  } catch (error) {
    console.error('Error updating grade:', error);
    return NextResponse.json(
      { error: 'Failed to update grade' },
      { status: 500 }
    );
  }
}
