'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import EnrollmentForm from '@/components/EnrollmentForm';
import PaymentForm from '@/components/PaymentForm';
import EnrollmentReceipt from '@/components/EnrollmentReceipt';

interface ClassDetails {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  schedule: string | null;
  room: string | null;
  capacity: number;
  availableSeats: number;
  isFull: boolean;
  teacher: {
    user: {
      name: string | null;
    } | null;
  } | null;
  enrollmentStatus: string | null;
}

interface PaymentData {
  success: boolean;
  message: string;
  receipt: {
    receiptNumber: string;
    transactionId: string;
    date: string;
    studentName: string;
    className: string;
    amount: number;
    paymentMethod: string;
    status: string;
  };
  enrollmentId: string;
  paymentId: string;
}

enum EnrollmentStep {
  LOADING,
  CLASS_DETAILS,
  APPLICATION_FORM,
  PAYMENT,
  CONFIRMATION,
  ERROR
}

export default function EnrollPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  
  const [currentStep, setCurrentStep] = useState<EnrollmentStep>(EnrollmentStep.LOADING);
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/classes/enroll/${classId}`);
      return;
    }

    if (session?.user.role !== 'STUDENT') {
      setError('Only students can enroll in classes');
      setCurrentStep(EnrollmentStep.ERROR);
      return;
    }

    fetchClassDetails();
  }, [session, status, router, classId]);

  const fetchClassDetails = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}`);
      
      if (!response.ok) {
        let errorMessage = 'Failed to fetch class details';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // If we can't parse the error response, use the default message
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setClassDetails(data);
      console.log('Class details with enrollment status:', data);
      
      // Check if the class is available for enrollment
      if (data.isFull) {
        setError('This class is full. No more seats available.');
        setCurrentStep(EnrollmentStep.ERROR);
        return;
      }
      
      if (data.status !== 'active') {
        setError('This class is not currently accepting enrollments.');
        setCurrentStep(EnrollmentStep.ERROR);
        return;
      }
      
      // Check enrollment status and direct to appropriate step
      if (data.enrollmentStatus) {
        console.log('User has enrollment status:', data.enrollmentStatus);
        
        if (data.enrollmentStatus === 'enrolled' || data.enrollmentStatus === 'completed') {
          setError('You are already enrolled in this class.');
          setCurrentStep(EnrollmentStep.ERROR);
          return;
        }
        
        if (data.enrollmentStatus === 'pending') {
          // Get the enrollment ID for the pending enrollment
          const pendingEnrollmentResponse = await fetch(`/api/student/enrollments?classId=${classId}`);
          if (pendingEnrollmentResponse.ok) {
            interface Enrollment {
              id: string;
              status: string;
              classId: string;
              applicationSubmitted?: boolean;
            }
            
            const enrollments = await pendingEnrollmentResponse.json() as Enrollment[];
            const pendingEnrollment = enrollments.find((e: Enrollment) => e.status === 'pending' && e.classId === classId);
            
            if (pendingEnrollment) {
              console.log('Found pending enrollment:', pendingEnrollment);
              setEnrollmentId(pendingEnrollment.id);
              
              // Check if application is submitted
              if (pendingEnrollment.applicationSubmitted) {
                console.log('Application already submitted, directing to payment step');
                setCurrentStep(EnrollmentStep.PAYMENT);
                return;
              }
            }
          }
          
          // If we couldn't find the enrollment or application status, start at application form
          console.log('Directing user to application form for pending enrollment');
          setCurrentStep(EnrollmentStep.APPLICATION_FORM);
          return;
        }
      }
      
      // No enrollment status, start from the beginning
      setCurrentStep(EnrollmentStep.CLASS_DETAILS);
    } catch (err) {
      console.error('Error fetching class details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch class details');
      setCurrentStep(EnrollmentStep.ERROR);
    }
  };

  const handleStartEnrollment = () => {
    setCurrentStep(EnrollmentStep.APPLICATION_FORM);
  };

  const handleApplicationSubmit = (enrollmentId: string) => {
    setEnrollmentId(enrollmentId);
    setCurrentStep(EnrollmentStep.PAYMENT);
  };

  const handlePaymentSuccess = (paymentData: PaymentData) => {
    console.log('Payment successful:', paymentData);
    
    // Make sure we have the receipt data
    if (paymentData && paymentData.receipt) {
      setReceipt(paymentData.receipt);
      setCurrentStep(EnrollmentStep.CONFIRMATION);
      console.log('Setting current step to CONFIRMATION');
    } else {
      console.error('Missing receipt data in payment response');
      toast.error('Something went wrong with the payment confirmation');
    }
  };

  // Render different content based on the current step
  const renderContent = () => {
    switch (currentStep) {
      case EnrollmentStep.LOADING:
        return (
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        );
        
      case EnrollmentStep.CLASS_DETAILS:
        if (!classDetails) return null;
        
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6 text-center text-indigo-700">
              Class Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-medium mb-2">About the Class</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="font-medium text-lg mb-1">{classDetails.name}</p>
                  <p className="text-gray-600 mb-3">{classDetails.subject}</p>
                  <p className="text-gray-700">{classDetails.description}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Class Information</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="mb-2">
                    <span className="font-medium">Schedule:</span> {classDetails.schedule || 'Not specified'}
                  </div>
                  <div className="mb-2">
                    <span className="font-medium">Room:</span> {classDetails.room || 'Not assigned'}
                  </div>
                  <div className="mb-2">
                    <span className="font-medium">Teacher:</span> {classDetails.teacher?.user?.name || 'Not assigned'}
                  </div>
                  <div className="mb-2">
                    <span className="font-medium">Available Seats:</span> {classDetails.availableSeats} of {classDetails.capacity}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <Link href="/classes" className="text-indigo-600 hover:text-indigo-800">
                ← Back to Classes
              </Link>
              
              <button
                onClick={handleStartEnrollment}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Start Enrollment Process
              </button>
            </div>
          </div>
        );
        
      case EnrollmentStep.APPLICATION_FORM:
        if (!classDetails) return null;
        
        return (
          <EnrollmentForm
            classId={classId}
            className={classDetails.name}
            onSuccess={handleApplicationSubmit}
            userId={session?.user?.id || ''}
          />
        );
        
      case EnrollmentStep.PAYMENT:
        if (!classDetails || !enrollmentId) return null;
        
        return (
          <PaymentForm
            enrollmentId={enrollmentId}
            classId={classId}
            className={classDetails.name}
            amount={99.99} // In a real app, this would come from the class details or a pricing API
            onSuccess={(paymentData: PaymentData) => handlePaymentSuccess(paymentData)}
            userId={session?.user?.id || ''}
          />
        );
        
      case EnrollmentStep.CONFIRMATION:
        console.log('Rendering confirmation step with receipt:', receipt);
        if (!receipt) {
          console.error('Receipt data is missing');
          return (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h2 className="text-2xl font-bold mb-2 text-gray-800">Processing Payment</h2>
              <p className="text-gray-600 mb-6">Your payment is being processed...</p>
            </div>
          );
        }
        
        return (
          <EnrollmentReceipt
            enrollmentId={enrollmentId!}
            receipt={receipt}
          />
        );
        
      case EnrollmentStep.ERROR:
        return (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Enrollment Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/classes"
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 inline-block"
            >
              Back to Classes
            </Link>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Enrollment Steps Progress */}
        {currentStep !== EnrollmentStep.ERROR && currentStep !== EnrollmentStep.LOADING && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= EnrollmentStep.CLASS_DETAILS ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  1
                </div>
                <span className="text-sm mt-1">Details</span>
              </div>
              
              <div className={`flex-1 h-1 mx-2 ${
                currentStep >= EnrollmentStep.APPLICATION_FORM ? 'bg-indigo-600' : 'bg-gray-200'
              }`}></div>
              
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= EnrollmentStep.APPLICATION_FORM ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  2
                </div>
                <span className="text-sm mt-1">Application</span>
              </div>
              
              <div className={`flex-1 h-1 mx-2 ${
                currentStep >= EnrollmentStep.PAYMENT ? 'bg-indigo-600' : 'bg-gray-200'
              }`}></div>
              
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= EnrollmentStep.PAYMENT ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  3
                </div>
                <span className="text-sm mt-1">Payment</span>
              </div>
              
              <div className={`flex-1 h-1 mx-2 ${
                currentStep >= EnrollmentStep.CONFIRMATION ? 'bg-indigo-600' : 'bg-gray-200'
              }`}></div>
              
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= EnrollmentStep.CONFIRMATION ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  4
                </div>
                <span className="text-sm mt-1">Confirmation</span>
              </div>
            </div>
          </div>
        )}
        
        {renderContent()}
      </div>
    </div>
  );
}
