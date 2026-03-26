'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import DoctorCard from '@/components/DoctorCard';
import api from '@/lib/api';
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  AdjustmentsHorizontalIcon,
  ListBulletIcon,
  Squares2X2Icon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Doctor {
  id: string;
  doctor_name: string;
  clinic_name?: string;
  profile_photo_url?: string;
  bio?: string;
  tags?: string[];
  specialties?: string[];
  is_online?: boolean;
  availability_status?: string;
  last_active_at?: string;
  distance_km?: number;
  google_location?: {
    lat: number;
    lng: number;
    address: string;
  };
}

export default function AppointmentsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied' | 'loading'>('pending');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(50);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    total_pages: 0,
  });

  const fetchDoctors = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      const page = reset ? 1 : pagination.page;
      
      let url = `/public/doctors/search?page=${page}&limit=${pagination.limit}`;
      
      if (searchQuery) {
        url += `&q=${encodeURIComponent(searchQuery)}`;
      }
      
      if (userLocation) {
        url += `&lat=${userLocation.lat}&lng=${userLocation.lng}`;
      }
      
      if (showOnlineOnly) {
        url += `&available_only=true`;
      }

      const response = await api.get(url);
      
      if (response.data?.success) {
        let doctorsList = response.data.data?.doctors || [];
        
        // Filter by radius if we have location
        if (userLocation && selectedRadius < 100) {
          doctorsList = doctorsList.filter((d: Doctor) => 
            !d.distance_km || d.distance_km <= selectedRadius
          );
        }
        
        setDoctors(doctorsList);
        setPagination(prev => ({
          ...prev,
          ...response.data.data?.pagination,
          page: reset ? 1 : prev.page,
        }));
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, userLocation, showOnlineOnly, selectedRadius, pagination.page, pagination.limit]);

  useEffect(() => {
    // Check for geolocation
    if (navigator.geolocation) {
      setLocationStatus('loading');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationStatus('granted');
        },
        () => {
          setLocationStatus('denied');
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    } else {
      setLocationStatus('denied');
    }
  }, []);

  useEffect(() => {
    // Fetch doctors when location is determined or denied
    if (locationStatus === 'granted' || locationStatus === 'denied') {
      fetchDoctors(true);
    }
  }, [locationStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors(true);
  };

  const handleEnableLocation = () => {
    if (navigator.geolocation) {
      setLocationStatus('loading');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationStatus('granted');
        },
        () => {
          setLocationStatus('denied');
        }
      );
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <span>👨‍⚕️</span>
            <span>Set Appointment with Doctors</span>
          </h1>
          <p className="text-gray-600 mt-1">Find doctors nearby and request an appointment</p>
          
          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* Set Appointment Card */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDaysIcon className="w-5 h-5" />
                    <h3 className="font-bold">How it works</h3>
                  </div>
                  <p className="text-emerald-100 text-sm mb-2">
                    Browse doctors below and click &quot;Set Appointment&quot; to send a request
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                      <EnvelopeIcon className="w-3 h-3" />
                      <span>Send Request</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                      <BellAlertIcon className="w-3 h-3" />
                      <span>Get Notified</span>
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">👨‍⚕️</span>
                </div>
              </div>
            </div>

            {/* Appointments Status Card */}
            {isAuthenticated && (
              <Link href="/messages" className="block">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer h-full">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <ClipboardDocumentListIcon className="w-5 h-5" />
                        <h3 className="font-bold">Appointments Status</h3>
                      </div>
                      <p className="text-indigo-100 text-sm mb-2">
                        {user?.user_type === 'doctor' 
                          ? 'View and respond to requests from patients'
                          : 'Track your appointment requests'}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                          <ClockIcon className="w-3 h-3" />
                          <span>Pending</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                          <CheckCircleIcon className="w-3 h-3" />
                          <span>Confirmed</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">📋</span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Login prompt for non-authenticated users */}
            {!isAuthenticated && !isLoading && (
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-4 shadow-lg border-2 border-dashed border-gray-300">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardDocumentListIcon className="w-5 h-5 text-gray-600" />
                      <h3 className="font-bold text-gray-700">Appointments Status</h3>
                    </div>
                    <p className="text-gray-500 text-sm mb-2">
                      Sign in to track your appointments
                    </p>
                    <button
                      onClick={() => router.push('/login')}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Sign In
                    </button>
                  </div>
                  <div className="w-12 h-12 bg-gray-300 rounded-xl flex items-center justify-center">
                    <span className="text-2xl grayscale">📋</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, clinic, or specialty..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Location Button */}
            <button
              type="button"
              onClick={handleEnableLocation}
              className={`flex items-center justify-center px-3 py-2.5 rounded-lg border transition-all text-sm ${
                locationStatus === 'granted'
                  ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-200'
                  : locationStatus === 'loading'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {locationStatus === 'granted' ? (
                <>
                  <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                  <span className="font-semibold">📍 Location On</span>
                </>
              ) : locationStatus === 'loading' ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mr-2" />
                  <span>Getting...</span>
                </>
              ) : (
                <>
                  <MapPinIcon className="w-4 h-4 mr-1" />
                  <span>Location</span>
                </>
              )}
            </button>

            {/* Filters Toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center px-3 py-2.5 rounded-lg border transition-colors text-sm ${
                showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4 mr-1" />
              Filters
            </button>

            {/* Search Button */}
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-emerald-700 transition-all text-sm"
            >
              Search
            </button>
          </form>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-3">
              {/* Radius Filter */}
              {userLocation && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Distance:</label>
                  <select
                    value={selectedRadius}
                    onChange={(e) => {
                      setSelectedRadius(Number(e.target.value));
                      setTimeout(() => fetchDoctors(true), 0);
                    }}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value={10}>Within 10 km</option>
                    <option value={25}>Within 25 km</option>
                    <option value={50}>Within 50 km</option>
                    <option value={100}>Within 100 km</option>
                    <option value={999}>Any distance</option>
                  </select>
                </div>
              )}

              {/* Online Only Filter */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlineOnly}
                  onChange={(e) => {
                    setShowOnlineOnly(e.target.checked);
                    setTimeout(() => fetchDoctors(true), 0);
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Available now</span>
              </label>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setShowOnlineOnly(false);
                  setSelectedRadius(50);
                  setSearchQuery('');
                  fetchDoctors(true);
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* View Toggle and Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-600 text-sm">
            {loading ? 'Searching...' : `${doctors.length} doctors found`}
            {userLocation && ' near you'}
          </p>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
              }`}
            >
              <Squares2X2Icon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
              }`}
            >
              <ListBulletIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}`}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
                <div className="w-16 h-16 mx-auto rounded-full bg-gray-200" />
                <div className="h-4 bg-gray-200 rounded mt-3 mx-8" />
                <div className="h-3 bg-gray-200 rounded mt-2 mx-12" />
                <div className="h-8 bg-gray-200 rounded-lg mt-3" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && doctors.length > 0 && (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-3'
          }>
            {doctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                showDistance={!!userLocation}
                variant={viewMode === 'list' ? 'list' : 'card'}
              />
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && doctors.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No doctors found</h3>
            <p className="text-gray-500 mt-1 text-sm">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setShowOnlineOnly(false);
                setSelectedRadius(100);
                fetchDoctors(true);
              }}
              className="mt-4 px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.total_pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              onClick={() => {
                setPagination(prev => ({ ...prev, page: prev.page - 1 }));
                fetchDoctors();
              }}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-gray-600 text-sm">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <button
              onClick={() => {
                setPagination(prev => ({ ...prev, page: prev.page + 1 }));
                fetchDoctors();
              }}
              disabled={pagination.page === pagination.total_pages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

