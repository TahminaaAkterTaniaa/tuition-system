'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Class {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  schedule: string | null;
  room: string | null;
  students: number;
  status: string;
  startDate: string;
  endDate: string | null;
}

export default function TeacherClasses() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch classes
  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/teacher/classes');
      
      if (!response.ok) {
        // Try to get more detailed error information
        let errorMessage = 'Failed to fetch classes';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // If we can't parse the error response, use the default message
        }
        
        console.error('Error response:', errorMessage);
        setError(errorMessage);
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('Classes fetched successfully:', data.length);
      setClasses(data);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError(`Failed to load classes. Please try again later. ${err instanceof Error ? err.message : ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    fetchClasses();
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

    // Fetch classes on initial load
    fetchClasses();
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
        <div className="flex items-center">
          <h1 className="text-3xl font-bold mr-4">My Classes</h1>
          <button 
            onClick={handleRefresh} 
            className="text-gray-600 hover:text-indigo-600 p-2 rounded-full hover:bg-gray-100"
            title="Refresh Classes"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <Link href="/teacher/classes/create" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md">
          Create New Class
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {classes.map((classItem) => (
          <div key={classItem.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold">{classItem.name}</h2>
                <p className="text-gray-600 mt-1">{classItem.description || classItem.subject}</p>
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
                <p className="font-medium">{classItem.schedule || 'Not scheduled'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Room</p>
                <p className="font-medium">{classItem.room || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Students</p>
                <p className="font-medium">{classItem.students}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    classItem.status === 'active' ? 'bg-green-100 text-green-800' : 
                    classItem.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {classItem.status}
                  </span>
                </p>
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
      
      {classes.length === 0 && !error && (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Classes Found</h3>
          <p className="text-gray-500">You haven't been assigned to any classes yet.</p>
        </div>
      )}


    </div>
  );
}
