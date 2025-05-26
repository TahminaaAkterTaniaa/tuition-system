'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import TeacherLayout from '../components/TeacherLayout';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  relatedId: string;
}

export default function TeacherNotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session?.user.role !== 'TEACHER') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      fetchNotifications();
    }
  }, [status, session, filter]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const url = filter === 'unread'
        ? '/api/teacher/notifications?unreadOnly=true&limit=100'
        : '/api/teacher/notifications?limit=100';

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/teacher/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      // Update the local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/teacher/notifications', {
        method: 'PUT',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      // Update the local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const getNotificationIcon = (title: string) => {
    switch (title) {
      case 'class_approval':
        return (
          <div className="bg-green-100 p-3 rounded-full">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'class_rejection':
        return (
          <div className="bg-red-100 p-3 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="bg-blue-100 p-3 rounded-full">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getNotificationTitle = (title: string) => {
    switch (title) {
      case 'class_approval':
        return 'Class Approved';
      case 'class_rejection':
        return 'Class Rejected';
      default:
        return title.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  };

  return (
    <TeacherLayout>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <div className="flex space-x-2">
            <div className="inline-flex rounded-md shadow-sm">
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium rounded-l-md ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border border-gray-300`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                  filter === 'unread'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border border-gray-300 border-l-0`}
                onClick={() => setFilter('unread')}
              >
                Unread
              </button>
            </div>
            {notifications.some(n => !n.read) && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="loader animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map(notification => (
              <div 
                key={notification.id}
                className={`border ${!notification.read ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200'} rounded-lg p-4 transition-all hover:shadow-md`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-4">
                    {getNotificationIcon(notification.title)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        {getNotificationTitle(notification.title)}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-600">{notification.message}</p>
                    <div className="mt-3 flex justify-end">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="mt-2 text-lg font-medium text-gray-900">No notifications to display</p>
            <p className="mt-1 text-gray-500">
              {filter === 'unread' ? 'You have no unread notifications.' : 'You have no notifications yet.'}
            </p>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
