'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Fragment } from 'react';
import Link from 'next/link';
import { Dialog, Transition } from '@headlessui/react';
import toast from 'react-hot-toast';

interface Resource {
  id: string;
  title: string;
  description: string;
  fileType: string;
  fileSize: string;
  uploadDate: string;
  classId: string;
  className: string;
  url?: string;
  blobUrl?: string;
  blobId?: string;
}

interface ClassData {
  id: string;
  name: string;
  subject: string;
}

// Helper function to get file extension from resource
const getFileExtension = (resource: Resource): string | null => {
  // If we have a proper file type, use it
  if (resource.fileType && resource.fileType !== 'Unknown') {
    return resource.fileType;
  }
  
  // Check if title has a valid file extension format (name.ext)
  const parts = resource.title.split('.');
  if (parts.length > 1) {
    const ext = parts.pop()?.toUpperCase();
    // Only return known file extensions
    const validExtensions = ['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'XLS', 'XLSX', 'JPG', 'JPEG', 'PNG', 'TXT'];
    if (ext && validExtensions.includes(ext)) {
      return ext;
    }
  }
  
  // No valid extension found
  return null;
}

// Helper function to get background color based on file type
const getFileTypeColor = (resource: Resource): string => {
  const fileExt = getFileExtension(resource);
  
  if (!fileExt) return '';
  
  switch(fileExt) {
    case 'PDF':
      return 'text-red-600';
    case 'DOC':
    case 'DOCX':
      return 'text-blue-600';
    case 'PPT':
    case 'PPTX':
      return 'text-orange-600';
    case 'XLS':
    case 'XLSX':
      return 'text-green-600';
    case 'JPG':
    case 'JPEG':
    case 'PNG':
      return 'text-purple-600';
    case 'TXT':
      return 'text-yellow-600';
    default:
      return 'text-gray-600';
  }
}

export default function TeacherResources() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch teacher's classes
      const classesResponse = await fetch('/api/teacher/classes');
      
      if (!classesResponse.ok) {
        throw new Error('Failed to fetch classes');
      }
      
      const classesData = await classesResponse.json();
      console.log('Classes data from API:', classesData);
      
      // Format classes data - handle both array format and object with classes property
      let formattedClasses = [];
      if (Array.isArray(classesData)) {
        formattedClasses = classesData.map((cls: any) => ({
          id: cls.id,
          name: cls.name,
          subject: cls.subject
        }));
      } else if (classesData.classes && Array.isArray(classesData.classes)) {
        formattedClasses = classesData.classes.map((cls: any) => ({
          id: cls.id,
          name: cls.name,
          subject: cls.subject
        }));
      } else {
        console.warn('Unexpected classes data format:', classesData);
      }
      
      setClasses(formattedClasses);
      
      // Fetch resources
      const resourcesResponse = await fetch('/api/teacher/resources');
      
      if (!resourcesResponse.ok) {
        throw new Error('Failed to fetch resources');
      }
      
      const resourcesData = await resourcesResponse.json();
      
      // Format resources data
      let formattedResources = [];
      if (resourcesData.resources && Array.isArray(resourcesData.resources)) {
        formattedResources = resourcesData.resources.map((resource: any) => ({
          id: resource.id,
          title: resource.title || 'Untitled Resource',
          description: resource.description || 'No description available',
          fileType: resource.type || 'Unknown',
          fileSize: resource.fileSize || 'Unknown',
          uploadDate: resource.createdAt || new Date().toISOString(),
          classId: resource.classId,
          className: formattedClasses.find((cls: ClassData) => cls.id === resource.classId)?.name || 'Unknown Class',
          url: resource.url,
          blobUrl: resource.blobUrl,
          blobId: resource.blobId
        }));
      } else if (Array.isArray(resourcesData)) {
        formattedResources = resourcesData.map((resource: any) => ({
          id: resource.id,
          title: resource.title || 'Untitled Resource',
          description: resource.description || 'No description available',
          fileType: resource.type || 'Unknown',
          fileSize: resource.fileSize || 'Unknown',
          uploadDate: resource.createdAt || new Date().toISOString(),
          classId: resource.classId,
          className: formattedClasses.find((cls: ClassData) => cls.id === resource.classId)?.name || 'Unknown Class',
          url: resource.url,
          blobUrl: resource.blobUrl,
          blobId: resource.blobId
        }));
      } else {
        console.warn('Unexpected resources data format:', resourcesData);
      }
      
      setResources(formattedResources);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
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

    if (session?.user.role !== 'TEACHER') {
      router.push('/');
      return;
    }
    
    fetchData();
  }, [session, status, router]);
  
  const handleClassFilter = (classId: string | null) => {
    setActiveFilter(classId);
  };
  
  // Open confirmation modal for deleting a resource
  const confirmDelete = (resource: Resource) => {
    setResourceToDelete(resource);
    setIsDeleteModalOpen(true);
  };
  
  // Close delete confirmation modal
  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setResourceToDelete(null);
  };
  
  // Handle resource deletion
  const handleDelete = async () => {
    if (!resourceToDelete) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/teacher/resources/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceId: resourceToDelete.id,
          blobId: resourceToDelete.blobId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete resource');
      }
      
      // Remove the deleted resource from state
      setResources(resources => resources.filter(r => r.id !== resourceToDelete.id));
      
      // Close modal and reset state
      setIsDeleteModalOpen(false);
      setResourceToDelete(null);
      
      toast.success('Resource deleted successfully');
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete resource');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredResources = activeFilter 
    ? resources.filter(resource => resource.classId === activeFilter)
    : resources;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Teaching Resources</h1>
        <Link 
          href="/teacher/resources/upload"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Upload New Resource
        </Link>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Filter by Class</h2>
          <button
            onClick={() => setActiveFilter(null)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              activeFilter === null
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Classes
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => setActiveFilter(cls.id)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                activeFilter === cls.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {cls.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredResources.length > 0 ? (
          filteredResources.map(resource => (
            <div key={resource.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{resource.title}</h2>
                  <p className="text-sm text-indigo-600">{resource.className}</p>
                </div>
                {/* File type as colored text, only show if valid extension exists */}
                {getFileExtension(resource) && (
                  <span className={`text-xs font-medium ${getFileTypeColor(resource)}`}>
                    {getFileExtension(resource)}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{resource.description}</p>
              <div className="flex justify-between text-xs text-gray-500 mb-4">
                <span>Size: {resource.fileSize === 'Unknown' ? '1 MB' : resource.fileSize}</span>
                <span>Uploaded: {new Date(resource.uploadDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">
                  Teacher Upload
                </span>
                <div className="flex items-center">
                  <a 
                    href={resource.blobUrl || `/api/teacher/resources/${resource.id}/download`}
                    download={resource.title}
                    className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm font-medium mr-4"
                    title={`Download ${resource.title}`}
                    aria-label={`Download ${resource.title}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                  
                  <button
                    onClick={() => confirmDelete(resource)}
                    className="text-red-600 hover:text-red-800 flex items-center text-sm font-medium"
                    title={`Delete ${resource.title}`}
                    aria-label={`Delete ${resource.title}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-gray-50 p-8 rounded-lg text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
            <p className="text-gray-600 mb-4">
              {activeFilter 
                ? "No resources available for the selected class." 
                : "You haven't uploaded any resources yet."}
            </p>
            <Link 
              href="/teacher/resources/upload"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Upload Your First Resource
            </Link>
          </div>
        )}
      </div>
      
      {classes.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quick Upload</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {classes.slice(0, 3).map(cls => (
            <Link 
              key={cls.id}
              href={`/teacher/resources/upload?classId=${cls.id}`}
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{cls.name}</h3>
                <p className="text-sm text-gray-600">Upload resources</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      )}
      
      {classes.length === 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold mb-4">No Classes Available</h2>
          <p className="text-gray-600 mb-4">You don't have any assigned classes yet.</p>
          <Link 
            href="/teacher/classes"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            View Classes
          </Link>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={cancelDelete}>
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
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Delete Resource
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete the resource "<span className="font-medium">{resourceToDelete?.title}</span>"? 
                      This action cannot be undone.
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={cancelDelete}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        'Delete'
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
