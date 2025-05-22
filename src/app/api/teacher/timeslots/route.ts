import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

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

// GET - Fetch all time slots (accessible to teachers)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is a teacher or admin
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Get all time slots from the database
    const timeSlots = await prisma.timeSlot.findMany({
      orderBy: {
        startTime: 'asc'
      }
    });
    
    // Return the time slots (may be an empty array if none exist)
    return NextResponse.json(timeSlots);
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time slots' },
      { status: 500 }
    );
  }
}
