'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/MainLayout';

interface HallOfPrideEntry {
  id: string;
  doctor: {
    id: string;
    doctor_name: string;
    clinic_name: string;
    profile_photo_url?: string;
  };
  title: string;
  description: string;
  achievement_type: string;
  reason?: string;
  image_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export default function HallOfPridePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<HallOfPrideEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHallOfPride = async () => {
      try {
        // Use centralized API instance
        const response = await api.get('/public/hall-of-pride');
        if (response.data.success && response.data.data.length > 0) {
          setEntries(response.data.data);
        }
      } catch (error: unknown) {
        console.error('Error fetching Hall of Pride entries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHallOfPride();
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading Hall of Pride...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            <span>Back</span>
          </button>
        </div>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🏆 Hall of Pride</h1>
          <p className="text-lg text-gray-600">
            Celebrating exceptional achievements and contributions from our medical community
          </p>
        </div>

        {/* Entries Grid */}
        {entries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entries.map((entry) => (
              <a
                key={entry.id}
                href={`/user/${entry.doctor.id}`}
                className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl bg-blue-600">
                      🏆
                    </div>
                    <span className="text-3xl">🏆</span>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{entry.title}</h3>
                  
                  <div className="mb-3">
                    <p className="text-gray-700 font-medium">Dr. {entry.doctor.doctor_name}</p>
                    <p className="text-gray-600 text-sm">{entry.doctor.clinic_name}</p>
                  </div>

                  {entry.reason && (
                    <div className="mb-3">
                      <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        {entry.reason}
                      </span>
                    </div>
                  )}

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {entry.description}
                  </p>

                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-center text-sm font-medium text-blue-600">
                      {entry.achievement_type}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-3">
                  <p className="text-xs text-gray-500 text-center">
                    Awarded on {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Hall of Pride</h3>
            <p className="text-gray-500 text-lg">No achievements to display yet.</p>
            <p className="text-gray-400 text-sm mt-2">Check back soon for exceptional achievements from our medical community.</p>
          </div>
        )}
      </div>
    </div>
    </MainLayout>
  );
}
