'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function DebugPage() {
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any>({
    enrollment: [],
    withdrawal: [],
    classCreation: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get session info
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = await sessionResponse.json();
        
        // Get admin info
        const adminResponse = await fetch('/api/admin/profile');
        let adminData = { error: 'Failed to fetch admin profile' };
        try {
          adminData = await adminResponse.json();
        } catch (e) {
          console.error('Error parsing admin response:', e);
        }
        
        // Get notifications
        const notificationsResponse = await fetch('/api/admin/notifications');
        let notificationsData = { notifications: [], unreadCount: 0 };
        try {
          notificationsData = await notificationsResponse.json();
        } catch (e) {
          console.error('Error parsing notifications response:', e);
        }
        
        // Get pending enrollment requests
        const enrollmentResponse = await fetch('/api/student/enrollment-requests?status=pending');
        let enrollmentData = [];
        try {
          enrollmentData = await enrollmentResponse.json();
        } catch (e) {
          console.error('Error parsing enrollment response:', e);
        }
        
        // Get pending withdrawal requests
        const withdrawalResponse = await fetch('/api/student/withdrawal-requests?status=pending');
        let withdrawalData = [];
        try {
          withdrawalData = await withdrawalResponse.json();
        } catch (e) {
          console.error('Error parsing withdrawal response:', e);
        }
        
        // Get pending class creation requests
        const classCreationResponse = await fetch('/api/teacher/class-creation-requests?status=pending');
        let classCreationData = [];
        try {
          classCreationData = await classCreationResponse.json();
        } catch (e) {
          console.error('Error parsing class creation response:', e);
        }
        
        // Set state
        setAdminInfo({
          session: sessionData,
          admin: adminData
        });
        setNotifications(notificationsData.notifications || []);
        setPendingRequests({
          enrollment: enrollmentData || [],
          withdrawal: withdrawalData || [],
          classCreation: classCreationData || []
        });
        
        // Set debug info
        setDebugInfo({
          sessionStatus: sessionResponse.status,
          adminStatus: adminResponse.status,
          notificationsStatus: notificationsResponse.status,
          enrollmentStatus: enrollmentResponse.status,
          withdrawalStatus: withdrawalResponse.status,
          classCreationStatus: classCreationResponse.status
        });
      } catch (error) {
        console.error('Error fetching debug data:', error);
        toast.error('Failed to load debug data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleSyncNotifications = async () => {
    try {
      const response = await fetch('/api/admin/sync-notifications');
      const data = await response.json();
      setSyncResult(data);
      toast.success(`Sync completed: ${data.notificationsCount} notifications created`);
      
      // Refresh notifications
      const notificationsResponse = await fetch('/api/admin/notifications');
      const notificationsData = await notificationsResponse.json();
      setNotifications(notificationsData.notifications || []);
    } catch (error) {
      console.error('Error syncing notifications:', error);
      toast.error('Failed to sync notifications');
    }
  };
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Notifications Debug</h1>
      
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Admin Information</h2>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto">
              {JSON.stringify(adminInfo, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Notifications ({notifications.length})</h2>
              <button
                onClick={handleSyncNotifications}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Sync Notifications
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-gray-500">No notifications found</p>
            ) : (
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto">
                {JSON.stringify(notifications, null, 2)}
              </pre>
            )}
          </div>
          
          {syncResult && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Sync Result</h2>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto">
                {JSON.stringify(syncResult, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Pending Requests</h2>
            
            <h3 className="font-medium mb-2">Enrollment Requests ({pendingRequests.enrollment.length})</h3>
            {pendingRequests.enrollment.length === 0 ? (
              <p className="text-gray-500 mb-4">No pending enrollment requests</p>
            ) : (
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto mb-4">
                {JSON.stringify(pendingRequests.enrollment, null, 2)}
              </pre>
            )}
            
            <h3 className="font-medium mb-2">Withdrawal Requests ({pendingRequests.withdrawal.length})</h3>
            {pendingRequests.withdrawal.length === 0 ? (
              <p className="text-gray-500 mb-4">No pending withdrawal requests</p>
            ) : (
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto mb-4">
                {JSON.stringify(pendingRequests.withdrawal, null, 2)}
              </pre>
            )}
            
            <h3 className="font-medium mb-2">Class Creation Requests ({pendingRequests.classCreation.length})</h3>
            {pendingRequests.classCreation.length === 0 ? (
              <p className="text-gray-500">No pending class creation requests</p>
            ) : (
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto">
                {JSON.stringify(pendingRequests.classCreation, null, 2)}
              </pre>
            )}
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
