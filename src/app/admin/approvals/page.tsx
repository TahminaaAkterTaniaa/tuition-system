'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import DocumentPreview from '@/app/components/DocumentPreview';

interface Student {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

interface Class {
  id: string;
  name: string;
  subject: string;
  teacher?: {
    user: {
      name: string;
    }
  };
}

interface EnrollmentRequest {
  id: string;
  status: string;
  requestDate: string;
  reviewedAt?: string;
  reviewNotes?: string;
  notes?: string;
  student: Student;
  class: Class;
}

interface WithdrawalRequest {
  id: string;
  status: string;
  requestDate: string;
  reason?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  student: Student;
  class: Class;
  enrollmentId: string;
}

export default function AdminApprovalsPage() {
  const [enrollmentRequests, setEnrollmentRequests] = useState<EnrollmentRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(true);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(true);
  const [processingId, setProcessingId] = useState('');
  const [activeTab, setActiveTab] = useState('enrollments');
  const [feedbackNote, setFeedbackNote] = useState('');

  // Fetch enrollment requests
  useEffect(() => {
    const fetchEnrollmentRequests = async () => {
      setIsLoadingEnrollments(true);
      try {
        const response = await fetch('/api/admin/enrollment-requests');
        if (response.ok) {
          const data = await response.json();
          setEnrollmentRequests(data);
        } else {
          toast.error('Failed to load enrollment requests');
        }
      } catch (error) {
        console.error('Error fetching enrollment requests:', error);
        toast.error('Failed to load enrollment requests');
      } finally {
        setIsLoadingEnrollments(false);
      }
    };

    fetchEnrollmentRequests();
  }, []);

  // Fetch withdrawal requests
  useEffect(() => {
    const fetchWithdrawalRequests = async () => {
      setIsLoadingWithdrawals(true);
      try {
        const response = await fetch('/api/admin/withdrawal-requests');
        if (response.ok) {
          const data = await response.json();
          setWithdrawalRequests(data);
        } else {
          toast.error('Failed to load withdrawal requests');
        }
      } catch (error) {
        console.error('Error fetching withdrawal requests:', error);
        toast.error('Failed to load withdrawal requests');
      } finally {
        setIsLoadingWithdrawals(false);
      }
    };

    fetchWithdrawalRequests();
  }, []);

  // Handle enrollment request approval/rejection
  const handleEnrollmentAction = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingId(requestId);
    try {
      const response = await fetch('/api/admin/enrollment-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          action,
          notes: feedbackNote
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Enrollment request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        
        // Remove the processed request from the list
        setEnrollmentRequests(prevRequests => 
          prevRequests.filter(req => req.id !== requestId)
        );
        
        // Reset feedback note
        setFeedbackNote('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} enrollment request`);
      }
    } catch (error: any) {
      console.error(`Error ${action}ing enrollment request:`, error);
      toast.error(error.message || `Failed to ${action} enrollment request`);
    } finally {
      setProcessingId('');
    }
  };

  // Handle withdrawal request approval/rejection
  const handleWithdrawalAction = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingId(requestId);
    try {
      const response = await fetch('/api/admin/withdrawal-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          action,
          notes: feedbackNote
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Withdrawal request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        
        // Remove the processed request from the list
        setWithdrawalRequests(prevRequests => 
          prevRequests.filter(req => req.id !== requestId)
        );
        
        // Reset feedback note
        setFeedbackNote('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} withdrawal request`);
      }
    } catch (error: any) {
      console.error(`Error ${action}ing withdrawal request:`, error);
      toast.error(error.message || `Failed to ${action} withdrawal request`);
    } finally {
      setProcessingId('');
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Student Approval Requests</h1>
        <Link 
          href="/admin" 
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          Back to Dashboard
        </Link>
      </div>

      <Tabs defaultValue="enrollments" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="enrollments" className="px-4 py-2">
            Enrollment Requests {enrollmentRequests.length > 0 && `(${enrollmentRequests.length})`}
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="px-4 py-2">
            Withdrawal Requests {withdrawalRequests.length > 0 && `(${withdrawalRequests.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enrollments">
          {isLoadingEnrollments ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : enrollmentRequests.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-500">No pending enrollment requests found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {enrollmentRequests.map((request) => (
                <div key={request.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {request.student.user.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Requested on {formatDate(request.requestDate)}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      Pending
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Class</h3>
                      <p className="text-base text-gray-900">{request.class.name}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Subject</h3>
                      <p className="text-base text-gray-900">{request.class.subject}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Teacher</h3>
                      <p className="text-base text-gray-900">{request.class.teacher?.user.name || 'Not assigned'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Student Email</h3>
                      <p className="text-base text-gray-900">{request.student.user.email}</p>
                    </div>
                  </div>
                  
                  {request.notes && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                      <p className="text-base text-gray-900">
                        {(() => {
                          try {
                            // Try to parse as JSON to check if it contains document paths
                            JSON.parse(request.notes);
                            // If parsing succeeds, return an empty string since we'll display documents separately
                            return '';
                          } catch (e) {
                            // If it's not valid JSON, display it as regular text
                            return request.notes;
                          }
                        })()}
                      </p>
                      {request.notes && (() => {
                        console.log('Document Notes:', request.notes);
                        try {
                          // Try to parse as JSON to check if it contains document paths
                          const docData = JSON.parse(request.notes);
                          console.log('Parsed Document Data:', docData);
                          // If it's valid JSON and contains document paths, render the DocumentPreview component
                          if (docData.idDocumentPath || docData.transcriptPath) {
                            return <DocumentPreview jsonData={request.notes} />;
                          }
                          // If no document paths found, show the notes as text
                          return <p className="text-base text-gray-900">{request.notes}</p>;
                        } catch (e) {
                          console.log('JSON Parse Error:', e);
                          // If it's not valid JSON, show as plain text
                          return <p className="text-base text-gray-900">{request.notes}</p>;
                        }
                      })()}
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Feedback (optional)
                    </label>
                    <textarea
                      id="feedback"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Add notes about this decision..."
                      value={feedbackNote}
                      onChange={(e) => setFeedbackNote(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleEnrollmentAction(request.id, 'approve')}
                      disabled={processingId === request.id}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                    >
                      {processingId === request.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleEnrollmentAction(request.id, 'reject')}
                      disabled={processingId === request.id}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                    >
                      {processingId === request.id ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="withdrawals">
          {isLoadingWithdrawals ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : withdrawalRequests.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-500">No pending withdrawal requests found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {withdrawalRequests.map((request) => (
                <div key={request.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {request.student.user.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Requested on {formatDate(request.requestDate)}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      Pending
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Class</h3>
                      <p className="text-base text-gray-900">{request.class.name}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Subject</h3>
                      <p className="text-base text-gray-900">{request.class.subject}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Teacher</h3>
                      <p className="text-base text-gray-900">{request.class.teacher?.user.name || 'Not assigned'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Student Email</h3>
                      <p className="text-base text-gray-900">{request.student.user.email}</p>
                    </div>
                  </div>
                  
                  {request.reason && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-500">Reason for Withdrawal</h3>
                      <p className="text-base text-gray-900">{request.reason}</p>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <label htmlFor="withdrawal-feedback" className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Feedback (optional)
                    </label>
                    <textarea
                      id="withdrawal-feedback"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Add notes about this decision..."
                      value={feedbackNote}
                      onChange={(e) => setFeedbackNote(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleWithdrawalAction(request.id, 'approve')}
                      disabled={processingId === request.id}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                    >
                      {processingId === request.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleWithdrawalAction(request.id, 'reject')}
                      disabled={processingId === request.id}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                    >
                      {processingId === request.id ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
