'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ClassData {
  id: string;
  name: string;
  subject: string;
  description: string | null;
}

interface Assessment {
  name: string;
  type: string;
  date: string | null;
}

interface Grade {
  id: string;
  score: number;
  maxScore: number;
  percentage: number;
  letterGrade: string;
  feedback: string | null;
  gradedDate: string | null;
}

interface GradeByAssessment {
  assessmentName: string;
  grade: Grade | null;
}

interface Student {
  id: string;
  name: string;
  email: string;
  image: string | null;
  avgGrade: string;
  avgPercentage: number;
  grades: GradeByAssessment[];
}

interface ClassGradeData {
  class: ClassData;
  assessments: Assessment[];
  students: Student[];
}

export default function ClassGradebook() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [classData, setClassData] = useState<ClassGradeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Edit grade state
  const [editMode, setEditMode] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
  const [editGrade, setEditGrade] = useState({
    score: 0,
    maxScore: 100,
    feedback: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  
  // New assessment state
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    name: '',
    type: 'Quiz',
  });
  
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

    const fetchClassGrades = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/teacher/gradebook/class/${classId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch class grades');
        }
        
        const data = await response.json();
        setClassData(data);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching class grades:', err);
        setError('Failed to load class grades. Please try again later.');
        setIsLoading(false);
      }
    };
    
    if (classId) {
      fetchClassGrades();
    }
  }, [session, status, router, classId]);
  
  const handleEditGrade = (studentId: string, assessmentName: string) => {
    if (!classData) return;
    
    const student = classData.students.find(s => s.id === studentId);
    if (!student) return;
    
    const gradeData = student.grades.find(g => g.assessmentName === assessmentName);
    
    setSelectedStudent(studentId);
    setSelectedAssessment(assessmentName);
    
    if (gradeData?.grade) {
      setEditGrade({
        score: gradeData.grade.score,
        maxScore: gradeData.grade.maxScore,
        feedback: gradeData.grade.feedback || '',
      });
    } else {
      setEditGrade({
        score: 0,
        maxScore: 100,
        feedback: '',
      });
    }
    
    setEditMode(true);
  };
  
  const handleCancelEdit = () => {
    setEditMode(false);
    setSelectedStudent(null);
    setSelectedAssessment(null);
    setEditGrade({
      score: 0,
      maxScore: 100,
      feedback: '',
    });
  };
  
  const handleSaveGrade = async () => {
    if (!selectedStudent || !selectedAssessment || !classData) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const student = classData.students.find(s => s.id === selectedStudent);
      if (!student) throw new Error('Student not found');
      
      const gradeData = student.grades.find(g => g.assessmentName === selectedAssessment);
      const gradeId = gradeData?.grade?.id;
      
      const response = await fetch('/api/teacher/gradebook/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gradeId,
          studentId: selectedStudent,
          classId,
          assessmentName: selectedAssessment,
          assessmentType: classData.assessments.find(a => a.name === selectedAssessment)?.type || 'Quiz',
          score: Number(editGrade.score),
          maxScore: Number(editGrade.maxScore),
          feedback: editGrade.feedback,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update grade');
      }
      
      // Refresh the data
      const refreshResponse = await fetch(`/api/teacher/gradebook/class/${classId}`);
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setClassData(refreshData);
      }
      
      setSuccess('Grade updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Reset edit state
      setEditMode(false);
      setSelectedStudent(null);
      setSelectedAssessment(null);
      
    } catch (err) {
      console.error('Error updating grade:', err);
      setError('Failed to update grade. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAddAssessment = async () => {
    if (!newAssessment.name || !classData) return;
    
    setShowNewAssessment(false);
    
    // We don't need to create the assessment separately
    // It will be created when the first grade is added
    
    // Reset form
    setNewAssessment({
      name: '',
      type: 'Quiz',
    });
    
    // Show success message
    setSuccess('Assessment added! Now you can add grades for students.');
    setTimeout(() => setSuccess(null), 3000);
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
          <div className="mt-4">
            <Link href="/teacher/gradebook" className="text-red-700 font-medium hover:text-red-800">
              Return to Gradebook
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!classData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Notice: </strong>
          <span className="block sm:inline">No class data found for this ID.</span>
          <div className="mt-4">
            <Link href="/teacher/gradebook" className="text-yellow-700 font-medium hover:text-yellow-800">
              Return to Gradebook
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{classData.class.name} Gradebook</h1>
          <p className="text-gray-600 mt-1">{classData.class.subject}</p>
        </div>
        <Link 
          href="/teacher/gradebook"
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
        >
          Back to Gradebook
        </Link>
      </div>
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-6" role="alert">
          <span className="block sm:inline">{success}</span>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Class Grades</h2>
          <button
            onClick={() => setShowNewAssessment(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Add Assessment
          </button>
        </div>
        
        {showNewAssessment && (
          <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="text-lg font-medium mb-3">New Assessment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="assessmentName" className="block text-sm font-medium text-gray-700 mb-1">
                  Assessment Name *
                </label>
                <input
                  type="text"
                  id="assessmentName"
                  value={newAssessment.name}
                  onChange={(e) => setNewAssessment({ ...newAssessment, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., Midterm Exam"
                  required
                />
              </div>
              <div>
                <label htmlFor="assessmentType" className="block text-sm font-medium text-gray-700 mb-1">
                  Assessment Type *
                </label>
                <select
                  id="assessmentType"
                  value={newAssessment.type}
                  onChange={(e) => setNewAssessment({ ...newAssessment, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                >
                  <option value="Quiz">Quiz</option>
                  <option value="Test">Test</option>
                  <option value="Exam">Exam</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Project">Project</option>
                  <option value="Homework">Homework</option>
                  <option value="Participation">Participation</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-4 space-x-3">
              <button
                onClick={() => setShowNewAssessment(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAssessment}
                disabled={!newAssessment.name}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                Add Assessment
              </button>
            </div>
          </div>
        )}
        
        {editMode && selectedStudent && selectedAssessment && (
          <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="text-lg font-medium mb-3">
              Edit Grade: {classData.students.find(s => s.id === selectedStudent)?.name} - {selectedAssessment}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="score" className="block text-sm font-medium text-gray-700 mb-1">
                  Score *
                </label>
                <input
                  type="number"
                  id="score"
                  value={editGrade.score}
                  onChange={(e) => setEditGrade({ ...editGrade, score: Number(e.target.value) })}
                  min="0"
                  max={editGrade.maxScore}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="maxScore" className="block text-sm font-medium text-gray-700 mb-1">
                  Max Score *
                </label>
                <input
                  type="number"
                  id="maxScore"
                  value={editGrade.maxScore}
                  onChange={(e) => setEditGrade({ ...editGrade, maxScore: Number(e.target.value) })}
                  min="1"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="percentage" className="block text-sm font-medium text-gray-700 mb-1">
                  Percentage
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm">
                  {editGrade.maxScore > 0 ? Math.round((editGrade.score / editGrade.maxScore) * 100) : 0}%
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
                Feedback
              </label>
              <textarea
                id="feedback"
                value={editGrade.feedback}
                onChange={(e) => setEditGrade({ ...editGrade, feedback: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Optional feedback for the student"
              />
            </div>
            <div className="flex justify-end mt-4 space-x-3">
              <button
                onClick={handleCancelEdit}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGrade}
                disabled={isSubmitting || editGrade.score < 0 || editGrade.maxScore <= 0 || editGrade.score > editGrade.maxScore}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Grade'}
              </button>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                  Student
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average
                </th>
                {classData.assessments.map((assessment) => (
                  <th key={assessment.name} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {assessment.name}
                    <span className="block text-gray-400 normal-case">{assessment.type}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classData.students.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      student.avgGrade.startsWith('A') ? 'bg-green-100 text-green-800' :
                      student.avgGrade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                      student.avgGrade.startsWith('C') ? 'bg-yellow-100 text-yellow-800' :
                      student.avgGrade.startsWith('D') ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {student.avgGrade} ({student.avgPercentage}%)
                    </span>
                  </td>
                  {student.grades.map((gradeItem) => (
                    <td key={`${student.id}-${gradeItem.assessmentName}`} className="px-6 py-4 whitespace-nowrap">
                      {gradeItem.grade ? (
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            gradeItem.grade.letterGrade.startsWith('A') ? 'bg-green-100 text-green-800' :
                            gradeItem.grade.letterGrade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                            gradeItem.grade.letterGrade.startsWith('C') ? 'bg-yellow-100 text-yellow-800' :
                            gradeItem.grade.letterGrade.startsWith('D') ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {gradeItem.grade.score}/{gradeItem.grade.maxScore} ({gradeItem.grade.percentage}%)
                          </span>
                          <button
                            onClick={() => handleEditGrade(student.id, gradeItem.assessmentName)}
                            className="ml-2 text-indigo-600 hover:text-indigo-900"
                            title="Edit grade"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditGrade(student.id, gradeItem.assessmentName)}
                          className="text-gray-500 hover:text-indigo-600"
                          title="Add grade"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
