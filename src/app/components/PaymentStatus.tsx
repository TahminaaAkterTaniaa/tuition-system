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
 <div>
  
 </div>
  );
}
