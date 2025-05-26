'use client';

interface EnrollmentStatusBadgeProps {
  status: string | null;
}

export default function EnrollmentStatusBadge({ status }: EnrollmentStatusBadgeProps) {
  if (!status) return null;
  
  switch (status) {
    case 'enrolled':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
          </svg>
          Enrolled
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-sm">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Pending
        </span>
      );
    case 'enrollment_pending':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-sm">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Pending Approval
        </span>
      );
    case 'withdrawal_pending':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Withdrawal Pending
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
          </svg>
          Completed
        </span>
      );
    case 'withdrawn':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          Withdrawn
        </span>
      );
    default:
      return null;
  }
}
