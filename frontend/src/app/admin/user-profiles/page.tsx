'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { FaUser, FaSearch, FaFilter, FaCrown, FaTrophy, FaAward } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getAccessToken } from '@/lib/auth';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

interface Doctor {
  id: string;
  doctor_id: number;
  doctor_name: string;
  display_name?: string;
  email: string;
  clinic_name: string;
  whatsapp?: string;
  bio?: string;
  tags?: string[];
  tier: string;
  tier_color?: string;
  current_sales: number;
  is_approved: boolean;
  created_at: string;
}

export default function UserProfilesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { isViewerAdmin } = useAdminPermission();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [sortBy, setSortBy] = useState('current_sales');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      // Use centralized API instance
      const response = await api.get('/admin/users');
      
      if (response.data.success) {
        const result = response.data;
        if (result.success && result.data && Array.isArray(result.data)) {
          // Map the users to match the Doctor interface
          const mappedDoctors = result.data
            .filter((user: any) => user && user.id) // Filter out any invalid entries
            .map((user: any) => ({
              id: user.id,
              doctor_id: user.doctor_id || 0,
              doctor_name: user.doctor_name || user.name || 'Unknown',
              display_name: user.display_name || '',
              email: user.email || '',
              clinic_name: user.clinic_name || '',
              tier: user.tier || 'Unknown',
              current_sales: parseFloat(user.current_sales?.toString() || '0') || 0,
              whatsapp: user.whatsapp || '',
              bio: user.bio || '',
              tags: Array.isArray(user.tags) ? user.tags : [],
              is_approved: user.is_approved || false,
              created_at: user.created_at || new Date().toISOString()
            }));
          setDoctors(mappedDoctors);
          console.log(`✅ Loaded ${mappedDoctors.length} user profiles`);
        } else {
          console.warn('⚠️ No data received or invalid format:', result);
          setDoctors([]);
          if (result.message) {
            toast.error(result.message);
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to fetch doctors');
        setDoctors([]);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to fetch doctors');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };


  const filteredDoctors = doctors
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <Link 
              href="/admin" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Admin Dashboard
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FaUser className="text-blue-500 mr-3" />
                User Profile Management
              </h1>
              <p className="text-gray-600 mt-2">Manage user profiles and display names</p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Tiers</option>
              <option value="Lead Starter">Lead Starter</option>
              <option value="Elite Lead">Elite Lead</option>
              <option value="Grand Lead">Grand Lead</option>
              <option value="Diamond Lead">Diamond Lead</option>
              <option value="Platinum Lead">Platinum Lead</option>
              <option value="Master Lead">Master Lead</option>
              <option value="Legendary Lead">Legendary Lead</option>
              <option value="Ultimate Lead">Ultimate Lead</option>
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
              <FaFilter className="mr-2" />
              {filteredDoctors.length} users found
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">User Profiles ({filteredDoctors.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDoctors.map((doctor, index) => (
                  <tr 
                    key={doctor.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => window.open(`/user/${doctor.id}`, '_blank')}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                          {doctor.doctor_name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{doctor.doctor_name}</div>
                          <div className="text-sm text-gray-500">{doctor.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {doctor.display_name || doctor.doctor_name}
                        </span>
                        {doctor.display_name && (
                          <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            Custom
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{doctor.clinic_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        doctor.tier_color ? 
                          `bg-${doctor.tier_color}-100 text-${doctor.tier_color}-800` :
                          'bg-gray-100 text-gray-800'
                      }`}>
                        {doctor.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      PKR {parseFloat(doctor.current_sales.toString()).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/user/${doctor.id}`, '_blank');
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View and Edit Profile (Admin has editing permission)"
                      >
                        <FaUser />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <FaCrown className="text-yellow-500 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Top Performers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {doctors.filter(d => parseFloat(d.current_sales.toString()) > 100000).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <FaUser className="text-blue-500 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{doctors.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <FaTrophy className="text-green-500 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Custom Names</p>
                <p className="text-2xl font-bold text-gray-900">
                  {doctors.filter(d => d.display_name).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <FaAward className="text-purple-500 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Approved Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {doctors.filter(d => d.is_approved).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
