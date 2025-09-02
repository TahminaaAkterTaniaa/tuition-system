'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import TeacherProfileModal from '@/app/components/TeacherProfileModal';
import StudentProfileModal from '@/app/components/StudentProfileModal';

interface Student {
  id: string;
  user: {
    name: string | null;
    email: string | null;
  };
}

interface Teacher {
  id: string;
  user: {
    name: string | null;
    email: string | null;
  } | null;
}

interface Enrollment {
  id: string;
  status: string;
  enrollmentDate: string;
  student: Student;
}

interface ClassDetails {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  capacity: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  teacherId: string | null;
  teacher: Teacher | null;
  enrollments: Enrollment[];
}

export default function ClassDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const classId = params?.classId as string;
  
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Function to handle student removal from class
  const handleRemoveStudent = async (enrollmentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from this class?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/enrollments/${enrollmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`${studentName} has been removed from the class`);
        // Refresh class details to update enrollment count
        fetchClassDetails();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to remove student');
      }
    } catch (error) {
      console.error('Error removing student:', error);
      toast.error('Failed to remove student');
    }
  };

  // Function to fetch class details
  const fetchClassDetails = async () => {
    try {
      const response = await fetch(`/api/admin/classes/${classId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch class details');
      }
      const data = await response.json();
      setClassDetails(data);
    } catch (error) {
      console.error('Error fetching class details:', error);
      toast.error('Error loading class details');
    } finally {
      setIsLoading(false);
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

    if (session?.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    fetchClassDetails();
  }, [session, status, router, classId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!classDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h1 className="text-xl font-semibold text-red-800">Class Not Found</h1>
          <p className="text-red-600 mt-2">The requested class could not be found.</p>
          <Link href="/admin" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{classDetails.name}</h1>
          <div className="mt-1 flex items-center">
            <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm font-medium mr-2">
              {classDetails.subject}
            </span>
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${
              classDetails.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {classDetails.status.charAt(0).toUpperCase() + classDetails.status.slice(1)}
            </span>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Link href={`/admin/classes/${classId}/edit`} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
            Edit Class
          </Link>
          <Link href="/admin/timetable" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
            View in Timetable
          </Link>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'details' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Class Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`py-4 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'students' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Enrolled Students ({classDetails.enrollments.length})
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Class Details Tab */}
        {activeTab === 'details' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column - Basic details */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Subject</h3>
                    <p className="mt-1 text-gray-900">{classDetails.subject}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                    <p className="mt-1 text-gray-900">{classDetails.description || 'No description provided'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Capacity</h3>
                    <p className="mt-1 text-gray-900">{classDetails.capacity} students</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Current Enrollment</h3>
                    <p className="mt-1 text-gray-900">{classDetails.enrollments.length} / {classDetails.capacity}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Start Date</h3>
                    <p className="mt-1 text-gray-900">{formatDate(classDetails.startDate)}</p>
                  </div>
                  {classDetails.endDate && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">End Date</h3>
                      <p className="mt-1 text-gray-900">{formatDate(classDetails.endDate)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column - Teacher information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Teacher Information</h2>
                {classDetails.teacher ? (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center mb-4">
                      <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">{classDetails.teacher.user?.name || 'Unknown'}</h3>
                        <p className="text-sm text-gray-500">{classDetails.teacher.user?.email || 'No email available'}</p>
                      </div>
                    </div>
                    <div className="flex mt-4">
                      <button 
                        type="button"
                        onClick={() => {
                          if (classDetails.teacher?.id) {
                            setSelectedTeacherId(classDetails.teacher.id);
                            setShowTeacherModal(true);
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        View Teacher Profile
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-yellow-700">No teacher assigned to this class.</p>
                    <button type="button" className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                      Assign Teacher
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Enrolled Students</h2>
            
            {classDetails.enrollments.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No students enrolled</h3>
                <p className="text-gray-500">Students will appear here once they enroll in this class.</p>
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Enrollment Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {classDetails.enrollments.map((enrollment) => (
                      <tr key={enrollment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {enrollment.student.user.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {enrollment.student.user.email || 'No email'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(enrollment.enrollmentDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            enrollment.status === 'enrolled' ? 'bg-green-100 text-green-800' :
                            enrollment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            enrollment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(enrollment.student.id);
                              setShowStudentModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 mr-4 cursor-pointer"
                          >
                            View Profile
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleRemoveStudent(enrollment.id, enrollment.student.user.name || 'Student')}
                            className="text-red-600 hover:text-red-900 cursor-pointer"
                          >
                            Remove
                          </button>
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
      
      {/* Teacher Profile Modal */}
      {showTeacherModal && selectedTeacherId && (
        <TeacherProfileModal 
          teacherId={selectedTeacherId} 
          isOpen={showTeacherModal}
          onClose={() => setShowTeacherModal(false)}
        />
      )}

      {/* Student Profile Modal */}
      {showStudentModal && selectedStudentId && (
        <StudentProfileModal
          studentId={selectedStudentId}
          isOpen={showStudentModal}
          onClose={() => setShowStudentModal(false)}
        />
      )}
    </div>
  );
}