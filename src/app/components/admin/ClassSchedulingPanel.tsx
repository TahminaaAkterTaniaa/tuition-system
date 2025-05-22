'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EmptyStatePrompt from './EmptyStatePrompt';

interface Teacher {
  id: string;
  teacherId: string;
  user: {
    name: string;
    email: string;
  };
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
}

interface Room {
  id: string;
  name: string;
  capacity: number | null;
  building: string | null;
  floor: string | null;
  features: string | null;
}

interface ClassFormData {
  name: string;
  subject: string;
  description: string;
  startDate: string;
  endDate: string;
  capacity: string;
  teacherId: string;
  selectedDays: string[];
  selectedTime: string;
  selectedRoom: string;
}

const UnifiedClassCreationCard = () => {
  const router = useRouter();
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [formData, setFormData] = useState<ClassFormData>({
    name: '',
    subject: '',
    description: '',
    startDate: '',
    endDate: '',
    capacity: '30',
    teacherId: '',
    selectedDays: [],
    selectedTime: '',
    selectedRoom: '',
  });
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Fetch teachers and available rooms
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch teachers
        const teachersResponse = await fetch('/api/admin/teachers');
        if (!teachersResponse.ok) {
          console.error('Failed to fetch teachers');
          setTeachers([]);
        } else {
          const teachersData = await teachersResponse.json();
          setTeachers(teachersData);
        }
        
        // Fetch rooms from the API
        const roomsResponse = await fetch('/api/admin/rooms');
        if (!roomsResponse.ok) {
          console.error('Failed to fetch rooms');
          setRooms([]);
        } else {
          const roomsData = await roomsResponse.json();
          setRooms(roomsData);
        }
        
        // Fetch time slots from the API
        const timeSlotsResponse = await fetch('/api/admin/timeslots');
        if (!timeSlotsResponse.ok) {
          console.error('Failed to fetch time slots');
          setTimeSlots([]); // Set empty array if fetch fails
        } else {
          const timeSlotsData = await timeSlotsResponse.json();
          setTimeSlots(timeSlotsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Don't show error toast, we'll handle missing data gracefully
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDayToggle = (day: string) => {
    setFormData(prev => {
      const selectedDays = [...prev.selectedDays];
      if (selectedDays.includes(day)) {
        return { ...prev, selectedDays: selectedDays.filter(d => d !== day) };
      } else {
        return { ...prev, selectedDays: [...selectedDays, day] };
      }
    });
  };
  
  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Class name is required');
      return false;
    }
    if (!formData.subject.trim()) {
      toast.error('Subject is required');
      return false;
    }
    if (!formData.startDate) {
      toast.error('Start date is required');
      return false;
    }
    if (!formData.capacity || parseInt(formData.capacity) <= 0) {
      toast.error('Valid capacity is required');
      return false;
    }
    if (formData.selectedDays.length === 0) {
      toast.error('Please select at least one day');
      return false;
    }
    if (!formData.selectedTime) {
      toast.error('Please select a time slot');
      return false;
    }
    if (!formData.selectedRoom) {
      toast.error('Please select a room');
      return false;
    }
    return true;
  };
  
  // Check for scheduling conflicts
  const checkForConflicts = async () => {
    if (!validateForm()) {
      return false;
    }
    
    setIsCheckingConflicts(true);
    setConflicts([]);
    
    try {
      // Find the selected room object from the rooms array
      const selectedRoom = rooms.find(room => room.id === formData.selectedRoom);
      
      const schedules = formData.selectedDays.map(day => ({
        day,
        time: formData.selectedTime,
        roomId: formData.selectedRoom,
        roomName: selectedRoom?.name || 'Unknown Room'
      }));
      
      console.log('Checking conflicts with schedules:', schedules);
      
      try {
        const response = await fetch('/api/admin/schedule/conflicts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            schedules,
            teacherId: formData.teacherId || null
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          toast.error(errorData.error || 'Failed to check for conflicts');
          return false;
        }
        
        const data = await response.json();
        
        if (data.hasConflicts) {
          setConflicts(data.conflicts);
          return false;
        }
        
        return true;
      } catch (fetchError) {
        console.error('Network error checking for conflicts:', fetchError);
        toast.error('Network error when checking for conflicts. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Error checking for conflicts:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to check for conflicts');
      return false;
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // First check for conflicts
    const noConflicts = await checkForConflicts();
    if (!noConflicts) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Step 1: Create the class
      const classResponse = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          subject: formData.subject,
          description: formData.description,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          capacity: formData.capacity,
          room: formData.selectedRoom,
          teacherId: formData.teacherId || null,
        }),
      });
      
      if (!classResponse.ok) {
        const errorData = await classResponse.json();
        throw new Error(errorData.error || 'Failed to create class');
      }
      
      const newClass = await classResponse.json();
      
      // Step 2: Create schedules for each selected day
      const schedules = formData.selectedDays.map(day => ({
        day,
        time: formData.selectedTime,
        room: formData.selectedRoom,
      }));
      
      const scheduleResponse = await fetch(`/api/admin/classes/${newClass.id}/schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schedules,
          action: 'replace', // Replace any existing schedules
        }),
      });
      
      if (!scheduleResponse.ok) {
        const errorData = await scheduleResponse.json();
        throw new Error(errorData.error || 'Failed to create class schedule');
      }
      
      // Show success message and redirect to classes page
      toast.success('Class created successfully with schedule!');
      
      // Short delay before redirecting to ensure the toast is visible
      setTimeout(() => {
        router.push('/classes');
      }, 1500);
      
      // Reset form (though we're redirecting, this is good practice)
      setFormData({
        name: '',
        subject: '',
        description: '',
        startDate: '',
        endDate: '',
        capacity: '30',
        teacherId: '',
        selectedDays: [],
        selectedTime: '',
        selectedRoom: '',
      });
      
    } catch (error) {
      console.error('Error creating class:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create class');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }
  
  // Check if we have teachers and rooms
  if (rooms.length === 0) {
    return (
      <div className="space-y-6">
        {/* Teacher selection is optional - admin can schedule classes without teachers */}
        
        {rooms.length === 0 && (
          <EmptyStatePrompt
            title="No Rooms Available"
            description="You need to add rooms before you can create classes. Rooms are required for scheduling classes."
            actionLabel="Add Rooms"
            onAction={() => window.location.href = '/admin/class-scheduling?tab=rooms'}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>}
          />
        )}
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Create New Class</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Class Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class Name*
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Advanced Mathematics"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject*
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Mathematics"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Class description"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date*
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity*
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                min="1"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign Teacher
              </label>
              <select
                name="teacherId"
                value={formData.teacherId}
                onChange={handleInputChange}
                aria-label="Select a teacher"
                title="Select a teacher"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Schedule Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Days
              </label>
              <div className="grid grid-cols-3 gap-2">
                {days.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    aria-label={`Select ${day}`}
                    title={`Select ${day}`}
                    aria-pressed={formData.selectedDays.includes(day) ? 'true' : 'false'}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      formData.selectedDays.includes(day)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Time
              </label>
              <select
                name="selectedTime"
                value={formData.selectedTime}
                onChange={handleInputChange}
                aria-label="Select a time slot"
                title="Select a time slot"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                
              >
                <option value="">Select a time slot</option>
                {timeSlots && timeSlots.length > 0 ? (
                  timeSlots.map((timeSlot) => (
                    <option key={timeSlot.id} value={timeSlot.label}>
                      {timeSlot.label}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No time slots available</option>
                )}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Room
              </label>
              <select
                name="selectedRoom"
                value={formData.selectedRoom}
                onChange={handleInputChange}
                aria-label="Select a room"
                title="Select a room"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                
              >
                <option value="">Select a room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}{room.capacity ? ` (Capacity: ${room.capacity})` : ''}{room.building ? ` - ${room.building}` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md mt-4">
              <h3 className="font-medium text-blue-800 mb-2">Schedule Summary</h3>
              {formData.selectedDays.length > 0 ? (
                <div>
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Days:</span>{' '}
                    {formData.selectedDays.join(', ')}
                  </p>
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Time:</span>{' '}
                    {formData.selectedTime || 'Not selected'}
                  </p>
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Room:</span>{' '}
                    {formData.selectedRoom || 'Not selected'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-blue-700">No schedule selected yet</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <button
            type="submit"
            disabled={isSubmitting || isCheckingConflicts}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              (isSubmitting || isCheckingConflicts) ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Creating Class...' : isCheckingConflicts ? 'Checking Conflicts...' : 'Create Class'}
          </button>
          
          {conflicts.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-sm font-medium text-red-800">Scheduling Conflicts Detected:</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc pl-5">
                {conflicts.map((conflict, index) => (
                  <li key={index}>
                    {conflict.type === 'room' 
                      ? `Room ${conflict.room} is already booked on ${conflict.day} at ${conflict.time} for ${conflict.conflictingClass}` 
                      : `Teacher is already scheduled on ${conflict.day} at ${conflict.time} for ${conflict.conflictingClass}`}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-red-700">Please adjust your schedule and try again.</p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default UnifiedClassCreationCard;
