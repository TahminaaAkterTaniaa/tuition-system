'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LinkedStudents from '../components/LinkedStudents';
import MessagingSystem from '../components/MessagingSystem';
import PaymentStatus from '../components/PaymentStatus';

export default function ParentDashboard() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      useRouter().push('/login');
    },
  });

  const router = useRouter();

  // Check if the user is a parent, if not redirect to appropriate dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'PARENT') {
      switch (session?.user?.role) {
        case 'STUDENT':
          router.push('/student');
          break;
        case 'TEACHER':
          router.push('/teacher');
          break;
        case 'ADMIN':
          router.push('/admin');
          break;
        default:
          router.push('/login');
      }
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Student Information Section */}
          <div className="mb-8">
            {/* <h2 className="text-xl font-semibold mb-4">My Children</h2> */}
            <LinkedStudents />
          </div>
          
          {/* Payment Status Section */}
          <div className="mb-8">
            {/* <h2 className="text-xl font-semibold mb-4">Payment Status</h2> */}
            <PaymentStatus />
          </div>
          
          {/* Messaging System Section */}
          <div className="mb-8">
            {/* <h2 className="text-xl font-semibold mb-4">Messages</h2> */}
            <MessagingSystem />
          </div>
        </div>
      </main>
    </div>
  );
}
