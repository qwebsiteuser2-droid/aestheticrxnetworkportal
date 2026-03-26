'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { Sidebar } from '@/components/layout/Sidebar';
import { HallOfPrideEntry } from '@/types';
import { toast } from 'react-hot-toast';
import { Bars3Icon, StarIcon, TrophyIcon, PlusIcon } from '@heroicons/react/24/outline';

export function HallOfPridePage() {
  const { user, isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [entries, setEntries] = useState<HallOfPrideEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated or not approved
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/';
      return;
    }
    
    // Regular users are auto-approved and should have view access
    const userType = user?.user_type || (user as any)?.user_type || '';
    const isRegularUser = userType === 'regular' || userType === 'regular_user';
    
    if (user && !isRegularUser && !user.is_approved && !user.is_admin) {
      window.location.href = '/waiting-approval';
      return;
    }
  }, [isAuthenticated, user]);

  // Fetch hall of pride entries
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        // Mock data for now - in real app, this would come from API
        const mockEntries: HallOfPrideEntry[] = [
          {
            id: '1',
            doctor_id: '42001',
            title: 'Excellence in Surgery',
            description: 'Outstanding contribution to minimally invasive surgery research and exceptional patient care standards.',
            image_url: undefined,
            achievement_type: 'Medical Excellence',
            reason: 'Outstanding contribution to minimally invasive surgery research and exceptional patient care standards.',
            display_order: 1,
            created_at: '2024-01-15'
          },
          {
            id: '2',
            doctor_id: '42002',
            title: 'Telemedicine Pioneer',
            description: 'Pioneering work in telemedicine implementation and improving healthcare access in rural communities.',
            image_url: undefined,
            achievement_type: 'Innovation',
            reason: 'Pioneering work in telemedicine implementation and improving healthcare access in rural communities.',
            display_order: 2,
            created_at: '2024-01-10'
          },
          {
            id: '3',
            doctor_id: '42003',
            title: 'Community Health Leader',
            description: 'Exceptional leadership in preventive care programs and community health initiatives.',
            image_url: undefined,
            achievement_type: 'Leadership',
            reason: 'Exceptional leadership in preventive care programs and community health initiatives.',
            display_order: 3,
            created_at: '2024-01-05'
          }
        ];
        
        setEntries(mockEntries);
      } catch (error: unknown) {
        toast.error('Failed to load hall of pride entries');
        console.error('Error fetching hall of pride entries:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, []);

  // Regular users are auto-approved and should have view access
  const userType = user?.user_type || (user as any)?.user_type || '';
  const isRegularUser = userType === 'regular' || userType === 'regular_user';
  const canView = isAuthenticated && (isRegularUser || user?.is_approved || user?.is_admin);
  
  if (!canView) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Hall of Pride</h1>
          <div className="w-6" /> {/* Spacer */}
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        />

        {/* Main content */}
        <div className="flex-1 lg:ml-0">
          <div className="p-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <StarIcon className="w-8 h-8 text-yellow-500" />
                  <h1 className="text-3xl font-bold text-gray-900">
                    Hall of Pride
                  </h1>
                </div>
                {user?.is_admin && (
                  <button className="btn-primary flex items-center space-x-2">
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Entry</span>
                  </button>
                )}
              </div>
              <p className="text-gray-600 mt-2">
                Celebrating exceptional achievements and contributions from our medical community.
              </p>
            </div>

            {/* Hall of Pride Entries */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="loading-spinner w-8 h-8"></div>
                <span className="ml-3 text-gray-600">Loading hall of pride entries...</span>
              </div>
            ) : entries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {entries.map((entry) => (
                  <div key={entry.id} className="card hover:shadow-medium transition-shadow">
                    <div className="card-body text-center">
                      {/* Profile Photo */}
                      <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center relative">
                        {entry.image_url ? (
                          <img
                            src={entry.image_url}
                            alt={entry.title}
                            className="w-24 h-24 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-white">
                            {entry.title.split(' ').map(n => n[0]).join('')}
                          </span>
                        )}
                        
                        {/* Crown Icon */}
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                          <TrophyIcon className="w-5 h-5 text-white" />
                        </div>
                      </div>

                      {/* Doctor Info */}
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {entry.title}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {entry.achievement_type}
                      </p>

                      {/* Achievement Reason */}
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-700 italic">
                          "{entry.reason}"
                        </p>
                      </div>

                      {/* Award Date */}
                      <div className="text-xs text-gray-500">
                        <StarIcon className="w-4 h-4 inline mr-1" />
                        Awarded on {new Date(entry.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <StarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No entries yet
                </h3>
                <p className="text-gray-600 mb-6">
                  The Hall of Pride is currently empty. Check back later for exceptional achievements from our community.
                </p>
                {user?.is_admin && (
                  <button className="btn-primary">
                    Add First Entry
                  </button>
                )}
              </div>
            )}

            {/* Admin Section */}
            {user?.is_admin && (
              <div className="mt-12">
                <div className="card bg-blue-50 border-blue-200">
                  <div className="card-body">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">
                      Admin Management
                    </h3>
                    <p className="text-blue-800 mb-4">
                      As an admin, you can add new entries to the Hall of Pride to recognize exceptional achievements from doctors in the community.
                    </p>
                    <div className="flex space-x-3">
                      <button className="btn-primary">
                        Add New Entry
                      </button>
                      <button className="btn-outline">
                        Manage Entries
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

