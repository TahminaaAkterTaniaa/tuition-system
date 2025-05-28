'use client';

import { useState, useEffect, useRef } from 'react';
import { BellIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  relatedId?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PendingClass {
  id: string;
  name: string;
  subject: string;
  status: string;
  createdAt: string;
  teacher: {
    user: {
      name: string;
      email: string;
    }
  };
}

export default function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingClasses, setPendingClasses] = useState<PendingClass[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications and pending classes
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch regular notifications
      const notificationsResponse = await fetch('/api/admin/notifications');
      const notificationsData = await notificationsResponse.json();
      
      if (notificationsResponse.ok && notificationsData.notifications) {
        const notificationsArray = Array.isArray(notificationsData.notifications) 
          ? notificationsData.notifications 
          : [];
        setNotifications(notificationsArray);
        setUnreadCount(notificationsData.unreadCount || 0);
      }
      
      // Fetch pending classes
      const pendingClassesResponse = await fetch('/api/admin/pending-classes');
      if (pendingClassesResponse.ok) {
        const pendingClassesData = await pendingClassesResponse.json();
        setPendingClasses(pendingClassesData || []);
      }
    } catch (error) {
      console.error('Error fetching notifications and pending classes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
    
    // Set up polling for notifications (every 30 seconds)
    const intervalId = setInterval(fetchData, 30000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          action: 'markAsRead',
        }),
      });
      
      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true } 
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
      });
      
      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, read: true }))
        );
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  // Sync notifications with pending requests
  const syncNotifications = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/admin/sync-notifications');
      if (response.ok) {
        const data = await response.json();
        toast.success(`Notifications synced: ${data.notificationsCount} notifications created`);
        
        // Refresh data
        await fetchData();
      }
    } catch (error) {
      console.error('Error syncing notifications:', error);
      toast.error('Failed to sync notifications');
    } finally {
      setIsSyncing(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return diffInHours === 0 
        ? 'Just now' 
        : `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Calculate total notification count (regular notifications + pending classes)
  const totalNotificationCount = unreadCount + pendingClasses.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1 rounded-full text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <BellIcon className="h-6 w-6" />
        {totalNotificationCount > 0 && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>
      
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-2">
            <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
              <div className="flex space-x-3">
                <button
                  onClick={syncNotifications}
                  disabled={isSyncing}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  {isSyncing ? (
                    <>
                      <ArrowPathIcon className="animate-spin h-3 w-3 mr-1" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="h-3 w-3 mr-1" />
                      Sync
                    </>
                  )}
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>
            
            {isLoading ? (
              <div className="px-4 py-3 text-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : totalNotificationCount === 0 ? (
              <div className="px-4 py-3 text-center text-sm text-gray-500">
                No notifications
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {/* Pending Class Requests */}
                {pendingClasses.length > 0 && (
                  <div className="border-b border-gray-100 pb-2">
                    {pendingClasses.map((pendingClass) => (
                      <Link 
                        href="/admin/pending-classes" 
                        key={pendingClass.id}
                        className="block"
                      >
                        <div className="px-4 py-3 hover:bg-gray-50 bg-yellow-50 cursor-pointer">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium text-gray-900">Class Creation Request</p>
                            <p className="text-xs text-gray-500">{formatDate(pendingClass.createdAt)}</p>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Teacher {pendingClass.teacher && pendingClass.teacher.user ? pendingClass.teacher.user.name : 'Unknown'} wants to create a class for {pendingClass.name} ({pendingClass.subject})
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                
                {/* Regular Notifications */}
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''} cursor-pointer`}
                    onClick={() => {
                      // Mark as read if unread
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                      
                      // Close dropdown before navigation
                      setIsOpen(false);
                      
                      // Handle navigation based on notification type
                      switch(notification.type) {
                        case 'enrollment':
                          window.location.href = '/admin/approvals';
                          break;
                        case 'withdrawal':
                          window.location.href = '/admin/approvals';
                          break;
                        default:
                          // For other notification types, just navigate to notifications page
                          window.location.href = '/admin/notifications';
                          break;
                      }
                    }}
                  >
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(notification.createdAt)}</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  </div>
                ))}
              </div>
            )}
            
            <div className="px-4 py-2 border-t border-gray-200">
              <a
                href="/admin/notifications"
                className="block text-center text-xs text-indigo-600 hover:text-indigo-800"
              >
                View all notifications
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
