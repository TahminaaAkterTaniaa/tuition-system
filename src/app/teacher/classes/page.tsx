'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TeacherClasses() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState([
    {
      id: 1,
      name: 'Advanced Mathematics',
      schedule: '9:00 AM - 10:30 AM',
      room: 'Room 101',
      students: 25,
      description: 'Advanced calculus and linear algebra for senior students',
      days: ['Monday', 'Wednesday', 'Friday']
    },
    {
      id: 2,
      name: 'Physics',
      schedule: '1:00 PM - 2:30 PM',
      room: 'Lab 203',
      students: 18,
      description: 'Mechanics, thermodynamics, and electromagnetism',
      days: ['Tuesday', 'Thursday']
    },
    {
      id: 3,
      name: 'Chemistry',
      schedule: '3:00 PM - 4:30 PM',
      room: 'Lab 205',
      students: 22,
      description: 'Organic chemistry and chemical reactions',
      days: ['Monday', 'Wednesday']
    }
  ]);

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

    setIsLoading(false);
  }, [session, status, router]);

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
        <h1 className="text-3xl font-bold">My Classes</h1>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md">
          Create New Class
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {classes.map((classItem) => (
          <div key={classItem.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold">{classItem.name}</h2>
                <p className="text-gray-600 mt-1">{classItem.description}</p>
              </div>
              <div className="flex space-x-2">
                <Link 
                  href={`/teacher/classes/${classItem.id}`}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </Link>
                <Link 
                  href={`/teacher/classes/edit/${classItem.id}`}
                  className="text-yellow-600 hover:text-yellow-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Schedule</p>
                <p className="font-medium">{classItem.schedule}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Room</p>
                <p className="font-medium">{classItem.room}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Students</p>
                <p className="font-medium">{classItem.students}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Days</p>
                <p className="font-medium">{classItem.days.join(', ')}</p>
              </div>
            </div>
            
            <div className="flex space-x-4 mt-4">
              <Link 
                href={`/teacher/attendance/mark/${classItem.id}`}
                className="flex items-center text-green-600 hover:text-green-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Attendance
              </Link>
              <Link 
                href={`/teacher/gradebook/class/${classItem.id}`}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Grades
              </Link>
              <Link 
                href={`/teacher/classes/materials/${classItem.id}`}
                className="flex items-center text-purple-600 hover:text-purple-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Materials
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Class Schedule</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monday
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tuesday
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wednesday
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thursday
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Friday
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  9:00 - 10:30
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                  Advanced Mathematics<br/>
                  <span className="text-gray-500">Room 101</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                  Advanced Mathematics<br/>
                  <span className="text-gray-500">Room 101</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                  Advanced Mathematics<br/>
                  <span className="text-gray-500">Room 101</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  1:00 - 2:30
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                  Physics<br/>
                  <span className="text-gray-500">Lab 203</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                  Physics<br/>
                  <span className="text-gray-500">Lab 203</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  3:00 - 4:30
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                  Chemistry<br/>
                  <span className="text-gray-500">Lab 205</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                  Chemistry<br/>
                  <span className="text-gray-500">Lab 205</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
