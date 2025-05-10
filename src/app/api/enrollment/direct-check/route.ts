import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const classId = url.searchParams.get('classId');
    
    console.log('Direct enrollment check called with:', { userId, classId });
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID is required',
        enrollments: [] 
      });
    }
    
    // Get the student's ID directly from the database
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true }
    });
    
    if (!student) {
      console.log('No student profile found for user ID:', userId);
      return NextResponse.json({ 
        success: false, 
        message: 'Student profile not found',
        enrollments: [] 
      });
    }
    
    console.log('Found student with ID:', student.id);
    
    // Build the query for enrollments
    const where: any = {
      studentId: student.id
    };
    
    // Add classId filter if provided
    if (classId) {
      where.classId = classId;
    }
    
    // Get the student's enrollments directly from the database
    const enrollments = await prisma.enrollment.findMany({
      where,
      select: {
        id: true,
        classId: true,
        status: true,
        enrollmentDate: true
      }
    });
    
    console.log(`Found ${enrollments.length} enrollments for student ${student.id}`);
    
    return NextResponse.json({
      success: true,
      enrollments
    });
  } catch (error) {
    console.error('Error checking direct enrollment status:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to check enrollment status',
      enrollments: [] 
    });
  }
}
