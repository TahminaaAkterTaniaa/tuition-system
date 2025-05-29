import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { createActivityLog } from '@/app/lib/notifications';

export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { studentId } = params;
    const format = request.nextUrl.searchParams.get('format') || 'json';
    
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }
    
    // Fetch student information
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    // Fetch enrollment information
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            startDate: true,
            endDate: true,
            teacher: {
              include: {
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Fetch attendance information
    const attendances = await prisma.attendance.findMany({
      where: { studentId },
      include: {
        class: {
          select: {
            name: true,
            subject: true
          }
        }
      }
    });
    
    // Calculate attendance statistics per class
    const classAttendance: Record<string, { total: number; present: number; subject: string }> = {};
    attendances.forEach(attendance => {
      const className = attendance.class.name;
      if (!classAttendance[className]) {
        classAttendance[className] = { 
          total: 0, 
          present: 0,
          subject: attendance.class.subject 
        };
      }
      
      classAttendance[className].total += 1;
      if (attendance.status === 'present') {
        classAttendance[className].present += 1;
      }
    });
    
    const formattedAttendance = Object.entries(classAttendance).map(([className, stats]) => ({
      className,
      subject: stats.subject,
      present: stats.present,
      total: stats.total,
      percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0
    }));
    
    // Fetch grades information
    const grades = await prisma.grade.findMany({
      where: { studentId },
      include: {
        class: {
          select: {
            name: true,
            subject: true
          }
        }
      }
    });
    
    // Calculate grades per class and assessment
    const classGrades: Record<string, {
      subject: string;
      assessments: Array<{
        name: string;
        type: string;
        score: number;
        maxScore: number;
        percentage: number;
        weight: number;
        feedback?: string;
        date: Date;
      }>;
      totalScore: number;
      totalWeight: number;
      count: number;
    }> = {};
    
    grades.forEach(grade => {
      const className = grade.class.name;
      if (!classGrades[className]) {
        classGrades[className] = {
          subject: grade.class.subject,
          assessments: [],
          totalScore: 0,
          totalWeight: 0,
          count: 0
        };
      }
      
      classGrades[className].assessments.push({
        name: grade.assessmentName,
        type: grade.assessmentType,
        score: grade.score,
        maxScore: grade.maxScore,
        percentage: Math.round((grade.score / grade.maxScore) * 100),
        weight: grade.weight,
        feedback: grade.feedback,
        date: grade.gradedDate
      });
      
      classGrades[className].totalScore += (grade.score / grade.maxScore) * grade.weight;
      classGrades[className].totalWeight += grade.weight;
      classGrades[className].count += 1;
    });
    
    const formattedGrades = Object.entries(classGrades).map(([className, data]) => {
      const weightedAverage = data.totalWeight > 0 
        ? (data.totalScore / data.totalWeight) * 100 
        : 0;
      
      let letterGrade = 'N/A';
      let gpa = 0;
      
      // Determine letter grade and GPA based on percentage
      if (weightedAverage >= 90) {
        letterGrade = 'A';
        gpa = 4.0;
      } else if (weightedAverage >= 80) {
        letterGrade = 'B';
        gpa = 3.0;
      } else if (weightedAverage >= 70) {
        letterGrade = 'C';
        gpa = 2.0;
      } else if (weightedAverage >= 60) {
        letterGrade = 'D';
        gpa = 1.0;
      } else if (weightedAverage > 0) {
        letterGrade = 'F';
        gpa = 0.0;
      }
      
      return {
        className,
        subject: data.subject,
        assessments: data.assessments,
        overallGrade: {
          letter: letterGrade,
          percentage: Math.round(weightedAverage),
          gpa
        }
      };
    });
    
    // Calculate overall performance metrics
    const overallPerformance = {
      enrolledClasses: enrollments.length,
      averageAttendance: formattedAttendance.length > 0 
        ? Math.round(formattedAttendance.reduce((sum, item) => sum + item.percentage, 0) / formattedAttendance.length) 
        : 0,
      averageGrade: formattedGrades.length > 0 
        ? Math.round(formattedGrades.reduce((sum, item) => sum + item.overallGrade.percentage, 0) / formattedGrades.length) 
        : 0,
      averageGPA: formattedGrades.length > 0 
        ? Number((formattedGrades.reduce((sum, item) => sum + item.overallGrade.gpa, 0) / formattedGrades.length).toFixed(2)) 
        : 0
    };
    
    // Format the data for the report
    const studentReport = {
      studentInfo: {
        id: student.id,
        studentId: student.studentId,
        name: student.user.name || 'Unknown',
        email: student.user.email,
        academicLevel: student.academicLevel || 'Not specified',
        enrollmentDate: student.enrollmentDate
      },
      enrolledClasses: enrollments.map(enrollment => ({
        className: enrollment.class.name,
        subject: enrollment.class.subject,
        enrollmentDate: enrollment.enrollmentDate,
        status: enrollment.status,
        teacherName: enrollment.class.teacher?.user?.name || 'Unassigned'
      })),
      attendance: formattedAttendance,
      grades: formattedGrades,
      overallPerformance,
      generatedAt: new Date().toISOString()
    };
    
    // Log this activity
    try {
      if (session.user?.id) {
        await createActivityLog(
          session.user.id,
          'GENERATE_REPORT',
          `Generated student report for ${student.user.name || 'Unknown Student'}`,
          'STUDENT',
          student.id
        );
      }
    } catch (logError) {
      console.error('Error logging activity (non-fatal):', logError);
    }
    
    // Return the report based on requested format
    if (format === 'pdf' || format === 'excel') {
      // In a real implementation, we would generate the actual PDF or Excel here
      // For now, we'll just return the data with a header indicating it should be downloaded
      return NextResponse.json(studentReport, {
        headers: {
          'Content-Disposition': `attachment; filename="student-report-${student.studentId}.${format}"`,
        }
      });
    }
    
    // Default: return JSON
    return NextResponse.json(studentReport);
  } catch (error) {
    console.error('Error generating student report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
