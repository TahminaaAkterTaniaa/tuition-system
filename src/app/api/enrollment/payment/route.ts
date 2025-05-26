import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// In a real application, you would import Stripe or another payment processor here
// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export async function POST(req: NextRequest) {
  try {
    console.log('Payment request received - Development mode: auto-approving payment');

    // Parse the request body
    const { enrollmentId, classId, amount, paymentMethod, userId } = await req.json();

    console.log('Payment details:', { enrollmentId, classId, amount, paymentMethod, userId });

    // Basic validation
    if (!enrollmentId || !classId || !userId) {
      return NextResponse.json(
        { error: 'Missing required information' },
        { status: 400 }
      );
    }
    
    // Get the student's ID
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!student) {
      console.log('Student not found for userId:', userId);
      return NextResponse.json(
        { error: 'Student profile not found.' },
        { status: 404 }
      );
    }

    // Check if this is an enrollment request (admin approval workflow) or a regular enrollment
    let enrollment;
    let enrollmentRequest;
    let recordType = '';
    
    // First, try to find a regular enrollment
    enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        classId
      },
      include: {
        class: {
          select: {
            name: true
          }
        }
      }
    });
    
    if (enrollment) {
      console.log('Regular enrollment found:', enrollment.id);
      recordType = 'enrollment';
    } else {
      // If no regular enrollment found, check for an enrollment request
      enrollmentRequest = await prisma.enrollmentRequest.findFirst({
        where: {
          id: enrollmentId,
          classId
        },
        include: {
          class: {
            select: {
              name: true
            }
          }
        }
      });
      
      if (enrollmentRequest) {
        console.log('Enrollment request found:', enrollmentRequest.id);
        recordType = 'enrollmentRequest';
      } else {
        console.log('Neither enrollment nor enrollment request found for ID:', enrollmentId);
        return NextResponse.json(
          { error: 'No enrollment record found.' },
          { status: 404 }
        );
      }
    }
    
    // Get the class name (works for both enrollment and enrollment request)
    const className = enrollment?.class?.name || enrollmentRequest?.class?.name;

    // In development mode, we'll skip payment verification
    // Generate a mock transaction ID
    const transactionId = `txn_dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    console.log('Generated transaction ID:', transactionId);

    // Get the class fee from the database
    const classDetails = await prisma.class.findUnique({
      where: { id: classId },
      select: { fee: true, name: true }
    });

    if (!classDetails) {
      return NextResponse.json(
        { error: 'Class details not found.' },
        { status: 404 }
      );
    }

    // In development mode, we'll create a mock payment without using the Payment model
    // This avoids issues with the parentId foreign key constraint
    const mockPayment = {
      id: `pay_dev_${Date.now()}`,
      amount: amount || classDetails.fee, // Use the class-specific fee from the database
      currency: 'USD',
      description: `Enrollment fee for ${classDetails.name}`,
      invoiceNumber: `INV-DEV-${Date.now()}`,
      paymentDate: new Date(),
      status: 'paid',
      paymentMethod: paymentMethod || 'Development Mode',
      transactionId
    };
    
    console.log('Mock payment created:', mockPayment.id);

    // The payment details to save
    const paymentDetails = JSON.stringify({
      transactionId,
      paymentMethod: paymentMethod || 'Development Mode',
      amount: mockPayment.amount,
      developmentMode: true,
      paymentDate: new Date().toISOString()
    });
    
    // Record the payment information regardless of record type
    let finalEnrollmentId = enrollmentId;
    let paymentStatus = 'pending_approval';
    
    try {
      if (recordType === 'enrollment' && enrollment) {
        // For regular enrollment, update with payment info but don't change status yet
        console.log('Recording payment for enrollment ID:', enrollment.id);
        
        const updatedEnrollment = await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            paymentId: mockPayment.id,
            paymentStatus: paymentStatus,
            paymentDate: new Date(),
            notes: paymentDetails
          }
        });
        
        console.log('Successfully recorded payment for enrollment:', updatedEnrollment.id);
        finalEnrollmentId = updatedEnrollment.id;
      } 
      else if (recordType === 'enrollmentRequest' && enrollmentRequest) {
        // For enrollment request, record payment info but don't approve it yet
        console.log('Recording payment for enrollment request ID:', enrollmentRequest.id);
        
        // Update the enrollment request with payment details
        const updatedRequest = await prisma.enrollmentRequest.update({
          where: { id: enrollmentRequest.id },
          data: {
            // Don't change status - admin will approve it
            notes: JSON.stringify({
              ...JSON.parse(enrollmentRequest.notes || '{}'),
              paymentId: mockPayment.id,
              paymentStatus: paymentStatus,
              paymentDate: new Date(),
              transactionId,
              paymentMethod: paymentMethod || 'Development Mode',
              amount: mockPayment.amount
            })
          }
        });
        
        console.log('Payment recorded for enrollment request:', updatedRequest.id);
        finalEnrollmentId = updatedRequest.id;
      } else {
        console.error('Invalid record type or missing enrollment data');
        throw new Error('Unable to record payment - invalid enrollment record');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }

    // Get student name from the database instead of session
    const studentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    // Generate a receipt
    const receipt = {
      receiptNumber: `RCPT-${Date.now()}`,
      transactionId,
      date: new Date().toISOString(),
      studentName: studentUser?.name || 'Student',
      className: className || classDetails.name, // Use className from earlier or fallback to classDetails
      amount,
      paymentMethod: paymentMethod === 'credit_card' ? 'Credit Card' : 'PayPal',
      status: 'Paid'
    };
    
    // Create a notification for the admin
    try {
      // Include payment details in the notification content
      const paymentInfo = `Payment Amount: ${amount}, Transaction ID: ${transactionId}`;
      
      // Create an announcement for admin notification
      await prisma.announcement.create({
        data: {
          title: 'New Enrollment Payment',
          content: `A payment has been processed for ${receipt.studentName}'s enrollment in ${receipt.className}. ${paymentInfo}`,
          authorId: userId,
          targetAudience: 'admin', // Only visible to admins
          isPublished: true
        }
      });
      
      console.log('Admin notification created for payment');
      
      // Create an admin notification for enrollment payment approval
      try {
        // Create a detailed information string with all payment details
        const detailedInfo = `
Payment details:
- Amount: $${amount}
- Transaction ID: ${transactionId}
- Class: ${receipt.className}
- Student: ${receipt.studentName}
- Payment processed on: ${new Date().toLocaleString()}`;
        
        const recordTypeText = recordType === 'enrollmentRequest' ? 'enrollment request' : 'enrollment';
        
        // Create an announcement for all admins with approval instructions
        await prisma.announcement.create({
          data: {
            title: '💰 Payment Pending Approval',
            content: `A payment has been received for a student ${recordTypeText} and requires admin approval. Please review and approve this enrollment to complete the process.${detailedInfo}`,
            authorId: userId,
            targetAudience: 'admin',
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.log('Payment approval notification created for admins');
      } catch (err) {
        console.error('Error creating payment notification:', err);
        // Continue even if notification creation fails
      }
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Continue even if notification creation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully. Your enrollment is now pending admin approval.',
      receipt,
      enrollmentId: finalEnrollmentId || enrollmentId,
      paymentId: mockPayment.id,
      status: 'pending_approval'
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Failed to process payment';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific error conditions
      if (error.message.includes('not found') || error.message.includes('invalid')) {
        statusCode = 404;
      } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        statusCode = 403;
      } else if (error.message.includes('Invalid record type')) {
        statusCode = 400;
      }
    }
    
    console.log(`Returning error response: ${errorMessage} (${statusCode})`);
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: String(error),
        success: false
      },
      { status: statusCode }
    );
  }
}
