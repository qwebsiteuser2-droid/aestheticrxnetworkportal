import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { Notification } from '../models/Notification';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

// Track online users: Map<userId, Set<socketId>>
const onlineUsers = new Map<string, Set<string>>();

export function initializeSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string };
      
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    
    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log(`🔌 User connected: ${userId} (socket: ${socket.id})`);

    // Track user online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Update user online status in database
    await updateUserOnlineStatus(userId, true);

    // Broadcast user online to relevant users
    broadcastPresenceUpdate(io, userId, true);

    // Join user's personal room for direct notifications
    socket.join(`user:${userId}`);

    // Handle joining conversation rooms
    socket.on('join_conversation', async (conversationId: string) => {
      try {
        // Verify user is part of this conversation
        const conversationRepository = AppDataSource.getRepository(Conversation);
        const conversation = await conversationRepository.findOne({
          where: [
            { id: conversationId, doctor_id: userId },
            { id: conversationId, user_id: userId },
          ],
        });

        if (conversation) {
          socket.join(`conversation:${conversationId}`);
          console.log(`👥 User ${userId} joined conversation ${conversationId}`);
        }
      } catch (error) {
        console.error('Error joining conversation:', error);
      }
    });

    // Handle leaving conversation rooms
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`👋 User ${userId} left conversation ${conversationId}`);
    });

    // Handle sending messages
    socket.on('send_message', async (data: { conversationId: string; content: string; messageType?: string }) => {
      try {
        const { conversationId, content, messageType = 'text' } = data;

        if (!content || content.trim().length === 0) {
          socket.emit('error', { message: 'Message content is required' });
          return;
        }

        const conversationRepository = AppDataSource.getRepository(Conversation);
        const messageRepository = AppDataSource.getRepository(Message);

        // Verify user is part of this conversation
        const conversation = await conversationRepository.findOne({
          where: [
            { id: conversationId, doctor_id: userId },
            { id: conversationId, user_id: userId },
          ],
          relations: ['doctor', 'user'],
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        // Create message
        const message = messageRepository.create({
          conversation_id: conversationId,
          sender_id: userId,
          content: content.trim(),
          message_type: messageType as any,
        });

        await messageRepository.save(message);

        // Update conversation
        const isDoctor = conversation.doctor_id === userId;
        await conversationRepository.update(conversationId, {
          last_message_at: new Date(),
          ...(isDoctor
            ? { user_unread_count: () => 'user_unread_count + 1' }
            : { doctor_unread_count: () => 'doctor_unread_count + 1' }),
        });

        // Reload message with sender
        const savedMessage = await messageRepository.findOne({
          where: { id: message.id },
          relations: ['sender'],
        });

        // Emit to conversation room
        io.to(`conversation:${conversationId}`).emit('new_message', {
          message: savedMessage?.toPublicJSON(),
          conversationId,
        });

        // Send notification to other user
        const recipientId = isDoctor ? conversation.user_id : conversation.doctor_id;
        const sender = isDoctor ? conversation.doctor : conversation.user;

        // Create notification
        const notificationRepository = AppDataSource.getRepository(Notification);
        const notification = notificationRepository.create({
          recipient_id: recipientId,
          type: 'admin_alert',
          payload: {
            title: 'New Message',
            message: `${sender?.doctor_name || 'Someone'}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
            conversation_id: conversationId,
            message_id: message.id,
            sender_id: userId,
            sender_name: sender?.doctor_name,
          },
        });
        await notificationRepository.save(notification);

        // Emit notification to recipient
        io.to(`user:${recipientId}`).emit('new_notification', {
          id: notification.id,
          type: 'new_message',
          title: 'New Message',
          message: `${sender?.doctor_name || 'Someone'}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
          conversationId,
          senderId: userId,
          senderName: sender?.doctor_name,
          createdAt: new Date().toISOString(),
        });

      } catch (error) {
        console.error('Error sending message via socket:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
        userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      });
    });

    // Handle message read
    socket.on('mark_read', async (data: { conversationId: string }) => {
      try {
        const { conversationId } = data;
        const conversationRepository = AppDataSource.getRepository(Conversation);
        const messageRepository = AppDataSource.getRepository(Message);

        const conversation = await conversationRepository.findOne({
          where: [
            { id: conversationId, doctor_id: userId },
            { id: conversationId, user_id: userId },
          ],
        });

        if (!conversation) return;

        const isDoctor = conversation.doctor_id === userId;
        const otherUserId = isDoctor ? conversation.user_id : conversation.doctor_id;

        // Mark messages as read
        await messageRepository.update(
          { conversation_id: conversationId, sender_id: otherUserId, is_read: false },
          { is_read: true, read_at: new Date() }
        );

        // Reset unread count
        if (isDoctor) {
          await conversationRepository.update(conversationId, { doctor_unread_count: 0 });
        } else {
          await conversationRepository.update(conversationId, { user_unread_count: 0 });
        }

        // Notify the other user that messages were read
        io.to(`conversation:${conversationId}`).emit('messages_read', {
          conversationId,
          readBy: userId,
          readAt: new Date().toISOString(),
        });

      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle availability status change
    socket.on('set_availability', async (status: string) => {
      const validStatuses = ['available', 'away', 'busy', 'offline'];
      if (!validStatuses.includes(status)) {
        socket.emit('error', { message: 'Invalid availability status' });
        return;
      }

      try {
        const doctorRepository = AppDataSource.getRepository(Doctor);
        await doctorRepository.update(userId, {
          availability_status: status,
          last_active_at: new Date(),
        });

        // Broadcast status update
        broadcastPresenceUpdate(io, userId, true, status);
        
        socket.emit('availability_updated', { status });
      } catch (error) {
        console.error('Error updating availability:', error);
        socket.emit('error', { message: 'Failed to update availability' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${userId} (socket: ${socket.id})`);

      // Remove socket from user's set
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        
        // If user has no more active sockets, mark as offline
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          await updateUserOnlineStatus(userId, false);
          broadcastPresenceUpdate(io, userId, false);
        }
      }
    });
  });

  console.log('🔌 Socket.io server initialized');
  return io;
}

async function updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);
    await doctorRepository.update(userId, {
      is_online: isOnline,
      last_active_at: new Date(),
    });
  } catch (error) {
    console.error('Error updating user online status:', error);
  }
}

function broadcastPresenceUpdate(io: Server, userId: string, isOnline: boolean, availabilityStatus?: string): void {
  // Broadcast to all connected clients
  io.emit('presence_update', {
    userId,
    isOnline,
    availabilityStatus,
    lastActiveAt: new Date().toISOString(),
  });
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId) && (onlineUsers.get(userId)?.size || 0) > 0;
}

export function getOnlineUsersCount(): number {
  return onlineUsers.size;
}

