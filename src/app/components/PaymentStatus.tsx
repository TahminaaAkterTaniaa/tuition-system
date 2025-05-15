'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

type Payment = {
  id: string;
  amount: number;
  currency: string;
  description: string;
  invoiceNumber: string;
  dueDate: string;
  paymentDate: string | null;
  status: string;
  paymentMethod: string | null;
};

type ClassEnrollment = {
  classId: string;
  className: string;
  subject: string;
  enrollmentStatus: string;
  enrollmentPaymentStatus: string;
  enrollmentPaymentId?: string;
  enrollmentPaymentDate?: string;
  payments: Payment[];
  paymentStatus: string;
};

type StudentPayment = {
  studentId: string;
  studentName: string;
  relationship: string;
  enrollments: ClassEnrollment[];
};

type PaymentSummary = {
  totalPayments: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
};

export default function PaymentStatus() {
  const { data: session } = useSession();
  const [childrenPayments, setChildrenPayments] = useState<StudentPayment[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  useEffect(() => {
    const fetchPaymentStatus = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('/api/payments/parent');
        if (!response.ok) {
          throw new Error('Failed to fetch payment status');
        }
        
        const data = await response.json();
        setChildrenPayments(data.childrenPayments);
        setPaymentSummary(data.paymentSummary);
        setAllPayments(data.allPayments);
        
        // Set the first student as selected by default if available
        if (data.childrenPayments.length > 0) {
          setSelectedStudent(data.childrenPayments[0].studentId);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching payment status:', err);
        setError('Failed to load payment status. Please try again later.');
        setLoading(false);
      }
    };
    
    if (session) {
      fetchPaymentStatus();
    }
  }, [session]);
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };
  
  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="text-red-500 text-center">
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (childrenPayments.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">No Payment Information</h2>
          <p className="text-gray-600">No payment records found for your children.</p>
        </div>
      </div>
    );
  }
  
  const selectedStudentData = childrenPayments.find(
    (student) => student.studentId === selectedStudent
  );
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      {/* Payment Summary */}
      {paymentSummary && (
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4">Payment Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Total Due</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(paymentSummary.totalAmount, 'USD')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {paymentSummary.totalPayments} payments
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Paid</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(paymentSummary.paidAmount, 'USD')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {paymentSummary.totalPaid} payments
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(paymentSummary.pendingAmount, 'USD')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {paymentSummary.totalPending} payments
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(paymentSummary.overdueAmount, 'USD')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {paymentSummary.totalOverdue} payments
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Student Selection */}
      {childrenPayments.length > 1 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Select Child</h3>
          <div className="flex flex-wrap gap-2">
            {childrenPayments.map((child) => (
              <button
                key={child.studentId}
                onClick={() => setSelectedStudent(child.studentId)}
                className={`px-4 py-2 rounded-md ${
                  selectedStudent === child.studentId
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {child.studentName}
                <span className="text-xs ml-1">({child.relationship})</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Student Enrollments and Payments */}
      {selectedStudentData && (
        <div>
          <h3 className="text-lg font-medium mb-4">
            {selectedStudentData.studentName}'s Courses
          </h3>
          
          {selectedStudentData.enrollments.length === 0 ? (
            <p className="text-gray-600">No course enrollments found.</p>
          ) : (
            <div className="space-y-4">
              {selectedStudentData.enrollments.map((enrollment) => (
                <div key={enrollment.classId} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium">{enrollment.className}</h4>
                        <p className="text-sm text-gray-600">{enrollment.subject}</p>
                      </div>
                      <div>
                        <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(enrollment.enrollmentPaymentStatus || 'pending')}`}>
                          {enrollment.enrollmentPaymentStatus === 'paid' ? 'Paid' : 'Pending Payment'}
                        </span>
                        {enrollment.enrollmentPaymentStatus === 'paid' && enrollment.enrollmentPaymentDate && (
                          <div className="mt-1">
                            <p className="text-xs text-gray-500">Paid on: {formatDate(enrollment.enrollmentPaymentDate)}</p>
                            {enrollment.enrollmentPaymentId && (
                              <p className="text-xs text-gray-500">Payment ID: {enrollment.enrollmentPaymentId.substring(0, 8)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {enrollment.enrollmentPaymentStatus === 'paid' ? (
                    <div className="p-4 bg-green-50 border-t border-green-100">
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-sm text-green-700">Payment completed for this course</p>
                      </div>
                    </div>
                  ) : enrollment.payments && enrollment.payments.length > 0 ? (
                    <div className="p-4">
                      <h5 className="text-sm font-medium mb-2">Payment History</h5>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Invoice
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Due Date
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {enrollment.payments.map((payment) => (
                              <tr key={payment.id}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {payment.invoiceNumber}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(payment.dueDate)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">
                                  {formatCurrency(payment.amount, payment.currency)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                                    {payment.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">
                                  <button
                                    onClick={() => setSelectedPayment(payment)}
                                    className="text-indigo-600 hover:text-indigo-900"
                                  >
                                    View
                                  </button>
                                  {payment.status === 'pending' && (
                                    <button className="ml-3 text-green-600 hover:text-green-900">
                                      Pay
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : enrollment.enrollmentPaymentStatus === 'pending' ? (
                    <div className="p-4 bg-yellow-50 border-t border-yellow-100">
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-yellow-700">Payment pending for this course</p>
                      </div>
                      <button className="mt-2 inline-flex items-center px-3 py-1.5 border border-yellow-300 text-xs font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
                        Complete Payment
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 border-t border-gray-100">
                      <p className="text-sm text-gray-600">No payment information available for this course.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
