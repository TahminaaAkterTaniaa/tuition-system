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
        
        // Use the direct-check endpoint to check enrollment status
        const response = await fetch(`/api/enrollment/direct-check?userId=${userId}&classId=${classId}`);
        const data = await response.json();
        
        console.log(`Enrollment check for class ${classId}:`, data);
        
        if (data.success && data.enrollments && data.enrollments.length > 0) {
          // Student is enrolled in this class
          setEnrollmentStatus(data.enrollments[0].status);
        } else {
          // Student is not enrolled
          setEnrollmentStatus(null);
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
      <div className="text-green-600 font-semibold">
        ✓ You are enrolled in this class
      </div>
    );
  }

  if (enrollmentStatus === 'completed') {
    return (
      <div className="text-blue-600 font-semibold">
        ✓ You have completed this class
      </div>
    );
  }

  if (enrollmentStatus === 'pending') {
    return (
      <div className="text-yellow-600 font-semibold">
        Your enrollment is pending
      </div>
    );
  }

  // Not enrolled - show enrollment button
  return (
    <Link
      href={`/classes/enroll/${classId}`}
      className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition duration-300"
    >
      Start Enrollment
    </Link>
  );
}
