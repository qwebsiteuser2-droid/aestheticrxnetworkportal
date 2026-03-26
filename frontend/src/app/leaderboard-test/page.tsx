'use client';

import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  id: string;
  doctor_id: number;
  clinic_name: string;
  doctor_name: string;
  profile_photo_url?: string;
  tier: string;
  tier_progress: number;
  current_sales: number;
  rank: number;
}

interface Tier {
  id: string;
  name: string;
  threshold: string;
  color: string;
  description: string;
  benefits: string;
  icon: string;
}

export default function LeaderboardTest() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Use centralized API instance
        const { default: api } = await import('@/lib/api');
        const response = await api.get('/public/leaderboard');
        
        if (response.data.success) {
          const data = response.data;
          setLeaderboard(data.data.leaderboard);
          setTiers(data.data.tiers);
        } else {
          setError('Failed to fetch leaderboard data');
        }
      } catch (err) {
        setError('Network error: ' + (err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getTierColor = (tierName: string) => {
    const tier = tiers.find(t => t.name === tierName);
    return tier?.color || '#6B7280';
  };

  const getTierIcon = (tierName: string) => {
    const tier = tiers.find(t => t.name === tierName);
    return tier?.icon || '⚪';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌ Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              🏆 Leaderboard Test
            </h1>
            <a 
              href="/" 
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              ← Back to Home
            </a>
          </div>

          <div className="mb-6">
            <p className="text-gray-600">
              This is a test page to verify the leaderboard is working correctly.
              No authentication required.
            </p>
          </div>

          <div className="grid gap-4">
            {leaderboard.map((entry, index) => (
              <div 
                key={entry.id}
                className={`p-4 rounded-lg border-2 ${
                  index === 0 ? 'border-yellow-400 bg-yellow-50' :
                  index === 1 ? 'border-gray-300 bg-gray-50' :
                  index === 2 ? 'border-orange-400 bg-orange-50' :
                  'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`text-2xl font-bold ${
                      index === 0 ? 'text-yellow-600' :
                      index === 1 ? 'text-gray-600' :
                      index === 2 ? 'text-orange-600' :
                      'text-gray-500'
                    }`}>
                      #{entry.rank}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {entry.doctor_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {entry.clinic_name}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">{getTierIcon(entry.tier)}</span>
                      <span 
                        className="font-medium text-sm px-2 py-1 rounded-full text-white"
                        style={{ backgroundColor: getTierColor(entry.tier) }}
                      >
                        {entry.tier}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      PKR {entry.current_sales.toLocaleString()}
                    </p>
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="h-2 rounded-full"
                        style={{ 
                          width: `${entry.tier_progress}%`,
                          backgroundColor: getTierColor(entry.tier)
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {(Number(entry.tier_progress) || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📊 Summary</h3>
            <p className="text-blue-800 text-sm">
              Total doctors: {leaderboard.length} | 
              API working: ✅ | 
              Data loaded: ✅
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
