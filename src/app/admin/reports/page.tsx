'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// Type for student data
type Student = {
  id: string;
  studentId: string;
  name: string;
  email?: string;
};

// Type for student report
type StudentReport = {
  studentInfo: {
    id: string;
    studentId: string;
    name: string;
    email: string;
    academicLevel?: string;
    enrollmentDate: Date;
  };
  enrolledClasses: Array<{
    className: string;
    subject: string;
    enrollmentDate: string;
    status: string;
    teacherName: string;
  }>;
  attendance: Array<{
    className: string;
    subject: string;
    present: number;
    total: number;
    percentage: number;
  }>;
  grades: Array<{
    className: string;
    subject: string;
    assessments: Array<{
      name: string;
      type: string;
      score: number;
      maxScore: number;
      percentage: number;
      weight: number;
      feedback?: string;
      date: Date;
    }>;
    overallGrade: {
      letter: string;
      percentage: number;
      gpa: number;
    };
  }>;
  overallPerformance: {
    enrolledClasses: number;
    averageAttendance: number;
    averageGrade: number;
    averageGPA: number;
  };
  generatedAt: string;
};

export default function StudentReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reportFormat, setReportFormat] = useState('pdf');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [studentReport, setStudentReport] = useState<StudentReport | null>(null);
  const [previewMode, setPreviewMode] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    fetchStudents();
  }, [session, status, router]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/students');
      if (!response.ok) throw new Error('Failed to fetch students');
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    if (!selectedStudentId) {
      toast.error('Please select a student');
      return;
    }

    setIsGeneratingReport(true);
    try {
      const response = await fetch(`/api/reports/student/${selectedStudentId}`);
      if (!response.ok) throw new Error('Failed to generate report');
      const reportData = await response.json();
      setStudentReport(reportData);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const downloadReport = async () => {
    if (!selectedStudentId) {
      toast.error('Please select a student');
      return;
    }

    setIsGeneratingReport(true);
    try {
      const response = await fetch(`/api/reports/student/${selectedStudentId}?format=${reportFormat}`);
      if (!response.ok) throw new Error('Failed to download report');
      
      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student-report-${reportFormat === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Report downloaded as ${reportFormat.toUpperCase()}`);
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    } finally {
      setIsGeneratingReport(false);
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
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <Link href="/admin" className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl shadow-lg p-8 mb-10 border border-gray-100">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
            <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Student Progress Report
          </h2>
          <p className="text-gray-500">Generate detailed performance reports for individual students</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Student Selection */}
            <div className="col-span-1 md:col-span-2 xl:col-span-2">
              <label htmlFor="student-select" className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  Select Student
                </span>
              </label>
              <div className="relative">
                <select
                  id="student-select"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 rounded-lg bg-white border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                >
                  <option value="">Select a student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.studentId})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Format Selection */}
            <div>
              <label htmlFor="format-select" className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Format
                </span>
              </label>
              <div className="relative">
                <select
                  id="format-select"
                  value={reportFormat}
                  onChange={(e) => setReportFormat(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 rounded-lg bg-white border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="excel">Excel Spreadsheet</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col space-y-3 sm:space-y-0 md:space-y-3 sm:space-x-3 md:space-x-0 justify-center">
              <button
                onClick={generateReport}
                disabled={isGeneratingReport || !selectedStudentId}
                className="flex-1 inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                {isGeneratingReport ? 'Generating...' : 'Generate Report'}
              </button>
              <button
                onClick={downloadReport}
                disabled={isGeneratingReport || !selectedStudentId || !studentReport}
                className="flex-1 inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Download as {reportFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </div>

        {/* Report Preview */}
        {studentReport && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Report Preview</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPreviewMode(true)}
                  className={`px-3 py-1 text-sm rounded ${previewMode ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setPreviewMode(false)}
                  className={`px-3 py-1 text-sm rounded ${!previewMode ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Details
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              {/* Student Info */}
              <div className="mb-6">
                <h4 className="text-md font-semibold mb-2">Student Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{studentReport.studentInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Student ID</p>
                    <p className="font-medium">{studentReport.studentInfo.studentId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{studentReport.studentInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Academic Level</p>
                    <p className="font-medium">{studentReport.studentInfo.academicLevel || 'Not specified'}</p>
                  </div>
                </div>
              </div>
              
              {previewMode ? (
                <>
                  {/* Overall Performance Summary */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold mb-2">Overall Performance</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-500">Enrolled Classes</p>
                        <p className="text-xl font-semibold">{studentReport.overallPerformance.enrolledClasses}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-500">Average Attendance</p>
                        <p className="text-xl font-semibold">{studentReport.overallPerformance.averageAttendance}%</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-500">Average Grade</p>
                        <p className="text-xl font-semibold">{studentReport.overallPerformance.averageGrade}%</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-500">Average GPA</p>
                        <p className="text-xl font-semibold">{studentReport.overallPerformance.averageGPA}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Classes Summary */}
                  <div>
                    <h4 className="text-md font-semibold mb-2">Class Performance Summary</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {studentReport.grades.map((grade) => {
                            const attendanceRecord = studentReport.attendance.find(a => a.className === grade.className);
                            return (
                              <tr key={grade.className}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{grade.className}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grade.subject}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    grade.overallGrade.letter === 'A' ? 'bg-green-100 text-green-800' :
                                    grade.overallGrade.letter === 'B' ? 'bg-blue-100 text-blue-800' :
                                    grade.overallGrade.letter === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                    grade.overallGrade.letter === 'D' ? 'bg-orange-100 text-orange-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {grade.overallGrade.letter} ({grade.overallGrade.percentage}%)
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {attendanceRecord ? `${attendanceRecord.percentage}% (${attendanceRecord.present}/${attendanceRecord.total})` : 'N/A'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Detailed View */}
                  {/* Enrolled Classes */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold mb-2">Enrolled Classes</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {studentReport.enrolledClasses.map((enrollment, i) => (
                            <tr key={i}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{enrollment.className}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{enrollment.subject}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{enrollment.teacherName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  enrollment.status === 'enrolled' ? 'bg-green-100 text-green-800' :
                                  enrollment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {enrollment.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Attendance Details */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold mb-2">Attendance Records</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sessions</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Rate</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {studentReport.attendance.map((record, i) => (
                            <tr key={i}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.className}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.subject}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.present}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.total}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${record.percentage}%` }}></div>
                                  </div>
                                  <span className="ml-2 text-sm">{record.percentage}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Detailed Grades */}
                  <div>
                    <h4 className="text-md font-semibold mb-2">Grade Details</h4>
                    {studentReport.grades.map((grade, i) => (
                      <div key={i} className="mb-6 bg-white p-4 rounded-lg shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium">{grade.className} - {grade.subject}</h5>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            grade.overallGrade.letter === 'A' ? 'bg-green-100 text-green-800' :
                            grade.overallGrade.letter === 'B' ? 'bg-blue-100 text-blue-800' :
                            grade.overallGrade.letter === 'C' ? 'bg-yellow-100 text-yellow-800' :
                            grade.overallGrade.letter === 'D' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {grade.overallGrade.letter} ({grade.overallGrade.percentage}%)
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Score</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {grade.assessments.map((assessment, j) => (
                                <tr key={j}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{assessment.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.type}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.score}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.maxScore}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.weight}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.percentage}%</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(assessment.date).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              <div className="mt-6 text-right">
                <p className="text-xs text-gray-500">
                  Report generated on {new Date(studentReport.generatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
