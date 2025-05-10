'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface PaymentReceipt {
  receiptNumber: string;
  transactionId: string;
  date: string;
  studentName: string;
  className: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

interface PaymentResponse {
  success: boolean;
  message: string;
  receipt: PaymentReceipt;
  enrollmentId: string;
  paymentId: string;
}

interface PaymentFormProps {
  enrollmentId: string;
  classId: string;
  className: string;
  amount: number;
  onSuccess: (paymentData: PaymentResponse) => void;
  userId: string;
}

export default function PaymentForm({ enrollmentId, classId, className, amount, onSuccess, userId }: PaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'paypal'>('credit_card');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardDetails(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    console.log('Processing payment for enrollment:', enrollmentId);
    console.log('Payment details:', { classId, className, amount, paymentMethod, userId });

    try {
      // In development mode, we'll just send the basic information needed
      // and the backend will auto-approve the payment
      const paymentData = {
        enrollmentId,
        classId,
        amount,
        paymentMethod,
        userId,
      };
      
      console.log('Sending payment request with data:', paymentData);
      
      const response = await fetch('/api/enrollment/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(paymentData),
      });

      console.log('Payment response status:', response.status);
      
      const responseData = await response.json();
      console.log('Payment response data:', responseData);
      
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
        <div className="flex space-x-4 mb-4">
          <button
            type="button"
            onClick={() => setPaymentMethod('credit_card')}
            className={`flex-1 py-2 px-4 rounded-md ${
              paymentMethod === 'credit_card'
                ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}
          >
            Credit Card
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('paypal')}
            className={`flex-1 py-2 px-4 rounded-md ${
              paymentMethod === 'paypal'
                ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}
          >
            PayPal
          </button>
        </div>
      </div>

      {paymentMethod === 'credit_card' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Card Number
            </label>
            <input
              id="cardNumber"
              name="cardNumber"
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardDetails.cardNumber}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="cardHolder" className="block text-sm font-medium text-gray-700 mb-1">
              Card Holder Name
            </label>
            <input
              id="cardHolder"
              name="cardHolder"
              type="text"
              placeholder="John Doe"
              value={cardDetails.cardHolder}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                id="expiryDate"
                name="expiryDate"
                type="text"
                placeholder="MM/YY"
                value={cardDetails.expiryDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                CVV
              </label>
              <input
                id="cvv"
                name="cvv"
                type="text"
                placeholder="123"
                value={cardDetails.cvv}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
          
          <div className="mt-6">
            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full py-3 px-4 ${
                isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isProcessing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">You will be redirected to PayPal to complete your payment.</p>
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className={`py-3 px-6 ${
              isProcessing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {isProcessing ? 'Processing...' : 'Continue to PayPal'}
          </button>
        </div>
      )}
      
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Your payment is secure and encrypted.</p>
        <p className="mt-1">By proceeding with the payment, you agree to our terms and conditions.</p>
      </div>
    </div>
  );
}
