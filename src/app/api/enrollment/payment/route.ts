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

    // Find the enrollment
    const enrollment = await prisma.enrollment.findFirst({
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

    if (!enrollment) {
      console.log('Enrollment not found:', enrollmentId);
      return NextResponse.json(
        { error: 'Enrollment record not found.' },
        { status: 404 }
      );
    }

    console.log('Enrollment found:', enrollment.id);

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

    // Update the enrollment status to 'enrolled' and add payment information
    console.log('Updating enrollment status to enrolled for enrollment ID:', enrollment.id);
    
    let updatedEnrollment;
    try {
      updatedEnrollment = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'enrolled',
          paymentId: mockPayment.id,
          paymentStatus: 'paid',
          paymentDate: new Date(),
          notes: JSON.stringify({
            transactionId,
            paymentMethod: paymentMethod || 'Development Mode',
            amount: mockPayment.amount,
            developmentMode: true
          })
        }
      });
      
      console.log('Successfully updated enrollment status to enrolled with payment information:', updatedEnrollment);
    } catch (error) {
      console.error('Error updating enrollment status:', error);
      throw error;
    }

    console.log('Enrollment updated to enrolled:', updatedEnrollment.id);

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
      className: enrollment.class.name,
      amount,
      paymentMethod: paymentMethod === 'credit_card' ? 'Credit Card' : 'PayPal',
      status: 'Paid'
    };

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully. You are now enrolled in the class.',
      receipt,
      enrollmentId,
      paymentId: mockPayment.id
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
