'use client';

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

interface ClinicCardProps {
  clinic: PinnedProfile;
}

export function ClinicCard({ clinic }: ClinicCardProps) {
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

  return (
    <div className="card hover:shadow-medium transition-shadow duration-300">
      <div className="card-body text-center">
        {/* Badge */}
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getBadgeColor(clinic.badge)} mb-4`}>
          <span className="mr-2">{getBadgeIcon(clinic.badge)}</span>
          {clinic.badge.charAt(0).toUpperCase() + clinic.badge.slice(1)}
        </div>

        {/* Profile Photo */}
        <div className="w-20 h-20 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
          {getProfileImageUrl(clinic.profile_photo_url) ? (
            <img
              src={getProfileImageUrl(clinic.profile_photo_url)!}
              alt={clinic.doctor_name}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-primary-600">
              {clinic.doctor_name.split(' ').map(n => n[0]).join('')}
            </span>
          )}
        </div>

        {/* Doctor Info */}
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {clinic.doctor_name}
        </h3>
        <p className="text-gray-600 mb-4">
          {clinic.clinic_name}
        </p>

        {/* Tier and Sales */}
        <div className="space-y-2">
          <div className={`badge tier-${clinic.tier.toLowerCase()}`}>
            {clinic.tier}
          </div>
          <p className="text-sm text-gray-500">
            Total Sales: <span className="font-semibold text-gray-900">
              {formatCurrency(clinic.current_sales)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
