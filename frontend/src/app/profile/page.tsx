'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';

interface ResearchPaper {
  id: number;
  title: string;
  category: string;
  views: number;
  upvotes: number;
  rating: number;
  rank: number;
  published: string;
  downloads: number;
}

interface DoctorProfile {
  id: number;
  doctor_name: string;
  clinic_name: string;
  email: string;
  profile_photo_url: string | null;
  is_approved: boolean;
  is_admin: boolean;
  total_research_papers: number;
  total_views: number;
  total_upvotes: number;
  average_rating: number;
  overall_rank: number;
  research_papers: ResearchPaper[];
}

export default function ProfilePage() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    clinic_name: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Regular users and employees don't have profiles - redirect them
    if (user?.user_type === 'regular' || user?.user_type === 'employee') {
      router.push('/');
      return;
    }
    
    fetchProfile();
  }, [isAuthenticated, user, router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await api.get('/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setProfile(response.data.data);
        setEditForm({ clinic_name: response.data.data.clinic_name });
      } else {
        toast.error('Failed to load profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('profile_photo', file);

      const token = localStorage.getItem('token');
      const response = await api.post('/profile/photo', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setProfile(prev => prev ? { ...prev, profile_photo_url: response.data.data.profile_photo_url } : null);
        updateUser({ ...user!, profile_photo_url: response.data.data.profile_photo_url });
        toast.success('Profile photo updated successfully');
      } else {
        toast.error('Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Error uploading photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.put('/profile', editForm, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setProfile(prev => prev ? { ...prev, clinic_name: response.data.data.clinic_name } : null);
        updateUser({ ...user!, clinic_name: response.data.data.clinic_name });
        setEditing(false);
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error updating profile');
    }
  };

  const getRankColor = (rank: number) => {
    if (rank <= 3) return 'text-yellow-600';
    if (rank <= 10) return 'text-blue-600';
    if (rank <= 25) return 'text-green-600';
    return 'text-gray-600';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '🏆';
    return '📊';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h2>
          <p className="text-gray-600">Unable to load your profile information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                ← Back to Home
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Doctor Profile</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                profile.is_admin 
                  ? 'bg-red-100 text-red-800' 
                  : profile.is_approved 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {profile.is_admin ? 'Admin' : profile.is_approved ? 'Approved' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center">
                {/* Profile Initial Avatar - Profile images removed */}
                <div className="relative inline-block mb-6">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-4xl font-bold">
                      {profile.doctor_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Doctor Info */}
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{profile.doctor_name}</h2>
                
                {editing ? (
                  <div className="mb-4">
                    <input
                      type="text"
                      value={editForm.clinic_name}
                      onChange={(e) => setEditForm({ ...editForm, clinic_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Clinic Name"
                    />
                  </div>
                ) : (
                  <p className="text-lg text-gray-600 mb-4">{profile.clinic_name}</p>
                )}

                <p className="text-gray-500 mb-6">{profile.email}</p>

                {/* Edit Buttons */}
                <div className="space-y-2">
                  {editing ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveProfile}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditing(false);
                          setEditForm({ clinic_name: profile.clinic_name });
                        }}
                        className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Research Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Papers</span>
                  <span className="font-semibold text-blue-600">{profile.total_research_papers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Views</span>
                  <span className="font-semibold text-green-600">{profile.total_views.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Upvotes</span>
                  <span className="font-semibold text-purple-600">{profile.total_upvotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Rating</span>
                  <span className="font-semibold text-yellow-600">{profile.average_rating.toFixed(1)}/5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Overall Rank</span>
                  <span className={`font-semibold ${getRankColor(profile.overall_rank)}`}>
                    {getRankBadge(profile.overall_rank)} #{profile.overall_rank}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Research Papers */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Research Papers</h3>
                <button
                  onClick={() => router.push('/research/upload')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload New Paper
                </button>
              </div>

              {profile.research_papers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📚</div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Research Papers Yet</h4>
                  <p className="text-gray-600 mb-4">Start sharing your research with the medical community</p>
                  <button
                    onClick={() => router.push('/research/upload')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Upload Your First Paper
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.research_papers.map((paper) => (
                    <div key={paper.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`text-2xl ${getRankColor(paper.rank)}`}>
                              {getRankBadge(paper.rank)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRankColor(paper.rank)} bg-opacity-20`}>
                              Rank #{paper.rank}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {paper.category}
                            </span>
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">{paper.title}</h4>
                          <div className="flex items-center space-x-6 text-sm text-gray-600">
                            <span>📊 {paper.views} views</span>
                            <span>👍 {paper.upvotes} upvotes</span>
                            <span>⭐ {paper.rating}/5 rating</span>
                            <span>📥 {paper.downloads} downloads</span>
                            <span>📅 {new Date(paper.published).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-800 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button className="text-red-600 hover:text-red-800 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
