'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ReceiptProps {
  receiptNumber: string;
  transactionId: string;
  date: string;
  studentName: string;
  className: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

interface EnrollmentReceiptProps {
  enrollmentId: string;
  receipt: ReceiptProps;
}

export default function EnrollmentReceipt({ enrollmentId, receipt }: EnrollmentReceiptProps) {
  const router = useRouter();
  const [isPrinting, setIsPrinting] = useState(false);
  const [countdown, setCountdown] = useState(4);
  
  // Redirect to dashboard after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/student');
    }, 4000);
    
    // Update countdown every second
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
    };
  }, [router]);

  const handlePrint = () => {
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 500);
  };

  const handleDownloadPDF = () => {
    // In a real implementation, this would generate a PDF
    // For this demo, we'll just show an alert
    alert('PDF download functionality would be implemented here');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto print:shadow-none print:p-0">
      <div className="text-center mb-8 print:mb-4">
        <h2 className="text-2xl font-bold text-indigo-700 print:text-black">Enrollment Confirmation</h2>
        <p className="text-gray-600">Thank you for your enrollment!</p>
        <p className="text-sm text-indigo-600 mt-2">Redirecting to dashboard in {countdown} seconds...</p>
      </div>

      <div className="border-t border-b border-gray-200 py-6 mb-6 print:py-4 print:mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium">Payment Receipt</h3>
            <p className="text-gray-600 text-sm">Receipt #{receipt.receiptNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600 text-sm">Date: {new Date(receipt.date).toLocaleDateString()}</p>
            <p className="text-gray-600 text-sm">Transaction ID: {receipt.transactionId}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Student Name:</p>
            <p className="font-medium">{receipt.studentName}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Class:</p>
            <p className="font-medium">{receipt.className}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 print:mb-4">
        <h3 className="text-lg font-medium mb-3">Payment Details</h3>
        <div className="bg-gray-50 p-4 rounded-md print:bg-white print:p-0 print:border print:border-gray-300">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Payment Method:</span>
            <span className="font-medium">{receipt.paymentMethod}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Amount Paid:</span>
            <span className="font-medium">${receipt.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
            <span className="text-gray-800 font-medium">Status:</span>
            <span className="text-green-600 font-bold">{receipt.status}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 print:mb-4">
        <h3 className="text-lg font-medium mb-3">Next Steps</h3>
        <div className="bg-indigo-50 p-4 rounded-md print:bg-white print:p-0 print:border print:border-gray-300">
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Check your email for a confirmation message with class details.</li>
            <li>Mark the class schedule in your calendar.</li>
            <li>Prepare any required materials or textbooks.</li>
            <li>Contact the administration if you have any questions.</li>
          </ol>
        </div>
      </div>

      <div className="text-center mt-8 print:hidden">
        <div className="flex justify-center space-x-4 mb-4">
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className={`flex items-center px-4 py-2 ${
              isPrinting ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
            } text-white rounded-md`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {isPrinting ? 'Printing...' : 'Print Receipt'}
          </button>
          
          <button
            onClick={handleDownloadPDF}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
        </div>
        
        <div className="mt-6">
          <Link 
            href="/student/classes" 
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            View My Classes
          </Link>
        </div>
      </div>

      <div className="text-center text-gray-500 text-xs mt-8 print:mt-12">
        <p>This is an official receipt for your enrollment payment.</p>
        <p>© {new Date().getFullYear()} Tuition System. All rights reserved.</p>
      </div>
    </div>
  );
}
