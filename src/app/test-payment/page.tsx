'use client';

import { useState } from 'react';
import PaymentForm from '@/components/PaymentForm';

export default function TestPaymentPage() {
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  const handlePaymentSuccess = (data: any) => {
    console.log('Payment success:', data);
    setPaymentData(data);
    setPaymentSuccess(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Test Payment Form</h1>
      
      {!paymentSuccess ? (
        <PaymentForm
          enrollmentId="test-enrollment-id"
          classId="test-class-id"
          className="Test Class"
          amount={99.99}
          onSuccess={handlePaymentSuccess}
          userId="test-user-id"
        />
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-2xl font-bold mb-2 text-green-600">Payment Successful!</h2>
          <pre className="bg-gray-100 p-4 rounded mt-4 text-left overflow-auto">
            {JSON.stringify(paymentData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
