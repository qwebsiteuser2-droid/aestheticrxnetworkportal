'use client';

import { useState, useEffect } from 'react';
import { getAccessToken } from '@/lib/auth';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { getApiUrl } from '@/lib/getApiUrl';
import { 
  TrophyIcon, 
  UserGroupIcon, 
  PencilIcon, 
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface TeamTierConfig {
  id: string;
  name: string;
  description: string;
  benefits: string;
  icon: string;
  color: string;
  individual_threshold: number;
  max_members: number;
  discount_2_members: number;
  discount_3_members: number;
  discount_4_members: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TeamFormulaConfig {
  solo_multiplier: number;
  two_member_discount: number;
  three_member_discount: number;
  four_plus_member_discount: number;
  four_plus_additional_discount: number;
}

interface TeamMember {
  id: string;
  doctor_name: string;
  clinic_name: string;
  email: string;
  is_leader: boolean;
  current_sales?: number;
  individual_tier?: string;
  individual_tier_progress?: number;
}

interface SoloDoctor {
  id: string;
  doctor_id: number;
  doctor_name: string;
  display_name?: string;
  email: string;
  clinic_name: string;
  tier: string;
  current_sales: number;
  is_approved: boolean;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  total_sales: number;
  tier: string;
  tier_progress: number;
  created_at: string;
}

// Solo Purchases Component
function SoloPurchasesContent() {
  const [soloDoctors, setSoloDoctors] = useState<SoloDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [sortBy, setSortBy] = useState('current_sales');
  const [tierConfigs, setTierConfigs] = useState<{id: string; name: string; display_order: number}[]>([]);

  useEffect(() => {
    fetchSoloDoctors();
    fetchTierConfigs();
  }, []);

  const fetchTierConfigs = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      
      const response = await api.get('/admin/tier-configs', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (response.data.success && response.data.data?.tiers) {
        // Sort by display_order and filter active tiers
        const sortedTiers = response.data.data.tiers
          .filter((t: any) => t.is_active !== false)
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
        setTierConfigs(sortedTiers);
      }
    } catch (error) {
      console.error('Error fetching tier configs:', error);
    }
  };

  const fetchSoloDoctors = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        console.error('No authentication token');
        return;
      }
      
      // Fetch solo doctors (doctors not in any team) from dedicated endpoint
      const response = await api.get('/admin/solo-doctors', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (response.data.success && response.data.data) {
        setSoloDoctors(response.data.data);
      } else {
        console.error('Failed to fetch solo doctors:', response.data.message);
        setSoloDoctors([]);
      }
    } catch (error) {
      console.error('Error fetching solo doctors:', error);
      setSoloDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = soloDoctors
    .filter(doctor => {
      const matchesSearch = doctor.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doctor.clinic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doctor.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTier = filterTier === 'all' || doctor.tier === filterTier;
      return matchesSearch && matchesTier;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'current_sales':
          return b.current_sales - a.current_sales;
        case 'doctor_name':
          return a.doctor_name.localeCompare(b.doctor_name);
        case 'tier':
          return a.tier.localeCompare(b.tier);
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading solo doctors...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search doctors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="all">All Tiers</option>
          {tierConfigs.map((tier) => (
            <option key={tier.id} value={tier.name}>{tier.name}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="current_sales">Sort by Sales</option>
          <option value="doctor_name">Sort by Name</option>
          <option value="tier">Sort by Tier</option>
        </select>
        <div className="flex items-center text-sm text-gray-600">
          {filteredDoctors.length} doctors found
        </div>
      </div>

      {/* Solo Doctors Table */}
      {filteredDoctors.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDoctors.map((doctor, index) => (
                <tr key={doctor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                        {doctor.doctor_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {doctor.display_name || doctor.doctor_name}
                        </div>
                        <div className="text-sm text-gray-500">{doctor.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doctor.clinic_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      doctor.tier === 'Elite Lead' ? 'bg-red-100 text-red-800' :
                      doctor.tier === 'Grand Lead' ? 'bg-purple-100 text-purple-800' :
                      doctor.tier === 'Diamond Lead' ? 'bg-indigo-100 text-indigo-800' :
                      doctor.tier === 'Platinum Lead' ? 'bg-pink-100 text-pink-800' :
                      doctor.tier === 'Master Lead' ? 'bg-orange-100 text-orange-800' :
                      doctor.tier === 'Legendary Lead' ? 'bg-yellow-100 text-yellow-800' :
                      doctor.tier === 'Ultimate Lead' ? 'bg-gray-100 text-gray-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {doctor.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    PKR {parseFloat(doctor.current_sales.toString()).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      doctor.is_approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {doctor.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Solo Doctors Found</h3>
          <p className="mt-1 text-sm text-gray-500">No individual doctors found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}

export default function ManageLeaderboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'teams' | 'soloPurchases' | 'tiers' | 'settings'>('teams');
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamTiers, setTeamTiers] = useState<TeamTierConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingTier, setEditingTier] = useState<TeamTierConfig | null>(null);
  const [showTierForm, setShowTierForm] = useState(false);

  // Team settings
  const [maxTeamsPerUser, setMaxTeamsPerUser] = useState(1);
  const [maxMembersPerTeam, setMaxMembersPerTeam] = useState(3);
  const [teamDiscountPercentage, setTeamDiscountPercentage] = useState(10);

  // Team formula configuration
  const [teamFormulaConfig, setTeamFormulaConfig] = useState<TeamFormulaConfig>({
    solo_multiplier: 1,
    two_member_discount: 5,
    three_member_discount: 10,
    four_plus_member_discount: 15,
    four_plus_additional_discount: 5
  });
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !user?.is_admin) {
        router.push('/login');
        return;
      }
    }
  }, [isAuthenticated, user, authLoading, router]);

  // Load data
  useEffect(() => {
    if (user?.is_admin) {
      loadTeams();
      loadTeamTiers();
      loadSettings();
      loadTeamFormula();
    }
  }, [user]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      const response = await api.get('/admin/teams', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const data = response.data;
        setTeams(data.teams || []);
      } else {
        toast.error('Failed to load teams');
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamTiers = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await api.get('/admin/team-tiers/configs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setTeamTiers(response.data.data?.teamTiers || response.data.data || []);
      } else {
        console.error('Failed to load team tiers:', response.data.message);
        setTeamTiers([]);
      }
    } catch (error) {
      console.error('Error loading team tiers:', error);
      setTeamTiers([]);
    }
  };

  const loadTeamFormula = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await api.get('/admin/team-tiers/formula', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const data = response.data;
        setTeamFormulaConfig(data.data?.formula || teamFormulaConfig);
      }
    } catch (error) {
      console.error('Error loading team formula:', error);
    }
  };

  const saveTeamFormula = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot save team formula.');
      return;
    }
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await api.post('/admin/team-tiers/formula', { formula: teamFormulaConfig }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Team formula updated successfully');
        setShowFormulaModal(false);
      } else {
        toast.error('Failed to update team formula');
      }
    } catch (error) {
      console.error('Error saving team formula:', error);
      toast.error('Failed to update team formula');
    }
  };

  const loadSettings = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await api.get('/admin/leaderboard-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const data = response.data.data;
        setMaxTeamsPerUser(data.maxTeamsPerUser || 1);
        setMaxMembersPerTeam(data.maxMembersPerTeam || 3);
        setTeamDiscountPercentage(data.teamDiscountPercentage || 10);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateTeamName = async (teamId: string, newName: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot update team names.');
      return;
    }
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await api.put(`/admin/teams/${teamId}`, { name: newName }, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data.success) {
        toast.success('Team name updated successfully');
        loadTeams();
        setEditingTeam(null);
      } else {
        toast.error('Failed to update team name');
      }
    } catch (error) {
      console.error('Error updating team name:', error);
      toast.error('Failed to update team name');
    }
  };

  const removeTeamMember = async (teamId: string, memberId: string) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot remove team members.');
      return;
    }
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await api.delete(`/admin/teams/${teamId}/members/${memberId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data.success) {
        toast.success('Team member removed successfully');
        loadTeams();
      } else {
        toast.error('Failed to remove team member');
      }
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Failed to remove team member');
    }
  };

  const saveTeamTier = async (tierData: Partial<TeamTierConfig>) => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot save team tiers.');
      return;
    }
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      let response;
      if (editingTier) {
        response = await api.put(`/admin/team-tiers/configs/${editingTier.id}`, tierData, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });
      } else {
        response = await api.post('/admin/team-tiers/configs', tierData, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });
      }

      if (response.data.success) {
        toast.success(`Team tier ${editingTier ? 'updated' : 'created'} successfully`);
        loadTeamTiers();
        setEditingTier(null);
        setShowTierForm(false);
      } else {
        toast.error(response.data.message || `Failed to ${editingTier ? 'update' : 'create'} team tier`);
      }
    } catch (error) {
      console.error('Error saving team tier:', error);
      toast.error(error instanceof Error ? error.message : `Failed to ${editingTier ? 'update' : 'create'} team tier`);
    }
  };

  const saveSettings = async () => {
    if (isViewerAdmin) {
      toast.error('Viewer Admin: You have view-only access. Cannot save settings.');
      return;
    }
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await api.put('/admin/leaderboard-settings', {
        maxTeamsPerUser,
        maxMembersPerTeam,
        teamDiscountPercentage
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success('Settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.is_admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <TrophyIcon className="h-8 w-8 text-yellow-500 mr-3" />
                Manage Team Leaderboard
              </h1>
              <p className="text-gray-600 mt-2">Manage teams, tiers, and leaderboard settings</p>
            </div>
            <a
              href="/admin"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Admin
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'teams', name: 'Teams', icon: UserGroupIcon },
                { id: 'soloPurchases', name: 'Solo Purchases', icon: TrophyIcon },
                { id: 'tiers', name: 'Team Tiers', icon: TrophyIcon },
                { id: 'settings', name: 'Settings', icon: PencilIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">All Teams</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {teams.map((team) => (
                  <div key={team.id} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserGroupIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          {editingTeam?.id === team.id ? (
                            <input
                              type="text"
                              defaultValue={team.name}
                              onBlur={(e) => {
                                if (e.target.value.trim() && e.target.value !== team.name) {
                                  updateTeamName(team.id, e.target.value.trim());
                                } else {
                                  setEditingTeam(null);
                                }
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  const newName = e.currentTarget.value.trim();
                                  if (newName && newName !== team.name) {
                                    updateTeamName(team.id, newName);
                                  } else {
                                    setEditingTeam(null);
                                  }
                                }
                              }}
                              className="text-lg font-medium text-gray-900 border border-gray-300 rounded px-2 py-1"
                              autoFocus
                            />
                          ) : (
                            <h3 className="text-lg font-medium text-gray-900">{team.name}</h3>
                          )}
                          <p className="text-sm text-gray-500">
                            {team.members.length} members • Total Sales: {team.total_sales.toLocaleString()} PKR
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          team.tier === 'Elite Lead' ? 'bg-red-100 text-red-800' :
                          team.tier === 'Grand Lead' ? 'bg-purple-100 text-purple-800' :
                          team.tier === 'Lead Expert' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {team.tier}
                        </span>
                        {isViewerAdmin ? (
                          <span className="text-gray-400 text-xs">View Only</span>
                        ) : (
                          <button
                            onClick={() => setEditingTeam(team)}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isViewerAdmin}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Team Members:</h4>
                      {team.members.map((member) => (
                        <div key={member.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {member.doctor_name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{member.doctor_name}</p>
                                <p className="text-xs text-gray-500">{member.clinic_name}</p>
                              </div>
                              {member.is_leader && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                  Leader
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removeTeamMember(team.id, member.id)}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                          
                          {/* Individual Contribution Details */}
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-gray-500">Activity Status:</span>
                                <span className="ml-2 font-medium text-green-600">
                                  {member.current_sales ? 'Active Contributor' : 'No Activity'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Individual Tier:</span>
                                <span className="ml-2 font-medium text-blue-600">
                                  {member.individual_tier || 'Lead Starter'}
                                </span>
                              </div>
                            </div>
                            
                            {/* Individual Progress Bar */}
                            {member.individual_tier_progress !== undefined && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>Individual Progress</span>
                                  <span>{(Number(member.individual_tier_progress) || 0).toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${Number(member.individual_tier_progress) || 0}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Progress to next tier</span>
                        <span>{(Number(team.tier_progress) || 0).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Number(team.tier_progress) || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Individual Contributions Summary */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h5 className="text-sm font-medium text-blue-900 mb-2">Individual Contributions Summary</h5>
                      <div className="space-y-2">
                        {team.members.map((member) => (
                          <div key={member.id} className="flex justify-between items-center text-xs">
                            <span className="text-blue-700">{member.doctor_name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-green-600 font-medium">
                                {member.current_sales ? 'Active' : 'Inactive'}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {member.individual_tier || 'Lead Starter'}
                              </span>
                            </div>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-blue-200">
                          <div className="flex justify-between items-center text-sm font-medium">
                            <span className="text-blue-900">Team Status:</span>
                            <span className="text-green-600">
                              {team.total_sales ? 'Active Team' : 'Inactive Team'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Solo Purchases Tab */}
        {activeTab === 'soloPurchases' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Individual Doctor Contributions</h2>
                <p className="text-sm text-gray-600 mt-1">View individual purchase amounts and tiers for all doctors</p>
              </div>
              <div className="p-6">
                <SoloPurchasesContent />
              </div>
            </div>
          </div>
        )}

        {/* Team Tiers Tab */}
        {activeTab === 'tiers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Team Tier Configurations</h2>
              {isViewerAdmin ? (
                <button
                  disabled
                  className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Team Tier (View Only)
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingTier(null);
                    setShowTierForm(true);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Team Tier
                </button>
              )}
            </div>

            {showTierForm && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingTier ? 'Edit Team Tier' : 'Create New Team Tier'}
                </h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const tierData: Partial<TeamTierConfig> = {
                    name: formData.get('name') as string,
                    description: formData.get('description') as string,
                    benefits: formData.get('benefits') as string,
                    icon: formData.get('icon') as string,
                    color: formData.get('color') as string,
                    individual_threshold: parseFloat(formData.get('individual_threshold') as string),
                    max_members: parseInt(formData.get('max_members') as string),
                    discount_2_members: parseFloat(formData.get('discount_2_members') as string),
                    discount_3_members: parseFloat(formData.get('discount_3_members') as string),
                    discount_4_members: parseFloat(formData.get('discount_4_members') as string),
                    display_order: editingTier?.display_order || teamTiers.length + 1,
                    is_active: editingTier?.is_active !== undefined ? editingTier.is_active : true
                  };
                  saveTeamTier(tierData);
                }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tier Name</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingTier?.name || ''}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                      <input
                        type="text"
                        name="icon"
                        defaultValue={editingTier?.icon || '🏆'}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                      <input
                        type="text"
                        name="color"
                        defaultValue={editingTier?.color || '#3B82F6'}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Individual Threshold (PKR)</label>
                      <input
                        type="number"
                        name="individual_threshold"
                        defaultValue={Number(editingTier?.individual_threshold || 0)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Members</label>
                      <input
                        type="number"
                        name="max_members"
                        defaultValue={editingTier?.max_members || 3}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">2-Member Discount %</label>
                      <input
                        type="number"
                        name="discount_2_members"
                        defaultValue={Number(editingTier?.discount_2_members || 5)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">3-Member Discount %</label>
                      <input
                        type="number"
                        name="discount_3_members"
                        defaultValue={Number(editingTier?.discount_3_members || 10)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">4+ Member Discount %</label>
                      <input
                        type="number"
                        name="discount_4_members"
                        defaultValue={Number(editingTier?.discount_4_members || 15)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        name="description"
                        defaultValue={editingTier?.description || ''}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Benefits</label>
                      <textarea
                        name="benefits"
                        defaultValue={editingTier?.benefits || ''}
                        required
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTierForm(false);
                        setEditingTier(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {editingTier ? 'Update' : 'Create'} Tier
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamTiers.map((tier) => (
                <div key={tier.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl">{tier.icon}</div>
                    <button
                      onClick={() => {
                        setEditingTier(tier);
                        setShowTierForm(true);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{tier.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{tier.description}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Individual Threshold:</span>
                      <span className="font-medium">{Number(tier.individual_threshold || 0).toLocaleString()} PKR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Max Members:</span>
                      <span className="font-medium">{tier.max_members || 3}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">2-Member Discount:</span>
                      <span className="font-medium">{Number(tier.discount_2_members || 5)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">3-Member Discount:</span>
                      <span className="font-medium">{Number(tier.discount_3_members || 10)}%</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">{tier.benefits}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Team Formula Configuration */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Team Formula Configuration</h3>
                  <p className="text-sm text-gray-600">Configure how team tiers are calculated based on team size</p>
                </div>
                {isViewerAdmin ? (
                  <button
                    disabled
                    className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit Formula (View Only)
                  </button>
                ) : (
                  <button
                    onClick={() => setShowFormulaModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit Formula
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Solo (1 Member)</h4>
                  <p className="text-sm text-gray-600">Base threshold × {teamFormulaConfig.solo_multiplier}</p>
                  <p className="text-xs text-gray-500 mt-1">No discount applied</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">2 Members</h4>
                  <p className="text-sm text-gray-600">(2 × Base threshold) - {teamFormulaConfig.two_member_discount}%</p>
                  <p className="text-xs text-gray-500 mt-1">Effective: {(2 * (1 - teamFormulaConfig.two_member_discount / 100)).toFixed(2)}× base</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">3 Members</h4>
                  <p className="text-sm text-gray-600">(3 × Base threshold) - {teamFormulaConfig.three_member_discount}%</p>
                  <p className="text-xs text-gray-500 mt-1">Effective: {(3 * (1 - teamFormulaConfig.three_member_discount / 100)).toFixed(2)}× base</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">4+ Members</h4>
                  <p className="text-sm text-gray-600">(N × Base threshold) - {teamFormulaConfig.four_plus_member_discount}%</p>
                  <p className="text-xs text-gray-500 mt-1">+ {teamFormulaConfig.four_plus_additional_discount}% per additional member</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Formula Examples</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• <strong>Lead Expert (250,000 PKR base):</strong></p>
                  <p className="ml-4">- 2 members: (2 × 250,000) - 5% = 475,000 PKR</p>
                  <p className="ml-4">- 3 members: (3 × 250,000) - 10% = 675,000 PKR</p>
                  <p>• <strong>Grand Lead (500,000 PKR base):</strong></p>
                  <p className="ml-4">- 2 members: (2 × 500,000) - 5% = 950,000 PKR</p>
                  <p className="ml-4">- 3 members: (3 × 500,000) - 10% = 1,350,000 PKR</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Leaderboard Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Teams Per User
                  </label>
                  <input
                    type="number"
                    value={maxTeamsPerUser}
                    onChange={(e) => setMaxTeamsPerUser(parseInt(e.target.value) || 1)}
                    min="1"
                    max="5"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    readOnly={isViewerAdmin}
                    disabled={isViewerAdmin}
                  />
                  <p className="text-xs text-gray-500 mt-1">How many teams a user can create or join</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Members Per Team
                  </label>
                  <input
                    type="number"
                    value={maxMembersPerTeam}
                    onChange={(e) => setMaxMembersPerTeam(parseInt(e.target.value) || 3)}
                    min="2"
                    max="10"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    readOnly={isViewerAdmin}
                    disabled={isViewerAdmin}
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum number of members allowed in a team</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Discount Percentage
                  </label>
                  <input
                    type="number"
                    value={teamDiscountPercentage}
                    onChange={(e) => setTeamDiscountPercentage(parseInt(e.target.value) || 10)}
                    min="0"
                    max="50"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isViewerAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    readOnly={isViewerAdmin}
                    disabled={isViewerAdmin}
                  />
                  <p className="text-xs text-gray-500 mt-1">Discount percentage for team pricing (e.g., 10% means teams pay 10% less than individual pricing)</p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={saveSettings}
                    className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isViewerAdmin ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : ''}`}
                    disabled={isViewerAdmin}
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Formula Modal */}
        {showFormulaModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Edit Team Formula</h2>
                  <button
                    onClick={() => setShowFormulaModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Current Formula</h3>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• <strong>Solo:</strong> Base threshold × {teamFormulaConfig.solo_multiplier}</p>
                      <p>• <strong>2 Members:</strong> (2 × Base threshold) - {teamFormulaConfig.two_member_discount}%</p>
                      <p>• <strong>3 Members:</strong> (3 × Base threshold) - {teamFormulaConfig.three_member_discount}%</p>
                      <p>• <strong>4+ Members:</strong> (N × Base threshold) - {teamFormulaConfig.four_plus_member_discount}% + {teamFormulaConfig.four_plus_additional_discount}% per additional member</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Solo Multiplier
                      </label>
                      <input
                        type="number"
                        value={teamFormulaConfig.solo_multiplier}
                        onChange={(e) => setTeamFormulaConfig({
                          ...teamFormulaConfig,
                          solo_multiplier: parseFloat(e.target.value) || 1
                        })}
                        min="0.1"
                        max="2"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Multiplier for solo doctors (usually 1.0)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        2-Member Discount (%)
                      </label>
                      <input
                        type="number"
                        value={teamFormulaConfig.two_member_discount}
                        onChange={(e) => setTeamFormulaConfig({
                          ...teamFormulaConfig,
                          two_member_discount: parseFloat(e.target.value) || 0
                        })}
                        min="0"
                        max="50"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Discount for 2-member teams</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        3-Member Discount (%)
                      </label>
                      <input
                        type="number"
                        value={teamFormulaConfig.three_member_discount}
                        onChange={(e) => setTeamFormulaConfig({
                          ...teamFormulaConfig,
                          three_member_discount: parseFloat(e.target.value) || 0
                        })}
                        min="0"
                        max="50"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Discount for 3-member teams</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        4+ Member Base Discount (%)
                      </label>
                      <input
                        type="number"
                        value={teamFormulaConfig.four_plus_member_discount}
                        onChange={(e) => setTeamFormulaConfig({
                          ...teamFormulaConfig,
                          four_plus_member_discount: parseFloat(e.target.value) || 0
                        })}
                        min="0"
                        max="50"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Base discount for 4+ member teams</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Discount per Member (%)
                      </label>
                      <input
                        type="number"
                        value={teamFormulaConfig.four_plus_additional_discount}
                        onChange={(e) => setTeamFormulaConfig({
                          ...teamFormulaConfig,
                          four_plus_additional_discount: parseFloat(e.target.value) || 0
                        })}
                        min="0"
                        max="10"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Additional discount for each member beyond 4</p>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-medium text-green-900 mb-2">Preview with Example (Lead Expert - 250,000 PKR base)</h3>
                    <div className="text-sm text-green-800 space-y-1">
                      <p>• <strong>Solo:</strong> 250,000 × {teamFormulaConfig.solo_multiplier} = {(250000 * teamFormulaConfig.solo_multiplier).toLocaleString()} PKR</p>
                      <p>• <strong>2 Members:</strong> (2 × 250,000) - {teamFormulaConfig.two_member_discount}% = {(2 * 250000 * (1 - teamFormulaConfig.two_member_discount / 100)).toLocaleString()} PKR</p>
                      <p>• <strong>3 Members:</strong> (3 × 250,000) - {teamFormulaConfig.three_member_discount}% = {(3 * 250000 * (1 - teamFormulaConfig.three_member_discount / 100)).toLocaleString()} PKR</p>
                      <p>• <strong>4 Members:</strong> (4 × 250,000) - {teamFormulaConfig.four_plus_member_discount}% = {(4 * 250000 * (1 - teamFormulaConfig.four_plus_member_discount / 100)).toLocaleString()} PKR</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowFormulaModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveTeamFormula}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Save Formula
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
