'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Grade {
  id: string;
  assessmentName: string;
  assessmentType: string;
  score: number;
  maxScore: number;
  weight: number;
  feedback: string | null;
  gradedDate: string;
  class: {
    name: string;
    subject: string;
  };
}

interface ClassGradeSummary {
  className: string;
  subject: string;
  averageGrade: number;
  letterGrade: string;
  grades: Grade[];
}

export default function StudentGrades() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [classSummaries, setClassSummaries] = useState<ClassGradeSummary[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user.role !== 'STUDENT') {
      router.push('/');
      return;
    }

    // Fetch student's grades
    const fetchGrades = async () => {
      try {
        // In a real app, this would be an API call
        // const response = await fetch('/api/student/grades');
        // if (!response.ok) throw new Error('Failed to fetch grades');
        // const data = await response.json();
        
        // For demo purposes, using sample data
        const sampleGrades: Grade[] = [
          {
            id: '1',
            assessmentName: 'Midterm Exam',
            assessmentType: 'exam',
            score: 85,
            maxScore: 100,
            weight: 0.3,
            feedback: 'Good work on the problem-solving section!',
            gradedDate: '2025-03-15T00:00:00.000Z',
            class: {
              name: 'Mathematics 101',
              subject: 'Mathematics'
            }
          },
          {
            id: '2',
            assessmentName: 'Homework 1',
            assessmentType: 'assignment',
            score: 18,
            maxScore: 20,
            weight: 0.1,
            feedback: null,
            gradedDate: '2025-02-10T00:00:00.000Z',
            class: {
              name: 'Mathematics 101',
              subject: 'Mathematics'
            }
          },
          {
            id: '3',
            assessmentName: 'Quiz 1',
            assessmentType: 'quiz',
            score: 9,
            maxScore: 10,
            weight: 0.1,
            feedback: 'Perfect!',
            gradedDate: '2025-02-20T00:00:00.000Z',
            class: {
              name: 'Mathematics 101',
              subject: 'Mathematics'
            }
          },
          {
            id: '4',
            assessmentName: 'Lab Report 1',
            assessmentType: 'assignment',
            score: 42,
            maxScore: 50,
            weight: 0.2,
            feedback: 'Good analysis, but conclusion needs more detail.',
            gradedDate: '2025-02-25T00:00:00.000Z',
            class: {
              name: 'Physics Fundamentals',
              subject: 'Physics'
            }
          },
          {
            id: '5',
            assessmentName: 'Midterm Exam',
            assessmentType: 'exam',
            score: 78,
            maxScore: 100,
            weight: 0.3,
            feedback: 'Review thermodynamics concepts.',
            gradedDate: '2025-03-18T00:00:00.000Z',
            class: {
              name: 'Physics Fundamentals',
              subject: 'Physics'
            }
          },
          {
            id: '6',
            assessmentName: 'Historical Essay',
            assessmentType: 'assignment',
            score: 92,
            maxScore: 100,
            weight: 0.25,
            feedback: 'Excellent research and analysis!',
            gradedDate: '2025-03-05T00:00:00.000Z',
            class: {
              name: 'World History',
              subject: 'History'
            }
          },
          {
            id: '7',
            assessmentName: 'Quiz 1',
            assessmentType: 'quiz',
            score: 18,
            maxScore: 20,
            weight: 0.1,
            feedback: null,
            gradedDate: '2025-02-15T00:00:00.000Z',
            class: {
              name: 'World History',
              subject: 'History'
            }
          }
        ];
        
        // Group grades by class and calculate averages
        const gradesByClass: Record<string, Grade[]> = {};
        sampleGrades.forEach(grade => {
          const className = grade.class.name;
          if (!gradesByClass[className]) {
            gradesByClass[className] = [];
          }
          gradesByClass[className].push(grade);
        });
        
        // Calculate class summaries
        const summaries: ClassGradeSummary[] = Object.keys(gradesByClass).map(className => {
          const classGrades = gradesByClass[className];
          let totalWeightedScore = 0;
          let totalWeight = 0;
          
          classGrades.forEach(grade => {
            const weightedScore = (grade.score / grade.maxScore) * grade.weight;
            totalWeightedScore += weightedScore;
            totalWeight += grade.weight;
          });
          
          const averageGrade = totalWeight > 0 
            ? (totalWeightedScore / totalWeight) * 100 
            : 0;
          
          // Determine letter grade
          let letterGrade = 'N/A';
          if (averageGrade >= 90) letterGrade = 'A';
          else if (averageGrade >= 80) letterGrade = 'B';
          else if (averageGrade >= 70) letterGrade = 'C';
          else if (averageGrade >= 60) letterGrade = 'D';
          else if (averageGrade > 0) letterGrade = 'F';
          
          return {
            className,
            subject: classGrades[0].class.subject,
            averageGrade,
            letterGrade,
            grades: classGrades
          };
        });
        
        setClassSummaries(summaries);
        if (summaries.length > 0 && !selectedClass) {
          setSelectedClass(summaries[0].className);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching grades:', err);
        setError('Failed to load grades. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchGrades();
  }, [session, status, router]);

  const selectedClassSummary = selectedClass 
    ? classSummaries.find(summary => summary.className === selectedClass) 
    : null;

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getAssessmentTypeIcon = (type: string) => {
    switch (type) {
      case 'exam':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
        );
      case 'quiz':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        );
      case 'assignment':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
          </svg>
        );
      case 'project':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
          </svg>
        );
    }
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
        <h1 className="text-3xl font-bold">My Grades</h1>
        <Link href="/student" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {classSummaries.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-indigo-600 text-white px-4 py-3">
                <h2 className="text-lg font-semibold">My Classes</h2>
              </div>
              <div className="divide-y">
                {classSummaries.map(summary => (
                  <button
                    key={summary.className}
                    onClick={() => setSelectedClass(summary.className)}
                    className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex justify-between items-center ${
                      selectedClass === summary.className ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div>
                      <p className="font-medium">{summary.className}</p>
                      <p className="text-sm text-gray-500">{summary.subject}</p>
                    </div>
                    <div className={`font-bold ${getGradeColor(summary.averageGrade)}`}>
                      {summary.letterGrade}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {selectedClassSummary ? (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedClassSummary.className}</h2>
                    <p className="text-indigo-100">{selectedClassSummary.subject}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-indigo-100">Overall Grade</p>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold">{selectedClassSummary.letterGrade}</span>
                      <span className="text-indigo-100 ml-2">
                        ({selectedClassSummary.averageGrade.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Assessments</h3>
                  <div className="space-y-4">
                    {selectedClassSummary.grades.map(grade => (
                      <div key={grade.id} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                          <div className="flex items-center">
                            {getAssessmentTypeIcon(grade.assessmentType)}
                            <span className="ml-2 font-medium">{grade.assessmentName}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(grade.gradedDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <span className="text-gray-600 text-sm">Score: </span>
                              <span className="font-medium">
                                {grade.score} / {grade.maxScore}
                              </span>
                              <span className="text-sm text-gray-500 ml-2">
                                ({((grade.score / grade.maxScore) * 100).toFixed(1)}%)
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              Weight: {(grade.weight * 100).toFixed(0)}%
                            </div>
                          </div>
                          {grade.feedback && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium text-gray-700">Feedback: </span>
                              <span className="text-gray-600">{grade.feedback}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500">Select a class to view grades.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Grades Found</h3>
          <p className="text-gray-500">You don't have any grades recorded yet.</p>
        </div>
      )}
    </div>
  );
}
