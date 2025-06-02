'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import EnrollmentStatusBadge from '@/app/components/EnrollmentStatusBadge';
import ClassDetailsModal from '@/app/components/ClassDetailsModal';
import { ClassItem } from '@/app/types/class';

// Using ClassItem from types/class.ts

export default function Classes() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          
          return (
            <div key={classItem.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 transform hover:-translate-y-1">
              <div className="relative">
                {/* Default image for class */}
                <div className="h-40 bg-gradient-to-r from-indigo-50 to-blue-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                {/* Subject badge */}
                <div className="absolute top-2 left-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-3 py-1 rounded-md text-xs font-medium shadow-sm">
                  {classItem.subject}
                </div>
                
                {/* Availability badge */}
                <div className="absolute top-2 right-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium shadow-sm ${classItem.isFull ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                    {classItem.isFull 
                      ? 'Full' 
                      : `${classItem.availableSeats} spots left`}
                  </span>
                </div>
              </div>
              
              <div className="p-5">
                {/* Class title and enrollment status */}
                <div className="flex flex-col mb-3">
                  <h2 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{classItem.name}</h2>
                  
                  {/* Enrollment status badge */}
                  {session?.user?.role === 'STUDENT' && classItem.enrollmentStatus && (
                    <div className="mt-1">
                      <EnrollmentStatusBadge status={classItem.enrollmentStatus} />
                    </div>
                  )}
                </div>
                
                {/* Class details */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{classItem.description}</p>
                
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-700">{classItem.teacher?.user?.name || 'No teacher assigned'}</span>
                  </div>
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700">{classItem.schedule || 'Schedule not available'}</span>
                  </div>
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-gray-700">
                      {classItem.roomDetails ? 
                        `${classItem.roomDetails.name}${classItem.roomDetails.building ? ` (${classItem.roomDetails.building})` : ''}` : 
                        (classItem.room || 'Room not assigned')}
                    </span>
                  </div>
                </div>
                
                {/* Enrollment count and action button */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
                  <div className="text-xs font-medium text-gray-500">
                    <span className="text-indigo-600 font-semibold">{classItem.enrolledCount}</span>/{classItem.capacity} enrolled
                  </div>
                  
                  {/* Action button based on user role */}
                  <div>
                    {/* STUDENT ROLE ACTIONS - Only show Enroll button, no View Details button */}
                    {session?.user?.role === 'STUDENT' && !classItem.enrollmentStatus && !classItem.isFull && (
                      <Link
                        href={`/classes/enroll/${classItem.id}`}
                        className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:from-indigo-700 hover:to-blue-700 transition-all duration-300"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Enroll
                      </Link>
                    )}
                    
                    {/* TEACHER ROLE ACTIONS */}
                    {session?.user?.role === 'TEACHER' && (
                      <div className="flex space-x-2">
                        {/* Edit Class button - only if this teacher is assigned to this class */}
                        {classItem.teacher?.user?.id === session?.user?.id ? (
                          <Link
                            href={`/teacher/classes/${classItem.id}/edit`}
                            className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                            Edit
                          </Link>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedClass(classItem);
                              setIsModalOpen(true);
                            }}
                            className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all duration-300"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            View
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* ADMIN ROLE ACTIONS */}
                    {session?.user?.role === 'ADMIN' && (
                      <Link
                        href={`/admin/classes/${classItem.id}`}
                        className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:from-indigo-700 hover:to-blue-700 transition-all duration-300"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        Manage
                      </Link>
                    )}
                    
                    {/* PARENT ROLE ACTIONS */}
                    {session?.user?.role === 'PARENT' && (
                      <button
                        onClick={() => {
                          setSelectedClass(classItem);
                          setIsModalOpen(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all duration-300"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                        View Details
                      </button>
                    )}
                    
                    {/* NOT LOGGED IN - Login to enroll button */}
                    {!session && isAvailable && (
                      <Link
                        href={`/login?callbackUrl=/classes/enroll/${classItem.id}`}
                        className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:from-indigo-700 hover:to-blue-700 transition-all duration-300"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                        </svg>
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
      
      {/* Class Details Modal */}
      <ClassDetailsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        classData={selectedClass} 
      />
    </div>
  );
}
