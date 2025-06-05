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
    };
    transcript?: {
      fileName: string;
      url: string;
      blobId?: string;
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
        
        setUploadedFiles(prevState => ({
          ...prevState,
          [fileType]: {
            fileName,
            url: data.url,
            blobId: data.blobId
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
          <div className="space-y-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload ID Document (Required)
              </label>
              <div className="mt-1">
                <label htmlFor="idDocumentInput" className="sr-only">Upload ID Document</label>
                <input
                  id="idDocumentInput"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileChange(e, 'idDocument')}
                  aria-label="Upload ID Document"
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-50 file:text-primary-700
                    hover:file:bg-primary-100"
                />
              </div>
              {uploadedFiles.idDocument && (
                <div className="mt-3 max-w-sm mx-auto">
                  <DocumentPreview
                    fileName={uploadedFiles.idDocument.fileName}
                    fileUrl={uploadedFiles.idDocument.url}
                    onRemove={() => handleRemoveFile('idDocument')}
                  />
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Academic Transcript (Optional)
              </label>
              <div className="mt-1">
                <label htmlFor="transcriptInput" className="sr-only">Upload Academic Transcript</label>
                <input
                  id="transcriptInput"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileChange(e, 'transcript')}
                  aria-label="Upload Academic Transcript"
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-50 file:text-primary-700
                    hover:file:bg-primary-100"
                />
              </div>
              {uploadedFiles.transcript && (
                <div className="mt-3 max-w-sm mx-auto">
                  <DocumentPreview
                    fileName={uploadedFiles.transcript.fileName}
                    fileUrl={uploadedFiles.transcript.url}
                    onRemove={() => handleRemoveFile('transcript')}
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !uploadedFiles.idDocument}
              className={`px-6 py-2 ${
                isSubmitting || !uploadedFiles.idDocument
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
