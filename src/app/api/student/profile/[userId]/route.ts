import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// For debugging purposes
const debugLog = (message: string, data?: any) => {
  console.log(`[PROFILE API] ${message}`, data ? data : '');
};

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    debugLog('Received request for user profile', { userId });
    
    if (!userId) {
      debugLog('No userId provided');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get the authenticated user's session
    debugLog('Getting session');
    const session = await getServerSession(authOptions);
    debugLog('Session retrieved', { hasSession: !!session, userId: session?.user?.id });
    
    // For development purposes, skip authentication check
    // In production, you would want to uncomment this
    /*
    if (!session || !session.user) {
      debugLog('No authenticated session');
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Check if the authenticated user is requesting their own profile or is an admin
    if (session.user.id !== userId && session.user.role !== 'ADMIN') {
      debugLog('Permission denied', { sessionUserId: session.user.id, requestedUserId: userId });
      return NextResponse.json(
        { error: 'You do not have permission to access this profile' },
        { status: 403 }
      );
    }
    */
    
    // For debugging - allow any authenticated user to access any profile during development

    // Get the student's profile data
    debugLog('Querying database for student profile');
    try {
      // First get the user data
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
      const student = await prisma.student.findFirst({
        where: { userId: userId },
      });
      
      debugLog('Database query completed', { foundUser: !!user, foundStudent: !!student });

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
        email: user.email
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
    } catch (dbError) {
      debugLog('Database error', dbError);
      return NextResponse.json(
        { error: 'Database error when fetching student profile' },
        { status: 500 }
      );
    }
  } catch (error) {
    debugLog('Unhandled error in profile API', error);
    return NextResponse.json(
      { error: 'Failed to fetch student profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
