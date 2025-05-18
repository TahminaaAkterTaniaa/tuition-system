'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

type ClassData = {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  room: string;
  startTime: string | null;
  endTime: string | null;
  studentCount: number;
};

export default function TodaysClasses() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodaysClasses = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/teacher/classes/today');
        
        if (!response.ok) {
          throw new Error('Failed to fetch today\'s classes');
        }
        
        const data = await response.json();
        // Ensure we have a classes array, even if the API returns null or undefined
        const classesData = data?.classes || [];
        
        // Make sure each class has the required properties with fallbacks
        const formattedClasses = classesData.map((cls: any) => ({
          id: cls.id || '',
          name: cls.name || 'Unnamed Class',
          subject: cls.subject || 'No Subject',
          schedule: cls.schedule || 'Not Scheduled',
          room: cls.room || 'No Room Assigned',
          startTime: cls.startTime || 'Not Set',
          endTime: cls.endTime || 'Not Set',
          studentCount: cls.studentCount || 0
        }));
        
        setClasses(formattedClasses);
      } catch (err) {
        console.error('Error fetching today\'s classes:', err);
        setError('Failed to load today\'s classes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (session?.user?.id) {
      fetchTodaysClasses();
    }
  }, [session]);

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
        <h2 className="text-xl font-semibold mb-4">Today's Classes</h2>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-500">No classes scheduled for today</h3>
          <p className="text-gray-500 mt-1">Enjoy your day off!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Today's Classes</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Room
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Students
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {classes.map((classItem) => (
              <tr key={classItem.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{classItem.name}</div>
                  <div className="text-sm text-gray-500">{classItem.subject}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {classItem.startTime || 'Not set'} - {classItem.endTime || 'Not set'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{classItem.room}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{classItem.studentCount}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link href={`/teacher/classes/${classItem.id}`} className="text-indigo-600 hover:text-indigo-900 mr-3">View</Link>
                  <Link href={`/teacher/attendance/mark/${classItem.id}`} className="text-green-600 hover:text-green-900">Attendance</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
