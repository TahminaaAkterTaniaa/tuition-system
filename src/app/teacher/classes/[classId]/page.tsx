'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ClassDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const classId = params.classId;
  const [isLoading, setIsLoading] = useState(true);
  const [classData, setClassData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

    const fetchClassData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch class details
        const response = await fetch(`/api/teacher/classes/${classId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch class details');
        }
        
        const data = await response.json();
        
        // Fetch students enrolled in the class
        const studentsResponse = await fetch(`/api/teacher/classes/${classId}/students`);
        
        if (!studentsResponse.ok) {
          throw new Error('Failed to fetch students');
        }
        
        const studentsData = await studentsResponse.json();
        
        // Combine the data
        setClassData({
          ...data,
          students: studentsData.students || [],
          materials: data.materials || [],
          announcements: data.announcements || []
        });
      } catch (err) {
        console.error('Error fetching class details:', err);
        setError('Failed to load class details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (classId) {
      fetchClassData();
    }
  }, [session, status, router, classId]);

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
            <Link href="/teacher/classes" className="text-red-700 font-medium hover:text-red-800">
              Return to Classes
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!classData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Notice: </strong>
          <span className="block sm:inline">No class data found for this ID.</span>
          <div className="mt-4">
            <Link href="/teacher/classes" className="text-yellow-700 font-medium hover:text-yellow-800">
              Return to Classes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{classData.name}</h1>
          <p className="text-gray-600 mt-1">{classData.description}</p>
        </div>
        <div className="flex space-x-3">
          <Link 
            href={`/teacher/classes/edit/${classId}`}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Edit Class
          </Link>
          <Link 
            href={`/teacher/attendance/mark/${classId}`}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Mark Attendance
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Class Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Schedule</p>
                <p className="font-medium">{classData.schedule}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Room</p>
                <p className="font-medium">{classData.room}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Days</p>
                <p className="font-medium">{classData.days.join(', ')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Students</p>
                <p className="font-medium">{classData.students.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Students</h2>
              <Link 
                href={`/teacher/gradebook/class/${classId}`}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                View Gradebook
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Grade
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendance
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {classData.students && classData.students.length > 0 ? classData.students.map((student: any) => (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          student.grade && typeof student.grade === 'string' ? (
                            student.grade.startsWith('A') ? 'bg-green-100 text-green-800' :
                            student.grade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                            student.grade.startsWith('C') ? 'bg-yellow-100 text-yellow-800' :
                            student.grade.startsWith('D') ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          ) : 'bg-gray-100 text-gray-800'
                        }`}>
                          {student.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{student.attendance}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link 
                          href={`/teacher/students/${student.id}`} 
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          View
                        </Link>
                        <Link 
                          href={`/teacher/gradebook/student/${student.id}`} 
                          className="text-green-600 hover:text-green-900"
                        >
                          Grades
                        </Link>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No students enrolled in this class
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-right">
              <Link 
                href={`/teacher/classes/${classId}/students`}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                View All Students →
              </Link>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Announcements</h2>
              <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                New Announcement
              </button>
            </div>
            <div className="space-y-4">
              {classData.announcements && classData.announcements.length > 0 ? classData.announcements.map((announcement: any) => (
                <div key={announcement.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                  <div className="flex justify-between">
                    <h3 className="font-medium text-gray-900">{announcement.title}</h3>
                    <span className="text-xs text-gray-500">{announcement.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{announcement.content}</p>
                </div>
              )) : (
                <div className="text-center text-sm text-gray-500">
                  No announcements yet
                </div>
              )}
            </div>
            <div className="mt-4 text-right">
              <Link 
                href={`/teacher/classes/${classId}/announcements`}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                View All →
              </Link>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Class Materials</h2>
              <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                Upload Material
              </button>
            </div>
            <div className="space-y-3">
              {classData.materials && classData.materials.length > 0 ? classData.materials.map((material: any) => (
                <div key={material.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md">
                  <div className="flex items-center">
                    <div className="mr-3">
                      {material.type === 'PDF' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{material.name}</h3>
                      <p className="text-xs text-gray-500">Added on {material.date}</p>
                    </div>
                  </div>
                  <button 
                    className="text-gray-500 hover:text-gray-700" 
                    title={`Download ${material.name}`}
                    aria-label={`Download ${material.name}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 text-right">
              <Link 
                href={`/teacher/classes/${classId}/materials`}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                View All →
              </Link>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link 
                href={`/teacher/attendance/mark/${classId}`}
                className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Mark Attendance</h3>
                  <p className="text-sm text-gray-600">Record today's attendance</p>
                </div>
              </Link>
              <Link 
                href={`/teacher/gradebook/class/${classId}`}
                className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Manage Grades</h3>
                  <p className="text-sm text-gray-600">Update student grades</p>
                </div>
              </Link>
              <Link 
                href={`/teacher/classes/${classId}/materials/new`}
                className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Upload Materials</h3>
                  <p className="text-sm text-gray-600">Share resources with students</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
