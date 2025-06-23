'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TeacherSalaryTable from '@/app/components/TeacherSalaryTable';
import './styles.css';

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
      
      // Debug logs
      console.log('Financial Summary API Response:', summaryData);
      console.log('Top Paying Classes from API:', summaryData.topPayingClasses);
      
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setIsLoading(false);
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

  const calculateRevenueTrend = (monthlyRevenue: Record<string, number>): number => {
    const values = Object.values(monthlyRevenue);
    if (values.length < 2) return 0;
    
    const currentPeriod = values[values.length - 1] || 0;
    const previousPeriod = values[values.length - 2] || 0;
    
    if (previousPeriod === 0) return 0;
    return Math.round(((currentPeriod - previousPeriod) / previousPeriod) * 100);
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

      {/* Monthly Revenue Chart - Enhanced */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-100">
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Monthly Revenue</h2>
              <p className="text-sm text-gray-500">Revenue overview for the past 12 months</p>
            </div>
            <div className="bg-green-50 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              {calculateRevenueTrend(summary.monthlyRevenue)}% from last period
            </div>
          </div>
          
          <div className="h-64 relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 w-10 pr-2 flex flex-col justify-between text-right">
              {/* Display percentages in reverse order: 100% at top, 0% at bottom */}
              {[100, 75, 50, 25, 0].map((percent) => (
                <div key={percent} className="text-xs text-gray-400">
                  {percent}%
                </div>
              ))}
            </div>
            
            <div className="h-full flex items-end pl-10">
              {/* Sort the months chronologically */}
              {Object.entries(summary.monthlyRevenue)
                // Convert entries to objects with month name and value
                .map(([month, amount]) => ({ month, amount }))
                // Sort chronologically (assuming month format like "Jan 2023")
                .sort((a, b) => {
                  const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const [aMonth, aYear] = a.month ? a.month.split(' ') : ['', ''];
                  const [bMonth, bYear] = b.month ? b.month.split(' ') : ['', ''];
                  
                  if (aYear !== bYear) return Number(aYear) - Number(bYear);
                  return monthsOrder.indexOf(aMonth) - monthsOrder.indexOf(bMonth);
                })
                .map(({ month, amount }, index, sortedEntries) => {
                  const maxAmount = Math.max(...sortedEntries.map(entry => entry.amount));
                  const height = (amount / maxAmount) * 100;
                  const isCurrentMonth = index === sortedEntries.length - 1;
                  
                  return (
                    <div 
                      key={index} 
                      className="relative flex-1 flex flex-col items-center justify-end group"
                      style={{ height: '100%' }}
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 whitespace-nowrap">
                        <div className="font-semibold">{formatCurrency(amount)}</div>
                        <div className="text-gray-300">{month}</div>
                      </div>
                      {/* Bar */}
                      <div 
                        className={`w-3/4 rounded-t-md transition-all duration-300 ease-out ${
                          isCurrentMonth ? 'bg-gradient-to-t from-indigo-600 to-indigo-400' : 'bg-gradient-to-t from-indigo-500 to-indigo-300'
                        }`}
                        style={{
                          height: `${height}%`,
                          minHeight: '8px',
                          boxShadow: isCurrentMonth ? '0 4px 6px -1px rgba(99, 102, 241, 0.3)' : 'none'
                        }}
                      ></div>
                      {/* X-axis labels */}
                      <div className="text-xs text-gray-500 mt-2">
                        {month ? month.split(' ').map((m, i) => (
                          <div key={i} className="text-center">{m}</div>
                        )) : null}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">Total Revenue (12 months)</div>
              <div className="text-lg font-semibold text-gray-800">
                {formatCurrency(Object.values(summary.monthlyRevenue).reduce((a, b) => a + b, 0))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Teacher Salary Management */}
      <TeacherSalaryTable />

      {/* Payment Listing */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
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

        <div className="scrollable-table-container">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
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

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
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
