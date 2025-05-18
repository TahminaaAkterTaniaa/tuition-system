import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest } from 'next';
import { NextApiResponse } from 'next';

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

export const initSocketServer = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io server...');
    
    // Create a new Socket.io server
    const io = new SocketIOServer(res.socket.server);
    
    // Store the Socket.io server instance
    res.socket.server.io = io;
    
    // Set up event handlers
    io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Join user-specific room for private messages
      socket.on('join-user', (userId: string) => {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} joined their room`);
      });
      
      // Handle new messages
      socket.on('send-message', (message: any) => {
        // Broadcast to sender and receiver rooms
        io.to(`user-${message.senderId}`).to(`user-${message.receiverId}`).emit('new-message', message);
      });
      
      // Handle read receipts
      socket.on('mark-read', (data: { messageId: string, userId: string }) => {
        io.to(`user-${data.userId}`).emit('message-read', data.messageId);
      });
      
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
  
  return res.socket.server.io;
};
