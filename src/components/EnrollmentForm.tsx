'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';

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
  const [uploadedFiles, setUploadedFiles] = useState<{
    idDocument: File | null;
    transcript: File | null;
  }>({
    idDocument: null,
    transcript: null,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'idDocument' | 'transcript') => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFiles(prev => ({
        ...prev,
        [fileType]: e.target.files![0],
      }));
    }
  };

  const onSubmit = async (data: EnrollmentFormData) => {
    if (step === 1) {
      setStep(2);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // First check if the user already has an enrollment for this class
      console.log('Checking existing enrollments for classId:', classId);
      const checkResponse = await fetch(`/api/student/enrollments?classId=${classId}&userId=${userId}`, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
      });
      
      if (checkResponse.ok) {
        const enrollments = await checkResponse.json();
        console.log('Existing enrollments:', enrollments);
        
        if (enrollments && enrollments.length > 0) {
          // User already has an enrollment for this class
          const existingEnrollment = enrollments[0];
          console.log('Found existing enrollment:', existingEnrollment);
          
          if (existingEnrollment.status === 'enrolled' || existingEnrollment.status === 'completed') {
            throw new Error('You are already enrolled in this class.');
          }
          
          if (existingEnrollment.status === 'pending') {
            // If application is already submitted, go to payment step
            if (existingEnrollment.applicationSubmitted) {
              console.log('Application already submitted, going to payment step');
              toast.success('Continuing your existing enrollment process.');
              onSuccess(existingEnrollment.id);
              return;
            } else {
              // Continue with the application submission for the existing enrollment
              console.log('Continuing with application for existing enrollment');
            }
          }
        }
      }

      // Create form data for file uploads
      const formData = new FormData();
      formData.append('classId', classId);
      formData.append('userId', userId); // Add userId to the form data
      formData.append('fullName', data.fullName);
      formData.append('email', data.email);
      formData.append('phone', data.phone);
      formData.append('idNumber', data.idNumber);
      formData.append('emergencyContact', data.emergencyContact);
      formData.append('additionalNotes', data.additionalNotes || '');
      
      if (uploadedFiles.idDocument) {
        formData.append('idDocument', uploadedFiles.idDocument);
      }
      
      if (uploadedFiles.transcript) {
        formData.append('transcript', uploadedFiles.transcript);
      }

      // First submit the enrollment application
      console.log('Submitting enrollment request with:', { classId, userId });
      let enrollData;
      try {
        const enrollResponse = await fetch('/api/enrollment/enroll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            classId,
            userId, // Pass the userId directly in the request body
          }),
          credentials: 'include', // Include cookies for authentication
        });

        console.log('Enrollment response status:', enrollResponse.status);
        
        if (!enrollResponse.ok) {
          const errorData = await enrollResponse.json();
          console.error('Enrollment error response:', errorData);
          throw new Error(errorData.error || 'Failed to submit enrollment');
        }
        
        enrollData = await enrollResponse.json();
        console.log('Enrollment created:', enrollData);
      } catch (error) {
        console.error('Error during enrollment request:', error);
        throw error;
      }
      
      // Then submit the additional form data and documents
      console.log('Submitting application form data');
      try {
        const applicationResponse = await fetch('/api/enrollment/application', {
          method: 'POST',
          body: formData,
          credentials: 'include', // Include cookies for authentication
        });

        console.log('Application response status:', applicationResponse.status);
        
        if (!applicationResponse.ok) {
          const errorData = await applicationResponse.json();
          console.error('Application error response:', errorData);
          throw new Error(errorData.error || 'Failed to submit application details');
        }
      } catch (error) {
        console.error('Error during application submission:', error);
        throw error;
      }

      console.log('Application submitted successfully');
      toast.success('Application submitted successfully!');
      onSuccess(enrollData.enrollment.id);
      
    } catch (error) {
      console.error('Error submitting enrollment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit enrollment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center text-indigo-700">
        Enrollment Application for {className}
      </h2>
      
      {step === 1 ? (
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
            
            <div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload ID Document (Required)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="idDocument"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="idDocument"
                        name="idDocument"
                        type="file"
                        className="sr-only"
                        onChange={(e) => handleFileChange(e, 'idDocument')}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                </div>
              </div>
              {uploadedFiles.idDocument && (
                <p className="mt-2 text-sm text-green-600">
                  Uploaded: {uploadedFiles.idDocument.name}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Academic Transcript (Optional)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="transcript"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="transcript"
                        name="transcript"
                        type="file"
                        className="sr-only"
                        onChange={(e) => handleFileChange(e, 'transcript')}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                </div>
              </div>
              {uploadedFiles.transcript && (
                <p className="mt-2 text-sm text-green-600">
                  Uploaded: {uploadedFiles.transcript.name}
                </p>
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
