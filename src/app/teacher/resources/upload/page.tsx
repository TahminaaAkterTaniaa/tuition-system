'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

interface ClassData {
  id: string;
  name: string;
  subject: string;
}

function ResourceUploadContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClassId = searchParams?.get('classId');
  
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>(preselectedClassId || '');
  const [file, setFile] = useState<File | null>(null);
  
  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user.role !== 'TEACHER') {
      router.push('/');
      return;
    }

    const fetchClasses = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/teacher/classes');
        
        if (!response.ok) {
          throw new Error('Failed to fetch classes');
        }
        
        const data = await response.json();
        console.log('Classes data from API:', data);
        
        // Format classes data - handle both array format and object with classes property
        let formattedClasses = [];
        if (Array.isArray(data)) {
          formattedClasses = data.map((cls: any) => ({
            id: cls.id,
            name: cls.name,
            subject: cls.subject
          }));
        } else if (data.classes && Array.isArray(data.classes)) {
          formattedClasses = data.classes.map((cls: any) => ({
            id: cls.id,
            name: cls.name,
            subject: cls.subject
          }));
        } else {
          console.warn('Unexpected classes data format:', data);
        }
        
        setClasses(formattedClasses);
        
        // If there's a preselected class ID from the URL, set it
        if (preselectedClassId) {
          setSelectedClassId(preselectedClassId);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
        setError('Failed to load classes. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchClasses();
  }, [session, status, router, preselectedClassId]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
        setFile(selectedFile);
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Upload] Starting upload process');
    
    if (!title || !selectedClassId || !file) {
      console.error('[Upload] Missing required fields:', { title: !!title, selectedClassId: !!selectedClassId, file: !!file });
      setError('Please fill in all required fields and select a file.');
      return;
    }
    
    try {
      console.log('[Upload] Form validation passed, preparing submission');
      console.log('[Upload] File details:', {
        name: file.name,
        type: file.type,
        size: `${Math.round(file.size / 1024)} KB`,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
      setIsSubmitting(true);
      setError(null);
      
      // Create form data
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('classId', selectedClassId);
      formData.append('file', file);
      
      console.log('[Upload] FormData created with:', {
        title,
        description: description ? `${description.substring(0, 20)}...` : '(empty)',
        classId: selectedClassId,
        fileName: file.name
      });
      
      // Start request timing
      const startTime = performance.now();
      console.log('[Upload] Sending request to API...');
      
      // Send the data to the API
      const response = await fetch('/api/teacher/resources/upload', {
        method: 'POST',
        body: formData
      }).catch(networkError => {
        console.error('[Upload] Network error during fetch:', networkError);
        throw new Error(`Network error: ${networkError.message}`);
      });
      
      const endTime = performance.now();
      console.log(`[Upload] API response received in ${Math.round(endTime - startTime)}ms`);
      console.log('[Upload] Response status:', response.status);
      
      // Try to get the response content type
      const contentType = response.headers.get('content-type');
      console.log('[Upload] Response content-type:', contentType);
      
      if (!response.ok) {
        console.error('[Upload] API returned error status:', response.status);
        
        // Try to parse error as JSON
        let errorData;
        try {
          errorData = await response.json();
          console.error('[Upload] Error details:', errorData);
        } catch (parseErr) {
          console.error('[Upload] Failed to parse error response as JSON:', parseErr);
          const textResponse = await response.text();
          console.error('[Upload] Raw error response:', textResponse);
        }
        
        throw new Error((errorData && errorData.error) || `Server error: ${response.status}`);
      }
      
      // Parse successful response
      try {
        const responseData = await response.json();
        console.log('[Upload] Success response:', responseData);
      } catch (parseErr) {
        console.warn('[Upload] Failed to parse success response as JSON:', parseErr);
      }
      
      console.log('[Upload] Upload completed successfully!');
      setSuccess(true);
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedClassId('');
      setFile(null);
      
      // Redirect to resources list after a short delay
      setTimeout(() => {
        console.log('[Upload] Redirecting to resources page');
        router.push('/teacher/resources');
      }, 2000);
      
    } catch (err) {
      console.error('[Upload] Error in upload process:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during upload');
      
      // Log additional browser info for debugging
      console.log('[Upload] Browser info:', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        cookiesEnabled: navigator.cookieEnabled
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Upload Resource</h1>
        <Link href="/teacher/resources" className="text-indigo-600 hover:text-indigo-800 font-medium">
          Back to Resources
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Success! </strong>
          <span className="block sm:inline">Your resource has been uploaded successfully.</span>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Resource Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., Chapter 5 Notes"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Provide a brief description of this resource"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">
              Class *
            </label>
            {classes.length > 0 ? (
              <select
                id="class"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.subject}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-1">
                <div className="text-sm text-gray-500 mb-2">No classes available</div>
                <Link 
                  href="/teacher/classes"
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  View your classes
                </Link>
              </div>
            )}
          </div>
          
          <div className="mb-6">
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
              File *
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
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      required
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  PDF, DOCX, PPTX, XLSX up to 10MB
                </p>
                {file && (
                  <p className="text-sm text-indigo-600 mt-2">
                    Selected file: {file.name}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Link
              href="/teacher/resources"
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium mr-4 hover:bg-gray-300"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Uploading...' : 'Upload Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UploadResource() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>}>
      <ResourceUploadContent />
    </Suspense>
  );
}
