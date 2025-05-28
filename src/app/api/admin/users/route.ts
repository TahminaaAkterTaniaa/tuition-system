import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { createActivityLog } from '@/app/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Fetch all users with selected fields
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        // Get status from a different field or default to true if not available
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Transform the data to include isActive property
    const transformedUsers = users.map(user => ({
      ...user,
      isActive: true, // Default to true or check another field if available
    }));
    
    // Log this activity
    await createActivityLog(
      session.user.id,
      'VIEW',
      'Viewed all users',
      'USER',
      '', // No specific entity ID for viewing all users
    );
    
    return NextResponse.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
