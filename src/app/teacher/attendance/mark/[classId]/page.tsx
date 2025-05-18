'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Student {
  id: string;
  studentId: string;
  name: string;
  email: string;
  attendanceRate?: number;
  lastAttendance?: {
    date: string;
    status: string;
  };
}

interface ClassDetails {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  room: string;
  teacherId: string;
  students: Student[];
}

export default function MarkAttendance() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const classId = (params?.classId as string) || '';
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Fetch class details and students
  useEffect(() => {
    const fetchClassDetails = async () => {
      if (!classId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/teacher/classes/${classId}/students`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch class details');
        }
        
        const data = await response.json();
        
        // Format the data
        const formattedClass: ClassDetails = {
          id: classId,
          name: data.className || 'Class',
          subject: data.subject || 'Subject',
          schedule: data.schedule || 'Not scheduled',
          room: data.room || 'No room assigned',
          teacherId: data.teacherId || '',
          students: data.students || []
        };
        
        setClassDetails(formattedClass);
        
        // Initialize attendance records with default values
        const initialRecords: Record<string, string> = {};
        formattedClass.students.forEach(student => {
          initialRecords[student.id] = 'present';
        });
        
        setAttendanceRecords(initialRecords);
        
      } catch (err) {
        console.error('Error fetching class details:', err);
        setError('Failed to load class details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (session?.user?.id && classId) {
      fetchClassDetails();
    }
  }, [session, classId]);
  
  // Handle authentication
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
  }, [session, status, router]);
  
  // Handle attendance status change
  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };
  
  // Save attendance records
  const handleSaveAttendance = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      
      // Format the attendance data
      const attendanceData = Object.entries(attendanceRecords).map(([studentId, status]) => ({
        studentId,
        date: attendanceDate,
        status
      }));
      
      // Send the data to the API
      const response = await fetch(`/api/teacher/classes/${classId}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: attendanceDate,
          records: attendanceData
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save attendance');
      }
      
      setSaveSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/teacher/attendance?updated=true');
      }, 1500);
      
    } catch (err) {
      console.error('Error saving attendance:', err);
      setError('Failed to save attendance. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Mark all students with the same status
  const markAll = (status: string) => {
    const newRecords: Record<string, string> = {};
    
    if (classDetails?.students) {
      classDetails.students.forEach(student => {
        newRecords[student.id] = status;
      });
      
      setAttendanceRecords(newRecords);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <div className="mt-4">
            <Link href="/teacher/attendance" className="text-red-700 font-medium hover:text-red-800">
              Return to Attendance
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Mark Attendance</h1>
        <Link href="/teacher/attendance" className="text-indigo-600 hover:text-indigo-800 font-medium">
          Back to Attendance
        </Link>
      </div>
      
      {saveSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> Attendance has been saved successfully.</span>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">{classDetails?.name}</h2>
            <p className="text-gray-600">{classDetails?.subject}</p>
            <p className="text-sm text-gray-500">{classDetails?.schedule} | {classDetails?.room}</p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <label htmlFor="attendance-date" className="block text-sm font-medium text-gray-700 mb-1">
              Attendance Date
            </label>
            <input
              type="date"
              id="attendance-date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        
        <div className="flex space-x-2 mb-4">
          <button
            type="button"
            onClick={() => markAll('present')}
            className="px-3 py-1 bg-green-100 text-green-800 rounded-md text-sm font-medium hover:bg-green-200"
          >
            Mark All Present
          </button>
          <button
            type="button"
            onClick={() => markAll('absent')}
            className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm font-medium hover:bg-red-200"
          >
            Mark All Absent
          </button>
          <button
            type="button"
            onClick={() => markAll('late')}
            className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium hover:bg-yellow-200"
          >
            Mark All Late
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classDetails?.students && classDetails.students.length > 0 ? (
                classDetails.students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{student.studentId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'present')}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            attendanceRecords[student.id] === 'present'
                              ? 'bg-green-500 text-white'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'absent')}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            attendanceRecords[student.id] === 'absent'
                              ? 'bg-red-500 text-white'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'late')}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            attendanceRecords[student.id] === 'late'
                              ? 'bg-yellow-500 text-white'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }`}
                        >
                          Late
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                    No students found in this class
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={isSaving || !classDetails?.students?.length}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Attendance'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
