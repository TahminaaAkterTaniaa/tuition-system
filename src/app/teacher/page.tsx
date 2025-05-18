'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import TodaysClasses from '../components/TodaysClasses';
import TeacherAttendance from '../components/TeacherAttendance';
import TeacherMessages from '../components/TeacherMessages';
import RecentActivities from '../components/RecentActivities';
import CreateGradeModal from '../components/CreateGradeModal';

export default function TeacherDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);

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

    setIsLoading(false);
  }, [session, status, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Teacher Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">My Classes</h2>
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 mb-4">Manage your assigned classes and schedules</p>
          <div className="flex justify-between">
            <Link href="/teacher/classes" className="text-indigo-600 hover:text-indigo-800 font-medium">
              View Classes →
            </Link>
            <Link href="/teacher/classes/create" className="text-green-600 hover:text-green-800 font-medium">
              Create Class +
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Attendance</h2>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 mb-4">Mark and track student attendance</p>
          <div className="flex flex-col space-y-2">
            <Link href="/teacher/attendance" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Manage Attendance →
            </Link>
            <span className="text-xs text-gray-500">Real-time attendance tracking now available!</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Gradebook</h2>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 mb-4">Record and manage student grades</p>
          <div className="flex justify-between">
            <Link href="/teacher/gradebook" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Open Gradebook →
            </Link>
            <button
              onClick={() => setIsGradeModalOpen(true)}
              className="text-green-600 hover:text-green-800 font-medium"
            >
              Create Grade +
            </button>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Resources</h2>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 mb-4">Upload and manage learning materials</p>
          <Link href="/teacher/resources" className="text-indigo-600 hover:text-indigo-800 font-medium">
            Manage Resources →
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <TodaysClasses />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <RecentActivities />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TeacherAttendance />
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Messages</h2>
          <TeacherMessages />
        </div>
      </div>
      
      {/* Grade Creation Modal */}
      <CreateGradeModal 
        isOpen={isGradeModalOpen} 
        onClose={() => setIsGradeModalOpen(false)} 
        onSuccess={() => {
          // Optionally refresh data after successful grade creation
        }} 
      />
    </div>
  );
}
