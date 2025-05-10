import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(req.url);
    const classId = url.searchParams.get('classId');
    
    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }
    
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ isEnrolled: false });
    }
    
    // Get the student's ID
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });
    
    if (!student) {
      return NextResponse.json({ isEnrolled: false });
    }
    
    // Check if the student is already enrolled in this class
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        classId,
        status: { in: ['enrolled', 'completed'] }
      }
    });
    
    return NextResponse.json({
      isEnrolled: !!existingEnrollment,
      enrollmentStatus: existingEnrollment ? existingEnrollment.status : null,
      enrollmentId: existingEnrollment ? existingEnrollment.id : null
    });
  } catch (error) {
    console.error('Error checking enrollment status:', error);
    return NextResponse.json({ error: 'Failed to check enrollment status' }, { status: 500 });
  }
}
