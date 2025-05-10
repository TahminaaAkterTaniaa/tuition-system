import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
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

    // Create directory for uploads if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', student.id, enrollment.id);
    await mkdir(uploadDir, { recursive: true });

    // Save the ID document
    const idDocumentBuffer = Buffer.from(await idDocument.arrayBuffer());
    const idDocumentPath = path.join(uploadDir, `id-document-${Date.now()}-${idDocument.name}`);
    await writeFile(idDocumentPath, idDocumentBuffer);

    // Save the transcript if provided
    let transcriptPath = null;
    if (transcript) {
      const transcriptBuffer = Buffer.from(await transcript.arrayBuffer());
      transcriptPath = path.join(uploadDir, `transcript-${Date.now()}-${transcript.name}`);
      await writeFile(transcriptPath, transcriptBuffer);
    }

    // Update the enrollment with application details
    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        notes: JSON.stringify({
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
