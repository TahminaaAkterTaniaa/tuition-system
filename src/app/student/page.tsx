'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface ClassItem {
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
  enrollmentId?: string;
  enrollmentStatus?: string;
  enrollmentDate?: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  notes?: string;
  class: {
    name: string;
    subject: string;
  };
}

interface AttendanceSummary {
  totalClasses: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

interface Grade {
  id: string;
  assessmentName: string;
  assessmentType: string;
  score: number;
  maxScore: number;
  weight: number;
  feedback?: string;
  gradedDate: string;
}

interface ClassGradeSummary {
  className: string;
  subject: string;
  averageGrade: number;
  letterGrade: string;
  grades: Grade[];
}

interface Resource {
  id: string;
  title: string;
  description?: string;
  type: string;
  url?: string;
  filePath?: string;
  publishDate: string;
  class: {
    name: string;
    subject: string;
  };
  teacher: {
    user: {
      name: string;
    };
  };
}

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // New state variables for attendance, grades, and resources
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [grades, setGrades] = useState<ClassGradeSummary[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  
  // Loading states for each data type
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [gradesLoading, setGradesLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState(true);

  // Fetch student's classes function definition
  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching enrolled classes for student dashboard');
      
      if (!session?.user?.id) {
        console.log('No user ID available, cannot fetch classes');
        setClasses([]);
        setError('Please log in to view your classes');
        return;
      }
      
      // Direct database query approach
      const userId = session.user.id;
      const directResponse = await fetch(`/api/enrollment/direct-check?userId=${userId}`);
      const directData = await directResponse.json();
      
      console.log('Direct enrollment check result:', directData);
      
      if (directData.success && directData.enrollments && directData.enrollments.length > 0) {
        // Filter to only show enrolled classes (not pending)
        const enrolledItems = directData.enrollments.filter((item: any) => 
          item.status === 'enrolled' || item.status === 'completed'
        );
        
        console.log('Enrolled items from direct check:', enrolledItems.length);
        
        if (enrolledItems.length > 0) {
          // Get class details for each enrollment
          const classPromises = enrolledItems.map((enrollment: any) => 
            fetch(`/api/classes/${enrollment.classId}`).then(res => res.json())
          );
          
          const classResults = await Promise.all(classPromises);
          console.log('Class details fetched:', classResults.length);
          
          // Combine enrollment data with class details
          const enrolledClasses = classResults.map((classData: any, index: number) => ({
            ...classData,
            enrollmentStatus: enrolledItems[index].status,
            enrollmentId: enrolledItems[index].id,
            enrollmentDate: enrolledItems[index].enrollmentDate
          }));
          
          console.log('Final enrolled classes:', enrolledClasses.length);
          setClasses(enrolledClasses);
          setError(null);
          setIsLoading(false);
          return;
        }
      }
      
      // Fallback to the regular API
      const response = await fetch('/api/student/enrolled-classes');
      const data = await response.json();
      console.log('Enrolled classes data from API:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        setClasses(data);
        setError(null);
      } else {
        setClasses([]);
        setError('You are not enrolled in any classes');
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching classes:', err);
      // Show a more user-friendly error message
      setError('Unable to load your classes. Please try again later.');
      // Set empty classes array to prevent UI issues
      setClasses([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch student's attendance records
  const fetchAttendance = async () => {
    try {
      setAttendanceLoading(true);
      console.log('Fetching attendance records');
      
      if (!session?.user?.id) {
        console.log('No user ID available, cannot fetch attendance');
        return;
      }
      
      const response = await fetch('/api/student/attendance');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch attendance: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Attendance data:', data);
      
      if (data.records && Array.isArray(data.records)) {
        // Sort by most recent first
        const sortedRecords = [...data.records].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setAttendance(sortedRecords);
      }
      
      if (data.summary) {
        setAttendanceSummary(data.summary);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      toast.error('Failed to load attendance records');
    } finally {
      setAttendanceLoading(false);
    }
  };
  
  // Fetch student's grades
  const fetchGrades = async () => {
    try {
      setGradesLoading(true);
      console.log('Fetching grades');
      
      if (!session?.user?.id) {
        console.log('No user ID available, cannot fetch grades');
        return;
      }
      
      const response = await fetch('/api/student/grades');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch grades: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Grades data:', data);
      
      if (Array.isArray(data)) {
        // Sort by highest grade first
        const sortedGrades = [...data].sort((a, b) => b.averageGrade - a.averageGrade);
        setGrades(sortedGrades);
      }
    } catch (err) {
      console.error('Error fetching grades:', err);
      toast.error('Failed to load grades');
    } finally {
      setGradesLoading(false);
    }
  };
  
  // Fetch student's resources
  const fetchResources = async () => {
    try {
      setResourcesLoading(true);
      console.log('Fetching resources');
      
      if (!session?.user?.id) {
        console.log('No user ID available, cannot fetch resources');
        return;
      }
      
      const response = await fetch('/api/student/resources');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch resources: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Resources data:', data);
      
      if (Array.isArray(data)) {
        // Sort by most recent first
        const sortedResources = [...data].sort((a, b) => 
          new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
        );
        setResources(sortedResources);
      }
    } catch (err) {
      console.error('Error fetching resources:', err);
      toast.error('Failed to load resources');
    } finally {
      setResourcesLoading(false);
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

    if (session?.user?.role !== 'STUDENT') {
      router.push('/');
      return;
    }
    
    // Fetch all student data when we have a valid student session
    fetchClasses();
    fetchAttendance();
    fetchGrades();
    fetchResources();
  }, [session, status, router]);

  // Show loading spinner if all data is still loading
  const allDataLoading = isLoading && attendanceLoading && gradesLoading && resourcesLoading;
  
  if (allDataLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status color for attendance
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'excused':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get color for grade letter
  const getGradeColor = (letter: string) => {
    switch (letter) {
      case 'A':
        return 'text-green-600';
      case 'B':
        return 'text-blue-600';
      case 'C':
        return 'text-yellow-600';
      case 'D':
        return 'text-orange-600';
      case 'F':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };
  
  // Get width class for progress bar based on percentage
  const getProgressBarWidth = (percentage: number) => {
    // Convert the percentage to a rounded value between 0-100
    const value = Math.min(100, Math.round((percentage / 100) * 100));
    
    // Map to the closest Tailwind width class
    if (value <= 0) return 'w-0';
    else if (value <= 5) return 'w-[5%]';
    else if (value <= 10) return 'w-[10%]';
    else if (value <= 20) return 'w-[20%]';
    else if (value <= 25) return 'w-1/4';
    else if (value <= 30) return 'w-[30%]';
    else if (value <= 40) return 'w-[40%]';
    else if (value <= 50) return 'w-1/2';
    else if (value <= 60) return 'w-[60%]';
    else if (value <= 70) return 'w-[70%]';
    else if (value <= 75) return 'w-3/4';
    else if (value <= 80) return 'w-[80%]';
    else if (value <= 90) return 'w-[90%]';
    else return 'w-full';
  };

  // Get icon for resource type
  const getResourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'material':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'assignment':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'syllabus':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Student Dashboard</h1>
        <div className="text-sm text-gray-600">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
      
      {/* Main dashboard content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Classes and Attendance */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Classes Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">My Classes</h2>
              <Link href="/student/classes" className="text-sm text-indigo-600 hover:text-indigo-800">
                View All Classes
              </Link>
            </div>
            
            {isLoading ? (
              <div className="py-4 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              </div>
            ) : classes.length > 0 ? (
              <div className="space-y-4">
                {classes.slice(0, 3).map((classItem) => (
                  <div key={classItem.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-medium text-lg">{classItem.name}</h3>
                        <p className="text-sm text-gray-600">{classItem.subject}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {classItem.schedule || 'Schedule not available'}
                        </div>
                        <div className="text-sm text-gray-600">
                          Room: {classItem.room || 'Not assigned'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        Teacher: {classItem.teacher?.user?.name || 'Not assigned'}
                      </div>
                      <Link 
                        href={`/student/classes/${classItem.id}`}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                {error || 'You are not enrolled in any classes.'}
              </div>
            )}
          </div>
          
          {/* Attendance Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Attendance</h2>
              <Link href="/student/attendance" className="text-sm text-indigo-600 hover:text-indigo-800">
                View Full Attendance
              </Link>
            </div>
            
            {attendanceLoading ? (
              <div className="py-4 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              </div>
            ) : attendance.length > 0 ? (
              <>
                {/* Attendance Summary */}
                {attendanceSummary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xs text-green-600 uppercase font-semibold">Present</div>
                      <div className="text-2xl font-bold text-green-700">{attendanceSummary.present}</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="text-xs text-red-600 uppercase font-semibold">Absent</div>
                      <div className="text-2xl font-bold text-red-700">{attendanceSummary.absent}</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-xs text-yellow-600 uppercase font-semibold">Late</div>
                      <div className="text-2xl font-bold text-yellow-700">{attendanceSummary.late}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-xs text-blue-600 uppercase font-semibold">Rate</div>
                      <div className="text-2xl font-bold text-blue-700">{attendanceSummary.attendanceRate}%</div>
                    </div>
                  </div>
                )}
                
                {/* Recent Attendance Records */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Class
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendance.slice(0, 5).map((record) => (
                        <tr key={record.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(record.date)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {record.class.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No attendance records found.
              </div>
            )}
          </div>
        </div>
        
        {/* Right column - Grades and Resources */}
        <div className="space-y-6">
          {/* Grades Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Grades</h2>
              <Link href="/student/grades" className="text-sm text-indigo-600 hover:text-indigo-800">
                View All Grades
              </Link>
            </div>
            
            {gradesLoading ? (
              <div className="py-4 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              </div>
            ) : grades.length > 0 ? (
              <div className="space-y-4">
                {grades.slice(0, 3).map((gradeSummary) => (
                  <div key={gradeSummary.className} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className="font-medium">{gradeSummary.className}</h3>
                        <p className="text-sm text-gray-600">{gradeSummary.subject}</p>
                      </div>
                      <div className={`text-2xl font-bold ${getGradeColor(gradeSummary.letterGrade)}`}>
                        {gradeSummary.letterGrade}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      {/* Use a function to determine the appropriate width class */}
                      <div 
                        className={`bg-blue-600 h-2.5 rounded-full ${getProgressBarWidth(gradeSummary.averageGrade)}`}
                      ></div>
                    </div>
                    <div className="mt-1 text-right text-sm text-gray-600">
                      {gradeSummary.averageGrade.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No grades available.
              </div>
            )}
          </div>
          
          {/* Resources Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Resources</h2>
              <Link href="/student/resources" className="text-sm text-indigo-600 hover:text-indigo-800">
                View All Resources
              </Link>
            </div>
            
            {resourcesLoading ? (
              <div className="py-4 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              </div>
            ) : resources.length > 0 ? (
              <div className="space-y-3">
                {resources.slice(0, 5).map((resource) => (
                  <div key={resource.id} className="flex items-start p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex-shrink-0 mr-3">
                      {getResourceIcon(resource.type)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="text-sm font-medium truncate">{resource.title}</h3>
                      <p className="text-xs text-gray-500 truncate">{resource.class.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(resource.publishDate)} • {resource.teacher.user.name}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <Link 
                        href={resource.url || '#'} 
                        className="text-indigo-600 hover:text-indigo-800"
                        target={resource.url ? "_blank" : undefined}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No resources available.
              </div>
            )}
          </div>
          
          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Upcoming Deadlines</h2>
            <div className="space-y-3">
              <div className="border-l-4 border-red-500 pl-4 py-2">
                <p className="text-sm text-gray-600 mb-1">Tomorrow</p>
                <h3 className="font-medium text-gray-900">Physics Assignment Due</h3>
                <p className="text-sm text-gray-600">Wave Mechanics Problem Set</p>
              </div>
              <div className="border-l-4 border-yellow-500 pl-4 py-2">
                <p className="text-sm text-gray-600 mb-1">May 15, 2025</p>
                <h3 className="font-medium text-gray-900">Math Quiz</h3>
                <p className="text-sm text-gray-600">Calculus II - Integration Techniques</p>
              </div>
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <p className="text-sm text-gray-600 mb-1">May 20, 2025</p>
                <h3 className="font-medium text-gray-900">Literature Essay</h3>
                <p className="text-sm text-gray-600">Modern American Literature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
