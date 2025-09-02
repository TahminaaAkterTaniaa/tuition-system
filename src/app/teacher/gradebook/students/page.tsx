'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface StudentPerformance {
  id: string;
  name: string;
  avgGrade: string;
  avgPercentage: number;
  totalAssessments: number;
  classCount: number;
  email?: string;
}

interface ClassData {
  id: string;
  name: string;
  subject: string;
  students: number;
  assessments: number;
  avgGrade: string;
  avgPercentage: number;
}

const getGradeColor = (grade: string): string => {
  if (grade.startsWith('A')) return 'text-green-600';
  if (grade.startsWith('B')) return 'text-blue-600';
  if (grade.startsWith('C')) return 'text-yellow-600';
  if (grade.startsWith('D')) return 'text-orange-600';
  return 'text-red-600';
};

const getProgressBarColor = (grade: string): string => {
  if (grade.startsWith('A')) return 'bg-green-600';
  if (grade.startsWith('B')) return 'bg-blue-600';
  if (grade.startsWith('C')) return 'bg-yellow-600';
  if (grade.startsWith('D')) return 'bg-orange-600';
  return 'bg-red-600';
};

export default function AllStudentPerformance() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'avgPercentage' | 'totalAssessments'>('avgPercentage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

    const fetchAllStudentPerformance = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/teacher/gradebook');
        
        if (!response.ok) {
          throw new Error('Failed to fetch student performance data');
        }
        
        const data = await response.json();
        setClasses(data.classes || []);
        
        // Get detailed student performance data
        const allStudents: { [key: string]: StudentPerformance } = {};
        
        if (data.classes) {
          for (const classItem of data.classes) {
            try {
              const enrollmentsResponse = await fetch(`/api/teacher/classes/${classItem.id}/enrollments`);
              if (enrollmentsResponse.ok) {
                const enrollmentsData = await enrollmentsResponse.json();
                
                if (enrollmentsData.enrollments) {
                  for (const enrollment of enrollmentsData.enrollments) {
                    const student = enrollment.student;
                    const studentId = student.id;
                    
                    if (!allStudents[studentId]) {
                      allStudents[studentId] = {
                        id: studentId,
                        name: student.user?.name || 'Unknown Student',
                        email: student.user?.email,
                        avgGrade: 'N/A',
                        avgPercentage: 0,
                        totalAssessments: 0,
                        classCount: 0
                      };
                    }
                    
                    allStudents[studentId].classCount++;
                    
                    // Get grades for this student in this class
                    if (student.grades && student.grades.length > 0) {
                      const validGrades = student.grades.filter(grade => grade.score != null && grade.maxScore != null && grade.maxScore > 0);
                      if (validGrades.length > 0) {
                        const totalPercentage = validGrades.reduce((sum, grade) => sum + (grade.score / grade.maxScore) * 100, 0);
                        const currentTotal = allStudents[studentId].avgPercentage * allStudents[studentId].totalAssessments;
                        const newTotal = currentTotal + totalPercentage;
                        allStudents[studentId].totalAssessments += validGrades.length;
                        allStudents[studentId].avgPercentage = allStudents[studentId].totalAssessments > 0 ? newTotal / allStudents[studentId].totalAssessments : 0;
                      }
                    }
                  }
                }
              }
            } catch (classError) {
              console.error(`Error fetching enrollments for class ${classItem.id}:`, classError);
            }
          }
        }
        
        // Convert to array and calculate letter grades
        const studentArray = Object.values(allStudents).map(student => ({
          ...student,
          avgPercentage: Math.round(student.avgPercentage),
          avgGrade: student.totalAssessments > 0 ? getLetterGradeFromPercentage(student.avgPercentage) : 'N/A'
        }));
        
        setStudentPerformance(studentArray);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching student performance:', err);
        setError('Failed to load student performance data. Please try again later.');
        setIsLoading(false);
      }
    };
    
    fetchAllStudentPerformance();
  }, [session, status, router]);

  const getLetterGradeFromPercentage = (percentage: number): string => {
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const sortedStudents = [...studentPerformance].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'avgPercentage':
        comparison = a.avgPercentage - b.avgPercentage;
        break;
      case 'totalAssessments':
        comparison = a.totalAssessments - b.totalAssessments;
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">All Student Performance</h1>
        <Link 
          href="/teacher/gradebook" 
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          ← Back to Gradebook
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm font-medium text-gray-500">Total Students</div>
          <div className="text-2xl font-bold text-gray-900">{studentPerformance.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm font-medium text-gray-500">Total Classes</div>
          <div className="text-2xl font-bold text-gray-900">{classes.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm font-medium text-gray-500">Average Grade</div>
          <div className="text-2xl font-bold text-gray-900">
            {studentPerformance.length > 0 ? 
              getLetterGradeFromPercentage(
                studentPerformance.reduce((sum, s) => sum + s.avgPercentage, 0) / studentPerformance.length
              ) : 'N/A'
            }
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm font-medium text-gray-500">Total Assessments</div>
          <div className="text-2xl font-bold text-gray-900">
            {studentPerformance.reduce((sum, s) => sum + s.totalAssessments, 0)}
          </div>
        </div>
      </div>
      
      {/* Student Performance Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Student Name
                    {sortBy === 'name' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Classes Enrolled
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalAssessments')}
                >
                  <div className="flex items-center">
                    Total Assessments
                    {sortBy === 'totalAssessments' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('avgPercentage')}
                >
                  <div className="flex items-center">
                    Average Performance
                    {sortBy === 'avgPercentage' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance Bar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedStudents.length > 0 ? (
                sortedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{student.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.classCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.totalAssessments}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full mr-2 ${
                          student.avgGrade.startsWith('A') ? 'bg-green-100 text-green-800' :
                          student.avgGrade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                          student.avgGrade.startsWith('C') ? 'bg-yellow-100 text-yellow-800' :
                          student.avgGrade.startsWith('D') ? 'bg-orange-100 text-orange-800' :
                          student.avgGrade === 'N/A' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {student.avgGrade}
                        </span>
                        <span className="text-sm text-gray-500">
                          {student.totalAssessments > 0 ? `${student.avgPercentage}%` : 'No data'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`${getProgressBarColor(student.avgGrade)} h-2.5 rounded-full transition-all duration-500`} 
                          style={{ width: `${Math.min(student.avgPercentage, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="text-gray-500">No student performance data found</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {sortedStudents.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Total students: {sortedStudents.length}</span>
              <span>
                Sorted by: {sortBy === 'name' ? 'Name' : sortBy === 'avgPercentage' ? 'Average Percentage' : 'Total Assessments'} 
                ({sortOrder === 'asc' ? 'Ascending' : 'Descending'})
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}