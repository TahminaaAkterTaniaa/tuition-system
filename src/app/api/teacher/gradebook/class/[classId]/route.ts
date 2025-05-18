import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const classId = params.classId;
    
    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      );
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
    
    // Get class details
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacher.id,
      },
    });
    
    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found or you do not have permission to view it' },
        { status: 404 }
      );
    }
    
    // Get all students enrolled in this class
    const enrollments = await prisma.enrollment.findMany({
      where: {
        classId,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });
    
    // Get all assessments for this class
    const grades = await prisma.grade.findMany({
      where: {
        classId,
      },
    });
    
    // Get unique assessment names
    const assessmentNames = [...new Set(grades.map(grade => grade.assessmentName))];
    
    // Format assessments with type and date
    const assessments = assessmentNames.map(name => {
      const assessment = grades.find(g => g.assessmentName === name);
      return {
        name,
        type: assessment?.assessmentType || 'Unknown',
        date: assessment?.gradedDate ? new Date(assessment.gradedDate).toISOString().split('T')[0] : null,
      };
    });
    
    // Format student data with grades
    const students = enrollments.map(enrollment => {
      const student = enrollment.student;
      
      // Get all grades for this student in this class
      const studentGrades = grades.filter(grade => grade.studentId === student.id);
      
      // Calculate average grade
      const totalGrades = studentGrades.length;
      const totalPercentage = studentGrades.reduce((sum, grade) => sum + (grade.score / grade.maxScore) * 100, 0);
      const avgPercentage = totalGrades > 0 ? Math.round(totalPercentage / totalGrades) : 0;
      
      // Format grades by assessment
      const gradesByAssessment = assessmentNames.map(assessmentName => {
        const grade = studentGrades.find(g => g.assessmentName === assessmentName);
        return {
          assessmentName,
          grade: grade ? {
            id: grade.id,
            score: grade.score,
            maxScore: grade.maxScore,
            percentage: Math.round((grade.score / grade.maxScore) * 100),
            letterGrade: getLetterGrade(grade.score / grade.maxScore * 100),
            feedback: grade.feedback,
            gradedDate: grade.gradedDate ? new Date(grade.gradedDate).toISOString() : null,
          } : null,
        };
      });
      
      return {
        id: student.id,
        name: student.user.name || 'Unknown Student',
        email: student.user.email,
        image: student.user.image,
        avgGrade: getLetterGrade(avgPercentage),
        avgPercentage,
        grades: gradesByAssessment,
      };
    });
    
    // Sort students by name
    students.sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json({
      class: {
        id: classData.id,
        name: classData.name,
        subject: classData.subject,
        description: classData.description,
      },
      assessments,
      students,
    });
  } catch (error) {
    console.error('Error fetching class grades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class grades' },
      { status: 500 }
    );
  }
}

// Helper function to get letter grade from percentage
function getLetterGrade(percentage: number): string {
  if (percentage >= 97) return 'A+';
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 63) return 'D';
  if (percentage >= 60) return 'D-';
  return 'F';
}
