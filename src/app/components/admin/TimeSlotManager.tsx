'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
}

const TimeSlotManager = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newTimeSlot, setNewTimeSlot] = useState({
    startTime: '',
    endTime: '',
    label: '',
  });
  
  // Function to fetch time slots
  const fetchTimeSlots = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/timeslots', {
        credentials: 'include' // Include cookies for authentication
      });
      console.log('Fetch time slots response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch time slots');
      }
      
      const data = await response.json();
      console.log('Fetched time slots:', data);
      setTimeSlots(data);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast.error('Failed to load time slots');
      // Set empty array to avoid undefined errors
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch time slots on component mount
  useEffect(() => {
    fetchTimeSlots();
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTimeSlot(prev => ({ ...prev, [name]: value }));
  };
  
  const formatTimeLabel = () => {
    if (!newTimeSlot.startTime || !newTimeSlot.endTime) return '';
    
    try {
      // Convert 24-hour format to 12-hour format for display
      const formatTime = (time: string) => {
        const parts = time.split(':').map(Number);
        const hours = parts[0] || 0;
        const minutes = parts[1] || 0;
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      };
      
      const startFormatted = formatTime(newTimeSlot.startTime);
      const endFormatted = formatTime(newTimeSlot.endTime);
      
      return `${startFormatted} - ${endFormatted}`;
    } catch (error) {
      return '';
    }
  };
  
  // State for form validation errors
  const [formErrors, setFormErrors] = useState<{
    general?: string;
    startTime?: string;
    endTime?: string;
    overlap?: string;
    conflictingSlot?: {
      id: string;
      label: string;
      startTime: string;
      endTime: string;
    };
  }>({});

  const handleAddTimeSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setFormErrors({});
    
    // Basic validation
    if (!newTimeSlot.startTime || !newTimeSlot.endTime) {
      setFormErrors({
        general: 'Start time and end time are required'
      });
      toast.error('Start time and end time are required');
      return;
    }
    
    try {
      setIsLoading(true); // Show loading state
      
      // Generate a label if not provided
      const label = newTimeSlot.label || formatTimeLabel();
      
      const timeSlotData = {
        startTime: newTimeSlot.startTime,
        endTime: newTimeSlot.endTime,
        label: label
      };
      
      console.log('Sending time slot data:', timeSlotData);
      
      const response = await fetch('/api/admin/timeslots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(timeSlotData),
        credentials: 'include' // Include cookies for authentication
      });
      
      const data = await response.json();
      console.log('Time slot creation response:', data);
      
      if (!response.ok) {
        // Handle specific error types
        if (response.status === 409 && data.error && data.error.includes('overlaps')) {
          // This is a time slot overlap error
          setFormErrors({
            overlap: data.error,
            conflictingSlot: data.conflictingSlot
          });
          throw new Error(data.error);
        } else if (data.error && data.error.includes('End time must be after start time')) {
          setFormErrors({
            endTime: 'End time must be after start time'
          });
          throw new Error(data.error);
        } else {
          // Generic error
          setFormErrors({
            general: data.error || 'Failed to add time slot'
          });
          throw new Error(data.error || 'Failed to add time slot');
        }
      }
      
      // Refresh the time slot list instead of adding to existing list
      await fetchTimeSlots();
      
      // Reset form and errors
      setNewTimeSlot({
        startTime: '',
        endTime: '',
        label: '',
      });
      setFormErrors({});
      
      setIsAdding(false);
      toast.success('Time slot added successfully');
    } catch (error) {
      console.error('Error adding time slot:', error);
      // Toast is already shown by the specific error handlers above
      if (!(formErrors.overlap || formErrors.endTime)) {
        toast.error(error instanceof Error ? error.message : 'Failed to add time slot');
      }
    } finally {
      setIsLoading(false); // Hide loading state
    }
  };
  
  const handleDeleteTimeSlot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time slot?')) {
      return;
    }
    
    try {
      setIsLoading(true); // Show loading state
      console.log('Deleting time slot with ID:', id);
      
      // Find the time slot name for better error messages
      const timeSlotToDelete = timeSlots.find(slot => slot.id === id);
      const timeSlotLabel = timeSlotToDelete?.label || 'Unknown';
      
      // Use a simple timeout approach without AbortController
      // to avoid browser compatibility issues
      const response = await fetch(`/api/admin/timeslots?id=${id}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Delete response status:', response.status);
      const data = await response.json();
      console.log('Delete response data:', data);
      
      if (!response.ok) {
        // Handle specific error cases with user-friendly messages
        if (response.status === 409 || (data.error && data.error.includes('in use by classes'))) {
          toast.error(`Cannot delete "${timeSlotLabel}". This time slot is currently in use by one or more classes.`);
          return;
        } else if (response.status === 404) {
          toast.error(`Time slot "${timeSlotLabel}" not found. It may have been already deleted.`);
          // Refresh the list anyway to ensure UI is in sync
          await fetchTimeSlots();
          return;
        } else if (response.status === 503 || 
                  (data.error && 
                   (data.error.includes('Database connection') || 
                    data.error.includes('timed out') || 
                    data.error.includes('timeout')))) {
          // Handle database timeout errors
          toast.error('Database operation timed out. Please try again later when the database is responsive.');
          return;
        }
        // For any other error
        toast.error(data.error || 'Failed to delete time slot');
        return;
      }
      
      // Refresh the time slot list instead of updating locally
      await fetchTimeSlots();
      toast.success(`Time slot "${timeSlotLabel}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting time slot:', error);
      
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('in use by classes')) {
          toast.error('This time slot cannot be deleted because it is currently in use by one or more classes.');
        } else if (error.message.includes('Database connection') || 
                   error.message.includes('timed out') || 
                   error.message.includes('timeout')) {
          toast.error('Database operation timed out. Please try again later when the database is responsive.');
        } else if (error.name === 'AbortError') {
          toast.error('Request timed out. Please check your connection and try again.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Failed to delete time slot. Please try again.');
      }
    } finally {
      setIsLoading(false); // Hide loading state
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
        <div className="h-32 bg-gray-200 rounded mb-4"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Manage Time Slots</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label={isAdding ? 'Cancel adding time slot' : 'Add new time slot'}
        >
          {isAdding ? 'Cancel' : 'Add Time Slot'}
        </button>
      </div>
      
      {isAdding && (
        <form onSubmit={handleAddTimeSlot} className="mb-6 p-4 border border-gray-200 rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                Start Time*
              </label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={newTimeSlot.startTime}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 ${formErrors.startTime ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500'}`}
                required
                aria-label="Start time"
              />
              {formErrors.startTime && (
                <p className="mt-1 text-sm text-red-600">{formErrors.startTime}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                End Time*
              </label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={newTimeSlot.endTime}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 ${formErrors.endTime ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500'}`}
                required
                aria-label="End time"
              />
              {formErrors.endTime && (
                <p className="mt-1 text-sm text-red-600">{formErrors.endTime}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
                Label (Optional)
              </label>
              <input
                type="text"
                id="label"
                name="label"
                value={newTimeSlot.label}
                onChange={handleInputChange}
                placeholder={formatTimeLabel() || "e.g., Morning Session"}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Label"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for automatic label</p>
            </div>
          </div>
          
          {/* Error messages for overlapping time slots */}
          {formErrors.overlap && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 font-medium">{formErrors.overlap}</p>
              {formErrors.conflictingSlot && (
                <p className="text-xs text-red-500 mt-1">
                  Conflicting time slot: {formErrors.conflictingSlot.label}
                </p>
              )}
            </div>
          )}
          
          {/* General error messages */}
          {formErrors.general && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{formErrors.general}</p>
            </div>
          )}
          
          <div className="mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Save Time Slot
            </button>
          </div>
        </form>
      )}
      
      {timeSlots.length === 0 ? (
        <div className="text-center py-10 px-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="mx-auto w-16 h-16 flex items-center justify-center bg-indigo-100 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Time Slots Available</h3>
          <p className="text-sm text-gray-600 mb-6">You haven't added any time slots yet. Time slots are required for scheduling classes.</p>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Your First Time Slot
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Label
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End Time
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeSlots.map((slot) => (
                <tr key={slot.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{slot.label}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{slot.startTime}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{slot.endTime}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteTimeSlot(slot.id)}
                      className="text-red-600 hover:text-red-900"
                      aria-label={`Delete time slot ${slot.label}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TimeSlotManager;
