'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/providers';
import { Sidebar } from '@/components/layout/Sidebar';
import { LeaderboardEntry, Tier } from '@/types';
import { formatCurrency, getTierColor, getTierProgress, getAccessToken } from '@/lib/auth';
import { leaderboardApi, tierConfigApi } from '@/lib/api';
import { getApiUrl } from '@/lib/getApiUrl';
import { getProfileImageUrl } from '@/lib/apiConfig';
import { toast } from 'react-hot-toast';
import { Bars3Icon, TrophyIcon, UserGroupIcon, PlusIcon, CheckIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { MotivationalMessage } from '@/components/MotivationalMessage';

export function LeaderboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminView, setIsAdminView] = useState(false);
  const userEntryRef = useRef<HTMLDivElement>(null);
  const teamEntryRef = useRef<HTMLDivElement>(null);

  // Team forming states
  const [showTeamForming, setShowTeamForming] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showReceivedInvitations, setShowReceivedInvitations] = useState(false);
  const [isInviteFormExpanded, setIsInviteFormExpanded] = useState(false);
  const [isTeamDisplayExpanded, setIsTeamDisplayExpanded] = useState(false);
  const [isBenefitsExpanded, setIsBenefitsExpanded] = useState(false);
  const [isReceivedInvitationsExpanded, setIsReceivedInvitationsExpanded] = useState(false);
  const [showLeaveTeamModal, setShowLeaveTeamModal] = useState(false);
  const [teamInvitations, setTeamInvitations] = useState<any[]>([]);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  const [userTeam, setUserTeam] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [leaderboardSearchTerm, setLeaderboardSearchTerm] = useState('');
  const [showTeamNameModal, setShowTeamNameModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [showInviteSearchModal, setShowInviteSearchModal] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [inviteSearchResults, setInviteSearchResults] = useState<any[]>([]);
  const [isInviteSearching, setIsInviteSearching] = useState(false);
  const [showAcceptConfirmation, setShowAcceptConfirmation] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showNoResultsModal, setShowNoResultsModal] = useState(false);
  const [noResultsQuery, setNoResultsQuery] = useState('');
  const [showDuplicateInvitationModal, setShowDuplicateInvitationModal] = useState(false);
  const [duplicateInvitationEmail, setDuplicateInvitationEmail] = useState('');
  const [showTeamFullModal, setShowTeamFullModal] = useState(false);
  const [teamMaxMembers, setTeamMaxMembers] = useState(3);
  const [doctorSuggestions, setDoctorSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated or not approved (but allow regular users)
  useEffect(() => {
    if (!isAuthenticated) {
      // Allow public access to leaderboard - no redirect needed
      return;
    }
    
    // Regular users are auto-approved and should have view access
    const userType = user?.user_type || (user as any)?.user_type || '';
    const isRegularUser = userType === 'regular' || userType === 'regular_user';
    
    // Only redirect unapproved doctors/employees (not regular users)
    if (user && !isRegularUser && !user.is_approved && !user.is_admin) {
      window.location.href = '/waiting-approval';
      return;
    }
  }, [isAuthenticated, user]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Using getApiUrl from @/lib/getApiUrl for consistent API URL detection

  // Auto-show invitation form when user has a team
  useEffect(() => {
    if (userTeam && !showInviteForm && !showReceivedInvitations) {
      setShowInviteForm(true);
    }
  }, [userTeam, showInviteForm, showReceivedInvitations]);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Check if user is admin and fetch appropriate data
        const isAdmin = user?.is_admin || false;
        setIsAdminView(isAdmin);
        
        const [leaderboardResponse, tiersResponse] = await Promise.all([
          isAdmin ? leaderboardApi.getAdmin() : leaderboardApi.get(),
          tierConfigApi.get()
        ]);
        
        if (leaderboardResponse.success) {
          setLeaderboard(leaderboardResponse.data.leaderboard);
        }
        
        if (tiersResponse.success) {
          setTiers(tiersResponse.data.tiers);
        }
      } catch (error) {
        toast.error('Failed to load leaderboard');
        console.error('Error fetching leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user]);

  // Scroll to user's position after leaderboard loads
  useEffect(() => {
    if (leaderboard.length > 0 && user && userEntryRef.current) {
      setTimeout(() => {
        userEntryRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 500);
    }
  }, [leaderboard, user]);

  // Function to convert number to ordinal (1st, 2nd, 3rd, etc.)
  const getOrdinalPosition = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) {
      return num + "st";
    }
    if (j === 2 && k !== 12) {
      return num + "nd";
    }
    if (j === 3 && k !== 13) {
      return num + "rd";
    }
    return num + "th";
  };

  const getTierIcon = (tier: string) => {
    const tierData = tiers.find(t => t.name === tier);
    return tierData?.icon || '🏅';
  };

  const getTierColorClass = (tier: string) => {
    // Find the tier configuration to get its color
    const tierConfig = tiers.find(t => t.name === tier);
    if (tierConfig && tierConfig.color) {
      // Map color names to Tailwind classes
      const colorMap: Record<string, string> = {
        'gray': 'bg-gray-100 text-gray-800 border-gray-200',
        'green': 'bg-green-100 text-green-800 border-green-200',
        'blue': 'bg-blue-100 text-blue-800 border-blue-200',
        'purple': 'bg-purple-100 text-purple-800 border-purple-200',
        'red': 'bg-red-100 text-red-800 border-red-200',
        'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'orange': 'bg-orange-100 text-orange-800 border-orange-200',
        'pink': 'bg-pink-100 text-pink-800 border-pink-200',
        'indigo': 'bg-indigo-100 text-indigo-800 border-indigo-200',
        'teal': 'bg-teal-100 text-teal-800 border-teal-200',
        'cyan': 'bg-cyan-100 text-cyan-800 border-cyan-200',
        'lime': 'bg-lime-100 text-lime-800 border-lime-200',
        'amber': 'bg-amber-100 text-amber-800 border-amber-200',
        'emerald': 'bg-emerald-100 text-emerald-800 border-emerald-200',
        'violet': 'bg-violet-100 text-violet-800 border-violet-200',
        'rose': 'bg-rose-100 text-rose-800 border-rose-200',
        'sky': 'bg-sky-100 text-sky-800 border-sky-200',
        'slate': 'bg-slate-100 text-slate-800 border-slate-200',
        'zinc': 'bg-zinc-100 text-zinc-800 border-zinc-200',
        'neutral': 'bg-neutral-100 text-neutral-800 border-neutral-200',
        'stone': 'bg-stone-100 text-stone-800 border-stone-200'
      };
      return colorMap[tierConfig.color.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
    }
    // Fallback to hardcoded values for backward compatibility
    switch (tier) {
      case 'Elite Lead': return 'bg-red-100 text-red-800 border-red-200';
      case 'Grand Lead': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Lead Expert': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Lead Contributor': return 'bg-green-100 text-green-800 border-green-200';
      case 'Lead Starter': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Load team data
  useEffect(() => {
    if (user && isAuthenticated) {
      loadUserTeam();
      loadTeamInvitations();
    }
  }, [user, isAuthenticated]);

  const loadUserTeam = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/teams/my-team`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserTeam(data.team);
      }
    } catch (error) {
      console.error('Error loading user team:', error);
    }
  };

  const loadTeamInvitations = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/teams/invitations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTeamInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Error loading team invitations:', error);
    }
  };

  // Team forming functions
  const openTeamNameModal = () => {
    setShowTeamNameModal(true);
    setTeamName('');
  };

  const createTeam = async () => {
    if (!teamName || !teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    setIsInviting(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/teams/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: teamName.trim()
        })
      });

      if (response.ok) {
        toast.success('Team created successfully!');
        setShowTeamNameModal(false);
        setTeamName('');
        loadUserTeam(); // Reload team data
        // Automatically show invitation form after team creation
        setShowInviteForm(true);
        setShowReceivedInvitations(false);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create team');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    } finally {
      setIsInviting(false);
    }
  };

  const sendTeamInvitation = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Check if user is trying to invite themselves
    if (user && user.email && inviteEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      toast.error('You cannot invite yourself to your own team');
      return;
    }

    setIsInviting(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/teams/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          message: 'Join my team!'
        })
      });

      if (response.ok) {
        toast.success(`Team invitation sent to ${inviteEmail}`);
        setInviteEmail('');
      } else {
        const error = await response.json();
        const errorMessage = error.message || 'Failed to send team invitation';
        
        // Check if it's a "team full" error
        if (errorMessage.includes('Team is full') || errorMessage.includes('maximum')) {
          // Extract max members from error message if available
          const maxMatch = errorMessage.match(/maximum (\d+)/);
          if (maxMatch) {
            setTeamMaxMembers(parseInt(maxMatch[1]));
          }
          setShowTeamFullModal(true);
        }
        // Check if it's a duplicate invitation error
        else if (errorMessage.includes('already sent an invitation') || errorMessage.includes('already sent')) {
          setDuplicateInvitationEmail(inviteEmail);
          setShowDuplicateInvitationModal(true);
        }
        // Check if it's a "not found" error
        else if (errorMessage.includes('not found') || errorMessage.includes('Doctor not found')) {
          toast.error(`No doctor found with email: ${inviteEmail}`);
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error sending team invitation:', error);
      toast.error('Failed to send team invitation');
    } finally {
      setIsInviting(false);
    }
  };

  // Search for doctors to invite (by name, clinic, or email)
  const searchDoctorsForInvite = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setDoctorSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const token = getAccessToken();
      if (!token) return;

      const apiUrl = getApiUrl();
      // Use the existing search endpoint with currentUserId to filter out current user
      const response = await fetch(`${apiUrl}/search?q=${encodeURIComponent(query)}&currentUserId=${user?.id || ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter to only show doctors (not teams) and exclude existing team members
        const filtered = (data.results || [])
          .filter((item: any) => item.type === 'Doctor')
          .filter((doc: any) => {
            // Don't show existing team members
            if (userTeam?.members?.some((m: any) => m.doctor_id === doc.id || m.email === doc.email)) return false;
            return true;
          })
          .map((doc: any) => ({
            id: doc.id,
            doctor_name: doc.name,
            clinic_name: doc.details?.split(' • ')[0] || '',
            email: doc.email,
            tier: doc.tier
          }));
        setDoctorSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      }
    } catch (error) {
      console.error('Error searching doctors:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Handle invite input change with debounce
  const handleInviteInputChange = (value: string) => {
    setInviteEmail(value);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for search
    const timeout = setTimeout(() => {
      searchDoctorsForInvite(value);
    }, 300);
    setSearchTimeout(timeout);
  };

  // Select a doctor from suggestions
  const selectDoctorFromSuggestions = (doctor: any) => {
    setInviteEmail(doctor.email);
    setShowSuggestions(false);
    setDoctorSuggestions([]);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showAcceptConfirmationModal = (invitation: any) => {
    setSelectedInvitation(invitation);
    setShowAcceptConfirmation(true);
  };

  const acceptTeamInvitation = async () => {
    if (!selectedInvitation) return;

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/teams/invitations/${selectedInvitation.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'accept' })
      });

      if (response.ok) {
        toast.success('Team invitation accepted successfully!');
        setTeamInvitations(prev => prev.filter(inv => inv.id !== selectedInvitation.id));
        setShowAcceptConfirmation(false);
        setSelectedInvitation(null);
        loadUserTeam(); // Reload team data
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to accept team invitation');
      }
    } catch (error) {
      console.error('Error accepting team invitation:', error);
      toast.error('Failed to accept team invitation');
    }
  };

  const rejectTeamInvitation = async (invitationId: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/teams/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'reject' })
      });

      if (response.ok) {
        toast.success('Team invitation rejected');
        setTeamInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to reject team invitation');
      }
    } catch (error) {
      console.error('Error rejecting team invitation:', error);
      toast.error('Failed to reject team invitation');
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setIsSearching(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      // Include current user ID for better suggestions
      const currentUserId = user?.id || user?.doctor_id;
      const searchUrl = currentUserId 
        ? `${getApiUrl()}/search?q=${encodeURIComponent(searchQuery.trim())}&currentUserId=${encodeURIComponent(currentUserId)}`
        : `${getApiUrl()}/search?q=${encodeURIComponent(searchQuery.trim())}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      } else {
        toast.error('Search failed');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error performing search:', error);
      toast.error('Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const performInviteSearch = async () => {
    if (!inviteSearchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setIsInviteSearching(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      // Include current user ID for better suggestions
      const currentUserId = user?.id || user?.doctor_id;
      const inviteSearchUrl = currentUserId 
        ? `${getApiUrl()}/search?q=${encodeURIComponent(inviteSearchQuery.trim())}&currentUserId=${encodeURIComponent(currentUserId)}`
        : `${getApiUrl()}/search?q=${encodeURIComponent(inviteSearchQuery.trim())}`;
      
      const response = await fetch(inviteSearchUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const results = data.results || [];
        setInviteSearchResults(results);
        
        // Show popup if no results found
        if (results.length === 0) {
          setNoResultsQuery(inviteSearchQuery.trim());
          setShowNoResultsModal(true);
        }
      } else {
        toast.error('Search failed');
        setInviteSearchResults([]);
      }
    } catch (error) {
      console.error('Error performing invite search:', error);
      toast.error('Search failed');
      setInviteSearchResults([]);
    } finally {
      setIsInviteSearching(false);
    }
  };

  const leaveTeam = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/teams/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Successfully left the team. You are now a solo doctor.');
        // Reload team data to reflect changes
        loadUserTeam();
        setUserTeam(null);
        setShowInviteForm(false);
        setShowReceivedInvitations(false);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to leave team');
      }
    } catch (error) {
      console.error('Error leaving team:', error);
      toast.error('Failed to leave team');
    }
  };

  // Regular users are auto-approved and should have view access to leaderboard
  const userType = user?.user_type || (user as any)?.user_type || '';
  const isRegularUser = userType === 'regular' || userType === 'regular_user';
  const canView = !isAuthenticated || isRegularUser || user?.is_approved || user?.is_admin;
  
  if (!canView) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Leaderboard</h1>
          <div className="w-6" /> {/* Spacer */}
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        />

        {/* Main content */}
        <div className="flex-1 lg:ml-0">
          <div className="p-3 sm:p-4 lg:p-6">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <TrophyIcon className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Leaderboard
                  </h1>
                </div>
              </div>
              <p className="text-sm sm:text-base text-gray-600">
                Track your clinic's performance and compete with other medical professionals.
              </p>
            </div>

            {/* Tier Information */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Tier System</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                {tiers.map((tier) => (
                  <div key={tier.name} className="card">
                    <div className="card-body text-center p-3 sm:p-4">
                      <div className="text-2xl sm:text-3xl mb-2">{tier.icon}</div>
                      <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">{tier.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-2 font-medium">
                        {tier.description}
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed">{tier.benefits}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current User Tier - Moved to Top (Only for doctors) */}
            {user && user.user_type === 'doctor' && (
              <div className="mb-6 sm:mb-8">
                <div className="card bg-primary-50 border-primary-200">
                  <div className="card-body p-3 sm:p-4">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                      <TrophyIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                      <h3 className="text-base sm:text-lg font-semibold text-primary-900">
                        Your Current Tier
                      </h3>
                    </div>
                    
                    {isLoading ? (
                      <div className="text-center py-4">
                        <div className="loading-spinner w-6 h-6 mx-auto mb-2"></div>
                        <span className="text-gray-600">Loading your tier...</span>
                      </div>
                    ) : leaderboard.length > 0 ? (
                    
                    <div className="text-center">
                      {(() => {
                        const userEntry = leaderboard.find(entry => entry.doctor_id === user.doctor_id);
                        // Show team tier if user is in a team, otherwise show individual tier
                        // Check if userTeam exists and has a tier property (more robust check)
                        const hasTeam = userTeam && userTeam.tier;
                        const currentTier = hasTeam ? userTeam.tier : (userEntry?.tier || 'Lead Starter');
                        const isTeamTier = !!hasTeam;
                        const currentTierConfig = tiers.find(t => t.name === currentTier);
                        return (
                          <div>
                            <div className={`inline-flex items-center px-3 sm:px-4 py-2 rounded-full text-sm sm:text-lg font-medium border ${getTierColorClass(currentTier)}`}>
                              <span className="mr-2 text-lg sm:text-xl">{getTierIcon(currentTier)}</span>
                              <span className="truncate">
                                {isTeamTier ? (currentTier.startsWith('Team ') ? currentTier : `Team ${currentTier}`) : currentTier}
                              </span>
                            </div>
                            
                            {/* Encouraging Message */}
                            {currentTierConfig?.achievement_message && (
                              <div className="mt-3 text-center">
                                <p className="text-sm sm:text-base text-gray-700 font-medium">
                                  {currentTierConfig.achievement_message}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      
                      {/* User's Progress Bar */}
                      {leaderboard.length > 0 && (() => {
                        const userEntry = leaderboard.find(entry => entry.doctor_id === user.doctor_id);
                        // Use team data if user is in a team, otherwise use individual data
                        const progressData = userTeam ? {
                          tier_progress: userTeam.tier_progress || 0,
                          next_tier: userTeam.next_tier,
                          remaining_amount: userTeam.remaining_amount || 0
                        } : userEntry;
                        
                        return progressData && progressData.tier_progress !== undefined ? (
                          <div className="mt-4">
                            {/* Motivational Message */}
                            <MotivationalMessage
                              tierProgress={progressData.tier_progress}
                              nextTier={progressData.next_tier}
                              remainingAmount={progressData.remaining_amount || 0}
                              isAdmin={isAdminView}
                              currentTierConfig={tiers.find(t => t.name === (userTeam?.tier || userEntry?.tier || 'Lead Starter'))}
                            />
                            
                            <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-2">
                              <span className="truncate">
                                {progressData.next_tier 
                                  ? `Progress to ${progressData.next_tier}` 
                                  : 'Maximum tier achieved!'
                                }
                              </span>
                              <span className="flex-shrink-0 ml-2">{(Number(progressData.tier_progress) || 0).toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                              <div
                                className="bg-primary-600 h-2 sm:h-3 rounded-full transition-all duration-300"
                                style={{ width: `${Number(progressData.tier_progress) || 0}%` }}
                              />
                            </div>
                            {progressData.next_tier && progressData.remaining_amount !== undefined && (
                              <div className="mt-2 text-xs sm:text-sm text-gray-600">
                                {isAdminView ? (
                                  <span>Need {progressData.remaining_amount.toLocaleString()} PKR more to reach {progressData.next_tier}</span>
                                ) : (
                                  <span>Keep ordering to reach {progressData.next_tier}!</span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}

                      {/* Team Forming Section */}
                      <div className="mt-6 pt-4 border-t border-primary-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <UserGroupIcon className="w-5 h-5 text-primary-600" />
                            <h4 className="text-sm font-medium text-primary-900">Team Forming</h4>
                          </div>
                          {userTeam && (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>Team: {userTeam.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Team Forming Options */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {/* Only show invite button if user is team leader or doesn't have a team */}
                          {(() => {
                            // Check if user is team leader
                            // Backend returns: team.leader.id (UUID) and members with is_leader flag
                            const isTeamLeader = userTeam && (
                              // Check if user is the team leader by comparing leader.id
                              (userTeam.leader && (userTeam.leader.id === user?.id)) ||
                              // Or check if any member has is_leader flag and matches user
                              userTeam.members?.find((m: any) => {
                                if (!m.is_leader) return false;
                                // Check various ID fields for compatibility
                                return (m.id === user?.id || 
                                        m.doctor_id === user?.id || 
                                        m.doctor?.id === user?.id ||
                                        m.doctor_id === user?.doctor_id || 
                                        m.doctor?.doctor_id === user?.doctor_id);
                              })
                            );
                            
                            // Show button if: no team OR user is team leader
                            return (!userTeam || isTeamLeader);
                          })() && (
                            <button
                              onClick={() => {
                                if (userTeam) {
                                  // If user is team leader, show invitation form
                                  setShowInviteForm(true);
                                  setShowReceivedInvitations(false);
                                } else {
                                  // If user doesn't have a team, toggle between create team and invitation form
                                  setShowInviteForm(!showInviteForm);
                                  setShowReceivedInvitations(false);
                                }
                              }}
                              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                showInviteForm 
                                  ? 'bg-primary-100 text-primary-800 border-primary-300' 
                                  : 'bg-white text-primary-600 border-primary-200 hover:bg-primary-50'
                              }`}
                            >
                              {userTeam ? 'Invite to Team' : 'Create Team'}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setShowReceivedInvitations(!showReceivedInvitations);
                              setShowInviteForm(false);
                            }}
                            className={`px-3 py-1 text-xs rounded-full border transition-colors relative ${
                              showReceivedInvitations 
                                ? 'bg-primary-100 text-primary-800 border-primary-300' 
                                : 'bg-white text-primary-600 border-primary-200 hover:bg-primary-50'
                            }`}
                          >
                            Received Invitations
                            {teamInvitations.length > 0 && (
                              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                {teamInvitations.length}
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Current Team Display - Click to Expand */}
                        {userTeam && (
                          <div 
                            className="bg-white rounded-lg border border-primary-200 mb-4 transition-all duration-300 ease-in-out overflow-hidden hover:shadow-md"
                            onMouseLeave={() => setIsTeamDisplayExpanded(false)}
                          >
                            {/* Collapsed State - Always Visible */}
                            <div 
                              className="p-3 flex items-center justify-between cursor-pointer"
                              onClick={() => setIsTeamDisplayExpanded(!isTeamDisplayExpanded)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                  <UserGroupIcon className="w-4 h-4 text-primary-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">Your Team: {userTeam.name}</div>
                                  <div className="text-xs text-gray-500">{userTeam.members?.length || 0} members • Combined Total</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-medium text-primary-700">
                                  {userTeam.members?.find((m: any) => m.is_leader)?.doctor_name || 'Unknown'}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {isTeamDisplayExpanded ? 'Click to collapse' : 'Click to expand'}
                                </div>
                              </div>
                            </div>
                            
                            {/* Expanded State - Visible when clicked */}
                            <div 
                              className={`px-3 pb-3 transition-all duration-300 ease-in-out overflow-hidden ${
                                isTeamDisplayExpanded ? 'max-h-96' : 'max-h-0'
                              }`}
                            >
                              <div className="border-t border-primary-200 pt-3">
                                <div className="space-y-2 mb-3">
                                  {userTeam.members?.map((member: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between text-xs">
                                      <div>
                                        <span className="font-medium">{member.doctor_name}</span>
                                        <span className="text-gray-500 ml-2">({member.clinic_name})</span>
                                      </div>
                                      <span className={`px-2 py-1 rounded-full text-xs ${
                                        member.is_leader ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {member.is_leader ? 'Leader' : 'Member'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            {/* Team Benefits Calculator - Click to Expand */}
                            <div 
                              className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 transition-all duration-300 ease-in-out overflow-hidden hover:shadow-md"
                              onMouseLeave={() => setIsBenefitsExpanded(false)}
                            >
                              {/* Collapsed State - Always Visible */}
                              <div 
                                className="p-3 flex items-center justify-between cursor-pointer"
                                onClick={() => setIsBenefitsExpanded(!isBenefitsExpanded)}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <TrophyIcon className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium text-blue-900">Team Benefits Calculator</div>
                                    <div className="text-xs text-blue-700">
                                      {isBenefitsExpanded ? 'Click to collapse' : 'Click to expand'}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-medium text-green-700">
                                    {userTeam.members?.length || 0} Members
                                  </div>
                                  <div className="text-xs text-gray-600">Team Size</div>
                                </div>
                              </div>
                              
                              {/* Expanded State - Visible when clicked */}
                              <div 
                                className={`px-3 pb-3 transition-all duration-300 ease-in-out overflow-hidden ${
                                  isBenefitsExpanded ? 'max-h-96' : 'max-h-0'
                                }`}
                              >
                                <div className="border-t border-blue-200 pt-3">
                                  <div className="space-y-3">
                                    <div className="text-center">
                                      <div className="text-sm font-medium text-blue-900 mb-2">Team Benefits</div>
                                      <div className="text-xs text-gray-600">
                                        Your team's combined total cost provides greater rewards!
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                      <div className="text-center p-2 bg-green-50 rounded-lg">
                                        <div className="font-medium text-green-700">Team Discount</div>
                                        <div className="text-gray-600">Up to 10% off</div>
                                      </div>
                                      <div className="text-center p-2 bg-blue-50 rounded-lg">
                                        <div className="font-medium text-blue-700">Combined Power</div>
                                        <div className="text-gray-600">Shared benefits</div>
                                      </div>
                                      <div className="text-center p-2 bg-purple-50 rounded-lg">
                                        <div className="font-medium text-purple-700">Team Tier</div>
                                        <div className="text-gray-600">{userTeam.tier || 'Calculating...'}</div>
                                      </div>
                                      <div className="text-center p-2 bg-yellow-50 rounded-lg">
                                        <div className="font-medium text-yellow-700">Special Rewards</div>
                                        <div className="text-gray-600">Exclusive perks</div>
                                      </div>
                                    </div>
                                    
                                    <div className="text-center text-xs text-gray-500">
                                      💡 The more you collaborate, the more you save!
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Leave Team Button */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <button
                                onClick={() => setShowLeaveTeamModal(true)}
                                className="w-full px-3 py-2 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200 transition-colors"
                              >
                                Leave Team
                              </button>
                              <p className="text-xs text-gray-500 mt-1 text-center">
                                You will become a solo doctor and lose team benefits
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Invite to Team Section - Click to Expand */}
                        {showInviteForm && (
                          <div 
                            className="bg-white rounded-lg border border-primary-200 mb-4 transition-all duration-300 ease-in-out overflow-hidden hover:shadow-md"
                            onMouseLeave={() => setIsInviteFormExpanded(false)}
                          >
                            {/* Collapsed State - Always Visible */}
                            <div 
                              className="p-3 flex items-center justify-between cursor-pointer"
                              onClick={() => setIsInviteFormExpanded(!isInviteFormExpanded)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                  <PlusIcon className="w-4 h-4 text-primary-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">Invite Team Members</div>
                                  <div className="text-xs text-gray-500">
                                    {!userTeam ? 'Create team to invite members' : `Invite to ${userTeam.name}`}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-medium text-primary-700">
                                  {!userTeam ? 'No Team' : `${userTeam.members?.length || 1}/3 members`}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {isInviteFormExpanded ? 'Click to collapse' : 'Click to expand'}
                                </div>
                              </div>
                            </div>
                            
                            {/* Expanded State - Visible when clicked */}
                            <div 
                              className={`px-3 pb-3 transition-all duration-300 ease-in-out overflow-hidden ${
                                isInviteFormExpanded ? 'max-h-96' : 'max-h-0'
                              }`}
                            >
                              <div className="border-t border-primary-200 pt-3">
                                {!userTeam ? (
                                  <div className="text-center py-4">
                                    <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                    <p className="text-xs text-gray-500 mb-3">You need to create a team first</p>
                                    <button
                                      onClick={openTeamNameModal}
                                      disabled={isInviting}
                                      className="px-4 py-2 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center mx-auto"
                                    >
                                      {isInviting ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                      ) : (
                                        <PlusIcon className="w-3 h-3 mr-2" />
                                      )}
                                      Create Team
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                                      <p className="text-xs text-green-800">
                                        ✅ <strong>Team "{userTeam.name}" created!</strong> You can now invite other doctors to join your team.
                                      </p>
                                    </div>
                                    <div className="relative" ref={suggestionRef}>
                                      <div className="flex space-x-2">
                                        <div className="relative flex-1">
                                          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                          <input
                                            type="text"
                                            value={inviteEmail}
                                            onChange={(e) => handleInviteInputChange(e.target.value)}
                                            onFocus={() => inviteEmail.length >= 2 && setShowSuggestions(doctorSuggestions.length > 0)}
                                            placeholder="Search by name, clinic, or email..."
                                            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                          />
                                          {isLoadingSuggestions && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600"></div>
                                            </div>
                                          )}
                                        </div>
                                        <button
                                          onClick={sendTeamInvitation}
                                          disabled={isInviting || !inviteEmail.trim()}
                                          className="px-3 py-2 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
                                        >
                                          {isInviting ? (
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                          ) : (
                                            <PlusIcon className="w-3 h-3" />
                                          )}
                                        </button>
                                      </div>
                                      
                                      {/* Doctor Suggestions Dropdown */}
                                      {showSuggestions && doctorSuggestions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                          {doctorSuggestions.map((doctor, index) => (
                                            <button
                                              key={doctor.id || index}
                                              onClick={() => selectDoctorFromSuggestions(doctor)}
                                              className="w-full px-3 py-2 text-left hover:bg-primary-50 border-b border-gray-100 last:border-b-0 transition-colors"
                                            >
                                              <div className="flex items-center space-x-2">
                                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-semibold">
                                                  {(doctor.doctor_name || doctor.name || 'D')[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-xs font-medium text-gray-900 truncate">
                                                    {doctor.doctor_name || doctor.name || 'Unknown'}
                                                  </p>
                                                  <p className="text-xs text-gray-500 truncate">
                                                    {doctor.clinic_name || 'No clinic'} • {doctor.email}
                                                  </p>
                                                </div>
                                              </div>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs text-gray-500">Maximum {teamMaxMembers} team members allowed</p>
                                      </div>
                                      <p className="text-xs text-gray-500">
                                        Search by doctor name, clinic name, or email address
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Received Invitations Section - Click to Expand */}
                        {showReceivedInvitations && (
                          <div 
                            className="bg-white rounded-lg border border-primary-200 transition-all duration-300 ease-in-out overflow-hidden hover:shadow-md"
                            onMouseLeave={() => setIsReceivedInvitationsExpanded(false)}
                          >
                            {/* Collapsed State - Always Visible */}
                            <div 
                              className="p-3 flex items-center justify-between cursor-pointer"
                              onClick={() => setIsReceivedInvitationsExpanded(!isReceivedInvitationsExpanded)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <UserGroupIcon className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">Received Invitations</div>
                                  <div className="text-xs text-gray-500">
                                    {teamInvitations.length > 0 ? `${teamInvitations.length} pending` : 'No invitations'}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-medium text-green-700">
                                  {teamInvitations.length > 0 ? `${teamInvitations.length} new` : '0'}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {isReceivedInvitationsExpanded ? 'Click to collapse' : 'Click to expand'}
                                </div>
                              </div>
                            </div>
                            
                            {/* Expanded State - Visible when clicked */}
                            <div 
                              className={`px-3 pb-3 transition-all duration-300 ease-in-out overflow-hidden ${
                                isReceivedInvitationsExpanded ? 'max-h-96' : 'max-h-0'
                              }`}
                            >
                              <div className="border-t border-primary-200 pt-3">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="text-sm font-medium text-gray-900">Manage Invitations</h5>
                                  {teamInvitations.length > 0 && (
                                    <div className="relative">
                                      <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search by name, clinic, email..."
                                        className="w-48 px-3 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                      />
                                    </div>
                                  )}
                                </div>
                            
                        {teamInvitations.length > 0 ? (
                          <div className="space-y-3 max-h-48 overflow-y-auto">
                            {teamInvitations
                              .filter(invitation => {
                                if (!searchTerm) return true;
                                const search = searchTerm.toLowerCase();
                                return (
                                  invitation.from_doctor_name?.toLowerCase().includes(search) ||
                                  invitation.from_clinic_name?.toLowerCase().includes(search) ||
                                  invitation.team_name?.toLowerCase().includes(search)
                                );
                              })
                              .map((invitation) => (
                                <div key={invitation.id} className="border border-gray-200 rounded-lg bg-white shadow-sm transition-all duration-300 ease-in-out overflow-hidden group hover:shadow-md">
                                  {/* Collapsed State - Always Visible */}
                                  <div className="p-3 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                        <UserGroupIcon className="w-5 h-5 text-primary-600" />
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-900">{invitation.from_doctor_name}</div>
                                        <div className="text-sm text-gray-500">{invitation.team_name}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {invitation.from_tier && (
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          invitation.from_tier === 'Elite Lead' ? 'bg-red-100 text-red-800' :
                                          invitation.from_tier === 'Grand Lead' ? 'bg-purple-100 text-purple-800' :
                                          invitation.from_tier === 'Lead Expert' ? 'bg-blue-100 text-blue-800' :
                                          invitation.from_tier === 'Lead Contributor' ? 'bg-green-100 text-green-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {invitation.from_tier}
                                        </span>
                                      )}
                                      <div className="flex flex-col space-y-1">
                                        <button
                                          onClick={() => showAcceptConfirmationModal(invitation)}
                                          className="w-6 h-6 bg-green-500 text-white rounded hover:bg-green-600 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                          title="Accept invitation"
                                        >
                                          <CheckIcon className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => rejectTeamInvitation(invitation.id)}
                                          className="w-6 h-6 bg-red-500 text-white rounded hover:bg-red-600 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                          title="Reject invitation"
                                        >
                                          <XMarkIcon className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Expanded State - Visible on Hover */}
                                  <div className="px-3 pb-3 max-h-0 group-hover:max-h-96 transition-all duration-300 ease-in-out overflow-hidden">
                                    <div className="border-t border-gray-100 pt-3 space-y-3">
                                      <div className="text-sm text-gray-600">
                                        <strong>Clinic:</strong> {invitation.from_clinic_name}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        <strong>Position:</strong> {invitation.from_rank}
                                      </div>
                                      {invitation.message && (
                                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border-l-4 border-primary-200">
                                          <strong>Message:</strong> "{invitation.message}"
                                        </div>
                                      )}
                                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="text-sm font-medium text-blue-900 mb-1">Team Benefits:</div>
                                        <div className="text-xs text-blue-800 space-y-1">
                                          <div>• 10% discount on tier pricing</div>
                                          <div>• Combined sales for faster progression</div>
                                          <div>• Team recognition on leaderboard</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p className="text-xs">No team invitations received</p>
                              </div>
                            )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    ) : (
                      <div className="text-center py-4">
                        <span className="text-gray-600">Unable to load tier information</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="loading-spinner w-8 h-8"></div>
                <span className="ml-3 text-gray-600">Loading leaderboard...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Current Rankings</h2>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {/* Inline Search Input */}
                    <div className="relative flex-1 sm:flex-initial">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={leaderboardSearchTerm}
                        onChange={(e) => setLeaderboardSearchTerm(e.target.value)}
                        placeholder="Search by name, clinic, tier, or team..."
                        className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {leaderboardSearchTerm && (
                        <button
                          onClick={() => setLeaderboardSearchTerm('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {/* Jump to My Position Button - Works for both individual and team */}
                    {user && (leaderboard.some(entry => entry.doctor_id === user.doctor_id) || (userTeam && leaderboard.some(entry => entry.is_team && entry.team_name === userTeam.name))) && (
                      <button
                        onClick={() => {
                          // Priority: Individual position first (individual profiles remain even if part of team)
                          if (userEntryRef.current) {
                            userEntryRef.current.scrollIntoView({ 
                              behavior: 'smooth', 
                              block: 'center' 
                            });
                            return;
                          }
                          
                          // Fallback: Team position (if user is part of a team)
                          if (userTeam && teamEntryRef.current) {
                            teamEntryRef.current.scrollIntoView({ 
                              behavior: 'smooth', 
                              block: 'center' 
                            });
                            return;
                          }
                          
                          toast.error('Your position not found in current view');
                        }}
                        className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center whitespace-nowrap"
                        title="Jump to your position (individual or team)"
                      >
                        <TrophyIcon className="w-4 h-4 mr-2" />
                        Jump to My Position
                      </button>
                    )}
                  </div>
                </div>
                
                {leaderboard
                  .filter((entry) => {
                    if (!leaderboardSearchTerm.trim()) return true;
                    const search = leaderboardSearchTerm.toLowerCase();
                    return (
                      entry.doctor_name?.toLowerCase().includes(search) ||
                      entry.clinic_name?.toLowerCase().includes(search) ||
                      entry.tier?.toLowerCase().includes(search) ||
                      entry.team_name?.toLowerCase().includes(search)
                    );
                  })
                  .map((entry, index) => {
                  // Individual profiles remain even if user is part of a team (both are shown)
                  const isCurrentUser = user && entry.doctor_id === user.doctor_id;
                  const isCurrentUserTeam = userTeam && entry.is_team && entry.team_name === userTeam.name;
                  
                  // Set refs for both individual and team entries (if user is part of team, both refs are set)
                  let entryRef = null;
                  if (isCurrentUser) {
                    entryRef = userEntryRef;
                  } else if (isCurrentUserTeam) {
                    entryRef = teamEntryRef;
                  }
                  
                  return (
                  <div
                    key={entry.id}
                    ref={entryRef}
                    className={`
                      card transition-all duration-200 hover:shadow-medium
                      ${index < 3 ? 'ring-2 ring-yellow-200' : ''}
                      ${isCurrentUser || isCurrentUserTeam ? 'ring-2 ring-blue-500 bg-blue-50 border-l-4 border-blue-500' : ''}
                    `}
                  >
                    <div className="card-body p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                        {/* Rank and Doctor Info */}
                        <div className="flex items-center space-x-2 sm:space-x-4">
                          <div className={`
                            w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-xs sm:text-lg flex-shrink-0
                            ${index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                              index === 1 ? 'bg-gray-100 text-gray-800' : 
                              index === 2 ? 'bg-orange-100 text-orange-800' : 
                              'bg-gray-50 text-gray-600'}
                          `}>
                            <span className="text-xs sm:text-base">{getOrdinalPosition(index + 1)}</span>
                          </div>

                          {/* Doctor Info */}
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                              {getProfileImageUrl(entry.profile_photo_url) ? (
                                <img
                                  src={getProfileImageUrl(entry.profile_photo_url)!}
                                  alt={entry.doctor_name}
                                  className="w-8 h-8 sm:w-12 sm:h-12 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] sm:text-sm font-bold text-primary-600">
                                  {entry.doctor_name ? entry.doctor_name.split(' ').map(n => n[0]).join('') : 'DR'}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
                                <h3 className="font-semibold text-gray-900 text-xs sm:text-base truncate">
                                  {entry.doctor_name}
                                </h3>
                                {(isCurrentUser || isCurrentUserTeam) && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                                    {isCurrentUserTeam ? 'Your Team' : 'You'}
                                  </span>
                                )}
                                {entry.is_team && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                                    Team
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] sm:text-sm text-gray-600 truncate">
                                {entry.clinic_name}
                              </p>
                              {entry.is_team && (
                                <div className="mt-1">
                                  <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
                                    <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs bg-blue-100 text-blue-800">
                                      {entry.team_name || 'Team'}
                                    </span>
                                    {entry.is_leader && (
                                      <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs bg-yellow-100 text-yellow-800">
                                        👑 Leader
                                      </span>
                                    )}
                                  </div>
                                  {entry.team_members && entry.team_members.length > 0 && (
                                    <div className="mt-1">
                                      <p className="text-[10px] sm:text-xs text-gray-500">Team Members:</p>
                                      <div className="flex flex-wrap gap-1 mt-0.5 sm:mt-1">
                                        {entry.team_members.map((member: any, memberIndex: number) => (
                                          <span 
                                            key={memberIndex}
                                            className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs bg-gray-100 text-gray-700"
                                          >
                                            {member.doctor_name}
                                            {member.is_leader && (
                                              <span className="ml-0.5 sm:ml-1 text-yellow-600">👑</span>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tier and Sales (Admin View) or Tier Only (User View) */}
                        <div className="text-left sm:text-right mt-2 sm:mt-0">
                          <div className={`inline-flex items-center px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-sm font-medium border ${getTierColorClass(entry.tier)} mb-1 sm:mb-2`}>
                            <span className="mr-0.5 sm:mr-2 text-xs sm:text-base">{getTierIcon(entry.tier)}</span>
                            <span className="truncate">
                              {entry.is_team ? (entry.tier.startsWith('Team ') ? entry.tier : `Team ${entry.tier}`) : entry.tier}
                            </span>
                          </div>
                          {isAdminView && (entry as any).current_sales !== undefined && (
                            <>
                              <p className="text-sm sm:text-lg font-bold text-gray-900">
                                {entry.is_team ? 'Combined Team Total' : formatCurrency((entry as any).current_sales)}
                              </p>
                              <p className="text-[10px] sm:text-sm text-gray-500">
                                {entry.is_team ? 'All Members Combined' : 'Total Sales'}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                            {/* Progress Bar (Always show for users, with sales data for admins) */}
                            {entry.tier_progress !== undefined && (
                              <div className="mt-2 sm:mt-4">
                                <div className="flex items-center justify-between text-[10px] sm:text-sm text-gray-600 mb-1 sm:mb-2">
                                  <span className="truncate">
                                    {entry.next_tier 
                                      ? `Progress to ${entry.next_tier}` 
                                      : 'Maximum tier achieved!'
                                    }
                                  </span>
                                  <span className="flex-shrink-0 ml-1 sm:ml-2 text-[10px] sm:text-xs">{(Number(entry.tier_progress) || 0).toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                                  <div
                                    className="bg-primary-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Number(entry.tier_progress) || 0}%` }}
                                  />
                                </div>
                                {entry.next_tier && entry.remaining_amount !== undefined && (
                                  <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-500">
                                    {isAdminView ? (
                                      <span>Need {entry.remaining_amount.toLocaleString()} PKR more to reach {entry.next_tier}</span>
                                    ) : (
                                      <span>Keep ordering to reach {entry.next_tier}!</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                    </div>
                  </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Team Name Modal */}
      {showTeamNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Create Team</h2>
                <button
                  onClick={() => {
                    setShowTeamNameModal(false);
                    setTeamName('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value.slice(0, 50))}
                  placeholder="Enter your team name..."
                  maxLength={50}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      createTeam();
                    }
                  }}
                  autoFocus
                />
                <div className="text-xs text-gray-500 mt-1">
                  {teamName.length}/50 characters
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Examples:</p>
                  <div className="flex flex-wrap gap-1">
                    {['Elite Medical Team', 'Top Performers', 'Champions League', 'Dream Team'].map((example) => (
                      <button
                        key={example}
                        onClick={() => setTeamName(example)}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Team Benefits</h3>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• 10% discount on tier pricing</li>
                  <li>• Combined sales for faster progression</li>
                  <li>• Team recognition on leaderboard</li>
                  <li>• Maximum 3 members per team</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowTeamNameModal(false);
                    setTeamName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createTeam}
                  disabled={isInviting || !teamName.trim()}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isInviting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Team'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accept Confirmation Modal */}
      {showAcceptConfirmation && selectedInvitation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Confirm Team Invitation</h2>
                <button
                  onClick={() => {
                    setShowAcceptConfirmation(false);
                    setSelectedInvitation(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-3">
                  Are you sure you want to accept the invitation to join <strong>{selectedInvitation.team_name}</strong>?
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Invitation Details:</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>From:</strong> {selectedInvitation.from_doctor_name}</p>
                    <p><strong>Clinic:</strong> {selectedInvitation.from_clinic_name}</p>
                    <p><strong>Tier:</strong> {selectedInvitation.from_tier}</p>
                    <p><strong>Position:</strong> {selectedInvitation.from_rank}</p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-red-900 mb-2">⚠️ Important Notice</h3>
                  <p className="text-sm text-red-800">
                    Once you accept this invitation, you cannot leave the team without admin approval. 
                    If you need to separate from the team later, you must request admin review via email.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowAcceptConfirmation(false);
                    setSelectedInvitation(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={acceptTeamInvitation}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Accept Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Search Modal */}
      {showInviteSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Search Users to Invite</h2>
                <button
                  onClick={() => {
                    setShowInviteSearchModal(false);
                    setInviteSearchQuery('');
                    setInviteSearchResults([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Search for doctors to invite to your team. You can search by:
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Doctor Name</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Email Address</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Clinic Name</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Tier Level</span>
                </div>
              </div>
              
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  value={inviteSearchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setInviteSearchQuery(value);
                    
                    // Clear existing timeout
                    if (searchTimeout) {
                      clearTimeout(searchTimeout);
                    }
                    
                    // Set new timeout for auto-search
                    if (value.trim().length >= 2) {
                      const timeout = setTimeout(async () => {
                        try {
                          const token = getAccessToken();
                          if (!token) return;

                          const response = await fetch(`${getApiUrl()}/search?q=${encodeURIComponent(value.trim())}`, {
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          });

                          if (response.ok) {
                            const data = await response.json();
                            const results = data.results || [];
                            setInviteSearchResults(results);
                            
                            // Show popup if no results found
                            if (results.length === 0) {
                              setNoResultsQuery(value.trim());
                              setShowNoResultsModal(true);
                            }
                          }
                        } catch (error) {
                          console.error('Error in auto-search:', error);
                        }
                      }, 500); // 500ms delay
                      setSearchTimeout(timeout);
                    } else {
                      setInviteSearchResults([]);
                    }
                  }}
                  placeholder="Enter doctor name, email, clinic name, or tier..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      if (searchTimeout) {
                        clearTimeout(searchTimeout);
                      }
                      performInviteSearch();
                    }
                  }}
                />
                <button
                  onClick={performInviteSearch}
                  disabled={isInviteSearching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {isInviteSearching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <MagnifyingGlassIcon className="w-4 h-4" />
                  )}
                </button>
              </div>

              {inviteSearchResults.length > 0 && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <h3 className="text-sm font-medium text-gray-700">Search Results</h3>
                  {inviteSearchResults.map((result, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{result.name}</h4>
                          <p className="text-sm text-gray-600">{result.type} • {result.details}</p>
                          {result.tier && (
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                              result.tier === 'Elite Lead' ? 'bg-red-100 text-red-800' :
                              result.tier === 'Grand Lead' ? 'bg-purple-100 text-purple-800' :
                              result.tier === 'Lead Expert' ? 'bg-blue-100 text-blue-800' :
                              result.tier === 'Lead Contributor' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {result.tier}
                            </span>
                          )}
                        </div>
                        {result.email && (
                          <button
                            onClick={() => {
                              setInviteEmail(result.email);
                              setShowInviteSearchModal(false);
                              setShowInviteForm(true);
                            }}
                            className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg hover:bg-blue-200"
                          >
                            Invite
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {inviteSearchQuery && inviteSearchResults.length === 0 && !isInviteSearching && (
                <div className="text-center py-8 text-gray-500">
                  <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="mb-2">No results found for "{inviteSearchQuery}"</p>
                  <p className="text-xs text-gray-400 mb-3">Try searching with different terms:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Doctor Name</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Email</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Clinic Name</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Tier</span>
                  </div>
                </div>
              )}

              {!inviteSearchQuery && (
                <div className="text-center py-8 text-gray-500">
                  <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="mb-2">Search for doctors to invite</p>
                  <p className="text-xs text-gray-400 mb-3">Example searches:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => setInviteSearchQuery('Dr. Sarah')}
                      className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded hover:bg-blue-200"
                    >
                      Dr. Sarah
                    </button>
                    <button
                      onClick={() => setInviteSearchQuery('Elite Medical')}
                      className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded hover:bg-green-200"
                    >
                      Elite Medical
                    </button>
                    <button
                      onClick={() => setInviteSearchQuery('Expert')}
                      className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded hover:bg-purple-200"
                    >
                      Expert
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No Results Found Modal */}
      {showNoResultsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">No Results Found</h2>
                <button
                  onClick={() => {
                    setShowNoResultsModal(false);
                    setNoResultsQuery('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                  <MagnifyingGlassIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No doctors found</h3>
                <p className="text-sm text-gray-600 mb-4">
                  No doctors were found matching your search for: <strong>"{noResultsQuery}"</strong>
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Search Tips:</h4>
                  <ul className="text-sm text-blue-800 space-y-1 text-left">
                    <li>• Try searching by doctor's name (e.g., "Dr. Sarah")</li>
                    <li>• Search by clinic name (e.g., "Elite Medical")</li>
                    <li>• Search by tier level (e.g., "Expert", "Elite")</li>
                    <li>• Make sure the email address is correct</li>
                    <li>• The doctor must be registered on the platform</li>
                  </ul>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowNoResultsModal(false);
                      setNoResultsQuery('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      setShowNoResultsModal(false);
                      setNoResultsQuery('');
                      setInviteSearchQuery('');
                      setInviteSearchResults([]);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Invitation Modal */}
      {showDuplicateInvitationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Invitation Already Sent</h2>
                <button
                  onClick={() => {
                    setShowDuplicateInvitationModal(false);
                    setDuplicateInvitationEmail('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
                  <CheckIcon className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Invitation Already Sent</h3>
                <p className="text-sm text-gray-600 mb-4">
                  You have already sent a team invitation to: <strong>{duplicateInvitationEmail}</strong>
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">What happens next?</h4>
                  <ul className="text-sm text-blue-800 space-y-1 text-left">
                    <li>• The doctor will receive an email notification</li>
                    <li>• They can accept or decline your invitation</li>
                    <li>• You'll be notified when they respond</li>
                    <li>• Please wait for their response before sending another invitation</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2">💡 Tip</h4>
                  <p className="text-sm text-yellow-800">
                    You can check your sent invitations in the "Received Invitations" section to see the status of all your pending invitations.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDuplicateInvitationModal(false);
                      setDuplicateInvitationEmail('');
                      setInviteEmail('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowDuplicateInvitationModal(false);
                      setDuplicateInvitationEmail('');
                      setShowReceivedInvitations(true);
                      setShowInviteForm(false);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Invitations
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Full Modal */}
      {showTeamFullModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Team is Full</h2>
                <button
                  onClick={() => setShowTeamFullModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  <UserGroupIcon className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Maximum Team Size Reached</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your team has reached the maximum limit of <strong>{teamMaxMembers} members</strong>.
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-red-900 mb-2">⚠️ Cannot Add More Members</h4>
                  <p className="text-sm text-red-800">
                    You cannot invite additional members to your team at this time. The team has reached its maximum capacity.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">💡 What You Can Do</h4>
                  <ul className="text-sm text-blue-800 space-y-1 text-left">
                    <li>• Wait for a team member to leave</li>
                    <li>• Contact an admin if you need to adjust team size limits</li>
                    <li>• Cancel any pending invitations if you want to invite someone else</li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setShowTeamFullModal(false);
                    setInviteEmail('');
                  }}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal - Removed: Using inline search instead */}
      {false && showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Search</h2>
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctors, clinics, teams..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      performSearch();
                    }
                  }}
                />
                <button
                  onClick={performSearch}
                  disabled={isSearching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <MagnifyingGlassIcon className="w-4 h-4" />
                  )}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <h3 className="text-sm font-medium text-gray-700">Search Results</h3>
                  {searchResults.map((result, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{result.name}</h4>
                          <p className="text-sm text-gray-600">{result.type} • {result.details}</p>
                          {result.tier && (
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                              result.tier === 'Elite Lead' ? 'bg-red-100 text-red-800' :
                              result.tier === 'Grand Lead' ? 'bg-purple-100 text-purple-800' :
                              result.tier === 'Lead Expert' ? 'bg-blue-100 text-blue-800' :
                              result.tier === 'Lead Contributor' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {result.tier}
                            </span>
                          )}
                        </div>
                        {result.email && (
                          <button
                            onClick={() => {
                              setInviteEmail(result.email);
                              setShowSearchModal(false);
                              setShowInviteForm(true);
                            }}
                            className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg hover:bg-blue-200"
                          >
                            Invite
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-8 text-gray-500">
                  <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No results found for "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Team Confirmation Modal */}
      {showLeaveTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Leave Team</h2>
                <button
                  onClick={() => setShowLeaveTeamModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <XMarkIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Are you sure you want to leave the team?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  You will lose all team benefits and become a solo doctor.
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-red-900 mb-2">⚠️ What this means:</h4>
                  <ul className="text-sm text-red-800 space-y-1 text-left">
                    <li>• You will lose all team benefits (10% discount, combined sales)</li>
                    <li>• Your tier will be based on your individual sales only</li>
                    <li>• You will be ranked as a solo doctor</li>
                    <li>• You can join or create a new team anytime</li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Note</h4>
                  <p className="text-sm text-blue-800">
                    If you are the team leader, leaving will dissolve the entire team and all members will become solo doctors.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowLeaveTeamModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowLeaveTeamModal(false);
                      leaveTeam();
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Leave Team
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

