'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import CreateAssessmentModal from '@/app/components/CreateAssessmentModal';

interface ClassData {
  id: string;
  name: string;
  subject: string;
  students: number;
  assessments: number;
  avgGrade: string;
  avgPercentage: number;
  lastUpdated: string | null;
}

interface GradeData {
  id: string;
  student: string;
  studentId: string;
  class: string;
  classId: string;
  assessment: string;
  assessmentType: string;
  grade: string;
  score: string;
  percentage: number;
  date: string;
}

interface StudentPerformance {
  id: string;
  name: string;
  avgGrade: string;
  avgPercentage: number;
}

interface UpcomingAssessment {
  id: string;
  className: string;
  classId: string;
  name: string;
  description: string;
  dueDate: string;
}

// Helper function to get border color based on assessment name
const getBorderColor = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('exam') || lowerName.includes('test')) {
    return 'border-yellow-500';
  } else if (lowerName.includes('assignment')) {
    return 'border-blue-500';
  } else if (lowerName.includes('lab') || lowerName.includes('report')) {
    return 'border-green-500';
  } else if (lowerName.includes('quiz')) {
    return 'border-purple-500';
  } else {
    return 'border-gray-500';
  }
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

// Helper function to get grade color
const getGradeColor = (grade: string): string => {
  if (grade.startsWith('A')) return 'text-green-600';
  if (grade.startsWith('B')) return 'text-blue-600';
  if (grade.startsWith('C')) return 'text-yellow-600';
  if (grade.startsWith('D')) return 'text-orange-600';
  return 'text-red-600';
};

// Helper function to get progress bar color
const getProgressBarColor = (grade: string): string => {
  if (grade.startsWith('A')) return 'bg-green-600';
  if (grade.startsWith('B')) return 'bg-blue-600';
  if (grade.startsWith('C')) return 'bg-yellow-600';
  if (grade.startsWith('D')) return 'bg-orange-600';
  return 'bg-red-600';
};

export default function TeacherGradebook() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [recentGrades, setRecentGrades] = useState<GradeData[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
  const [upcomingAssessments, setUpcomingAssessments] = useState<UpcomingAssessment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreateAssessmentModalOpen, setIsCreateAssessmentModalOpen] = useState(false);

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

    const fetchGradebookData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch gradebook data
        const gradebookResponse = await fetch('/api/teacher/gradebook');
        
        if (!gradebookResponse.ok) {
          throw new Error('Failed to fetch gradebook data');
        }
        
        const gradebookData = await gradebookResponse.json();
        
        setClasses(gradebookData.classes || []);
        setRecentGrades(gradebookData.recentGrades || []);
        setStudentPerformance(gradebookData.studentPerformance || []);
        
        // Fetch real assessment data from the new API endpoint
        const assessmentsResponse = await fetch('/api/teacher/assessments');
        
        if (assessmentsResponse.ok) {
          const assessmentsData = await assessmentsResponse.json();
          setUpcomingAssessments(assessmentsData.assessments || []);
        } else {
          // Fall back to the data from gradebook API if assessments API fails
          setUpcomingAssessments(gradebookData.upcomingAssessments || []);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching gradebook data:', err);
        setError('Failed to load gradebook data. Please try again later.');
        setIsLoading(false);
      }
    };
    
    fetchGradebookData();
  }, [session, status, router]);

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
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Gradebook</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Classes Overview</h2>
          </div>
          <div className="space-y-4">
            {classes.map((classItem) => (
              <div key={classItem.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                <div className="flex justify-between">
                  <h3 className="font-medium text-gray-900">{classItem.name}</h3>
                  <span className="text-sm font-medium text-indigo-600">{classItem.avgGrade}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>{classItem.students} students</span>
                  <span>{classItem.assessments} assessments</span>
                </div>
                <div className="mt-2">
                  <Link 
                    href={`/teacher/gradebook/class/${classItem.id}`} 
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    View Grades
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Grade Distribution</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">A (90-100%)</span>
                <span className="text-sm font-medium text-gray-700">32%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '32%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">B (80-89%)</span>
                <span className="text-sm font-medium text-gray-700">45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">C (70-79%)</span>
                <span className="text-sm font-medium text-gray-700">18%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-yellow-600 h-2.5 rounded-full" style={{ width: '18%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">D (60-69%)</span>
                <span className="text-sm font-medium text-gray-700">4%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-orange-600 h-2.5 rounded-full" style={{ width: '4%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">F (Below 60%)</span>
                <span className="text-sm font-medium text-gray-700">1%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-red-600 h-2.5 rounded-full" style={{ width: '1%' }}></div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>Class average: <span className="font-medium">84.3%</span> (B)</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => setIsCreateAssessmentModalOpen(true)}
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors w-full text-left"
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Create New Assessment</h3>
                <p className="text-sm text-gray-600">Add tests, assignments, or tasks for your classes</p>
              </div>
            </button>
            <Link 
              href="/teacher/gradebook/reports" 
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Generate Reports</h3>
                <p className="text-sm text-gray-600">Create grade reports</p>
              </div>
            </Link>
            <Link 
              href="/teacher/gradebook/import" 
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Import Grades</h3>
                <p className="text-sm text-gray-600">Import from CSV or Excel</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Grades</h2>
          <Link 
            href="/teacher/gradebook/all" 
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assessment
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentGrades.map((grade) => (
                <tr key={grade.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{grade.student}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{grade.class}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{grade.assessment}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      grade.grade.startsWith('A') ? 'bg-green-100 text-green-800' :
                      grade.grade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                      grade.grade.startsWith('C') ? 'bg-yellow-100 text-yellow-800' :
                      grade.grade.startsWith('D') ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {grade.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{grade.score}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{grade.date}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link href={`/teacher/gradebook/edit/${grade.id}`} className="text-indigo-600 hover:text-indigo-900">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Student Performance</h2>
        <div className="space-y-4">
          {studentPerformance.length > 0 ? (
            studentPerformance.map((student) => (
              <div key={student.id}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{student.name}</span>
                  <span className={`text-sm font-medium ${getGradeColor(student.avgGrade)}`}>
                    {student.avgGrade} ({student.avgPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`${getProgressBarColor(student.avgGrade)} h-2.5 rounded-full`} 
                    style={{ width: `${student.avgPercentage}%` }}
                  ></div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">No student performance data available</p>
            </div>
          )}
        </div>
        <div className="mt-4">
          <Link 
            href="/teacher/gradebook/students" 
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            View All Students →
          </Link>
        </div>
      </div>



      {/* Create Assessment Modal */}
      <CreateAssessmentModal
        isOpen={isCreateAssessmentModalOpen}
        onClose={() => setIsCreateAssessmentModalOpen(false)}
        onSuccess={() => {
          // Refresh gradebook data after creating a new assessment
          const fetchGradebookData = async () => {
            try {
              setIsLoading(true);
              setError(null);
              
              // Fetch gradebook data
              const gradebookResponse = await fetch('/api/teacher/gradebook');
              
              if (!gradebookResponse.ok) {
                throw new Error('Failed to fetch gradebook data');
              }
              
              const gradebookData = await gradebookResponse.json();
              
              setClasses(gradebookData.classes || []);
              setRecentGrades(gradebookData.recentGrades || []);
              setStudentPerformance(gradebookData.studentPerformance || []);
              
              setIsLoading(false);
            } catch (err) {
              console.error('Error refreshing gradebook data:', err);
              setError('Failed to refresh data. Please try again later.');
              setIsLoading(false);
            }
          };
          
          fetchGradebookData();
        }}
      />
    </div>
  );
}
