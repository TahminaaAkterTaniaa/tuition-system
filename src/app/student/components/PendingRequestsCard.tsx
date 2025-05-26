'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface PendingRequest {
  id: string;
  status: string;
  createdAt: string;
  class: {
    id: string;
    name: string;
    subject: string;
    teacher: {
      user: {
        name: string | null;
      };
    } | null;
  };
}

interface PendingRequestsResponse {
  success: boolean;
  enrollmentRequests: PendingRequest[];
  withdrawalRequests: PendingRequest[];
  error?: string;
}

export default function PendingRequestsCard() {
  const [isLoading, setIsLoading] = useState(true);
  const [enrollmentRequests, setEnrollmentRequests] = useState<PendingRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<PendingRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/student/pending-requests');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch pending requests: ${response.status}`);
        }
        
        const data: PendingRequestsResponse = await response.json();
        
        if (data.success) {
          setEnrollmentRequests(data.enrollmentRequests || []);
          setWithdrawalRequests(data.withdrawalRequests || []);
          setError(null);
        } else {
          setError(data.error || 'Failed to load pending requests');
        }
      } catch (err) {
        console.error('Error fetching pending requests:', err);
        setError('Failed to load pending requests. Please try again later.');
        toast.error('Failed to load pending requests');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingRequests();
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalPendingRequests = enrollmentRequests.length + withdrawalRequests.length;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 h-[300px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Pending Requests</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 h-[300px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Pending Requests</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (totalPendingRequests === 0) {
    return null; // Don't show the card if there are no pending requests
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 h-[300px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Pending Requests</h2>
        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
          {totalPendingRequests} pending
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        <div className="space-y-3 pr-2">
          {enrollmentRequests.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Enrollment Requests</h3>
              <div className="space-y-3">
                {enrollmentRequests.map((request) => (
                  <div key={`enroll-${request.id}`} className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50 rounded-r">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{request.class.name}</p>
                        <p className="text-xs text-gray-600">
                          {request.class.subject} • {request.class.teacher?.user?.name || 'Teacher not assigned'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Requested on {formatDate(request.createdAt)}
                        </p>
                      </div>
                      <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded self-center">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {withdrawalRequests.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Withdrawal Requests</h3>
              <div className="space-y-3">
                {withdrawalRequests.map((request) => (
                  <div key={`withdraw-${request.id}`} className="border-l-4 border-orange-500 pl-3 py-2 bg-gray-50 rounded-r">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{request.class.name}</p>
                        <p className="text-xs text-gray-600">
                          {request.class.subject} • {request.class.teacher?.user?.name || 'Teacher not assigned'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Requested on {formatDate(request.createdAt)}
                        </p>
                      </div>
                      <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded self-center">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500 pt-2 border-t">
        You'll be notified when your requests are processed.
      </div>
    </div>
  );
}
