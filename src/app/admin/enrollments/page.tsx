'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface EnrollmentApplication {
  id: string;
  studentId: string;
  classId: string;
  enrollmentDate: string;
  status: string;
  notes: string;
  student: {
    user: {
      name: string;
      email: string;
    };
  };
  class: {
    name: string;
    subject: string;
  };
  applicationDetails?: {
    fullName: string;
    email: string;
    phone: string;
    idNumber: string;
    emergencyContact: string;
    additionalNotes?: string;
    idDocumentPath: string;
    transcriptPath?: string;
    submittedAt: string;
  };
}

export default function AdminEnrollments() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<EnrollmentApplication[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentApplication | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    fetchEnrollments();
  }, [session, status, router, filter]);

  const fetchEnrollments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/enrollments?status=${filter}`, {
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to fetch enrollments';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // If we can't parse the error response, use the default message
        }
        
        console.error('Error response:', errorMessage);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Enrollments fetched successfully:', data.length);
      setEnrollments(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching enrollments:', err);
      setError(`Failed to load enrollments. Please try again later. ${err instanceof Error ? err.message : ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (enrollmentId: string) => {
    await processEnrollment(enrollmentId, 'approve');
  };

  const handleReject = async (enrollmentId: string) => {
    await processEnrollment(enrollmentId, 'reject');
  };

  const processEnrollment = async (enrollmentId: string, action: 'approve' | 'reject') => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/admin/enrollments/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          enrollmentId,
          action,
          comment: reviewComment
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} enrollment`);
      }
      
      const data = await response.json();
      toast.success(data.message);
      
      // Update the local state
      setEnrollments(prevEnrollments => 
        prevEnrollments.map(enrollment => 
          enrollment.id === enrollmentId 
            ? { ...enrollment, status: action === 'approve' ? 'enrolled' : 'rejected' } 
            : enrollment
        )
      );
      
      setSelectedEnrollment(null);
      setReviewComment('');
    } catch (error) {
      console.error(`Error ${action}ing enrollment:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${action} enrollment`);
    } finally {
      setIsProcessing(false);
    }
  };

  const viewEnrollmentDetails = (enrollment: EnrollmentApplication) => {
    setSelectedEnrollment(enrollment);
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
        <h1 className="text-3xl font-bold">Enrollment Applications</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md ${filter === 'pending' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Pending
          </button>
          <button 
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-md ${filter === 'approved' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Approved
          </button>
          <button 
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-md ${filter === 'rejected' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Rejected
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {enrollments.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Enrollment Applications Found</h3>
          <p className="text-gray-500">There are no enrollment applications matching your filter criteria.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-md">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="py-3 px-4 text-left">Student</th>
                <th className="py-3 px-4 text-left">Class</th>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {enrollment.student.user.name}<br />
                    <span className="text-sm text-gray-500">{enrollment.student.user.email}</span>
                  </td>
                  <td className="py-3 px-4">
                    {enrollment.class.name}<br />
                    <span className="text-sm text-gray-500">{enrollment.class.subject}</span>
                  </td>
                  <td className="py-3 px-4">
                    {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      enrollment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      enrollment.status === 'enrolled' ? 'bg-green-100 text-green-800' :
                      enrollment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => viewEnrollmentDetails(enrollment)}
                      className="text-indigo-600 hover:text-indigo-800 mr-3"
                    >
                      View Details
                    </button>
                    {enrollment.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(enrollment.id)}
                          className="text-green-600 hover:text-green-800 mr-3"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(enrollment.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Enrollment Details Modal */}
      {selectedEnrollment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Enrollment Application Details
                </h2>
                <button
                  onClick={() => setSelectedEnrollment(null)}
                  className="text-gray-500 hover:text-gray-700"
                  title="Close details"
                  aria-label="Close enrollment details"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium mb-2 text-indigo-700">Student Information</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p><span className="font-medium">Name:</span> {selectedEnrollment.student.user.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedEnrollment.student.user.email}</p>
                    {selectedEnrollment.applicationDetails && (
                      <>
                        <p><span className="font-medium">Phone:</span> {selectedEnrollment.applicationDetails.phone}</p>
                        <p><span className="font-medium">ID Number:</span> {selectedEnrollment.applicationDetails.idNumber}</p>
                        <p><span className="font-medium">Emergency Contact:</span> {selectedEnrollment.applicationDetails.emergencyContact}</p>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2 text-indigo-700">Class Information</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p><span className="font-medium">Class Name:</span> {selectedEnrollment.class.name}</p>
                    <p><span className="font-medium">Subject:</span> {selectedEnrollment.class.subject}</p>
                    <p><span className="font-medium">Enrollment Date:</span> {new Date(selectedEnrollment.enrollmentDate).toLocaleDateString()}</p>
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        selectedEnrollment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedEnrollment.status === 'enrolled' ? 'bg-green-100 text-green-800' :
                        selectedEnrollment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedEnrollment.status.charAt(0).toUpperCase() + selectedEnrollment.status.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {selectedEnrollment.applicationDetails && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2 text-indigo-700">Additional Information</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p><span className="font-medium">Application Date:</span> {new Date(selectedEnrollment.applicationDetails.submittedAt).toLocaleString()}</p>
                    {selectedEnrollment.applicationDetails.additionalNotes && (
                      <div className="mt-2">
                        <p className="font-medium">Additional Notes:</p>
                        <p className="mt-1 text-gray-700">{selectedEnrollment.applicationDetails.additionalNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedEnrollment.applicationDetails && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2 text-indigo-700">Uploaded Documents</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex flex-col space-y-2">
                      <a 
                        href={`/api/admin/enrollments/document?path=${encodeURIComponent(selectedEnrollment.applicationDetails.idDocumentPath)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View ID Document
                      </a>
                      
                      {selectedEnrollment.applicationDetails.transcriptPath && (
                        <a 
                          href={`/api/admin/enrollments/document?path=${encodeURIComponent(selectedEnrollment.applicationDetails.transcriptPath)}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 flex items-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Academic Transcript
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedEnrollment.status === 'pending' && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2 text-indigo-700">Review Application</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="mb-4">
                      <label htmlFor="reviewComment" className="block text-sm font-medium text-gray-700 mb-1">
                        Comments (optional)
                      </label>
                      <textarea
                        id="reviewComment"
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Add any comments or notes about this application"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-4">
                      <button
                        onClick={() => handleReject(selectedEnrollment.id)}
                        disabled={isProcessing}
                        className={`px-4 py-2 rounded-md ${
                          isProcessing
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700'
                        } text-white`}
                      >
                        {isProcessing ? 'Processing...' : 'Reject Application'}
                      </button>
                      <button
                        onClick={() => handleApprove(selectedEnrollment.id)}
                        disabled={isProcessing}
                        className={`px-4 py-2 rounded-md ${
                          isProcessing
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        } text-white`}
                      >
                        {isProcessing ? 'Processing...' : 'Approve Application'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
