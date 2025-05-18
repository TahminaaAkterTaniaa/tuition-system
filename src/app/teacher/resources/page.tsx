'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Resource {
  id: string;
  title: string;
  description: string;
  fileType: string;
  fileSize: string;
  uploadDate: string;
  classId: string;
  className: string;
}

interface ClassData {
  id: string;
  name: string;
  subject: string;
}

export default function TeacherResources() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

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
        
        // Format classes data
        const formattedClasses = classesData.classes?.map((cls: any) => ({
          id: cls.id,
          name: cls.name,
          subject: cls.subject
        })) || [];
        
        setClasses(formattedClasses);
        
        // Fetch resources
        const resourcesResponse = await fetch('/api/teacher/resources');
        
        if (!resourcesResponse.ok) {
          throw new Error('Failed to fetch resources');
        }
        
        const resourcesData = await resourcesResponse.json();
        
        // Format resources data
        const formattedResources = resourcesData.resources?.map((resource: any) => ({
          id: resource.id,
          title: resource.title || 'Untitled Resource',
          description: resource.description || 'No description available',
          fileType: resource.fileType || 'Unknown',
          fileSize: resource.fileSize || 'Unknown',
          uploadDate: resource.uploadDate || new Date().toISOString(),
          classId: resource.classId,
          className: formattedClasses.find((cls: ClassData) => cls.id === resource.classId)?.name || 'Unknown Class'
        })) || [];
        
        setResources(formattedResources);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load resources. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [session, status, router]);

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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  resource.fileType === 'PDF' ? 'bg-red-100' : 
                  resource.fileType === 'DOCX' ? 'bg-blue-100' : 
                  resource.fileType === 'PPTX' ? 'bg-orange-100' : 
                  resource.fileType === 'XLSX' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <span className="text-xs font-medium">{resource.fileType}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{resource.description}</p>
              <div className="flex justify-between text-xs text-gray-500 mb-4">
                <span>Size: {resource.fileSize}</span>
                <span>Uploaded: {new Date(resource.uploadDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <Link 
                  href={`/teacher/resources/${resource.id}`}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  View Details
                </Link>
                <button 
                  className="text-gray-500 hover:text-gray-700" 
                  title={`Download ${resource.title}`}
                  aria-label={`Download ${resource.title}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
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
    </div>
  );
}
