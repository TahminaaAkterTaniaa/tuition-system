'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import EnrollmentForm from '@/components/EnrollmentForm';
// Temporarily use an inline PaymentForm to bypass import issues
// import PaymentForm from '../../../../components/PaymentForm';
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
  fee: number; // Added fee property for class-specific enrollment fee
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

// Temporary inline payment form component to bypass import issues
function TempPaymentForm({ enrollmentId, classId, className, amount, onSuccess, userId }: {
  enrollmentId: string;
  classId: string;
  className: string;
  amount: number;
  onSuccess: (paymentData: any) => void;
  userId: string;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryDate: '',
    cvv: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  console.log('TempPaymentForm rendering with props:', { enrollmentId, classId, className, amount });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardDetails(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (paymentMethod === 'credit_card') {
      if (!cardDetails.cardNumber) {
        newErrors.cardNumber = 'Card number is required';
      } else if (!/^\d{13,19}$/.test(cardDetails.cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = 'Invalid card number';
      }
      
      if (!cardDetails.cardholderName) {
        newErrors.cardholderName = 'Cardholder name is required';
      }
      
      if (!cardDetails.expiryDate) {
        newErrors.expiryDate = 'Expiry date is required';
      } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardDetails.expiryDate)) {
        newErrors.expiryDate = 'Invalid format (MM/YY)';
      }
      
      if (!cardDetails.cvv) {
        newErrors.cvv = 'CVV is required';
      } else if (!/^\d{3,4}$/.test(cardDetails.cvv)) {
        newErrors.cvv = 'Invalid CVV';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsProcessing(true);
    console.log('Processing payment for enrollment:', enrollmentId);
    
    try {
      // In development mode, we'll just send the basic information needed
      const paymentData = {
        enrollmentId,
        classId,
        amount,
        paymentMethod,
        userId,
        ...(paymentMethod === 'credit_card' ? {
          cardDetails: {
            // Only send last 4 digits for security
            cardNumberLast4: cardDetails.cardNumber.slice(-4),
            cardholderName: cardDetails.cardholderName,
            expiryDate: cardDetails.expiryDate
          }
        } : {})
      };
      
      const response = await fetch('/api/enrollment/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to process payment');
      }
      
      toast.success('Payment processed successfully!');
      onSuccess(responseData);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center text-indigo-700">
        Complete Your Enrollment
      </h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Payment Summary</h3>
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Class:</span>
            <span className="font-medium">{className}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Enrollment Fee:</span>
            <span className="font-medium">${amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
            <span className="text-gray-800 font-medium">Total:</span>
            <span className="text-indigo-700 font-bold">${amount.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Payment Method</h3>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => setPaymentMethod('credit_card')}
            className={`flex-1 py-2 px-4 rounded-md ${paymentMethod === 'credit_card' ? 'bg-indigo-100 border-indigo-500 text-indigo-700 border-2' : 'bg-gray-100 border-gray-300 text-gray-700 border'}`}
          >
            Credit Card
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('paypal')}
            className={`flex-1 py-2 px-4 rounded-md ${paymentMethod === 'paypal' ? 'bg-blue-100 border-blue-500 text-blue-700 border-2' : 'bg-gray-100 border-gray-300 text-gray-700 border'}`}
          >
            PayPal
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {paymentMethod === 'credit_card' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Card Number
              </label>
              <input
                type="text"
                id="cardNumber"
                name="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardDetails.cardNumber}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border ${errors.cardNumber ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
              />
              {errors.cardNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                id="cardholderName"
                name="cardholderName"
                placeholder="John Doe"
                value={cardDetails.cardholderName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border ${errors.cardholderName ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
              />
              {errors.cardholderName && (
                <p className="text-red-500 text-xs mt-1">{errors.cardholderName}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="text"
                  id="expiryDate"
                  name="expiryDate"
                  placeholder="MM/YY"
                  value={cardDetails.expiryDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${errors.expiryDate ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                />
                {errors.expiryDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                  CVV
                </label>
                <input
                  type="text"
                  id="cvv"
                  name="cvv"
                  placeholder="123"
                  value={cardDetails.cvv}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${errors.cvv ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                />
                {errors.cvv && (
                  <p className="text-red-500 text-xs mt-1">{errors.cvv}</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-6">
          <button
            type="submit"
            disabled={isProcessing}
            className={`w-full py-3 px-4 ${isProcessing ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            {isProcessing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
          </button>
        </div>
      </form>
    </div>
  );
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
    console.log('Enrollment page mount/update effect. Auth status:', status);
    
    if (status === 'loading') {
      console.log('Auth is still loading...');
      return;
    }

    if (status === 'unauthenticated') {
      console.log('User is not authenticated, redirecting to login');
      router.push(`/login?callbackUrl=/classes/enroll/${classId}`);
      return;
    }

    if (session?.user.role !== 'STUDENT') {
      console.log('User is not a student, showing error');
      setError('Only students can enroll in classes');
      setCurrentStep(EnrollmentStep.ERROR);
      return;
    }

    console.log('User is authenticated as student, fetching class details');
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
      
      // Allow classes with either 'active' or 'Approved' status for enrollment
      if (data.status !== 'active' && data.status !== 'Approved') {
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
    console.log('Application submitted successfully, enrollment ID:', enrollmentId);
    setEnrollmentId(enrollmentId);
    console.log('Setting current step to PAYMENT');
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
    console.log('renderContent called with:', { 
      currentStep: EnrollmentStep[currentStep], 
      enrollmentId,
      classDetails: classDetails ? `${classDetails.name} (fee: ${classDetails.fee})` : 'null',
      userId: session?.user?.id
    });
    
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
                  <div className="mb-2">
                    <span className="font-medium">Enrollment Fee:</span> ${classDetails.fee.toFixed(2)}
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
        console.log('PAYMENT STEP RENDERING ATTEMPT - Details:', { 
          enrollmentId, 
          classId,
          className: classDetails?.name,
          fee: classDetails?.fee,
          userId: session?.user?.id 
        });
        
        if (!classDetails) {
          console.error('Missing classDetails for payment step');
          return <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            Loading class details...
          </div>;
        }
        
        if (!enrollmentId) {
          console.error('Missing enrollmentId for payment step');
          return <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            Missing enrollment ID. Please try again.
          </div>;
        }
        
        console.log('All data present for PaymentForm! Rendering with fee:', classDetails.fee);
        
        // Use an inline temporary payment form component to bypass any import issues
        return (
          <div className="max-w-md mx-auto">
            <TempPaymentForm
              enrollmentId={enrollmentId}
              classId={classId}
              className={classDetails.name}
              amount={classDetails.fee}
              onSuccess={(paymentData: PaymentData) => handlePaymentSuccess(paymentData)}
              userId={session?.user?.id || ''}
            />
          </div>
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
