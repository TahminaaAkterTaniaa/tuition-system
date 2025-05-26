'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EnrollmentButtonProps {
  classId: string;
  userId: string;
}

export default function EnrollmentButton({ classId, userId }: EnrollmentButtonProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkEnrollmentStatus = async () => {
      try {
        setIsLoading(true);
        
        // First check for regular enrollments
        const response = await fetch(`/api/enrollment/direct-check?userId=${userId}&classId=${classId}`);
        const data = await response.json();
        
        console.log(`Enrollment check for class ${classId}:`, data);
        
        if (data.success && data.enrollments && data.enrollments.length > 0) {
          // Student is enrolled in this class
          setEnrollmentStatus(data.enrollments[0].status);
        } else {
          // Check for pending enrollment requests
          try {
            const requestsResponse = await fetch(`/api/student/enrollment-requests?userId=${userId}&classId=${classId}`);
            const requestsData = await requestsResponse.json();
            
            console.log(`Enrollment request check for class ${classId}:`, requestsData);
            
            if (requestsData.success && requestsData.requests && requestsData.requests.length > 0) {
              // Student has a pending request for this class
              setEnrollmentStatus('enrollment_pending');
            } else {
              // Student is not enrolled and has no pending requests
              setEnrollmentStatus(null);
            }
          } catch (requestErr) {
            console.error('Error checking enrollment requests:', requestErr);
            setEnrollmentStatus(null);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Error checking enrollment status:', err);
        setError('Failed to check enrollment status');
        setEnrollmentStatus(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId && classId) {
      checkEnrollmentStatus();
    }
  }, [classId, userId]);

  if (isLoading) {
    return <div className="text-gray-500">Checking enrollment status...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (enrollmentStatus === 'enrolled') {
    return (
      <div className="inline-flex items-center text-white px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 rounded-md text-sm font-medium shadow-sm">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
        </svg>
        You are enrolled in this class
      </div>
    );
  }

  if (enrollmentStatus === 'completed') {
    return (
      <div className="inline-flex items-center text-white px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-md text-sm font-medium shadow-sm">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
        </svg>
        You have completed this class
      </div>
    );
  }

  if (enrollmentStatus === 'pending') {
    return (
      <div className="inline-flex items-center text-white px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-md text-sm font-medium shadow-sm">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Your enrollment is pending
      </div>
    );
  }

  if (enrollmentStatus === 'enrollment_pending') {
    return (
      <div className="inline-flex items-center text-white px-3 py-1.5 bg-gradient-to-r from-orange-400 to-orange-500 rounded-md text-sm font-medium shadow-sm">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Enrollment Pending Approval
      </div>
    );
  }

  if (enrollmentStatus === 'withdrawal_pending') {
    return (
      <div className="inline-flex items-center text-white px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-md text-sm font-medium shadow-sm">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Withdrawal Pending Approval
      </div>
    );
  }

  // Not enrolled - show enrollment button
  return (
    <Link
      href={`/classes/enroll/${classId}`}
      className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:from-indigo-700 hover:to-blue-700 transition-all duration-300"
    >
      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
      </svg>
      Enroll
    </Link>
  );
}
