'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import EditGradeModal from '@/app/components/EditGradeModal';

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

const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

export default function AllRecentGrades() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [recentGrades, setRecentGrades] = useState<GradeData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEditGradeModalOpen, setIsEditGradeModalOpen] = useState(false);
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);

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

    const fetchAllGrades = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/teacher/gradebook');
        
        if (!response.ok) {
          throw new Error('Failed to fetch grades data');
        }
        
        const data = await response.json();
        
        // Get all grades from all classes
        const allGrades: GradeData[] = [];
        
        if (data.classes) {
          for (const classItem of data.classes) {
            const classGradesResponse = await fetch(`/api/teacher/gradebook/class/${classItem.id}/grades`);
            if (classGradesResponse.ok) {
              const classGradesData = await classGradesResponse.json();
              if (classGradesData.grades) {
                allGrades.push(...classGradesData.grades);
              }
            }
          }
        }
        
        // Sort grades by date (newest first)
        allGrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setRecentGrades(allGrades);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching all grades:', err);
        setError('Failed to load grades data. Please try again later.');
        setIsLoading(false);
      }
    };
    
    fetchAllGrades();
  }, [session, status, router]);

  const refreshGrades = async () => {
    const fetchAllGrades = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/teacher/gradebook');
        
        if (!response.ok) {
          throw new Error('Failed to fetch grades data');
        }
        
        const data = await response.json();
        
        // Get all grades from all classes
        const allGrades: GradeData[] = [];
        
        if (data.classes) {
          for (const classItem of data.classes) {
            const classGradesResponse = await fetch(`/api/teacher/gradebook/class/${classItem.id}/grades`);
            if (classGradesResponse.ok) {
              const classGradesData = await classGradesResponse.json();
              if (classGradesData.grades) {
                allGrades.push(...classGradesData.grades);
              }
            }
          }
        }
        
        // Sort grades by date (newest first)
        allGrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setRecentGrades(allGrades);
        setIsLoading(false);
      } catch (err) {
        console.error('Error refreshing grades:', err);
        setError('Failed to refresh data. Please try again later.');
        setIsLoading(false);
      }
    };
    
    fetchAllGrades();
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
        <h1 className="text-3xl font-bold">All Recent Grades</h1>
        <Link 
          href="/teacher/gradebook" 
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          ← Back to Gradebook
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
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
              {recentGrades.length > 0 ? (
                recentGrades.map((grade) => (
                  <tr key={grade.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{grade.student}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{grade.class}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{grade.assessment}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        grade.assessmentType === 'EXAM' ? 'bg-red-100 text-red-800' :
                        grade.assessmentType === 'ASSIGNMENT' ? 'bg-blue-100 text-blue-800' :
                        grade.assessmentType === 'QUIZ' ? 'bg-purple-100 text-purple-800' :
                        grade.assessmentType === 'PROJECT' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {grade.assessmentType}
                      </span>
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
                      <div className="text-sm font-medium text-gray-900">{grade.percentage}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(grade.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => {
                          setSelectedGradeId(grade.id);
                          setIsEditGradeModalOpen(true);
                        }} 
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Edit
                      </button>
                      <Link 
                        href={`/teacher/gradebook/grade/${grade.id}`} 
                        className="text-green-600 hover:text-green-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center">
                    <div className="text-gray-500">No grades found</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {recentGrades.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Total grades: {recentGrades.length}
            </div>
          </div>
        )}
      </div>

      {/* Edit Grade Modal */}
      <EditGradeModal
        isOpen={isEditGradeModalOpen}
        onClose={() => {
          setIsEditGradeModalOpen(false);
          setSelectedGradeId(null);
        }}
        onSuccess={refreshGrades}
        gradeId={selectedGradeId}
      />
    </div>
  );
}