'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import './timetable.css';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
}

interface Room {
  id: string;
  name: string;
}

interface ClassSchedule {
  id: string;
  classId: string;
  day: string;
  timeSlotId?: string;
  roomId: string | null;
  timeSlot?: {
    id: string;
    startTime: string;
    endTime: string;
    label: string;
  };
  time?: string;
  room?: {
    id: string;
    name: string;
  };
}

interface Class {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  schedules?: ClassSchedule[];
}

interface Teacher {
  id: string;
  user: {
    name: string;
  };
}

interface PendingChange {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  classId: string;
  className: string;
  day: string;
  timeSlotId: string;
  timeSlotLabel: string;
  roomId: string | null;
  scheduleId: string | null;
  originalDay?: string;
  originalTimeSlotId?: string;
  originalTimeSlotLabel?: string;
}

interface TimetableGridProps {
  classes: Class[];
  unassignedClasses: Class[];
  timeSlots: TimeSlot[];
  rooms: Room[];
  days: string[];
  selectedRoom: string;
  selectedTeacher: string | null;
  teachers: Teacher[];
  onClassesUpdated: (updatedClasses: Class[]) => void;
  onUnassignedClassesUpdated: (updatedUnassignedClasses: Class[]) => void;
  onUnassignClass?: (classObj: Class, scheduleIds: string[]) => void;
  pendingChanges: PendingChange[];
  setPendingChanges: (changes: PendingChange[] | ((prev: PendingChange[]) => PendingChange[])) => void;
  setHasChanges: (hasChanges: boolean) => void;
  getClassStyle: (cls: Class) => string;
}

const TimetableGrid: React.FC<TimetableGridProps> = ({
  classes,
  unassignedClasses,
  timeSlots,
  rooms,
  days,
  selectedRoom,
  selectedTeacher,
  teachers,
  onClassesUpdated,
  onUnassignedClassesUpdated,
  onUnassignClass,
  pendingChanges,
  setPendingChanges,
  setHasChanges,
  getClassStyle
}) => {
  const [draggedClass, setDraggedClass] = useState<Class | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  interface Conflict {
    id: string;
    type: 'teacher' | 'room';
    message: string;
  }
  
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force re-render

  // Update hasChanges when pendingChanges change
  useEffect(() => {
    setHasChanges(pendingChanges.length > 0);
  }, [pendingChanges, setHasChanges]);

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
    // Find the time slot to get its ID
    const timeSlot = timeSlots.find(ts => ts.label === timeSlotLabel);
    if (!timeSlot) {
      console.warn(`TimeSlot not found for label: ${timeSlotLabel}`);
      return [];
    }
    
    // First collect all classes that have schedules for this day and time
    const classesInSlot: Class[] = [];
    
    // For each class, check if it has a schedule for this day and time
    filteredClasses.forEach(cls => {
      if (!cls.schedules) return;
      
      // Find matching schedules for this day and time slot
      const matchingSchedules = cls.schedules.filter(schedule => {
        if (!schedule) return false;
        if (schedule.day !== day) return false;
        
        // Match by various possible timeSlot identifiers, in order of reliability
        let isTimeMatch = false;
        
        // 1. Direct timeSlotId match (most reliable)
        if (schedule.timeSlotId && schedule.timeSlotId === timeSlot.id) {
          isTimeMatch = true;
        }
        // 2. TimeSlot object label match
        else if (schedule.timeSlot && schedule.timeSlot.label === timeSlotLabel) {
          isTimeMatch = true;
        }
        // 3. Time string match (least reliable, but necessary fallback)
        else if (schedule.time) {
          isTimeMatch = 
            schedule.time === timeSlot.startTime || 
            schedule.time === timeSlotLabel ||
            schedule.time.includes(timeSlot.startTime);
        }
        
        const isMatch = isTimeMatch;
        
        if (isMatch) {
          console.log(`✅ Found schedule for class ${cls.name} on ${day} at ${timeSlotLabel}`);
          console.log('  Schedule details:', JSON.stringify({
            id: schedule.id,
            day: schedule.day,
            timeSlotId: schedule.timeSlotId,
            timeSlotLabel: schedule.timeSlot?.label,
            roomId: schedule.roomId
          }));
        }
        
        return isMatch;
      });
      
      // If this class has matching schedules, add it to the result
      if (matchingSchedules.length > 0) {
        // Add the class with only its matching schedules to avoid confusion
        const classWithMatchingSchedules = {
          ...cls,
          // Only include the schedules for this specific day and time
          matchingSchedules 
        };
        
        classesInSlot.push(classWithMatchingSchedules);
      }
    });
    
    if (classesInSlot.length > 0) {
      console.log(`Found ${classesInSlot.length} classes for ${day} at ${timeSlotLabel}`);
    }
    
    return classesInSlot;
  };

  // Check for conflicts in the timetable
  const checkForConflicts = () => {
    const newConflicts: {id: string, type: 'teacher' | 'room', message: string}[] = [];
    
    // Check each day and time slot
    days.forEach(day => {
      timeSlots.forEach(timeSlot => {
        const classesInSlot = getClassesForSlot(day, timeSlot.label);
        
        if (classesInSlot.length > 1) {
          // Check for teacher conflicts
          const teacherIds = classesInSlot.map(cls => cls.teacherId).filter(Boolean);
          const uniqueTeacherIds = new Set(teacherIds);
          
          if (teacherIds.length > uniqueTeacherIds.size) {
            // Find which teachers have conflicts
            const teacherCounts: {[key: string]: string[]} = {};
            classesInSlot.forEach(cls => {
              if (cls.teacherId) {
                if (!teacherCounts[cls.teacherId]) {
                  teacherCounts[cls.teacherId] = [];
                }
                teacherCounts[cls.teacherId].push(cls.name);
              }
            });
            
            // Create conflict messages for each teacher with multiple classes
            Object.entries(teacherCounts).forEach(([teacherId, classNames]) => {
              if (classNames.length > 1) {
                const teacher = teachers.find(t => t.id === teacherId);
                const teacherName = teacher && teacher.user ? teacher.user.name : 'Unknown teacher';
                newConflicts.push({
                  id: `teacher-${day}-${timeSlot.label}-${teacherId}`,
                  type: 'teacher',
                  message: `Teacher conflict: ${teacherName} is assigned to ${classNames.join(', ')} on ${day} at ${timeSlot.label}`
                });
              }
            });
          }
          
          // Check for room conflicts
          const roomConflicts: {[key: string]: string[]} = {};
          
          classesInSlot.forEach(cls => {
            if (!cls.schedules) return;
            
            const schedules = cls.schedules.filter(s => {
              return s.day === day && (s.timeSlotId === timeSlot.id || s.timeSlot?.label === timeSlot.label);
            });
            
            schedules.forEach(schedule => {
              if (schedule.roomId) {
                if (!roomConflicts[schedule.roomId]) {
                  roomConflicts[schedule.roomId] = [];
                }
                roomConflicts[schedule.roomId].push(cls.name);
              }
            });
          });
          
          // Create conflict messages for each room with multiple classes
          Object.entries(roomConflicts).forEach(([roomId, classNames]) => {
            if (classNames.length > 1) {
              const room = rooms.find(r => r.id === roomId);
              const roomName = room && room.name ? room.name : 'Unknown room';
              newConflicts.push({
                id: `room-${day}-${timeSlot.label}-${roomId}`,
                type: 'room',
                message: `Room conflict: ${roomName} is assigned to ${classNames.join(', ')} on ${day} at ${timeSlot.label}`
              });
            }
          });
        }
      });
    });
    
    setConflicts(newConflicts);
    return newConflicts.length > 0;
  };

  // Handle drag start event
  const handleDragStart = (e: React.DragEvent, classObj: Class, source: string) => {
    console.log('Drag started for class:', classObj.name, 'from source:', source);
    
    // Set the dragged class and source in state
    setDraggedClass(classObj);
    setDragSource(source);
    
    // Apply drag visual effect
    const target = e.currentTarget as HTMLElement;
    target.classList.add('opacity-50', 'border', 'border-blue-500');
    
    try {
      // Get schedule info for rescheduling
      const scheduleId = target.dataset.scheduleId;
      const day = target.dataset.day;
      const time = target.dataset.time;
      const roomId = target.dataset.roomId;
      
      // Set data for the drag operation
      e.dataTransfer.setData('text/plain', classObj.id);
      e.dataTransfer.setData('application/json', JSON.stringify({
        classId: classObj.id,
        scheduleId,
        day,
        time,
        roomId,
        source
      }));
      
      e.dataTransfer.effectAllowed = 'move';
    } catch (error) {
      console.error('Error setting drag data:', error);
    }
  };

  // Handle drag over event
  const handleDragOver = (e: React.DragEvent, day?: string, time?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drag enter event
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  };

  // Handle drag leave event
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  };

  // Handle drop on the unassigned classes section
  const handleUnassignDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Visual feedback
    const target = e.currentTarget as HTMLElement;
    if (target) {
      target.classList.remove('drag-over');
      target.classList.add('drag-success');
      setTimeout(() => {
        if (target) {
          target.classList.remove('drag-success');
        }
      }, 800);
    }
    
    console.log('Drop event on unassigned section');
    
    // Get the dragged class data
    let currentDraggedClass = draggedClass;
    let dragInfo: any = null;
    
    try {
      // Try to get data from dataTransfer
      const jsonData = e.dataTransfer.getData('application/json');
      console.log('Got JSON data:', jsonData);
      
      if (jsonData) {
        dragInfo = JSON.parse(jsonData);
        console.log('Parsed drag info:', dragInfo);
      }
    } catch (error) {
      console.error('Error parsing drag data:', error);
    }
    
    // If we don't have the class from state, try to find it from transfer data
    if (!currentDraggedClass && dragInfo?.classId) {
      console.log('Looking for class with ID:', dragInfo.classId);
      currentDraggedClass = classes.find(c => c.id === dragInfo.classId) || null;
    }
    
    // FALLBACK: Try to get class ID from text/plain (added as backup)
    if (!currentDraggedClass) {
      try {
        const classId = e.dataTransfer.getData('text/plain');
        if (classId) {
          currentDraggedClass = classes.find(c => c.id === classId) || null;
        }
      } catch (err) {
        console.error('Error getting text/plain data:', err);
      }
    }
    
    // If we still don't have a dragged class, we can't proceed
    if (!currentDraggedClass) {
      console.error('❌ No dragged class found - cannot complete unassign operation');
      toast.error('Unable to unassign class: drop data not found');
      return;
    }
    
    // Check if the class has schedules to unassign
    if (!currentDraggedClass.schedules || currentDraggedClass.schedules.length === 0) {
      toast.success(`${currentDraggedClass.name} is already unassigned`);
      return;
    }
    
    // Get all schedule IDs for this class
    const scheduleIds = currentDraggedClass.schedules.map(s => s.id);
    
    // Create pending changes for deletion
    for (const scheduleId of scheduleIds) {
      setPendingChanges(prev => [
        ...prev,
        {
          type: 'DELETE',
          classId: currentDraggedClass!.id,
          className: currentDraggedClass!.name,
          scheduleId,
          day: '',  // Not needed for deletion
          timeSlotId: '',  // Not needed for deletion
          timeSlotLabel: '',  // Not needed for deletion
          roomId: null  // Not needed for deletion
        }
      ]);
    }
    
    // Call the parent component's unassign handler
    if (onUnassignClass) {
      onUnassignClass(currentDraggedClass, scheduleIds);
    }
    
    // Reset drag state
    setDraggedClass(null);
    setDragSource(null);
    
    toast.success(`${currentDraggedClass.name} marked for unassignment. Save changes to confirm.`);
  };

  // Handle drop event on a timetable cell
  const handleDrop = (e: React.DragEvent, day: string, time: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Drop event handler called for', day, time);
    
    // Visual feedback that the drop occurred
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
    target.classList.add('drag-success');
    setTimeout(() => target.classList.remove('drag-success'), 800);
    
    // Get the dragged class from state or data transfer
    let currentDraggedClass = draggedClass;
    let dragInfo: any = null;
    
    try {
      // Try to get data from dataTransfer
      const jsonData = e.dataTransfer.getData('application/json');
      console.log('Got JSON data:', jsonData);
      
      if (jsonData) {
        dragInfo = JSON.parse(jsonData);
        console.log('Parsed drag info:', dragInfo);
      }
    } catch (error) {
      console.error('Error parsing drag data:', error);
    }
    
    // If we don't have the class from state, try to find it from transfer data
    if (!currentDraggedClass && dragInfo?.classId) {
      console.log('Looking for class with ID:', dragInfo.classId);
      currentDraggedClass = classes.find(c => c.id === dragInfo.classId) || 
                          unassignedClasses.find(c => c.id === dragInfo.classId) || null;
    }
    
    // FALLBACK: Try to get class ID from text/plain (added as backup)
    if (!currentDraggedClass) {
      try {
        const classId = e.dataTransfer.getData('text/plain');
        console.log('Got class ID from text/plain:', classId);
        if (classId) {
          currentDraggedClass = classes.find(c => c.id === classId) || 
                              unassignedClasses.find(c => c.id === classId) || null;
        }
      } catch (err) {
        console.error('Error getting text/plain data:', err);
      }
    }
    
    // If we still don't have a dragged class, we can't proceed
    if (!currentDraggedClass) {
      console.error('❌ No dragged class found - cannot complete drop operation');
      toast.error('Unable to move class: drop data not found');
      return;
    }
    
    console.log('✅ Processing drop for class:', currentDraggedClass.name);
    
    // Get schedule ID and room ID from the drag info if available
    const scheduleId = dragInfo?.scheduleId || null;
    const roomId = dragInfo?.roomId || null;
    
    // Find the time slot by its label
    const timeSlot = timeSlots.find(ts => ts.label === time);
    if (!timeSlot) {
      console.error('Time slot not found:', time);
      return;
    }

    // Check if this class already has a schedule for this day and time
    const existingSchedule = currentDraggedClass.schedules?.find(s => 
      s.day === day && (s.timeSlotId === timeSlot.id || s.timeSlot?.label === time)
    );
    
    if (existingSchedule) {
      toast.error(`Class ${currentDraggedClass.name} is already scheduled for ${day} at ${time}`);
      return;
    }

    // If we're moving from an existing schedule (update)
    if (scheduleId) {
      // Check for changes - only update if day or time has changed
      const originalSchedule = currentDraggedClass.schedules?.find(s => s.id === scheduleId);
      
      if (!originalSchedule) {
        console.error('Original schedule not found');
        return;
      }
      
      // If nothing changed, do nothing
      if (originalSchedule.day === day && originalSchedule.timeSlotId === timeSlot.id) {
        console.log('No changes to schedule');
        return;
      }
      
      // Create a pending change for updating an existing schedule
      const change: PendingChange = {
        type: 'UPDATE',
        classId: currentDraggedClass.id,
        className: currentDraggedClass.name,
        day,
        timeSlotId: timeSlot.id,
        timeSlotLabel: time,
        roomId: roomId as string | null,
        scheduleId,
        originalDay: originalSchedule.day,
        originalTimeSlotId: originalSchedule.timeSlotId,
        originalTimeSlotLabel: originalSchedule.timeSlot?.label
      };
      
      // Update pendingChanges - replace if exists or add new
      setPendingChanges(prev => {
        const existingIndex = prev.findIndex(p => p.scheduleId === scheduleId);
        if (existingIndex >= 0) {
          return [
            ...prev.slice(0, existingIndex),
            change,
            ...prev.slice(existingIndex + 1)
          ];
        }
        return [...prev, change];
      });
      
      // Update class schedules in UI
      const updatedClasses = classes.map(cls => {
        if (cls.id === currentDraggedClass?.id) {
          return {
            ...cls,
            schedules: cls.schedules?.map(s => {
              if (s.id === scheduleId) {
                return {
                  ...s,
                  day,
                  timeSlotId: timeSlot.id,
                  timeSlot: {
                    id: timeSlot.id,
                    startTime: timeSlot.startTime,
                    endTime: timeSlot.endTime,
                    label: timeSlot.label
                  },
                  time: timeSlot.startTime,
                  roomId: roomId || s.roomId,
                  room: roomId ? rooms.find(r => r.id === roomId) : s.room
                };
              }
              return s;
            })
          };
        }
        return cls;
      });
      
      onClassesUpdated(updatedClasses);
      toast.success(`Moved ${currentDraggedClass.name} to ${day} at ${time}`);
    } 
    // Creating a new schedule (from unassigned class)
    else {
      console.log('Creating new schedule for class', currentDraggedClass.name);
      console.log('TimeSlot details:', timeSlot);
      
      if (!timeSlot.id) {
        console.error('TimeSlot ID is missing:', timeSlot);
        toast.error('Cannot schedule class: time slot ID is missing');
        return;
      }
      
      // Create a pending change for creating a new schedule
      const change: PendingChange = {
        type: 'CREATE',
        classId: currentDraggedClass.id,
        className: currentDraggedClass.name,
        day,
        timeSlotId: timeSlot.id,
        timeSlotLabel: time,
        roomId: selectedRoom || null,
        scheduleId: null
      };
      
      console.log('Adding pending change for CREATE:', change);
      setPendingChanges(prev => [...prev, change]);
      
      // Generate a temporary schedule ID for UI purposes
      const tempScheduleId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create a new schedule object
      const newSchedule: ClassSchedule = {
        id: tempScheduleId,
        classId: currentDraggedClass.id,
        day,
        timeSlotId: timeSlot.id,
        timeSlot: {
          id: timeSlot.id,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          label: timeSlot.label
        },
        time: timeSlot.startTime,
        roomId: selectedRoom || null,
        room: selectedRoom ? rooms.find(r => r.id === selectedRoom) : undefined
      };
      
      // Update class in the classes array with the new schedule
      const updatedClassesArray = classes.map(cls => {
        if (cls.id === currentDraggedClass?.id) {
          return {
            ...cls,
            schedules: [...(cls.schedules || []), newSchedule]
          };
        }
        return cls;
      });
      
      // If the class was in unassigned classes, move it to regular classes
      if (unassignedClasses.some(c => c.id === currentDraggedClass.id)) {
        // Add to regular classes if not already there
        const isAlreadyInClasses = classes.some(c => c.id === currentDraggedClass?.id);
        
        if (!isAlreadyInClasses) {
          const classWithSchedule = {
            ...currentDraggedClass,
            schedules: [newSchedule]
          };
          
          onClassesUpdated([...classes, classWithSchedule]);
        } else {
          onClassesUpdated(updatedClassesArray);
        }
        
        // Remove from unassigned classes
        const updatedUnassignedClasses = unassignedClasses.filter(
          c => c.id !== currentDraggedClass.id
        );
        
        onUnassignedClassesUpdated(updatedUnassignedClasses);
      } else {
        // Just update the classes array
        onClassesUpdated(updatedClassesArray);
      }
      
      toast.success(`Scheduled ${currentDraggedClass.name} on ${day} at ${time}`);
    }
    
    // Reset drag state
    setDraggedClass(null);
    setDragSource(null);
    
    // Force refresh to ensure UI is updated
    setRefreshKey(prev => prev + 1);
  };

  // Force refresh the component to update the UI
  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Check if a specific slot has a conflict
  const hasConflict = (day: string, time: string): boolean => {
    return conflicts.some(conflict => 
      conflict.id.includes(`${day}-${time}`)
    );
  };
  
  // Get conflict type for a specific slot
  const getConflictType = (day: string, time: string): string => {
    const slotConflicts = conflicts.filter(conflict => 
      conflict.id.includes(`${day}-${time}`)
    );
    
    if (slotConflicts.length === 0) return '';
    
    // Return all conflict types present in the slot
    const types = new Set(slotConflicts.map(c => c.type));
    return Array.from(types).join(' and ');
  };

  // For debugging
  const debugState = () => {
    console.log('Current State:');
    console.log('Classes:', classes);
    console.log('Unassigned Classes:', unassignedClasses);
    console.log('Pending Changes:', pendingChanges);
    console.log('Dragged Class:', draggedClass);
    console.log('Conflicts:', conflicts);
  };

  return (
    <div className="timetable-container space-y-6" key={refreshKey}>
      {/* Debug button */}
      <button 
        onClick={debugState} 
        className="text-xs text-gray-500 hover:text-gray-700 mb-2"
        style={{ position: 'absolute', top: '10px', right: '10px' }}
      >
        Debug
      </button>
      
      {/* Unassigned Classes Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-300">
        <h2 className="text-lg font-semibold mb-3">Unassigned Classes</h2>
        <div 
          className="min-h-[100px] p-4 border-2 border-dashed border-gray-300 rounded-lg unassigned-drop-zone"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleUnassignDrop}
        >
          {unassignedClasses.length === 0 ? (
            <div className="text-center text-gray-400 italic">No unassigned classes</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {unassignedClasses.map(cls => {
                // Find teacher name for display
                const teacher = teachers.find(t => t.id === cls.teacherId);
                
                return (
                  <div
                    key={cls.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, cls, 'unassigned')}
                    className={`p-2 rounded text-sm cursor-grab active:cursor-grabbing class-card ${getClassStyle(cls)} shadow hover:shadow-md transition-all duration-200`}
                    data-class-id={cls.id}
                  >
                    <div className="font-semibold">{cls.name}</div>
                    <div className="text-xs">{cls.subject}</div>
                    {teacher && (
                      <div className="text-xs text-gray-600">
                        Teacher: {teacher.user.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Conflicts Display */}
      {conflicts.length > 0 && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-4">
          <h3 className="font-bold">Conflicts Detected:</h3>
          <ul className="list-disc pl-5 mt-2">
            {conflicts.map((conflict) => (
              <li key={conflict.id} className={conflict.type === 'teacher' ? 'text-orange-700' : 'text-red-700'}>
                {conflict.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Timetable Grid */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-300">
        <h2 className="text-lg font-semibold mb-3">Timetable</h2>
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)] mt-4">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="py-2 px-4 border bg-gray-50">Time / Day</th>
                {days.map(day => (
                  <th key={day} className="py-2 px-4 border bg-gray-50">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(timeSlot => (
                <tr key={timeSlot.id}>
                  <td className="py-2 px-4 border bg-gray-50">
                    <div className="font-medium">{timeSlot.label}</div>
                    <div className="text-xs text-gray-500">
                      {timeSlot.startTime} - {timeSlot.endTime}
                    </div>
                  </td>
                  
                  {days.map(day => {
                    const slotId = `${day}-${timeSlot.label}`;
                    const slotClasses = getClassesForSlot(day, timeSlot.label);
                    const hasConflictClass = hasConflict(day, timeSlot.label);
                    
                    return (
                      <td 
                        key={slotId}
                        className={`py-2 px-4 border align-top min-w-[200px] h-[120px] ${hasConflictClass ? 
                          getConflictType(day, timeSlot.label).includes('teacher') ? 'bg-orange-50' : 
                          getConflictType(day, timeSlot.label).includes('room') ? 'bg-red-50' : 'bg-red-50' : ''}`}
                        onDragOver={(e) => handleDragOver(e, day, timeSlot.label)}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => {
                          console.log('DROP EVENT FIRED on cell:', day, timeSlot.label);
                          handleDrop(e, day, timeSlot.label);
                        }}
                      >
                        {slotClasses.length === 0 ? (
                          <div 
                            className="text-xs text-gray-400 italic h-full flex items-center justify-center drop-zone"
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.classList.add('drag-over');
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.classList.remove('drag-over');
                            }}
                          >
                            Drop class here
                          </div>
                        ) : (
                          slotClasses.map(cls => {
                            // Using the matchingSchedules property we set in getClassesForSlot
                            // Each class should have one or more matching schedules for this day and time
                            const matchingSchedules = (cls as any).matchingSchedules || [];
                            
                            // For cells with a single schedule, show it directly
                            if (matchingSchedules.length === 1) {
                              const schedule = matchingSchedules[0];
                              const teacher = teachers.find(t => t.id === cls.teacherId);
                              const room = rooms.find(r => r.id === schedule?.roomId);
                              
                              return (
                              <div
                                key={`${cls.id}-${schedule?.id || 'temp'}`}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, cls, slotId)}
                                onDragEnd={(e) => {
                                  const target = e.currentTarget as HTMLElement;
                                  if (target) {
                                    target.classList.remove('opacity-50', 'border', 'border-blue-500');
                                  }
                                }}
                                className={`p-2 mb-2 rounded text-sm cursor-grab active:cursor-grabbing class-card ${getClassStyle(cls)} shadow hover:shadow-md transition-all duration-200 relative`}
                                data-schedule-id={schedule?.id}
                                data-day={day}
                                data-time={timeSlot.label}
                                data-room-id={schedule?.roomId}
                                data-class-id={cls.id}
                                title="Drag to reschedule this class"
                              >
                                {pendingChanges.some(c => c.scheduleId === schedule?.id) && (
                                  <div className="absolute -top-2 -right-2 bg-yellow-400 text-xs text-white rounded-full w-4 h-4 flex items-center justify-center" title="Pending change">
                                    *
                                  </div>
                                )}
                                <div className="font-semibold">{cls.name}</div>
                                <div className="text-xs">{cls.subject}</div>
                                {teacher && (
                                  <div className="text-xs text-gray-600">
                                    Teacher: {teacher.user.name}
                                  </div>
                                )}
                                {room && (
                                  <div className="text-xs text-gray-600">
                                    Room: {room.name}
                                  </div>
                                )}
                              </div>
                            );
                            }
                            // This is a fallback for multiple schedules in the same cell
                            // In practice this shouldn't happen often with the current implementation
                            // as we're being specific about day and time
                            else {
                              return (
                                <div 
                                  key={`${cls.id}-multiple`}
                                  draggable="true"
                                  onDragStart={(e) => handleDragStart(e, cls, slotId)}
                                  className={`p-2 mb-2 rounded text-sm cursor-grab active:cursor-grabbing class-card ${getClassStyle(cls)} shadow hover:shadow-md transition-all duration-200 relative`}
                                  data-class-id={cls.id}
                                  title="Class with multiple schedules in this slot"
                                >
                                  <div className="font-semibold">{cls.name}</div>
                                  <div className="text-xs">{cls.subject}</div>
                                  <div className="text-xs text-purple-600 font-semibold">
                                    {matchingSchedules.length} schedules
                                  </div>
                                </div>
                              );
                            }
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
      </div>
    </div>
  );
};

export default TimetableGrid;
