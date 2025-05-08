'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Classes() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState([
    {
      id: 1,
      name: 'Advanced Mathematics',
      description: 'Advanced calculus and linear algebra for senior students',
      teacher: 'Dr. Sarah Johnson',
      schedule: 'Mon, Wed, Fri 9:00 AM - 10:30 AM',
      room: 'Room 101',
      capacity: 30,
      enrolled: 25,
      image: '/images/math.jpg'
    },
    {
      id: 2,
      name: 'Physics',
      description: 'Mechanics, thermodynamics, and electromagnetism',
      teacher: 'Prof. Michael Chen',
      schedule: 'Tue, Thu 1:00 PM - 2:30 PM',
      room: 'Lab 203',
      capacity: 24,
      enrolled: 18,
      image: '/images/physics.jpg'
    },
    {
      id: 3,
      name: 'Chemistry',
      description: 'Organic chemistry and chemical reactions',
      teacher: 'Dr. Emily Rodriguez',
      schedule: 'Mon, Wed 3:00 PM - 4:30 PM',
      room: 'Lab 205',
      capacity: 24,
      enrolled: 22,
      image: '/images/chemistry.jpg'
    },
    {
      id: 4,
      name: 'Biology',
      description: 'Cell biology, genetics, and ecosystems',
      teacher: 'Prof. David Wilson',
      schedule: 'Tue, Thu 10:00 AM - 11:30 AM',
      room: 'Lab 105',
      capacity: 28,
      enrolled: 26,
      image: '/images/biology.jpg'
    },
    {
      id: 5,
      name: 'Computer Science',
      description: 'Programming, algorithms, and data structures',
      teacher: 'Dr. Lisa Park',
      schedule: 'Mon, Wed, Fri 2:00 PM - 3:30 PM',
      room: 'Computer Lab 301',
      capacity: 20,
      enrolled: 20,
      image: '/images/computer-science.jpg'
    },
    {
      id: 6,
      name: 'English Literature',
      description: 'Analysis of classic and contemporary literature',
      teacher: 'Prof. Robert Brown',
      schedule: 'Tue, Thu 9:00 AM - 10:30 AM',
      room: 'Room 205',
      capacity: 30,
      enrolled: 24,
      image: '/images/literature.jpg'
    }
  ]);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    
    // We don't redirect unauthenticated users as this page is public
    setIsLoading(false);
  }, [status]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Available Classes</h1>
          <p className="text-gray-600 mt-1">Browse and enroll in our comprehensive course offerings</p>
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search classes..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <div className="absolute left-3 top-2.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <select 
            className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            title="Filter classes by subject"
            aria-label="Filter classes by subject"
            id="subject-filter"
          >
            <option value="">All Subjects</option>
            <option value="math">Mathematics</option>
            <option value="science">Science</option>
            <option value="language">Language</option>
            <option value="arts">Arts</option>
            <option value="technology">Technology</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {classes.map((classItem) => (
          <div key={classItem.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="h-48 bg-gray-200 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-semibold text-gray-900">{classItem.name}</h2>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  classItem.enrolled >= classItem.capacity 
                    ? 'bg-red-100 text-red-800' 
                    : classItem.enrolled >= classItem.capacity * 0.8 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {classItem.enrolled >= classItem.capacity 
                    ? 'Full' 
                    : `${classItem.capacity - classItem.enrolled} spots left`}
                </span>
              </div>
              <p className="text-gray-600 mb-4">{classItem.description}</p>
              <div className="space-y-2 mb-4">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-gray-700">{classItem.teacher}</span>
                </div>
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">{classItem.schedule}</span>
                </div>
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-gray-700">{classItem.room}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-500">Enrollment: </span>
                  <span className="text-sm font-medium">{classItem.enrolled}/{classItem.capacity}</span>
                </div>
                <Link 
                  href={`/classes/${classItem.id}`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
