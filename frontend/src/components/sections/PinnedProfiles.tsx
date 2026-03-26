'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { formatCurrency, getTierColor } from '@/lib/auth';
import { getProfileImageUrl } from '@/lib/apiConfig';

interface PinnedProfile {
  id: string;
  clinic_name: string;
  doctor_name: string;
  profile_photo_url?: string;
  current_sales: number;
  tier: string;
  badge: 'bronze' | 'silver' | 'gold';
}

export function PinnedProfiles() {
  const [profiles, setProfiles] = useState<PinnedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching pinned profiles
    const fetchProfiles = async () => {
      try {
        // Mock data - in real app, this would come from API
        const mockProfiles: PinnedProfile[] = [
          {
            id: '1',
            clinic_name: 'Metro Medical Center',
            doctor_name: 'Dr. Sarah Johnson',
            current_sales: 125000,
            tier: 'Grandmaster',
            badge: 'gold'
          },
          {
            id: '2',
            clinic_name: 'City Health Clinic',
            doctor_name: 'Dr. Michael Chen',
            current_sales: 75000,
            tier: 'Master',
            badge: 'silver'
          },
          {
            id: '3',
            clinic_name: 'Community Care Center',
            doctor_name: 'Dr. Emily Rodriguez',
            current_sales: 45000,
            tier: 'Expert',
            badge: 'bronze'
          }
        ];
        
        setProfiles(mockProfiles);
      } catch (error: unknown) {
        console.error('Failed to fetch pinned profiles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'gold':
        return '🥇';
      case 'silver':
        return '🥈';
      case 'bronze':
        return '🥉';
      default:
        return '🏆';
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'gold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'silver':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'bronze':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-white">
        <div className="container-responsive">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading featured clinics...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="container-responsive">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Featured Clinics
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Top-performing clinics from last month's leaderboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {profiles.map((profile, index) => (
            <div
              key={profile.id}
              className="card hover:shadow-medium transition-shadow duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="card-body text-center">
                {/* Badge */}
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getBadgeColor(profile.badge)} mb-4`}>
                  <span className="mr-2">{getBadgeIcon(profile.badge)}</span>
                  {profile.badge.charAt(0).toUpperCase() + profile.badge.slice(1)}
                </div>

                {/* Profile Photo */}
                <div className="w-20 h-20 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
                  {getProfileImageUrl(profile.profile_photo_url) ? (
                    <img
                      src={getProfileImageUrl(profile.profile_photo_url)!}
                      alt={profile.doctor_name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary-600">
                      {profile.doctor_name.split(' ').map(n => n[0]).join('')}
                    </span>
                  )}
                </div>

                {/* Doctor Info */}
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {profile.doctor_name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {profile.clinic_name}
                </p>

                {/* Tier and Sales */}
                <div className="space-y-2">
                  <div className={`badge tier-${profile.tier.toLowerCase()}`}>
                    {profile.tier}
                  </div>
                  <p className="text-sm text-gray-500">
                    Total Sales: <span className="font-semibold text-gray-900">
                      {formatCurrency(profile.current_sales)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View Leaderboard CTA */}
        <div className="text-center mt-12">
          <button className="btn-outline btn-lg">
            View Full Leaderboard
          </button>
        </div>
      </div>
    </section>
  );
}
