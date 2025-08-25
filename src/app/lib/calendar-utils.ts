// Shared calendar utilities for consistent date handling across Today's Classes and Calendar views

export type ClassScheduleData = {
  id: string;
  name: string;
  subject: string;
  startDate: Date;
  endDate?: Date | null;
  schedules: {
    id: string;
    day: string;
    time: string;
    timeSlot?: {
      startTime: string;
      endTime: string;
      label?: string;
    } | null;
    room?: {
      name: string;
      building?: string;
    } | null;
  }[];
  enrollments?: any[];
};

export type CalendarEntry = {
  id: string;
  name: string;
  subject: string;
  startTime: string;
  endTime?: string;
  room: string;
  date: string;
  studentCount?: number;
};

/**
 * Convert day name to day number (0 = Sunday, 1 = Monday, etc.)
 */
export function getDayOfWeekNumber(dayName: string): number {
  const days = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };
  return days[dayName as keyof typeof days] ?? 1; // Default to Monday if not found
}

/**
 * Get day name from day number
 */
export function getDayName(dayNumber: number): string {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return daysOfWeek[dayNumber] || 'Monday';
}

/**
 * Check if a class is active on a specific date
 * This checks both date range and day-of-week schedule
 */
export function isClassActiveOnDate(classItem: ClassScheduleData, targetDate: Date): boolean {
  // Check if today is within class date range
  const classStart = new Date(classItem.startDate);
  classStart.setHours(0, 0, 0, 0);
  
  const classEnd = classItem.endDate 
    ? new Date(classItem.endDate) 
    : new Date('2099-12-31'); // Far future if no end date
  classEnd.setHours(23, 59, 59, 999);
  
  const checkDate = new Date(targetDate);
  checkDate.setHours(0, 0, 0, 0);
  
  // First check: Is the date within the class's active period?
  if (checkDate < classStart || checkDate > classEnd) {
    return false;
  }
  
  // Second check: Does the class have a schedule for this day of the week?
  const targetDayName = getDayName(targetDate.getDay());
  const hasScheduleForDay = classItem.schedules.some(schedule => schedule.day === targetDayName);
  
  return hasScheduleForDay;
}

/**
 * Get the schedule for a specific day from a class
 */
export function getScheduleForDay(classItem: ClassScheduleData, dayName: string) {
  return classItem.schedules.find(schedule => schedule.day === dayName);
}

/**
 * Format time display from schedule data
 */
export function formatScheduleTime(schedule: ClassScheduleData['schedules'][0]): { startTime: string; endTime: string | null } {
  let startTime = 'Time not set';
  let endTime: string | null = null;
  
  if (schedule.timeSlot) {
    if (schedule.timeSlot.label) {
      // If there's a label like "Morning" or "9:00 AM - 10:00 AM"
      const timeParts = schedule.timeSlot.label.split(' - ');
      startTime = timeParts[0] || schedule.timeSlot.label;
      endTime = timeParts[1] || null;
    } else if (schedule.timeSlot.startTime && schedule.timeSlot.endTime) {
      // Format individual start and end times
      try {
        const startDate = new Date(`1970-01-01T${schedule.timeSlot.startTime}Z`);
        const endDate = new Date(`1970-01-01T${schedule.timeSlot.endTime}Z`);
        startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        console.error('Error formatting times:', e);
        startTime = schedule.timeSlot.startTime;
        endTime = schedule.timeSlot.endTime;
      }
    }
  } else if (schedule.time && schedule.time !== 'Time not set') {
    // Use the schedule.time if no timeSlot
    const timeParts = schedule.time.split(' - ');
    startTime = timeParts[0] || schedule.time;
    endTime = timeParts[1] || null;
  }
  
  return { startTime, endTime };
}

/**
 * Generate all calendar entries for a class within a date range
 * This is used by the calendar view to show all occurrences
 */
export function generateClassOccurrences(
  classItem: ClassScheduleData, 
  startDate: Date, 
  endDate: Date
): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  
  // Check if class is within the date range at all
  const classStart = new Date(classItem.startDate);
  const classEnd = classItem.endDate ? new Date(classItem.endDate) : new Date('2099-12-31');
  
  // If class period doesn't overlap with requested range, return empty
  if (classEnd < startDate || classStart > endDate) {
    return entries;
  }
  
  // Use the overlap of class period and requested range
  const effectiveStart = new Date(Math.max(classStart.getTime(), startDate.getTime()));
  const effectiveEnd = new Date(Math.min(classEnd.getTime(), endDate.getTime()));
  
  for (const schedule of classItem.schedules) {
    const dayOfWeek = getDayOfWeekNumber(schedule.day);
    const { startTime, endTime } = formatScheduleTime(schedule);
    
    // Generate all occurrences of this schedule in the date range
    const current = new Date(effectiveStart);
    while (current <= effectiveEnd) {
      if (current.getDay() === dayOfWeek) {
        entries.push({
          id: classItem.id,
          name: classItem.name,
          subject: classItem.subject,
          startTime,
          endTime: endTime || undefined,
          room: schedule.room?.name || 'Room not assigned',
          date: current.toISOString(),
          studentCount: classItem.enrollments?.length || 0
        });
      }
      current.setDate(current.getDate() + 1);
    }
  }
  
  return entries;
}

/**
 * Get classes that are active today with full schedule details
 * This is used by the Today's Classes component
 */
export function getTodaysClasses(classes: ClassScheduleData[], today: Date): CalendarEntry[] {
  const todaysClasses: CalendarEntry[] = [];
  
  for (const classItem of classes) {
    if (isClassActiveOnDate(classItem, today)) {
      const todayDayName = getDayName(today.getDay());
      const todaySchedule = getScheduleForDay(classItem, todayDayName);
      
      if (todaySchedule) {
        const { startTime, endTime } = formatScheduleTime(todaySchedule);
        
        todaysClasses.push({
          id: classItem.id,
          name: classItem.name,
          subject: classItem.subject,
          startTime,
          endTime: endTime || undefined,
          room: todaySchedule.room?.name || 'Room not assigned',
          date: today.toISOString(),
          studentCount: classItem.enrollments?.length || 0
        });
      }
    }
  }
  
  // Sort by start time
  return todaysClasses.sort((a, b) => {
    if (a.startTime && b.startTime && a.startTime !== 'Time not set' && b.startTime !== 'Time not set') {
      return a.startTime.localeCompare(b.startTime);
    }
    return 0;
  });
}

/**
 * Debug helper to log class validation details
 */
export function debugClassValidation(classItem: ClassScheduleData, targetDate: Date): void {
  const classStart = new Date(classItem.startDate);
  const classEnd = classItem.endDate ? new Date(classItem.endDate) : null;
  const targetDayName = getDayName(targetDate.getDay());
  const hasScheduleForDay = classItem.schedules.some(s => s.day === targetDayName);
  const isWithinDateRange = isClassActiveOnDate(classItem, targetDate);
  
  console.log('Class date validation:', {
    className: classItem.name,
    classStart: classStart.toISOString().split('T')[0],
    classEnd: classEnd?.toISOString().split('T')[0] || 'No end date',
    targetDate: targetDate.toISOString().split('T')[0],
    targetDayName,
    hasScheduleForDay,
    schedules: classItem.schedules.map(s => ({ day: s.day, time: s.time })),
    isWithinDateRange,
    finalResult: isWithinDateRange
  });
}