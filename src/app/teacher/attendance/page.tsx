'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

interface AttendanceRecord {
  id: number;
  classId: number;
  className: string;
  date: string;
  time: string;
  present: number;
  absent: number;
  late?: number;
  students?: any[];
}

interface ClassData {
  id: number;
  name: string;
  schedule: string;
  room: string;
  students: number;
  lastAttendance?: string;
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
const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

function AttendanceContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const updated = searchParams.get('updated') === 'true';
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdateMessage, setShowUpdateMessage] = useState(updated);
  const [classes, setClasses] = useState<ClassData[]>([
    {
      id: 1,
      name: 'Advanced Mathematics',
      schedule: '9:00 AM - 10:30 AM',
      room: 'Room 101',
      students: 25,
      lastAttendance: '2025-05-08',
      attendanceRate: '92%'
    },
    {
      id: 2,
      name: 'Physics',
      schedule: '1:00 PM - 2:30 PM',
      room: 'Lab 203',
      students: 18,
      lastAttendance: '2025-05-07',
      attendanceRate: '88%'
    },
    {
      id: 3,
      name: 'Chemistry',
      schedule: '3:00 PM - 4:30 PM',
      room: 'Lab 205',
      students: 22,
      lastAttendance: '2025-05-06',
      attendanceRate: '95%'
    }
  ]);
  
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]); // Will be populated from localStorage
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [attendanceDates, setAttendanceDates] = useState<AttendanceDatesMap>({});

  // Function to load attendance records from localStorage
  const loadAttendanceRecords = () => {
    const recordsString = localStorage.getItem('attendanceRecords');
    if (recordsString) {
      const records = JSON.parse(recordsString) as AttendanceRecord[];
      // Sort by date, most recent first
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentAttendance(records);
      
      // Create a map of dates with attendance records
      const datesMap: AttendanceDatesMap = {};
      records.forEach(record => {
        if (!datesMap[record.date]) {
          datesMap[record.date] = [];
        }
        datesMap[record.date].push(record);
      });
      setAttendanceDates(datesMap);
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
      prevMonthDays.push({
        date: new Date(year, monthIndex - 1, prevMonthLastDate - i),
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    // Calculate days for current month
    const currentMonthDays: CalendarDay[] = [];
    const today = new Date();
    const isToday = (date: Date) => {
      return date.getDate() === today.getDate() && 
             date.getMonth() === today.getMonth() && 
             date.getFullYear() === today.getFullYear();
    };
    
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
    const totalDaysDisplayed = prevMonthDays.length + currentMonthDays.length;
    const remainingDays = 42 - totalDaysDisplayed; // 6 rows x 7 days = 42
    
    for (let i = 1; i <= remainingDays; i++) {
      nextMonthDays.push({
        date: new Date(year, monthIndex + 1, i),
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    // Combine all days
    setCalendarDays([...prevMonthDays, ...currentMonthDays, ...nextMonthDays]);
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
    return date.toISOString().split('T')[0];
  };
  
  // Function to get attendance status for a date
  const getAttendanceStatus = (date: Date): string | null => {
    const dateString = formatDateForComparison(date);
    if (attendanceDates[dateString]) {
      const records = attendanceDates[dateString];
      const totalStudents = records.reduce((sum: number, record: AttendanceRecord) => {
        const lateCount = record.late || 0;
        return sum + record.present + record.absent + lateCount;
      }, 0);
      const presentStudents = records.reduce((sum: number, record: AttendanceRecord) => sum + record.present, 0);
      
      if (presentStudents === 0) return 'missing';
      if (presentStudents === totalStudents) return 'complete';
      return 'partial';
    }
    return null;
  };
  
  // Function to handle record deletion
  const handleDeleteRecord = (recordId: number): void => {
    if (confirm('Are you sure you want to delete this attendance record?')) {
      const recordsString = localStorage.getItem('attendanceRecords');
      if (recordsString) {
        let records = JSON.parse(recordsString) as AttendanceRecord[];
        records = records.filter(record => record.id !== recordId);
        localStorage.setItem('attendanceRecords', JSON.stringify(records));
        loadAttendanceRecords(); // Reload records
      }
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
    
    // Load attendance records
    loadAttendanceRecords();
    
    // Generate calendar days
    generateCalendarDays(currentMonth);

    setIsLoading(false);
    
    // Hide update message after 3 seconds
    if (showUpdateMessage) {
      const timer = setTimeout(() => {
        setShowUpdateMessage(false);
      }, 3000);
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
            <div className="border-l-4 border-indigo-500 pl-4 py-2">
              <h3 className="font-medium text-gray-900">Advanced Mathematics</h3>
              <p className="text-sm text-gray-600">9:00 AM - 10:30 AM | Room 101</p>
              <div className="mt-2">
                <Link 
                  href="/teacher/attendance/mark/1" 
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  Mark Attendance
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="border-l-4 border-gray-300 pl-4 py-2">
              <h3 className="font-medium text-gray-900">Chemistry</h3>
              <p className="text-sm text-gray-600">3:00 PM - 4:30 PM | Lab 205</p>
              <div className="mt-2">
                <Link 
                  href="/teacher/attendance/mark/3" 
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  Mark Attendance
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Attendance Overview</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Advanced Mathematics</span>
                <span className="text-sm font-medium text-gray-700">92%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Physics</span>
                <span className="text-sm font-medium text-gray-700">88%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Chemistry</span>
                <span className="text-sm font-medium text-gray-700">95%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link 
              href="/teacher/attendance/reports" 
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Generate Reports</h3>
                <p className="text-sm text-gray-600">Create attendance reports</p>
              </div>
            </Link>
            <Link 
              href="/teacher/attendance/students" 
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Student Attendance</h3>
                <p className="text-sm text-gray-600">View individual records</p>
              </div>
            </Link>
            <Link 
              href="/teacher/attendance/settings" 
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Settings</h3>
                <p className="text-sm text-gray-600">Configure attendance options</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Recent Attendance Records</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Present
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Absent
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
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{record.className}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatDate(record.date)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-green-600">{record.present}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-red-600">{record.absent}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{record.time}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link 
                            href={`/teacher/attendance/mark/${record.classId}?edit=true&recordId=${record.id}`} 
                            className="text-yellow-600 hover:text-yellow-900 mr-3"
                          >
                            Edit
                          </Link>
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
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No attendance records found. Start by marking attendance for a class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Attendance Calendar</h2>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
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
