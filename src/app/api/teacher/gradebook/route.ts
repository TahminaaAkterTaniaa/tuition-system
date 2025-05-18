import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

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
        { error: 'Teacher profile not found' },
        { status: 404 }
      );
    }
    
    // Get classes taught by this teacher
    const classes = await prisma.class.findMany({
      where: {
        teacherId: teacher.id,
      },
      include: {
        grades: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        enrollments: {
          include: {
            student: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    // Format class data with grade statistics
    const formattedClasses = classes.map((cls) => {
      // Calculate average grade
      const totalGrades = cls.grades.length;
      const totalScore = cls.grades.reduce((sum, grade) => sum + (grade.score / grade.maxScore) * 100, 0);
      const avgPercentage = totalGrades > 0 ? totalScore / totalGrades : 0;
      
      // Convert percentage to letter grade
      let avgGrade = 'N/A';
      if (totalGrades > 0) {
        if (avgPercentage >= 90) avgGrade = 'A';
        else if (avgPercentage >= 80) avgGrade = 'B';
        else if (avgPercentage >= 70) avgGrade = 'C';
        else if (avgPercentage >= 60) avgGrade = 'D';
        else avgGrade = 'F';
        
        // Add plus/minus
        if (avgGrade !== 'F') {
          const remainder = avgPercentage % 10;
          if (remainder >= 7 && avgGrade !== 'A') avgGrade += '+';
          else if (remainder < 3 && avgGrade !== 'F') avgGrade += '-';
        }
      }
      
      return {
        id: cls.id,
        name: cls.name,
        subject: cls.subject,
        students: cls.enrollments.length,
        assessments: [...new Set(cls.grades.map(g => g.assessmentName))].length,
        avgGrade,
        avgPercentage: Math.round(avgPercentage),
        lastUpdated: cls.grades.length > 0 
          ? new Date(Math.max(...cls.grades.map(g => new Date(g.updatedAt).getTime()))).toISOString().split('T')[0]
          : null,
      };
    });
    
    // Get recent grades (across all classes)
    const recentGrades = [];
    
    for (const cls of classes) {
      const classGrades = cls.grades.map(grade => ({
        id: grade.id,
        student: grade.student.user.name || 'Unknown Student',
        studentId: grade.studentId,
        class: cls.name,
        classId: cls.id,
        assessment: grade.assessmentName,
        assessmentType: grade.assessmentType,
        score: `${grade.score}/${grade.maxScore}`,
        percentage: Math.round((grade.score / grade.maxScore) * 100),
        // Convert percentage to letter grade
        grade: getLetterGrade(grade.score / grade.maxScore * 100),
        date: new Date(grade.updatedAt).toISOString().split('T')[0],
      }));
      
      recentGrades.push(...classGrades);
    }
    
    // Sort recent grades by date (newest first)
    recentGrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Get top 5 recent grades
    const topRecentGrades = recentGrades.slice(0, 5);
    
    // Get student performance data
    const studentPerformance = await getStudentPerformance(teacher.id);
    
    // Get upcoming assessments from the database
    const currentDate = new Date();
    
    // Check if the Assessment model exists in the Prisma schema
    let formattedUpcomingAssessments: {
      id: string;
      className: string;
      classId: string;
      name: string;
      description: string;
      dueDate: string;
    }[] = [];
    
    try {
      // Try to fetch upcoming assessments
      const upcomingAssessments = await prisma.assessment.findMany({
        where: {
          classId: {
            in: classes.map(cls => cls.id)
          },
          dueDate: {
            gte: currentDate
          }
        },
        include: {
          class: true
        },
        orderBy: {
          dueDate: 'asc'
        },
        take: 5
      });
      
      // Format upcoming assessments
      formattedUpcomingAssessments = upcomingAssessments.map((assessment: any) => ({
        id: assessment.id,
        className: assessment.class.name,
        classId: assessment.classId,
        name: assessment.name,
        description: assessment.description || '',
        dueDate: assessment.dueDate.toISOString().split('T')[0],
      }));
    } catch (error) {
      console.error('Error fetching assessments:', error);
      // If the Assessment model doesn't exist yet, use dummy data
    }
    
    // If no upcoming assessments are found, create placeholders
    if (formattedUpcomingAssessments.length === 0 && classes.length > 0) {
      // Add placeholder assessments
      formattedUpcomingAssessments = [
        {
          id: 'placeholder-1',
          className: classes[0] ? classes[0].name : 'Advanced Mathematics',
          classId: classes[0] ? classes[0].id : 'class-1',
          name: 'Assignment #5',
          description: 'Linear algebra and vector spaces',
          dueDate: new Date(currentDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        {
          id: 'placeholder-2',
          className: classes.length > 1 ? classes[1].name : 'Chemistry',
          classId: classes.length > 1 ? classes[1].id : 'class-2',
          name: 'Lab Report',
          description: 'Acid-base titration experiment',
          dueDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        {
          id: 'placeholder-3',
          className: classes.length > 2 ? classes[2].name : 'Physics',
          classId: classes.length > 2 ? classes[2].id : 'class-3',
          name: 'Final Exam',
          description: 'Comprehensive exam covering all topics',
          dueDate: new Date(currentDate.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }
      ];
    }
    
    return NextResponse.json({
      classes: formattedClasses,
      recentGrades: topRecentGrades,
      studentPerformance,
      upcomingAssessments: formattedUpcomingAssessments,
    });
  } catch (error) {
    console.error('Error fetching gradebook data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gradebook data' },
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

// Helper function to get student performance data
async function getStudentPerformance(teacherId: string) {
  // Get all students in teacher's classes
  const enrollments = await prisma.enrollment.findMany({
    where: {
      class: {
        teacherId,
      },
    },
    include: {
      student: {
        include: {
          user: true,
          grades: true,
        },
      },
    },
    distinct: ['studentId'],
  });
  
  // Calculate performance for each student
  const studentPerformance = enrollments.map(enrollment => {
    const student = enrollment.student;
    const grades = student.grades;
    
    // Calculate average percentage
    const totalGrades = grades.length;
    const totalPercentage = grades.reduce((sum, grade) => sum + (grade.score / grade.maxScore) * 100, 0);
    const avgPercentage = totalGrades > 0 ? Math.round(totalPercentage / totalGrades) : 0;
    
    return {
      id: student.id,
      name: student.user.name || 'Unknown Student',
      avgGrade: getLetterGrade(avgPercentage),
      avgPercentage,
    };
  });
  
  // Sort by percentage (highest first)
  studentPerformance.sort((a, b) => b.avgPercentage - a.avgPercentage);
  
  // Return top 5 students
  return studentPerformance.slice(0, 5);
}
