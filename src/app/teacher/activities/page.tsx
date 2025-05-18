'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Activity {
  id: string;
  action: string;
  description: string;
  entityType: string;
  entityId: string | null;
  timestamp: string;
  metadata: any | null;
}

export default function TeacherActivities() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

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

    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/teacher/activities');
        
        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }
        
        const data = await response.json();
        setActivities(data.activities || []);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError('Failed to load activities');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchActivities();
  }, [session, status, router]);

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to get border color based on activity type
  const getBorderColor = (action: string): string => {
    switch (action) {
      case 'MARK_ATTENDANCE':
        return 'border-indigo-500';
      case 'UPLOAD_RESOURCE':
        return 'border-green-500';
      case 'UPDATE_GRADE':
      case 'CREATE_GRADE':
        return 'border-blue-500';
      case 'POST_ANNOUNCEMENT':
        return 'border-yellow-500';
      case 'SEND_MESSAGE':
        return 'border-purple-500';
      default:
        return 'border-gray-500';
    }
  };

  // Filter activities based on selected filter
  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(activity => activity.action.includes(filter));

  // Format action name for display
  const formatActionName = (action: string): string => {
    return action.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
  };

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
        <h1 className="text-3xl font-bold">Activity Log</h1>
        <Link href="/teacher" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium">
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Your Recent Activities</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Filter by:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Filter activities by type"
              title="Filter activities by type"
            >
              <option value="all">All Activities</option>
              <option value="ATTENDANCE">Attendance</option>
              <option value="RESOURCE">Resources</option>
              <option value="GRADE">Grades</option>
              <option value="ANNOUNCEMENT">Announcements</option>
              <option value="MESSAGE">Messages</option>
            </select>
          </div>
        </div>

        {filteredActivities.length > 0 ? (
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className={`border-l-4 ${getBorderColor(activity.action)} pl-4 py-3 hover:bg-gray-50 transition-colors`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {formatActionName(activity.action)}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    
                    {activity.metadata && (
                      <div className="mt-2 text-xs text-gray-500">
                        <details>
                          <summary className="cursor-pointer hover:text-indigo-600">View details</summary>
                          <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                            {typeof activity.metadata === 'string' 
                              ? JSON.stringify(JSON.parse(activity.metadata), null, 2)
                              : JSON.stringify(activity.metadata, null, 2)
                            }
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No activities found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' 
                ? 'You have no recorded activities yet.' 
                : `No ${filter.toLowerCase()} activities found.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
