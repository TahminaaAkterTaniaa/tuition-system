import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const enrollmentData = await request.json();
    console.log('Received enrollment data:', JSON.stringify(enrollmentData));

    // Validate required fields
    if (
      !enrollmentData.userId ||
      !enrollmentData.classId ||
      !enrollmentData.fullName ||
      !enrollmentData.email
    ) {
      return NextResponse.json(
        { error: 'Missing required enrollment information' },
        { status: 400 }
      );
    }

    // Get class details
    let className = 'Unknown Class';
    try {
      const classDetails = await prisma.class.findUnique({
        where: { id: enrollmentData.classId },
        select: { name: true }
      });
      if (classDetails) {
        className = classDetails.name;
      }
    } catch (err) {
      console.error('Error fetching class details:', err);
      // Continue with default class name
    }
    
    // Create a simplified enrollment request
    const enrollmentRequest = await prisma.enrollmentRequest.create({
      data: {
        student: { connect: { userId: enrollmentData.userId } },
        class: { connect: { id: enrollmentData.classId } },
        notes: enrollmentData.additionalNotes || '',
        status: 'pending'
      }
    });
    
    // Safely extract document URLs with error handling
    const getDocUrl = (doc: any) => {
      try {
        return doc?.url || null;
      } catch (e) {
        return null;
      }
    };

    const getDocId = (doc: any) => {
      try {
        return doc?.blobId || null;
      } catch (e) {
        return null;
      }
    };
    
    // Log activity with safer data handling
    await prisma.activityLog.create({
      data: {
        userId: enrollmentData.userId,
        action: 'ENROLLMENT_REQUESTED',
        entityId: enrollmentRequest.id,
        entityType: 'ENROLLMENT_REQUEST',
        description: `Requested enrollment for class ${className}`,
        metadata: JSON.stringify({
          fullName: enrollmentData.fullName,
          email: enrollmentData.email,
          phone: enrollmentData.phone || '',
          idNumber: enrollmentData.idNumber || '',
          emergencyContact: enrollmentData.emergencyContact || '',
          idDocumentUrl: getDocUrl(enrollmentData.documents?.idDocument),
          transcriptUrl: getDocUrl(enrollmentData.documents?.transcript)
        })
      }
    });
    
    // Create admin notification with simpler data
    try {
      const adminId = await getAdminUserId();
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          userId: adminId,
          title: 'New Enrollment Request',
          message: `${enrollmentData.fullName} requested enrollment in ${className}`,
          type: 'ENROLLMENT_REQUEST',
          relatedId: enrollmentRequest.id,
          updatedAt: new Date()
        }
      });
    } catch (notifError) {
      console.error('Error creating notification (non-fatal):', notifError);
      // Continue execution - notification is not critical
    }

    // Return success response
    return NextResponse.json({
      success: true,
      enrollmentRequestId: enrollmentRequest.id,
      message: 'Enrollment request submitted successfully and awaiting admin approval',
    });
  } catch (error) {
    console.error('Error creating enrollment request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create enrollment request' },
      { status: 500 }
    );
  }
}

// Helper function to get an admin user ID for notifications
async function getAdminUserId(): Promise<string> {
  // Find an admin user to send the notification to
  const adminUser = await prisma.user.findFirst({
    where: {
      role: 'ADMIN',
      isActive: true
    }
  });
  
  if (!adminUser) {
    throw new Error('No admin user found to send notification');
  }
  
  return adminUser.id;
}
