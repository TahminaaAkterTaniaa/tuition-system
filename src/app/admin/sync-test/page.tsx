'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function SyncTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSyncNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/sync-notifications');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync notifications');
      }
      
      const data = await response.json();
      setResult(data);
      toast.success(`Notifications synced successfully: ${data.notificationsCount} notifications created`);
    } catch (error: any) {
      console.error('Error syncing notifications:', error);
      toast.error(error.message || 'Failed to sync notifications');
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Notification Sync Test</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <p className="mb-4">
          This page allows you to manually trigger the notification sync process. 
          This will scan for all pending requests and create notifications for them.
        </p>
        
        <button
          onClick={handleSyncNotifications}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing Notifications...
            </>
          ) : (
            'Sync Notifications'
          )}
        </button>
      </div>
      
      {result && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Sync Result:</h2>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
