'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { useUnreadCount } from '@/hooks/useSocket';
import api from '@/lib/api';
import { BellIcon, CheckCircleIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';

interface DoctorContact {
  email?: string;
  whatsapp?: string;
  clinic_name?: string;
  address?: string;
}

interface Notification {
  id: string;
  type: string;
  payload: {
    title?: string;
    message?: string;
    conversation_id?: string;
    sender_name?: string;
    doctor_contact?: DoctorContact;
    requires_acceptance?: boolean;
  };
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useUnreadCount();
  const [localUnreadCount, setLocalUnreadCount] = useState(0);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchNotifications();
    }
  }, [isOpen, isAuthenticated]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread count on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    }
  }, [isAuthenticated]);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/conversations/unread-count');
      // Axios response: data is in response.data
      if (response.data?.success) {
        setLocalUnreadCount(response.data.data?.unread_count || 0);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch both conversations and real notifications
      const [convResponse, notifResponse] = await Promise.all([
        api.get('/conversations'),
        api.get('/notifications').catch(() => ({ data: { success: false, data: [] } }))
      ]);
      
      const notifs: Notification[] = [];
      
      // Add real notifications (including appointment_accepted)
      if (notifResponse.data?.success && notifResponse.data?.data) {
        const realNotifs = notifResponse.data.data
          .filter((n: any) => !n.is_read)
          .map((n: any) => ({
            id: n.id,
            type: n.type,
            payload: n.payload,
            is_read: n.is_read,
            created_at: n.created_at,
          }));
        notifs.push(...realNotifs);
      }
      
      // Add conversation-based notifications for unread messages
      if (convResponse.data?.success) {
        const convNotifs = (convResponse.data.data?.conversations || [])
          .filter((c: any) => c.unread_count > 0 || c.status === 'pending')
          .map((c: any) => ({
            id: `conv-${c.id}`,
            type: c.status === 'pending' ? 'pending_request' : 'new_message',
            payload: {
              title: c.status === 'pending' 
                ? '📋 New Appointment Request' 
                : '💬 New Message',
              message: c.last_message?.content || (c.status === 'pending' 
                ? `${c.other_party?.name || 'A patient'} wants to book an appointment` 
                : 'You have a new message'),
              conversation_id: c.id,
              sender_name: c.other_party?.name,
            },
            is_read: false,
            created_at: c.last_message_at || c.created_at,
          }));
        notifs.push(...convNotifs);
      }
      
      // Sort by created_at descending
      notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setNotifications(notifs.slice(0, 10)); // Limit to 10 notifications
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.payload.conversation_id) {
      router.push(`/messages/${notification.payload.conversation_id}`);
    }
    setIsOpen(false);
  };

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

  const totalUnread = localUnreadCount + unreadCount;

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        {totalUnread > 0 ? (
          <BellAlertIcon className="w-6 h-6 text-blue-600" />
        ) : (
          <BellIcon className="w-6 h-6" />
        )}
        {totalUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {totalUnread > 0 && (
              <span className="text-xs text-gray-500">{totalUnread} unread</span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-b-0 transition-colors ${
                    notification.type === 'appointment_accepted' ? 'bg-green-50/50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      notification.type === 'appointment_accepted' 
                        ? 'bg-green-100' 
                        : notification.type === 'pending_request'
                          ? 'bg-amber-100'
                          : 'bg-blue-100'
                    }`}>
                      {notification.type === 'appointment_accepted' ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <BellIcon className={`w-5 h-5 ${
                          notification.type === 'pending_request' ? 'text-amber-600' : 'text-blue-600'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.payload.title || notification.payload.sender_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {notification.payload.message}
                      </p>
                      
                      {/* Doctor Contact Info for appointment_accepted */}
                      {notification.type === 'appointment_accepted' && notification.payload.doctor_contact && (
                        <div className="mt-2 p-2 bg-white rounded-lg border border-green-200 space-y-1.5">
                          <p className="text-xs font-semibold text-green-700">Doctor&apos;s Contact:</p>
                          {notification.payload.doctor_contact.clinic_name && (
                            <div className="flex items-center text-xs text-gray-600">
                              <BuildingOfficeIcon className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                              {notification.payload.doctor_contact.clinic_name}
                            </div>
                          )}
                          {notification.payload.doctor_contact.email && (
                            <div className="flex items-center text-xs text-gray-600">
                              <EnvelopeIcon className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                              {notification.payload.doctor_contact.email}
                            </div>
                          )}
                          {notification.payload.doctor_contact.whatsapp && (
                            <div className="flex items-center text-xs text-gray-600">
                              <PhoneIcon className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                              {notification.payload.doctor_contact.whatsapp}
                            </div>
                          )}
                          {notification.payload.doctor_contact.address && (
                            <div className="flex items-center text-xs text-gray-600">
                              <MapPinIcon className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                              <span className="truncate">{notification.payload.doctor_contact.address}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                        notification.type === 'appointment_accepted' ? 'bg-green-600' : 'bg-blue-600'
                      }`} />
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center">
                <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No new notifications</p>
                <p className="text-xs text-gray-400 mt-1">You&apos;ll see appointment updates here</p>
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => {
                  router.push('/messages');
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View Appointments Status
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

