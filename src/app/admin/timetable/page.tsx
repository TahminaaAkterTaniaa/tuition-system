'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Teacher {
  id: string;
  teacherId: string;
  user: {
    name: string;
    email: string;
  };
  workload?: {
    classCount: number;
    totalStudents: number;
    weeklyHours: number;
    isOverloaded: boolean;
  };
  classes?: Class[];
}

interface Room {
  id: string;
  name: string;
  capacity?: number | null;
  building?: string;
  floor?: string;
  features?: string;
}

interface Class {
  id: string;
  name: string;
  subject: string;
  schedule: string | null;
  room: string | null;
  roomId?: string | null;
  teacherId: string | null;
  schedules?: ClassSchedule[];
}

interface ClassSchedule {
  id: string;
  classId: string;
  day: string;
  time?: string;
  timeSlotId?: string;
  roomId: string | null;
  timeSlot?: {
    id: string;
    startTime: string;
    endTime: string;
    label: string;
  };
  room?: {
    id: string;
    name: string;
  };
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
}

export default function TimetableGenerator() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State variables
  const [isLoading, setIsLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [unassignedClasses, setUnassignedClasses] = useState<Class[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [workloadWarnings, setWorkloadWarnings] = useState<{[key: string]: string}>({});
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [draggedClass, setDraggedClass] = useState<Class | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [pendingChanges, setPendingChanges] = useState<any[]>([]);
  
  // Fixed days of the week for the timetable
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Fetch all necessary data on component mount
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchAllData();
    }
  }, [status, router]);

  // Fetch all data needed for the timetable
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      // Fetch data in sequence to ensure proper dependencies
      await fetchTimeSlots();
      await fetchRooms();
      await fetchTeachers();
      await fetchClassesAndSchedules();
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load timetable data');
      setIsLoading(false);
    }
  };

  // Fetch time slots from the database
  const fetchTimeSlots = async () => {
    try {
      const response = await fetch('/api/admin/timeslots');
      if (!response.ok) {
        throw new Error('Failed to fetch time slots');
      }
      const data = await response.json();
      setTimeSlots(data);
      return data;
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast.error('Failed to load time slots');
      return [];
    }
  };

  // Fetch rooms from the database
  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/admin/rooms');
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      const data = await response.json();
      setRooms(data);
      return data;
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to load rooms');
      return [];
    }
  };

  // Fetch teachers with their workload information
  const fetchTeachers = async () => {
    try {
      const teachersResponse = await fetch('/api/admin/teachers');
      if (!teachersResponse.ok) {
        throw new Error('Failed to fetch teachers');
      }
      const teachersData = await teachersResponse.json();
      setTeachers(teachersData);
      
      // Check for teacher workload warnings
      checkTeacherWorkloads(teachersData);
      
      return teachersData;
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to load teachers');
      return [];
    }
  };
  
  // Fetch classes and their schedules
  const fetchClassesAndSchedules = async () => {
    try {
      // Fetch classes
      const classesResponse = await fetch('/api/admin/classes');
      if (!classesResponse.ok) {
        throw new Error('Failed to fetch classes');
      }
      const classesData = await classesResponse.json();
      
      // Fetch all schedules
      const schedulesResponse = await fetch('/api/admin/schedules');
      if (!schedulesResponse.ok) {
        throw new Error('Failed to fetch schedules');
      }
      const schedulesData = await schedulesResponse.json();
      
      // Map schedules to their respective classes
      const classesWithSchedules = classesData.map((cls: Class) => {
        const classSchedules = schedulesData.filter(
          (schedule: ClassSchedule) => schedule.classId === cls.id
        );
        
        return {
          ...cls,
          schedules: classSchedules
        };
      });
      
      setClasses(classesWithSchedules);
      
      // Identify unassigned classes (classes without schedules)
      const unassigned = classesWithSchedules.filter((cls: Class) => 
        !cls.schedules || cls.schedules.length === 0
      );
      setUnassignedClasses(unassigned);
      
      return classesWithSchedules;
    } catch (error) {
      console.error('Error fetching classes and schedules:', error);
      toast.error('Failed to load classes and schedules');
      return [];
    }
  };

  // Check for conflicts in the timetable (same teacher or room at the same time)
  const checkForConflicts = () => {
    const conflictSlots: string[] = [];
    
    // For each day and time slot
    days.forEach(day => {
      timeSlots.forEach(timeSlot => {
        // Find classes scheduled at this day and time
        const classesAtSlot = classes.filter(cls => 
          cls.schedules?.some(schedule => 
            schedule.day === day && schedule.timeSlot?.id === timeSlot.id
          )
        );
        
        // Check for teacher conflicts
        const teacherIds = new Set<string>();
        const teacherConflicts = new Set<string>();
        
        classesAtSlot.forEach(cls => {
          if (cls.teacherId) {
            if (teacherIds.has(cls.teacherId)) {
              teacherConflicts.add(cls.teacherId);
            } else {
              teacherIds.add(cls.teacherId);
            }
          }
        });
        
        // Check for room conflicts
        const roomIds = new Set<string>();
        const roomConflicts = new Set<string>();
        
        classesAtSlot.forEach(cls => {
          const schedule = cls.schedules?.find(s => 
            s.day === day && s.timeSlot?.id === timeSlot.id
          );
          
          if (schedule?.roomId) {
            if (roomIds.has(schedule.roomId)) {
              roomConflicts.add(schedule.roomId);
            } else {
              roomIds.add(schedule.roomId);
            }
          }
        });
        
        // If there are any conflicts, add the slot ID to the conflicts list
        if (teacherConflicts.size > 0 || roomConflicts.size > 0) {
          conflictSlots.push(`${day}-${timeSlot.label}`);
        }
      });
    });
    
    setConflicts(conflictSlots);
    return conflictSlots.length > 0;
  };

  // Check teacher workloads and set warnings
  const checkTeacherWorkloads = (teachersList: Teacher[]) => {
    const warnings: {[key: string]: string} = {};
    
    teachersList.forEach(teacher => {
      if (teacher.workload?.isOverloaded) {
        warnings[teacher.id] = `High workload: ${teacher.workload.weeklyHours} hours/week, ${teacher.workload.classCount} classes, ${teacher.workload.totalStudents} students`;
      }
    });
    
    setWorkloadWarnings(warnings);
  };

  // Handle drag start event
  const handleDragStart = (e: React.DragEvent, classObj: Class, source: string) => {
    // Store the class and source in state
    setDraggedClass(classObj);
    setDragSource(source);
    
    // Set the drag data
    e.dataTransfer.setData('application/json', JSON.stringify({
      classId: classObj.id,
      source
    }));
    
    // Set the drag effect
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over event
  const handleDragOver = (e: React.DragEvent, day: string, time: string) => {
    e.preventDefault();
    
    // Check if we have a dragged class
    if (!draggedClass) return;
    
    // Allow the drop
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent, day: string, time: string) => {
    e.preventDefault();
    
    // Check if we have a dragged class
    if (!draggedClass) return;
    
    // Find the corresponding time slot ID
    const timeSlot = timeSlots.find(ts => ts.label === time);
    if (!timeSlot) {
      toast.error(`Time slot ${time} not found`);
      return;
    }
    
    // If dragging from unassigned classes
    if (dragSource === 'unassigned') {
      // Create a pending change for a new schedule
      const newChange = {
        type: 'CREATE',
        classId: draggedClass.id,
        className: draggedClass.name,
        day,
        timeSlotId: timeSlot.id,
        timeSlotLabel: timeSlot.label,
        roomId: null,
        scheduleId: null
      };
      
      // Add to pending changes
      setPendingChanges(prev => [...prev, newChange]);
      setHasChanges(true);
      
      // Update UI to show the class in the new position
      const updatedClass = {
        ...draggedClass,
        schedules: [
          ...(draggedClass.schedules || []),
          {
            id: `temp-${Date.now()}`,
            classId: draggedClass.id,
            day,
            timeSlotId: timeSlot.id,
            timeSlot,
            roomId: null,
            time: timeSlot.startTime
          }
        ]
      };
      
      // Update classes array
      setClasses(prev => prev.map(c => c.id === draggedClass.id ? updatedClass : c));
      
      // Remove from unassigned if it was there
      setUnassignedClasses(prev => prev.filter(c => c.id !== draggedClass.id));
      
      // Refresh the data
      fetchClassesAndSchedules();
      toast.success(`${draggedClass.name} scheduled on ${day} at ${time} (not saved yet)`);
    }
    // If dragging from another slot in the timetable
    else if (dragSource && dragSource.includes('-')) {
      const [sourceDay, sourceTime] = dragSource.split('-');
      
      // Find the schedule that needs to be updated
      const sourceTimeSlot = timeSlots.find(ts => ts.label === sourceTime);
      if (!sourceTimeSlot) {
        toast.error(`Source time slot ${sourceTime} not found`);
        return;
      }
      
      // Find the schedule to update
      const scheduleToUpdate = draggedClass.schedules?.find(s => {
        const timeMatches = s.timeSlot?.label === sourceTime || s.time === sourceTime;
        return s.day === sourceDay && timeMatches;
      });
      
      if (!scheduleToUpdate) {
        toast.error('Schedule not found');
        return;
      }
      
      // Create a pending change for updating a schedule
      const updateChange = {
        type: 'UPDATE',
        classId: draggedClass.id,
        className: draggedClass.name,
        day,
        timeSlotId: timeSlot.id,
        timeSlotLabel: timeSlot.label,
        roomId: scheduleToUpdate.roomId,
        scheduleId: scheduleToUpdate.id,
        originalDay: sourceDay,
        originalTimeSlotId: sourceTimeSlot.id,
        originalTimeSlotLabel: sourceTime
      };
      
      // Add to pending changes
      setPendingChanges(prev => [...prev, updateChange]);
      setHasChanges(true);
      
      // Update UI to show the class in the new position
      const updatedSchedules = draggedClass.schedules?.map(s => {
        if (s.id === scheduleToUpdate.id) {
          return {
            ...s,
            day,
            timeSlotId: timeSlot.id,
            timeSlot,
            time: timeSlot.startTime
          };
        }
        return s;
      });
      
      const updatedClass = {
        ...draggedClass,
        schedules: updatedSchedules
      };
      
      // Update classes array
      setClasses(prev => prev.map(c => c.id === draggedClass.id ? updatedClass : c));
      
      // Refresh the data
      fetchClassesAndSchedules();
      toast.success(`${draggedClass.name} moved to ${day} at ${time} (not saved yet)`);
    }
    
    // Reset drag state
    setDraggedClass(null);
    setDragSource(null);
  };

  // Save all pending changes to the backend
  const saveChanges = async () => {
    if (pendingChanges.length === 0) {
      toast.success('No changes to save');
      return;
    }
    
    setIsSaving(true);
    const loadingToast = toast.loading('Saving changes...');
    
    try {
      // Process each pending change
      for (const change of pendingChanges) {
        if (change.type === 'CREATE') {
          // Create a new schedule
          const response = await fetch(`/api/admin/classes/${change.classId}/schedule`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              day: change.day,
              timeSlotId: change.timeSlotId,
              roomId: change.roomId
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to create schedule' }));
            throw new Error(errorData.error || 'Failed to create schedule');
          }
        } else if (change.type === 'UPDATE') {
          // Update an existing schedule
          const response = await fetch(`/api/admin/schedules/${change.scheduleId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              day: change.day,
              timeSlotId: change.timeSlotId,
              roomId: change.roomId
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to update schedule' }));
            throw new Error(errorData.error || 'Failed to update schedule');
          }
        }
      }
      
      // Refresh data after all changes are saved
      await fetchClassesAndSchedules();
      
      // Clear pending changes
      setPendingChanges([]);
      setHasChanges(false);
      
      toast.dismiss(loadingToast);
      toast.success('All changes saved successfully');
      
      // Check for conflicts after saving
      checkForConflicts();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel all pending changes
  const cancelChanges = () => {
    if (pendingChanges.length === 0) {
      toast.success('No changes to cancel');
      return;
    }
    
    // Reload data to discard all pending changes
    fetchAllData();
    setPendingChanges([]);
    setHasChanges(false);
    toast.success('Changes discarded');
  };

  // Handle teacher filter
  const handleTeacherFilter = (teacherId: string) => {
    setSelectedTeacher(selectedTeacher === teacherId ? null : teacherId);
    setSelectedRoom(''); // Reset room filter when changing teacher
    
    // Show toast notification
    if (selectedTeacher === teacherId) {
      toast.success('Showing all teachers');
    } else {
      const teacher = teachers.find((t: Teacher) => t.id === teacherId);
      if (teacher) {
        toast.success(`Showing schedule for ${teacher.user.name}`);
      }
    }
  };

  // Handle room filter
  const handleRoomFilter = (roomId: string) => {
    setSelectedRoom(selectedRoom === roomId ? '' : roomId);
  };

  // Helper function to get color based on subject
  const getSubjectColor = (subject: string | undefined) => {
    if (!subject) return 'bg-gray-200';
    
    // Generate a consistent color based on the subject name
    const hash = subject.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Use a predefined set of colors for better UI
    const colors = [
      'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-red-200',
      'bg-purple-200', 'bg-pink-200', 'bg-indigo-200', 'bg-teal-200'
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Helper function to get class style based on various factors
  const getClassStyle = (cls: Class) => {
    let style = getSubjectColor(cls.subject);
    
    // Add warning border for teachers with high workload
    if (cls.teacherId && workloadWarnings[cls.teacherId]) {
      style += ' border-2 border-orange-500';
    }
    
    // Highlight classes for the selected teacher
    if (selectedTeacher && cls.teacherId === selectedTeacher) {
      style += ' ring-2 ring-indigo-500';
    }
    
    return style;
  };

  // Main rendering logic for the TimetableGenerator component
  if (isLoading === true) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Filter classes based on selected teacher or room
  const filteredClasses = classes.filter(cls => {
    // If no filters are applied, show all classes
    if (!selectedTeacher && !selectedRoom) return true;
    
    // Filter by teacher
    if (selectedTeacher && cls.teacherId !== selectedTeacher) return false;
    
    // Filter by room
    if (selectedRoom && !cls.schedules?.some(schedule => schedule.roomId === selectedRoom)) return false;
    
    return true;
  });

  // Get classes for a specific day and time slot
  const getClassesForSlot = (day: string, timeSlotLabel: string) => {
    // Find the time slot to get its startTime
    const timeSlot = timeSlots.find(ts => ts.label === timeSlotLabel);
    if (!timeSlot) return [];
    
    // This function now relies primarily on the schedule data
    return filteredClasses.filter(cls => {
      // Check if this class has any schedules for this day and time
      return cls.schedules?.some(schedule => {
        // Primary match by timeSlotId which is most reliable
        const timeSlotIdMatch = schedule.timeSlotId === timeSlot.id;
        
        // Fallback matches if timeSlotId doesn't match
        const timeStringMatch = schedule.time === timeSlot.startTime;
        const labelMatch = schedule.timeSlot?.label === timeSlotLabel;
        
        return schedule.day === day && (timeSlotIdMatch || timeStringMatch || labelMatch);
      });
    });
  };

  // Check if a slot has conflicts
  const hasConflict = (day: string, time: string) => {
    return conflicts.includes(`${day}-${time}`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Timetable Generator</h1>
        
        {/* Save and Cancel buttons */}
        {hasChanges && (
          <div className="flex space-x-2">
            <button
              onClick={cancelChanges}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors duration-200"
              disabled={isSaving || pendingChanges.length === 0}
            >
              Cancel
            </button>
            <button
              onClick={saveChanges}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors duration-200 flex items-center"
              disabled={isSaving || pendingChanges.length === 0}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                `Save Changes (${pendingChanges.length})`
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Teacher Workload Filter */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Teacher Workload Filter</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleTeacherFilter('')}
            className={`px-3 py-1 rounded-full text-sm ${
              !selectedTeacher
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            } transition-colors duration-200`}
          >
            All Teachers
          </button>
          {teachers.map(teacher => (
            <button
              key={teacher.id}
              onClick={() => handleTeacherFilter(teacher.id)}
              className={`px-3 py-1 rounded-full text-sm flex items-center ${
                selectedTeacher === teacher.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              } transition-colors duration-200`}
            >
              {teacher.user.name} 
              <span className="ml-1 text-xs bg-gray-200 text-gray-800 px-1 rounded-full">
                {classes.filter(cls => cls.teacherId === teacher.id).length}
              </span>
              {workloadWarnings[teacher.id] && (
                <span title={workloadWarnings[teacher.id]} className="ml-1 cursor-help">⚠️</span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Unassigned Classes */}
        <div className="md:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Unassigned Classes</h2>
          <div className="border border-dashed border-gray-300 p-4 rounded-lg bg-gray-50 min-h-[400px] max-h-[600px] overflow-y-auto">
            {unassignedClasses.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No teacher assigned</p>
            ) : (
              unassignedClasses.map(cls => (
                <div
                  key={cls.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, cls, 'unassigned')}
                  className={`p-2 mb-2 rounded text-sm cursor-move ${getClassStyle(cls)} shadow hover:shadow-md transition-all duration-200`}
                >
                  <div className="font-semibold">{cls.name}</div>
                  <div className="text-xs">{cls.subject}</div>
                  <div className="text-xs text-gray-600">
                    {teachers.find(t => t.id === cls.teacherId)?.user.name || 'No teacher'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Timetable */}
        <div className="md:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Timetable</h2>
            <div className="flex items-center">
              <span className="mr-2 text-sm">Room Filter:</span>
              <select 
                className="border rounded p-1 text-sm"
                value={selectedRoom}
                onChange={(e) => handleRoomFilter(e.target.value)}
              >
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)] mt-4">
            <table className="min-w-full border-collapse border border-gray-300 table-fixed">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 bg-gray-100 text-left w-64">Time</th>
                  {days.map(day => (
                    <th key={day} className="border border-gray-300 p-2 bg-gray-100 text-left w-1/6">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(timeSlot => (
                  <tr key={timeSlot.id}>
                    <td className="border border-gray-300 p-2 bg-gray-50 font-medium text-sm w-64">
                      {timeSlot.label}
                    </td>
                    {days.map(day => {
                      const slotClasses = getClassesForSlot(day, timeSlot.label);
                      const slotId = `${day}-${timeSlot.label}`;
                      const conflict = hasConflict(day, timeSlot.label);
                      
                      return (
                        <td 
                          key={day} 
                          className={`border border-gray-300 p-2 align-top h-24 min-h-24 ${conflict ? 'bg-red-50' : 'bg-white'}`}
                          onDragOver={(e) => handleDragOver(e, day, timeSlot.label)}
                          onDrop={(e) => handleDrop(e, day, timeSlot.label)}
                        >
                          {slotClasses.length === 0 ? (
                            <div className="text-xs text-gray-400 italic h-full flex items-center justify-center">Drop class here</div>
                          ) : (
                            slotClasses.map(cls => {
                              const teacher = teachers.find(t => t.id === cls.teacherId);
                              // Find the schedule for this class on this day and time
                              const schedule = cls.schedules?.find(s => {
                                const timeMatches = s.timeSlot?.label === timeSlot.label || s.time === timeSlot.label;
                                return s.day === day && timeMatches;
                              });
                              const room = rooms.find(r => r.id === schedule?.roomId);
                              
                              return (
                                <div
                                  key={cls.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, cls, slotId)}
                                  className={`p-2 mb-2 rounded text-sm cursor-move ${getClassStyle(cls)} shadow hover:shadow-md transition-all duration-200`}
                                >
                                  <div className="font-semibold">{cls.name}</div>
                                  <div className="text-xs">{cls.subject}</div>
                                  <div className="text-xs text-gray-600">
                                    {teacher?.user.name || 'No teacher'}
                                  </div>
                                  {room && (
                                    <div className="text-xs text-gray-600">
                                      Room: {room.name}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Color Legend */}
          <div className="mt-6 p-4 bg-white border border-gray-300 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Color Legend</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Get unique subjects */}
              {Array.from(new Set(classes.map(cls => cls.subject))).map(subject => (
                <div key={subject} className="flex items-center">
                  <div className={`w-6 h-6 rounded mr-2 ${getSubjectColor(subject)}`}></div>
                  <span className="text-sm">{subject}</span>
                </div>
              ))}
              <div className="flex items-center">
                <div className="w-6 h-6 rounded mr-2 border-2 border-orange-500 bg-blue-200"></div>
                <span className="text-sm">Teacher High Workload</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 rounded mr-2 ring-2 ring-indigo-500 bg-green-200"></div>
                <span className="text-sm">Selected Teacher's Classes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
