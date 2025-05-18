'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

type ClassData = {
  id: string;
  name: string;
  subject: string;
  studentCount: number;
};

type StudentData = {
  id: string;
  name: string;
  studentId: string;
  email: string;
  attendanceRate: number;
  lastAttendance?: {
    date: string;
    status: string;
  };
};

export default function TeacherAttendance() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/teacher/classes');
        
        if (!response.ok) {
          throw new Error('Failed to fetch classes');
        }
        
        const data = await response.json();
        // Check if data is an array (direct response) or has a classes property
        const classesData = Array.isArray(data) ? data : data.classes || [];
        
        // Map the data to match our ClassData type
        const formattedClasses = classesData.map((cls: any) => ({
          id: cls.id,
          name: cls.name,
          subject: cls.subject,
          studentCount: cls.students || 0
        }));
        
        setClasses(formattedClasses);
      } catch (err) {
        console.error('Error fetching classes:', err);
        setError('Failed to load classes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (session?.user?.id) {
      fetchClasses();
    }
  }, [session]);

  const fetchStudents = async (classId: string) => {
    if (!classId) return;
    
    try {
      setStudentsLoading(true);
      const response = await fetch(`/api/teacher/classes/${classId}/students`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }
      
      const data = await response.json();
      setStudents(data.students);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load students. Please try again later.');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    if (classId) {
      fetchStudents(classId);
    } else {
      setStudents([]);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Attendance</h2>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-500">No classes assigned</h3>
          <p className="text-gray-500 mt-1">You don't have any classes assigned to you yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Attendance</h2>
      
      <div className="mb-6">
        <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-1">
          Select Class
        </label>
        <div className="relative">
          <select
            id="class-select"
            value={selectedClass}
            onChange={handleClassChange}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Select a class</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name} - {classItem.subject} ({classItem.studentCount} students)
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {selectedClass && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Student List</h3>
            <Link 
              href={`/teacher/attendance/mark/${selectedClass}`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mark Attendance
            </Link>
          </div>
          
          {studentsLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-md">
              <p className="text-gray-500">No students enrolled in this class.</p>
            </div>
          ) : (
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
                      Attendance Rate
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Attendance
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{student.studentId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2 relative">
                            <div 
                              className={`h-2.5 rounded-full absolute top-0 left-0 ${
                                student.attendanceRate >= 90 ? 'bg-green-500' : 
                                student.attendanceRate >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                              } ${student.attendanceRate <= 25 ? 'w-1/4' : 
                                 student.attendanceRate <= 50 ? 'w-1/2' : 
                                 student.attendanceRate <= 75 ? 'w-3/4' : 
                                 student.attendanceRate <= 90 ? 'w-9/12' : 'w-full'}`} 
                            ></div>
                          </div>
                          <span className="text-sm text-gray-500">{student.attendanceRate}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.lastAttendance ? (
                          <div>
                            <div className="text-sm text-gray-500">
                              {new Date(student.lastAttendance.date).toLocaleDateString()}
                            </div>
                            <div className={`text-xs font-medium ${
                              student.lastAttendance.status === 'present' ? 'text-green-600' : 
                              student.lastAttendance.status === 'late' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {student.lastAttendance.status.charAt(0).toUpperCase() + student.lastAttendance.status.slice(1)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">No record</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link href={`/teacher/students/${student.id}/attendance`} className="text-indigo-600 hover:text-indigo-900">
                          View History
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
