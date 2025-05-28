'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Payment = {
  id: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  paymentDate: string;
  studentName: string;
  className: string;
  paymentMethod: string;
  transactionId: string;
};

type FinancialSummary = {
  totalRevenue: number;
  pendingPayments: number;
  completedPayments: number;
  failedPayments: number;
  monthlyRevenue: Record<string, number>;
  topPayingClasses: Array<{
    className: string;
    revenue: number;
  }>;
};

export default function FinancialManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    pendingPayments: 0,
    completedPayments: 0,
    failedPayments: 0,
    monthlyRevenue: {},
    topPayingClasses: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    fetchFinancialData();
  }, [session, status, router]);

  const fetchFinancialData = async () => {
    setIsLoading(true);
    try {
      // Fetch payments
      const paymentsResponse = await fetch('/api/admin/finance/payments');
      if (!paymentsResponse.ok) throw new Error('Failed to fetch payments');
      const paymentsData = await paymentsResponse.json();
      setPayments(paymentsData);

      // Fetch financial summary
      const summaryResponse = await fetch('/api/admin/finance/summary');
      if (!summaryResponse.ok) throw new Error('Failed to fetch financial summary');
      const summaryData = await summaryResponse.json();
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (paymentId: string, newStatus: 'PENDING' | 'COMPLETED' | 'FAILED') => {
    try {
      const response = await fetch(`/api/admin/finance/payments/${paymentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update payment status');
      
      // Update local state to reflect the change
      setPayments(payments.map(payment => 
        payment.id === paymentId ? { ...payment, status: newStatus } : payment
      ));

      // Refresh summary data to reflect the updated payment status
      fetchFinancialData();
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesStatus = filter === 'ALL' || payment.status === filter;
    const matchesSearch = payment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          payment.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || new Date(payment.paymentDate).toISOString().split('T')[0] === dateFilter;
    return matchesStatus && matchesSearch && matchesDate;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Financial Management</h1>
        <Link href="/admin" className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed Payments</p>
              <p className="text-2xl font-bold text-gray-900">{summary.completedPayments}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">{summary.pendingPayments}</p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Failed Payments</p>
              <p className="text-2xl font-bold text-gray-900">{summary.failedPayments}</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Top Paying Classes */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Top Paying Classes</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summary.topPayingClasses.map((classItem, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{classItem.className}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(classItem.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Monthly Revenue</h2>
        <div className="h-64">
          <div className="flex h-full items-end">
            {Object.entries(summary.monthlyRevenue).map(([month, amount], index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-indigo-500 rounded-t" 
                  style={{ 
                    height: `${(amount / Math.max(...Object.values(summary.monthlyRevenue))) * 100}%`,
                    minHeight: '10px'
                  }}
                ></div>
                <p className="text-xs font-medium text-gray-500 mt-2">{month}</p>
                <p className="text-xs font-medium text-gray-900">{formatCurrency(amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Listing */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h2 className="text-xl font-semibold mb-4 md:mb-0">Payment History</h2>
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                id="status-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="ALL">All Payments</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
            <div>
              <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                id="date-filter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="payment-search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                id="payment-search"
                placeholder="Search by name, class or transaction ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.studentName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.className}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(payment.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.paymentMethod}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                          payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {payment.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleStatusChange(payment.id, 'COMPLETED')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200"
                          >
                            Mark Complete
                          </button>
                        )}
                        {payment.status !== 'PENDING' && (
                          <button
                            onClick={() => handleStatusChange(payment.id, 'PENDING')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200"
                          >
                            Mark Pending
                          </button>
                        )}
                        {payment.status !== 'FAILED' && (
                          <button
                            onClick={() => handleStatusChange(payment.id, 'FAILED')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                          >
                            Mark Failed
                          </button>
                        )}
                        <Link
                          href={`/admin/finance/payments/${payment.id}`}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No payments found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
