'use client';

import { useState, useEffect } from 'react';
import { XCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface ParentContact {
  id: string;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  isEmergencyContact: boolean;
}

interface EnrolledClass {
  id: string;
  name: string;
  subject: string;
  teacherName?: string;
  schedule?: string;
  status: string;
  grade?: string;
}

interface StudentDetails {
  id: string;
  studentId: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  dateOfBirth?: string;
  address?: string;
  phone?: string;
  grade?: string;
  status: string;
  enrollmentDate?: string;
  parentContacts?: ParentContact[];
  enrolledClasses?: EnrolledClass[];
}

interface StudentProfileModalProps {
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
}

const StudentProfileModal = ({ studentId, isOpen, onClose }: StudentProfileModalProps) => {
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (isOpen && studentId) {
      fetchStudentDetails();
    }
  }, [isOpen, studentId]);

  const fetchStudentDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/students/${studentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch student details');
      }
      
      const data = await response.json();
      setStudent(data);
    } catch (error) {
      console.error('Error fetching student details:', error);
      toast.error('Failed to load student details');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-xl font-semibold">Student Profile</h2>
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
        ) : !student ? (
          <div className="p-6 text-center">
            <p className="text-gray-600">Failed to load student information.</p>
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
                  Student Information
                </button>
                <button
                  onClick={() => setActiveTab('parents')}
                  className={`py-4 px-1 font-medium text-sm border-b-2 ${
                    activeTab === 'parents' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Parent Contacts
                </button>
                <button
                  onClick={() => setActiveTab('classes')}
                  className={`py-4 px-1 font-medium text-sm border-b-2 ${
                    activeTab === 'classes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Enrolled Classes
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
                      {student.user.image ? (
                        <Image
                          src={student.user.image}
                          alt={student.user.name || 'Student'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full bg-indigo-100">
                          <span className="text-4xl font-bold text-indigo-500">
                            {student.user.name?.charAt(0) || 'S'}
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">{student.user.name}</h3>
                    <p className="text-gray-600">Student ID: {student.studentId}</p>
                    <p className="text-gray-600 mt-1">{student.user.email}</p>
                    {student.phone && (
                      <p className="text-gray-600 mt-1">{student.phone}</p>
                    )}
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.status === 'active' ? 'bg-green-100 text-green-800' : student.status === 'withdrawn' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {student.status?.charAt(0).toUpperCase() + student.status?.slice(1) || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Right column - Additional details */}
                  <div className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 uppercase mb-2">Personal Information</h4>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-500">Date of Birth</p>
                            <p className="text-gray-900">{student.dateOfBirth || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Current Grade</p>
                            <p className="text-gray-900">{student.grade || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Address</p>
                            <p className="text-gray-900">{student.address || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 uppercase mb-2">Enrollment Information</h4>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-500">Enrollment Date</p>
                            <p className="text-gray-900">{student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : 'Not available'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Classes Enrolled</p>
                            <p className="text-gray-900">{student.enrolledClasses?.length || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Emergency Contact</p>
                            <p className="text-gray-900">
                              {student.parentContacts?.find(p => p.isEmergencyContact)?.name || 'Not designated'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'parents' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Parent/Guardian Contacts</h3>
                  
                  {!student.parentContacts || student.parentContacts.length === 0 ? (
                    <div className="bg-gray-50 p-6 text-center rounded-lg border border-gray-200">
                      <p className="text-gray-700">No parent contact information available.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {student.parentContacts.map(contact => (
                        <div key={contact.id} className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">{contact.name}</h4>
                              <p className="text-sm text-gray-600">{contact.relationship}</p>
                            </div>
                            {contact.isEmergencyContact && (
                              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                Emergency Contact
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center">
                              <span className="text-gray-500 text-sm w-16">Email:</span>
                              <span className="text-gray-900">{contact.email || 'Not provided'}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-gray-500 text-sm w-16">Phone:</span>
                              <span className="text-gray-900">{contact.phone || 'Not provided'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'classes' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Enrolled Classes</h3>
                  
                  {!student.enrolledClasses || student.enrolledClasses.length === 0 ? (
                    <div className="bg-gray-50 p-6 text-center rounded-lg border border-gray-200">
                      <p className="text-gray-700">Not enrolled in any classes.</p>
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
                              Teacher
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Schedule
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {student.enrolledClasses.map(cls => (
                            <tr key={cls.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {cls.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {cls.subject}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {cls.teacherName || 'Not assigned'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {cls.schedule || 'Not scheduled'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  cls.status === 'enrolled' ? 'bg-green-100 text-green-800' :
                                  cls.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  cls.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                                </span>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfileModal;
