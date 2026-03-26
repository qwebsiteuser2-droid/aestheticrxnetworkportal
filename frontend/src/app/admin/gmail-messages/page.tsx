'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getAccessToken } from '@/lib/auth';
import api from '@/lib/api';
import { 
  EnvelopeIcon, 
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  TrophyIcon,
  PaperAirplaneIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  doctor_name: string;
  clinic_name: string;
  whatsapp: string;
  tier: string;
  tier_progress: number;
  current_sales: number;
  next_tier?: string;
  remaining_amount?: number;
}

interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  whatsapp_content: string;
  target_criteria: {
    tier_progress_min: number;
    tier_progress_max: number;
    tiers: string[];
  };
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tier_progress_90',
    name: 'Tier Progress 90%+',
    subject: '🎉 You\'re 90%+ to Next Tier!',
    content: `
      <h2>🎉 Amazing Progress!</h2>
      <p>Dear {{doctor_name}},</p>
      <p>Congratulations! You're making excellent progress and are <strong>{{tier_progress}}%</strong> of the way to your next tier: <strong>{{next_tier}}</strong>!</p>
      <p>You only need <strong>{{remaining_amount}} PKR</strong> more in sales to reach the next level and unlock amazing benefits:</p>
      <ul>
        <li>✅ Higher commission rates</li>
        <li>✅ Priority support</li>
        <li>✅ Exclusive product access</li>
        <li>✅ Special recognition</li>
      </ul>
      <p>Don't miss out on these incredible benefits! Place your next order today and level up your clinic's success.</p>
      <p>Best regards,<br>BioAestheticAx Network Team</p>
    `,
    whatsapp_content: `🎉 *Amazing Progress!*

Dear {{doctor_name}},

Congratulations! You're {{tier_progress}}% of the way to your next tier: *{{next_tier}}*!

You only need *{{remaining_amount}} PKR* more in sales to reach the next level and unlock amazing benefits:

✅ Higher commission rates
✅ Priority support  
✅ Exclusive product access
✅ Special recognition

Don't miss out! Place your next order today and level up your clinic's success.

Best regards,
BioAestheticAx Network Team`,
    target_criteria: {
      tier_progress_min: 90,
      tier_progress_max: 100,
      tiers: ['Bronze', 'Silver', 'Gold', 'Platinum']
    }
  },
  {
    id: 'tier_progress_80',
    name: 'Tier Progress 80%+',
    subject: '🚀 You\'re 80%+ to Next Tier!',
    content: `
      <h2>🚀 Great Progress!</h2>
      <p>Dear {{doctor_name}},</p>
      <p>You're doing fantastic! You're <strong>{{tier_progress}}%</strong> of the way to your next tier: <strong>{{next_tier}}</strong>!</p>
      <p>Just <strong>{{remaining_amount}} PKR</strong> more in sales and you'll unlock premium benefits.</p>
      <p>Keep up the momentum and reach for the stars! 🌟</p>
      <p>Best regards,<br>BioAestheticAx Network Team</p>
    `,
    whatsapp_content: `🚀 *Great Progress!*

Dear {{doctor_name}},

You're doing fantastic! You're {{tier_progress}}% of the way to your next tier: *{{next_tier}}*!

Just *{{remaining_amount}} PKR* more in sales and you'll unlock premium benefits.

Keep up the momentum and reach for the stars! 🌟

Best regards,
BioAestheticAx Network Team`,
    target_criteria: {
      tier_progress_min: 80,
      tier_progress_max: 89,
      tiers: ['Bronze', 'Silver', 'Gold', 'Platinum']
    }
  }
];

export default function GmailMessagesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageType, setMessageType] = useState<'template' | 'custom'>('custom');
  const [channels, setChannels] = useState<{
    gmail: boolean;
    whatsapp: boolean;
  }>({ gmail: true, whatsapp: false });

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'tier' | 'progress' | 'sales'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Automatic email sending states
  const [showAutoEmail, setShowAutoEmail] = useState(false);
  const [autoEmailDuration, setAutoEmailDuration] = useState<'daily' | 'weekly' | 'monthly' | '2hours' | '4hours' | '6hours' | '12hours' | 'custom'>('daily');
  const [customDuration, setCustomDuration] = useState({ days: 1, hours: 0 });
  const [autoEmailSubject, setAutoEmailSubject] = useState('');
  const [autoEmailContent, setAutoEmailContent] = useState('');
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(false);

  // Pre-built advertisement email templates
  const adEmailTemplates = [
    {
      id: 'product-promotion',
      name: 'Product Promotion',
      subject: '🎉 Special Offer: New Medical Products Available!',
      content: `Dear {{doctor_name}},

We're excited to announce new medical products that could benefit your practice at {{clinic_name}}!

🔥 **Featured Products:**
• Advanced diagnostic equipment
• Latest treatment solutions
• Premium medical supplies

💡 **Why Choose Us:**
• Competitive pricing
• Fast delivery
• Expert support
• Quality guarantee

📞 **Contact us today** to learn more about these exclusive offers!

Best regards,
BioAestheticAx Network Team

---
This email was sent to {{email}}`
    },
    {
      id: 'seasonal-offer',
      name: 'Seasonal Offer',
      subject: '🌟 Limited Time: 20% Off All Products!',
      content: `Hello {{doctor_name}},

Don't miss out on our exclusive seasonal offer!

🎯 **Special Discount:**
• 20% off all medical products
• Free shipping on orders over PKR 500
• Extended warranty on selected items

⏰ **Offer Valid Until:** End of this month

🏥 **Perfect for {{clinic_name}}:**
• Stock up on essential supplies
• Upgrade your equipment
• Save on bulk orders

🛒 **Order Now:** Contact us to place your order

Thank you for choosing BioAestheticAx Network!

Best regards,
Sales Team

---
Sent to: {{email}}`
    },
    {
      id: 'new-features',
      name: 'New Features Announcement',
      subject: '🚀 Exciting Updates: New Features Available!',
      content: `Dear {{doctor_name}},

We're thrilled to share some exciting updates that will enhance your experience with BioAestheticAx Network!

✨ **What's New:**
• Enhanced user dashboard
• Improved reporting tools
• New integration options
• Mobile app updates

🎯 **Benefits for {{clinic_name}}:**
• Better patient management
• Streamlined workflows
• Increased efficiency
• Better insights

📱 **How to Access:**
Simply log in to your account to explore these new features!

Need help? Our support team is here to assist you.

Best regards,
BioAestheticAx Network Development Team

---
Account: {{email}}`
    }
  ];

  // Redirect if not authenticated, not admin, or is Viewer Admin
  useEffect(() => {
    if (!authLoading) {
      // Block Viewer Admins completely from this page
      if (isViewerAdmin) {
        console.log('Gmail Messages - Viewer Admin access denied');
        toast.error('Access Denied: Viewer Admins do not have access to Gmail Messages.');
        router.push('/admin');
        return;
      }
      
      if (!isAuthenticated || !user?.is_admin) {
        console.log('Gmail Messages - Redirecting to login. isAuthenticated:', isAuthenticated, 'user.is_admin:', user?.is_admin);
        router.push('/login');
        return;
      }
      loadUsers();
    }
  }, [authLoading, isAuthenticated, user, router, isViewerAdmin]);

  const loadUsers = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }

      const response = await api.get('/admin/users-with-progress', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setUsers(response.data.data || []);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredUsers = () => {
    let filtered = users;
    console.log('Initial users count:', users.length);
    console.log('Search term:', searchTerm);
    console.log('Selected tiers:', selectedTiers);
    // Template functionality removed
    console.log('Message type:', messageType);

    // Apply search filter first (this should work regardless of template selection)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const beforeSearch = filtered.length;
      filtered = filtered.filter(user => 
        user.doctor_name?.toLowerCase().includes(searchLower) ||
        user.clinic_name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.tier?.toLowerCase().includes(searchLower)
      );
      console.log(`Search filter: ${beforeSearch} -> ${filtered.length} users`);
    }

    // Apply tier filter
    if (selectedTiers.length > 0) {
      const beforeTier = filtered.length;
      filtered = filtered.filter(user => selectedTiers.includes(user.tier));
      console.log(`Tier filter: ${beforeTier} -> ${filtered.length} users`);
    }

    // Template filtering removed - no longer using templates

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.doctor_name.toLowerCase();
          bValue = b.doctor_name.toLowerCase();
          break;
        case 'tier':
          aValue = a.tier.toLowerCase();
          bValue = b.tier.toLowerCase();
          break;
        case 'progress':
          aValue = a.tier_progress || 0;
          bValue = b.tier_progress || 0;
          break;
        case 'sales':
          aValue = a.current_sales || 0;
          bValue = b.current_sales || 0;
          break;
        default:
          aValue = a.doctor_name.toLowerCase();
          bValue = b.doctor_name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  };

  // Get unique tiers from users
  const getUniqueTiers = () => {
    const tiers = new Set(users.map(user => user.tier));
    return Array.from(tiers).sort();
  };

  const handleTierFilter = (tier: string) => {
    setSelectedTiers(prev => 
      prev.includes(tier) 
        ? prev.filter(t => t !== tier)
        : [...prev, tier]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTiers([]);
    setSortBy('name');
    setSortOrder('asc');
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    const filteredUsers = getFilteredUsers();
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const replaceTemplateVariables = (content: string, user: User): string => {
    return content
      .replace(/\{\{doctor_name\}\}/g, user.doctor_name)
      .replace(/\{\{clinic_name\}\}/g, user.clinic_name)
      .replace(/\{\{tier_progress\}\}/g, (user.tier_progress || 0).toString())
      .replace(/\{\{next_tier\}\}/g, user.next_tier || 'Next Tier')
      .replace(/\{\{remaining_amount\}\}/g, (user.remaining_amount || 0).toLocaleString())
      .replace(/\{\{current_sales\}\}/g, (user.current_sales || 0).toLocaleString());
  };

  const sendMessages = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot send messages.');
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    if (!channels.gmail && !channels.whatsapp) {
      toast.error('Please select at least one messaging channel');
      return;
    }

    setSending(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }

      console.log('Sending messages to users:', selectedUsers);
      
      // Use axios correctly - data is the second argument, config is the third
      const response = await api.post('/admin/send-messages', {
        userIds: selectedUsers,
        messageType: 'custom',
        template: null,
        customMessage,
        customSubject,
        channels
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // axios response handling - data is already parsed
      if (response.data.success) {
        const queuedCount = response.data.data?.queuedCount || selectedUsers.length;
        toast.success(`🚀 ${queuedCount} messages are being sent in the background!`, {
          duration: 5000,
          icon: '📧'
        });
        setSelectedUsers([]);
        setCustomMessage('');
        setCustomSubject('');
      } else {
        toast.error(response.data.message || 'Failed to send messages');
      }
    } catch (error: any) {
      console.error('Error sending messages:', error);
      toast.error(error.response?.data?.message || 'Failed to send messages');
    } finally {
      setSending(false);
    }
  };

  const loadAdTemplate = (template: any) => {
    setAutoEmailSubject(template.subject);
    setAutoEmailContent(template.content);
  };

  const setupAutoEmail = async () => {
    if (!autoEmailSubject.trim() || !autoEmailContent.trim()) {
      toast.error('Please provide both subject and content for automatic emails');
      return;
    }

    setSending(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }

      // Calculate duration in hours
      let durationHours = 24; // Default to daily
      switch (autoEmailDuration) {
        case 'daily':
          durationHours = 24;
          break;
        case 'weekly':
          durationHours = 24 * 7;
          break;
        case 'monthly':
          durationHours = 24 * 30;
          break;
        case '2hours':
          durationHours = 2;
          break;
        case '4hours':
          durationHours = 4;
          break;
        case '6hours':
          durationHours = 6;
          break;
        case '12hours':
          durationHours = 12;
          break;
        case 'custom':
          durationHours = (customDuration.days * 24) + customDuration.hours;
          break;
      }

      // Use axios correctly - data is the second argument, config is the third
      const response = await api.post('/admin/setup-auto-email', {
        subject: autoEmailSubject,
        content: autoEmailContent,
        durationHours,
        enabled: autoEmailEnabled,
        channels: { gmail: true, whatsapp: false } // Auto emails are typically Gmail only
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // axios response handling - data is already parsed
      if (response.data.success) {
        toast.success(`Automatic email setup ${autoEmailEnabled ? 'enabled' : 'disabled'} successfully!`);
        setShowAutoEmail(false);
        setAutoEmailSubject('');
        setAutoEmailContent('');
      } else {
        toast.error(response.data.message || 'Failed to setup automatic emails');
      }
    } catch (error: any) {
      console.error('Error setting up automatic emails:', error);
      toast.error(error.response?.data?.message || 'Failed to setup automatic emails');
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {authLoading ? 'Checking authentication...' : 'Loading users...'}
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = getFilteredUsers();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <EnvelopeIcon className="h-8 w-8 text-blue-600 mr-3" />
                Manage Gmail Messages
              </h1>
              <p className="mt-2 text-gray-600">
                Send targeted messages to users based on their tier progress
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <XMarkIcon className="h-5 w-5 mr-2" />
              Back
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Message Configuration */}
          <div className="lg:col-span-1 space-y-6">
            {/* Message Type */}
            {/* Custom Message */}
            {messageType === 'custom' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Message</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter message subject"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message Content
                    </label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your message content"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Messaging Channels */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Messaging Channels</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={channels.gmail}
                    onChange={(e) => setChannels(prev => ({ ...prev, gmail: e.target.checked }))}
                    className="mr-3"
                  />
                  <EnvelopeIcon className="h-5 w-5 text-red-600 mr-2" />
                  <span>Gmail</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={channels.whatsapp}
                    onChange={(e) => setChannels(prev => ({ ...prev, whatsapp: e.target.checked }))}
                    className="mr-3"
                  />
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-600 mr-2" />
                  <span>WhatsApp</span>
                </label>
              </div>
            </div>

            {/* Automatic Email Setup */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Automatic Email Campaign</h3>
                <button
                  onClick={() => setShowAutoEmail(!showAutoEmail)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {showAutoEmail ? 'Hide' : 'Setup'}
                </button>
              </div>
              
              {showAutoEmail && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                      <span className="text-sm text-yellow-800">
                        This will send emails to ALL users automatically at the specified intervals
                      </span>
                    </div>
                  </div>

                  {/* Advertisement Email Templates */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick Templates
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {adEmailTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => loadAdTemplate(template)}
                          className="text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                        >
                          <div className="font-medium text-sm text-gray-900">{template.name}</div>
                          <div className="text-xs text-gray-600 mt-1">{template.subject}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={autoEmailSubject}
                      onChange={(e) => setAutoEmailSubject(e.target.value)}
                      placeholder="Enter advertisement email subject"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Content
                    </label>
                    <textarea
                      value={autoEmailContent}
                      onChange={(e) => setAutoEmailContent(e.target.value)}
                      rows={4}
                      placeholder="Enter your advertisement email content..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Send Duration
                    </label>
                    <select
                      value={autoEmailDuration}
                      onChange={(e) => setAutoEmailDuration(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="2hours">Every 2 Hours</option>
                      <option value="4hours">Every 4 Hours</option>
                      <option value="6hours">Every 6 Hours</option>
                      <option value="12hours">Every 12 Hours</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {autoEmailDuration === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Days
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={customDuration.days}
                          onChange={(e) => setCustomDuration(prev => ({ ...prev, days: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hours
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={customDuration.hours}
                          onChange={(e) => setCustomDuration(prev => ({ ...prev, hours: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoEmailEnabled"
                      checked={autoEmailEnabled}
                      onChange={(e) => setAutoEmailEnabled(e.target.checked)}
                      className="mr-3"
                    />
                    <label htmlFor="autoEmailEnabled" className="text-sm text-gray-700">
                      Enable automatic email sending
                    </label>
                  </div>

                  <button
                    onClick={setupAutoEmail}
                    disabled={sending || !autoEmailSubject.trim() || !autoEmailContent.trim()}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Setting up...
                      </>
                    ) : (
                      <>
                        <EnvelopeIcon className="h-5 w-5 mr-2" />
                        {autoEmailEnabled ? 'Enable' : 'Setup'} Auto Email Campaign
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Send Button */}
            <button
              onClick={sendMessages}
              disabled={sending || selectedUsers.length === 0 || isViewerAdmin}
              className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                  Send to {selectedUsers.length} Users
                </>
              )}
            </button>
          </div>

          {/* User Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <UserGroupIcon className="h-5 w-5 mr-2" />
                  Select Users
                  <span className="ml-2 text-sm text-gray-500">
                    ({filteredUsers.length} users)
                  </span>
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <FunnelIcon className="h-4 w-4 mr-1" />
                    Filters
                  </button>
                  {filteredUsers.length > 0 && (
                    <button
                      onClick={handleSelectAll}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
              </div>

              {/* Search and Filter Section */}
              <div className="mb-6 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      console.log('Search term changed:', e.target.value);
                    }}
                    placeholder="Search by doctor name, clinic, email, or tier..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoComplete="off"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        console.log('Search cleared');
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      type="button"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {/* Search Results Info */}
                {searchTerm && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded-md">
                    Searching for: "<span className="font-medium">{searchTerm}</span>" 
                    {filteredUsers.length > 0 ? (
                      <span className="text-green-600"> - Found {filteredUsers.length} user(s)</span>
                    ) : (
                      <span className="text-red-600"> - No users found</span>
                    )}
                  </div>
                )}

                {/* Template functionality removed */}

                {/* Advanced Filters */}
                {showFilters && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">Advanced Filters</h4>
                      <button
                        onClick={clearFilters}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear All
                      </button>
                    </div>
                    
                    {/* Tier Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filter by Tier
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {getUniqueTiers().map((tier) => (
                          <button
                            key={tier}
                            onClick={() => handleTierFilter(tier)}
                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                              selectedTiers.includes(tier)
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {tier}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sort Options */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sort By
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="name">Doctor Name</option>
                          <option value="tier">Tier</option>
                          <option value="progress">Progress</option>
                          <option value="sales">Sales</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Order
                        </label>
                        <select
                          value={sortOrder}
                          onChange={(e) => setSortOrder(e.target.value as any)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="asc">Ascending</option>
                          <option value="desc">Descending</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {(
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No users found matching your criteria</p>
                      {(searchTerm || selectedTiers.length > 0) && (
                        <button
                          onClick={clearFilters}
                          className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Clear filters to see all users
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          selectedUsers.includes(user.id)
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleUserSelect(user.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(user.id)}
                                onChange={() => handleUserSelect(user.id)}
                                className="mr-3"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{user.doctor_name}</div>
                                <div className="text-sm text-gray-500">{user.clinic_name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                                {user.whatsapp && (
                                  <div className="text-xs text-green-600">📱 {user.whatsapp}</div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">{user.tier}</span>
                              <TrophyIcon className="h-4 w-4 text-yellow-500" />
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.tier_progress || 0}% progress
                            </div>
                            <div className="text-xs text-gray-400">
                              {user.current_sales?.toLocaleString() || 0} PKR sales
                            </div>
                            {user.remaining_amount && user.remaining_amount > 0 && (
                              <div className="text-xs text-blue-600 font-medium">
                                {user.remaining_amount.toLocaleString()} PKR to next tier
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
