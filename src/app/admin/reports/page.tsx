'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type ReportSummary = {
  enrollmentStats: {
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    pendingEnrollments: number;
    withdrawnEnrollments: number;
    monthlyEnrollments: Record<string, number>;
  };
  academicStats: {
    averageGrade: number;
    topPerformingClass: string;
    lowestPerformingClass: string;
    gradeDistribution: {
      A: number;
      B: number;
      C: number;
      D: number;
      F: number;
    };
  };
  attendanceStats: {
    averageAttendanceRate: number;
    classesWithHighestAttendance: Array<{
      className: string;
      attendanceRate: number;
    }>;
    classesWithLowestAttendance: Array<{
      className: string;
      attendanceRate: number;
    }>;
  };
};

export default function ReportsAnalytics() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reportSummary, setReportSummary] = useState<ReportSummary>({
    enrollmentStats: {
      totalEnrollments: 0,
      activeEnrollments: 0,
      completedEnrollments: 0,
      pendingEnrollments: 0,
      withdrawnEnrollments: 0,
      monthlyEnrollments: {},
    },
    academicStats: {
      averageGrade: 0,
      topPerformingClass: '',
      lowestPerformingClass: '',
      gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
    },
    attendanceStats: {
      averageAttendanceRate: 0,
      classesWithHighestAttendance: [],
      classesWithLowestAttendance: [],
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [reportType, setReportType] = useState('enrollment');
  const [timeRange, setTimeRange] = useState('6months');

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

    fetchReportData();
  }, [session, status, router, reportType, timeRange]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/reports?type=${reportType}&timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch report data');
      const data = await response.json();
      setReportSummary(data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
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
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <Link href="/admin" className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h2 className="text-xl font-semibold mb-4 md:mb-0">Report Configuration</h2>
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div>
              <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                id="report-type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="enrollment">Enrollment</option>
                <option value="academic">Academic Performance</option>
                <option value="attendance">Attendance</option>
                <option value="financial">Financial</option>
              </select>
            </div>
            <div>
              <label htmlFor="time-range" className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
              <select
                id="time-range"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="30days">Last 30 Days</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchReportData}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div>
          {reportType === 'enrollment' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Enrollment Statistics</h3>
              
              {/* Enrollment Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-indigo-600">Total Enrollments</p>
                  <p className="text-2xl font-bold">{reportSummary.enrollmentStats.totalEnrollments}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-600">Active Enrollments</p>
                  <p className="text-2xl font-bold">{reportSummary.enrollmentStats.activeEnrollments}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-yellow-600">Pending Enrollments</p>
                  <p className="text-2xl font-bold">{reportSummary.enrollmentStats.pendingEnrollments}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-red-600">Withdrawn Enrollments</p>
                  <p className="text-2xl font-bold">{reportSummary.enrollmentStats.withdrawnEnrollments}</p>
                </div>
              </div>
              
              {/* Enrollment Chart */}
              <div className="mb-8">
                <h4 className="text-md font-medium mb-4">Monthly Enrollment Trends</h4>
                <div className="h-64">
                  <div className="flex h-full items-end">
                    {Object.entries(reportSummary.enrollmentStats.monthlyEnrollments).map(([month, count], index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-indigo-500 rounded-t" 
                          style={{ 
                            height: `${(count / Math.max(...Object.values(reportSummary.enrollmentStats.monthlyEnrollments))) * 100}%`,
                            minHeight: '10px'
                          }}
                        ></div>
                        <p className="text-xs font-medium text-gray-500 mt-2">{month}</p>
                        <p className="text-xs font-medium text-gray-900">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Export to PDF
                </button>
              </div>
            </div>
          )}

          {reportType === 'academic' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Academic Performance</h3>
              
              {/* Academic Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-indigo-600">Average Grade</p>
                  <p className="text-2xl font-bold">{reportSummary.academicStats.averageGrade.toFixed(1)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-600">Top Performing Class</p>
                  <p className="text-xl font-bold">{reportSummary.academicStats.topPerformingClass}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-red-600">Lowest Performing Class</p>
                  <p className="text-xl font-bold">{reportSummary.academicStats.lowestPerformingClass}</p>
                </div>
              </div>
              
              {/* Grade Distribution */}
              <div className="mb-8">
                <h4 className="text-md font-medium mb-4">Grade Distribution</h4>
                <div className="h-64">
                  <div className="flex h-full items-end">
                    {Object.entries(reportSummary.academicStats.gradeDistribution).map(([grade, count], index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className={`w-full rounded-t ${
                            grade === 'A' ? 'bg-green-500' : 
                            grade === 'B' ? 'bg-blue-500' : 
                            grade === 'C' ? 'bg-yellow-500' : 
                            grade === 'D' ? 'bg-orange-500' : 
                            'bg-red-500'
                          }`} 
                          style={{ 
                            height: `${(count / Math.max(...Object.values(reportSummary.academicStats.gradeDistribution))) * 100}%`,
                            minHeight: '10px'
                          }}
                        ></div>
                        <p className="text-xs font-medium text-gray-500 mt-2">Grade {grade}</p>
                        <p className="text-xs font-medium text-gray-900">{count} students</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Export to PDF
                </button>
              </div>
            </div>
          )}

          {reportType === 'attendance' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Attendance Statistics</h3>
              
              {/* Attendance Summary Card */}
              <div className="bg-indigo-50 p-4 rounded-lg mb-8">
                <p className="text-sm font-medium text-indigo-600">Average Attendance Rate</p>
                <p className="text-2xl font-bold">{formatPercentage(reportSummary.attendanceStats.averageAttendanceRate)}</p>
              </div>
              
              {/* Class Attendance Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="text-md font-medium mb-4">Classes with Highest Attendance</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Name</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Rate</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportSummary.attendanceStats.classesWithHighestAttendance.map((classItem, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{classItem.className}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPercentage(classItem.attendanceRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-md font-medium mb-4">Classes with Lowest Attendance</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Name</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Rate</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportSummary.attendanceStats.classesWithLowestAttendance.map((classItem, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{classItem.className}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPercentage(classItem.attendanceRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Export to PDF
                </button>
              </div>
            </div>
          )}

          {reportType === 'financial' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Financial Reports</h3>
              <p className="text-gray-500 mb-4">Please go to the Financial Management section for detailed financial reports.</p>
              <Link href="/admin/finance" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                View Financial Reports
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
