import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

/**
 * Converts a time string (HH:MM) to minutes since midnight for easy comparison
 * @param timeString Time in 24-hour format (HH:MM)
 * @returns Total minutes since midnight
 */
function convertTimeStringToMinutes(timeString: string): number {
  const parts = timeString.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return (hours * 60) + minutes;
}

/**
 * Formats a time string for display in 12-hour format with AM/PM
 * @param timeString Time in 24-hour format (HH:MM)
 * @returns Formatted time string (e.g., "9:00 AM")
 */
function formatTimeForDisplay(timeString: string): string {
  const parts = timeString.split(':');
  const hoursStr = parts[0] || '0';
  const minutesStr = parts[1] || '00';
  
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// GET - Fetch all time slots
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can access this endpoint' }, { status: 403 });
    }
    
    // Get all time slots from the database
    const timeSlots = await prisma.timeSlot.findMany({
      orderBy: {
        startTime: 'asc'
      }
    });
    
    // Return the time slots (may be an empty array if none exist)
    // This allows the frontend to show a proper empty state
    
    return NextResponse.json(timeSlots);
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time slots' },
      { status: 500 }
    );
  }
}

// POST - Create a new time slot
export async function POST(req: NextRequest) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions);
    console.log('Session in time slot creation:', session ? 'Authenticated' : 'Not authenticated');
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      console.log('Unauthorized role:', session.user.role);
      return NextResponse.json({ error: 'Only administrators can create time slots' }, { status: 403 });
    }
    
    // Parse the request body
    let body;
    try {
      body = await req.json();
      console.log('Received time slot creation request:', body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }
    
    const { startTime, endTime, label } = body;
    
    // Validate required fields
    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'Start time and end time are required' },
        { status: 400 }
      );
    }
    
    // Generate a label if not provided
    const timeSlotLabel = label || `${startTime} - ${endTime}`;
    
    // Check if a time slot with the same label already exists (enforce unique labels)
    const existingTimeSlotWithSameLabel = await prisma.timeSlot.findFirst({
      where: {
        label: {
          equals: timeSlotLabel,
          mode: 'insensitive' // Case-insensitive comparison
        }
      }
    });
    
    if (existingTimeSlotWithSameLabel) {
      return NextResponse.json(
        { error: 'A time slot with this label already exists. Time slot labels must be unique.' },
        { status: 409 } // Use 409 Conflict for duplicate resources
      );
    }
    
    // Check for overlapping time slots (not just exact matches but overlapping ranges)
    // Convert input times to Date objects for comparison
    const newStartTime = convertTimeStringToMinutes(startTime);
    const newEndTime = convertTimeStringToMinutes(endTime);
    
    if (newStartTime >= newEndTime) {
      return NextResponse.json(
        { error: 'End time must be after start time.' },
        { status: 400 }
      );
    }
    
    // Find any time slots that overlap with the new one
    const existingTimeSlots = await prisma.timeSlot.findMany();
    
    // Check for overlaps
    for (const slot of existingTimeSlots) {
      const existingStartTime = convertTimeStringToMinutes(slot.startTime);
      const existingEndTime = convertTimeStringToMinutes(slot.endTime);
      
      // Check if there's an overlap
      // Overlap occurs when:
      // 1. New start time is between existing start and end time
      // 2. New end time is between existing start and end time
      // 3. New slot completely contains the existing slot
      const hasOverlap = 
        (newStartTime >= existingStartTime && newStartTime < existingEndTime) || // New start is within existing slot
        (newEndTime > existingStartTime && newEndTime <= existingEndTime) ||     // New end is within existing slot
        (newStartTime <= existingStartTime && newEndTime >= existingEndTime);    // New slot contains existing slot
      
      if (hasOverlap) {
        // Format times for display in error message
        const existingStartFormatted = formatTimeForDisplay(slot.startTime);
        const existingEndFormatted = formatTimeForDisplay(slot.endTime);
        
        return NextResponse.json({
          error: `Time slot overlaps with an existing one (${existingStartFormatted} – ${existingEndFormatted}).`,
          conflictingSlot: {
            id: slot.id,
            label: slot.label,
            startTime: slot.startTime,
            endTime: slot.endTime
          }
        }, { status: 409 }); // Use 409 Conflict for overlapping resources
      }
    }
    
    // Create a new time slot
    const newTimeSlot = await prisma.timeSlot.create({
      data: {
        startTime,
        endTime,
        label: timeSlotLabel,
      },
    });
    
    console.log('Time slot created successfully:', newTimeSlot);
    
    // Log this activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          description: `Admin created a new time slot: ${newTimeSlot.label}`,
          entityType: 'TIME_SLOT',
          entityId: newTimeSlot.id,
        },
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Error logging activity:', logError);
    }
    
    return NextResponse.json(newTimeSlot, { status: 201 });
  } catch (error) {
    console.error('Error creating time slot:', error);
    
    // Detailed error handling
    let errorMessage = 'Failed to create time slot';
    let statusCode = 500;
    
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('Unique constraint failed')) {
        errorMessage = 'A time slot with this label already exists';
        statusCode = 400;
      } else if (error.message.includes('database')) {
        errorMessage = 'Database connection error. Please try again later.';
      } else {
        // Include the actual error message for debugging
        errorMessage = `Failed to create time slot: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// DELETE - Delete a time slot
export async function DELETE(req: NextRequest) {
  // Create a more reliable timeout mechanism
  const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
    let timeoutId: NodeJS.Timeout | undefined;
    
    // Create a promise that rejects after the specified timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    });
    
    try {
      // Race the original promise against the timeout
      const result = await Promise.race([promise, timeoutPromise]) as T;
      if (timeoutId) clearTimeout(timeoutId); // Clear the timeout if the promise resolves
      return result;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId); // Clear the timeout if the promise rejects
      throw error;
    }
  };

  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions);
    console.log('Session in time slot deletion:', session ? 'Authenticated' : 'Not authenticated');
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      console.log('Unauthorized role for deletion:', session.user.role);
      return NextResponse.json({ error: 'Only administrators can delete time slots' }, { status: 403 });
    }
    
    // Extract the time slot ID from the URL
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    console.log('Attempting to delete time slot with ID:', id);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Time slot ID is required for deletion' },
        { status: 400 }
      );
    }
    
    // Verify database connection before proceeding
    try {
      // Test database connection with a simple query
      await withTimeout(
        prisma.$queryRaw`SELECT 1`,
        5000, // 5 second timeout
        'Database connection test timed out'
      );
      console.log('Database connection verified');
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      return NextResponse.json(
        { error: 'Database connection error. Please try again later.' },
        { status: 503 } // Service Unavailable
      );
    }
    
    // Check if the time slot exists with a timeout
    let timeSlot: { id: string; label: string; startTime: string; endTime: string } | null;
    try {
      timeSlot = await withTimeout(
        prisma.timeSlot.findUnique({
          where: { id }
        }),
        8000, // 8 second timeout
        'Finding time slot operation timed out'
      );
    } catch (findError) {
      console.error('Error finding time slot:', findError);
      return NextResponse.json(
        { error: 'Database operation timed out. Please try again later.' },
        { status: 503 } // Service Unavailable
      );
    }
    
    if (!timeSlot) {
      console.log('Time slot not found for deletion:', id);
      return NextResponse.json(
        { error: 'Time slot not found. It may have been already deleted.' },
        { status: 404 }
      );
    }
    
    console.log('Time slot found:', timeSlot.label);
    
    // Check if any class schedules are using this time slot - use a more efficient query
    let scheduleCount = 0;
    try {
      // First, just check if any class schedules exist (count only)
      scheduleCount = await withTimeout(
        prisma.classSchedule.count({
          where: {
            timeSlotId: id
          }
        }),
        8000, // 8 second timeout
        'Counting class schedules operation timed out'
      );
      
      console.log(`Found ${scheduleCount} class schedules using this time slot`);
      
      // If schedules exist, we need to check if we can delete
      if (scheduleCount > 0) {
        // Only if schedules exist, get the class details (more efficient query)
        type ClassSchedule = {
          class: {
            id: string;
            name: string;
          } | null;
        };
        
        // Get just the first few classes using this time slot (limit the query)
        const classSchedulesUsingTimeSlot: ClassSchedule[] = await withTimeout(
          prisma.classSchedule.findMany({
            where: {
              timeSlotId: id
            },
            include: {
              class: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            take: 5 // Limit to 5 classes for better performance
          }),
          10000, // 10 second timeout
          'Finding class schedules operation timed out'
        );
        
        // Extract the classes from the schedules
        const classesUsingTimeSlot = classSchedulesUsingTimeSlot
          .map((schedule: ClassSchedule) => schedule.class)
          .filter((class_: any): class_ is { id: string; name: string } => class_ !== null);
        
        console.log('Sample of classes using time slot:', classesUsingTimeSlot.length);
        
        // Check if the time slot is being used by any classes
        if (classesUsingTimeSlot.length > 0) {
          const classNames = classesUsingTimeSlot.map((c: { name: string }) => c.name).join(', ');
          const additionalMessage = scheduleCount > classesUsingTimeSlot.length ? 
            ` and ${scheduleCount - classesUsingTimeSlot.length} more` : '';
            
          console.log('Cannot delete time slot - in use by classes:', classNames + additionalMessage);
          return NextResponse.json(
            { 
              error: 'Cannot delete time slot that is in use by classes', 
              message: `This time slot is currently used by the following classes: ${classNames}${additionalMessage}. Please reassign these classes to different time slots first.`
            },
            { status: 409 } // Conflict
          );
        }
      }
    } catch (scheduleError) {
      console.error('Error checking class schedules:', scheduleError);
      return NextResponse.json(
        { error: 'Database operation timed out while checking class schedules. Please try again later.' },
        { status: 503 } // Service Unavailable
      );
    }
    
    // Delete the time slot with a timeout
    try {
      await withTimeout(
        prisma.timeSlot.delete({
          where: { id }
        }),
        10000, // 10 second timeout
        'Deleting time slot operation timed out'
      );
      console.log('Time slot deleted successfully:', timeSlot.label);
      
      // Log this activity
      try {
        await prisma.activityLog.create({
          data: {
            userId: session.user.id,
            action: 'DELETE',
            description: `Admin deleted time slot: ${timeSlot.label}`,
            entityType: 'TIME_SLOT',
            entityId: id,
          },
        });
      } catch (logError) {
        // Don't fail the request if logging fails
        console.error('Error logging time slot deletion activity:', logError);
      }
      
      return NextResponse.json({ 
        success: true,
        message: `Time slot "${timeSlot.label}" was successfully deleted`
      });
    } catch (deleteError) {
      console.error('Error deleting time slot:', deleteError);
      
      if (deleteError instanceof Error && deleteError.message === 'Database operation timed out') {
        return NextResponse.json(
          { error: 'Database operation timed out while deleting. Please try again later.' },
          { status: 503 } // Service Unavailable
        );
      }
      
      throw deleteError; // Re-throw for the outer catch block to handle
    }
  } catch (error) {
    console.error('Error deleting time slot:', error);
    
    // Detailed error handling
    let errorMessage = 'Failed to delete time slot';
    let statusCode = 500;
    
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('foreign key constraint')) {
        errorMessage = 'This time slot cannot be deleted because it is in use by one or more classes';
        statusCode = 409; // Conflict
      } else if (error.message.includes('Record to delete does not exist')) {
        errorMessage = 'Time slot not found. It may have been already deleted.';
        statusCode = 404;
      } else if (error.message.includes('database') || error.message.includes('connection') || error.message.includes('timeout')) {
        errorMessage = 'Database connection error. Please try again later.';
        statusCode = 503; // Service Unavailable
      } else {
        // Include the actual error message for debugging
        errorMessage = `Failed to delete time slot: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
