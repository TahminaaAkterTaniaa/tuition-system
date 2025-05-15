'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Student = {
  id: string;
  studentId: string;
  academicLevel: string;
  status: string;
  user: {
    name: string;
    email: string;
    image: string | null;
  };
  enrollments: Array<{
    id: string;
    class: {
      name: string;
      subject: string;
      schedule: string | null;
      teacher: {
        user: {
          name: string;
        };
      } | null;
    };
  }>;
  attendances: Array<{
    id: string;
    date: string;
    status: string;
    class: {
      name: string;
      subject: string;
    };
  }>;
  grades: Array<{
    id: string;
    title: string;
    score: number;
    maxScore: number;
    date: string;
    class: {
      name: string;
      subject: string;
    };
  }>;
};

type LinkedStudent = {
  id: string;
  relationship: string;
  isPrimary: boolean;
  student: Student;
};

export default function LinkedStudents() {
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    const fetchLinkedStudents = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/parent/linked-students');
        
        if (!response.ok) {
          throw new Error('Failed to fetch linked students');
        }
        
        const data = await response.json();
        setLinkedStudents(data.linkedStudents);
        
        // Set the first student as active tab if there are any students
        if (data.linkedStudents.length > 0) {
          setActiveTab(data.linkedStudents[0].student.id);
        }
      } catch (err) {
        setError('Failed to load student data. Please try again later.');
        console.error('Error fetching linked students:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinkedStudents();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="text-red-500 text-center">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (linkedStudents.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">No Students Linked</h2>
          <p className="text-gray-600 mb-4">You don't have any students linked to your account yet.</p>
          <Link href="/parent/link-student" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
            Link a Student
          </Link>
        </div>
      </div>
    );
  }

  const activeStudent = linkedStudents.find(ls => ls.student.id === activeTab)?.student;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6 text-indigo-800 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        My Children
      </h2>
      
      {/* Student Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {linkedStudents.map((ls) => (
          <button
            key={ls.student.id}
            className={`flex items-center px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              activeTab === ls.student.id
                ? 'bg-indigo-100 text-indigo-700 font-medium shadow-sm'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab(ls.student.id)}
          >
            <div className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center mr-2 text-indigo-700 font-bold">
              {ls.student.user.name.charAt(0)}
            </div>
            <span>{ls.student.user.name}</span>
            {ls.isPrimary && (
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Primary</span>
            )}
          </button>
        ))}
      </div>

      {/* Active Student Details */}
      {activeStudent && (
        <div>
          {/* Student Info */}
          <div className="mb-8 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="mb-4 md:mb-0 md:mr-6 flex justify-center">
                {activeStudent.user.image ? (
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <Image
                      src={activeStudent.user.image}
                      alt={activeStudent.user.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                    <span className="text-3xl font-bold text-white">
                      {activeStudent.user.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-indigo-900">{activeStudent.user.name}</h3>
                    <p className="text-sm text-indigo-700">{activeStudent.user.email}</p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      activeStudent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {activeStudent.status.charAt(0).toUpperCase() + activeStudent.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 uppercase">Student ID</p>
                    <p className="text-sm font-medium">{activeStudent.studentId}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 uppercase">Academic Level</p>
                    <p className="text-sm font-medium">{activeStudent.academicLevel}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enrolled Courses */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-indigo-800">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Enrolled Courses
            </h3>
            {activeStudent.enrollments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeStudent.enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2"></div>
                    <div className="p-4">
                      <h4 className="font-semibold text-indigo-900">{enrollment.class.name}</h4>
                      <p className="text-sm text-indigo-700 font-medium">{enrollment.class.subject}</p>
                      
                      <div className="mt-3 space-y-2">
                        {enrollment.class.schedule && (
                          <div className="flex items-center text-sm text-gray-600">
                            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {enrollment.class.schedule}
                          </div>
                        )}
                        {enrollment.class.teacher && (
                          <div className="flex items-center text-sm text-gray-600">
                            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {enrollment.class.teacher.user.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600">No course enrollments found.</p>
                <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                  Browse Available Courses
                </button>
              </div>
            )}
          </div>

          {/* Attendance Records */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-indigo-800">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Recent Attendance
            </h3>
            {activeStudent.attendances.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activeStudent.attendances.map((attendance) => (
                        <tr key={attendance.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                            {new Date(attendance.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-indigo-700">{attendance.class.name}</div>
                            <div className="text-xs text-gray-500">{attendance.class.subject}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              attendance.status === 'present' 
                                ? 'bg-green-100 text-green-800' 
                                : attendance.status === 'absent'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 bg-gray-50 text-right text-sm">
                  <button className="text-indigo-600 hover:text-indigo-900 font-medium">View All Attendance Records</button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600">No attendance records available yet.</p>
              </div>
            )}
          </div>

          {/* Recent Grades */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-indigo-800">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Recent Grades
            </h3>
            {activeStudent.grades.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activeStudent.grades.map((grade) => (
                        <tr key={grade.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                            {new Date(grade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-indigo-700">{grade.class.name}</div>
                            <div className="text-xs text-gray-500">{grade.class.subject}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {grade.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="mr-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  (grade.score / grade.maxScore) >= 0.9 ? 'bg-green-100 text-green-800' :
                                  (grade.score / grade.maxScore) >= 0.7 ? 'bg-blue-100 text-blue-800' :
                                  (grade.score / grade.maxScore) >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {Math.round((grade.score / grade.maxScore) * 100)}%
                                </span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {grade.score}/{grade.maxScore}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 bg-gray-50 text-right text-sm">
                  <button className="text-indigo-600 hover:text-indigo-900 font-medium">View All Grades</button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600">No grade records available yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
