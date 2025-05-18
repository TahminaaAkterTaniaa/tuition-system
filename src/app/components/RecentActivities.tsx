'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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

export default function RecentActivities() {
  const { data: session } = useSession();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    
    if (session) {
      fetchActivities();
    }
  }, [session]);

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      // Today
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays === 1) {
      // Yesterday
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      // Other days
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
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
      case 'CREATE_ASSESSMENT':
        return 'border-purple-500';
      default:
        return 'border-gray-500';
    }
  };
  
  // Helper function to format assessment due date
  const formatDueDate = (dueDate: string): string => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffInDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) {
      return 'Past due';
    } else if (diffInDays === 0) {
      return 'Due today';
    } else if (diffInDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffInDays} days`;
    }
  };
  
  // Helper function to get assessment type badge color
  const getAssessmentTypeBadgeColor = (type: string): string => {
    switch (type) {
      case 'EXAM':
        return 'bg-red-100 text-red-800';
      case 'QUIZ':
        return 'bg-blue-100 text-blue-800';
      case 'ASSIGNMENT':
        return 'bg-green-100 text-green-800';
      case 'PROJECT':
        return 'bg-purple-100 text-purple-800';
      case 'LAB':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      <h2 className="text-xl font-semibold mb-4">Recent Activities</h2>
      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className={`border-l-4 ${getBorderColor(activity.action)} pl-4 py-2`}>
              <p className="text-sm text-gray-600 mb-1">{formatTimestamp(activity.timestamp)}</p>
              <h3 className="font-medium text-gray-900">
                {activity.action.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
              </h3>
              <p className="text-sm text-gray-600">{activity.description}</p>
              
              {/* Additional info for assessment activities */}
              {activity.action === 'CREATE_ASSESSMENT' && activity.metadata && (
                <div className="mt-2 bg-gray-50 p-2 rounded text-sm">
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-0.5 rounded-full ${getAssessmentTypeBadgeColor(activity.metadata.assessmentType)}`}>
                      {activity.metadata.assessmentType.charAt(0) + activity.metadata.assessmentType.slice(1).toLowerCase()}
                    </span>
                    <span className="text-xs font-medium">
                      {formatDueDate(activity.metadata.dueDate)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Max Score: {activity.metadata.maxScore} points
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No recent activities found</p>
        </div>
      )}
      <div className="mt-4">
        <Link href="/teacher/activities" className="text-indigo-600 hover:text-indigo-800 font-medium">
          View All Activities →
        </Link>
      </div>
    </>
  );
}
