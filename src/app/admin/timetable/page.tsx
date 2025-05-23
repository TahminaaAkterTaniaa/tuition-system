'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import TimetableGrid from './TimetableGrid';

// Type definitions
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
      const response = await fetch('/api/admin/teachers?includeWorkload=true');
      if (!response.ok) {
        throw new Error('Failed to fetch teachers');
      }
      const data = await response.json();
      setTeachers(data);
      
      // Check for teacher workload warnings
      checkTeacherWorkloads(data);
      
      return data;
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to load teachers');
      return [];
    }
  };

  // Fetch classes and their schedules
  const fetchClassesAndSchedules = async () => {
    try {
      // First fetch all classes
      const classesResponse = await fetch('/api/admin/classes');
      if (!classesResponse.ok) {
        throw new Error('Failed to fetch classes');
      }
      let classesData = await classesResponse.json();
      console.log('Fetched classes:', classesData.length);
      
      // Then fetch all schedules to ensure we have complete data
      const schedulesResponse = await fetch('/api/admin/schedules');
      if (!schedulesResponse.ok) {
        throw new Error('Failed to fetch schedules');
      }
      const schedulesData = await schedulesResponse.json();
      console.log('Fetched schedules:', schedulesData.length);
      
      // Map schedules to their respective classes
      classesData = classesData.map((cls: Class) => {
        // Find all schedules for this class
        const classSchedules = schedulesData.filter((schedule: ClassSchedule) => 
          schedule.classId === cls.id
        );
        
        // Ensure each schedule has the linked timeSlot and room info
        const schedulesWithDetails = classSchedules.map((schedule: ClassSchedule) => {
          // Find the matching timeSlot for this schedule
          if (schedule.timeSlotId && !schedule.timeSlot) {
            const matchingTimeSlot = timeSlots.find(ts => ts.id === schedule.timeSlotId);
            if (matchingTimeSlot) {
              schedule.timeSlot = matchingTimeSlot;
            }
          }
          
          // Find the matching room for this schedule
          if (schedule.roomId && !schedule.room) {
            const matchingRoom = rooms.find(r => r.id === schedule.roomId);
            if (matchingRoom) {
              schedule.room = matchingRoom;
            }
          }
          
          return schedule;
        });
        
        // Add the schedules to the class
        return {
          ...cls,
          schedules: schedulesWithDetails
        };
      });
      
      // Log schedule information for debugging
      classesData.forEach((cls: Class) => {
        if (cls.schedules && cls.schedules.length > 0) {
          console.log(`Class ${cls.name} has ${cls.schedules.length} schedules:`);
          cls.schedules.forEach((schedule: ClassSchedule) => {
            console.log(`- Day: ${schedule.day}, Time: ${schedule.timeSlot?.label || schedule.time}, Room: ${schedule.room?.name || schedule.roomId || 'None'}`);
          });
        }
      });
      
      // Find any unassigned classes (those with no schedules)
      const unassigned = classesData.filter((cls: Class) => !cls.schedules || cls.schedules.length === 0);
      setUnassignedClasses(unassigned);
      console.log('Unassigned classes:', unassigned.length);
      
      // Set scheduled classes
      const scheduledClasses = classesData.filter((cls: Class) => cls.schedules && cls.schedules.length > 0);
      setClasses(scheduledClasses);
      console.log('Scheduled classes:', scheduledClasses.length);
      
      // Check for conflicts
      setTimeout(() => {
        checkForConflicts();
      }, 500);
      
      return classesData;
    } catch (error) {
      console.error('Error fetching classes and schedules:', error);
      toast.error('Failed to load classes and schedules');
      return [];
    }
  };

  // Get classes scheduled for a specific day and time slot
  const getClassesForSlot = (day: string, timeSlotLabel: string) => {
    return classes.filter((cls: Class) => {
      if (!cls.schedules) return false;
      
      return cls.schedules.some((schedule: ClassSchedule) => {
        const timeMatches = schedule.timeSlot?.label === timeSlotLabel || schedule.time === timeSlotLabel;
        return schedule.day === day && timeMatches;
      });
    });
  };

  // Check for conflicts in the timetable (same teacher or room at the same time)
  const checkForConflicts = () => {
    const newConflicts: string[] = [];
    
    days.forEach(day => {
      timeSlots.forEach(timeSlot => {
        const slotClasses = getClassesForSlot(day, timeSlot.label);
        
        // Check for teacher conflicts
        const teacherIds = slotClasses.map(cls => cls.teacherId).filter(Boolean);
        const uniqueTeacherIds = new Set(teacherIds);
        
        if (teacherIds.length > uniqueTeacherIds.size) {
          newConflicts.push(`Teacher conflict on ${day} at ${timeSlot.label}`);
        }
        
        // Check for room conflicts
        const classSchedules = slotClasses.flatMap((cls: Class) => 
          cls.schedules?.filter((s: ClassSchedule) => {
            const timeMatches = s.timeSlot?.label === timeSlot.label || s.time === timeSlot.label;
            return s.day === day && timeMatches;
          }) || []
        );
        
        const roomIds = classSchedules.map(s => s.roomId).filter(Boolean);
        const uniqueRoomIds = new Set(roomIds);
        
        if (roomIds.length > uniqueRoomIds.size) {
          newConflicts.push(`Room conflict on ${day} at ${timeSlot.label}`);
        }
      });
    });
    
    setConflicts(newConflicts);
    if (newConflicts.length > 0) {
      toast.error(`Found ${newConflicts.length} conflicts in the timetable`);
    }
  };

  // Check teacher workloads and set warnings
  const checkTeacherWorkloads = (teachersList: Teacher[]) => {
    const warnings: {[key: string]: string} = {};
    
    teachersList.forEach(teacher => {
      if (teacher.workload?.isOverloaded) {
        warnings[teacher.id] = `${teacher.user.name} has a high workload (${teacher.workload.weeklyHours} hours/week)`;
      }
    });
    
    setWorkloadWarnings(warnings);
  };

  // Handle unassignment of classes
  const handleUnassignClass = (classObj: Class, scheduleIds: string[]) => {
    // Create a copy of the class without schedules
    const unassignedClass = { ...classObj, schedules: [] };
    
    // Add to unassigned classes if not already there
    if (!unassignedClasses.some((c: Class) => c.id === classObj.id)) {
      setUnassignedClasses(prev => [...prev, unassignedClass]);
    }
    
    // Remove schedules from the class in the classes array
    setClasses(prevClasses => {
      return prevClasses.map((cls: Class) => {
        if (cls.id === classObj.id) {
          return unassignedClass;
        }
        return cls;
      }).filter((cls: Class) => cls.schedules && cls.schedules.length > 0);
    });
    
    // Add pending changes to remove the schedules
    for (const scheduleId of scheduleIds) {
      setPendingChanges(prev => [
        ...prev, 
        { 
          type: 'DELETE', 
          scheduleId,
          classId: classObj.id 
        }
      ]);
    }
    
    setHasChanges(true);
    toast.success(`${classObj.name} has been unassigned`);
  };

  // Handle updates to unassigned classes
  const handleUnassignedClassesUpdated = (updatedUnassignedClasses: Class[]) => {
    setUnassignedClasses(updatedUnassignedClasses);
  };

  // Save all pending changes
  const saveChanges = async () => {
    if (pendingChanges.length === 0) {
      toast.success('No changes to save');
      return;
    }
    
    setIsSaving(true);
    const loadingToast = toast.loading('Saving changes...');
    
    try {
      // Process each change
      for (const change of pendingChanges) {
        // Skip temporary schedules for UPDATE and DELETE operations
        // Temporary schedules have IDs that start with 'temp-'
        if ((change.type === 'UPDATE' || change.type === 'DELETE') && 
            change.scheduleId && 
            typeof change.scheduleId === 'string' && 
            change.scheduleId.startsWith('temp-')) {
          console.log(`Skipping ${change.type} operation for temporary schedule: ${change.scheduleId}`);
          continue;
        }

        if (change.type === 'CREATE') {
          // Create a new schedule
          console.log(`Creating schedule for class ${change.classId}:`, change);
          
          // Validate required fields
          if (!change.day) {
            console.error('Missing day in change:', change);
            throw new Error('Cannot create schedule: day is missing');
          }
          
          if (!change.timeSlotId) {
            console.error('Missing timeSlotId in change:', change);
            throw new Error('Cannot create schedule: timeSlotId is missing');
          }
          
          // Prepare a simple, clean request body
          const requestBody = {
            day: change.day,
            timeSlotId: change.timeSlotId,
            roomId: change.roomId || null
          };
          
          console.log('Creating schedule with data:', JSON.stringify(requestBody));
          
          try {
            const response = await fetch(`/api/admin/classes/${change.classId}/schedule`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestBody)
            });
            
            console.log('API response status:', response.status, response.statusText);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Raw error response:', errorText);
              throw new Error(`Failed to create schedule: ${response.status} ${response.statusText}`);
            }
            
            // Success - log the result
            const result = await response.json();
            console.log('Successfully created schedule:', result);
          } catch (err) {
            console.error('Error creating schedule:', err);
            throw err;
          }
        } else if (change.type === 'UPDATE') {
          // Update an existing schedule
          console.log(`Updating schedule ${change.scheduleId}:`, change);
          try {
            const response = await fetch(`/api/admin/schedules/${change.scheduleId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                day: change.day,
                timeSlotId: change.timeSlotId,
                roomId: change.roomId || null,
              }),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              let errorMessage = 'Failed to update schedule';
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorMessage;
              } catch (e) {
                console.error('Error parsing error response:', e);
              }
              
              // If schedule not found, log it but don't throw an error
              if (errorMessage.includes('not found')) {
                console.warn(`Schedule ${change.scheduleId} not found, skipping update.`);
              } else {
                throw new Error(errorMessage);
              }
            }
          } catch (err) {
            if (err instanceof Error && err.message.includes('not found')) {
              console.warn(`Schedule ${change.scheduleId} not found, skipping update.`);
            } else {
              throw err;
            }
          }
        } else if (change.type === 'DELETE') {
          // Delete a schedule
          console.log(`Deleting schedule ${change.scheduleId}:`, change);
          try {
            const response = await fetch(`/api/admin/schedules/${change.scheduleId}`, {
              method: 'DELETE',
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              let errorMessage = 'Failed to delete schedule';
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorMessage;
              } catch (e) {
                console.error('Error parsing error response:', e);
              }
              
              // If schedule not found, log it but don't throw an error
              if (errorMessage.includes('not found')) {
                console.warn(`Schedule ${change.scheduleId} not found, skipping deletion.`);
              } else {
                throw new Error(errorMessage);
              }
            }
          } catch (err) {
            if (err instanceof Error && err.message.includes('not found')) {
              console.warn(`Schedule ${change.scheduleId} not found, skipping deletion.`);
            } else {
              throw err;
            }
          }
        }
      }
      
      // Clear pending changes
      setPendingChanges([]);
      setHasChanges(false);
      
      // Refresh all data after changes are saved
      await fetchAllData();
      
      toast.dismiss(loadingToast);
      toast.success('All changes saved successfully');
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.dismiss(loadingToast);
      toast.error(`Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Main rendering logic
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Timetable Generator</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Control Panel */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-300 flex flex-wrap justify-between items-center gap-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Filters</h2>
              <div className="flex flex-wrap gap-2">
                <label className="sr-only" htmlFor="teacher-filter">Filter by Teacher</label>
                <select 
                  id="teacher-filter"
                  aria-label="Filter by Teacher"
                  className="border border-gray-300 rounded py-1 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedTeacher || ''}
                  onChange={(e) => handleTeacherFilter(e.target.value)}
                >
                  <option value="">All Teachers</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.user.name}
                    </option>
                  ))}
                </select>
                
                <label className="sr-only" htmlFor="room-filter">Filter by Room</label>
                <select
                  id="room-filter"
                  aria-label="Filter by Room"
                  className="border border-gray-300 rounded py-1 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedRoom || ''}
                  onChange={(e) => handleRoomFilter(e.target.value)}
                >
                  <option value="">All Rooms</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-2">
              {hasChanges && (
                <>
                  <button
                    onClick={saveChanges}
                    disabled={isSaving || pendingChanges.length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  
                  <button
                    onClick={cancelChanges}
                    disabled={isSaving || pendingChanges.length === 0}
                    className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </>
              )}
              
              <button
                onClick={fetchAllData}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
          
          {conflicts.length > 0 && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
              <h3 className="font-bold">Conflicts Detected:</h3>
              <ul className="list-disc pl-5 mt-2">
                {conflicts.map((conflict, index) => (
                  <li key={index}>{conflict}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Timetable Grid Component */}
          <TimetableGrid
            classes={classes}
            unassignedClasses={unassignedClasses}
            timeSlots={timeSlots}
            rooms={rooms}
            days={days}
            selectedRoom={selectedRoom}
            selectedTeacher={selectedTeacher}
            onClassesUpdated={setClasses}
            onUnassignedClassesUpdated={handleUnassignedClassesUpdated}
            onUnassignClass={handleUnassignClass}
            pendingChanges={pendingChanges}
            setPendingChanges={setPendingChanges}
            setHasChanges={setHasChanges}
            getClassStyle={getClassStyle}
            teachers={teachers}
          />
        </div>
      )}
    </div>
  );
}
