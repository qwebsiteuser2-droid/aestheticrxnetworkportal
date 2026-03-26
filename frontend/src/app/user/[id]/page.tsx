'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { getAccessToken } from '@/lib/auth';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';
import { FaTrophy, FaMedal, FaCalendarAlt, FaTag, FaEdit, FaSave, FaTimes, FaPlus, FaMinus, FaDownload, FaEye, FaThumbsUp, FaAward, FaStar, FaRibbon, FaCrown, FaGem, FaChartLine, FaCheck, FaUser } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface ResearchPaper {
  id: string;
  title: string;
  category: string;
  views: number;
  upvotes: number;
  downloads: number;
  rating: number;
  published: string;
  description: string;
  tags: string[];
}

interface Medal {
  id: number;
  name: string;
  type: 'gold' | 'silver' | 'bronze' | 'platinum';
  month: string;
  year: number;
  description: string;
  icon: string;
}

interface Badge {
  id: number;
  name: string;
  type: 'achievement' | 'milestone' | 'special';
  earned_date: string;
  description: string;
  icon: string;
  color: string;
}

interface UserStats {
  // Basic Info
  id: string;
  doctor_id: number;
  name: string;
  email: string;
  clinic_name: string;
  whatsapp: string;
  bio: string;
  tags: string[];
  is_approved: boolean;
  is_admin: boolean;
  join_date: string;
  
  // Statistics
  total_research_papers: number;
  total_views: number;
  total_upvotes: number;
  average_rating: number;
  
  // Ranking & Progress
  tier: string;
  current_sales: number;
  tier_progress: number;
  leaderboard_position: number;
  total_doctors: number;
  
  // Progress to next rank
  next_rank: string;
  next_rank_score: number;
  progress_percentage: number;
  points_to_next_rank: number;
  
  // Medals & Badges
  gold_medals: number;
  silver_medals: number;
  bronze_medals: number;
  total_medals: number;
  achievement_badges: number;
  milestone_badges: number;
  special_badges: number;
  total_badges: number;
  
  // Monthly Performance
  is_top_3_monthly: boolean;
  monthly_rank: number;
  is_top_previous_month: boolean;
  previous_month_rank: number;
  
  // Research Papers Data
  research_papers: ResearchPaper[];
  
  // Medals Data
  medals: Medal[];
  
  // Badges Data
  badges: Badge[];

  // Certificates Data
  certificates: Array<{
    id: string;
    certificate_type: string;
  title: string;
    subtitle?: string;
  description: string;
    achievement?: string;
    tier_name?: string;
    rank?: number;
    month?: string;
    year?: number;
    status: string;
    issued_at?: string;
    verified_at?: string;
    certificate_url?: string;
    verification_code?: string;
    created_at?: string;
  }>;
  
  // Additional optional properties
  tier_color?: string;
  current_score?: number;
  user_type?: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuth();
  const userId = params.id as string;
  
  const [adminMode, setAdminMode] = useState(false);
  
  // State for data fetching
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Check if current user is admin or profile owner (after user state is declared)
  const isAdmin = currentUser?.is_admin === true;
  // Compare user IDs - check UUID from params first, then also check doctor_id if user data is loaded
  const isOwner = currentUser?.id === userId || 
                  (user?.id && currentUser?.id && String(currentUser.id) === String(user.id)) ||
                  (user?.doctor_id && currentUser?.doctor_id && currentUser.doctor_id === user.doctor_id);
  const canEdit = isAdmin || isOwner; // Only admins or profile owner can edit
  
  // Helper function to get certificate download URL
  const getCertificateDownloadUrl = (cert: any) => {
    const apiUrl = getApiUrl();
    // Use the new download endpoint that regenerates PDF dynamically
    return `${apiUrl}/certificates/download/${cert.id}`;
  };
  
  // Debug logging (remove in production)
  // Profile edit permission check (removed debug logging)
  
  // State for editable fields
  const [isEditingWhatsapp, setIsEditingWhatsapp] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isEditingClinic, setIsEditingClinic] = useState(false);
  const [clinicName, setClinicName] = useState('');
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [userTags, setUserTags] = useState<string[]>([]);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [userBio, setUserBio] = useState('');
  
  // State for section selection
  const [selectedSection, setSelectedSection] = useState('overview');

  // Check if current user is a regular user trying to access their own profile - redirect them
  useEffect(() => {
    if (currentUser && currentUser.id === userId) {
      // If current user is a regular user (not doctor) trying to access their own profile, redirect
      if (currentUser.user_type === 'regular' || currentUser.user_type === 'employee') {
        toast.error('Regular users do not have profiles. Only doctors have profiles.');
        router.push('/');
        return;
      }
    }
  }, [currentUser, userId, router]);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        // Use centralized API instance
        const response = await api.get(`/user-stats/${userId}`);
        
        if (!response.data.success) {
          const errorText = JSON.stringify(response.data);
          console.error('🔍 Error response:', errorText);
          throw new Error(`Failed to fetch user data: ${errorText}`);
        }
        
        const result = response.data;
        
        if (result.success) {
          // Check if the fetched user is a regular user (not doctor) - only doctors should have profiles
          if (result.data.user_type === 'regular' || result.data.user_type === 'employee') {
            // If current user is trying to view a regular user's profile, show error
            if (currentUser?.id === userId) {
              toast.error('Regular users do not have profiles. Only doctors have profiles.');
              router.push('/');
              return;
            } else {
              // If admin is viewing, allow it (admins can view all users)
              // But regular users shouldn't be able to view other regular users' profiles
              if (!currentUser?.is_admin) {
                toast.error('Regular users do not have profiles.');
                router.push('/');
                return;
              }
            }
          }
          
          setUser(result.data);
          setWhatsappNumber(result.data.whatsapp || '');
          setClinicName(result.data.clinic_name || '');
          setUserTags(result.data.tags || []);
          setUserBio(result.data.bio || '');
          } else {
          throw new Error(result.error || 'Failed to fetch user data');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user data');
        toast.error('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId, currentUser, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading user profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-red-500 text-4xl sm:text-6xl mb-4">⚠️</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Error Loading Profile</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">{error || 'User not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Handler functions
  const handleWhatsappSave = async () => {
    if (!canEdit) {
      toast.error('You do not have permission to edit this profile');
      return;
    }
    
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      // Use centralized API instance
      const response = await api.put(`/user-stats/${userId}`, {
        whatsapp: whatsappNumber
      });
        
      if (response.data.success) {
        const result = response.data;
        setIsEditingWhatsapp(false);
        toast.success('WhatsApp number updated successfully!');
        // Update the user state with the new value
        setUser(prev => prev ? ({ ...prev, whatsapp: whatsappNumber, id: prev.id || '' }) : null);
      } else {
        const errorData = response.data;
        console.error('Error updating WhatsApp:', errorData);
        toast.error(errorData.error || errorData.message || 'Failed to update WhatsApp number');
      }
    } catch (error: any) {
      console.error('Error updating WhatsApp:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update WhatsApp number';
      toast.error(errorMessage);
    }
  };

  const handleWhatsappCancel = () => {
    setWhatsappNumber(user.whatsapp);
    setIsEditingWhatsapp(false);
  };

  const handleClinicSave = async () => {
    if (!canEdit) {
      toast.error('You do not have permission to edit this profile');
        return;
      }
      
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      // Use centralized API instance
      const response = await api.put(`/user-stats/${userId}`, {
        clinic_name: clinicName
      });

      if (response.data.success) {
        setIsEditingClinic(false);
        toast.success('Clinic name updated successfully!');
        // Update the user state with the new value
        setUser(prev => prev ? ({ ...prev, clinic_name: clinicName, id: prev.id || '' }) : null);
      } else {
        const errorData = response.data;
        toast.error(errorData.error || errorData.message || 'Failed to update clinic name');
      }
    } catch (error: any) {
      console.error('Error updating clinic name:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update clinic name';
      toast.error(errorMessage);
    }
  };

  const handleClinicCancel = () => {
    setClinicName(user.clinic_name);
    setIsEditingClinic(false);
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !userTags.includes(tag) && userTags.length < 5) {
      setUserTags([...userTags, tag]);
      setNewTag('');
      toast.success('Tag added successfully!');
    } else if (userTags.length >= 5) {
      toast.error('Maximum 5 tags allowed');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setUserTags(userTags.filter(tag => tag !== tagToRemove));
    toast.success('Tag removed successfully!');
  };

  const handleTagsSave = async () => {
    if (!canEdit) {
      toast.error('You do not have permission to edit this profile');
      return;
    }
    
    // If there's a tag in the input field, add it before saving
    let tagsToSave = [...userTags];
    if (newTag.trim() && !tagsToSave.includes(newTag.trim()) && tagsToSave.length < 5) {
      tagsToSave.push(newTag.trim());
      setNewTag('');
    } else if (newTag.trim() && tagsToSave.includes(newTag.trim())) {
      toast.error('This tag already exists');
      return;
    } else if (newTag.trim() && tagsToSave.length >= 5) {
      toast.error('Maximum 5 tags allowed');
      return;
    }
    
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Use centralized API instance
      const response = await api.put(`/user-stats/${userId}`, {
        tags: tagsToSave
      });

      if (response.data.success) {
        const result = response.data;
        // Update tags from server response to ensure sync
        const updatedTags = result.data?.tags || tagsToSave;
        setUserTags(updatedTags);
        setNewTag(''); // Clear input field
        setIsEditingTags(false);
        toast.success('Tags updated successfully!');
        // Update the user state with the new tags
        setUser(prev => prev ? ({ ...prev, tags: updatedTags, id: prev.id || '' }) : null);
      } else {
        const errorData = response.data;
        toast.error(errorData.error || errorData.message || 'Failed to update tags');
      }
    } catch (error: any) {
      console.error('Error updating tags:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update tags';
      toast.error(errorMessage);
    }
  };

  const handleTagsCancel = () => {
    setUserTags(user.tags || []);
    setNewTag('');
    setIsEditingTags(false);
  };

  const handleBioSave = async () => {
    if (!canEdit) {
      toast.error('You do not have permission to edit this profile');
      return;
    }
    
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      // Use centralized API instance (axios)
      const response = await api.put(`/user-stats/${userId}`, {
        bio: userBio
      });

      // axios returns data directly in response.data
      if (response.data.success || response.status === 200) {
        setIsEditingBio(false);
        toast.success('Bio updated successfully!');
        setUser(prev => prev ? ({ ...prev, bio: userBio, id: prev.id || '' }) : null);
      } else {
        const errorData = response.data || {};
        toast.error(errorData.error || errorData.message || 'Failed to update bio');
      }
    } catch (error: any) {
      console.error('Error updating bio:', error);
      // Handle axios error response
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update bio';
      toast.error(errorMessage);
    }
  };

  const handleBioCancel = () => {
    setUserBio(user.bio || '');
    setIsEditingBio(false);
  };

  const getOrdinalPosition = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return num + "st";
    if (j === 2 && k !== 12) return num + "nd";
    if (j === 3 && k !== 13) return num + "rd";
    return num + "th";
  };

  const handleDownloadPaper = async (paperId: string) => {
    try {
      // Use centralized API instance
      // Use authenticated endpoint to allow downloading own papers even if pending
      const response = await api.get(`/research/my/${paperId}`);

      if (!response.data.success) {
        const errorData = response.data;
        toast.error(errorData.message || 'Failed to fetch research paper');
        return;
      }

      // axios returns data directly in response.data (not .json())
      const result = response.data;
      const paper = result.data?.paper;

      if (!paper) {
        toast.error('Research paper not found');
        return;
      }

      // If paper has PDF file URL, download it directly
      if (paper.pdf_file_url) {
        const apiBaseUrl = getApiUrl().replace('/api', '');
        const downloadUrl = `${apiBaseUrl}${paper.pdf_file_url}`;
        window.open(downloadUrl, '_blank');
        toast.success('Downloading research paper...');
        return;
      }

      // Otherwise, generate PDF from content (similar to Your Research page)
      await generateAndDownloadPDF(paper);
      toast.success('Research paper downloaded successfully!');
    } catch (error: any) {
      console.error('Error downloading research paper:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to download research paper. Please try again.';
      toast.error(errorMessage);
    }
  };

  const generateAndDownloadPDF = async (paper: any) => {
    // Create a new window with the research paper content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please allow popups.');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${paper.title}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          body { 
            font-family: 'Times New Roman', serif; 
            margin: 40px; 
            line-height: 1.6; 
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 { 
            color: #2c3e50; 
            border-bottom: 2px solid #3498db; 
            padding-bottom: 10px; 
            text-align: center;
            font-size: 24px;
            margin-bottom: 30px;
          }
          h2 { 
            color: #34495e; 
            margin-top: 30px; 
            font-size: 18px;
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
          }
          .metadata { 
            background-color: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0; 
            font-size: 14px;
            border-left: 4px solid #3498db;
          }
          .abstract { 
            background-color: #f8f9fa; 
            padding: 20px; 
            border-left: 4px solid #3498db; 
            margin: 20px 0; 
            font-style: italic;
          }
          .content { 
            margin: 20px 0; 
            text-align: justify;
          }
          .tags { 
            margin: 20px 0; 
          }
          .tag { 
            background-color: #e74c3c; 
            color: white; 
            padding: 4px 8px; 
            border-radius: 4px; 
            margin-right: 8px; 
            font-size: 12px; 
            display: inline-block;
            margin-bottom: 5px;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
            border-top: 1px solid #bdc3c7;
            padding-top: 20px;
          }
          .download-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #3498db;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            z-index: 1000;
          }
          .download-btn:hover {
            background-color: #2980b9;
          }
        </style>
      </head>
      <body>
        <button class="download-btn no-print" onclick="window.print()">📄 Print/Download PDF</button>
        
        <h1>${paper.title}</h1>
        
        <div class="metadata">
          <p><strong>Author:</strong> ${paper.doctor?.doctor_name || 'Unknown'}</p>
          <p><strong>Clinic:</strong> ${paper.doctor?.clinic_name || 'Unknown'}</p>
          <p><strong>Published:</strong> ${new Date(paper.created_at).toLocaleDateString()}</p>
          <p><strong>Views:</strong> ${paper.view_count || 0}</p>
          <p><strong>Approvals:</strong> ${paper.upvote_count || 0}</p>
        </div>

        <div class="abstract">
          <h2>Abstract</h2>
          <p>${paper.abstract || 'No abstract available'}</p>
        </div>

        <div class="content">
          <h2>Content</h2>
          <div>${(paper.content || '').replace(/\n/g, '<br>')}</div>
        </div>

        ${paper.tags && paper.tags.length > 0 ? `
        <div class="tags">
          <h2>Tags</h2>
          ${paper.tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
        </div>
        ` : ''}

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} from AestheticRxNetwork Research Platform</p>
          <p>This document was automatically generated from the research paper content.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print dialog
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close the window after printing
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);
    };
  };

  const getTierColors = (tier: string, rank: number) => {
    // Get tier color from database or default to red for Elite Lead
    const tierColor = user.tier_color || 'red';
    
    // Import the color utility
    const { getTierBgClass, getTierIcon } = require('@/lib/tierColors');
    
    // Rank-based colors for ring
    let ringColor = 'border-gray-300'; // Default for no rank
    if (rank === 1) ringColor = 'border-yellow-400'; // Gold
    else if (rank === 2) ringColor = 'border-gray-400'; // Silver
    else if (rank === 3) ringColor = 'border-orange-400'; // Bronze

    return {
      innerBg: getTierBgClass(tierColor), // Tier color for inner circle
      ringColor: ringColor, // Rank color for ring
      tierIcon: getTierIcon(tierColor) // Tier icon
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <button 
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800 transition-colors text-sm sm:text-base"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 mb-4 sm:mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 sm:space-y-6 md:space-y-0 md:space-x-8">
            <div className="flex-1 text-center md:text-left w-full">
              {/* Tier and Rank */}
              <div className="mb-3 sm:mb-4">
                <div className="flex items-center justify-center md:justify-start space-x-2 mb-2 flex-wrap">
                  <FaTrophy className="text-red-500 text-base sm:text-lg" />
                  <span className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">
                    {getTierColors(user.tier || 'Unknown', user.leaderboard_position || 0).tierIcon} {user.tier || 'Unknown'} - {getOrdinalPosition(user.leaderboard_position || 0)} out of {user.total_doctors || 0}
                  </span>
                </div>

                {user.is_top_3_monthly && (
                  <div className="flex items-center justify-center md:justify-start space-x-2 flex-wrap">
                    <FaMedal className="text-yellow-500 text-base sm:text-lg" />
                    <span className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">
                      Top {user.monthly_rank || 0} This Month
                    </span>
                  </div>
                )}
              </div>
              
              {/* Name and Clinic */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 break-words">{user.name || 'Loading...'}</h1>
              
              <div className="mb-3 sm:mb-4">
                {isEditingClinic ? (
                  <div className="flex items-center space-x-2 flex-wrap">
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className="flex-1 min-w-0 text-base sm:text-lg lg:text-xl text-gray-700 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter clinic name"
                    />
                    <button
                      onClick={handleClinicSave}
                      className="text-green-600 hover:text-green-800 transition-colors p-1"
                    >
                      <FaCheck />
                    </button>
                    <button
                      onClick={handleClinicCancel}
                      className="text-red-600 hover:text-red-800 transition-colors p-1"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="text-base sm:text-lg lg:text-xl text-gray-700 break-words">{user.clinic_name || 'Loading...'}</span>
                    {canEdit && (
                      <button 
                        onClick={() => setIsEditingClinic(true)}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                        title="Edit clinic name"
                      >
                        <FaEdit />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* WhatsApp */}
              <div className="mb-3 sm:mb-4">
                {isEditingWhatsapp ? (
                  <div className="flex items-center space-x-2 flex-wrap">
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="flex-1 min-w-0 text-sm sm:text-base px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="WhatsApp number"
                    />
                    <button
                      onClick={handleWhatsappSave}
                      className="bg-blue-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      <FaSave />
                    </button>
                    <button
                      onClick={handleWhatsappCancel}
                      className="bg-gray-200 text-gray-800 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md hover:bg-gray-300 transition-colors text-sm"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="text-sm sm:text-base text-gray-600 break-words">
                      {whatsappNumber || 'No WhatsApp number.'}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => setIsEditingWhatsapp(true)}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                        title="Edit WhatsApp number"
                      >
                        <FaEdit />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Bio/About Section */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                  <FaUser className="text-gray-500 text-sm sm:text-base" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">About</span>
                </div>
                
                {isEditingBio ? (
                  <div className="space-y-2 sm:space-y-3">
                    <textarea
                      value={userBio}
                      onChange={(e) => setUserBio(e.target.value)}
                      className="block w-full text-sm sm:text-base px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tell us about yourself, your expertise, and interests..."
                      rows={4}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleBioSave}
                        className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-xs sm:text-sm flex items-center"
                      >
                        <FaSave className="mr-1" />
                        Save Bio
                      </button>
                      <button
                        onClick={handleBioCancel}
                        className="bg-gray-200 text-gray-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-gray-300 transition-colors text-xs sm:text-sm flex items-center"
                      >
                        <FaTimes className="mr-1" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm sm:text-base text-gray-700 mb-2 sm:mb-3 leading-relaxed break-words">
                      {userBio || "No bio available. Click edit to add information about yourself."}
                    </p>
                    {canEdit && (
                      <button
                        onClick={() => setIsEditingBio(true)}
                        className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-xs sm:text-sm flex items-center"
                      >
                        <FaEdit className="mr-1" />
                        {userBio ? 'Edit Bio' : 'Add Bio'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Tags */}
              <div className="mb-3 sm:mb-4">
                <div className="flex items-center space-x-2 mb-2 flex-wrap">
                  <FaTag className="text-gray-500 text-sm sm:text-base" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700 break-words">
                    Tags: {userTags.length} - {userTags.join(', ')}
                  </span>
                </div>
                
                {isEditingTags ? (
                  <div className="space-y-3">
                    {/* Current Tags */}
                    <div className="flex flex-wrap gap-2">
                      {userTags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <FaMinus className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    
                    {/* Add New Tag */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={handleTagInput}
                        className="block w-full text-sm sm:text-base px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Type tag and press Enter or comma (max 5 tags)"
                      />
                    </div>
                    {userTags.length >= 5 && (
                      <p className="text-xs sm:text-sm text-red-600">Maximum 5 tags reached</p>
                    )}
                    
                    {/* Save/Cancel Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleTagsSave}
                        className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-xs sm:text-sm flex items-center"
                      >
                        <FaSave className="mr-1" />
                        Save Tags
                      </button>
                      <button
                        onClick={handleTagsCancel}
                        className="bg-gray-200 text-gray-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-gray-300 transition-colors text-xs sm:text-sm flex items-center"
                      >
                        <FaTimes className="mr-1" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {userTags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                            {tag}
                          </span>
                        ))}
                      </div>
                    
                    {userTags.length < 3 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-600 mb-2">
                        <span>💡</span>
                        <span>Consider adding more expertise tags to better showcase your specializations.</span>
                    </div>
                    )}
                    
                      {canEdit && (
                        <button
                          onClick={() => setIsEditingTags(true)}
                          className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-xs sm:text-sm flex items-center"
                        >
                          <FaEdit className="mr-1" />
                          Edit Tags
                        </button>
                      )}
                  </div>
                )}
              </div>

              {/* Join Date */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FaCalendarAlt />
                <span>Approved Joined {user.join_date ? new Date(user.join_date).toLocaleDateString() : 'Loading...'}</span>
              </div>
            </div>
              </div>
            </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setAdminMode(!adminMode)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    adminMode 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {adminMode ? 'Exit Admin Mode' : 'Enter Admin Mode'}
                </button>
                {adminMode && (
                  <span className="text-sm text-red-600 font-medium">
                    🔧 Admin Mode Active - You can edit user details
                </span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                Admin View
            </div>
            </div>
          </div>
        )}

        {/* Section Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedSection('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedSection === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setSelectedSection('research')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedSection === 'research'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🔬 Research Papers
            </button>
            <button
              onClick={() => setSelectedSection('medals')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedSection === 'medals'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏆 Medals
            </button>
            <button
              onClick={() => setSelectedSection('badges')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedSection === 'badges'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              💎 Badges
            </button>
            <button
              onClick={() => setSelectedSection('certificates')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedSection === 'certificates'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏅 Certificates
            </button>
            <button
              onClick={() => setSelectedSection('leaderboard')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedSection === 'leaderboard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏆 Leaderboard
            </button>
            <button
              onClick={() => setSelectedSection('progress')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedSection === 'progress'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📈 Rank Progress
            </button>
          </div>

          {/* Rank Progress Bar */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Rank Progress</h3>
                <p className="text-sm text-gray-600">Progress to {user.next_rank || 'Next Rank'}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{user.progress_percentage || 0}%</div>
                <div className="text-sm text-gray-600">{user.points_to_next_rank?.toLocaleString() || '0'} points to go</div>
              </div>
            </div>
            
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${user.progress_percentage || 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span>{user.current_score?.toLocaleString() || '0'}</span>
                <span>{user.next_rank_score?.toLocaleString() || '0'}</span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Current: {user.tier}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Next: {user.next_rank}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Conditional Content Based on Selected Section */}
        {selectedSection === 'overview' && (
          <>
            {/* Medal & Badge Counters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Medal Counters */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaMedal className="text-yellow-500 mr-2" />
              Medal Achievements
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 mb-1">{user.gold_medals}</div>
                <div className="text-sm text-yellow-700">🥇 Gold Medals</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                <div className="text-2xl font-bold text-gray-600 mb-1">{user.silver_medals}</div>
                <div className="text-sm text-gray-700">🥈 Silver Medals</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 mb-1">{user.bronze_medals}</div>
                <div className="text-sm text-orange-700">🥉 Bronze Medals</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">{user.total_medals}</div>
                <div className="text-sm text-blue-700">🏆 Total Medals</div>
              </div>
          </div>
        </div>

          {/* Badge Counters */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaGem className="text-purple-500 mr-2" />
              Badge Achievements
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">{user.achievement_badges}</div>
                <div className="text-sm text-blue-700">🏅 Achievement Badges</div>
                </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-1">{user.milestone_badges}</div>
                <div className="text-sm text-purple-700">🎯 Milestone Badges</div>
                </div>
              <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 mb-1">{user.special_badges}</div>
                <div className="text-sm text-yellow-700">💎 Special Badges</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">{user.total_badges}</div>
                <div className="text-sm text-green-700">🏆 Total Badges</div>
                </div>
              </div>
            </div>
          </div>

        {/* Monthly Performance */}
        {user.is_top_3_monthly && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <FaMedal className="text-yellow-500 mr-3" />
                    Top {user.monthly_rank} This Month
                  </h2>
            
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-800 mb-2">
                  #{user.monthly_rank}
              </div>
                <div className="text-lg text-gray-600 mb-4">Monthly Rank</div>
                <div className="text-sm text-gray-500">
                  Monthly performance recognition
            </div>
                <div className="text-sm font-medium text-gray-700 mt-2">
                    {user.monthly_rank === 1 ? 'Gold Medal Winner' : 
                     user.monthly_rank === 2 ? 'Silver Medal Winner' : 
                     'Bronze Medal Winner'} - Double Ring Status
                </div>
              </div>
                </div>
              </div>
        )}
          </>
        )}

        {/* Research Papers Section */}
        {selectedSection === 'research' && (
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <FaAward className="text-blue-500 mr-3" />
            Research Papers ({user.research_papers.length})
          </h2>
          
          <div className="space-y-6">
            {user.research_papers.map((paper) => (
              <div key={paper.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{paper.title}</h3>
                    <p className="text-gray-600 mb-3">{paper.description}</p>
                    
                    {/* Paper Tags */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {paper.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                        >
                          {tag}
                </span>
                      ))}
            </div>
                    
                    {/* Paper Stats */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <FaEye />
                        <span>{paper.views?.toLocaleString() || '0'} views</span>
          </div>
                      <div className="flex items-center space-x-1">
                        <FaThumbsUp />
                        <span>{paper.upvotes} upvotes</span>
                </div>
                      <div className="flex items-center space-x-1">
                        <FaDownload />
                        <span>{paper.downloads} downloads</span>
            </div>
                      <div className="flex items-center space-x-1">
                        <FaStar />
                        <span>{paper.rating}/5.0 rating</span>
          </div>
              </div>
              </div>
                  
                  <div className="mt-4 md:mt-0 md:ml-6 text-right">
                    <div className="text-sm text-gray-500 mb-2">
                      Published: {new Date(paper.published).toLocaleDateString()}
              </div>
                    <div className="text-sm font-medium text-blue-600 mb-2">
                      {paper.category}
              </div>
                    <button 
                      onClick={() => handleDownloadPaper(paper.id)}
                      className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-xs sm:text-sm flex items-center"
                    >
                      <FaDownload className="mr-1" />
                      Download
                    </button>
            </div>
          </div>
        </div>
            ))}
          </div>
        </div>
        )}

        {/* Medals Section */}
        {selectedSection === 'medals' && (
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <FaMedal className="text-yellow-500 mr-3" />
              Medals & Achievements ({user.medals.length})
            </h2>
            <div className="flex space-x-4 mt-4 md:mt-0">
            <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">{user.gold_medals}</div>
                <div className="text-xs text-gray-600">Gold</div>
                  </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-600">{user.silver_medals}</div>
                <div className="text-xs text-gray-600">Silver</div>
                        </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">{user.bronze_medals}</div>
                <div className="text-xs text-gray-600">Bronze</div>
                          </div>
                        </div>
                      </div>
                      
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {user.medals.map((medal) => (
              <div key={medal.id} className="border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
                <div className="text-4xl mb-3">{medal.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{medal.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{medal.description}</p>
                <div className="text-sm font-medium text-blue-600">
                  {medal.month} {medal.year}
              </div>
              </div>
                        ))}
                      </div>
                </div>
              )}

        {/* Badges Section */}
        {selectedSection === 'badges' && (
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <FaGem className="text-purple-500 mr-3" />
              Badges ({user.badges.length})
            </h2>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{user.achievement_badges}</div>
                <div className="text-xs text-gray-600">Achievement</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{user.milestone_badges}</div>
                <div className="text-xs text-gray-600">Milestone</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">{user.special_badges}</div>
                <div className="text-xs text-gray-600">Special</div>
              </div>
                        </div>
                      </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {user.badges.map((badge) => (
              <div key={badge.id} className="border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{badge.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{badge.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{badge.description}</p>
                <div className="text-xs text-gray-500">
                  Earned: {new Date(badge.earned_date).toLocaleDateString()}
                </div>
                <div className={`mt-2 inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  badge.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                  badge.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                  badge.color === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {badge.type}
                      </div>
                    </div>
                    ))}
            </div>
          </div>
        )}

        {/* Leaderboard Section */}
        {selectedSection === 'leaderboard' && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <FaTrophy className="text-yellow-500 mr-3" />
              Leaderboard Position
            </h2>
            
            <div className="space-y-6">
              {/* Current Position */}
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-6">
          <div className="flex items-center justify-between">
              <div>
                    <h3 className="text-lg font-semibold text-gray-900">Current Position</h3>
                    <p className="text-gray-600">Your rank among all doctors</p>
              </div>
            <div className="text-right">
                    <div className="text-4xl font-bold text-yellow-600">
                      #{user.leaderboard_position || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      out of {user.total_doctors || 0} doctors
                    </div>
            </div>
          </div>
        </div>

              {/* Monthly Performance */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Monthly Rank</h3>
                    <p className="text-gray-600">Your performance this month</p>
            </div>
            <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">
                      #{user.monthly_rank || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {user.is_top_3_monthly ? '🏆 Top 3 Performer' : 'Keep pushing!'}
                    </div>
            </div>
          </div>
        </div>

              {/* Previous Month Performance */}
              {user.is_top_previous_month && (
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
                  <div className="flex items-center justify-between">
              <div>
                      <h3 className="text-lg font-semibold text-gray-900">Previous Month Winner</h3>
                      <p className="text-gray-600">You were a top performer last month!</p>
          </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-600">
                        #{user.previous_month_rank || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">
                        🏆 Previous Month Champion
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tier Information (Only for doctors) */}
              {user.user_type === 'doctor' && (
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6">
                  <div className="flex items-center justify-between">
              <div>
                      <h3 className="text-lg font-semibold text-gray-900">Current Tier</h3>
                      <p className="text-gray-600">Your achievement level</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        {user.tier || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {user.tier_progress || 0}% complete
                      </div>
                    </div>
                  </div>
                </div>
              )}
                      
              {/* Leaderboard Stats (Only for doctors) */}
              {user.user_type === 'doctor' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{user.gold_medals || 0}</div>
                    <div className="text-sm text-gray-600">Gold Medals</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{user.silver_medals || 0}</div>
                    <div className="text-sm text-gray-600">Silver Medals</div>
                        </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{user.bronze_medals || 0}</div>
                    <div className="text-sm text-gray-600">Bronze Medals</div>
                          </div>
                        </div>
              )}

              {/* Achievement Summary */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievement Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">{user.total_research_papers || 0}</div>
                    <div className="text-sm text-gray-600">Research Papers</div>
                      </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{user.total_views || 0}</div>
                    <div className="text-sm text-gray-600">Total Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">{user.total_upvotes || 0}</div>
                    <div className="text-sm text-gray-600">Upvotes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-orange-600">{user.total_badges || 0}</div>
                    <div className="text-sm text-gray-600">Badges</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Section */}
        {selectedSection === 'progress' && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <FaChartLine className="text-green-500 mr-3" />
              Detailed Rank Progress
            </h2>
            
            <div className="space-y-6">
              {/* Current Rank Info */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Rank: {user.tier}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{user.current_score?.toLocaleString() || '0'}</div>
                    <div className="text-sm text-gray-600">Current Score</div>
                        </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">#{user.leaderboard_position}</div>
                    <div className="text-sm text-gray-600">Leaderboard Position</div>
                          </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{user.progress_percentage}%</div>
                    <div className="text-sm text-gray-600">Progress to Next</div>
                        </div>
                        </div>
                      </div>
                      
              {/* Next Rank Info */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Rank: {user.next_rank}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{user.next_rank_score?.toLocaleString() || '0'}</div>
                    <div className="text-sm text-gray-600">Required Score</div>
                          </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{user.points_to_next_rank?.toLocaleString() || '0'}</div>
                    <div className="text-sm text-gray-600">Points Needed</div>
                        </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{Math.round((100 - (user.progress_percentage || 0)) * 10) / 10}%</div>
                    <div className="text-sm text-gray-600">Remaining</div>
                        </div>
                        </div>
                      </div>

              {/* Progress Visualization */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Visualization</h3>
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div 
                      className="bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500 h-6 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                      style={{ width: `${user.progress_percentage}%` }}
                    >
                      <span className="text-white text-sm font-bold">{user.progress_percentage}%</span>
                </div>
              </div>
                  <div className="flex justify-between mt-3 text-sm text-gray-600">
                    <span className="font-medium">{user.tier}</span>
                    <span className="font-medium">{user.next_rank}</span>
                  </div>
                </div>
              </div>

              {/* Achievement Summary */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievement Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{user.total_medals}</div>
                    <div className="text-sm text-gray-600">Total Medals</div>
                    </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{user.total_badges}</div>
                    <div className="text-sm text-gray-600">Total Badges</div>
                </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{user.total_research_papers}</div>
                    <div className="text-sm text-gray-600">Research Papers</div>
                </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{user.total_views}</div>
                    <div className="text-sm text-gray-600">Total Views</div>
              </div>
          </div>
        </div>
            </div>
          </div>
        )}

        {/* Certificates Section */}
        {selectedSection === 'certificates' && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <FaAward className="text-yellow-500 mr-3" />
              Certificates & Achievements
            </h2>
            
            {user.certificates && user.certificates.length > 0 ? (
              <div className="space-y-6">
                {/* Certificate Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Medical Certificates */}
                  {user.certificates.filter(cert => cert.certificate_type === 'medical_qualification').length > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <FaAward className="text-blue-500 text-2xl mr-3" />
                        <h3 className="text-lg font-semibold text-gray-900">Medical Certificates</h3>
                      </div>
                      <div className="space-y-3">
                        {user.certificates
                          .filter(cert => cert.certificate_type === 'medical_qualification')
                          .map((cert, index) => (
                            <div key={cert.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center flex-1 min-w-0">
                              <div 
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden mr-3 flex-shrink-0 border-2 border-blue-200 bg-gray-100 cursor-pointer hover:border-blue-400 transition-colors"
                                onClick={() => window.open(getCertificateDownloadUrl(cert), '_blank')}
                                title="Click to download certificate"
                              >
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                                  <span className="text-2xl">📜</span>
                                </div>
                              </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 truncate">{cert.title}</div>
                                  <div className="text-xs sm:text-sm text-gray-600">
                                    {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : 'Issued'}
                                  </div>
                                  {cert.tier_name && (
                                    <div className="text-xs text-blue-600 font-medium mt-1">{cert.tier_name}</div>
                                  )}
                                </div>
                              </div>
                              <button
                                className="text-blue-600 hover:text-blue-800 transition-colors p-2 flex-shrink-0"
                                onClick={() => window.open(getCertificateDownloadUrl(cert), '_blank')}
                                title="Download Certificate"
                              >
                                <FaDownload className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          ))}
                  </div>
              </div>
            )}

                  {/* Research Certificates */}
                  {user.certificates.filter(cert => cert.certificate_type === 'research_excellence').length > 0 && (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <FaStar className="text-purple-500 text-2xl mr-3" />
                        <h3 className="text-lg font-semibold text-gray-900">Research Certificates</h3>
                      </div>
                      <div className="space-y-3">
                        {user.certificates
                          .filter(cert => cert.certificate_type === 'research_excellence')
                          .map((cert, index) => (
                            <div key={cert.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center flex-1 min-w-0">
                                  <div 
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden mr-3 flex-shrink-0 border-2 border-purple-200 bg-gray-100 cursor-pointer hover:border-purple-400 transition-colors"
                                    onClick={() => window.open(getCertificateDownloadUrl(cert), '_blank')}
                                    title="Click to download certificate"
                                  >
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
                                      <span className="text-2xl">📜</span>
                                    </div>
                                  </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 truncate">{cert.title}</div>
                                  <div className="text-xs sm:text-sm text-gray-600">
                                    {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : 'Awarded'}
                                  </div>
                                  {cert.tier_name && (
                                    <div className="text-xs text-purple-600 font-medium mt-1">{cert.tier_name}</div>
                                  )}
                                </div>
                              </div>
                              <button 
                                className="text-blue-600 hover:text-blue-800 transition-colors p-2 flex-shrink-0"
                                onClick={() => window.open(getCertificateDownloadUrl(cert), '_blank')}
                                title="Download Certificate"
                              >
                                <FaDownload className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          ))}
                          </div>
                        </div>
                  )}

                  {/* Achievement Certificates */}
                  {user.certificates.filter(cert => ['tier_achievement', 'monthly_winner', 'special_achievement', 'leadership', 'innovation'].includes(cert.certificate_type)).length > 0 && (
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <FaTrophy className="text-yellow-500 text-2xl mr-3" />
                        <h3 className="text-lg font-semibold text-gray-900">Achievement Certificates</h3>
                      </div>
                      <div className="space-y-3">
                        {user.certificates
                          .filter(cert => ['tier_achievement', 'monthly_winner', 'special_achievement', 'leadership', 'innovation'].includes(cert.certificate_type))
                          .map((cert, index) => (
                            <div key={cert.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center flex-1 min-w-0">
                                  <div 
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden mr-3 flex-shrink-0 border-2 border-yellow-200 bg-gray-100 cursor-pointer hover:border-yellow-400 transition-colors"
                                    onClick={() => window.open(getCertificateDownloadUrl(cert), '_blank')}
                                    title="Click to download certificate"
                                  >
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-100">
                                      <span className="text-2xl">
                                        {cert.certificate_type === 'monthly_winner' && cert.rank === 1 ? '🥇' : 
                                         cert.certificate_type === 'monthly_winner' && cert.rank === 2 ? '🥈' :
                                         cert.certificate_type === 'monthly_winner' && cert.rank === 3 ? '🥉' : '🏆'}
                                      </span>
                                    </div>
                                  </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 truncate">{cert.title}</div>
                                  <div className="text-xs sm:text-sm text-gray-600">
                                    {cert.month && cert.year ? `${cert.month} ${cert.year}` : 
                                     cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : 'Awarded'}
                                  </div>
                                  {cert.tier_name && (
                                    <div className="text-xs text-yellow-600 font-medium mt-1">{cert.tier_name}</div>
                                  )}
                                </div>
                              </div>
                              <button 
                                className="text-blue-600 hover:text-blue-800 transition-colors p-2 flex-shrink-0"
                                onClick={() => window.open(getCertificateDownloadUrl(cert), '_blank')}
                                title="Download Certificate"
                              >
                                <FaDownload className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          ))}
                </div>
              </div>
            )}
                </div>

                {/* Certificate Statistics */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {user.certificates.filter(cert => cert.certificate_type === 'medical_qualification').length}
                      </div>
                      <div className="text-sm text-gray-600">Medical Certificates</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {user.certificates.filter(cert => cert.certificate_type === 'research_excellence').length}
                      </div>
                      <div className="text-sm text-gray-600">Research Certificates</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {user.certificates.filter(cert => ['tier_achievement', 'monthly_winner', 'special_achievement', 'leadership', 'innovation'].includes(cert.certificate_type)).length}
                      </div>
                      <div className="text-sm text-gray-600">Achievement Certificates</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{user.certificates.length}</div>
                      <div className="text-sm text-gray-600">Total Certificates</div>
                    </div>
                  </div>
                </div>

                {/* Recent Certificates */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Certificates</h3>
                  <div className="space-y-3">
                    {user.certificates
                      .sort((a, b) => new Date(b.issued_at || b.created_at || 0).getTime() - new Date(a.issued_at || a.created_at || 0).getTime())
                      .slice(0, 3)
                      .map((cert) => (
                        <div key={cert.id} className="flex items-center justify-between p-3 sm:p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center flex-1 min-w-0">
                              <div 
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden mr-3 sm:mr-4 flex-shrink-0 border-2 border-green-200 bg-gray-100 cursor-pointer hover:border-green-400 transition-colors"
                                onClick={() => window.open(getCertificateDownloadUrl(cert), '_blank')}
                                title="Click to download certificate"
                              >
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
                                  <span className="text-2xl">
                                    {cert.certificate_type === 'tier_achievement' ? '🏆' :
                                     cert.certificate_type === 'research_excellence' ? '🔬' :
                                     cert.certificate_type === 'monthly_winner' ? '🥇' : '📜'}
                                  </span>
                                </div>
                              </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate text-sm sm:text-base">{cert.title}</div>
                              <div className="text-xs sm:text-sm text-gray-600 truncate">
                                {cert.description} - {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : 'Recently issued'}
                              </div>
                              {cert.tier_name && (
                                <div className="text-xs text-green-600 font-medium mt-1">{cert.tier_name}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className={`text-xs sm:text-sm font-medium ${
                              cert.status === 'verified' ? 'text-green-600' :
                              cert.status === 'issued' ? 'text-blue-600' : 'text-gray-600'
                            }`}>
                              {cert.status === 'verified' ? 'Verified' : 
                               cert.status === 'issued' ? 'Issued' : cert.status}
                            </span>
                            <button 
                              className="text-blue-600 hover:text-blue-800 transition-colors p-2"
                              onClick={() => window.open(getCertificateDownloadUrl(cert), '_blank')}
                              title="Download Certificate"
                            >
                              <FaDownload className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 px-4">
                <FaAward className="text-gray-300 text-4xl sm:text-6xl mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">No Certificates Yet</h3>
                <p className="text-sm sm:text-base text-gray-500">Certificates will appear here once you earn achievements and complete milestones.</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-2">Certificates are automatically generated when you reach tier milestones, win monthly competitions, or achieve research excellence.</p>
                <p className="text-xs sm:text-sm text-blue-600 mt-3 font-medium">💡 Certificates are automatically generated when you view your profile. If you don't see them, please refresh the page.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}