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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">Payment Status</h2>
      </div>
      
      {/* Payment Summary */}
      {paymentSummary && (
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="text-lg font-medium mb-3">Payment Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg border">
              <p className="text-sm text-gray-500">Total Due</p>
              <p className="text-xl font-semibold">
                {formatCurrency(paymentSummary.totalAmount, 'USD')}
              </p>
              <p className="text-xs text-gray-500">
                {paymentSummary.totalPayments} payments
              </p>
            </div>
            
            <div className="bg-white p-3 rounded-lg border">
              <p className="text-sm text-gray-500">Paid</p>
              <p className="text-xl font-semibold text-green-600">
                {formatCurrency(paymentSummary.paidAmount, 'USD')}
              </p>
              <p className="text-xs text-gray-500">
                {paymentSummary.totalPaid} payments
              </p>
            </div>
            
            <div className="bg-white p-3 rounded-lg border">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-semibold text-yellow-600">
                {formatCurrency(paymentSummary.pendingAmount, 'USD')}
              </p>
              <p className="text-xs text-gray-500">
                {paymentSummary.totalPending} payments
              </p>
            </div>
            
            <div className="bg-white p-3 rounded-lg border">
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-xl font-semibold text-red-600">
                {formatCurrency(paymentSummary.overdueAmount, 'USD')}
              </p>
              <p className="text-xs text-gray-500">
                {paymentSummary.totalOverdue} payments
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="p-4">
        {/* Student Selector */}
        {childrenPayments.length > 1 && (
          <div className="mb-6">
            <label htmlFor="student-selector" className="block text-sm font-medium text-gray-700 mb-1">
              Select Student
            </label>
            <select
              id="student-selector"
              value={selectedStudent || ''}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {childrenPayments.map((student) => (
                <option key={student.studentId} value={student.studentId}>
                  {student.studentName} ({student.relationship})
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Selected Payment Details */}
        {selectedPayment && (
          <div className="mb-6 p-4 border rounded-lg">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-medium">Payment Details</h3>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                Close
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Invoice Number:</span>
                <span className="font-medium">{selectedPayment.invoiceNumber}</span>
              </div>
              
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Description:</span>
                <span className="font-medium">{selectedPayment.description}</span>
              </div>
              
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">
                  {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                </span>
              </div>
              
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPayment.status)}`}>
                  {selectedPayment.status}
                </span>
              </div>
              
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Due Date:</span>
                <span className="font-medium">{formatDate(selectedPayment.dueDate)}</span>
              </div>
              
              {selectedPayment.paymentDate && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Payment Date:</span>
                  <span className="font-medium">{formatDate(selectedPayment.paymentDate)}</span>
                </div>
              )}
              
              {selectedPayment.paymentMethod && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium">{selectedPayment.paymentMethod}</span>
                </div>
              )}
            </div>
            
            {selectedPayment.status === 'pending' && (
              <div className="mt-6">
                <button className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition-colors">
                  Pay Now
                </button>
              </div>
            )}
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
                        <div>
                          <h4 className="font-medium">{enrollment.className}</h4>
                          <p className="text-sm text-gray-600">{enrollment.subject}</p>
                        </div>
                        <div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            enrollment.paymentStatus === 'Fully Paid'
                              ? 'bg-green-100 text-green-800'
                              : enrollment.paymentStatus === 'Partially Paid'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {enrollment.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {enrollment.payments.length > 0 ? (
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
                    ) : (
                      <div className="p-4 text-sm text-gray-600">
                        No payment records found for this course.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
