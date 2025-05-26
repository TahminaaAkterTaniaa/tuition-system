'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Attendance {
  id: string;
  date: string;
  status: string;
  notes: string | null;
  class: {
    name: string;
    subject: string;
  };
}

interface AttendanceSummary {
  totalClasses: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

export default function StudentAttendance() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user.role !== 'STUDENT') {
      router.push('/');
      return;
    }

    fetchAttendance();
  }, [status, session, router]);

  // Fetch student's attendance records
  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch the actual attendance data from the API
      const response = await fetch('/api/student/attendance');
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }
      
      const data = await response.json();
      
      // Process the actual class data for the filter
      const classesMap = new Map();
      
      if (data.records && Array.isArray(data.records)) {
        // Extract unique classes for the filter dropdown
        data.records.forEach((record: Attendance) => {
          if (record.class && record.class.name) {
            classesMap.set(record.class.name, {
              id: record.class.name, // Using name as ID for simplicity
              name: record.class.name
            });
          }
        });
        
        setAttendanceRecords(data.records);
        setClasses(Array.from(classesMap.values()));
        
        if (data.summary) {
          setSummary(data.summary);
        }
      } else {
        setAttendanceRecords([]);
        setClasses([]);
        setSummary({
          totalClasses: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          attendanceRate: 0
        });
      }
      
    } catch (error: any) {
      console.error('Failed to fetch attendance:', error);
      setError(error.message || 'Failed to load attendance data');
      toast.error('Failed to load attendance records');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Filter records based on selected class
  const filteredRecords = selectedClass === 'all' ? 
    attendanceRecords : 
    attendanceRecords.filter(record => record.class?.name === selectedClass);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'excused': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Attendance Records</h1>
      
      {error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          {error}
        </div>
      ) : null}
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Attendance Summary</h2>
            <p className="text-gray-600">View your attendance history and statistics</p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <label htmlFor="classFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Class:
            </label>
            <select
              id="classFilter"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.name}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-sm text-indigo-700 font-medium">Total Classes</p>
              <p className="text-2xl font-bold text-indigo-900">{summary.totalClasses}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700 font-medium">Present</p>
              <p className="text-2xl font-bold text-green-900">{summary.present}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-700 font-medium">Absent</p>
              <p className="text-2xl font-bold text-red-900">{summary.absent}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-700 font-medium">Late</p>
              <p className="text-2xl font-bold text-yellow-900">{summary.late}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">Attendance Rate</p>
              <p className="text-2xl font-bold text-blue-900">{summary.attendanceRate}%</p>
            </div>
          </div>
        ) : null}
        
        <h3 className="text-lg font-medium mb-4">Attendance History</h3>
        
        {filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.class.name}
                      <div className="text-xs text-gray-500">{record.class.subject}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(record.status)}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {selectedClass === 'all' 
              ? 'No attendance records found.' 
              : `No attendance records found for ${selectedClass}.`}
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <Link href="/student" className="inline-flex items-center text-indigo-600 hover:text-indigo-800">
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
