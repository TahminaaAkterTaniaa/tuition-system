import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';

type AssessmentType = 'EXAM' | 'QUIZ' | 'ASSIGNMENT' | 'PROJECT' | 'LAB' | 'HOMEWORK' | 'OTHER';

interface Class {
  id: string;
  name: string;
}

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreateAssessmentModal: React.FC<CreateAssessmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { data: session } = useSession();
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  
  // Form state
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<AssessmentType>('ASSIGNMENT');
  const [maxScore, setMaxScore] = useState<number>(100);
  const [weight, setWeight] = useState<number>(1);
  const [dueDate, setDueDate] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  
  // This useEffect is no longer needed as we're handling class fetching in the reset form useEffect
  useEffect(() => {
    // Empty dependency array to avoid duplicate fetching
  }, []);
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setType('ASSIGNMENT');
      setMaxScore(100);
      setWeight(1);
      
      // Set default due date to 7 days from now
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 7);
      const formattedDate = defaultDueDate.toISOString().split('T')[0];
      if (formattedDate) {
        setDueDate(formattedDate);
      }
      
      setError(null);
      setSuccess(false);
      
      // Fetch classes again when modal opens
      const fetchClasses = async () => {
        try {
          const response = await fetch('/api/teacher/classes');
          if (!response.ok) {
            throw new Error('Failed to fetch classes');
          }
          const data = await response.json();
          console.log('Classes API response:', data);
          
          // Check if data is an array (direct response) or has a classes property
          const classesData = Array.isArray(data) ? data : (data.classes || []);
          console.log('Classes fetched:', classesData);
          
          if (classesData.length > 0) {
            setClasses(classesData);
            
            // Set default class if available
            if (classesData[0] && classesData[0].id) {
              const firstClassId = classesData[0].id;
              if (typeof firstClassId === 'string') {
                setClassId(firstClassId);
              }
            }
          } else {
            // If no classes are returned, use mock data for development
            const mockClasses = [
              { id: 'mock-class-1', name: 'Mathematics 101' },
              { id: 'mock-class-2', name: 'Physics 101' },
              { id: 'mock-class-3', name: 'Chemistry 101' },
              { id: 'mock-class-4', name: 'Biology 101' },
            ];
            console.log('Using mock classes:', mockClasses);
            setClasses(mockClasses);
            if (mockClasses[0] && mockClasses[0].id) {
              setClassId(mockClasses[0].id);
            }
          }
        } catch (err) {
          console.error('Error fetching classes:', err);
          
          // Use mock data if there's an error
          const mockClasses = [
            { id: 'mock-class-1', name: 'Mathematics 101' },
            { id: 'mock-class-2', name: 'Physics 101' },
            { id: 'mock-class-3', name: 'Chemistry 101' },
            { id: 'mock-class-4', name: 'Biology 101' },
          ];
          console.log('Using mock classes due to error:', mockClasses);
          setClasses(mockClasses);
          if (mockClasses[0] && mockClasses[0].id) {
            setClassId(mockClasses[0].id);
          }
          
          setError(null); // Clear the error to not confuse the user
        }
      };
      
      if (session) {
        fetchClasses();
      }
    }
  }, [isOpen, session]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !type || !maxScore || !dueDate || !classId) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Check if we're using a mock class ID (which won't work with the database)
    if (classId.startsWith('mock-class-')) {
      setError('This is a demo class and cannot be used to create real assessments. Please select a real class or log in as a teacher.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Log the data being sent to the API
      const requestData = {
        name,
        description,
        type,
        maxScore,
        weight,
        dueDate,
        classId,
      };
      console.log('Sending assessment data:', requestData);
      
      const response = await fetch('/api/teacher/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      // Log the response status
      console.log('Response status:', response.status);
      
      const responseData = await response.json();
      console.log('Response data:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create assessment');
      }
      
      setSuccess(true);
      setLoading(false);
      
      // Reset form
      setName('');
      setDescription('');
      setType('ASSIGNMENT');
      setMaxScore(100);
      setWeight(1);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err: any) {
      console.error('Error creating assessment:', err);
      setError(err.message || 'Failed to create assessment. Please try again.');
      setLoading(false);
    }
  };
  
  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                <div className="absolute right-0 top-0 pr-4 pt-4">
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
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      Create New Assessment
                    </Dialog.Title>
                    
                    {error && (
                      <div className="mt-2 rounded-md bg-red-50 p-2">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    )}
                    
                    {success && (
                      <div className="mt-2 rounded-md bg-green-50 p-2">
                        <p className="text-sm text-green-700">Assessment created successfully!</p>
                      </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="mt-4">
                      <div className="grid grid-cols-1 gap-y-4">
                        {/* Assessment Name */}
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="e.g., Final Exam, Assignment #3"
                            required
                          />
                        </div>
                        
                        {/* Description */}
                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="Brief description of the assessment"
                          />
                        </div>
                        
                        {/* Assessment Type */}
                        <div>
                          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                            Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="type"
                            value={type}
                            onChange={(e) => setType(e.target.value as AssessmentType)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                          >
                            <option value="EXAM">Exam</option>
                            <option value="QUIZ">Quiz</option>
                            <option value="ASSIGNMENT">Assignment</option>
                            <option value="PROJECT">Project</option>
                            <option value="LAB">Lab</option>
                            <option value="HOMEWORK">Homework</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        
                        {/* Max Score */}
                        <div>
                          <label htmlFor="maxScore" className="block text-sm font-medium text-gray-700">
                            Max Score <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            id="maxScore"
                            value={maxScore}
                            onChange={(e) => setMaxScore(Number(e.target.value))}
                            min="1"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                        
                        {/* Weight */}
                        <div>
                          <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
                            Weight
                          </label>
                          <input
                            type="number"
                            id="weight"
                            value={weight}
                            onChange={(e) => setWeight(Number(e.target.value))}
                            min="0.1"
                            step="0.1"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            How much this assessment counts towards the final grade (e.g., 1 for normal weight, 2 for double weight)
                          </p>
                        </div>
                        
                        {/* Due Date */}
                        <div>
                          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                            Due Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            id="dueDate"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                        
                        {/* Class */}
                        <div>
                          <label htmlFor="classId" className="block text-sm font-medium text-gray-700">
                            Class <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="classId"
                            value={classId}
                            onChange={(e) => setClassId(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                          >
                            <option value="">Select a class</option>
                            {classes.map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                        <button
                          type="submit"
                          className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
                          disabled={loading}
                        >
                          {loading ? 'Creating...' : 'Create Assessment'}
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
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CreateAssessmentModal;
