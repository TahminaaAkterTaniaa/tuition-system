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

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface AttendanceDatesMap {
  [key: string]: AttendanceRecord[];
}

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
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [attendanceDates, setAttendanceDates] = useState<AttendanceDatesMap>({});

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
      
      // Set attendance dates map
      if (data.attendanceDates) {
        setAttendanceDates(data.attendanceDates);
      }
      
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError('Failed to load attendance data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to generate calendar days for the current month
  const generateCalendarDays = (month: Date) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    
    // Get the first day of the month
    const firstDay = new Date(year, monthIndex, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Get the last day of the month
    const lastDay = new Date(year, monthIndex + 1, 0);
    const lastDate = lastDay.getDate();
    
    // Get the last day of the previous month
    const prevMonthLastDay = new Date(year, monthIndex, 0);
    const prevMonthLastDate = prevMonthLastDay.getDate();
    
    // Calculate days from previous month to display
    const prevMonthDays: CalendarDay[] = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, monthIndex - 1, prevMonthLastDate - i);
      prevMonthDays.push({
        date,
        isCurrentMonth: false,
        isToday: isToday(date)
      });
    }
    
    // Calculate days from current month
    const currentMonthDays: CalendarDay[] = [];
    for (let i = 1; i <= lastDate; i++) {
      const date = new Date(year, monthIndex, i);
      currentMonthDays.push({
        date,
        isCurrentMonth: true,
        isToday: isToday(date)
      });
    }
    
    // Calculate days from next month to display
    const nextMonthDays: CalendarDay[] = [];
    const totalDays = prevMonthDays.length + currentMonthDays.length;
    const remainingDays = 42 - totalDays; // 6 rows of 7 days
    
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, monthIndex + 1, i);
      nextMonthDays.push({
        date,
        isCurrentMonth: false,
        isToday: isToday(date)
      });
    }
    
    // Combine all days
    const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
    setCalendarDays(allDays);
    
    // Helper function to check if a date is today
    function isToday(date: Date): boolean {
      const today = new Date();
      return date.getDate() === today.getDate() && 
             date.getMonth() === today.getMonth() && 
             date.getFullYear() === today.getFullYear();
    }
  };
  
  // Function to navigate to previous month
  const goToPrevMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
  };
  
  // Function to navigate to next month
  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
  };
  
  // Function to format date as YYYY-MM-DD for comparison
  const formatDateForComparison = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  // Function to get attendance status for a date
  const getAttendanceStatus = (date: Date): string | null => {
    const dateString = formatDateForComparison(date);
    
    // Add null check for attendanceDates[dateString]
    if (!dateString || !attendanceDates[dateString]) return null;
    
    const records = attendanceDates[dateString];
    
    // Count statuses
    let present = 0;
    let absent = 0;
    let late = 0;
    
    records.forEach(record => {
      if (record.status === 'present') present++;
      else if (record.status === 'absent') absent++;
      else if (record.status === 'late') late++;
    });
    
    const totalStudents = present + absent + late;
    
    if (present === 0) return 'missing';
    if (present < totalStudents) return 'partial';
    return 'complete';
  };
  
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
  
  // Update calendar when month changes
  useEffect(() => {
    generateCalendarDays(currentMonth);
  }, [currentMonth]);

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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Today's Classes</h2>
            <div className="text-sm text-gray-500">{formatDate(new Date().toISOString().split('T')[0])}</div>
          </div>
          <div className="space-y-4">
            {classes.length > 0 ? (
              classes.map((cls) => (
                <div key={cls.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                  <h3 className="font-medium text-gray-900">{cls.name}</h3>
                  <p className="text-sm text-gray-600">{cls.schedule} | {cls.room}</p>
                  <div className="mt-2">
                    <Link 
                      href={`/teacher/attendance/mark/${cls.id as string}`} 
                      className="inline-flex items-center text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      Mark Attendance
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">No classes scheduled for today</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Class Statistics</h2>
          <div className="space-y-4">
            {classes.length > 0 ? (
              classes.map((cls) => (
                <div key={cls.id} className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{cls.name}</h3>
                      <p className="text-sm text-gray-500">{cls.students} Students</p>
                      {cls.lastAttendance && (
                        <p className="text-xs text-gray-500">Last attendance: {formatDate(cls.lastAttendance)}</p>
                      )}
                    </div>
                    <div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">Attendance Rate</span>
                        <div className="flex items-center mt-1">
                          <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2 relative">
                            <div 
                              className={`h-2.5 rounded-full absolute top-0 left-0 ${
                                cls.attendanceRate && parseInt(cls.attendanceRate) >= 90 ? 'bg-green-500' : 
                                cls.attendanceRate && parseInt(cls.attendanceRate) >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                              } ${
                                cls.attendanceRate && parseInt(cls.attendanceRate) <= 25 ? 'w-1/4' : 
                                cls.attendanceRate && parseInt(cls.attendanceRate) <= 50 ? 'w-1/2' : 
                                cls.attendanceRate && parseInt(cls.attendanceRate) <= 75 ? 'w-3/4' : 
                                cls.attendanceRate && parseInt(cls.attendanceRate) <= 90 ? 'w-9/12' : 'w-full'
                              }`} 
                            ></div>
                          </div>
                          <span className="text-sm text-gray-500">{cls.attendanceRate || '0%'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">No class data available</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Attendance Calendar</h2>
            <div className="text-sm text-gray-500">
              {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700">
                {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex space-x-2">
                <button 
                  className="p-1 rounded-full hover:bg-gray-100"
                  onClick={goToPrevMonth}
                  aria-label="Previous month"
                  title="Previous month"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button 
                  className="p-1 rounded-full hover:bg-gray-100"
                  onClick={goToNextMonth}
                  aria-label="Next month"
                  title="Next month"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-1">
              <div>Su</div>
              <div>Mo</div>
              <div>Tu</div>
              <div>We</div>
              <div>Th</div>
              <div>Fr</div>
              <div>Sa</div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((day, index) => {
                const dateString = formatDateForComparison(day.date);
                const status = getAttendanceStatus(day.date);
                let bgColorClass = '';
                
                if (status === 'complete') bgColorClass = 'bg-green-100';
                else if (status === 'partial') bgColorClass = 'bg-yellow-100';
                else if (status === 'missing') bgColorClass = 'bg-red-100';
                
                if (day.isToday) bgColorClass = 'bg-indigo-100';
                
                return (
                  <div 
                    key={index} 
                    className={`${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'} p-2 text-sm ${bgColorClass} ${day.isToday ? 'font-medium rounded-full' : ''}`}
                    title={status ? `${formatDate(dateString)}: ${status}` : formatDate(dateString)}
                  >
                    {day.date.getDate()}
                    {status && (
                      <div className="mt-1 flex justify-center">
                        <div 
                          className={`w-1.5 h-1.5 rounded-full ${status === 'complete' ? 'bg-green-500' : status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'}`}
                        ></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
              <span className="text-gray-600">Complete</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
              <span className="text-gray-600">Partial</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
              <span className="text-gray-600">Missing</span>
            </div>
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
