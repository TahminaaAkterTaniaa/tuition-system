import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

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

    // Get all grades for the student
    const grades = await prisma.grade.findMany({
      where: { 
        studentId: student.id 
      },
      include: {
        class: {
          select: {
            name: true,
            subject: true
          }
        }
      },
      orderBy: {
        gradedDate: 'desc'
      }
    });

    // Group grades by class
    const gradesByClass: Record<string, any[]> = {};
    grades.forEach(grade => {
      const className = grade.class.name;
      if (!gradesByClass[className]) {
        gradesByClass[className] = [];
      }
      gradesByClass[className].push(grade);
    });
    
    // Calculate class summaries
    const classSummaries = Object.keys(gradesByClass).map(className => {
      const classGrades = gradesByClass[className];
      let totalWeightedScore = 0;
      let totalWeight = 0;
      
      classGrades.forEach(grade => {
        const weightedScore = (grade.score / grade.maxScore) * grade.weight;
        totalWeightedScore += weightedScore;
        totalWeight += grade.weight;
      });
      
      const averageGrade = totalWeight > 0 
        ? (totalWeightedScore / totalWeight) * 100 
        : 0;
      
      // Determine letter grade
      let letterGrade = 'N/A';
      if (averageGrade >= 90) letterGrade = 'A';
      else if (averageGrade >= 80) letterGrade = 'B';
      else if (averageGrade >= 70) letterGrade = 'C';
      else if (averageGrade >= 60) letterGrade = 'D';
      else if (averageGrade > 0) letterGrade = 'F';
      
      return {
        className,
        subject: classGrades[0].class.subject,
        averageGrade: parseFloat(averageGrade.toFixed(2)),
        letterGrade,
        grades: classGrades
      };
    });

    return NextResponse.json(classSummaries);
  } catch (error) {
    console.error('Error fetching student grades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grades' },
      { status: 500 }
    );
  }
}
