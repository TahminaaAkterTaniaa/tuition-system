'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

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

    // Fetch student's attendance records
    const fetchAttendance = async () => {
      try {
        // In a real app, this would be an API call
        // const response = await fetch('/api/student/attendance');
        // if (!response.ok) throw new Error('Failed to fetch attendance');
        // const data = await response.json();
        
        // For demo purposes, using sample data
        const sampleClasses = [
          { id: '1', name: 'Mathematics 101' },
          { id: '2', name: 'Physics Fundamentals' },
          { id: '3', name: 'World History' }
        ];
        
        const sampleAttendance = [
          {
            id: '1',
            date: '2025-05-01T10:00:00.000Z',
            status: 'present',
            notes: null,
            class: {
              name: 'Mathematics 101',
              subject: 'Mathematics'
            }
          },
          {
            id: '2',
            date: '2025-05-02T13:00:00.000Z',
            status: 'present',
            notes: null,
            class: {
              name: 'Physics Fundamentals',
              subject: 'Physics'
            }
          },
          {
            id: '3',
            date: '2025-05-03T09:00:00.000Z',
            status: 'absent',
            notes: 'Medical appointment',
            class: {
              name: 'World History',
              subject: 'History'
            }
          },
          {
            id: '4',
            date: '2025-05-05T10:00:00.000Z',
            status: 'present',
            notes: null,
            class: {
              name: 'Mathematics 101',
              subject: 'Mathematics'
            }
          },
          {
            id: '5',
            date: '2025-05-06T13:00:00.000Z',
            status: 'late',
            notes: 'Arrived 15 minutes late',
            class: {
              name: 'Physics Fundamentals',
              subject: 'Physics'
            }
          },
          {
            id: '6',
            date: '2025-05-07T09:00:00.000Z',
            status: 'present',
            notes: null,
            class: {
              name: 'World History',
              subject: 'History'
            }
          }
        ];
        
        const sampleSummary = {
          totalClasses: 6,
          present: 4,
          absent: 1,
          late: 1,
          excused: 0,
          attendanceRate: 83.33 // (4 + 1/2) / 6 * 100
        };
        
        setClasses(sampleClasses);
        setAttendanceRecords(sampleAttendance);
        setSummary(sampleSummary);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching attendance:', err);
        setError('Failed to load attendance records. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, [session, status, router]);

  const filteredRecords = selectedClass === 'all' 
    ? attendanceRecords 
    : attendanceRecords.filter(record => record.class.name === selectedClass);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'excused': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
        <h1 className="text-3xl font-bold">My Attendance</h1>
        <Link href="/student" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {summary && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Attendance Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg text-center">
              <p className="text-sm text-indigo-600 mb-1">Total Classes</p>
              <p className="text-2xl font-bold text-indigo-700">{summary.totalClasses}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-sm text-green-600 mb-1">Present</p>
              <p className="text-2xl font-bold text-green-700">{summary.present}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <p className="text-sm text-red-600 mb-1">Absent</p>
              <p className="text-2xl font-bold text-red-700">{summary.absent}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <p className="text-sm text-yellow-600 mb-1">Late</p>
              <p className="text-2xl font-bold text-yellow-700">{summary.late}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-blue-600 mb-1">Attendance Rate</p>
              <p className="text-2xl font-bold text-blue-700">{summary.attendanceRate}%</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <h2 className="text-xl font-semibold mb-2 sm:mb-0">Attendance Records</h2>
            <div className="flex items-center">
              <label htmlFor="class-filter" className="mr-2">Filter by Class:</label>
              <select 
                id="class-filter"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(record.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{record.class.name}</div>
                    <div className="text-xs text-gray-500">{record.class.subject}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
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
        
        {filteredRecords.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">No attendance records found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
