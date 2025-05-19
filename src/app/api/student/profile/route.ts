import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// For debugging purposes
const debugLog = (message: string, data?: any) => {
  console.log(`[PROFILE API] ${message}`, data ? data : '');
};

export async function GET(req: NextRequest) {
  try {
    debugLog('Received request for student profile');
    
    // Get the authenticated user's session
    debugLog('Getting session');
    const session = await getServerSession(authOptions);
    debugLog('Session retrieved', { hasSession: !!session, userId: session?.user?.id });
    
    if (!session || !session.user) {
      debugLog('No authenticated session');
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    debugLog('Using userId from session', { userId });

    // First get the user data
    debugLog('Querying user data');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      }
    });
    
    if (!user) {
      debugLog('User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Then get the student data
    debugLog('Querying student data');
    const student = await prisma.student.findFirst({
      where: { userId: userId },
    });
    
    debugLog('Database queries completed', { foundUser: !!user, foundStudent: !!student });

    if (!student) {
      debugLog('Student profile not found');
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    debugLog('Found student profile', {
      userId: user.id,
      name: user.name,
      email: user.email,
      studentId: student.studentId
    });

    // Prepare profile data with null/undefined checks
    const profileData = {
      fullName: user.name || '',
      email: user.email || '',
      phone: '', // User phone field not available in schema
      idNumber: student.studentId || '',
      emergencyContact: student.emergencyContact || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().split('T')[0] : '',
      academicLevel: student.academicLevel || ''
    };
    
    debugLog('Returning profile data', profileData);
    
    // Return the student's profile data
    return NextResponse.json({
      success: true,
      profile: profileData
    });
  } catch (error) {
    debugLog('Unhandled error in profile API', error);
    return NextResponse.json(
      { error: 'Failed to fetch student profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
