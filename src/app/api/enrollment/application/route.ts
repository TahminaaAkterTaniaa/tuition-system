import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';

export async function POST(req: NextRequest) {
  try {
    console.log('Application submission received');

    // Parse the form data
    const formData = await req.formData();
    const classId = formData.get('classId') as string;
    const userId = formData.get('userId') as string; // Get userId from form data
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const idNumber = formData.get('idNumber') as string;
    const emergencyContact = formData.get('emergencyContact') as string;
    const additionalNotes = formData.get('additionalNotes') as string;
    const idDocument = formData.get('idDocument') as File;
    const transcript = formData.get('transcript') as File | null;

    if (!classId || !fullName || !email || !phone || !idNumber || !emergencyContact || !idDocument) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    console.log('Using user ID for application:', userId);

    // Get the student's ID
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student profile not found.' },
        { status: 404 }
      );
    }

    // Find the enrollment record
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        classId,
        status: 'pending'
      }
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment record not found. Please enroll in the class first.' },
        { status: 404 }
      );
    }

    console.log('Creating enrollment application for student ID:', student.id, 'enrollment ID:', enrollment.id);
    
    // Instead of saving files to disk, store file info in the database
    // This avoids file system permission issues in development environments
    let idDocumentInfo = {
      name: idDocument.name,
      type: idDocument.type,
      size: idDocument.size
    };
    
    console.log('ID document info:', idDocumentInfo);
    
    // For development purposes, we'll skip actual file saving
    // In production, you would implement proper file storage
    let idDocumentPath = `virtual-path/id-document-${Date.now()}-${idDocument.name}`;
    console.log('Using virtual path for ID document:', idDocumentPath);

    // Handle transcript info if provided
    let transcriptPath = null;
    if (transcript) {
      // Store transcript info instead of saving the file
      let transcriptInfo = {
        name: transcript.name,
        type: transcript.type,
        size: transcript.size
      };
      
      console.log('Transcript info:', transcriptInfo);
      
      // Use a virtual path for the transcript
      transcriptPath = `virtual-path/transcript-${Date.now()}-${transcript.name}`;
      console.log('Using virtual path for transcript:', transcriptPath);
    }

    // Update the enrollment with application details
    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        // Add a custom field to the notes to track application submission
        notes: JSON.stringify({
          applicationSubmitted: true, // Mark that the application has been submitted
          fullName,
          email,
          phone,
          idNumber,
          emergencyContact,
          additionalNotes,
          idDocumentPath: idDocumentPath.replace(process.cwd(), ''),
          transcriptPath: transcriptPath ? transcriptPath.replace(process.cwd(), '') : null,
          submittedAt: new Date().toISOString()
        })
      }
    });
    
    console.log('Enrollment updated with application details:', updatedEnrollment.id);

    // Create a notification for admin review
    await prisma.announcement.create({
      data: {
        title: 'New Enrollment Application',
        content: `A new enrollment application has been submitted by ${fullName} for review.`,
        authorId: userId, // Use the user ID from the form data
        targetAudience: 'admin', // Only visible to admins
        isPublished: true, // Publish immediately
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully. An administrator will review your application.',
      enrollmentId: enrollment.id
    });
  } catch (error) {
    console.error('Error processing enrollment application:', error);
    return NextResponse.json(
      { error: 'Failed to process enrollment application' },
      { status: 500 }
    );
  }
}
