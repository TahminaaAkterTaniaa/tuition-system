'use client';

import { useState, useEffect } from 'react';
import { XCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface TeacherClass {
  id: string;
  name: string;
  subject: string;
  schedule?: string;
  enrolledCount?: number;
  capacity?: number;
}

interface TeacherDetails {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  bio?: string;
  specialization?: string;
  education?: string;
  experience?: string;
  phone?: string;
  classes?: TeacherClass[];
  workload?: {
    classCount: number;
    totalStudents: number;
    weeklyHours: number;
    isOverloaded: boolean;
  };
}

interface TeacherProfileModalProps {
  teacherId: string;
  isOpen: boolean;
  onClose: () => void;
}

const TeacherProfileModal = ({ teacherId, isOpen, onClose }: TeacherProfileModalProps) => {
  const [teacher, setTeacher] = useState<TeacherDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (isOpen && teacherId) {
      fetchTeacherDetails();
    }
  }, [isOpen, teacherId]);

  const fetchTeacherDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/teachers/${teacherId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch teacher details');
      }
      
      const data = await response.json();
      setTeacher(data);
    } catch (error) {
      console.error('Error fetching teacher details:', error);
      toast.error('Failed to load teacher details');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-xl font-semibold">Teacher Profile</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close modal"
            title="Close"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : !teacher ? (
          <div className="p-6 text-center">
            <p className="text-gray-600">Failed to load teacher information.</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-4">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`py-4 px-1 font-medium text-sm border-b-2 ${
                    activeTab === 'info' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Profile Information
                </button>
                <button
                  onClick={() => setActiveTab('classes')}
                  className={`py-4 px-1 font-medium text-sm border-b-2 ${
                    activeTab === 'classes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Assigned Classes
                </button>
                <button
                  onClick={() => setActiveTab('workload')}
                  className={`py-4 px-1 font-medium text-sm border-b-2 ${
                    activeTab === 'workload' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Workload Analysis
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="overflow-auto p-6 max-h-[calc(90vh-180px)]">
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left column - Basic details and photo */}
                  <div className="flex flex-col items-center">
                    <div className="relative h-40 w-40 rounded-full overflow-hidden bg-gray-100 mb-4">
                      {teacher.user.image ? (
                        <Image
                          src={teacher.user.image}
                          alt={teacher.user.name || 'Teacher'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full bg-indigo-100">
                          <span className="text-4xl font-bold text-indigo-500">
                            {teacher.user.name?.charAt(0) || 'T'}
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold">{teacher.user.name}</h3>
                    <p className="text-gray-600 mb-2">{teacher.user.email}</p>
                    {teacher.phone && (
                      <p className="text-gray-600">{teacher.phone}</p>
                    )}
                  </div>

                  {/* Right column - Detailed information */}
                  <div className="md:col-span-2 space-y-4">
                    {teacher.specialization && (
                      <div>
                        <h4 className="font-medium text-gray-700">Specialization</h4>
                        <p className="text-gray-600">{teacher.specialization}</p>
                      </div>
                    )}
                    
                    {teacher.education && (
                      <div>
                        <h4 className="font-medium text-gray-700">Education</h4>
                        <p className="text-gray-600">{teacher.education}</p>
                      </div>
                    )}
                    
                    {teacher.experience && (
                      <div>
                        <h4 className="font-medium text-gray-700">Experience</h4>
                        <p className="text-gray-600">{teacher.experience}</p>
                      </div>
                    )}
                    
                    {teacher.bio && (
                      <div>
                        <h4 className="font-medium text-gray-700">Biography</h4>
                        <p className="text-gray-600">{teacher.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'classes' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Assigned Classes</h3>
                  
                  {!teacher.classes || teacher.classes.length === 0 ? (
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-gray-600">No classes assigned to this teacher.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Class Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Subject
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Schedule
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Enrollment
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {teacher.classes.map((cls) => (
                            <tr key={cls.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {cls.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {cls.subject}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {cls.schedule || 'Not scheduled'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {cls.enrolledCount !== undefined && cls.capacity !== undefined ? 
                                  `${cls.enrolledCount}/${cls.capacity}` : 
                                  'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'workload' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Workload Analysis</h3>
                  
                  {!teacher.workload ? (
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-gray-600">Workload information not available.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`p-4 rounded-md ${teacher.workload.isOverloaded ? 'bg-red-50' : 'bg-green-50'}`}>
                        <h4 className="font-medium text-gray-700 mb-1">Class Count</h4>
                        <p className="text-2xl font-bold">{teacher.workload.classCount}</p>
                      </div>
                      
                      <div className={`p-4 rounded-md ${teacher.workload.isOverloaded ? 'bg-red-50' : 'bg-green-50'}`}>
                        <h4 className="font-medium text-gray-700 mb-1">Total Students</h4>
                        <p className="text-2xl font-bold">{teacher.workload.totalStudents}</p>
                      </div>
                      
                      <div className={`p-4 rounded-md ${teacher.workload.isOverloaded ? 'bg-red-50' : 'bg-green-50'}`}>
                        <h4 className="font-medium text-gray-700 mb-1">Weekly Hours</h4>
                        <p className="text-2xl font-bold">{teacher.workload.weeklyHours}</p>
                      </div>
                      
                      <div className="md:col-span-3 mt-4">
                        {teacher.workload.isOverloaded ? (
                          <div className="p-4 bg-red-100 border border-red-200 rounded-md">
                            <p className="text-red-700 font-medium">This teacher's workload is above the recommended limit.</p>
                          </div>
                        ) : (
                          <div className="p-4 bg-green-100 border border-green-200 rounded-md">
                            <p className="text-green-700 font-medium">This teacher's workload is within acceptable limits.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherProfileModal;
