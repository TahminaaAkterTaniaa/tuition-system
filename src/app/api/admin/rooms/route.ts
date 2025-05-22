import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET - Fetch all rooms
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin or has appropriate role
    if (!['ADMIN', 'TEACHER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }
    
    // Get all rooms from the database
    const rooms = await prisma.room.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    // Return the rooms (may be an empty array if none exist)
    // This allows the frontend to show a proper empty state
    
    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}

// POST - Create a new room
export async function POST(req: NextRequest) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions);
    console.log('Session in room creation:', session ? 'Authenticated' : 'Not authenticated');
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      console.log('Unauthorized role:', session.user.role);
      return NextResponse.json({ error: 'Only administrators can create rooms' }, { status: 403 });
    }
    
    // Parse the request body
    let body;
    try {
      body = await req.json();
      console.log('Received room creation request:', body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }
    
    const { name, capacity, building, floor, features } = body;
    
    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      );
    }
    
    // Check if a room with the same name already exists (enforce unique names)
    const existingRoom = await prisma.room.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive' // Case-insensitive comparison
        }
      }
    });
    
    if (existingRoom) {
      return NextResponse.json(
        { error: 'A room with this name already exists. Room names must be unique.' },
        { status: 409 } // Use 409 Conflict for duplicate resources
      );
    }
    
    // Prepare room data with proper type handling
    const roomData = {
      name: name.trim(),
      capacity: capacity ? Number(capacity) : null,
      building: building || '',
      floor: floor || '',
      features: features || ''
    };
    
    console.log('Creating room with data:', roomData);
    
    // Create the room in the database
    const newRoom = await prisma.room.create({
      data: roomData
    });
    
    console.log('Room created successfully:', newRoom);
    
    // Log this activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          description: `Admin created a new room: ${name}`,
          entityType: 'ROOM',
          entityId: newRoom.id,
        },
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Error logging activity:', logError);
    }
    
    // Return success response
    return NextResponse.json(newRoom, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    
    // Detailed error handling
    let errorMessage = 'Failed to create room';
    let statusCode = 500;
    
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('Unique constraint failed')) {
        errorMessage = 'A room with this name already exists';
        statusCode = 400;
      } else if (error.message.includes('database')) {
        errorMessage = 'Database connection error. Please try again later.';
      } else {
        // Include the actual error message for debugging
        errorMessage = `Failed to create room: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// PUT - Update a room
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update rooms' }, { status: 403 });
    }
    
    const body = await req.json();
    const { id, name, capacity, building, floor, features } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      );
    }
    
    // Update the room
    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        name,
        capacity: capacity ? parseInt(capacity) : null,
        building,
        floor,
        features
      },
    });
    
    // Log this activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        description: `Admin updated room: ${name}`,
        entityType: 'ROOM',
        entityId: id,
      },
    });
    
    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a room
export async function DELETE(req: NextRequest) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions);
    console.log('Session in room deletion:', session ? 'Authenticated' : 'Not authenticated');
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      console.log('Unauthorized role:', session.user.role);
      return NextResponse.json({ error: 'Only administrators can delete rooms' }, { status: 403 });
    }
    
    // Get the room ID from the query parameters
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    console.log('Received delete request for room ID:', id);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Room ID is required for deletion' },
        { status: 400 }
      );
    }
    
    // First check if the room exists
    const roomExists = await prisma.room.findUnique({
      where: { id },
      select: { id: true, name: true }
    });
    
    if (!roomExists) {
      console.log('Room not found for deletion:', id);
      return NextResponse.json(
        { error: 'Room not found. It may have been already deleted.' },
        { status: 404 }
      );
    }
    
    // Check if the room is in use by any classes
    const classesUsingRoom = await prisma.classSchedule.findMany({
      where: { roomId: id },
      select: { id: true },
      take: 1 // We only need to know if there's at least one
    });
    
    if (classesUsingRoom.length > 0) {
      console.log('Room in use, cannot delete:', id);
      return NextResponse.json(
        { error: 'This room cannot be deleted because it is currently in use by one or more classes.' },
        { status: 400 }
      );
    }
    
    // Delete the room
    const deletedRoom = await prisma.room.delete({
      where: { id }
    });
    
    console.log('Room deleted successfully:', deletedRoom);
    
    // Log this activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'DELETE',
          description: `Admin deleted room: ${deletedRoom.name}`,
          entityType: 'ROOM',
          entityId: id,
        },
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Error logging deletion activity:', logError);
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Room "${deletedRoom.name}" deleted successfully`,
      id: deletedRoom.id
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    
    let errorMessage = 'Failed to delete room';
    let statusCode = 500;
    
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('Foreign key constraint') || 
          error.message.includes('is still referenced')) {
        errorMessage = 'This room cannot be deleted because it is currently in use.';
        statusCode = 400;
      } else if (error.message.includes('Record to delete does not exist')) {
        errorMessage = 'Room not found. It may have been already deleted.';
        statusCode = 404;
      } else if (error.message.includes('database')) {
        errorMessage = 'Database connection error. Please try again later.';
      } else {
        // Include the actual error message for debugging
        errorMessage = `Failed to delete room: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
