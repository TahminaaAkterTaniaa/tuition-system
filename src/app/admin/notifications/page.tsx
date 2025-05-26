'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

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

export default function AdminNotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

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

    fetchNotifications();
  }, [session, status, router, filter]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const unreadOnly = filter === 'unread';
      const url = `/api/admin/notifications${unreadOnly ? '?unreadOnly=true' : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      
      // Log the response for debugging
      console.log('Admin notifications API response:', data);
      
      if (response.ok && data.notifications) {
        // Make sure notifications is an array
        const notificationsArray = Array.isArray(data.notifications) ? data.notifications : [];
        setNotifications(notificationsArray);
      } else {
        console.error('API response not OK or missing notifications:', { 
          status: response.status, 
          data,
          url
        });
        toast.error('Failed to load notifications');
        throw new Error(`Failed to fetch notifications: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (notificationId: string, action: 'markAsRead' | 'markAsUnread' | 'delete') => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          action,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update notification');
      }
      
      const data = await response.json();
      toast.success(data.message);
      
      // Update local state based on action
      if (action === 'delete') {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      } else {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, read: action === 'markAsRead' } 
              : notif
          )
        );
      }
    } catch (error) {
      console.error('Error updating notification:', error);
      toast.error('Failed to update notification');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      const data = await response.json();
      toast.success(data.message);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getTypeLabel = (title: string) => {
    switch (title) {
      case 'enrollment_request':
        return 'Enrollment Request';
      case 'withdrawal_request':
        return 'Withdrawal Request';
      case 'class_creation_request':
        return 'Class Creation Request';
      default:
        return title.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getTypeColor = (title: string) => {
    switch (title) {
      case 'enrollment_request':
        return 'bg-blue-100 text-blue-800';
      case 'withdrawal_request':
        return 'bg-red-100 text-red-800';
      case 'class_creation_request':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex space-x-4">
          <div className="relative inline-block w-48">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
              className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Filter notifications"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
          <button
            onClick={markAllAsRead}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Mark All as Read
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No notifications found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all'
              ? 'You don\'t have any notifications at the moment.'
              : filter === 'unread'
              ? 'You don\'t have any unread notifications.'
              : 'You don\'t have any read notifications.'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`px-6 py-4 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(notification.title)}`}>
                        {getTypeLabel(notification.title)}
                      </span>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.message}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {notification.read ? (
                      <button
                        onClick={() => handleAction(notification.id, 'markAsUnread')}
                        className="text-gray-400 hover:text-indigo-600"
                        title="Mark as unread"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(notification.id, 'markAsRead')}
                        className="text-gray-400 hover:text-indigo-600"
                        title="Mark as read"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(notification.id, 'delete')}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
