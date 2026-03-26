'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/app/providers';
import OnlineStatusDot from '@/components/OnlineStatusDot';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import { getProfileImageUrl } from '@/lib/apiConfig';
import {
  MapPinIcon,
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon,
  PhoneIcon,
  TagIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

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
  google_location?: {
    lat: number;
    lng: number;
    address: string;
  };
  tier?: string;
  created_at?: string;
}

export default function DoctorProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDoctorProfile();
    }
  }, [id]);

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/public/doctors/${id}`);
      
      if (response.ok) {
        const data = await response.json();
        setDoctor(data.data);
      } else {
        toast.error('Doctor not found');
        router.push('/doctors');
      }
    } catch (err) {
      console.error('Error fetching doctor profile:', err);
      toast.error('Failed to load doctor profile');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to send a message');
      router.push('/login');
      return;
    }

    try {
      setStartingChat(true);
      const response = await api.post('/conversations', {
        doctor_id: id,
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/messages/${data.data.id}`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to start conversation');
      }
    } catch (err) {
      console.error('Error starting chat:', err);
      toast.error('Failed to start conversation');
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onLoginClick={() => router.push('/login')}
          onRegisterClick={() => router.push('/signup/select-type')}
          isAuthenticated={isAuthenticated}
          user={user}
        />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm p-8 animate-pulse">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-40 h-40 rounded-2xl bg-gray-200" />
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
                  <div className="h-20 bg-gray-200 rounded mb-4" />
                  <div className="h-12 bg-gray-200 rounded-xl w-40" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onLoginClick={() => router.push('/login')}
          onRegisterClick={() => router.push('/signup/select-type')}
          isAuthenticated={isAuthenticated}
          user={user}
        />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Doctor not found</h1>
          <p className="text-gray-500 mt-2">This profile may have been removed or is unavailable.</p>
          <Link
            href="/doctors"
            className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to doctors
          </Link>
        </div>
      </div>
    );
  }

  const allTags = [...(doctor.specialties || []), ...(doctor.tags || [])];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onLoginClick={() => router.push('/login')}
        onRegisterClick={() => router.push('/signup/select-type')}
        isAuthenticated={isAuthenticated}
        user={user}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          href="/doctors"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to doctors
        </Link>

        <div className="max-w-4xl mx-auto">
          {/* Main Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header Background */}
            <div className="h-32 bg-gradient-to-r from-blue-500 to-emerald-500" />

            {/* Profile Content */}
            <div className="px-6 pb-6">
              {/* Photo - Overlapping header */}
              <div className="relative -mt-16 mb-4">
                <div className="w-32 h-32 rounded-2xl overflow-hidden bg-white ring-4 ring-white shadow-lg">
                  {getProfileImageUrl(doctor.profile_photo_url) ? (
                    <Image
                      src={getProfileImageUrl(doctor.profile_photo_url)!}
                      alt={doctor.doctor_name}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center text-gray-400 text-4xl font-bold">
                      {doctor.doctor_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                {/* Online Status */}
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow">
                  <OnlineStatusDot
                    isOnline={doctor.is_online || false}
                    availabilityStatus={doctor.availability_status}
                    size="lg"
                  />
                </div>
              </div>

              {/* Name and Clinic */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{doctor.doctor_name}</h1>
                  {doctor.clinic_name && (
                    <p className="text-gray-500 mt-1">{doctor.clinic_name}</p>
                  )}
                  <div className="flex items-center mt-2">
                    <OnlineStatusDot
                      isOnline={doctor.is_online || false}
                      availabilityStatus={doctor.availability_status}
                      lastActiveAt={doctor.last_active_at}
                      showLabel
                      size="md"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleStartChat}
                    disabled={startingChat}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                    {startingChat ? 'Starting...' : 'Send Message'}
                  </button>
                </div>
              </div>

              {/* Tags/Specialties */}
              {allTags.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center mb-2">
                    <TagIcon className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">Specialties</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {doctor.bio && (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{doctor.bio}</p>
                </div>
              )}

              {/* Location */}
              {doctor.google_location && (
                <div className="mt-6">
                  <div className="flex items-center mb-2">
                    <MapPinIcon className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">Location</span>
                  </div>
                  <p className="text-gray-600">{doctor.google_location.address}</p>
                  
                  {/* Map Embed (optional - requires Google Maps API) */}
                  {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
                      <iframe
                        width="100%"
                        height="200"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${doctor.google_location.lat},${doctor.google_location.lng}&zoom=14`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Member Since */}
              {doctor.created_at && (
                <div className="mt-6 flex items-center text-sm text-gray-400">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Member since {new Date(doctor.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>

          {/* CTA Section */}
          {!isAuthenticated && (
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl p-6 border border-blue-100">
              <h3 className="font-semibold text-gray-900">Want to connect with {doctor.doctor_name}?</h3>
              <p className="text-gray-600 mt-1">Sign in or create an account to send messages.</p>
              <div className="flex gap-3 mt-4">
                <Link
                  href="/login"
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup/select-type"
                  className="px-6 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

