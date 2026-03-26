'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/app/providers';
import {
  initializeSocket,
  disconnectSocket,
  getSocket,
  joinConversation,
  leaveConversation,
  sendMessage as socketSendMessage,
  sendTypingIndicator,
  markConversationRead,
  setAvailabilityStatus,
} from '@/lib/socket';

interface UseSocketOptions {
  conversationId?: string;
  onNewMessage?: (data: any) => void;
  onTyping?: (data: any) => void;
  onMessagesRead?: (data: any) => void;
  onPresenceUpdate?: (data: any) => void;
  onNewNotification?: (data: any) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const socket = initializeSocket();
      
      socket.on('connect', () => {
        setIsConnected(true);
        setConnectionError(null);
        
        // Join conversation room if specified
        if (optionsRef.current.conversationId) {
          joinConversation(optionsRef.current.conversationId);
        }
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        setConnectionError(error.message);
        setIsConnected(false);
      });

      // Set up event handlers
      if (optionsRef.current.onNewMessage) {
        socket.on('new_message', optionsRef.current.onNewMessage);
      }

      if (optionsRef.current.onTyping) {
        socket.on('user_typing', optionsRef.current.onTyping);
      }

      if (optionsRef.current.onMessagesRead) {
        socket.on('messages_read', optionsRef.current.onMessagesRead);
      }

      if (optionsRef.current.onPresenceUpdate) {
        socket.on('presence_update', optionsRef.current.onPresenceUpdate);
      }

      if (optionsRef.current.onNewNotification) {
        socket.on('new_notification', optionsRef.current.onNewNotification);
      }

      return () => {
        // Leave conversation room
        if (optionsRef.current.conversationId) {
          leaveConversation(optionsRef.current.conversationId);
        }
        
        // Remove event listeners
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('new_message');
        socket.off('user_typing');
        socket.off('messages_read');
        socket.off('presence_update');
        socket.off('new_notification');
      };
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      setConnectionError('Failed to connect');
    }
  }, [isAuthenticated]);

  // Handle conversation change
  useEffect(() => {
    if (!isConnected || !options.conversationId) return;

    joinConversation(options.conversationId);

    return () => {
      leaveConversation(options.conversationId!);
    };
  }, [isConnected, options.conversationId]);

  // Send message
  const sendMessage = useCallback((content: string, messageType = 'text') => {
    if (!options.conversationId) {
      console.error('No conversation ID specified');
      return;
    }
    socketSendMessage(options.conversationId, content, messageType);
  }, [options.conversationId]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    if (!options.conversationId) return;
    sendTypingIndicator(options.conversationId, isTyping);
  }, [options.conversationId]);

  // Mark as read
  const markAsRead = useCallback(() => {
    if (!options.conversationId) return;
    markConversationRead(options.conversationId);
  }, [options.conversationId]);

  // Set availability
  const setAvailability = useCallback((status: 'available' | 'away' | 'busy' | 'offline') => {
    setAvailabilityStatus(status);
  }, []);

  return {
    isConnected,
    connectionError,
    sendMessage,
    sendTyping,
    markAsRead,
    setAvailability,
    socket: getSocket(),
  };
}

// Simple hook for global presence updates
export function usePresence(onPresenceUpdate?: (data: any) => void) {
  const { isAuthenticated } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!isAuthenticated) return;

    try {
      const socket = initializeSocket();

      socket.on('presence_update', (data: { userId: string; isOnline: boolean }) => {
        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(data.userId, data.isOnline);
          return newMap;
        });
        onPresenceUpdate?.(data);
      });

      return () => {
        socket.off('presence_update');
      };
    } catch (error) {
      console.error('Failed to initialize presence socket:', error);
    }
  }, [isAuthenticated, onPresenceUpdate]);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.get(userId) || false;
  }, [onlineUsers]);

  return { onlineUsers, isUserOnline };
}

// Hook for unread message count
export function useUnreadCount() {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    try {
      const socket = initializeSocket();

      socket.on('new_notification', (data: any) => {
        if (data.type === 'new_message') {
          setUnreadCount(prev => prev + 1);
        }
      });

      socket.on('messages_read', () => {
        // Could decrement here if we track per-conversation
      });

      return () => {
        socket.off('new_notification');
        socket.off('messages_read');
      };
    } catch (error) {
      console.error('Failed to initialize unread count socket:', error);
    }
  }, [isAuthenticated]);

  const resetCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return { unreadCount, resetCount };
}

