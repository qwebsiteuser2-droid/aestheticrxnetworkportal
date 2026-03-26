'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import OnlineStatusDot from './OnlineStatusDot';
import { MapPinIcon, CalendarDaysIcon, UserCircleIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/app/providers';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface DoctorCardProps {
  doctor: {
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
  };
  showDistance?: boolean;
  variant?: 'card' | 'list';
}

// Modal Component for Doctor Restriction
function DoctorRestrictionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-amber-600" />
          </div>
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
          Feature Not Available
        </h3>
        <p className="text-gray-600 text-center mb-6">
          Doctors cannot set appointments with other doctors. This feature is exclusively for patients who need to book consultations.
        </p>

        {/* Button */}
        <button
          onClick={onClose}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md"
        >
          I Understand
        </button>
      </div>
    </div>
  );
}

export default function DoctorCard({ doctor, showDistance = true, variant = 'card' }: DoctorCardProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);

  const {
    id,
    doctor_name,
    clinic_name,
    is_online,
    availability_status,
    last_active_at,
    distance_km,
  } = doctor;

  // Profile URL
  const profileUrl = `/doctors/${id}`;

  // Handle Set Appointment click
  const handleSetAppointment = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please sign in to set an appointment');
      router.push('/login');
      return;
    }

    // Check if user is admin
    const isAdmin = Boolean(user?.is_admin) || user?.user_type === 'admin';
    
    // Block doctors from setting appointments with other doctors (admins are allowed)
    if (user?.user_type === 'doctor' && !isAdmin) {
      setShowRestrictionModal(true);
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post('/conversations', { doctor_id: id });
      
      if (response.data?.success) {
        // Check if it's an existing conversation
        const isExisting = response.data.message?.includes('Existing');
        toast.success(isExisting ? 'Doctor has been notified!' : 'Appointment request sent!');
        router.push(`/messages/${response.data.data.id}`);
      } else {
        toast.error(response.data?.message || 'Failed to start appointment');
      }
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      toast.error(err.response?.data?.message || 'Failed to start appointment');
    } finally {
      setIsCreating(false);
    }
  };

  if (variant === 'list') {
    return (
      <>
        <DoctorRestrictionModal 
          isOpen={showRestrictionModal} 
          onClose={() => setShowRestrictionModal(false)} 
        />
        
        <div className="flex items-center p-4 bg-white border border-gray-200 rounded-xl hover:shadow-lg hover:border-blue-200 transition-all duration-200">
          {/* Info - Links to Doctor Profile */}
          <Link href={profileUrl} className="flex-1 min-w-0 text-left">
            <h3 className="font-semibold text-gray-900 truncate hover:text-blue-600">{doctor_name}</h3>
            {clinic_name && (
              <p className="text-sm text-gray-500 truncate">{clinic_name}</p>
            )}
            <div className="flex items-center mt-1 space-x-3">
              <OnlineStatusDot
                isOnline={is_online || false}
                availabilityStatus={availability_status}
                lastActiveAt={last_active_at}
                showLabel
                size="sm"
              />
              {showDistance && distance_km !== undefined && (
                <span className="text-xs text-gray-500 flex items-center">
                  <MapPinIcon className="w-3 h-3 mr-1" />
                  {distance_km} km
                </span>
              )}
            </div>
          </Link>

          {/* Set Appointment Button */}
          <button
            onClick={handleSetAppointment}
            disabled={isCreating}
            className={`ml-4 px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              isCreating
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {isCreating ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <CalendarDaysIcon className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{isCreating ? 'Starting...' : 'Set Appointment'}</span>
          </button>
        </div>
      </>
    );
  }

  // Card variant (default)
  return (
    <>
      <DoctorRestrictionModal 
        isOpen={showRestrictionModal} 
        onClose={() => setShowRestrictionModal(false)} 
      />
      
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all duration-300">
        {/* Content */}
        <div className="p-4 text-center">
          {/* Doctor Name - Links to Profile */}
          <Link href={profileUrl} className="block w-full">
            <h3 className="font-semibold text-gray-900 text-lg truncate hover:text-blue-600 transition-colors cursor-pointer">
              {doctor_name}
            </h3>
          </Link>
          {clinic_name && (
            <p className="text-sm text-gray-500 truncate mt-0.5">{clinic_name}</p>
          )}

          {/* Status and distance */}
          <div className="flex items-center justify-center space-x-3 mt-2">
            <OnlineStatusDot
              isOnline={is_online || false}
              availabilityStatus={availability_status}
              lastActiveAt={last_active_at}
              showLabel
              size="sm"
            />
            {showDistance && distance_km !== undefined && (
              <span className="text-xs text-gray-500 flex items-center">
                <MapPinIcon className="w-3 h-3 mr-1" />
                {distance_km} km away
              </span>
            )}
          </div>

          {/* Two Action Buttons */}
          <div className="mt-4 space-y-2">
            {/* Doctor Profile Button - Links to Profile */}
            <Link
              href={profileUrl}
              className="w-full py-2 px-3 text-sm font-medium rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all flex items-center justify-center gap-1.5"
            >
              <UserCircleIcon className="w-4 h-4" />
              <span>Doctor Profile</span>
            </Link>
            
            {/* Set Appointment Button */}
            <button 
              onClick={handleSetAppointment}
              disabled={isCreating}
              className={`w-full py-2 px-3 text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 ${
                isCreating 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600'
              }`}
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <CalendarDaysIcon className="w-4 h-4" />
                  <span>Set Appointment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

