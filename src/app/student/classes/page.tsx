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
  enrollmentStatus: 'enrolled' | 'pending' | 'completed' | 'withdrawn';
  enrollmentId: string;
}

export default function StudentClasses() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [withdrawingClassId, setWithdrawingClassId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Function to handle class withdrawal
  const handleWithdraw = async (enrollmentId: string, className: string) => {
    if (!confirm(`Are you sure you want to withdraw from ${className}? This action cannot be undone.`)) {
      return;
    }

    try {
      setWithdrawingClassId(enrollmentId);
      setError(null);
      
      const response = await fetch('/api/student/classes/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enrollmentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to withdraw from class');
      }

      // Update the class list
      setClasses(prevClasses => 
        prevClasses.map(c => 
          c.enrollmentId === enrollmentId 
            ? { ...c, enrollmentStatus: 'withdrawn' as const } 
            : c
        )
      );

      setSuccessMessage(`Successfully withdrawn from ${className}`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error('Error withdrawing from class:', err);
      setError(`Failed to withdraw from class. ${err instanceof Error ? err.message : ''}`);
    } finally {
      setWithdrawingClassId(null);
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

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((classItem) => (
          <div key={classItem.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-indigo-600 text-white px-4 py-2">
              <h2 className="text-xl font-semibold">{classItem.name}</h2>
              <p className="text-indigo-100">{classItem.subject}</p>
              <div className="mt-1">
                {classItem.enrollmentStatus === 'enrolled' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ You are enrolled in this class
                  </span>
                )}
                {classItem.enrollmentStatus === 'pending' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    ⏳ Enrollment pending
                  </span>
                )}
                {classItem.enrollmentStatus === 'completed' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ✓ Completed
                  </span>
                )}
                {classItem.enrollmentStatus === 'withdrawn' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    ✗ Withdrawn
                  </span>
                )}
              </div>
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
              
              <div className="mt-6 flex justify-end space-x-2">
                {classItem.enrollmentStatus === 'enrolled' && (
                  <button 
                    onClick={() => handleWithdraw(classItem.enrollmentId, classItem.name)}
                    disabled={withdrawingClassId === classItem.enrollmentId}
                    className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {withdrawingClassId === classItem.enrollmentId ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                )}
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
