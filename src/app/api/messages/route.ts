import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { Server as SocketIOServer } from 'socket.io';

// Global variable to store the Socket.IO server instance
let io: SocketIOServer | null = null;

// GET - Fetch messages for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'received';
    
    let messages;
    
    if (type === 'received') {
      messages = await prisma.message.findMany({
        where: {
          receiverId: userId,
        },
        include: {
          sender: {
            select: {
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else {
      messages = await prisma.message.findMany({
        where: {
          senderId: userId,
        },
        include: {
          receiver: {
            select: {
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }
    
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST - Send a new message
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { receiverId, subject, content } = body;
    
    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'Receiver ID and content are required' },
        { status: 400 }
      );
    }
    
    // Verify that the receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });
    
    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      );
    }
    
    // Create the message
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        subject,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });
    
    // Log activity for the teacher
    if (session.user.role === 'TEACHER') {
      try {
        // Use a try-catch block to handle the case where ActivityLog model might not be available yet
        // @ts-ignore - Prisma client will be updated at runtime
        await prisma.activityLog.create({
          data: {
            userId: session.user.id,
            action: 'SEND_MESSAGE',
            description: `You sent a message to ${receiver.name || receiver.email}`,
            entityType: 'MESSAGE',
            entityId: message.id,
            metadata: JSON.stringify({
              messageId: message.id,
              subject: subject || 'No subject',
              receiverId: receiverId,
              receiverName: receiver.name || receiver.email,
            }),
          },
        });
      } catch (error) {
        console.error('Error logging activity:', error);
        // Continue even if logging fails
      }
    }
    
    // Emit the new message event to connected clients
    // This will be handled on the client side
    const messageData = {
      ...message,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json({ success: true, message: messageData });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
