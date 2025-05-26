'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface PendingClass {
  id: string;
  name: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
}

export default function PendingRequests() {
  const { data: session } = useSession();
  const [pendingClasses, setPendingClasses] = useState<PendingClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/teacher/pending-requests');
        
        if (!response.ok) {
          throw new Error('Failed to fetch pending requests');
        }
        
        const data = await response.json();
        setPendingClasses(data.pendingClasses || []);
      } catch (err) {
        console.error('Error fetching pending requests:', err);
        setError('Failed to load pending requests');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (session) {
      fetchPendingRequests();
    }
  }, [session]);

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold mb-4">Pending Approval Requests</h2>
      <div className="max-h-80 overflow-y-auto pr-2">
        {pendingClasses.length > 0 ? (
          <div className="space-y-4">
            {pendingClasses.map((pendingClass) => (
              <div 
                key={pendingClass.id} 
                className="border border-yellow-200 bg-yellow-50 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{pendingClass.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{pendingClass.subject}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Submitted on {formatDate(pendingClass.createdAt)}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                </div>
                <div className="mt-3 text-sm text-gray-600 line-clamp-2">
                  {pendingClass.description || 'No description provided'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No pending approval requests</p>
          </div>
        )}
      </div>
    </>
  );
}
