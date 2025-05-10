import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    console.log('Session in admin review API:', session ? 'Session exists' : 'No session');

    // Check if user is authenticated
    if (!session || !session.user) {
      console.log('No authenticated session found in admin review API');
      return NextResponse.json(
        { error: 'You must be logged in to review enrollment applications.' },
        { status: 401 }
      );
    }
    
    // Check if user is an admin
    if (session.user.role !== 'ADMIN') {
      console.log('User is not an admin:', session.user.role);
      return NextResponse.json(
        { error: 'Unauthorized. Only administrators can review enrollment applications.' },
        { status: 403 }
      );
    }

    // Parse the request body
    const { enrollmentId, action, comment } = await req.json();

    if (!enrollmentId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action. Must be either "approve" or "reject".' },
        { status: 400 }
      );
    }

    // Find the enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
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
        class: {
          select: {
            name: true,
            capacity: true,
            enrollments: {
              where: {
                status: { in: ['enrolled', 'completed'] }
              },
              select: { id: true }
            }
          }
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found.' },
        { status: 404 }
      );
    }

    if (enrollment.status !== 'pending') {
      return NextResponse.json(
        { error: 'This enrollment has already been processed.' },
        { status: 400 }
      );
    }

    // If approving, check if the class still has available seats
    if (action === 'approve') {
      const enrolledCount = enrollment.class.enrollments.length;
      if (enrolledCount >= enrollment.class.capacity) {
        return NextResponse.json(
          { error: 'This class is now full. The enrollment cannot be approved.' },
          { status: 400 }
        );
      }
    }

    // Update the enrollment status based on the action
    const newStatus = action === 'approve' ? 'enrolled' : 'rejected';
    
    // Parse the existing notes if available
    let notesObj = {};
    if (enrollment.notes) {
      try {
        notesObj = JSON.parse(enrollment.notes);
      } catch (e) {
        console.error('Failed to parse enrollment notes:', e);
      }
    }
    
    // Add the review details to the notes
    const updatedNotes = JSON.stringify({
      ...notesObj,
      reviewedBy: session.user.id,
      reviewedAt: new Date().toISOString(),
      reviewComment: comment || '',
      reviewAction: action
    });

    // Update the enrollment
    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: newStatus,
        notes: updatedNotes
      }
    });

    // Send notification to the student
    const notificationTitle = action === 'approve' 
      ? 'Enrollment Approved' 
      : 'Enrollment Application Rejected';
    
    const notificationContent = action === 'approve'
      ? `Your enrollment in ${enrollment.class.name} has been approved. Welcome to the class!`
      : `Your enrollment application for ${enrollment.class.name} has been rejected. ${comment ? `Reason: ${comment}` : 'Please contact administration for more information.'}`;

    await prisma.announcement.create({
      data: {
        title: notificationTitle,
        content: notificationContent,
        authorId: session.user.id,
        targetAudience: 'student',
        isPublished: true,
        // Include any other required fields from the schema
      }
    });

    return NextResponse.json({
      success: true,
      message: action === 'approve' 
        ? 'Enrollment has been approved successfully.' 
        : 'Enrollment has been rejected.',
      enrollment: {
        id: updatedEnrollment.id,
        status: updatedEnrollment.status
      }
    });
  } catch (error) {
    console.error('Error processing enrollment review:', error);
    return NextResponse.json(
      { error: 'Failed to process enrollment review' },
      { status: 500 }
    );
  }
}
