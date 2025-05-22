'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import ClassSchedulingPanel from '@/app/components/admin/ClassSchedulingPanel';
import RoomManager from '@/app/components/admin/RoomManager';
import TimeSlotManager from '@/app/components/admin/TimeSlotManager';

export default function ClassSchedulingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scheduling');

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    
    // Check for tab parameter in URL
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && ['rooms', 'timeslots', 'scheduling'].includes(tabParam)) {
      setActiveTab(tabParam);
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
      <h1 className="text-3xl font-bold mb-6">Class Scheduling Panel</h1>
      
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rooms'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              aria-current={activeTab === 'rooms' ? 'page' : undefined}
            >
              Manage Rooms
            </button>
            <button
              onClick={() => setActiveTab('timeslots')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'timeslots'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              aria-current={activeTab === 'timeslots' ? 'page' : undefined}
            >
              Manage Time Slots
            </button>
            <button
              onClick={() => setActiveTab('scheduling')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scheduling'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              aria-current={activeTab === 'scheduling' ? 'page' : undefined}
            >
              Class Scheduling
            </button>
          </nav>
        </div>
      </div>
      
      <div className="mt-6">
        {activeTab === 'scheduling' && <ClassSchedulingPanel />}
        {activeTab === 'rooms' && <RoomManager />}
        {activeTab === 'timeslots' && <TimeSlotManager />}
      </div>
      
      {activeTab === 'scheduling' && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-medium text-blue-800 mb-2">About Class Scheduling</h2>
          <p className="text-sm text-blue-700">
            Use this panel to create new classes with assigned teachers, rooms, and time slots. 
            You can select multiple days for each class and the system will check for scheduling conflicts.
            Use the other tabs to manage available rooms and time slots.
          </p>
        </div>
      )}
    </div>
  );
}
