'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/app/providers';
import OnlineStatusDot from '@/components/OnlineStatusDot';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import { getProfileImageUrl } from '@/lib/apiConfig';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  InboxIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface Conversation {
  id: string;
  status: string;
  last_message_at: string;
  unread_count: number;
  other_party: {
    id: string;
    name: string;
    clinic_name?: string;
    profile_photo_url?: string;
    is_online?: boolean;
    availability_status?: string;
  };
  last_message?: {
    content: string;
    sender_id: string;
    created_at: string;
  };
  created_at: string;
}

export default function MessagesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Accept appointment request (doctor only)
  const handleAccept = async (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    
    if (acceptingId) return; // Already processing
    
    setAcceptingId(conversationId);
    try {
      const response = await api.put(`/conversations/${conversationId}/accept`);
      
      if (response.data?.success) {
        toast.success('Appointment accepted! Your contact info has been shared with the patient.');
        // Update local state
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId ? { ...conv, status: 'accepted' } : conv
        ));
      } else {
        toast.error(response.data?.message || 'Failed to accept appointment');
      }
    } catch (err) {
      console.error('Error accepting appointment:', err);
      toast.error('Failed to accept appointment');
    } finally {
      setAcceptingId(null);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/conversations');
      
      // Axios response: data is in response.data
      if (response.data?.success) {
        setConversations(response.data.data?.conversations || response.data.data || []);
      } else {
        toast.error('Failed to load conversations');
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const sortedConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = conversations.filter((conv) => {
      if (!query) return true;
      return (
        conv.other_party.name.toLowerCase().includes(query) ||
        conv.other_party.clinic_name?.toLowerCase().includes(query)
      );
    });

    const activityTime = (conv: Conversation) =>
      new Date(conv.last_message_at || conv.last_message?.created_at || conv.created_at).getTime();

    const isPriorityUnread = (conv: Conversation) => {
      if ((conv.unread_count || 0) > 0) return true;
      if (user?.user_type === 'doctor' && conv.status === 'pending') return true;
      return false;
    };

    return [...filtered].sort((a, b) => {
      const aUnread = isPriorityUnread(a);
      const bUnread = isPriorityUnread(b);
      if (aUnread !== bUnread) return aUnread ? -1 : 1;
      return activityTime(b) - activityTime(a);
    });
  }, [conversations, searchQuery, user?.user_type]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onLoginClick={() => router.push('/login')}
        onRegisterClick={() => router.push('/signup/select-type')}
        isAuthenticated={isAuthenticated}
        user={user}
      />

      <main className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8 pb-6 overflow-x-hidden">
        {/* Header — stacks on mobile */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
          <div className="min-w-0">
            {user?.user_type === 'doctor' ? (
              <>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">
                  📋 Appointment Requests
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center text-[10px] sm:text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full shrink-0">
                    🔒 Private
                  </span>
                  <span className="min-w-0">Only you and each patient can see your conversations</span>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">
                  📅 My Appointments
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center text-[10px] sm:text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full shrink-0">
                    🔒 Private
                  </span>
                  <span className="min-w-0">Only you and each doctor can see your conversations</span>
                </p>
              </>
            )}
          </div>
          {user?.user_type !== 'doctor' && (
            <Link
              href="/doctors?focus=search"
              className="flex w-full sm:w-auto shrink-0 items-center justify-center px-4 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-emerald-700 transition-all shadow-sm"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 shrink-0" />
              Book New Appointment
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4 sm:mb-6">
          <MagnifyingGlassIcon className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              user?.user_type === 'doctor'
                ? 'Search requests by patient name...'
                : 'Search by doctor name...'
            }
            className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse border border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-48" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Conversations List — unread / new requests first, then by time */}
        {!loading && sortedConversations.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            {sortedConversations.map((conv) => {
              const hasUnread = (conv.unread_count || 0) > 0;
              const isPendingDoctor =
                conv.status === 'pending' && user?.user_type === 'doctor';

              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className={`block bg-white rounded-xl p-3 sm:p-4 border transition-all hover:shadow-md overflow-hidden ${
                    isPendingDoctor
                      ? 'border-amber-300 bg-amber-50/50'
                      : hasUnread
                        ? 'border-blue-200 bg-blue-50/50'
                        : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <div className="flex gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gray-100">
                        {getProfileImageUrl(conv.other_party.profile_photo_url) ? (
                          <Image
                            src={getProfileImageUrl(conv.other_party.profile_photo_url)!}
                            alt={conv.other_party.name}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg sm:text-xl font-bold bg-gradient-to-br from-blue-100 to-emerald-100">
                            {conv.other_party.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <OnlineStatusDot
                          isOnline={conv.other_party.is_online || false}
                          availabilityStatus={conv.other_party.availability_status}
                          size="sm"
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`font-semibold text-sm sm:text-base truncate min-w-0 flex-1 ${
                            hasUnread ? 'text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {conv.other_party.name}
                        </h3>
                        {conv.last_message_at && (
                          <span className="text-[10px] sm:text-xs text-gray-400 shrink-0 whitespace-nowrap pt-0.5">
                            {formatTime(conv.last_message_at)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {conv.status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-amber-100 text-amber-800">
                            <ClockIcon className="w-3 h-3 mr-0.5 shrink-0" />
                            {user?.user_type === 'doctor' ? 'New Request' : 'Waiting'}
                          </span>
                        )}
                        {conv.status === 'accepted' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircleSolidIcon className="w-3 h-3 mr-0.5 shrink-0" />
                            {user?.user_type === 'doctor' ? 'Accepted' : 'Confirmed'}
                          </span>
                        )}
                        {hasUnread && (
                          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                            {conv.unread_count > 9 ? '9+' : conv.unread_count}
                          </span>
                        )}
                      </div>

                      {conv.other_party.clinic_name && (
                        <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">
                          {conv.other_party.clinic_name}
                        </p>
                      )}

                      {user?.user_type !== 'doctor' &&
                        conv.status === 'pending' &&
                        !conv.last_message && (
                          <p className="text-xs text-amber-600 mt-1">
                            ⏳ Waiting for doctor to accept your request...
                          </p>
                        )}
                      {user?.user_type !== 'doctor' &&
                        conv.status === 'accepted' &&
                        !conv.last_message && (
                          <p className="text-xs text-green-600 mt-1">
                            ✅ Doctor accepted! Check your notifications for contact info.
                          </p>
                        )}

                      {conv.last_message && (
                        <p
                          className={`text-xs sm:text-sm truncate mt-1 ${
                            hasUnread ? 'text-gray-900 font-medium' : 'text-gray-500'
                          }`}
                        >
                          {conv.last_message.sender_id === user?.id ? 'You: ' : ''}
                          {conv.last_message.content}
                        </p>
                      )}

                      {isPendingDoctor && (
                        <button
                          type="button"
                          onClick={(e) => handleAccept(e, conv.id)}
                          disabled={acceptingId === conv.id}
                          className={`mt-2 w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                            acceptingId === conv.id
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                          }`}
                        >
                          {acceptingId === conv.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mr-1.5" />
                              Accepting...
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="w-4 h-4 mr-1.5 shrink-0" />
                              Accept
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && sortedConversations.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-full flex items-center justify-center">
              {user?.user_type === 'doctor' ? (
                <span className="text-4xl">📋</span>
              ) : (
                <span className="text-4xl">📅</span>
              )}
            </div>
            <h3 className="text-xl font-medium text-gray-900">
              {searchQuery 
                ? 'No results found'
                : user?.user_type === 'doctor' 
                  ? 'No appointment requests yet' 
                  : 'No appointments booked'}
            </h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              {searchQuery 
                ? 'Try a different search term' 
                : user?.user_type === 'doctor'
                  ? 'When patients request appointments, they will appear here for you to accept'
                  : 'Browse doctors and click "Set Appointment" to book your first appointment'}
            </p>
            
            {/* Privacy note */}
            <div className="mt-4 inline-flex items-center text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
              🔒 All conversations are private between you and each {user?.user_type === 'doctor' ? 'patient' : 'doctor'}
            </div>
            
            {!searchQuery && user?.user_type !== 'doctor' && (
              <Link
                href="/doctors"
                className="inline-flex items-center mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-emerald-700 transition-all shadow-md"
              >
                <span className="mr-2">👨‍⚕️</span>
                Find a Doctor
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

