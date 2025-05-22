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

interface Class {
  id: string;
  name: string;
  subject: string;
  schedule: string | null;
  room: string | null;
  teacherId: string | null;
}

interface TimeSlot {
  id: string;
  day: string;
  time: string;
  classes: Class[];
}

const days = ['Sunday','Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const times = ['8:00 AM', '9:30 AM', '11:00 AM', '12:30 PM', '2:00 PM', '3:30 PM', '5:00 PM'];

// Time format mapping for normalization
const timeFormatMap: Record<string, string> = {
  // Handle various time formats that might be in the database
  '8:00 AM': '8:00 AM', '8:00': '8:00 AM', '08:00': '8:00 AM', '08:00 AM': '8:00 AM', '8:00AM': '8:00 AM', '08:00AM': '8:00 AM',
  '9:00 AM': '9:30 AM', '9:00': '9:30 AM', '09:00': '9:30 AM', '09:00 AM': '9:30 AM', '9:00AM': '9:30 AM', '09:00AM': '9:30 AM',
  '9:30 AM': '9:30 AM', '9:30': '9:30 AM', '09:30': '9:30 AM', '09:30 AM': '9:30 AM', '9:30AM': '9:30 AM', '09:30AM': '9:30 AM',
  '10:00 AM': '11:00 AM', '10:00': '11:00 AM', '10:00AM': '11:00 AM',
  '11:00 AM': '11:00 AM', '11:00': '11:00 AM', '11:00AM': '11:00 AM',
  '12:00 PM': '12:30 PM', '12:00': '12:30 PM', '12:00PM': '12:30 PM',
  '12:30 PM': '12:30 PM', '12:30': '12:30 PM', '12:30PM': '12:30 PM',
  '1:00 PM': '2:00 PM', '1:00': '2:00 PM', '13:00': '2:00 PM', '01:00 PM': '2:00 PM', '1:00PM': '2:00 PM', '13:00PM': '2:00 PM',
  '2:00 PM': '2:00 PM', '2:00': '2:00 PM', '14:00': '2:00 PM', '02:00 PM': '2:00 PM', '2:00PM': '2:00 PM', '14:00PM': '2:00 PM',
  '3:00 PM': '3:30 PM', '3:00': '3:30 PM', '15:00': '3:30 PM', '03:00 PM': '3:30 PM', '3:00PM': '3:30 PM', '15:00PM': '3:30 PM',
  '3:30 PM': '3:30 PM', '3:30': '3:30 PM', '15:30': '3:30 PM', '03:30 PM': '3:30 PM', '3:30PM': '3:30 PM', '15:30PM': '3:30 PM',
  '4:00 PM': '5:00 PM', '4:00': '5:00 PM', '16:00': '5:00 PM', '04:00 PM': '5:00 PM', '4:00PM': '5:00 PM', '16:00PM': '5:00 PM',
  '5:00 PM': '5:00 PM', '5:00': '5:00 PM', '17:00': '5:00 PM', '05:00 PM': '5:00 PM', '5:00PM': '5:00 PM', '17:00PM': '5:00 PM',
};

// Day format mapping for normalization
const dayFormatMap: Record<string, string> = {
  'monday': 'Monday', 'Monday': 'Monday', 'mon': 'Monday', 'Mon': 'Monday', 'MONDAY': 'Monday',
  'tuesday': 'Tuesday', 'Tuesday': 'Tuesday', 'tue': 'Tuesday', 'Tue': 'Tuesday', 'TUESDAY': 'Tuesday',
  'wednesday': 'Wednesday', 'Wednesday': 'Wednesday', 'wed': 'Wednesday', 'Wed': 'Wednesday', 'WEDNESDAY': 'Wednesday',
  'thursday': 'Thursday', 'Thursday': 'Thursday', 'thu': 'Thursday', 'Thu': 'Thursday', 'THURSDAY': 'Thursday',
  'friday': 'Friday', 'Friday': 'Friday', 'fri': 'Friday', 'Fri': 'Friday', 'FRIDAY': 'Friday',
  'saturday': 'Saturday', 'Saturday': 'Saturday', 'sat': 'Saturday', 'Sat': 'Saturday', 'SATURDAY': 'Saturday',
  'sunday': 'Sunday', 'Sunday': 'Sunday', 'sun': 'Sunday', 'Sun': 'Sunday', 'SUNDAY': 'Sunday',
};

// Function to normalize schedule strings from the database
const normalizeSchedule = (schedule: string | null): { day: string, time: string }[] => {
  if (!schedule) return [];
  
  const results: { day: string, time: string }[] = [];
  
  // Special case for schedule formats like "Monday & Wednesday, 1:00 PM"
  // where multiple days share the same time
  if (schedule.includes('&') || schedule.toLowerCase().includes(' and ')) {
    // First, try to extract the time that applies to all days
    let sharedTime: string | null = null;
    const timeMatch = schedule.match(/([\d:]+\s*[APap][Mm]?|[\d:]+)/i);
    if (timeMatch && timeMatch[0]) {
      sharedTime = timeMatch[0].trim();
    }
    
    // Now extract all the days
    // Split by '&', 'and', or commas, then filter out non-day parts
    const dayParts = schedule.split(/\s*(?:&|,|and)\s*/i)
      .map(part => part.trim())
      .filter(part => {
        // Keep only parts that might be days (don't contain time patterns)
        return !part.match(/[\d:]+\s*[APap][Mm]?|[\d:]+/i) && part.length > 0;
      });
    
    // For each day, create a day-time pair with the shared time
    if (sharedTime) {
      dayParts.forEach(dayPart => {
        // Clean up the day part (remove "at" and other words)
        const cleanDay = dayPart.replace(/\s+at\s+.*$/, '').trim();
        
        if (cleanDay && sharedTime) {
          const normalizedDay = dayFormatMap[cleanDay.toLowerCase()] || cleanDay;
          const normalizedTime = timeFormatMap[sharedTime] || 
                               timeFormatMap[sharedTime.toLowerCase()] || 
                               timeFormatMap[sharedTime.replace(/\s+/g, '')] || 
                               sharedTime;
          
          // Only add valid day-time pairs
          if (days.includes(normalizedDay) && normalizedTime && times.includes(normalizedTime)) {
            results.push({ day: normalizedDay, time: normalizedTime });
          } else {
            console.warn(`Invalid day/time after normalization: ${normalizedDay} at ${normalizedTime} (original: ${cleanDay} at ${sharedTime})`);
          }
        }
      });
    }
    
    // If we successfully parsed multiple days, return the results
    if (results.length > 0) {
      return results;
    }
  }
  
  // Fall back to the original pattern matching approach for other formats
  // Split by '&' or 'and' to handle multiple days
  const scheduleParts = schedule.split(/\s*(?:&|and)\s*/i);
  
  scheduleParts.forEach(part => {
    // Try to extract day and time using different patterns
    let day: string | null = null;
    let time: string | null = null;
    let extractedTime: string | null = null;
    
    // Pattern 1: "Day at Time" (e.g., "Monday at 9:00 AM")
    const pattern1 = /([\w]+)\s+at\s+([\d:]+\s*[APap][Mm]?|[\d:]+)/i;
    const match1 = part.match(pattern1);
    
    if (match1 && match1.length >= 3) {
      day = match1[1].trim();
      extractedTime = match1[2].trim();
    } else {
      // Pattern 2: "Day, Time" (e.g., "Monday, 9:00 AM")
      const pattern2 = /([\w]+)[,\s]+([\d:]+\s*[APap][Mm]?|[\d:]+)/i;
      const match2 = part.match(pattern2);
      
      if (match2 && match2.length >= 3) {
        day = match2[1].trim();
        extractedTime = match2[2].trim();
      } else if (part.trim().match(/^[\w]+$/)) {
        // If only a day is specified in this part, use the time from another part
        // This handles formats like "Monday & Wednesday at 2:00 PM"
        day = part.trim();
        
        // Look for time in other parts
        for (const otherPart of scheduleParts) {
          if (otherPart === part) continue;
          
          const timeMatch = otherPart.match(/([\d:]+\s*[APap][Mm]?|[\d:]+)/i);
          if (timeMatch && timeMatch[0]) {
            extractedTime = timeMatch[0].trim();
            break;
          }
        }
        
        // If we still don't have a time, try to find it in the full schedule
        if (!extractedTime) {
          const fullScheduleTimeMatch = schedule.match(/([\d:]+\s*[APap][Mm]?|[\d:]+)/i);
          if (fullScheduleTimeMatch && fullScheduleTimeMatch[0]) {
            extractedTime = fullScheduleTimeMatch[0].trim();
          }
        }
      }
    }
    
    // If we couldn't extract day and time, skip this part
    if (!day || !extractedTime) {
      console.warn(`Could not parse schedule part: ${part} from ${schedule}`);
      return;
    }
    
    // Normalize day and time using our mapping
    const normalizedDay = dayFormatMap[day.toLowerCase()] || day;
    // Handle time formats with different casings and spacing
    const normalizedTime = timeFormatMap[extractedTime] || 
                         timeFormatMap[extractedTime.toLowerCase()] || 
                         timeFormatMap[extractedTime.replace(/\s+/g, '')] || 
                         extractedTime;
    
    // Check if the normalized values are in our valid lists
    if (!days.includes(normalizedDay)) {
      console.warn(`Invalid day after normalization: ${normalizedDay} (original: ${day})`);
      return;
    }
    
    if (!times.includes(normalizedTime)) {
      console.warn(`Invalid time after normalization: ${normalizedTime} (original: ${extractedTime})`);
      return;
    }
    
    results.push({ day: normalizedDay, time: normalizedTime });
  });
  
  return results;
};

export default function TimetableGenerator() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [unassignedClasses, setUnassignedClasses] = useState<Class[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [workloadWarnings, setWorkloadWarnings] = useState<{[key: string]: string}>({});
  const [rooms, setRooms] = useState<string[]>(['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 105']);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const [draggedClass, setDraggedClass] = useState<Class | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (session?.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    // Initialize time slots
    const initialTimeSlots: TimeSlot[] = [];
    days.forEach(day => {
      times.forEach(time => {
        initialTimeSlots.push({
          id: `${day}-${time}`,
          day,
          time,
          classes: []
        });
      });
    });
    setTimeSlots(initialTimeSlots);

    // Fetch teachers and classes
    fetchTeachersAndClasses();
  }, [session, status, router]);

  useEffect(() => {
    if (selectedTeacher) {
      // Fetch specific teacher data if needed
      const fetchTeacherClasses = async () => {
        try {
          // Always fetch fresh data for the selected teacher to ensure we have the latest
          const response = await fetch(`/api/admin/teachers/${selectedTeacher}/classes`);
          if (response.ok) {
            const teacherClassesData = await response.json();
            console.log(`Fetched classes for teacher ${selectedTeacher}:`, teacherClassesData);
            
            // Update the classes in our state
            if (teacherClassesData && teacherClassesData.length > 0) {
              // Update the timeSlots with these classes
              updateTimeSlotsWithClasses(teacherClassesData);
            } else {
              // If no classes, reset the timetable
              const emptyTimeSlots = [...timeSlots.map(slot => ({ ...slot, classes: [] }))];
              setTimeSlots(emptyTimeSlots);
            }
          }
        } catch (error) {
          console.error('Error fetching teacher classes:', error);
          toast.error('Failed to fetch teacher classes');
        }
      };
      
      fetchTeacherClasses();
    }
  }, [selectedTeacher, teachers]);

  const fetchTeachersAndClasses = async () => {
    try {
      setIsLoading(true);
      
      // Fetch teachers with their classes
      const teachersResponse = await fetch('/api/admin/teachers');
      if (!teachersResponse.ok) {
        throw new Error('Failed to fetch teachers');
      }
      const teachersData = await teachersResponse.json();
      console.log('Teachers data:', teachersData);
      
      // Fetch all classes
      const classesResponse = await fetch('/api/admin/classes');
      if (!classesResponse.ok) {
        throw new Error('Failed to fetch classes');
      }
      const classesData = await classesResponse.json();
      console.log('Classes data:', classesData);
      
      // Set teachers and classes
      setTeachers(teachersData);
      setClasses(classesData);
      
      // Set unassigned classes (classes without a schedule)
      const unassigned = classesData.filter((cls: Class) => !cls.schedule);
      setUnassignedClasses(unassigned);
      
      // Populate time slots with scheduled classes
      const scheduledClasses = classesData.filter((cls: Class) => cls.schedule);
      console.log('Scheduled classes:', scheduledClasses);
      
      // Create new time slots array
      const newTimeSlots: TimeSlot[] = [];
      days.forEach(day => {
        times.forEach(time => {
          newTimeSlots.push({
            id: `${day}-${time}`,
            day,
            time,
            classes: []
          });
        });
      });
      
      // Process each scheduled class and add it to the appropriate time slot
      // Function to normalize schedule strings from the database
      const normalizeSchedule = (schedule: string | null): { day: string, time: string }[] => {
        if (!schedule) return [];
        
        const results: { day: string, time: string }[] = [];
        
        // Special case for schedule formats like "Monday & Wednesday, 1:00 PM"
        // where multiple days share the same time
        if (schedule.includes('&') || schedule.toLowerCase().includes(' and ')) {
          // First, try to extract the time that applies to all days
          let sharedTime: string | null = null;
          const timeMatch = schedule.match(/([\d:]+\s*[APap][Mm]?|[\d:]+)/i);
          if (timeMatch && timeMatch[0]) {
            sharedTime = timeMatch[0].trim();
          }
          
          // Now extract all the days
          // Split by '&', 'and', or commas, then filter out non-day parts
          const dayParts = schedule.split(/\s*(?:&|,|and)\s*/i)
            .map(part => part.trim())
            .filter(part => {
              // Keep only parts that might be days (don't contain time patterns)
              return !part.match(/[\d:]+\s*[APap][Mm]?|[\d:]+/i) && part.length > 0;
            });
          
          // For each day, create a day-time pair with the shared time
          if (sharedTime) {
            dayParts.forEach(dayPart => {
              // Clean up the day part (remove "at" and other words)
              const cleanDay = dayPart.replace(/\s+at\s+.*$/, '').trim();
              
              if (cleanDay) {
                const normalizedDay = dayFormatMap[cleanDay.toLowerCase()] || cleanDay;
                const normalizedTime = timeFormatMap[sharedTime!] || 
                                     timeFormatMap[sharedTime!.toLowerCase()] || 
                                     timeFormatMap[sharedTime!.replace(/\s+/g, '')] || 
                                     sharedTime;
                
                // Only add valid day-time pairs
                if (days.includes(normalizedDay) && times.includes(normalizedTime!)) {
                  results.push({ day: normalizedDay, time: normalizedTime! });
                } else {
                  console.warn(`Invalid day/time after normalization: ${normalizedDay} at ${normalizedTime} (original: ${cleanDay} at ${sharedTime})`);
                }
              }
            });
          }
          
          // If we successfully parsed multiple days, return the results
          if (results.length > 0) {
            return results;
          }
        }
        
        // Fall back to the original pattern matching approach for other formats
        // Split by '&' or 'and' to handle multiple days
        const scheduleParts = schedule.split(/\s*(?:&|and)\s*/i);
        
        scheduleParts.forEach(part => {
          // Try to extract day and time using different patterns
          let day: string | null = null;
          let time: string | null = null;
          let extractedTime: string | null = null;
          
          // Pattern 1: "Day at Time" (e.g., "Monday at 9:00 AM")
          const pattern1 = /([\w]+)\s+at\s+([\d:]+\s*[APap][Mm]?|[\d:]+)/i;
          const match1 = part.match(pattern1);
          
          if (match1 && match1.length >= 3) {
            day = match1[1].trim();
            extractedTime = match1[2].trim();
          } else {
            // Pattern 2: "Day, Time" (e.g., "Monday, 9:00 AM")
            const pattern2 = /([\w]+)[,\s]+([\d:]+\s*[APap][Mm]?|[\d:]+)/i;
            const match2 = part.match(pattern2);
            
            if (match2 && match2.length >= 3) {
              day = match2[1].trim();
              extractedTime = match2[2].trim();
            } else if (part.trim().match(/^[\w]+$/)) {
              // If only a day is specified in this part, use the time from another part
              // This handles formats like "Monday & Wednesday at 2:00 PM"
              day = part.trim();
              
              // Look for time in other parts
              for (const otherPart of scheduleParts) {
                if (otherPart === part) continue;
                
                const timeMatch = otherPart.match(/([\d:]+\s*[APap][Mm]?|[\d:]+)/i);
                if (timeMatch && timeMatch[0]) {
                  extractedTime = timeMatch[0].trim();
                  break;
                }
              }
              
              // If we still don't have a time, try to find it in the full schedule
              if (!extractedTime) {
                const fullScheduleTimeMatch = schedule.match(/([\d:]+\s*[APap][Mm]?|[\d:]+)/i);
                if (fullScheduleTimeMatch && fullScheduleTimeMatch[0]) {
                  extractedTime = fullScheduleTimeMatch[0].trim();
                }
              }
            }
          }
          
          // If we couldn't extract day and time, skip this part
          if (!day || !extractedTime) {
            console.warn(`Could not parse schedule part: ${part} from ${schedule}`);
            return;
          }
          
          // Normalize day and time using our mapping
          const normalizedDay = dayFormatMap[day.toLowerCase()] || day;
          // Handle time formats with different casings and spacing
          const normalizedTime = timeFormatMap[extractedTime] || 
                               timeFormatMap[extractedTime.toLowerCase()] || 
                               timeFormatMap[extractedTime.replace(/\s+/g, '')] || 
                               extractedTime;
          
          // Check if the normalized values are in our valid lists
          if (!days.includes(normalizedDay)) {
            console.warn(`Invalid day after normalization: ${normalizedDay} (original: ${day})`);
            return;
          }
          
          if (!times.includes(normalizedTime)) {
            console.warn(`Invalid time after normalization: ${normalizedTime} (original: ${extractedTime})`);
            return;
          }
          
          results.push({ day: normalizedDay, time: normalizedTime });
        });
        
        return results;
      };
      
      // Process each scheduled class
      scheduledClasses.forEach((cls: Class) => {
        if (cls.schedule) {
          const normalizedSchedules = normalizeSchedule(cls.schedule);
          
          if (normalizedSchedules.length > 0) {
            // For each day/time combination in the schedule
            normalizedSchedules.forEach(({ day, time }) => {
              const slotIndex = newTimeSlots.findIndex(slot => slot.day === day && slot.time === time);
              
              if (slotIndex !== -1) {
                const targetSlot = newTimeSlots[slotIndex];
                if (targetSlot && Array.isArray(targetSlot.classes)) {
                  // Create a copy of the class for each time slot to avoid reference issues
                  const classCopy = { ...cls };
                  targetSlot.classes.push(classCopy);
                  console.log(`Added class ${cls.name} to ${day} at ${time} (original schedule: ${cls.schedule})`);
                }
              } else {
                console.warn(`Could not find time slot for ${day} at ${time}`);
              }
            });
          } else {
            console.warn(`Failed to normalize schedule for class ${cls.name}: ${cls.schedule}`);
          }
        }
      });
      
      setTimeSlots(newTimeSlots);
      checkForConflicts(newTimeSlots);
      checkTeacherWorkloads(teachersData);
      
      // If a teacher is already selected, highlight their classes
      if (selectedTeacher) {
        const teacherClasses = classesData.filter((cls: Class) => cls.teacherId === selectedTeacher);
        console.log(`Classes for selected teacher ${selectedTeacher}:`, teacherClasses);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load timetable data');
      setIsLoading(false);
    }
  };

  // Function to update time slots with classes (used when fetching teacher-specific classes)
  const updateTimeSlotsWithClasses = (classesData: Class[]) => {
    // Reset all time slots
    const updatedTimeSlots = [...timeSlots.map(slot => ({ ...slot, classes: [] }))];
    
    // Debug information
    console.log(`Updating timetable with ${classesData.length} classes for selected teacher`);
    
    // Add classes to the appropriate time slots
    classesData.forEach(cls => {
      if (cls.schedule) {
        console.log(`Processing class schedule: ${cls.name} - ${cls.schedule}`);
        // Use the normalizeSchedule function from the component scope
        const normalizedSchedules = normalizeSchedule(cls.schedule);
        
        console.log(`Normalized schedules for ${cls.name}:`, normalizedSchedules);
        
        if (normalizedSchedules.length === 0) {
          console.warn(`Failed to normalize schedule for class ${cls.name}: ${cls.schedule}`);
          // Try a more aggressive approach for this specific class
          // This is a fallback for complex schedule formats
          if (cls.schedule.includes('Monday') || cls.schedule.toLowerCase().includes('mon')) {
            addClassToDay(cls, 'Monday', updatedTimeSlots);
          }
          if (cls.schedule.includes('Tuesday') || cls.schedule.toLowerCase().includes('tue')) {
            addClassToDay(cls, 'Tuesday', updatedTimeSlots);
          }
          if (cls.schedule.includes('Wednesday') || cls.schedule.toLowerCase().includes('wed')) {
            addClassToDay(cls, 'Wednesday', updatedTimeSlots);
          }
          if (cls.schedule.includes('Thursday') || cls.schedule.toLowerCase().includes('thu')) {
            addClassToDay(cls, 'Thursday', updatedTimeSlots);
          }
          if (cls.schedule.includes('Friday') || cls.schedule.toLowerCase().includes('fri')) {
            addClassToDay(cls, 'Friday', updatedTimeSlots);
          }
          if (cls.schedule.includes('Saturday') || cls.schedule.toLowerCase().includes('sat')) {
            addClassToDay(cls, 'Saturday', updatedTimeSlots);
          }
        } else {
          // For each day/time combination in the schedule
          normalizedSchedules.forEach(({ day, time }: { day: string, time: string }) => {
            const slotIndex = updatedTimeSlots.findIndex(slot => slot.day === day && slot.time === time);
            
            if (slotIndex !== -1) {
              const targetSlot = updatedTimeSlots[slotIndex];
              if (targetSlot && Array.isArray(targetSlot.classes)) {
                // Create a copy of the class for each time slot to avoid reference issues
                const classCopy = { ...cls } as Class;
                targetSlot.classes.push(classCopy);
                console.log(`Added class ${cls.name} to ${day} at ${time}`);
              }
            } else {
              console.warn(`Could not find time slot for ${day} at ${time}`);
            }
          });
        }
      }
    });
    
    // Set the updated time slots
    setTimeSlots(updatedTimeSlots);
    
    // Check for conflicts with the updated time slots
    checkForConflicts(updatedTimeSlots);
  };
  
  // Helper function to add a class to a specific day (used as fallback)
  const addClassToDay = (cls: Class, day: string, slots: TimeSlot[]) => {
    // Extract time from the schedule string if possible
    let time: string | null = null;
    const timeMatch = cls.schedule?.match(/([\d:]+\s*[APap][Mm]?|[\d:]+)/i);
    if (timeMatch && timeMatch[0]) {
      const extractedTime = timeMatch[0].trim();
      time = timeFormatMap[extractedTime] || 
             timeFormatMap[extractedTime.toLowerCase()] || 
             timeFormatMap[extractedTime.replace(/\s+/g, '')] || 
             extractedTime;
      
      // If the time is valid, find the slot and add the class
      if (times.includes(time)) {
        const slotIndex = slots.findIndex(slot => slot.day === day && slot.time === time);
        if (slotIndex !== -1) {
          const targetSlot = slots[slotIndex];
          if (targetSlot && Array.isArray(targetSlot.classes)) {
            const classCopy = { ...cls } as Class;
            targetSlot.classes.push(classCopy);
            console.log(`Fallback: Added class ${cls.name} to ${day} at ${time}`);
          }
        }
      } else {
        // If we couldn't extract a valid time, try each time slot for this day
        // This is a last resort for really problematic schedule formats
        console.warn(`Couldn't extract valid time from ${cls.schedule}, trying all time slots for ${day}`);
        times.forEach(timeSlot => {
          const slotIndex = slots.findIndex(slot => slot.day === day && slot.time === timeSlot);
          if (slotIndex !== -1) {
            const targetSlot = slots[slotIndex];
            if (targetSlot && Array.isArray(targetSlot.classes)) {
              const classCopy = { ...cls } as Class;
              if (classCopy.schedule) {
                classCopy.schedule = `${day} at ${timeSlot} (original: ${cls.schedule})`;
              }
              targetSlot.classes.push(classCopy);
              console.log(`Emergency fallback: Added class ${cls.name} to ${day} at ${timeSlot}`);
            }
          }
        });
      }
    }
  };
  
  const checkForConflicts = (slots: TimeSlot[]): boolean => {
    // Check for teacher conflicts (same teacher in two places at once)
    const conflicts: string[] = [];
    
    days.forEach(day => {
      times.forEach(time => {
        const slotsForTime = slots.filter(slot => slot.day === day && slot.time === time);
        
        // Get all classes scheduled at this time
        const classesAtTime: Class[] = [];
        slotsForTime.forEach(slot => {
          // Ensure slot.classes exists before accessing it
          if (slot && Array.isArray(slot.classes)) {
            classesAtTime.push(...slot.classes);
          }
        });
        
        // Check for teacher conflicts
        const teacherIds = classesAtTime
          .map(cls => cls.teacherId)
          .filter((id): id is string => id !== null && id !== undefined);
        const uniqueTeacherIds = new Set(teacherIds);
        
        if (teacherIds.length > uniqueTeacherIds.size) {
          conflicts.push(`Teacher conflict on ${day} at ${time}`);
        }
        
        // Check for room conflicts
        const roomIds = classesAtTime
          .map(cls => cls.room)
          .filter((room): room is string => room !== null && room !== undefined);
        const uniqueRoomIds = new Set(roomIds);
        
        if (roomIds.length > uniqueRoomIds.size) {
          conflicts.push(`Room conflict on ${day} at ${time}`);
        }
      });
    });
    
    setConflicts(conflicts);
    return conflicts.length > 0;
  };

  const checkTeacherWorkloads = (teachersList: Teacher[]) => {
    const warnings: {[key: string]: string} = {};
    
    teachersList.forEach(teacher => {
      // Check if teacher.classes exists before accessing length
      const classCount = teacher.classes?.length || 0;
      
      if (classCount > 5) {
        warnings[teacher.id] = `High workload (${classCount} classes)`;
      }
      
      // Add a warning for teachers with workload.isOverloaded flag
      if (teacher.workload?.isOverloaded) {
        warnings[teacher.id] = `High workload (${teacher.workload.weeklyHours} hours/week)`;
      }
    });
    
    setWorkloadWarnings(warnings);
  };

  const handleDragStart = (e: React.DragEvent, classObj: Class, source: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify(classObj));
    e.dataTransfer.setData('source', source);
    setDraggedClass(classObj);
    setDragSource(source);
  };

  const handleDragOver = (e: React.DragEvent, targetSlotId: string) => {
    e.preventDefault();
    
    if (!draggedClass) return;
    
    // Check for potential conflicts
    if (targetSlotId !== 'unassigned') {
      const [day, time] = targetSlotId.split('-');
      const targetSlot = timeSlots.find(slot => slot.id === targetSlotId);
      
      if (targetSlot) {
        // Check for teacher conflicts
        const hasTeacherConflict = targetSlot.classes.some(cls => 
          cls.teacherId === draggedClass.teacherId && cls.id !== draggedClass.id
        );
        
        // Check for room conflicts (if the class has a room assigned)
        const hasRoomConflict = draggedClass.room && targetSlot.classes.some(cls => 
          cls.room === draggedClass.room && cls.id !== draggedClass.id
        );
        
        if (hasTeacherConflict || hasRoomConflict) {
          e.dataTransfer.dropEffect = 'none'; // Indicate that dropping is not allowed
          e.currentTarget.classList.add('bg-red-200');
          return;
        }
      }
    }
    
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('bg-green-200');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-red-200', 'bg-green-200');
  };

  const handleDrop = async (e: React.DragEvent, targetSlotId: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-red-200', 'bg-green-200');
    
    const classData = e.dataTransfer.getData('application/json');
    const source = e.dataTransfer.getData('source');
    
    if (!classData) return;
    
    const classObj: Class = JSON.parse(classData);
    
    // If dropping in the same place, do nothing
    if (source === targetSlotId) return;
    
    if (source === 'unassigned') {
      // Handle drop from unassigned classes
      const newTimeSlots = [...timeSlots];
      
      if (targetSlotId !== 'unassigned') {
        // Dropping into a time slot
        const [day, time] = targetSlotId.split('-');
        const slotIndex = newTimeSlots.findIndex(slot => slot.id === targetSlotId);
        
        if (slotIndex !== -1) {
          // Check for conflicts before adding
          const hasTeacherConflict = newTimeSlots[slotIndex].classes.some(cls => 
            cls.teacherId === classObj.teacherId && cls.id !== classObj.id
          );
          
          const hasRoomConflict = classObj.room && newTimeSlots[slotIndex].classes.some(cls => 
            cls.room === classObj.room && cls.id !== classObj.id
          );
          
          if (hasTeacherConflict || hasRoomConflict) {
            toast.error('Conflict detected! Cannot schedule class at this time.');
            return;
          }
          
          // Update class with schedule
          const updatedClass = {
            ...classObj,
            schedule: `${day} at ${time}`
          };
          
          // Add to time slot
          newTimeSlots[slotIndex].classes.push(updatedClass);
          
          // Remove from unassigned
          setUnassignedClasses(unassignedClasses.filter(cls => cls.id !== classObj.id));
          
          // Update classes array
          const newClasses = classes.map(cls => 
            cls.id === classObj.id ? updatedClass : cls
          );
          
          setClasses(newClasses);
          setTimeSlots(newTimeSlots);
          
          // Check for conflicts
          checkForConflicts(newTimeSlots);
          
          // Save the changes to the backend
          try {
            const response = await fetch(`/api/admin/classes/${classObj.id}/schedule`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                day,
                time,
                room: classObj.room,
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              toast.error(errorData.error || 'Failed to update schedule');
              // Revert changes if save fails
              fetchTeachersAndClasses();
            } else {
              toast.success('Class scheduled successfully');
            }
          } catch (error) {
            console.error('Error saving schedule:', error);
            toast.error('Failed to save schedule changes');
            // Revert changes if save fails
            fetchTeachersAndClasses();
          }
        }
      }
    } else if (targetSlotId === 'unassigned') {
      // Handle drop to unassigned classes
      const newTimeSlots = [...timeSlots];
      const sourceSlotIndex = newTimeSlots.findIndex(slot => slot.id === source);
      
      if (sourceSlotIndex !== -1) {
        // Remove from time slot
        newTimeSlots[sourceSlotIndex].classes = newTimeSlots[sourceSlotIndex].classes.filter(
          cls => cls.id !== classObj.id
        );
        
        // Update class to remove schedule
        const updatedClass = {
          ...classObj,
          schedule: null,
          room: null
        };
        
        // Add to unassigned
        setUnassignedClasses([...unassignedClasses, updatedClass]);
        
        // Update classes array
        const newClasses = classes.map(cls => 
          cls.id === classObj.id ? updatedClass : cls
        );
        
        setClasses(newClasses);
        setTimeSlots(newTimeSlots);
        
        // Check for conflicts
        checkForConflicts(newTimeSlots);
        
        // Save the changes to the backend
        try {
          const response = await fetch(`/api/admin/classes/${classObj.id}/schedule`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              day: null,
              time: null,
              room: null,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            toast.error(errorData.error || 'Failed to update schedule');
            // Revert changes if save fails
            fetchTeachersAndClasses();
          } else {
            toast.success('Class removed from schedule');
          }
        } catch (error) {
          console.error('Error saving schedule:', error);
          toast.error('Failed to save schedule changes');
          // Revert changes if save fails
          fetchTeachersAndClasses();
        }
      }
    } else {
      // Handle drop between time slots
      const newTimeSlots = [...timeSlots];
      const sourceSlotIndex = newTimeSlots.findIndex(slot => slot.id === source);
      const targetSlotIndex = newTimeSlots.findIndex(slot => slot.id === targetSlotId);
      
      if (sourceSlotIndex !== -1 && targetSlotIndex !== -1) {
        // Check for conflicts before moving
        const hasTeacherConflict = newTimeSlots[targetSlotIndex].classes.some(cls => 
          cls.teacherId === classObj.teacherId && cls.id !== classObj.id
        );
        
        const hasRoomConflict = classObj.room && newTimeSlots[targetSlotIndex].classes.some(cls => 
          cls.room === classObj.room && cls.id !== classObj.id
        );
        
        if (hasTeacherConflict || hasRoomConflict) {
          toast.error('Conflict detected! Cannot schedule class at this time.');
          return;
        }
        
        // Remove from source slot
        newTimeSlots[sourceSlotIndex].classes = newTimeSlots[sourceSlotIndex].classes.filter(
          cls => cls.id !== classObj.id
        );
        
        // Update class schedule
        const [day, time] = targetSlotId.split('-');
        const updatedClass = {
          ...classObj,
          schedule: `${day} at ${time}`
        };
        
        // Add to target slot
        newTimeSlots[targetSlotIndex].classes.push(updatedClass);
        
        // Update classes array
        const newClasses = classes.map(cls => 
          cls.id === classObj.id ? updatedClass : cls
        );
        
        setClasses(newClasses);
        setTimeSlots(newTimeSlots);
        
        // Check for conflicts
        checkForConflicts(newTimeSlots);
        // Find the class to remove
        const sourceClasses = newTimeSlots[sourceSlotIndex].classes || [];
        const classToRemove = sourceClasses.find(cls => cls.id === classObj.id);
        
        // Remove from source slot
        newTimeSlots[sourceSlotIndex].classes = sourceClasses.filter(cls => cls.id !== classObj.id);
        
        if (classToRemove) {
          // Update the class to remove schedule
          const updatedClass: Class = {
            ...classToRemove,
            schedule: null,
            room: null
          };
          
          // Add to unassigned
          setUnassignedClasses([...unassignedClasses, updatedClass]);
          
          // Update classes array
          const newClasses = classes.map(cls => 
            cls.id === classObj.id ? updatedClass : cls
          );
          
          setClasses(newClasses);
          setTimeSlots(newTimeSlots);
          
          // Check for conflicts
          checkForConflicts(newTimeSlots);
          
          // Save the changes
          saveScheduleChanges(updatedClass);
        }
      }
    }
    
    // Reset drag state
    setDraggedClass(null);
    setDragSource(null);
  };

  const saveScheduleChanges = (updatedClass: Class) => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set a new timeout to save changes after a delay (to avoid too many API calls)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/classes/${updatedClass.id}/schedule`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            schedule: updatedClass.schedule,
            room: updatedClass.room
          }),
        });
        
        if (response.ok) {
          toast.success('Schedule updated successfully');
        } else {
          const errorData = await response.json();
          toast.error(errorData.error || 'Failed to update schedule');
          
          // Refresh data to revert changes if there was an error
          fetchTeachersAndClasses();
        }
      } catch (error) {
        console.error('Error saving schedule:', error);
        toast.error('Failed to save schedule changes');
        
        // Refresh data to revert changes
        fetchTeachersAndClasses();
      }
    }, 1000);
  };

  const handleTeacherFilter = (teacherId: string) => {
    setSelectedTeacher(selectedTeacher === teacherId ? null : teacherId);
    
    // Reset room filter when changing teacher
    setSelectedRoom('');
    
    // Show toast notification
    if (selectedTeacher === teacherId) {
      toast.success('Showing all teachers');
    } else {
      const teacher = teachers.find(t => t.id === teacherId);
      if (teacher) {
        toast.success(`Showing schedule for ${teacher.user.name}`);
      }
    }
  };
  
  const handleRoomFilter = (room: string) => {
    setSelectedRoom(room);
  };

  const getClassStyle = (classObj: Class) => {
    const teacher = teachers.find(t => t.id === classObj.teacherId);
    const hasWorkloadWarning = teacher && workloadWarnings[teacher.id];
    
    let backgroundColor = 'bg-blue-100';
    
    // Different colors based on subject
    if (classObj.subject.toLowerCase().includes('math')) {
      backgroundColor = 'bg-blue-100';
    } else if (classObj.subject.toLowerCase().includes('science')) {
      backgroundColor = 'bg-green-100';
    } else if (classObj.subject.toLowerCase().includes('english')) {
      backgroundColor = 'bg-yellow-100';
    } else if (classObj.subject.toLowerCase().includes('history')) {
      backgroundColor = 'bg-purple-100';
    } else if (classObj.subject.toLowerCase().includes('art')) {
      backgroundColor = 'bg-pink-100';
    }
    
    return `${backgroundColor} ${hasWorkloadWarning ? 'border-2 border-orange-500' : ''}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Timetable Generator</h1>
        <div className="flex space-x-3">
          <button 
            onClick={async () => {
              setIsSaving(true);
              try {
                // Save all scheduled classes
                for (const slot of timeSlots) {
                  for (const cls of slot.classes) {
                    const day = slot.id.split('-')[0];
                    const time = slot.id.split('-')[1];
                    
                    await fetch(`/api/admin/classes/${cls.id}/schedule`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        day,
                        time,
                        room: cls.room,
                      }),
                    });
                  }
                }
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(null), 3000);
              } catch (error) {
                console.error('Error saving timetable:', error);
                setSaveSuccess(false);
                setTimeout(() => setSaveSuccess(null), 3000);
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className={`${isSaving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white py-2 px-4 rounded transition duration-300 ease-in-out flex items-center`}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : 'Save Timetable'}
          </button>
          <Link href="/admin" className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105">
            Back to Dashboard
          </Link>
        </div>
      </div>
      
      {saveSuccess === true && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-md">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <p>Timetable saved successfully!</p>
          </div>
        </div>
      )}
      
      {saveSuccess === false && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-md">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p>Failed to save timetable. Please try again.</p>
          </div>
        </div>
      )}
      
      {/* Instructions Panel */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded shadow-md">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">How to Use the Timetable Generator</h2>
        <ol className="list-decimal pl-5 text-blue-800">
          <li className="mb-1">Drag classes from the <strong>Unassigned Classes</strong> panel to empty time slots</li>
          <li className="mb-1">Rearrange classes by dragging them between time slots</li>
          <li className="mb-1">Remove classes from the schedule by dragging them back to <strong>Unassigned Classes</strong></li>
          <li className="mb-1">Use the teacher filter to view schedules for specific teachers</li>
          <li className="mb-1">Green highlights indicate valid placements, red indicates conflicts</li>
        </ol>
      </div>

      {conflicts.length > 0 && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <h3 className="font-bold">Scheduling Conflicts Detected:</h3>
          <ul className="list-disc pl-5">
            {conflicts.map((conflict, index) => (
              <li key={index}>{conflict}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md w-full">
          <h2 className="text-xl font-semibold mb-4">Teacher Workload Filter</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTeacher(null)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedTeacher === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              } transition-colors duration-200`}
            >
              All Teachers
            </button>
            {teachers.map(teacher => (
              <button
                key={teacher.id}
                onClick={() => handleTeacherFilter(teacher.id)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTeacher === teacher.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                } ${workloadWarnings[teacher.id] ? 'border-2 border-orange-500' : ''} transition-colors duration-200`}
              >
                {teacher.user.name} 
                {/* Show class count for each teacher */}
                <span className="ml-1 text-xs bg-gray-200 px-1 rounded-full">
                  {classes.filter(cls => cls.teacherId === teacher.id).length}
                </span>
                {workloadWarnings[teacher.id] && (
                  <span title={workloadWarnings[teacher.id]} className="ml-1 cursor-help">⚠️</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap lg:flex-nowrap gap-6">
        {/* Unassigned Classes */}
        <div className="bg-white p-4 rounded-lg shadow-md w-full lg:w-1/4">
          <h2 className="text-xl font-semibold mb-4">
            Unassigned Classes
            {selectedTeacher && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                Filtered by: {teachers.find(t => t.id === selectedTeacher)?.user.name}
              </span>
            )}
          </h2>
          <div 
            className="min-h-[300px] bg-gray-100 p-3 rounded border-2 border-dashed border-gray-300 transition-colors duration-300 hover:border-indigo-300"
            onDragOver={(e) => handleDragOver(e, 'unassigned')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'unassigned')}
          >
            {unassignedClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>All classes have been scheduled</p>
              </div>
            ) : (
              unassignedClasses
                .filter(cls => 
                (!selectedTeacher || cls.teacherId === selectedTeacher) &&
                (!selectedRoom || cls.room === selectedRoom)
              )
                .map((cls, index) => {
                  const teacher = teachers.find(t => t.id === cls.teacherId);
                  return (
                    <div
                      key={cls.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, cls, 'unassigned')}
                      className={`p-3 mb-2 rounded cursor-move ${getClassStyle(cls)} shadow-sm hover:shadow-md transition-shadow duration-200 transform hover:scale-102 ${selectedTeacher && cls.teacherId === selectedTeacher ? 'ring-2 ring-indigo-500' : ''}`}
                    >
                      <div className="font-semibold">{cls.name}</div>
                      <div className="text-sm">{cls.subject}</div>
                      <div className="text-xs text-gray-600 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {teacher?.user.name || 'No teacher assigned'}
                      </div>
                    </div>
                  );
              })
            )}
          </div>
        </div>

        {/* Timetable */}
        <div className="bg-white p-4 rounded-lg shadow-md w-full lg:w-3/4 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Timetable
              {selectedTeacher && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  Showing: {teachers.find(t => t.id === selectedTeacher)?.user.name}'s schedule
                </span>
              )}
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Room Filter:</span>
              <select 
                className="border rounded p-1 text-sm" 
                value={selectedRoom}
                onChange={(e) => handleRoomFilter(e.target.value)}
                aria-label="Filter by room"
              >
                <option value="">All Rooms</option>
                {rooms.map(room => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </div>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 bg-gray-100 sticky left-0 z-10">Time</th>
                {days.map(day => (
                  <th key={day} className="border p-2 bg-gray-100 min-w-[150px]">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map(time => (
                <tr key={time}>
                  <td className="border p-2 font-medium sticky left-0 bg-white z-10">{time}</td>
                  {days.map(day => {
                    const slotId = `${day}-${time}`;
                    const slot = timeSlots.find(s => s.id === slotId);
                    const slotClasses = slot?.classes.filter(cls => 
                      (!selectedTeacher || cls.teacherId === selectedTeacher) &&
                      (!selectedRoom || cls.room === selectedRoom)
                    ) || [];
                    
                    return (
                      <td 
                        key={slotId} 
                        className={`border p-2 h-24 align-top transition-colors hover:bg-gray-50 ${selectedTeacher && timeSlots.find(s => s.id === slotId)?.classes.some(c => c.teacherId === selectedTeacher) ? 'bg-indigo-50' : ''}`}
                        onDragOver={(e) => handleDragOver(e, slotId)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, slotId)}
                      >
                        {slotClasses.length === 0 && (
                          <div className="flex items-center justify-center h-full opacity-30 text-center text-xs text-gray-400">
                            <div>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                              </svg>
                              <span>Drop class here</span>
                            </div>
                          </div>
                        )}
                        {slotClasses.map((cls) => {
                          const teacher = teachers.find(t => t.id === cls.teacherId);
                          return (
                            <div
                              key={cls.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, cls, slotId)}
                              className={`p-2 mb-2 rounded text-sm cursor-move ${getClassStyle(cls)} shadow hover:shadow-md transition-all duration-200 ${selectedTeacher && cls.teacherId === selectedTeacher ? 'ring-2 ring-indigo-500' : ''}`}
                            >
                              <div className="font-semibold">{cls.name}</div>
                              <div className="text-xs">{cls.subject}</div>
                              <div className="text-xs text-gray-600 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {teacher?.user.name || 'No teacher'}
                              </div>
                              <div className="text-xs text-gray-600 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                {cls.room || 'No room'}
                              </div>
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-8 bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Legend</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center">
            <div className="w-5 h-5 bg-blue-100 mr-2 rounded shadow-sm"></div>
            <span>Mathematics</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-green-100 mr-2 rounded shadow-sm"></div>
            <span>Science</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-yellow-100 mr-2 rounded shadow-sm"></div>
            <span>English</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-purple-100 mr-2 rounded shadow-sm"></div>
            <span>History</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-pink-100 mr-2 rounded shadow-sm"></div>
            <span>Art</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 border-2 border-orange-500 mr-2 rounded"></div>
            <span>High workload</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-red-200 mr-2 rounded shadow-sm"></div>
            <span>Conflict detected</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-green-200 mr-2 rounded shadow-sm"></div>
            <span>Valid placement</span>
          </div>
        </div>
        
        <div className="mt-6 border-t pt-4">
          <h3 className="font-semibold mb-2">Tips</h3>
          <ul className="text-sm text-gray-600 list-disc pl-5">
            <li>Classes with the same teacher cannot be scheduled at the same time</li>
            <li>Classes in the same room cannot be scheduled at the same time</li>
            <li>Teachers with high workload are highlighted with an orange border</li>
            <li>Use the teacher filter to focus on scheduling for specific teachers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
