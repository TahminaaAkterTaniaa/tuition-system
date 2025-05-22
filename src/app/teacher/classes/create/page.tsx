'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

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
  selectedDays: string[];
  selectedTime: string;
  selectedRoom: string;
}

export default function CreateClass() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<ClassFormData>({
    name: '',
    subject: '',
    description: '',
    startDate: '',
    endDate: '',
    capacity: '30',
    selectedDays: [],
    selectedTime: '',
    selectedRoom: ''
  });
  
  // Data for dropdowns
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Form errors
  const [formErrors, setFormErrors] = useState<{
    startTime?: string;
    endTime?: string;
    overlap?: string;
    conflictingSlot?: any;
    general?: string;
  }>({});

  // Fetch rooms and time slots
  const fetchData = async () => {
    try {
      // Fetch rooms
      const roomsResponse = await fetch('/api/teacher/rooms');
      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json();
        setRooms(roomsData);
      } else {
        console.error('Failed to fetch rooms');
        toast.error('Failed to fetch rooms');
      }
      
      // Fetch time slots
      const timeSlotsResponse = await fetch('/api/teacher/timeslots');
      if (timeSlotsResponse.ok) {
        const timeSlotsData = await timeSlotsResponse.json();
        setTimeSlots(timeSlotsData);
      } else {
        console.error('Failed to fetch time slots');
        toast.error('Failed to fetch time slots');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading form data. Please try again.');
    }
  };

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user.role !== 'TEACHER') {
      router.push('/');
      return;
    }

    fetchData();
    setIsLoading(false);
  }, [session, status, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
  
  const formatTimeLabel = () => {
    if (formData.selectedTime) {
      return formData.selectedTime;
    }
    return '';
  };

  // Check for scheduling conflicts
  const checkForConflicts = async () => {
    // Basic validation already done in handleSubmit
    if (formData.selectedDays.length === 0 || !formData.selectedTime || !formData.selectedRoom) {
      return true; // No scheduling info, so no conflicts
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
        const response = await fetch('/api/teacher/schedule/conflicts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            schedules,
            teacherId: session?.user.id || null
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
          // Show the conflicts in a toast message
          toast.error('Scheduling conflicts detected. Please check the conflicts section.');
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
    // Days, time, and room are now optional
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Only check for conflicts if schedule information is provided
    if (formData.selectedDays.length > 0 && formData.selectedTime && formData.selectedRoom) {
      const noConflicts = await checkForConflicts();
      if (!noConflicts) {
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      // Step 1: Create the class
      const classResponse = await fetch('/api/teacher/classes', {
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
          room: formData.selectedRoom, // This is the roomId parameter expected by the API
          // No need to specify teacherId, it will be automatically set from the session
        }),
      });
      
      if (!classResponse.ok) {
        const errorData = await classResponse.json();
        throw new Error(errorData.error || 'Failed to create class');
      }
      
      const newClass = await classResponse.json();
      
      // Step 2: Create schedules only if we have days, time, and room selected
      if (formData.selectedDays.length > 0 && formData.selectedTime && formData.selectedRoom) {
        const schedules = formData.selectedDays.map(day => ({
          day,
          time: formData.selectedTime,
          room: formData.selectedRoom,
        }));
        
        try {
          const scheduleResponse = await fetch(`/api/teacher/classes/${newClass.id}/schedule`, {
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
            console.error('Schedule creation error:', errorData);
            toast.error(errorData.error || 'Failed to create class schedule');
            // Don't throw error here, we still created the class successfully
          } else {
            console.log('Schedules created successfully');
          }
        } catch (scheduleError) {
          console.error('Error creating schedules:', scheduleError);
          toast.error('Error creating schedules, but class was created');
          // Don't throw error here, we still created the class successfully
        }
      } else {
        console.log('No schedule information provided, skipping schedule creation');
      }
      
      // Show success message and redirect to classes page
      toast.success('Class created successfully with schedule!');
      
      // Short delay before redirecting to ensure the toast is visible
      setTimeout(() => {
        router.push('/teacher/classes');
      }, 1500);
      
      // Reset form (though we're redirecting, this is good practice)
      setFormData({
        name: '',
        subject: '',
        description: '',
        startDate: '',
        endDate: '',
        capacity: '30',
        selectedDays: [],
        selectedTime: '',
        selectedRoom: '',
      });
      
    } catch (err) {
      console.error('Error creating class:', err);
      toast.error(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If there are no rooms, show an empty state
  if (rooms.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Create New Class</h1>
          <Link 
            href="/teacher/classes"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
          >
            Back to Classes
          </Link>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold mb-4">No Rooms Available</h2>
          <p className="text-gray-600 mb-6">
            You need to add rooms before you can create classes. Rooms are required for scheduling classes.
          </p>
          <Link 
            href="/teacher/classes"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md inline-block"
          >
            Back to Classes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create New Class</h1>
        <Link 
          href="/teacher/classes"
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
        >
          Back to Classes
        </Link>
      </div>

      {/* Conflicts display */}
      {conflicts.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <h3 className="font-bold">Scheduling Conflicts Detected:</h3>
          <ul className="list-disc pl-5 mt-2">
            {conflicts.map((conflict, index) => (
              <li key={index}>
                {conflict.type === 'room' ? 'Room conflict' : 'Teacher conflict'}: 
                {conflict.day} at {conflict.time} in {conflict.roomName || 'unknown room'}
                {conflict.className && ` with class "${conflict.className}"`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Class Name */}
            <div className="col-span-1">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="name">
                Class Name*
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            
            <div className="col-span-1">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="subject">
                Subject*
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32"
              ></textarea>
            </div>

            <div className="col-span-1">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="capacity">
                Capacity*
              </label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                min="1"
                required
              />
            </div>

            <div className="col-span-1">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="startDate">
                Start Date*
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="col-span-1">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="endDate">
                End Date (Optional)
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-gray-700 font-medium mb-2">
                Select Days (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {days.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    className={`px-3 py-1 rounded-md text-sm ${formData.selectedDays.includes(day) 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-1">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="selectedTime">
                Select Time (Optional)
              </label>
              <select
                id="selectedTime"
                name="selectedTime"
                value={formData.selectedTime}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a time slot</option>
                {timeSlots.map(slot => (
                  <option key={slot.id} value={slot.id}>
                    {slot.label} ({slot.startTime} - {slot.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="selectedRoom">
                Select Room (Optional)
              </label>
              <select
                id="selectedRoom"
                name="selectedRoom"
                value={formData.selectedRoom}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a room</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.name} (Capacity: {room.capacity || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1 md:col-span-2 mt-4">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md"
                disabled={isSubmitting || isCheckingConflicts}
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    Creating...
                  </>
                ) : isCheckingConflicts ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    Checking Conflicts...
                  </>
                ) : (
                  'Create Class'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
