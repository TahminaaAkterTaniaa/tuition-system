'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../styles.module.css';

interface Grade {
  assessmentId: number;
  score: number;
  percentage: number;
  letter: string;
}

interface Student {
  id: number;
  name: string;
  grades: Grade[];
  average: number;
  letterGrade: string;
}

interface Assessment {
  id: number;
  name: string;
  type: string;
  date: string;
  maxScore: number;
  weight: number;
}

export default function ClassGradebook() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const gradeId = params.gradeId as string;
  const [isLoading, setIsLoading] = useState(true);
  const [classData, setClassData] = useState({
    id: gradeId,
    name: 'Advanced Mathematics',
    description: 'Advanced calculus and linear algebra for senior students',
  });
  
  const [assessments, setAssessments] = useState<Assessment[]>([
    { id: 1, name: 'Quiz 1', type: 'Quiz', date: '2025-02-10', maxScore: 20, weight: 5 },
    { id: 2, name: 'Midterm Exam', type: 'Exam', date: '2025-03-15', maxScore: 100, weight: 25 },
    { id: 3, name: 'Assignment 1', type: 'Assignment', date: '2025-02-20', maxScore: 50, weight: 10 },
    { id: 4, name: 'Quiz 2', type: 'Quiz', date: '2025-04-05', maxScore: 20, weight: 5 },
    { id: 5, name: 'Assignment 2', type: 'Assignment', date: '2025-04-25', maxScore: 50, weight: 10 },
  ]);
  
  const [students, setStudents] = useState<Student[]>([
    { 
      id: 1, 
      name: 'Emma Johnson', 
      grades: [
        { assessmentId: 1, score: 18, percentage: 90, letter: 'A' },
        { assessmentId: 2, score: 92, percentage: 92, letter: 'A' },
        { assessmentId: 3, score: 47, percentage: 94, letter: 'A' },
        { assessmentId: 4, score: 19, percentage: 95, letter: 'A' },
        { assessmentId: 5, score: 46, percentage: 92, letter: 'A' },
      ],
      average: 92.6,
      letterGrade: 'A'
    },
    { 
      id: 2, 
      name: 'Noah Williams', 
      grades: [
        { assessmentId: 1, score: 16, percentage: 80, letter: 'B' },
        { assessmentId: 2, score: 85, percentage: 85, letter: 'B' },
        { assessmentId: 3, score: 43, percentage: 86, letter: 'B' },
        { assessmentId: 4, score: 17, percentage: 85, letter: 'B' },
        { assessmentId: 5, score: 44, percentage: 88, letter: 'B+' },
      ],
      average: 84.8,
      letterGrade: 'B'
    },
    { 
      id: 3, 
      name: 'Olivia Brown', 
      grades: [
        { assessmentId: 1, score: 17, percentage: 85, letter: 'B' },
        { assessmentId: 2, score: 90, percentage: 90, letter: 'A-' },
        { assessmentId: 3, score: 45, percentage: 90, letter: 'A-' },
        { assessmentId: 4, score: 18, percentage: 90, letter: 'A-' },
        { assessmentId: 5, score: 45, percentage: 90, letter: 'A-' },
      ],
      average: 89.0,
      letterGrade: 'B+'
    },
    { 
      id: 4, 
      name: 'Liam Davis', 
      grades: [
        { assessmentId: 1, score: 15, percentage: 75, letter: 'C' },
        { assessmentId: 2, score: 78, percentage: 78, letter: 'C+' },
        { assessmentId: 3, score: 40, percentage: 80, letter: 'B-' },
        { assessmentId: 4, score: 16, percentage: 80, letter: 'B-' },
        { assessmentId: 5, score: 41, percentage: 82, letter: 'B-' },
      ],
      average: 79.0,
      letterGrade: 'C+'
    },
    { 
      id: 5, 
      name: 'Ava Miller', 
      grades: [
        { assessmentId: 1, score: 19, percentage: 95, letter: 'A' },
        { assessmentId: 2, score: 95, percentage: 95, letter: 'A' },
        { assessmentId: 3, score: 48, percentage: 96, letter: 'A' },
        { assessmentId: 4, score: 19, percentage: 95, letter: 'A' },
        { assessmentId: 5, score: 47, percentage: 94, letter: 'A' },
      ],
      average: 95.0,
      letterGrade: 'A'
    },
  ]);

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

    // In a real application, fetch class data, assessments, and student grades based on gradeId
    // For now, we're using mock data
    setIsLoading(false);
  }, [session, status, router, gradeId]);

  const getGradeForStudent = (studentId: number, assessmentId: number) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return null;
    
    const grade = student.grades.find(g => g.assessmentId === assessmentId);
    return grade || null;
  };

  const handleEditGrade = (studentId: number, assessmentId: number) => {
    // In a real application, this would open a modal or navigate to an edit page
    alert(`Edit grade for student ID ${studentId}, assessment ID ${assessmentId}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{classData.name} Gradebook</h1>
          <p className="text-gray-600 mt-1">{classData.description}</p>
        </div>
        <div className="flex space-x-3">
          <Link 
            href={`/teacher/classes/${gradeId}`}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
          >
            Back to Class
          </Link>
          <Link 
            href={`/teacher/gradebook/new-assessment?classId=${gradeId}`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            New Assessment
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Class Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Class Average</p>
              <p className="text-2xl font-bold text-indigo-600">88.1%</p>
              <p className="text-sm font-medium text-gray-700">Grade: B+</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Highest Grade</p>
              <p className="text-2xl font-bold text-green-600">95.0%</p>
              <p className="text-sm font-medium text-gray-700">Ava Miller</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Lowest Grade</p>
              <p className="text-2xl font-bold text-yellow-600">79.0%</p>
              <p className={styles.textGradeC}>Liam Davis</p>
            </div>
          </div>
          
          <h3 className="font-medium text-gray-900 mb-2">Grade Distribution</h3>
          <div className="space-y-3 mb-6">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">A (90-100%)</span>
                <span className="text-sm font-medium text-gray-700">40%</span>
              </div>
              <div className={styles.progressBarContainer}>
                <div className={`${styles.progressBarA} ${styles.width40}`}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">B (80-89%)</span>
                <span className="text-sm font-medium text-gray-700">40%</span>
              </div>
              <div className={styles.progressBarContainer}>
                <div className={`${styles.progressBarB} ${styles.width40}`}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">C (70-79%)</span>
                <span className="text-sm font-medium text-gray-700">20%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`${styles.progressBarC} ${styles.width20}`}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">D (60-69%)</span>
                <span className="text-sm font-medium text-gray-700">0%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`${styles.progressBarD} ${styles.width0}`}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">F (Below 60%)</span>
                <span className="text-sm font-medium text-gray-700">0%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`${styles.progressBarF} ${styles.width0}`}></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Assessments</h2>
          <div className="space-y-4">
            {assessments.map((assessment) => (
              <div key={assessment.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                <div className="flex justify-between">
                  <h3 className="font-medium text-gray-900">{assessment.name}</h3>
                  <span className="text-xs text-gray-500">{assessment.date}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>{assessment.type}</span>
                  <span>Weight: {assessment.weight}%</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-sm text-gray-600">Max Score: {assessment.maxScore}</span>
                  <Link 
                    href={`/teacher/gradebook/assessment/${assessment.id}`}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link 
              href={`/teacher/gradebook/new-assessment?classId=${gradeId}`}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Add New Assessment →
            </Link>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Student Grades</h2>
          <div className="flex space-x-3">
            <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
              Export Grades
            </button>
            <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
              Print Report
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                  Student
                </th>
                {assessments.map((assessment) => (
                  <th key={assessment.id} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {assessment.name}
                    <div className="text-xs font-normal text-gray-400 normal-case">{assessment.weight}%</div>
                  </th>
                ))}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white">
                    <div className="text-sm font-medium text-gray-900">{student.name}</div>
                  </td>
                  {assessments.map((assessment) => {
                    const grade = getGradeForStudent(student.id, assessment.id);
                    return (
                      <td key={`${student.id}-${assessment.id}`} className="px-6 py-4 whitespace-nowrap">
                        {grade ? (
                          <button 
                            onClick={() => handleEditGrade(student.id, assessment.id)}
                            className="text-sm text-gray-900 hover:text-indigo-600"
                          >
                            {grade.score}/{assessment.maxScore}
                            <div className="text-xs text-gray-500">{grade.percentage}%</div>
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleEditGrade(student.id, assessment.id)}
                            className="text-sm text-gray-400 hover:text-indigo-600"
                          >
                            Not graded
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{student.average.toFixed(1)}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`${styles.gradeBadge} ${
                      student.letterGrade.startsWith('A') ? styles.gradeA :
                      student.letterGrade.startsWith('B') ? styles.gradeB :
                      student.letterGrade.startsWith('C') ? styles.gradeC :
                      student.letterGrade.startsWith('D') ? styles.gradeD :
                      styles.gradeF
                    }`}>
                      {student.letterGrade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            href={`/teacher/gradebook/new-assessment?classId=${gradeId}`}
            className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
          >
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">New Assessment</h3>
              <p className="text-sm text-gray-600">Create a new test or assignment</p>
            </div>
          </Link>
          <Link 
            href={`/teacher/gradebook/import?classId=${gradeId}`}
            className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Import Grades</h3>
              <p className="text-sm text-gray-600">Import from CSV or Excel</p>
            </div>
          </Link>
          <Link 
            href={`/teacher/gradebook/reports?classId=${gradeId}`}
            className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Generate Reports</h3>
              <p className="text-sm text-gray-600">Create grade reports</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
