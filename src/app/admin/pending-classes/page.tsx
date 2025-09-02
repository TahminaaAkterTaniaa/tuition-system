'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RejectionModal from '@/app/components/RejectionModal';

interface ClassRequest {
  id: string;
  status: string;
  createdAt: string;
  classId: string;
  teacherId: string;
  notes?: string;
  teacher?: {
    id: string;
    teacherId: string;
    user: {
      name: string;
      email: string;
    }
  };
  class?: {
    id: string;
    name: string;
    subject: string;
    description?: string;
    startDate: string;
    capacity: number;
    fee: number;
    status: string;
    room?: string;
    roomInfo?: {
      id: string;
      name: string;
      capacity: number | null;
    };
  }
}

export default function PendingClassesPage() {
  const router = useRouter();
  const [pendingClasses, setPendingClasses] = useState<ClassRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState('');
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  
  // Fetch pending class requests
  useEffect(() => {
    const fetchPendingClasses = async () => {
      setIsLoading(true);
      try {
        // Use the dedicated admin API endpoint for pending classes
        const response = await fetch('/api/admin/pending-classes');
        if (response.ok) {
          const data = await response.json();
          setPendingClasses(data);
          console.log('Pending classes loaded:', data);
        } else {
          const errorData = await response.json();
          console.error('API error:', errorData);
          throw new Error(errorData.message || 'Failed to fetch pending class requests');
        }
      } catch (error) {
        console.error('Error fetching pending classes:', error);
        toast.error('Failed to load pending class requests');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPendingClasses();
  }, []);
  
  // Handle approval or rejection
  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    setIsProcessing(true);
    try {
      console.log('Approving request:', requestId);
      
      const requestData = { 
        requestId, 
        action: 'approve',
        notes: 'Approved by admin' 
      };
      console.log('Request data:', requestData);
      
      const response = await fetch(`/api/admin/class-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log('Response status:', response.status);
      
      // Safely parse the response to avoid "Unexpected end of JSON input" errors
      let responseData = {};
      const responseText = await response.text();
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
        }
      }
      
      console.log('Response data:', responseData);
      
      if (response.ok) {
        toast.success('Class request approved successfully');
        // Remove the approved request from the list
        setPendingClasses(pendingClasses.filter(req => req.id !== requestId));
        // Navigate back to admin dashboard after a short delay
        setTimeout(() => {
          router.push('/admin');
        }, 1500);
      } else {
        const errorMessage = typeof responseData === 'object' && responseData !== null 
          ? (responseData.message || responseData.error || 'Failed to approve class request')
          : 'Failed to approve class request';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error approving class request:', error);
      toast.error(error.message || 'Failed to approve class request');
    } finally {
      setProcessingId('');
      setIsProcessing(false);
    }
  };
  
  const handleRejectClick = (requestId: string) => {
    setSelectedRequestId(requestId);
    setIsRejectionModalOpen(true);
  };

  const handleRejectConfirm = async (rejectionReason: string) => {
    if (!selectedRequestId) return;
    
    setProcessingId(selectedRequestId);
    setIsProcessing(true);
    try {
      console.log('Rejecting request:', selectedRequestId, 'with reason:', rejectionReason);
      
      const requestData = { 
        requestId: selectedRequestId, 
        action: 'reject',
        notes: rejectionReason 
      };
      console.log('Request data:', requestData);
      
      const response = await fetch(`/api/admin/class-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log('Response status:', response.status);
      
      // Safely parse the response to avoid "Unexpected end of JSON input" errors
      let responseData = {};
      const responseText = await response.text();
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
        }
      }
      
      console.log('Response data:', responseData);
      
      if (response.ok) {
        toast.success('Class request rejected successfully');
        // Remove the rejected request from the list
        setPendingClasses(pendingClasses.filter(req => req.id !== selectedRequestId));
        // Close the modal
        setIsRejectionModalOpen(false);
        setSelectedRequestId('');
        // Navigate back to admin dashboard after a short delay
        setTimeout(() => {
          router.push('/admin');
        }, 1500);
      } else {
        const errorMessage = typeof responseData === 'object' && responseData !== null 
          ? (responseData.message || responseData.error || 'Failed to reject class request')
          : 'Failed to reject class request';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error rejecting class request:', error);
      toast.error(error.message || 'Failed to reject class request');
    } finally {
      setProcessingId('');
      setIsProcessing(false);
    }
  };

  const handleRejectCancel = () => {
    setIsRejectionModalOpen(false);
    setSelectedRequestId('');
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pending Class Requests</h1>
        <Link 
          href="/admin" 
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          Back to Dashboard
        </Link>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : pendingClasses.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">No pending class requests found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingClasses.map((request) => (
            <div key={request.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{request.class?.name}</h2>
                  <p className="text-sm text-gray-500">
                    Requested on {formatDate(request.createdAt)}
                  </p>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  Pending
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Subject</h3>
                  <p className="text-base text-gray-900">{request.class?.subject}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Teacher</h3>
                  <p className="text-base text-gray-900">{request.teacher?.user.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Capacity</h3>
                  <p className="text-base text-gray-900">{request.class?.capacity} students</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Fee</h3>
                  <p className="text-base text-gray-900">${request.class?.fee}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Start Date</h3>
                  <p className="text-base text-gray-900">{new Date(request.class?.startDate || '').toLocaleDateString()}</p>
                </div>
                {request.class?.roomInfo && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Room</h3>
                    <p className="text-base text-gray-900">{request.class.roomInfo.name}</p>
                  </div>
                )}
              </div>
              
              {request.class?.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500">Description</h3>
                  <p className="text-base text-gray-900">{request.class.description}</p>
                </div>
              )}
              
              {request.notes && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500">Notes from Teacher</h3>
                  <p className="text-base text-gray-900">{request.notes}</p>
                </div>
              )}
              
              <div className="flex space-x-4">
                <button
                  onClick={() => handleApprove(request.id)}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm"
                  disabled={isProcessing || processingId === request.id}
                >
                  {processingId === request.id ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleRejectClick(request.id)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm"
                  disabled={isProcessing || processingId === request.id}
                >
                  {processingId === request.id ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Rejection Modal */}
      <RejectionModal
        isOpen={isRejectionModalOpen}
        onClose={handleRejectCancel}
        onConfirm={handleRejectConfirm}
        isProcessing={isProcessing}
      />
    </div>
  );
}
