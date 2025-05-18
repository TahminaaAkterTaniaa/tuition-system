'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';

interface EditGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  gradeId: string | null;
}

interface Grade {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  assessmentName: string;
  assessmentType: string;
  score: number;
  maxScore: number;
  weight: number;
  feedback: string | null;
}

const EditGradeModal: React.FC<EditGradeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  gradeId
}) => {
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [grade, setGrade] = useState<Grade | null>(null);
  
  // Form state
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  
  // Fetch grade data when the modal opens
  useEffect(() => {
    if (isOpen && gradeId) {
      fetchGradeData(gradeId);
    } else {
      // Reset form when modal closes
      setGrade(null);
      setScore(0);
      setFeedback('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, gradeId]);
  
  // Fetch grade data
  const fetchGradeData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/teacher/grades/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch grade data');
      }
      
      const data = await response.json();
      setGrade(data.grade);
      
      // Set form values
      setScore(data.grade.score);
      setFeedback(data.grade.feedback || '');
      
    } catch (err) {
      console.error('Error fetching grade data:', err);
      setError('Failed to load grade data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!grade) {
      setError('No grade data available');
      return;
    }
    
    // Validate form
    if (score < 0 || score > grade.maxScore) {
      setError(`Score must be between 0 and ${grade.maxScore}`);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Prepare the data for the API call
      const gradeData = {
        score,
        feedback
      };
      
      console.log('Submitting updated grade data:', gradeData);
      
      // Make the API call to update the grade
      const response = await fetch(`/api/teacher/grades/${grade.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gradeData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update grade');
      }
      
      console.log('Grade updated successfully:', data);
      
      // Show success message
      setSuccess(true);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error updating grade:', err);
      setError(err instanceof Error ? err.message : 'Failed to update grade. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Edit Grade
                    </Dialog.Title>
                    
                    {loading && !grade ? (
                      <div className="mt-4 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                      </div>
                    ) : (
                      <>
                        {error && (
                          <div className="mt-2 rounded-md bg-red-50 p-4">
                            <div className="flex">
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <div className="mt-2 text-sm text-red-700">
                                  <p>{error}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {success && (
                          <div className="mt-2 rounded-md bg-green-50 p-4">
                            <div className="flex">
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">Success</h3>
                                <div className="mt-2 text-sm text-green-700">
                                  <p>Grade updated successfully!</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {grade && (
                          <div className="mt-4">
                            <div className="bg-gray-50 p-4 rounded-md mb-4">
                              <h4 className="text-sm font-medium text-gray-700">Grade Details</h4>
                              <div className="mt-2 grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500">Student</p>
                                  <p className="text-sm font-medium">{grade.studentName}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Class</p>
                                  <p className="text-sm font-medium">{grade.className}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Assessment</p>
                                  <p className="text-sm font-medium">{grade.assessmentName}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Type</p>
                                  <p className="text-sm font-medium">{grade.assessmentType}</p>
                                </div>
                              </div>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                              {/* Score Input */}
                              <div>
                                <label htmlFor="score" className="block text-sm font-medium text-gray-700">
                                  Score <span className="text-red-500">*</span>
                                </label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                  <input
                                    type="number"
                                    id="score"
                                    value={score}
                                    onChange={(e) => setScore(Number(e.target.value))}
                                    min="0"
                                    max={grade.maxScore}
                                    step="0.1"
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    required
                                    disabled={loading}
                                  />
                                  <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                                    / {grade.maxScore}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Feedback Input */}
                              <div>
                                <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">
                                  Feedback
                                </label>
                                <textarea
                                  id="feedback"
                                  value={feedback}
                                  onChange={(e) => setFeedback(e.target.value)}
                                  rows={3}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                  placeholder="Provide feedback to the student (optional)"
                                  disabled={loading}
                                />
                              </div>
                              
                              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                <button
                                  type="submit"
                                  className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
                                  disabled={loading}
                                >
                                  {loading ? 'Updating...' : 'Update Grade'}
                                </button>
                                <button
                                  type="button"
                                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                                  onClick={onClose}
                                  disabled={loading}
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default EditGradeModal;
