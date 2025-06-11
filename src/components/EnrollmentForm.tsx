'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import DocumentPreview from './DocumentPreview';

// Define the form schema with Zod
const enrollmentSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone number is required'),
  idNumber: z.string().min(1, 'ID number is required'),
  emergencyContact: z.string().min(1, 'Emergency contact is required'),
  additionalNotes: z.string().optional(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

interface EnrollmentFormProps {
  classId: string;
  className: string;
  onSuccess: (enrollmentId: string) => void;
  userId: string;
}

export default function EnrollmentForm({ classId, className, onSuccess, userId }: EnrollmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<{
    idDocument?: {
      fileName: string;
      url: string;
      blobId?: string;
      fileSize?: string;
    };
    transcript?: {
      fileName: string;
      url: string;
      blobId?: string;
      fileSize?: string;
    };
  }>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
  });

  // Fetch student profile data for auto-filling the form
  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching student profile data for auto-fill...');

        // For development/testing, we'll use hardcoded data if API fails
        const mockProfileData = {
          fullName: 'Student Name',
          email: 'student@example.com',
          phone: '123-456-7890',
          idNumber: 'ST123456',
          emergencyContact: 'Emergency Contact: 987-654-3210',
        };

        // Using the simplified API endpoint that uses the session
        const response = await fetch('/api/student/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
        });

        console.log('Profile API response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Profile data received:', data);

          if (data.success && data.profile) {
            console.log('Auto-filling form with profile data:', data.profile);
            // Auto-fill form fields with student profile data
            setValue('fullName', data.profile.fullName || '');
            setValue('email', data.profile.email || '');
            setValue('phone', data.profile.phone || '');
            setValue('idNumber', data.profile.idNumber || '');
            setValue('emergencyContact', data.profile.emergencyContact || '');

            toast.success('Form pre-filled with your profile information');
          } else {
            console.warn('Profile data structure is not as expected:', data);
            // Fallback to mock data for development
            Object.entries(mockProfileData).forEach(([field, value]) => {
              setValue(field as keyof EnrollmentFormData, value);
            });
            toast.success('Form pre-filled with sample data (API response format issue)');
          }
        } else {
          console.error('Failed to fetch student profile data:', response.status);
          try {
            const errorData = await response.json();
            console.error('Error details:', errorData);
          } catch (parseError) {
            console.error('Could not parse error response');
          }

          // Fallback to mock data for development
          Object.entries(mockProfileData).forEach(([field, value]) => {
            setValue(field as keyof EnrollmentFormData, value);
          });
          toast.success('Form pre-filled with sample data (API error)');
        }
      } catch (error) {
        console.error('Error fetching student profile:', error);
        toast.error('Failed to load your profile information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentProfile();
  }, [setValue]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'idDocument' | 'transcript') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPG, PNG, and PDF files are allowed.');
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size too large. Maximum size is 10MB.');
      return;
    }

    const toastId = toast.loading(`Uploading ${fileType === 'idDocument' ? 'ID Document' : 'Transcript'}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);

      const response = await fetch('/api/blob/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        console.log('File uploaded successfully:', data);
        // Safely access file name (we already checked file exists at the top of the function)
        const fileName = file ? file.name : 'file';
        
        // Format file size for display
        const formatFileSize = (bytes: number): string => {
          if (bytes < 1024) return bytes + ' B';
          else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
          else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        };
        
        setUploadedFiles(prevState => ({
          ...prevState,
          [fileType]: {
            fileName,
            url: data.url,
            blobId: data.blobId,
            fileSize: formatFileSize(file.size)
          }
        }));
        console.log(`Set ${fileType} with fileName: ${fileName}`);
        toast.success(`${fileType === 'idDocument' ? 'ID Document' : 'Transcript'} uploaded successfully`, {
          id: toastId
        });
      } else {
        throw new Error(data.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file', {
        id: toastId
      });
    }
  };

  // Remove an uploaded file
  const handleRemoveFile = (fileType: 'idDocument' | 'transcript') => {
    if (uploadedFiles[fileType]) {
      setUploadedFiles(prevState => {
        const newState = { ...prevState };
        delete newState[fileType];
        return newState;
      });
      toast.success(`${fileType === 'idDocument' ? 'ID Document' : 'Transcript'} removed`);
    }
  };

  const onSubmit = async (data: EnrollmentFormData) => {
    if (step === 1) {
      // Move to step 2 (document upload)
      setStep(2);
      return;
    }

    // Validate required files
    if (!uploadedFiles.idDocument) {
      toast.error('ID Document is required');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Submitting enrollment application...');

    try {
      // Prepare the enrollment data
      // Simplified document data preparation
      const enrollmentData = {
        ...data,
        classId,
        userId,
        documents: {
          idDocument: uploadedFiles.idDocument ? {
            url: uploadedFiles.idDocument.url || '',
            blobId: uploadedFiles.idDocument.blobId || '',
            fileName: uploadedFiles.idDocument.fileName || 'id-document' 
          } : undefined,
          transcript: uploadedFiles.transcript ? {
            url: uploadedFiles.transcript.url || '',
            blobId: uploadedFiles.transcript.blobId || '',
            fileName: uploadedFiles.transcript.fileName || 'transcript'
          } : undefined
        }
      };
      
      console.log('Prepared enrollment data:', JSON.stringify(enrollmentData));

      // Submit the enrollment request
      const response = await fetch('/api/enrollment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enrollmentData),
      });

      const responseData = await response.json();

      if (response.ok) {
        toast.success('Enrollment request submitted successfully and awaiting admin approval!', { id: toastId });
        if (onSuccess && responseData.enrollmentRequestId) {
          // Pass the enrollment request ID to the success handler
          onSuccess(responseData.enrollmentRequestId);
        }
      } else {
        throw new Error(responseData.error || 'Failed to submit enrollment request');
      }
    } catch (error) {
      console.error('Error submitting enrollment request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit enrollment request', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Enrollment for {className}
      </h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : step === 1 ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                id="fullName"
                type="text"
                {...register('fullName')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                id="phone"
                type="tel"
                {...register('phone')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="idNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Student ID Number *
              </label>
              <input
                id="idNumber"
                type="text"
                {...register('idNumber')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.idNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.idNumber.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact *
              </label>
              <input
                id="emergencyContact"
                type="text"
                {...register('emergencyContact')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.emergencyContact && (
                <p className="mt-1 text-sm text-red-600">{errors.emergencyContact.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes (Optional)
            </label>
            <textarea
              id="additionalNotes"
              rows={3}
              {...register('additionalNotes')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-start">
            <input
              id="agreeToTerms"
              type="checkbox"
              {...register('agreeToTerms')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
            />
            <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-700">
              I agree to the terms and conditions, including the privacy policy and student code of conduct
            </label>
          </div>
          {errors.agreeToTerms && (
            <p className="mt-1 text-sm text-red-600">{errors.agreeToTerms.message}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Next: Upload Documents
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-xl font-semibold text-center mb-4">Upload Documents</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Document <span className="text-red-500">*</span>
              </label>
              
              {!uploadedFiles.idDocument ? (
                <div>
                  <label 
                    htmlFor="idDocumentInput"
                    className="cursor-pointer border-2 border-dashed border-gray-300 rounded-md p-4 flex flex-col items-center justify-center w-full hover:border-indigo-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm text-gray-500">Choose File</span>
                    <input
                      id="idDocumentInput"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleFileChange(e, 'idDocument')}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-md p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="mr-3 text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">{uploadedFiles.idDocument.fileName}</div>
                      <div className="text-xs text-gray-500">
                        {uploadedFiles.idDocument.fileSize ? `${uploadedFiles.idDocument.fileSize}` : ''}
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveFile('idDocument')} 
                    className="text-gray-500 hover:text-red-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Transcript <span className="text-gray-500">(Optional)</span>
              </label>
              
              {!uploadedFiles.transcript ? (
                <div>
                  <label 
                    htmlFor="transcriptInput"
                    className="cursor-pointer border-2 border-dashed border-gray-300 rounded-md p-4 flex flex-col items-center justify-center w-full hover:border-indigo-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm text-gray-500">Choose File</span>
                    <input
                      id="transcriptInput"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleFileChange(e, 'transcript')}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-md p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="mr-3 text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">{uploadedFiles.transcript.fileName}</div>
                      <div className="text-xs text-gray-500">
                        {uploadedFiles.transcript.fileSize ? `${uploadedFiles.transcript.fileSize}` : ''}
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveFile('transcript')} 
                    className="text-gray-500 hover:text-red-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !uploadedFiles.idDocument}
              className={`px-5 py-2 ${
                isSubmitting || !uploadedFiles.idDocument
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white rounded-md font-medium`}
            >
              {isSubmitting ? 'Submitting...' : 'Continue'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
