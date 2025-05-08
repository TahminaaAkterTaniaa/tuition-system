'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string | null;
  filePath: string | null;
  publishDate: string | null;
  class: {
    name: string;
    subject: string;
  };
  teacher: {
    user: {
      name: string | null;
    }
  };
}

export default function StudentResources() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<{name: string, subject: string}[]>([]);
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);

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

    // Fetch student's resources
    const fetchResources = async () => {
      try {
        // In a real app, this would be an API call
        // const response = await fetch('/api/student/resources');
        // if (!response.ok) throw new Error('Failed to fetch resources');
        // const data = await response.json();
        
        // For demo purposes, using sample data
        const sampleResources: Resource[] = [
          {
            id: '1',
            title: 'Algebra Fundamentals',
            description: 'A comprehensive guide to basic algebraic concepts',
            type: 'material',
            url: 'https://example.com/algebra-fundamentals.pdf',
            filePath: null,
            publishDate: '2025-02-01T00:00:00.000Z',
            class: {
              name: 'Mathematics 101',
              subject: 'Mathematics'
            },
            teacher: {
              user: {
                name: 'Dr. Smith'
              }
            }
          },
          {
            id: '2',
            title: 'Calculus Worksheet',
            description: 'Practice problems for derivatives and integrals',
            type: 'assignment',
            url: null,
            filePath: '/uploads/calculus-worksheet.pdf',
            publishDate: '2025-02-15T00:00:00.000Z',
            class: {
              name: 'Mathematics 101',
              subject: 'Mathematics'
            },
            teacher: {
              user: {
                name: 'Dr. Smith'
              }
            }
          },
          {
            id: '3',
            title: 'Mathematics 101 Syllabus',
            description: 'Course outline, objectives, and grading policy',
            type: 'syllabus',
            url: null,
            filePath: '/uploads/math-syllabus.pdf',
            publishDate: '2025-01-15T00:00:00.000Z',
            class: {
              name: 'Mathematics 101',
              subject: 'Mathematics'
            },
            teacher: {
              user: {
                name: 'Dr. Smith'
              }
            }
          },
          {
            id: '4',
            title: 'Physics Lab Manual',
            description: 'Instructions and procedures for all lab experiments',
            type: 'material',
            url: 'https://example.com/physics-lab-manual.pdf',
            filePath: null,
            publishDate: '2025-01-20T00:00:00.000Z',
            class: {
              name: 'Physics Fundamentals',
              subject: 'Physics'
            },
            teacher: {
              user: {
                name: 'Prof. Johnson'
              }
            }
          },
          {
            id: '5',
            title: 'Lab Report Template',
            description: 'Standard format for submitting lab reports',
            type: 'template',
            url: null,
            filePath: '/uploads/lab-report-template.docx',
            publishDate: '2025-01-25T00:00:00.000Z',
            class: {
              name: 'Physics Fundamentals',
              subject: 'Physics'
            },
            teacher: {
              user: {
                name: 'Prof. Johnson'
              }
            }
          },
          {
            id: '6',
            title: 'Mechanics Problem Set',
            description: 'Homework problems on Newton\'s laws and kinematics',
            type: 'assignment',
            url: null,
            filePath: '/uploads/mechanics-problems.pdf',
            publishDate: '2025-02-10T00:00:00.000Z',
            class: {
              name: 'Physics Fundamentals',
              subject: 'Physics'
            },
            teacher: {
              user: {
                name: 'Prof. Johnson'
              }
            }
          },
          {
            id: '7',
            title: 'Ancient Civilizations Timeline',
            description: 'Interactive timeline of major ancient civilizations',
            type: 'material',
            url: 'https://example.com/ancient-civilizations',
            filePath: null,
            publishDate: '2025-02-05T00:00:00.000Z',
            class: {
              name: 'World History',
              subject: 'History'
            },
            teacher: {
              user: {
                name: 'Ms. Garcia'
              }
            }
          },
          {
            id: '8',
            title: 'Historical Analysis Essay Guidelines',
            description: 'Requirements and rubric for the historical analysis essay',
            type: 'assignment',
            url: null,
            filePath: '/uploads/essay-guidelines.pdf',
            publishDate: '2025-02-20T00:00:00.000Z',
            class: {
              name: 'World History',
              subject: 'History'
            },
            teacher: {
              user: {
                name: 'Ms. Garcia'
              }
            }
          }
        ];
        
        // Extract unique classes and resource types
        const uniqueClasses = Array.from(
          new Set(sampleResources.map(r => r.class.name))
        ).map(className => {
          const resource = sampleResources.find(r => r.class.name === className);
          return {
            name: className,
            subject: resource?.class.subject || ''
          };
        });
        
        const uniqueTypes = Array.from(
          new Set(sampleResources.map(r => r.type))
        );
        
        setResources(sampleResources);
        setClasses(uniqueClasses);
        setResourceTypes(uniqueTypes);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching resources:', err);
        setError('Failed to load resources. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchResources();
  }, [session, status, router]);

  // Filter resources based on selected type and class
  const filteredResources = resources.filter(resource => {
    const typeMatch = selectedType === 'all' || resource.type === selectedType;
    const classMatch = selectedClass === 'all' || resource.class.name === selectedClass;
    return typeMatch && classMatch;
  });

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'material':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'assignment':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        );
      case 'syllabus':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'template':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Learning Resources</h1>
        <Link href="/student" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <h2 className="text-xl font-semibold">Filters</h2>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div>
              <label htmlFor="class-filter" className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select
                id="class-filter"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
              >
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
              <select
                id="type-filter"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
              >
                <option value="all">All Types</option>
                {resourceTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map(resource => (
            <div key={resource.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b flex items-center">
                {getResourceTypeIcon(resource.type)}
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{resource.title}</h3>
                  <p className="text-sm text-gray-500">
                    {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                  </p>
                </div>
              </div>
              <div className="p-4">
                {resource.description && (
                  <p className="text-gray-600 mb-4">{resource.description}</p>
                )}
                <div className="text-sm text-gray-500 mb-4">
                  <div className="flex items-center mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>{resource.class.name}</span>
                  </div>
                  <div className="flex items-center mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{resource.teacher.user.name}</span>
                  </div>
                  {resource.publishDate && (
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Published: {new Date(resource.publishDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <a
                    href={resource.url || `#view-${resource.id}`}
                    target={resource.url ? "_blank" : undefined}
                    rel={resource.url ? "noopener noreferrer" : undefined}
                    className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded hover:bg-indigo-200 transition-colors"
                  >
                    View Resource
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Resources Found</h3>
          <p className="text-gray-500">No resources match your current filter criteria.</p>
        </div>
      )}
    </div>
  );
}
