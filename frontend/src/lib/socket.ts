'use client';

import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './auth';
import { getApiUrl } from './getApiUrl';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function initializeSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const token = getAccessToken();
  if (!token) {
    throw new Error('No authentication token available');
  }

  // Get the backend URL (remove /api suffix if present)
  let backendUrl = getApiUrl();
  if (backendUrl.endsWith('/api')) {
    backendUrl = backendUrl.slice(0, -4);
  }

  socket = io(backendUrl, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 3, // Reduced attempts
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 30000, // Increased timeout
    transports: ['polling', 'websocket'], // Try polling first (more reliable)
  });

  // Track error count to avoid spam
  let errorCount = 0;
  const MAX_ERROR_LOGS = 2;

  socket.on('connect', () => {
    errorCount = 0; // Reset on successful connect
    console.log('🔌 Socket connected');
  });

  socket.on('disconnect', (reason) => {
    if (reason !== 'io client disconnect') {
      console.log('🔌 Socket disconnected:', reason);
    }
  });

  socket.on('connect_error', (error) => {
    errorCount++;
    if (errorCount <= MAX_ERROR_LOGS) {
      console.warn('🔌 Socket connection issue - real-time features may be limited');
    }
    // Don't spam console with repeated errors
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinConversation(conversationId: string): void {
  if (socket?.connected) {
    socket.emit('join_conversation', conversationId);
  }
}

export function leaveConversation(conversationId: string): void {
  if (socket?.connected) {
    socket.emit('leave_conversation', conversationId);
  }
}

export function sendMessage(conversationId: string, content: string, messageType = 'text'): void {
  if (socket?.connected) {
    socket.emit('send_message', { conversationId, content, messageType });
  }
}

export function sendTypingIndicator(conversationId: string, isTyping: boolean): void {
  if (socket?.connected) {
    socket.emit('typing', { conversationId, isTyping });
  }
}

export function markConversationRead(conversationId: string): void {
  if (socket?.connected) {
    socket.emit('mark_read', { conversationId });
  }
}

export function setAvailabilityStatus(status: 'available' | 'away' | 'busy' | 'offline'): void {
  if (socket?.connected) {
    socket.emit('set_availability', status);
  }
}

// Hook for using socket in React components
export function useSocketEvents(
  onNewMessage?: (data: any) => void,
  onTyping?: (data: any) => void,
  onMessagesRead?: (data: any) => void,
  onPresenceUpdate?: (data: any) => void,
  onNewNotification?: (data: any) => void
): void {
  if (!socket) return;

  if (onNewMessage) {
    socket.off('new_message');
    socket.on('new_message', onNewMessage);
  }

  if (onTyping) {
    socket.off('user_typing');
    socket.on('user_typing', onTyping);
  }

  if (onMessagesRead) {
    socket.off('messages_read');
    socket.on('messages_read', onMessagesRead);
  }

  if (onPresenceUpdate) {
    socket.off('presence_update');
    socket.on('presence_update', onPresenceUpdate);
  }

  if (onNewNotification) {
    socket.off('new_notification');
    socket.on('new_notification', onNewNotification);
  }
}

