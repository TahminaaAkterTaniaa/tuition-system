'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function SyncNotificationsButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncNotifications = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/admin/sync-notifications');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync notifications');
      }
      
      const data = await response.json();
      toast.success(`Notifications synced successfully: ${data.notificationsCount} notifications created`);
      
      // Refresh the page to show new notifications
      window.location.reload();
    } catch (error: any) {
      console.error('Error syncing notifications:', error);
      toast.error(error.message || 'Failed to sync notifications');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSyncNotifications}
      disabled={isSyncing}
      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center text-sm"
    >
      {isSyncing ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Syncing...
        </>
      ) : (
        'Sync Notifications'
      )}
    </button>
  );
}
