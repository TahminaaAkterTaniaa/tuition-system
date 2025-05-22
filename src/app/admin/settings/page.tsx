'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import RoomManager from '@/app/components/admin/RoomManager';
import TimeSlotManager from '@/app/components/admin/TimeSlotManager';

export default function AdminSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rooms');

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
      <h1 className="text-3xl font-bold mb-6">Admin Settings</h1>
      
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
              Rooms
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
              Time Slots
            </button>
          </nav>
        </div>
      </div>
      
      <div className="mt-6">
        {activeTab === 'rooms' && <RoomManager />}
        {activeTab === 'timeslots' && <TimeSlotManager />}
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-medium text-blue-800 mb-2">About Settings</h2>
        <p className="text-sm text-blue-700">
          Use this page to manage rooms and time slots for class scheduling. These settings will be used in the Class Scheduling Panel to ensure that classes are scheduled in available rooms and at defined time slots.
        </p>
      </div>
    </div>
  );
}
