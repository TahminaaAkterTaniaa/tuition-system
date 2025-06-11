'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { TimetableGrid } from './TimetableGrid';

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

interface Student {
  id: string;
  studentId: string;
  name: string;
  email?: string;
  academicLevel?: string;
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
  schedule?: string | null;
  room?: string | null;
  roomId?: string | null;
  teacherId: string;
  schedules?: ClassSchedule[];
  _count?: {
    enrollments: number;
  };
  enrolledStudents?: string[]; // Added to track student IDs enrolled in each class
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

interface PendingChange {
  type: 'DELETE' | 'UPDATE' | 'CREATE';
  classId: string;
  className?: string;
  day?: string;
  timeSlotId?: string;
  roomId?: string | null;
  scheduleId?: string;
  previousRoomId?: string | null;
  previousTimeSlotId?: string;
  previousDay?: string;
  timeSlotLabel?: string;
}

export default function TimetableGenerator() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State variables
  const [isLoading, setIsLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [unassignedClasses, setUnassignedClasses] = useState<Class[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [workloadWarnings, setWorkloadWarnings] = useState<{[key: string]: string}>({});
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'rooms'>('teachers');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [draggedClass, setDraggedClass] = useState<Class | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  
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
      await fetchStudents();
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
      
      // Auto-select the first teacher if teachers tab is active and no teacher is selected
      if (activeTab === 'teachers' && data.length > 0 && !selectedTeacher) {
        setSelectedTeacher(data[0].id);
      }
      
      // Check for teacher workload warnings
      checkTeacherWorkloads(data);
      
      return data;
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to load teachers');
    }
  };

  // Fetch students
  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/admin/students');
      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }
      const data = await response.json();
      setStudents(data);
      return data;
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
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
      
      // Fetch enrollment data for student filtering
      console.log('Fetching enrollments data for student filtering...');
      const enrollmentsResponse = await fetch('/api/admin/enrollments?format=byClass');
      let enrollmentsByClass: Record<string, {studentId: string, id: string}[]> = {};
      
      if (enrollmentsResponse.ok) {
        enrollmentsByClass = await enrollmentsResponse.json();
        console.log('Successfully fetched enrollments by class');
      } else {
        console.error('Failed to fetch enrollments data');
      }
      
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
        
        // Add the schedules and enrolled students to the class
        return {
          ...cls,
          schedules: schedulesWithDetails,
          // Add enrolled student IDs from the enrollment data
          enrolledStudents: enrollmentsByClass[cls.id]?.map(enrollment => enrollment.id) || []
        };
      });
      
      // Log schedule information for debugging
      classesData.forEach((cls: Class) => {
        if (cls.schedules && cls.schedules.length > 0) {
          console.log(`Class ${cls.name} has ${cls.schedules.length} schedules:`);
          cls.schedules.forEach((schedule: ClassSchedule) => {
            console.log(`- Day: ${schedule.day}, Time: ${schedule.timeSlot?.label || schedule.time || ''}, Room: ${schedule.room?.name || schedule.roomId || 'None'}`);
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
  
  // Handle tab selection
  const handleTabChange = (tab: 'students' | 'teachers' | 'rooms') => {
    setActiveTab(tab);
    
    // Auto-select first option when switching to teachers tab
    if (tab === 'teachers' && teachers && teachers.length > 0 && !selectedTeacher && teachers[0]?.id) {
      setSelectedTeacher(teachers[0].id);
    }
    // Similarly for rooms tab
    else if (tab === 'rooms' && rooms && rooms.length > 0 && !selectedRoom && rooms[0]?.id) {
      setSelectedRoom(rooms[0].id);
    }
    // And for students tab
    else if (tab === 'students' && students && students.length > 0 && !selectedStudent && students[0]?.id) {
      setSelectedStudent(students[0].id);
    }
    
    // Clear filters that don't match the selected tab
    if (tab !== 'teachers') setSelectedTeacher(null);
    if (tab !== 'rooms') setSelectedRoom('');
    if (tab !== 'students') setSelectedStudent('');
  };
  
  // Filter timetable by teacher
  const handleTeacherFilter = (teacherId: string) => {
    setSelectedTeacher(teacherId || null);
  };
  
  // Filter timetable by room
  const handleRoomFilter = (roomId: string) => {
    setSelectedRoom(roomId);
  };

  // Filter timetable by student
  const handleStudentFilter = (studentId: string) => {
    setSelectedStudent(studentId);
  };
  
  // Helper function to get color for a subject based on a hash of the subject name
  const getSubjectColor = (subject: string | null | undefined) => {
    if (!subject) return 'bg-gray-200'; // Default color if no subject
    
    // Generate a hash from the subject name
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
  const getClassStyle = (cls: Class): string => {
    if (!cls || !cls.subject) return 'bg-gray-200';
    
    let style = getSubjectColor(cls.subject);
    
    // Add warning border for teachers with high workload
    if (cls.teacherId && workloadWarnings && workloadWarnings[cls.teacherId]) {
      style += ' border-2 border-orange-500';
    }
    
    // Highlight classes for the selected teacher
    if (selectedTeacher && cls.teacherId === selectedTeacher) {
      style += ' ring-2 ring-indigo-500';
    }
    
    // Highlight classes for the selected student
    if (selectedStudent && cls.enrolledStudents?.includes(selectedStudent)) {
      style += ' ring-2 ring-blue-500';
    }
    
    return style || 'bg-gray-200'; // Ensure we always return a string
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
        <div className="grid grid-cols-[350px_1fr] gap-6 h-[calc(100vh-120px)]">
          {/* Left Column - fixed width */}
          <div className="flex flex-col gap-6 h-full overflow-hidden">
            {/* Filters Card */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-300">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              
              {/* Tab Navigation */}
              <div className="flex rounded-md overflow-hidden border border-gray-300">
                <button
                  onClick={() => handleTabChange('students')}
                  className={`flex-1 py-2 px-4 text-center font-medium ${activeTab === 'students' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                >
                  Students
                </button>
                <button
                  onClick={() => handleTabChange('teachers')}
                  className={`flex-1 py-2 px-4 text-center font-medium ${activeTab === 'teachers' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                >
                  Teachers
                </button>
                <button
                  onClick={() => handleTabChange('rooms')}
                  className={`flex-1 py-2 px-4 text-center font-medium ${activeTab === 'rooms' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                >
                  Rooms
                </button>
              </div>
              
              {/* Filter Controls */}
              <div className="pt-2">
                {activeTab === 'students' && (
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor="student-filter">Select Student</label>
                    <select 
                      id="student-filter"
                      aria-label="Select Student"
                      title="Filter by student"
                      className="w-full border border-gray-300 rounded py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedStudent}
                      onChange={(e) => handleStudentFilter(e.target.value)}
                    >
                      <option value="">Select Student</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name || 'Unknown'}
                        </option>
                      ))}
                    </select>
                    {selectedStudent && (
                      <button 
                        onClick={() => setSelectedStudent('')}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
                
                {activeTab === 'teachers' && (
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor="teacher-filter">Select Teacher</label>
                    <select 
                      id="teacher-filter"
                      aria-label="Select Teacher"
                      title="Filter by teacher"
                      className="w-full border border-gray-300 rounded py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedTeacher || ''}
                      onChange={(e) => handleTeacherFilter(e.target.value)}
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.user.name}
                        </option>
                      ))}
                    </select>
                    {selectedTeacher && (
                      <button 
                        onClick={() => setSelectedTeacher(null)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
                
                {activeTab === 'rooms' && (
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor="room-filter">Select Room</label>
                    <select
                      id="room-filter"
                      aria-label="Select Room"
                      title="Filter by room"
                      className="w-full border border-gray-300 rounded py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedRoom}
                      onChange={(e) => handleRoomFilter(e.target.value)}
                    >
                      <option value="">Select Room</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                    {selectedRoom && (
                      <button 
                        onClick={() => setSelectedRoom('')}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 mt-2">
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
            
            {/* Unscheduled Classes Card */}
            <div 
              className="h-[300px] overflow-auto bg-white p-4 rounded-lg shadow-sm border border-gray-300 unscheduled-drop-zone"
              onDragOver={(e) => {
                e.preventDefault();
                console.log('Drag over unscheduled section');
                const target = e.currentTarget as HTMLElement;
                if (target && target.classList) {
                  target.classList.add('border-blue-500', 'bg-blue-50');
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                console.log('Drag enter unscheduled section');
                const target = e.currentTarget as HTMLElement;
                if (target && target.classList) {
                  target.classList.add('border-blue-500', 'bg-blue-50');
                }
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                console.log('Drag leave unscheduled section');
                const target = e.currentTarget as HTMLElement;
                if (target && target.classList) {
                  target.classList.remove('border-blue-500', 'bg-blue-50');
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                console.log('Drop on unscheduled section');
                const target = e.currentTarget as HTMLElement;
                
                // Safely remove and add classes with null checks
                if (target && target.classList) {
                  target.classList.remove('border-blue-500', 'bg-blue-50');
                  target.classList.add('border-green-500', 'bg-green-50');
                  
                  // Store a reference to the element for the timeout
                  const elementRef = target;
                  setTimeout(() => {
                    if (elementRef && elementRef.classList) {
                      elementRef.classList.remove('border-green-500', 'bg-green-50');
                    }
                  }, 800);
                }
                
                
                // Handle the drop of a class from the timetable to unscheduled section
                try {
                  const jsonData = e.dataTransfer.getData('application/json');
                  const dragInfo = jsonData ? JSON.parse(jsonData) : null;
                  const classId = dragInfo?.classId || e.dataTransfer.getData('text/plain');
                  
                  if (!classId) {
                    toast.error('Unable to unschedule class: missing class data');
                    return;
                  }
                  
                  // Find the class from the classes array
                  const classToUnschedule = classes.find(c => c.id === classId);
                  
                  if (!classToUnschedule) {
                    toast.error('Unable to unschedule class: class not found');
                    return;
                  }
                  
                  if (!classToUnschedule.schedules || classToUnschedule.schedules.length === 0) {
                    toast.success(`${classToUnschedule.name} is already unscheduled`);
                    return;
                  }
                  
                  // Get all schedule IDs for this class
                  const scheduleIds = classToUnschedule.schedules.map(s => s.id);
                  
                  // Create pending changes for deletion
                  for (const scheduleId of scheduleIds) {
                    setPendingChanges(prev => [
                      ...prev,
                      {
                        type: 'DELETE',
                        classId: classToUnschedule.id,
                        className: classToUnschedule.name,
                        scheduleId,
                        day: '',  // Not needed for deletion
                        timeSlotId: '',  // Not needed for deletion
                        timeSlotLabel: '',  // Not needed for deletion
                        roomId: null  // Not needed for deletion
                      }
                    ]);
                  }
                  
                  // Add class to unassigned classes if not already there
                  if (!unassignedClasses.some(c => c.id === classToUnschedule.id)) {
                    const classWithoutSchedules = {
                      ...classToUnschedule,
                      schedules: []
                    };
                    setUnassignedClasses([...unassignedClasses, classWithoutSchedules]);
                  }
                  
                  // Remove from classes array or update it
                  setClasses(prevClasses => 
                    prevClasses.map(c => {
                      if (c.id === classToUnschedule.id) {
                        return {
                          ...c,
                          schedules: []
                        };
                      }
                      return c;
                    })
                  );
                  
                  toast.success(`${classToUnschedule.name} marked for unscheduling. Save changes to confirm.`);
                } catch (error) {
                  console.error('Error handling drop on unscheduled section:', error);
                  toast.error('Error unscheduling class');
                }
              }}
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Unscheduled Classes</h2>
                <span className="text-sm text-gray-500">{unassignedClasses.length} classes</span>
              </div>
              
              {unassignedClasses.length === 0 ? (
                <p className="text-gray-500 text-sm">No unscheduled classes</p>
              ) : (
                <div className="space-y-2">
                  {unassignedClasses.map((cls) => (
                    <div 
                      key={cls.id}
                      className={`p-2 rounded ${getClassStyle(cls)} cursor-move shadow hover:shadow-md transition-all duration-200 relative`}
                      draggable
                      onDragStart={(e) => {
                        console.log('Drag started for unscheduled class:', cls.name);
                        setDraggedClass(cls);
                        setDragSource('unassigned');
                        
                        // Set both formats of data for maximum compatibility
                        e.dataTransfer.setData('text/plain', cls.id);
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          classId: cls.id,
                          className: cls.name,
                          source: 'unassigned'
                        }));
                        
                        // Visual feedback with null check
                        const target = e.currentTarget as HTMLElement;
                        if (target && target.classList) {
                          target.classList.add('opacity-50', 'border', 'border-blue-500');
                        }
                      }}
                      onDragEnd={(e) => {
                        // Reset visual feedback
                        const target = e.currentTarget as HTMLElement;
                        if (target) {
                          target.classList.remove('opacity-50', 'border', 'border-blue-500');
                        }
                      }}
                    >
                      <div className="font-medium">{cls.name}</div>
                      <div className="text-xs text-gray-600">
                        {teachers.find(t => t.id === cls.teacherId)?.user?.name || 'No Teacher'}
                      </div>
                      <div className="text-xs text-gray-600">
                        {cls._count?.enrollments || 0} students
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - flexible width with scrollable content */}
          <div className="overflow-auto">
            {conflicts.length > 0 && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-4">
                <h3 className="font-bold">Conflicts Detected:</h3>
                <ul className="list-disc pl-5 mt-2">
                  {conflicts.map((conflict, index) => (
                    <li key={index}>{conflict}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Timetable Grid Component */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-300 min-h-[calc(100vh-140px)]">
              <h2 className="text-lg font-semibold mb-4">Timetable</h2>
              <TimetableGrid
                classes={classes}
                unassignedClasses={unassignedClasses}
                timeSlots={timeSlots}
                rooms={rooms}
                days={days}
                selectedRoom={selectedRoom}
                selectedTeacher={selectedTeacher}
                selectedStudent={selectedStudent}
                onClassesUpdated={setClasses}
                onUnassignedClassesUpdated={handleUnassignedClassesUpdated}
                onUnassignClass={handleUnassignClass}
                pendingChanges={pendingChanges as any}
                setPendingChanges={setPendingChanges as any}
                setHasChanges={setHasChanges}
                getClassStyle={getClassStyle}
                teachers={teachers}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
