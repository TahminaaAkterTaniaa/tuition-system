'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

interface AttendanceRecord {
  id: string;
  classId: string;
  className: string;
  date: string;
  time: string;
  status: string;
  studentName: string;
  studentId: string;
}

interface ClassData {
  id: string;
  name: string;
  schedule: string;
  room: string;
  students: number;
  lastAttendance?: string | null;
  attendanceRate?: string;
}

// Remove unused calendar interfaces

// Helper function to format date for display
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

function AttendanceContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const updated = searchParams?.get('updated') === 'true';
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdateMessage, setShowUpdateMessage] = useState(updated);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Remove unused calendar state

  // Function to fetch attendance data from API
  const fetchAttendanceData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/teacher/attendance');
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }
      
      const data = await response.json();
      
      // Set classes data
      if (data.classes && Array.isArray(data.classes)) {
        setClasses(data.classes.map((cls: any) => ({
          id: cls.id,
          name: cls.name,
          schedule: cls.schedule || 'No schedule',
          room: cls.room || 'No room assigned',
          students: cls.students || 0,
          lastAttendance: cls.lastAttendance,
          attendanceRate: cls.attendanceRate || '0%'
        })));
      }
      
      // Set recent attendance records
      if (data.recentAttendance && Array.isArray(data.recentAttendance)) {
        const records = data.recentAttendance;
        // Sort by date, most recent first
        records.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentAttendance(records);
      }
      
      // Remove unused attendance dates mapping
      
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError('Failed to load attendance data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Remove unused generateCalendarDays function
  
  // Remove unused calendar-related functions
  
  // Function to handle record deletion
  const handleDeleteRecord = async (recordId: string): Promise<void> => {
    try {
      // Show confirmation dialog
      if (!confirm('Are you sure you want to delete this attendance record?')) {
        return;
      }
      
      // Call API to delete the record
      const response = await fetch(`/api/teacher/attendance/${recordId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete attendance record');
      }
      
      // Refresh attendance data
      fetchAttendanceData();
      
      // Show success message
      alert('Attendance record deleted successfully');
      
    } catch (err) {
      console.error('Error deleting attendance record:', err);
      alert('Failed to delete attendance record. Please try again.');
    }
  };

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user.role !== 'TEACHER') {
      router.push('/');
      return;
    }
    
    // Fetch attendance data from API
    fetchAttendanceData();
    
    // Hide update message after 5 seconds
    if (showUpdateMessage) {
      const timer = setTimeout(() => {
        setShowUpdateMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [session, status, router, showUpdateMessage]);
  
  // Remove unused calendar effect

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Attendance Management</h1>
      
      {showUpdateMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> Attendance has been updated successfully.</span>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Quick Mark</p>
              <p className="text-2xl font-bold">Today's Classes</p>
            </div>
            <div className="bg-blue-400 rounded-full p-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {classes.length > 0 ? (
              classes.slice(0, 2).map((cls) => (
                <Link 
                  key={cls.id}
                  href={`/teacher/attendance/mark/${cls.id as string}`} 
                  className="block bg-blue-400 rounded-md px-3 py-2 text-sm hover:bg-blue-300 transition-colors"
                >
                  {cls.name}
                </Link>
              ))
            ) : (
              <p className="text-blue-100 text-sm">No classes today</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Best Performing</p>
              <p className="text-2xl font-bold">Class Rate</p>
            </div>
            <div className="bg-green-400 rounded-full p-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            {classes.length > 0 ? (
              <>
                <p className="text-3xl font-bold">
                  {Math.max(...classes.map(cls => parseInt(cls.attendanceRate || '0')))}%
                </p>
                <p className="text-green-100 text-sm">
                  {classes.find(cls => parseInt(cls.attendanceRate || '0') === Math.max(...classes.map(c => parseInt(c.attendanceRate || '0'))))?.name || 'N/A'}
                </p>
              </>
            ) : (
              <p className="text-3xl font-bold">0%</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Active</p>
              <p className="text-2xl font-bold">Classes</p>
            </div>
            <div className="bg-purple-400 rounded-full p-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold">{classes.length}</p>
            <p className="text-purple-100 text-sm">
              {classes.reduce((sum, cls) => sum + cls.students, 0)} total students
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Recent</p>
              <p className="text-2xl font-bold">Records</p>
            </div>
            <div className="bg-orange-400 rounded-full p-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold">{recentAttendance.length}</p>
            <p className="text-orange-100 text-sm">in the last 30 days</p>
          </div>
        </div>
      </div>

      {/* Class Management Section */}
      <div className="bg-white rounded-lg shadow-md mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Class Attendance Overview</h2>
          <p className="text-gray-600 mt-1">Manage attendance for all your classes</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {classes.length > 0 ? (
              classes.map((cls) => (
                <div key={cls.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                      <p className="text-sm text-gray-600">{cls.schedule} | {cls.room}</p>
                      <p className="text-sm text-gray-500">{cls.students} students enrolled</p>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cls.attendanceRate && parseInt(cls.attendanceRate) >= 90 ? 'bg-green-100 text-green-800' : 
                        cls.attendanceRate && parseInt(cls.attendanceRate) >= 75 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {cls.attendanceRate || '0%'} attendance
                      </div>
                    </div>
                  </div>
                  
                  {cls.lastAttendance && (
                    <p className="text-xs text-gray-500 mb-3">Last marked: {formatDate(cls.lastAttendance)}</p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
                      <div 
                        className={`h-2 rounded-full ${
                          cls.attendanceRate && parseInt(cls.attendanceRate) >= 90 ? 'bg-green-500' : 
                          cls.attendanceRate && parseInt(cls.attendanceRate) >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} 
                        className={`h-2 rounded-full ${
                          cls.attendanceRate && parseInt(cls.attendanceRate) >= 90 ? 'bg-green-500' : 
                          cls.attendanceRate && parseInt(cls.attendanceRate) >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                        } ${
                          !cls.attendanceRate || parseInt(cls.attendanceRate) === 0 ? 'w-0' :
                          parseInt(cls.attendanceRate) <= 10 ? 'w-[10%]' :
                          parseInt(cls.attendanceRate) <= 25 ? 'w-1/4' :
                          parseInt(cls.attendanceRate) <= 50 ? 'w-1/2' :
                          parseInt(cls.attendanceRate) <= 75 ? 'w-3/4' :
                          parseInt(cls.attendanceRate) <= 90 ? 'w-[90%]' : 'w-full'
                        }`}
                      ></div>
                    </div>
                    <Link 
                      href={`/teacher/attendance/mark/${cls.id as string}`} 
                      className="flex-shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors"
                    >
                      Mark Attendance
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-8">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002 2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-medium text-gray-500 mb-2">No Classes Found</h3>
                <p className="text-gray-400">You don't have any classes assigned yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Attendance Records</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class & Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student & Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentAttendance.length > 0 ? (
                recentAttendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.className}</div>
                      <div className="text-xs text-gray-500">{formatDate(record.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.studentName}</div>
                      <div className={`text-sm ${
                        record.status === 'present' ? 'text-green-600' : 
                        record.status === 'late' ? 'text-yellow-600' : 'text-red-600'
                      } capitalize`}>
                        {record.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{record.time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(record.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No recent attendance records found
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

// Wrap the component in a Suspense boundary to fix the build error
export default function TeacherAttendance() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading attendance data...</div>}>
      <AttendanceContent />
    </Suspense>
  );
}
