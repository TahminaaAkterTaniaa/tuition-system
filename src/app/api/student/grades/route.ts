import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  console.log('GET /api/student/grades - Start processing request');
  
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    console.log('Session data:', {
      authenticated: !!session,
      userId: session?.user?.id,
      role: session?.user?.role
    });

    // Check if user is authenticated and is a student
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      console.log('Unauthorized access attempt - Role:', session?.user?.role);
      return NextResponse.json(
        { error: 'Unauthorized. Only students can access this endpoint.' },
        { status: 403 }
      );
    }

    // Get the student's ID
    console.log('Looking up student profile for user ID:', session.user.id);
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    console.log('Student lookup result:', student);
    
    if (!student) {
      console.log('Student profile not found for user ID:', session.user.id);
      return NextResponse.json(
        { error: 'Student profile not found.' },
        { status: 404 }
      );
    }

    // Get all grades for the student
    console.log('Fetching grades for student ID:', student.id);
    
    let grades = [];
    try {
      // Based on the database schema, get grades with class information
      grades = await prisma.grade.findMany({
        where: { 
          studentId: student.id 
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              subject: true
            }
          }
        },
        orderBy: {
          gradedDate: 'desc'
        }
      });
      
      console.log(`Found ${grades.length} grades for student`);
    } catch (dbError) {
      console.error('Database error fetching grades:', dbError);
      throw new Error('Database error: ' + (dbError instanceof Error ? dbError.message : 'Unknown error'));
    }
    
    // Return empty array if no grades found
    if (grades.length === 0) {
      console.log('No grades found in database, returning empty array');
      return NextResponse.json([]);
    }
    
    console.log('Processing grades to create class summaries...');
    
    // Format the grades to match the expected structure
    const formattedGrades = grades.map(grade => ({
      id: grade.id,
      assessmentName: grade.assessmentName || 'Unknown Assessment',
      assessmentType: grade.assessmentType || 'unknown',
      score: grade.score,
      maxScore: grade.maxScore || 100,
      weight: grade.weight || 1.0,
      feedback: grade.feedback,
      gradedDate: grade.gradedDate.toISOString(),
      class: {
        id: grade.class?.id || '',
        name: grade.class?.name || 'Unknown Class',
        subject: grade.class?.subject || 'Unknown Subject'
      }
    }));

    // Group grades by class
    const gradesByClass: Record<string, any[]> = {};
    formattedGrades.forEach(grade => {
      // Skip grades with missing class info
      if (!grade.class || !grade.class.name) {
        console.warn('Skipping grade with missing class info:', grade.id);
        return;
      }
      
      const className = grade.class.name;
      if (!gradesByClass[className]) {
        gradesByClass[className] = [];
      }
      gradesByClass[className].push(grade);
    });
    
    // Calculate class summaries
    const classSummaries = Object.keys(gradesByClass).map(className => {
      const classGrades = gradesByClass[className];
      if (!classGrades || classGrades.length === 0) {
        return {
          className,
          subject: 'Unknown',
          averageGrade: 0,
          letterGrade: 'N/A',
          grades: []
        };
      }
      
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
        subject: classGrades[0]?.class?.subject || 'Unknown Subject',
        averageGrade: parseFloat(averageGrade.toFixed(2)),
        letterGrade,
        grades: classGrades
      };
    });

    console.log(`Generated ${classSummaries.length} class summaries`);
    return NextResponse.json(classSummaries);
  } catch (error) {
    console.error('Error fetching student grades:', error);
    
    // More detailed error reporting
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack
    });
    
    return NextResponse.json(
      { error: `Failed to fetch grades: ${errorMessage}` },
      { status: 500 }
    );
  }
}
