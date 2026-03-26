'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/app/providers';
import OnlineStatusDot from '@/components/OnlineStatusDot';
import { useSocket } from '@/hooks/useSocket';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import { getProfileImageUrl } from '@/lib/apiConfig';
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  CheckIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    profile_photo_url?: string;
  };
}

interface OtherParty {
  id: string;
  name: string;
  clinic_name?: string;
  profile_photo_url?: string;
  is_online?: boolean;
  availability_status?: string;
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [otherParty, setOtherParty] = useState<OtherParty | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle new message from socket
  const handleNewMessage = useCallback((data: { message: Message; conversationId: string }) => {
    if (data.conversationId === conversationId) {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.find(m => m.id === data.message.id)) {
          return prev;
        }
        return [...prev, data.message];
      });
    }
  }, [conversationId]);

  // Handle typing indicator
  const handleTyping = useCallback((data: { userId: string; conversationId: string; isTyping: boolean }) => {
    if (data.conversationId === conversationId && data.userId !== user?.id) {
      setOtherUserTyping(data.isTyping);
    }
  }, [conversationId, user?.id]);

  // Handle messages read
  const handleMessagesRead = useCallback((data: { conversationId: string; readBy: string }) => {
    if (data.conversationId === conversationId && data.readBy !== user?.id) {
      setMessages(prev => prev.map(m => ({ ...m, is_read: true, read_at: new Date().toISOString() })));
    }
  }, [conversationId, user?.id]);

  // Initialize socket with handlers
  const { isConnected, sendTyping, markAsRead: socketMarkAsRead } = useSocket({
    conversationId: conversationId as string,
    onNewMessage: handleNewMessage,
    onTyping: handleTyping,
    onMessagesRead: handleMessagesRead,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && conversationId) {
      fetchMessages();
      markAsRead();
    }
  }, [isAuthenticated, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fallback polling if socket not connected
  useEffect(() => {
    if (!isAuthenticated || !conversationId || isConnected) return;
    
    const interval = setInterval(() => {
      fetchMessages(true); // Silent refresh
    }, 5000); // Poll every 5 seconds as fallback

    return () => clearInterval(interval);
  }, [isAuthenticated, conversationId, isConnected]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await api.get(`/conversations/${conversationId}/messages`);
      
      // Axios response: data is in response.data
      if (response.data?.success) {
        setMessages(response.data.data?.messages || []);
        
        // Extract other party info from the first message if available
        // This is a workaround until we have a dedicated endpoint
      } else {
        if (!silent) toast.error('Failed to load messages');
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      if (!silent) toast.error('Failed to load messages');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchConversationDetails = async () => {
    try {
      const response = await api.get('/conversations');
      // Axios response: data is in response.data
      if (response.data?.success) {
        const conv = response.data.data?.conversations?.find(
          (c: any) => c.id === conversationId
        ) || response.data.data?.find?.((c: any) => c.id === conversationId);
        if (conv) {
          setOtherParty(conv.other_party);
        }
      }
    } catch (err) {
      console.error('Error fetching conversation details:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversationDetails();
    }
  }, [isAuthenticated]);

  const markAsRead = async () => {
    try {
      await api.put(`/conversations/${conversationId}/read`);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true);
      sendTyping(true);
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(false);
    }, 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    // Stop typing indicator
    setIsTyping(false);
    sendTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      setSending(true);
      const response = await api.post(`/conversations/${conversationId}/messages`, {
        content: newMessage.trim(),
      });

      // Axios response: data is in response.data
      if (response.data?.success) {
        setMessages(prev => {
          // Avoid duplicates (socket might have already added it)
          if (prev.find(m => m.id === response.data.data.id)) {
            return prev;
          }
          return [...prev, response.data.data];
        });
        setNewMessage('');
        inputRef.current?.focus();
      } else {
        toast.error(response.data?.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups: { [key: string]: Message[] }, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        onLoginClick={() => router.push('/login')}
        onRegisterClick={() => router.push('/signup/select-type')}
        isAuthenticated={isAuthenticated}
        user={user}
      />

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-4">
          <Link
            href="/messages"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </Link>
          
          {otherParty && (
            <Link href={`/doctors/${otherParty.id}`} className="flex items-center space-x-3 flex-1">
              <div className="relative">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                  {getProfileImageUrl(otherParty.profile_photo_url) ? (
                    <Image
                      src={getProfileImageUrl(otherParty.profile_photo_url)!}
                      alt={otherParty.name}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold bg-gradient-to-br from-blue-100 to-emerald-100">
                      {otherParty.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5">
                  <OnlineStatusDot
                    isOnline={otherParty.is_online || false}
                    availabilityStatus={otherParty.availability_status}
                    size="sm"
                  />
                </div>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{otherParty.name}</h2>
                <div className="flex items-center">
                  <OnlineStatusDot
                    isOnline={otherParty.is_online || false}
                    availabilityStatus={otherParty.availability_status}
                    showLabel
                    size="sm"
                  />
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex justify-center my-4">
                  <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                    {formatDate(dateMessages[0].created_at)}
                  </span>
                </div>

                {/* Messages for this date */}
                {dateMessages.map((message, idx) => {
                  const isOwn = message.sender_id === user?.id;
                  const showAvatar = idx === 0 || dateMessages[idx - 1]?.sender_id !== message.sender_id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                        showAvatar ? 'mt-4' : 'mt-1'
                      }`}
                    >
                      {/* Avatar for received messages */}
                      {!isOwn && showAvatar && message.sender && (
                        <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
                          {getProfileImageUrl(message.sender.profile_photo_url) ? (
                            <Image
                              src={getProfileImageUrl(message.sender.profile_photo_url)!}
                              alt={message.sender.name}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-bold bg-gray-100">
                              {message.sender.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                      {!isOwn && !showAvatar && <div className="w-8 mr-2" />}

                      {/* Message Bubble */}
                      <div
                        className={`max-w-xs sm:max-w-md px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-br-md'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <div className={`flex items-center justify-end mt-1 space-x-1 ${
                          isOwn ? 'text-blue-100' : 'text-gray-400'
                        }`}>
                          <span className="text-xs">{formatTime(message.created_at)}</span>
                          {isOwn && (
                            message.is_read ? (
                              <CheckCircleIcon className="w-4 h-4" />
                            ) : (
                              <CheckIcon className="w-4 h-4" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          {/* Typing indicator */}
          {otherUserTyping && (
            <div className="flex items-center space-x-2 ml-10">
              <div className="bg-gray-200 rounded-xl px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
              <span className="text-xs text-gray-400">{otherParty?.name} is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Connection status */}
        {!isConnected && (
          <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-2 text-center">
            <span className="text-xs text-yellow-700">Connecting to real-time updates...</span>
          </div>
        )}

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSend} className="flex items-center space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-xl hover:from-blue-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

