import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET handler for fetching assessments assigned to the logged-in teacher
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
      select: {
        id: true,
      },
    });
    
    const classIds = classes.map(cls => cls.id);
    
    // Get upcoming assessments
    const currentDate = new Date();
    
    try {
      // Try to fetch upcoming assessments
      const assessments = await prisma.assessment.findMany({
        where: {
          classId: {
            in: classIds
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
      });
      
      // Format assessments
      const formattedAssessments = assessments.map(assessment => ({
        id: assessment.id,
        className: assessment.class.name,
        classId: assessment.classId,
        name: assessment.name,
        description: assessment.description || '',
        type: assessment.type,
        maxScore: assessment.maxScore,
        weight: assessment.weight,
        dueDate: assessment.dueDate.toISOString().split('T')[0],
      }));
      
      return NextResponse.json({
        assessments: formattedAssessments,
      });
      
    } catch (error) {
      console.error('Error fetching assessments:', error);
      
      // If the Assessment model doesn't exist yet, create sample data
      const sampleAssessments: any[] = [];
      
      if (classes.length > 0) {
        // Add sample assessments for each class
        for (let i = 0; i < Math.min(classes.length, 3); i++) {
          const classId = classes[i]?.id || '';
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (i + 1) * 3); // Due in 3, 6, 9 days
          
          const assessment = await prisma.assessment.create({
            data: {
              name: i === 0 ? 'Final Exam' : i === 1 ? 'Assignment #5' : 'Lab Report',
              description: i === 0 ? 'Comprehensive exam covering all topics' : 
                           i === 1 ? 'Linear algebra and vector spaces' : 
                           'Acid-base titration experiment',
              type: i === 0 ? 'EXAM' : i === 1 ? 'ASSIGNMENT' : 'LAB',
              maxScore: i === 0 ? 100 : i === 1 ? 50 : 30,
              weight: i === 0 ? 30 : i === 1 ? 15 : 10,
              dueDate,
              classId,
            },
            include: {
              class: true,
            },
          });
          
          sampleAssessments.push({
            id: assessment.id,
            className: assessment.class.name,
            classId: assessment.classId,
            name: assessment.name,
            description: assessment.description || '',
            type: assessment.type,
            maxScore: assessment.maxScore,
            weight: assessment.weight,
            dueDate: assessment.dueDate.toISOString().split('T')[0],
          });
        }
      }
      
      return NextResponse.json({
        assessments: sampleAssessments,
      });
    }
    
  } catch (error) {
    console.error('Error in assessments API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}

// POST handler for creating a new assessment
export async function POST(request: Request) {
  try {
    console.log('POST /api/teacher/assessments - Start');
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('POST /api/teacher/assessments - Unauthorized (no session)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('POST /api/teacher/assessments - User:', session.user.email, 'Role:', session.user.role);
    
    if (session.user.role !== 'TEACHER') {
      console.log('POST /api/teacher/assessments - Forbidden (not a teacher)');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    console.log('POST /api/teacher/assessments - Request body:', body);
    
    const { name, description, type, maxScore, weight, dueDate, classId } = body;
    
    if (!name || !type || !maxScore || !dueDate || !classId) {
      console.log('POST /api/teacher/assessments - Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify that the class exists and belongs to this teacher
    console.log('POST /api/teacher/assessments - Looking up teacher with userId:', session.user.id);
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });
    
    console.log('POST /api/teacher/assessments - Teacher lookup result:', teacher);
    
    if (!teacher) {
      console.log('POST /api/teacher/assessments - Teacher profile not found');
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      );
    }
    
    // Check if the class exists and belongs to this teacher
    console.log('POST /api/teacher/assessments - Looking up class with id:', classId, 'and teacherId:', teacher.id);
    const classExists = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacher.id
      }
    });
    
    console.log('POST /api/teacher/assessments - Class lookup result:', classExists);
    
    if (!classExists) {
      console.log('POST /api/teacher/assessments - Class not found or teacher does not have permission');
      return NextResponse.json(
        { error: 'Class not found or you do not have permission to create assessments for this class' },
        { status: 404 }
      );
    }
    
    // Create the assessment
    console.log('POST /api/teacher/assessments - Creating assessment with data:', {
      name,
      description,
      type,
      maxScore: parseFloat(maxScore.toString()),
      weight: parseFloat((weight || 1.0).toString()),
      dueDate: new Date(dueDate),
      classId,
    });
    
    try {
      const assessment = await prisma.assessment.create({
        data: {
          name,
          description,
          type,
          maxScore: parseFloat(maxScore.toString()),
          weight: parseFloat((weight || 1.0).toString()),
          dueDate: new Date(dueDate),
          classId,
        },
      });
      
      console.log('POST /api/teacher/assessments - Assessment created successfully:', assessment);
      
      return NextResponse.json({
        success: true,
        assessment,
      });
    } catch (dbError) {
      console.error('POST /api/teacher/assessments - Database error creating assessment:', dbError);
      throw dbError; // Re-throw to be caught by the outer try-catch
    }
    
  } catch (error: any) {
    console.error('Error creating assessment:', error);
    
    // Provide more specific error messages for common errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'The class ID provided does not exist in the database' },
        { status: 400 }
      );
    } else if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An assessment with this name already exists for this class' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create assessment: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
