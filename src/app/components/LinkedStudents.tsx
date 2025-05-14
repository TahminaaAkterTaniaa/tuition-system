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
      <h2 className="text-xl font-semibold mb-6">My Children</h2>
      
      {/* Student Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        {linkedStudents.map((ls) => (
          <button
            key={ls.student.id}
            className={`px-4 py-2 mr-2 whitespace-nowrap ${
              activeTab === ls.student.id
                ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
            onClick={() => setActiveTab(ls.student.id)}
          >
            {ls.student.user.name} {ls.isPrimary && '(Primary)'}
          </button>
        ))}
      </div>

      {/* Active Student Details */}
      {activeStudent && (
        <div>
          {/* Student Profile */}
          <div className="mb-6 flex items-start">
            <div className="mr-4">
              {activeStudent.user.image ? (
                <Image
                  src={activeStudent.user.image}
                  alt={activeStudent.user.name}
                  width={80}
                  height={80}
                  className="rounded-full"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-gray-500">
                    {activeStudent.user.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium">{activeStudent.user.name}</h3>
              <p className="text-gray-600">ID: {activeStudent.studentId}</p>
              <p className="text-gray-600">Level: {activeStudent.academicLevel || 'Not specified'}</p>
              <p className="text-gray-600">Email: {activeStudent.user.email}</p>
              <p className={`mt-1 inline-block px-2 py-1 rounded-full text-xs ${
                activeStudent.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {activeStudent.status.charAt(0).toUpperCase() + activeStudent.status.slice(1)}
              </p>
            </div>
          </div>

          {/* Class Enrollments */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Enrolled Classes</h3>
            {activeStudent.enrollments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeStudent.enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="border rounded-md p-4">
                    <h4 className="font-medium">{enrollment.class.name}</h4>
                    <p className="text-gray-600">Subject: {enrollment.class.subject}</p>
                    <p className="text-gray-600">
                      Teacher: {enrollment.class.teacher?.user.name || 'Not assigned'}
                    </p>
                    {enrollment.class.schedule && (
                      <p className="text-gray-600">
                        Schedule: {enrollment.class.schedule}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">Not enrolled in any classes.</p>
            )}
          </div>

          {/* Recent Attendance */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Recent Attendance</h3>
            {activeStudent.attendances.length > 0 ? (
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
                      <tr key={attendance.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(attendance.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {attendance.class.name} ({attendance.class.subject})
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
            ) : (
              <p className="text-gray-600">No attendance records available.</p>
            )}
          </div>

          {/* Recent Grades */}
          <div>
            <h3 className="text-lg font-medium mb-3">Recent Grades</h3>
            {activeStudent.grades.length > 0 ? (
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
                      <tr key={grade.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(grade.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {grade.class.name} ({grade.class.subject})
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {grade.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {grade.score}/{grade.maxScore} ({Math.round((grade.score / grade.maxScore) * 100)}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">No grade records available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
