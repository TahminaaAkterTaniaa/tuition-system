/**
 * Migration: Reset Classes for Scheduling
 * 
 * This script updates all existing class records to comply with the new class scheduling structure
 * that uses standardized fields for rooms, time slots, and days.
 * 
 * It performs the following actions:
 * 1. Creates default rooms and time slots if none exist
 * 2. Migrates existing class schedules to use the new structure
 * 3. Updates legacy fields to maintain backward compatibility
 * 4. Removes any invalid or conflicting schedule entries
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { exit } from 'process';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Default time slots to create if none exist
const DEFAULT_TIME_SLOTS = [
  { startTime: '08:00', endTime: '09:30', label: '8:00 AM - 9:30 AM' },
  { startTime: '09:30', endTime: '11:00', label: '9:30 AM - 11:00 AM' },
  { startTime: '11:00', endTime: '12:30', label: '11:00 AM - 12:30 PM' },
  { startTime: '12:30', endTime: '14:00', label: '12:30 PM - 2:00 PM' },
  { startTime: '14:00', endTime: '15:30', label: '2:00 PM - 3:30 PM' },
  { startTime: '15:30', endTime: '17:00', label: '3:30 PM - 5:00 PM' },
  { startTime: '17:00', endTime: '18:30', label: '5:00 PM - 6:30 PM' },
];

// Default rooms to create if none exist
const DEFAULT_ROOMS = [
  { name: 'Room 101', capacity: 30, building: 'Main Building', floor: '1' },
  { name: 'Room 102', capacity: 25, building: 'Main Building', floor: '1' },
  { name: 'Room 103', capacity: 35, building: 'Main Building', floor: '1' },
  { name: 'Room 201', capacity: 30, building: 'Main Building', floor: '2' },
  { name: 'Room 202', capacity: 25, building: 'Main Building', floor: '2' },
  { name: 'Lab 1', capacity: 20, building: 'Science Wing', floor: '1' },
  { name: 'Computer Lab', capacity: 30, building: 'Technology Wing', floor: '1' },
  { name: 'Library', capacity: 50, building: 'Main Building', floor: '1' },
];

// Day format mapping for normalization
const DAY_FORMAT_MAP: Record<string, string> = {
  'monday': 'Monday', 'Monday': 'Monday', 'mon': 'Monday', 'Mon': 'Monday', 'MONDAY': 'Monday',
  'tuesday': 'Tuesday', 'Tuesday': 'Tuesday', 'tue': 'Tuesday', 'Tue': 'Tuesday', 'TUESDAY': 'Tuesday',
  'wednesday': 'Wednesday', 'Wednesday': 'Wednesday', 'wed': 'Wednesday', 'Wed': 'Wednesday', 'WEDNESDAY': 'Wednesday',
  'thursday': 'Thursday', 'Thursday': 'Thursday', 'thu': 'Thursday', 'Thu': 'Thursday', 'THURSDAY': 'Thursday',
  'friday': 'Friday', 'Friday': 'Friday', 'fri': 'Friday', 'Fri': 'Friday', 'FRIDAY': 'Friday',
  'saturday': 'Saturday', 'Saturday': 'Saturday', 'sat': 'Saturday', 'Sat': 'Saturday', 'SATURDAY': 'Saturday',
  'sunday': 'Sunday', 'Sunday': 'Sunday', 'sun': 'Sunday', 'Sun': 'Sunday', 'SUNDAY': 'Sunday',
};

// Time format mapping for normalization
const TIME_FORMAT_MAP: Record<string, string> = {
  // Handle various time formats that might be in the database
  '8:00 AM': '08:00', '8:00': '08:00', '08:00': '08:00', '08:00 AM': '08:00', '8:00AM': '08:00', '08:00AM': '08:00',
  '9:00 AM': '09:00', '9:00': '09:00', '09:00': '09:00', '09:00 AM': '09:00', '9:00AM': '09:00', '09:00AM': '09:00',
  '9:30 AM': '09:30', '9:30': '09:30', '09:30': '09:30', '09:30 AM': '09:30', '9:30AM': '09:30', '09:30AM': '09:30',
  '10:00 AM': '10:00', '10:00': '10:00', '10:00AM': '10:00',
  '11:00 AM': '11:00', '11:00': '11:00', '11:00AM': '11:00',
  '12:00 PM': '12:00', '12:00': '12:00', '12:00PM': '12:00',
  '12:30 PM': '12:30', '12:30': '12:30', '12:30PM': '12:30',
  '1:00 PM': '13:00', '1:00': '13:00', '13:00': '13:00', '01:00 PM': '13:00', '1:00PM': '13:00', '13:00PM': '13:00',
  '2:00 PM': '14:00', '2:00': '14:00', '14:00': '14:00', '02:00 PM': '14:00', '2:00PM': '14:00', '14:00PM': '14:00',
  '3:00 PM': '15:00', '3:00': '15:00', '15:00': '15:00', '03:00 PM': '15:00', '3:00PM': '15:00', '15:00PM': '15:00',
  '3:30 PM': '15:30', '3:30': '15:30', '15:30': '15:30', '03:30 PM': '15:30', '3:30PM': '15:30', '15:30PM': '15:30',
  '4:00 PM': '16:00', '4:00': '16:00', '16:00': '16:00', '04:00 PM': '16:00', '4:00PM': '16:00', '16:00PM': '16:00',
  '5:00 PM': '17:00', '5:00': '17:00', '17:00': '17:00', '05:00 PM': '17:00', '5:00PM': '17:00', '17:00PM': '17:00',
};

// Function to normalize schedule strings from the database
function normalizeSchedule(schedule: string | null): { day: string, time: string }[] {
  if (!schedule) return [];
  
  const results: { day: string, time: string }[] = [];
  
  // Special case for schedule formats like "Monday & Wednesday, 1:00 PM"
  // where multiple days share the same time
  if (schedule.includes('&') || schedule.toLowerCase().includes(' and ')) {
    // First, try to extract the time that applies to all days
    const timeMatch = schedule.match(/(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i);
    const time = timeMatch ? timeMatch[1] : '';
    
    if (!time) return results;
    
    // Then extract the days
    const daysParts = schedule.split(',');
    if (daysParts.length === 0) return results;
    
    const daysPart = daysParts[0] || '';
    const days = daysPart.split(/\s*(?:&|and)\s*/i);
    
    for (const day of days) {
      const trimmedDay = day.trim();
      const trimmedTime = time.trim();
      const normalizedDay = DAY_FORMAT_MAP[trimmedDay] || trimmedDay;
      const normalizedTime = TIME_FORMAT_MAP[trimmedTime] || trimmedTime;
      
      if (normalizedDay && normalizedTime) {
        results.push({ day: normalizedDay, time: normalizedTime });
      }
    }
    
    return results;
  }
  
  // Handle standard format like "Monday at 1:00 PM"
  const entries = schedule.split(',');
  
  for (const entry of entries) {
    const parts = entry.split(/\s+at\s+/i);
    
    if (parts.length === 2) {
      const day = parts[0].trim();
      const time = parts[1].trim();
      
      const normalizedDay = DAY_FORMAT_MAP[day] || day;
      const normalizedTime = TIME_FORMAT_MAP[time] || time;
      
      if (normalizedDay && normalizedTime) {
        results.push({ day: normalizedDay, time: normalizedTime });
      }
    }
  }
  
  return results;
}

// Function to find the closest matching time slot
async function findClosestTimeSlot(time: string, timeSlots: any[]): Promise<string | null> {
  // Normalize the time to 24-hour format for comparison
  const normalizedTime = TIME_FORMAT_MAP[time] || time;
  
  if (!normalizedTime) return null;
  
  // Try to find an exact match first
  const exactMatch = timeSlots.find(slot => 
    slot.startTime === normalizedTime || 
    TIME_FORMAT_MAP[slot.startTime] === normalizedTime
  );
  
  if (exactMatch) return exactMatch.id;
  
  // If no exact match, find the closest time slot
  let closestSlot = null;
  let minDifference = Infinity;
  
  // Convert time strings to minutes for comparison
  const timeToMinutes = (timeStr: string) => {
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  };
  
  const targetMinutes = timeToMinutes(normalizedTime);
  
  for (const slot of timeSlots) {
    const slotMinutes = timeToMinutes(slot.startTime);
    const difference = Math.abs(slotMinutes - targetMinutes);
    
    if (difference < minDifference) {
      minDifference = difference;
      closestSlot = slot;
    }
  }
  
  // Only use the closest slot if it's within 30 minutes
  return minDifference <= 30 ? closestSlot?.id : null;
}

// Function to find the closest matching room
async function findClosestRoom(roomName: string | null, rooms: any[]): Promise<string | null> {
  if (!roomName) return null;
  
  // Try to find an exact match first
  const exactMatch = rooms.find(room => 
    room.name.toLowerCase() === roomName.toLowerCase()
  );
  
  if (exactMatch) return exactMatch.id;
  
  // If no exact match, find a room that contains the name
  const partialMatch = rooms.find(room => 
    room.name.toLowerCase().includes(roomName.toLowerCase()) ||
    roomName.toLowerCase().includes(room.name.toLowerCase())
  );
  
  return partialMatch ? partialMatch.id : null;
}

// Main migration function
async function migrateClasses() {
  console.log('Starting class migration for new scheduling structure...');
  
  try {
    // Step 1: Ensure we have time slots
    // @ts-ignore - TimeSlot model exists in schema but TypeScript doesn't recognize it yet
    let timeSlots = await prisma.timeSlot.findMany();
    
    if (timeSlots.length === 0) {
      console.log('Creating default time slots...');
      
      for (const slot of DEFAULT_TIME_SLOTS) {
        // @ts-ignore - TimeSlot model exists in schema but TypeScript doesn't recognize it yet
        await prisma.timeSlot.create({
          data: slot
        });
      }
      
      // @ts-ignore - TimeSlot model exists in schema but TypeScript doesn't recognize it yet
      timeSlots = await prisma.timeSlot.findMany();
    }
    
    // Step 2: Ensure we have rooms
    // @ts-ignore - Room model exists in schema but TypeScript doesn't recognize it yet
    let rooms = await prisma.room.findMany();
    
    if (rooms.length === 0) {
      console.log('Creating default rooms...');
      
      for (const room of DEFAULT_ROOMS) {
        // @ts-ignore - Room model exists in schema but TypeScript doesn't recognize it yet
        await prisma.room.create({
          data: room
        });
      }
      
      // @ts-ignore - Room model exists in schema but TypeScript doesn't recognize it yet
      rooms = await prisma.room.findMany();
    }
    
    // Step 3: Get all classes with their schedules
    const classes = await prisma.class.findMany();
    
    // Get existing schedules for all classes
    // @ts-ignore - ClassSchedule model exists in schema but TypeScript doesn't recognize it yet
    const classSchedules = await prisma.classSchedule.findMany({
      where: {
        classId: {
          in: classes.map(c => c.id)
        }
      }
    });
    
    // Group schedules by class ID for easier access
    const schedulesByClass = classSchedules.reduce<Record<string, typeof classSchedules>>((acc: Record<string, typeof classSchedules>, schedule: any) => {
      if (!acc[schedule.classId]) {
        acc[schedule.classId] = [];
      }
      acc[schedule.classId].push(schedule);
      return acc;
    }, {});
    
    console.log(`Found ${classes.length} classes to migrate...`);
    
    // Step 4: Process each class
    for (const cls of classes) {
      console.log(`Migrating class: ${cls.name} (ID: ${cls.id})`);
      
      // Delete existing schedules
      const existingSchedules = schedulesByClass[cls.id] || [];
      if (existingSchedules.length > 0) {
        console.log(`  Removing ${existingSchedules.length} existing schedule entries...`);
        
        // @ts-ignore - ClassSchedule model exists in schema but TypeScript doesn't recognize it yet
        await prisma.classSchedule.deleteMany({
          where: {
            classId: cls.id
          }
        });
      }
      
      // Parse the legacy schedule field
      const scheduleEntries = normalizeSchedule(cls.schedule);
      
      if (scheduleEntries.length === 0) {
        console.log(`  No valid schedule found for class ${cls.name}, creating a default entry...`);
        
        // Create a default schedule entry for Monday at the first available time slot
        if (timeSlots.length > 0) {
          scheduleEntries.push({
            day: 'Monday',
            time: timeSlots[0].startTime
          });
        }
      }
      
      // Create new schedule entries
      for (const entry of scheduleEntries) {
        const timeSlotId = await findClosestTimeSlot(entry.time, timeSlots);
        const roomId = await findClosestRoom(cls.room, rooms);
        
        if (!timeSlotId) {
          console.log(`  Warning: Could not find a matching time slot for ${entry.time}`);
          continue;
        }
        
        console.log(`  Creating schedule: ${entry.day} at ${entry.time} in room ${roomId ? rooms.find((r: any) => r.id === roomId)?.name : 'unassigned'}`);
        
        // @ts-ignore - ClassSchedule model exists in schema but TypeScript doesn't recognize it yet
        await prisma.classSchedule.create({
          data: {
            classId: cls.id,
            day: entry.day,
            time: entry.time, // Keep legacy time field for backward compatibility
            // @ts-ignore - These fields exist in the schema but TypeScript doesn't recognize them yet
            timeSlotId,
            // @ts-ignore - These fields exist in the schema but TypeScript doesn't recognize them yet
            roomId
          }
        });
      }
      
      // Update the legacy schedule field for backward compatibility
      const formattedSchedule = scheduleEntries
        .map(entry => `${entry.day} at ${entry.time}`)
        .join(', ');
      
      await prisma.class.update({
        where: {
          id: cls.id
        },
        data: {
          schedule: formattedSchedule
        }
      });
      
      console.log(`  Migration complete for class: ${cls.name}`);
    }
    
    console.log('Class migration completed successfully!');
    
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Create a readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Display warning and confirmation prompt
console.log('\x1b[33m%s\x1b[0m', '⚠️  WARNING: This script will modify all existing class records to match the new scheduling structure.');
console.log('\x1b[33m%s\x1b[0m', '⚠️  It will create default rooms and time slots if none exist.');
console.log('\x1b[33m%s\x1b[0m', '⚠️  All existing class schedules will be updated to use the new structure.');
console.log('\x1b[33m%s\x1b[0m', '⚠️  This operation cannot be undone.');
console.log('\x1b[33m%s\x1b[0m', '');

rl.question('\x1b[1m\x1b[36mDo you want to proceed with the migration? (yes/no): \x1b[0m', async (answer) => {
  if (answer.toLowerCase() === 'yes') {
    try {
      console.log('\x1b[32m%s\x1b[0m', 'Starting migration...');
      await migrateClasses();
      console.log('\x1b[32m%s\x1b[0m', '✅ Migration completed successfully!');
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', '❌ Migration failed:', error);
    } finally {
      await prisma.$disconnect();
      rl.close();
    }
  } else {
    console.log('\x1b[31m%s\x1b[0m', 'Migration cancelled.');
    rl.close();
    exit(0);
  }
});
