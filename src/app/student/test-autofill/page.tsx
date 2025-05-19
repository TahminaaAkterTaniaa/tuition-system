'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import EnrollmentForm from '@/components/EnrollmentForm';
import { toast } from 'react-hot-toast';

export default function TestAutofillPage() {
  const { data: session } = useSession();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id);
      console.log('User ID set:', session.user.id);
    } else {
      console.log('No user ID in session');
    }
    setLoading(false);
  }, [session]);

  const handleTestApi = async () => {
    if (!userId) {
      toast.error('No user ID available');
      return;
    }

    try {
      toast.loading('Testing API...');
      const response = await fetch(`/api/student/profile/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();
      console.log('API Response:', data);
      
      if (response.ok) {
        toast.success('API call successful');
      } else {
        toast.error(`API error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('API test error:', error);
      toast.error('API test failed');
    } finally {
      toast.dismiss();
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Test Auto-fill Feature</h1>
      
      <div className="mb-8 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
        <p>User ID: {userId || 'Not available'}</p>
        <p>Logged in: {session ? 'Yes' : 'No'}</p>
        <button 
          onClick={handleTestApi}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test API Directly
        </button>
      </div>

      <div className="border p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Enrollment Form (Auto-fill Test)</h2>
        {userId ? (
          <EnrollmentForm 
            classId="test-class-id" 
            userId={userId} 
            className="w-full"
            onSuccess={() => toast.success('Form submitted successfully')}
          />
        ) : (
          <p className="text-red-500">Please log in to test the auto-fill feature</p>
        )}
      </div>
    </div>
  );
}
