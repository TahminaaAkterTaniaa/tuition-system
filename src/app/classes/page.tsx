'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import EnrollmentButton from '../components/EnrollmentButton';

interface ClassItem {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  schedule: string | null;
  capacity: number;
  room: string | null;
  status: string;
  teacher: {
    user: {
      name: string | null;
      id?: string;
    } | null;
  } | null;
  enrolledCount: number;
  availableSeats: number;
  isFull: boolean;
  enrollmentStatus: string | null;
}

export default function Classes() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Function to fetch all classes
  const fetchAllClasses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/classes');
      
      if (!response.ok) {
        // Try to get more detailed error information
        let errorMessage = 'Failed to fetch available classes';
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
      
      // Debug enrollment status
      data.forEach((classItem: any) => {
        console.log(`Class ${classItem.id} - ${classItem.name} - Enrollment Status: ${classItem.enrollmentStatus || 'None'}`);
      });
      
      // Force refresh enrollment data if we're a student
      if (session?.user?.role === 'STUDENT') {
        console.log('Refreshing enrollment status for student classes');
        try {
          // Make a direct database query to get student enrollments
          const userId = session.user.id;
          const directEnrollmentsResponse = await fetch(`/api/enrollment/direct-check?userId=${userId}`);
          
          if (directEnrollmentsResponse.ok) {
            const enrollmentData = await directEnrollmentsResponse.json();
            console.log('Direct enrollment check result:', enrollmentData);
            
            if (enrollmentData.enrollments && enrollmentData.enrollments.length > 0) {
              // Create a map of class IDs to enrollment status
              const enrollmentMap = enrollmentData.enrollments.reduce((map: Record<string, string>, enrollment: any) => {
                map[enrollment.classId] = enrollment.status;
                return map;
              }, {});
              
              console.log('Direct enrollment map:', enrollmentMap);
              
              // Update the classes with enrollment status
              data.forEach((classItem: any) => {
                const enrollmentStatus = enrollmentMap[classItem.id];
                if (enrollmentStatus) {
                  console.log(`Directly updating class ${classItem.id} enrollment status to ${enrollmentStatus}`);
                  classItem.enrollmentStatus = enrollmentStatus;
                }
              });
            }
          }
        } catch (error) {
          console.error('Error with direct enrollment check:', error);
        }
      }
      
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch classes on component mount
  useEffect(() => {
    fetchAllClasses();
  }, []);

  // Filter classes based on search term and subject filter
  const filteredClasses = classes.filter((classItem) => {
    const matchesSearch = searchTerm === '' || 
      classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (classItem.description && classItem.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (classItem.teacher?.user?.name && classItem.teacher.user.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSubject = subjectFilter === '' || classItem.subject === subjectFilter;
    
    return matchesSearch && matchesSubject;
  });

  // Get unique subjects for filter dropdown
  const subjects = Array.from(new Set(classes.map(c => c.subject))).sort();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Available Classes</h1>
      
      {/* Search and filter controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Classes</label>
            <input
              type="text"
              id="search"
              placeholder="Search by class name, description, or teacher"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <label htmlFor="subject-filter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Subject</label>
            <select
              id="subject-filter"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              title="Filter classes by subject"
              aria-label="Filter classes by subject"
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-48 flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSubjectFilter('');
              }}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* No results */}
      {!isLoading && filteredClasses.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Classes Found</h2>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </div>
      )}
      
      {/* Classes grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.map((classItem) => {
          // Determine if class is available for enrollment
          const isAvailable = classItem.status === 'active' && !classItem.isFull;
          
          // Determine enrollment status for UI
          let enrollmentStatusText = '';
          let enrollmentStatusClass = '';
          
          if (classItem.enrollmentStatus === 'enrolled') {
            enrollmentStatusText = 'Enrolled';
            enrollmentStatusClass = 'bg-green-100 text-green-800';
          } else if (classItem.enrollmentStatus === 'completed') {
            enrollmentStatusText = 'Completed';
            enrollmentStatusClass = 'bg-blue-100 text-blue-800';
          } else if (classItem.enrollmentStatus === 'pending') {
            enrollmentStatusText = 'Pending';
            enrollmentStatusClass = 'bg-yellow-100 text-yellow-800';
          }
          
          // Determine the badge color based on availability
          const badgeColor = classItem.isFull
            ? 'bg-red-100 text-red-800'
            : classItem.availableSeats <= classItem.capacity * 0.2
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-green-100 text-green-800';
          
          return (
            <div key={classItem.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                {/* Subject badge */}
                <div className="absolute top-2 left-2 bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">
                  {classItem.subject}
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">{classItem.name}</h2>
                  <div className="flex space-x-2">
                    {/* Enrolled badge */}
                    {classItem.enrollmentStatus && (
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${enrollmentStatusClass}`}>
                        {enrollmentStatusText}
                      </span>
                    )}
                    {/* Availability badge */}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${badgeColor}`}>
                      {classItem.isFull 
                        ? 'Full' 
                        : `${classItem.availableSeats} spots left`}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{classItem.description}</p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-700">{classItem.teacher?.user?.name || 'No teacher assigned'}</span>
                  </div>
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700">{classItem.schedule || 'Schedule not available'}</span>
                  </div>
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-gray-700">{classItem.room || 'Room not assigned'}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-500">Enrollment: </span>
                    <span className="text-sm font-medium">{classItem.enrolledCount}/{classItem.capacity}</span>
                  </div>
                  
                  {/* Action buttons based on user role */}
                  <div className="flex space-x-2">
                    {/* STUDENT ROLE ACTIONS */}
                    {session?.user?.role === 'STUDENT' && (
                      <div className="mt-4">
                        {session?.user?.id && (
                          <EnrollmentButton 
                            classId={classItem.id} 
                            userId={session.user.id} 
                          />
                        )}
                      </div>
                    )}
                    
                    {/* TEACHER ROLE ACTIONS */}
                    {session?.user?.role === 'TEACHER' && (
                      <>
                        {/* View Details button for all classes */}
                        <Link
                          href={`/classes/${classItem.id}`}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          View Details
                        </Link>
                        
                        {/* Edit Class button - only if this teacher is assigned to this class */}
                        {classItem.teacher?.user?.id === session?.user?.id && (
                          <Link
                            href={`/teacher/classes/${classItem.id}/edit`}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                          >
                            Edit Class
                          </Link>
                        )}
                      </>
                    )}
                    
                    {/* ADMIN ROLE ACTIONS */}
                    {session?.user?.role === 'ADMIN' && (
                      <Link
                        href={`/admin/classes/${classItem.id}`}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Manage Class
                      </Link>
                    )}
                    
                    {/* PARENT ROLE ACTIONS */}
                    {session?.user?.role === 'PARENT' && (
                      <Link
                        href={`/classes/${classItem.id}`}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        View Details
                      </Link>
                    )}
                    
                    {/* NOT LOGGED IN - Login to enroll button */}
                    {!session && isAvailable && (
                      <Link
                        href={`/login?callbackUrl=/classes/enroll/${classItem.id}`}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Login to Enroll
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
