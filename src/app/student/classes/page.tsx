'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface Class {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  schedule: string | null; // Legacy field, keeping for compatibility
  room: string | null; // Legacy field, keeping for compatibility
  teacher: {
    user: {
      name: string | null;
    }
  } | null;
  startDate: string;
  endDate: string | null;
  enrollmentStatus: 'enrolled' | 'pending' | 'completed' | 'withdrawn' | 'enrollment_pending' | 'withdrawal_pending';
  enrollmentId?: string;
  enrollmentRequestId?: string;
  withdrawalRequestId?: string;
  requestStatus?: string | null;
  // New fields for better display
  schedulesDisplay?: string;
  formattedRoom?: string;
}

export default function StudentClasses() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [withdrawingClassId, setWithdrawingClassId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [classToWithdraw, setClassToWithdraw] = useState<{id: string, name: string} | null>(null);

  // Function to open the withdrawal modal
  const openWithdrawalModal = (enrollmentId: string | undefined, className: string) => {
    if (!enrollmentId) {
      setError("Cannot withdraw: Missing enrollment information");
      return;
    }
    
    // Set class to withdraw and open modal
    setClassToWithdraw({ id: enrollmentId, name: className });
    setWithdrawalReason(''); // Reset reason field
    setIsWithdrawalModalOpen(true);
  };
  
  // Function to handle class withdrawal submission
  const handleWithdrawSubmit = async () => {
    if (!classToWithdraw || !classToWithdraw.id) {
      setError("Cannot withdraw: Missing enrollment information");
      return;
    }
    
    const enrollmentId = classToWithdraw.id;
    const className = classToWithdraw.name;
    
    try {
      setWithdrawingClassId(enrollmentId);
      setError(null);
      setIsWithdrawalModalOpen(false);
      
      const response = await fetch('/api/student/classes/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          enrollmentId,
          reason: withdrawalReason.trim() || 'No reason provided'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to withdraw from class');
      }

      // Update the class list
      setClasses(prevClasses => 
        prevClasses.map(c => 
          c.enrollmentId === enrollmentId 
            ? { ...c, enrollmentStatus: 'withdrawal_pending' as const } 
            : c
        )
      );

      setSuccessMessage(`Your withdrawal request for ${className} has been submitted and is pending admin approval.`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error('Error withdrawing from class:', err);
      setError(`Failed to withdraw from class. ${err instanceof Error ? err.message : ''}`);
    } finally {
      setWithdrawingClassId(null);
      setClassToWithdraw(null);
    }
  };

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

    // Fetch student's classes
    const fetchClasses = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/student/classes');
        
        if (!response.ok) {
          // Try to get more detailed error information
          let errorMessage = 'Failed to fetch classes';
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
        console.log('Classes fetched successfully:', data.length);
        setClasses(data);
        setError(null); // Clear any previous errors
      } catch (err) {
        console.error('Error fetching classes:', err);
        setError(`Failed to load classes. Please try again later. ${err instanceof Error ? err.message : ''}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, [session, status, router]);

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
        <h1 className="text-3xl font-bold">My Classes</h1>
        <Link href="/student" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((classItem) => (
          <div key={classItem.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-indigo-600 text-white px-4 py-2">
              <h2 className="text-xl font-semibold">{classItem.name}</h2>
              <p className="text-indigo-100">{classItem.subject}</p>
              <div className="mt-1">
                {classItem.enrollmentStatus === 'enrolled' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ You are enrolled in this class
                  </span>
                )}
                {classItem.enrollmentStatus === 'pending' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    ⏳ Pending
                  </span>
                )}
                {classItem.enrollmentStatus === 'enrollment_pending' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    ⏳ Enrollment Pending Approval
                  </span>
                )}
                {classItem.enrollmentStatus === 'withdrawal_pending' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    ⏳ Withdrawal Pending Approval
                  </span>
                )}
                {classItem.enrollmentStatus === 'completed' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ✓ Completed
                  </span>
                )}
                {classItem.enrollmentStatus === 'withdrawn' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    ✗ Withdrawn
                  </span>
                )}
              </div>
            </div>
            <div className="p-4">
              <p className="text-gray-700 mb-2">{classItem.description}</p>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">{classItem.name}</h3>
                  <span className="text-gray-600">{classItem.schedulesDisplay || classItem.schedule || 'Not scheduled'}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-24">Room:</span>
                  <span className="text-gray-600">{classItem.formattedRoom || classItem.room || 'Not assigned'}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-24">Teacher:</span>
                  <span className="text-gray-600">{classItem.teacher?.user.name || 'Not assigned'}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-24">Period:</span>
                  <span className="text-gray-600">
                    {new Date(classItem.startDate).toLocaleDateString()} - 
                    {classItem.endDate ? new Date(classItem.endDate).toLocaleDateString() : 'Ongoing'}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-2">
                {classItem.enrollmentStatus === 'enrolled' && (
                  <button 
                    onClick={() => openWithdrawalModal(classItem.enrollmentId, classItem.name)}
                    disabled={withdrawingClassId === classItem.enrollmentId}
                    className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {withdrawingClassId === classItem.enrollmentId ? 'Processing...' : 'Request Withdrawal'}
                  </button>
                )}
                {classItem.enrollmentStatus === 'withdrawal_pending' && (
                  <span className="bg-orange-50 text-orange-700 px-4 py-2 rounded inline-flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Withdrawal Pending Approval
                  </span>
                )}
                {classItem.enrollmentStatus === 'enrollment_pending' && (
                  <span className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded inline-flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Enrollment Pending Approval
                  </span>
                )}
                {['enrolled', 'completed', 'withdrawal_pending', 'enrollment_pending'].includes(classItem.enrollmentStatus) ? (
                  <button 
                    className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded hover:bg-indigo-200 transition-colors"
                    onClick={() => {
                      setSelectedClass(classItem);
                      setIsModalOpen(true);
                    }}
                  >
                    View Details
                  </button>
                ) : (
                  <Link 
                    href={`/classes/enroll/${classItem.id}`}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
                  >
                    Enroll
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {classes.length === 0 && !error && (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Classes Found</h3>
          <p className="text-gray-500">You haven't enrolled in any classes yet.</p>
        </div>
      )}

      {/* Withdrawal Reason Modal */}
      <Transition appear show={isWithdrawalModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsWithdrawalModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-bold leading-6 text-gray-900 mb-4"
                  >
                    Request Withdrawal
                  </Dialog.Title>
                  
                  {classToWithdraw && (
                    <div className="mt-2">
                      <p className="text-gray-600 mb-4">
                        You are about to request withdrawal from <span className="font-semibold">{classToWithdraw.name}</span>. Please provide a reason for your withdrawal request.
                      </p>
                      
                      <div className="mt-4">
                        <label htmlFor="withdrawalReason" className="block text-sm font-medium text-gray-700 mb-1">
                          Withdrawal Reason <span className="text-gray-400 text-xs">(Optional)</span>
                        </label>
                        <textarea
                          id="withdrawalReason"
                          name="withdrawalReason"
                          rows={4}
                          className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Please explain why you wish to withdraw from this class..."
                          value={withdrawalReason}
                          onChange={(e) => setWithdrawalReason(e.target.value)}
                        />
                      </div>

                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                          onClick={() => setIsWithdrawalModalOpen(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                          onClick={handleWithdrawSubmit}
                        >
                          Confirm Withdrawal
                        </button>
                      </div>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* Class Details Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  {selectedClass && (
                    <>
                      <Dialog.Title
                        as="h3"
                        className="text-2xl font-bold leading-6 text-gray-900 mb-4"
                      >
                        {selectedClass.name} - {selectedClass.subject}
                      </Dialog.Title>
                      
                      <div className="mt-4 space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-700">Description</h4>
                          <p className="text-gray-600">{selectedClass.description || 'No description available'}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-700">Schedules</h4>
                            <p className="text-gray-600">{selectedClass.schedulesDisplay || selectedClass.schedule || 'Not scheduled'}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-700">Room</h4>
                            <p className="text-gray-600">{selectedClass.formattedRoom || selectedClass.room || 'Not assigned'}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-700">Teacher</h4>
                            <p className="text-gray-600">{selectedClass.teacher?.user.name || 'Not assigned'}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-700">Class Period</h4>
                            <p className="text-gray-600">
                              {new Date(selectedClass.startDate).toLocaleDateString()} - 
                              {selectedClass.endDate ? new Date(selectedClass.endDate).toLocaleDateString() : 'Ongoing'}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-700">Status</h4>
                            <p className="text-gray-600 capitalize">
                              {selectedClass.enrollmentStatus.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                          onClick={() => setIsModalOpen(false)}
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
