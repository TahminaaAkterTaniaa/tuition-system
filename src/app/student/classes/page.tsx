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
  teacher: {
    user: {
      name: string | null;
    }
  } | null;
  startDate: string;
  endDate: string | null;
}

export default function StudentClasses() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [error, setError] = useState<string | null>(null);

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

    // Fetch student's classes
    const fetchClasses = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/student/classes');
        
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
          throw new Error(errorMessage);
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
        <h1 className="text-3xl font-bold">My Classes</h1>
        <Link href="/student" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((classItem) => (
          <div key={classItem.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-indigo-600 text-white px-4 py-2">
              <h2 className="text-xl font-semibold">{classItem.name}</h2>
              <p className="text-indigo-100">{classItem.subject}</p>
            </div>
            <div className="p-4">
              <p className="text-gray-700 mb-2">{classItem.description}</p>
              
              <div className="mt-4 space-y-2">
                <div className="flex">
                  <span className="font-medium w-24">Schedule:</span>
                  <span className="text-gray-600">{classItem.schedule}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-24">Room:</span>
                  <span className="text-gray-600">{classItem.room}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-24">Teacher:</span>
                  <span className="text-gray-600">{classItem.teacher?.user.name || 'Not assigned'}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-24">Period:</span>
                  <span className="text-gray-600">
                    {new Date(classItem.startDate).toLocaleDateString()} - 
                    {classItem.endDate ? new Date(classItem.endDate).toLocaleDateString() : 'Ongoing'}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded hover:bg-indigo-200 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {classes.length === 0 && !error && (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Classes Found</h3>
          <p className="text-gray-500">You haven't enrolled in any classes yet.</p>
        </div>
      )}
    </div>
  );
}
