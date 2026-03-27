'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { MagnifyingGlassIcon, XMarkIcon, UserGroupIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { getAccessToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

// Dynamic imports for heavy components - reduces initial bundle size by ~30%
const VideoAdvertisementModal = dynamic(
  () => import('@/components/VideoAdvertisementModal'),
  { ssr: false }
);

const FoldableContactSection = dynamic(
  () => import('@/components/FoldableContactSection'),
  { 
    ssr: false,
    loading: () => <div className="h-16 bg-gray-100 animate-pulse rounded-lg" />
  }
);

const VideoAdvertisementDisplay = dynamic(
  () => import('@/components/VideoAdvertisementDisplay'),
  { 
    ssr: false,
    loading: () => <div className="h-64 bg-gray-200 animate-pulse rounded-xl" />
  }
);

const HeroCards = dynamic(
  () => import('@/components/HeroCards'),
  { 
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48 bg-gray-200 animate-pulse rounded-xl" />
        <div className="h-48 bg-gray-200 animate-pulse rounded-xl" />
      </div>
    )
  }
);

// Function to convert number to ordinal (1st, 2nd, 3rd, etc.)
const getOrdinalPosition = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return num + "st";
  }
  if (j === 2 && k !== 12) {
    return num + "nd";
  }
  if (j === 3 && k !== 13) {
    return num + "rd";
  }
  return num + "th";
};

interface Clinic {
  rank: number;
  doctor_id: number;
  clinic_name: string;
  doctor_name: string;
  profile_photo_url: string | null;
  total_sales: number;
  sales_formatted: string;
}

interface TopClinicsData {
  clinics: Clinic[];
  period: {
    month: string;
    start_date: string;
    end_date: string;
  };
}

function TopClinicsSection() {
  const [topClinics, setTopClinics] = useState<TopClinicsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopClinics = async () => {
      try {
        // Use centralized API instance
        const response = await api.get('/public/top-clinics');
        if (response.ok) {
          const data = await response.json();
          setTopClinics(data.data);
        } else {
          setError('Failed to load top clinics');
        }
      } catch (err) {
        setError('Error loading top clinics');
      } finally {
        setLoading(false);
      }
    };

    fetchTopClinics();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !topClinics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load top clinics at this time.</p>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-400 to-yellow-600';
      case 2: return 'from-gray-300 to-gray-500';
      case 3: return 'from-orange-400 to-orange-600';
      default: return 'from-blue-400 to-blue-600';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <p className="text-sm text-gray-600">
          Based on sales performance for <strong>{topClinics.period.month}</strong>
        </p>
      </div>
      
      {topClinics.clinics.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No clinic data available for this period.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {topClinics.clinics.map((clinic) => (
            <div
              key={clinic.doctor_id}
              className={`relative bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                clinic.rank === 1 ? 'ring-2 ring-yellow-400' : ''
              }`}
            >
              {/* Rank Badge */}
              <div className={`absolute -top-4 -right-4 w-12 h-12 rounded-full bg-gradient-to-r ${getRankColor(clinic.rank)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                {getRankIcon(clinic.rank)}
              </div>

              {/* Clinic Info */}
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {clinic.clinic_name.charAt(0)}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {clinic.clinic_name}
                </h3>
                
                <p className="text-gray-600 mb-4">
                  {clinic.doctor_name}
                </p>
                
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                  <p className="text-2xl font-bold text-green-600">
                    {clinic.sales_formatted}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopResearchSection() {
  const [research, setResearch] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPaper, setHoveredPaper] = useState<string | null>(null);
  const { user } = useAuth();

  // Use the centralized getApiUrl helper (already imported at top)

  useEffect(() => {
    // Fetch only top 3 research papers from this week
    const fetchTopResearch = async () => {
      try {
        // Calculate the start of this week (Monday)
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
        startOfWeek.setHours(0, 0, 0, 0);
        
        // Use centralized API instance
        // First try to get papers from this week, limit to 3
        const response = await api.get('/research/top', {
          params: { limit: 3, since: startOfWeek.toISOString() }
        });
        const result = response.data;
        
        if (result.success && result.data.papers.length > 0) {
          // Transform API data to match component expectations
          const transformedPapers = result.data.papers.map((paper: any, index: number) => ({
            id: paper.id,
            title: paper.title,
            author: paper.doctor?.doctor_name || paper.doctor_name || 'Unknown Author',
            clinic: paper.doctor?.clinic_name || paper.clinic_name || 'Unknown Clinic',
            rating: paper.rating || 4.5,
            rank: index + 1,
            category: paper.tags?.[0] || 'General',
            views: paper.view_count || 0,
            upvotes: paper.upvote_count || 0,
            published: new Date(paper.created_at).toISOString().split('T')[0],
            weighted_score: paper.weighted_score || 0
          }));
          setResearch(transformedPapers);
        } else {
          // If no data for this week, try to get any top 3 papers
          const fallbackResponse = await api.get('/research/top', {
            params: { limit: 3 }
          });
          const fallbackResult = fallbackResponse.data;
          
          if (fallbackResult.success && fallbackResult.data.papers.length > 0) {
            const transformedPapers = fallbackResult.data.papers.map((paper: any, index: number) => ({
              id: paper.id,
              title: paper.title,
              author: paper.doctor?.doctor_name || paper.doctor_name || 'Unknown Author',
              clinic: paper.doctor?.clinic_name || paper.clinic_name || 'Unknown Clinic',
              rating: paper.rating || 4.5,
              rank: index + 1,
              category: paper.tags?.[0] || 'General',
              views: paper.view_count || 0,
              upvotes: paper.upvote_count || 0,
              published: new Date(paper.created_at).toISOString().split('T')[0],
              weighted_score: paper.weighted_score || 0
            }));
            setResearch(transformedPapers);
          } else {
            // No real data available
            setResearch([]);
          }
        }
      } catch (error) {
        console.error('Error fetching top research papers:', error);
        setResearch([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopResearch();
  }, []);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600'; // Gold
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500'; // Silver
      case 3: return 'bg-gradient-to-r from-orange-400 to-orange-600'; // Bronze
      case 4: return 'bg-gradient-to-r from-blue-400 to-blue-600'; // Blue
      case 5: return 'bg-gradient-to-r from-green-400 to-green-600'; // Green
      default: return 'bg-gradient-to-r from-purple-400 to-purple-600'; // Purple
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Cardiology': 'bg-red-100 text-red-800',
      'Technology': 'bg-blue-100 text-blue-800',
      'Pediatrics': 'bg-pink-100 text-pink-800',
      'Neurology': 'bg-purple-100 text-purple-800',
      'Telemedicine': 'bg-green-100 text-green-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (research.length === 0) {
  return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">📚</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Research Papers This Week</h3>
        <p className="text-gray-600 mb-4">Be the first to share your research!</p>
        {(user?.user_type === 'doctor' || user?.is_admin) && (
          <a 
            href="/research-lab" 
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            <span className="mr-2">📝</span>
            Submit Research
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-2 sm:space-y-3">
      {research.map((paper) => (
        <div 
          key={paper.id} 
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-lg"
          onMouseEnter={() => setHoveredPaper(paper.id)}
          onMouseLeave={() => setHoveredPaper(null)}
        >
          {/* Ultra Compact Folded Header */}
          <div className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${getRankColor(paper.rank)}`}>
                  {paper.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{paper.title}</h3>
                  <div className="text-xs text-gray-500 truncate">
                    {paper.author} • {paper.clinic}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
                <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap ${getCategoryColor(paper.category)}`}>
                  research
                </span>
                <div className="text-right hidden sm:block">
                  <div className="flex items-center">
                    <span className="text-sm font-bold text-purple-600">{paper.rating}</span>
                    <span className="text-xs text-gray-500 ml-1">★</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Expanded Content - Only visible on hover */}
          {hoveredPaper === paper.id && (
            <div className="px-3 pb-3 border-t border-gray-100 bg-gray-50">
              <div className="pt-2">
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <h4 className="text-xs font-medium text-gray-900 mb-1">Statistics</h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Views:</span>
                        <span className="font-medium">{paper.views}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Upvotes:</span>
                        <span className="font-medium">{paper.upvotes}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-medium text-gray-900 mb-1">Rating</h4>
            <div className="flex items-center">
                      <div className="w-12 bg-gray-200 rounded-full h-1.5 mr-2">
                <div 
                          className="bg-purple-600 h-1.5 rounded-full" 
                  style={{ width: `${(paper.rating / 5) * 100}%` }}
                ></div>
              </div>
                      <span className="text-xs font-medium text-gray-700">{paper.rating}/5</span>
            </div>
          </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-xs">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>Like</span>
                    </button>
                    <button className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-xs">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Download</span>
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {new Date(paper.published).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FoldableResearchSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className="transition-all duration-300"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Folded Header - Always Visible */}
      <div className="text-center py-3 sm:py-4 cursor-pointer px-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Top 3 Research Papers This Week</h2>
        <p className="text-xs sm:text-sm text-gray-600">
          {isExpanded ? 'Tap to collapse' : 'Tap to explore the most popular research from our medical community'}
        </p>
      </div>
      
      {/* Expanded Content - Visible on hover (desktop) or click (mobile) */}
      {isExpanded && (
        <div className="mt-4 sm:mt-8 px-2 sm:px-0">
          {isAuthenticated ? (
            <TopResearchSection />
          ) : (
            <BlurredResearchSection />
          )}
        </div>
      )}
    </div>
  );
}

function FoldableFeaturesSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className="transition-all duration-300"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Folded Header - Always Visible */}
      <div className="text-center py-3 sm:py-4 px-2 cursor-pointer">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Platform Features</h2>
        <p className="text-xs sm:text-sm text-gray-600">
          {isExpanded ? 'Tap to collapse' : 'Tap to explore our comprehensive platform features'}
        </p>
      </div>
      
      {/* Expanded Content - Visible on hover (desktop) or click (mobile) */}
      {isExpanded && (
        <div className="mt-4 sm:mt-8 px-2 sm:px-0">
          <HoverableFeaturesSection />
        </div>
      )}
    </div>
  );
}

function HoverableFeaturesSection() {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const features = [
    {
      id: 'ordering',
      icon: '🛒',
      title: 'Product Ordering',
      shortDescription: 'Browse and order from our extensive catalog of medical supplies and equipment.',
      fullDescription: 'Our comprehensive product ordering system allows you to browse through thousands of medical supplies, equipment, and pharmaceuticals. With real-time inventory tracking, competitive pricing, and fast delivery options, you can efficiently manage your clinic\'s supply chain.',
      benefits: [
        'Real-time inventory tracking',
        'Competitive pricing',
        'Fast delivery options',
        'Bulk ordering discounts',
        'Automated reorder reminders'
      ],
      link: '/order'
    },
    {
      id: 'leaderboard',
      icon: '🏆',
      title: 'Leaderboard System',
      shortDescription: 'Track your clinic\'s performance and compete with other medical professionals.',
      fullDescription: 'Our leaderboard system helps you track your clinic\'s performance metrics and compare with other medical professionals. Earn points through research publications, patient satisfaction, and community engagement.',
      benefits: [
        'Performance tracking',
        'Peer comparison',
        'Achievement badges',
        'Monthly rankings',
        'Recognition rewards'
      ],
      link: '/leaderboard'
    },
    {
      id: 'research',
      icon: '📚',
      title: 'Research Papers',
      shortDescription: 'Share and discover cutting-edge medical research from fellow professionals.',
      fullDescription: 'Our research platform enables you to publish, share, and discover cutting-edge medical research. Collaborate with peers, get peer reviews, and contribute to the advancement of medical knowledge.',
      benefits: [
        'Peer-reviewed publications',
        'Research collaboration',
        'Citation tracking',
        'Impact metrics',
        'Knowledge sharing'
      ],
      link: '/research'
    },
    {
      id: 'advertisement',
      icon: '📢',
      title: 'Advertisement',
      shortDescription: 'Promote your clinic and services to our medical community.',
      fullDescription: 'Our advertisement platform allows you to showcase your clinic, services, and expertise to our growing medical community. Reach targeted healthcare professionals and increase your visibility.',
      benefits: [
        'Targeted healthcare audience',
        'Multiple placement options',
        'Performance tracking',
        'Flexible pricing',
        'Professional promotion'
      ],
      link: '/advertisement/apply'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-2 sm:space-y-3">
      {features.map((feature) => (
        <div 
          key={feature.id} 
          className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg"
          onMouseEnter={() => setHoveredFeature(feature.id)}
          onMouseLeave={() => setHoveredFeature(null)}
        >
          {/* Ultra Compact Folded Header */}
          <div className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-base sm:text-lg flex-shrink-0">
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{feature.title}</h3>
                  <p className="text-xs text-gray-600 truncate hidden sm:block">{feature.shortDescription}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
                <a 
                  href={feature.id === 'advertisement' ? '/advertisement/apply' : feature.link}
                  className="px-2 sm:px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Explore
                </a>
              </div>
            </div>
          </div>
          
          {/* Expanded Content - Only visible on hover */}
          {hoveredFeature === feature.id && (
            <div className="px-3 pb-3 border-t border-gray-100 bg-gray-50">
              <div className="pt-2">
                <div className="mb-2">
                  <h4 className="text-xs font-medium text-gray-900 mb-1">Overview</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{feature.fullDescription}</p>
                </div>
                
                <div className="mb-2">
                  <h4 className="text-xs font-medium text-gray-900 mb-1">Benefits</h4>
                  <div className="grid grid-cols-1 gap-1">
                    {feature.benefits.slice(0, 3).map((benefit, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                        <span className="text-xs text-gray-600">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 text-center">
                    Hover for details
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BlurredClinicsSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-blue-200 opacity-50 blur-sm"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-lg">
                {index}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">***</div>
                <div className="text-sm text-gray-500">Score</div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">*** *** ***</h3>
            <p className="text-gray-600 mb-4">Dr. *** ***</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Performance</span>
              <div className="flex items-center">
                <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                  <div className="bg-blue-600 h-2 rounded-full w-3/4"></div>
                </div>
                <span className="text-sm font-medium text-gray-700">***%</span>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
            <div className="text-center">
              <div className="text-white font-bold text-lg mb-2">🔒</div>
              <div className="text-white text-sm">Sign in to view details</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BlurredResearchSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-purple-200 opacity-50 blur-sm"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                index === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                index === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                'bg-gradient-to-r from-orange-400 to-orange-600'
              }`}>
                {index}
              </div>
              <div className="text-right">
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-purple-600">4.**</span>
                  <span className="text-sm text-gray-500 ml-1">★</span>
                </div>
                <div className="text-sm text-gray-500">*** views</div>
                <div className="text-sm text-gray-500">** upvotes</div>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">*** *** *** ***</h3>
            <p className="text-gray-600 mb-2">Dr. *** ***</p>
            <p className="text-sm text-gray-500 mb-3">*** ***</p>
            
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                ***
              </span>
              <span className="text-xs text-gray-500">***</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Rating</span>
              <div className="flex items-center">
                <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                  <div className="bg-purple-600 h-2 rounded-full w-4/5"></div>
                </div>
                <span className="text-sm font-medium text-gray-700">4.**/5</span>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
            <div className="text-center">
              <div className="text-white font-bold text-lg mb-2">🔒</div>
              <div className="text-white text-sm">Sign in to view research</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Top3Sidebar() {
  const [top3, setTop3] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTagline, setEditingTagline] = useState<string | null>(null);
  const [newTagline, setNewTagline] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    // Fetch real top 3 performers from leaderboard
    const fetchTop3 = async () => {
      try {
        // Use centralized API instance
        const response = await api.get('/public/leaderboard');
        if (response.data.success && response.data.data.leaderboard.length > 0) {
          const result = response.data;
          if (result.success && result.data.leaderboard.length > 0) {
            // Get top 3 from leaderboard and format for display
            const top3Entries = result.data.leaderboard.slice(0, 3);
            
            // Fetch bio (tagline) for each entry
            const top3Data = await Promise.all(top3Entries.map(async (entry: any) => {
              let businessTagline = null;
              try {
                const token = getAccessToken();
                if (token && entry.id) {
                  // Use centralized API instance
                  const statsResponse = await api.get(`/user-stats/${entry.id}`);
                  if (statsResponse.data.success) {
                    const statsData = statsResponse.data;
                    businessTagline = statsData.data?.bio || null;
                  }
                }
              } catch (error) {
                // Silently fail - tagline will be null
                console.log('Could not fetch tagline for entry:', entry.id);
              }
              
              return {
                id: entry.id, // Use UUID as ID
                doctor_id: entry.doctor_id,
                name: entry.clinic_name,
                doctor: entry.doctor_name,
                rank: entry.rank,
                tier: entry.tier,
                businessTagline: businessTagline // Load from bio field
              };
            }));
            
            setTop3(top3Data);
          }
        }
      } catch (error) {
        console.error('Error fetching top 3:', error);
        // Fallback to empty array if API fails
        setTop3([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTop3();
  }, []);

  const handleEditTagline = (clinicId: string, currentTagline: string) => {
    setEditingTagline(clinicId);
    setNewTagline(currentTagline || '');
  };

  const handleSaveTagline = async (clinicId: string) => {
    if (!newTagline.trim()) {
      setEditingTagline(null);
      setNewTagline('');
      return;
    }

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Please login to save tagline');
        setEditingTagline(null);
        setNewTagline('');
        return;
      }

      // Use centralized API instance
      const response = await api.put(`/user-stats/${clinicId}`, {
        bio: newTagline.trim() // Store tagline in bio field
      });

      if (response.data.success) {
        // Refetch top 3 data to ensure persistence is visible
        const refetchResponse = await api.get('/public/leaderboard');
        if (refetchResponse.data.success && refetchResponse.data.data.leaderboard.length > 0) {
          const refetchResult = refetchResponse.data;
          if (refetchResult.success && refetchResult.data.leaderboard.length > 0) {
            const top3Entries = refetchResult.data.leaderboard.slice(0, 3);
            
            // Refetch bio (tagline) for each entry
            const top3Data = await Promise.all(top3Entries.map(async (entry: any) => {
              let businessTagline = null;
              try {
                if (token && entry.id) {
                  // Use centralized API instance
                  const statsResponse = await api.get(`/user-stats/${entry.id}`);
                  if (statsResponse.data.success) {
                    const statsData = statsResponse.data;
                    businessTagline = statsData.data?.bio || null;
                  }
                }
              } catch (error) {
                console.log('Could not fetch tagline for entry:', entry.id);
              }
              
              return {
                id: entry.id,
                doctor_id: entry.doctor_id,
                name: entry.clinic_name,
                doctor: entry.doctor_name,
                rank: entry.rank,
                tier: entry.tier,
                businessTagline: businessTagline
              };
            }));
            
            setTop3(top3Data);
          }
        }
        toast.success('Tagline saved successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || errorData.message || 'Failed to save tagline');
      }
    } catch (error) {
      console.error('Error saving tagline:', error);
      toast.error('Failed to save tagline');
    } finally {
      setEditingTagline(null);
      setNewTagline('');
    }
  };

  const handleCancelEdit = () => {
    setEditingTagline(null);
    setNewTagline('');
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600'; // Gold
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500'; // Silver
      case 3: return 'bg-gradient-to-r from-orange-400 to-orange-600'; // Bronze
      default: return 'bg-gradient-to-r from-blue-400 to-blue-600';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏆';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* My Profile Button - Top Right - Only show for doctors */}
      {user && (user.user_type === 'doctor' || user.is_admin) && (
        <div className="flex justify-center mb-2">
          <a 
            href={`/user/${user.id}`}
            className="inline-flex items-center space-x-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
            title="Go to My Profile"
          >
            <span>👤</span>
            <span>My Profile</span>
          </a>
        </div>
      )}

      {/* Top 3 Performers */}
      {top3.map((clinic) => (
        <a 
          key={clinic.id} 
          href={`/user/${clinic.id}`}
          className="block bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-2 sm:p-3 border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm ${getRankColor(clinic.rank)}`}>
              {clinic.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1 mb-0.5">
                <span className="text-sm sm:text-lg">{getRankIcon(clinic.rank)}</span>
                <h4 className="font-semibold text-gray-900 text-xs hover:text-blue-600 transition-colors truncate">{clinic.name}</h4>
              </div>
              <p className="text-gray-600 text-[10px] sm:text-xs hover:text-blue-500 transition-colors truncate">{clinic.doctor}</p>
              
              {/* Business Tagline for Top 3 - User can add their own */}
              {clinic.rank <= 3 && (
                <div className="mb-2">
                  {editingTagline === clinic.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newTagline}
                        onChange={(e) => setNewTagline(e.target.value)}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        placeholder="Enter your business tagline..."
                        className="w-full text-xs px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        maxLength={100}
                        autoFocus
                      />
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSaveTagline(clinic.id);
                          }}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                          className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      {clinic.businessTagline ? (
                        <p className="text-xs text-blue-600 font-medium italic bg-blue-50 px-2 py-1 rounded border-l-2 border-blue-300 flex-1">
                          "{clinic.businessTagline}"
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic bg-gray-50 px-2 py-1 rounded border-l-2 border-gray-300 flex-1">
                          No tagline added yet
                        </p>
                      )}
                      {user && (user.id === clinic.id || user.doctor_id === clinic.doctor_id) && clinic.rank <= 3 && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditTagline(clinic.id, clinic.businessTagline || '');
                          }}
                          className="ml-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit business tagline (Top 3 only)"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Tier Progress Bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                    {clinic.tier}
                  </span>
                  <span className="font-bold text-gray-900">
                    {clinic.tier_progress ? `${Math.round(clinic.tier_progress)}%` : '100%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      clinic.rank === 1
                        ? 'bg-red-500'
                        : clinic.rank === 2
                        ? 'bg-blue-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${clinic.tier_progress || 100}%` }}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-center">
                <span className="text-xs font-medium text-green-600">Top Performer</span>
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function BlurredTop3Sidebar() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((rank) => (
        <div key={rank} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-2 sm:p-3 border border-gray-200 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-blue-200 opacity-50 blur-sm"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm ${
                rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                'bg-gradient-to-r from-orange-400 to-orange-600'
              }`}>
                {getOrdinalPosition(rank)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1 mb-0.5">
                  <span className="text-sm sm:text-lg">
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                  </span>
                  <h4 className="font-semibold text-gray-900 text-xs">*** *** ***</h4>
                </div>
                <p className="text-gray-600 text-[10px] sm:text-xs">Dr. *** ***</p>
                
                {/* Blurred Business Tagline */}
                <p className="text-[10px] text-gray-400 italic truncate mt-0.5">"*** *** ***"</p>
                
                {/* Blurred Tier Progress Bar */}
                <div className="mt-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
                    <span className="px-1.5 py-0.5 rounded-full bg-gray-100 font-medium">*** ***</span>
                    <span className="font-bold">**%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-gray-400" style={{ width: '60%' }} />
                  </div>
                </div>
                
                <div className="flex items-center justify-center mt-1">
                  <span className="text-[10px] font-medium text-green-600">Top Performer</span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
            <div className="text-center">
              <div className="text-white font-bold text-sm mb-0.5">🔒</div>
              <div className="text-white text-[10px]">Sign in to view</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminDashboardButton({ user, isAuthenticated, onNavigate }: { user: any; isAuthenticated: boolean; onNavigate: (path: string) => void }) {
  // Always log when component renders
  console.log('🔍 AdminDashboardButton - Component rendered', { 
    hasUser: !!user,
    isAuthenticated,
    userId: user?.id, 
    email: user?.email, 
    is_admin: user?.is_admin 
  });
  
  const { permissionData, loading } = useAdminPermission();
  
  // Debug logging
  console.log('🔍 AdminDashboardButton - After hook', { 
    id: user?.id, 
    email: user?.email, 
    is_admin: user?.is_admin,
    permissionData,
    loading
  });
  
  // Check if user has admin access:
  // 1. Main admin (is_admin flag set)
  // 2. Has admin permission record (any type: viewer/custom/full)
  // ALL admin types (viewer, custom, full) should see the dashboard button
  const hasAdminAccess = user?.is_admin || 
    (permissionData?.hasPermission === true) || 
    (permissionData?.permissionType && ['viewer', 'custom', 'full'].includes(permissionData.permissionType));

  console.log('🔍 AdminDashboardButton - Has Admin Access:', hasAdminAccess);

  // Show loading state while checking (but only for a short time)
  if (loading) {
    // Don't show button while loading, but don't wait forever
    return null;
  }

  // Don't show if no admin access
  if (!hasAdminAccess) {
    console.log('❌ AdminDashboardButton - No admin access, not showing button');
    return null;
  }

  console.log('✅ AdminDashboardButton - Showing admin dashboard button');

  const getBadge = () => {
    if (user?.is_admin && !permissionData?.permission) {
      return (
        <div className="flex items-center justify-center space-x-2">
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium border border-red-200">
            🔑 Full Administrator
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium border border-green-200">
            All Access
          </span>
        </div>
      );
    }
    
    if (permissionData?.permissionType === 'full') {
      return (
        <div className="flex items-center justify-center space-x-2">
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium border border-red-200">
            🛡️ Full Admin
          </span>
        </div>
      );
    }
    
    if (permissionData?.permissionType === 'custom') {
      return (
        <div className="flex items-center justify-center space-x-2">
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium border border-yellow-200">
            ⚙️ Custom Admin
          </span>
        </div>
      );
    }
    
    if (permissionData?.permissionType === 'viewer') {
      return (
        <div className="flex items-center justify-center space-x-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium border border-blue-200">
            👁️ Viewer Admin
          </span>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="flex flex-col space-y-2">
      <button
        onClick={() => onNavigate('/admin')}
        className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors group"
        title="Admin Dashboard"
      >
        <div className="w-8 h-8 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
          <span className="text-gray-700 font-bold text-sm">⚙️</span>
        </div>
        <span className="font-medium">Admin Dashboard</span>
      </button>
      {getBadge()}
    </div>
  );
}

function ProtectedNavigation() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // If user is not approved, redirect to waiting-approval page
    // Regular users are auto-approved, so they bypass this
    if (!user?.is_approved && !user?.is_admin && user?.user_type !== 'regular' && (user as any)?.user_type !== 'regular_user') {
      router.push('/waiting-approval');
      return;
    }
    
    router.push(path);
  };

  const canAccessFeature = (feature: string) => {
    if (!isAuthenticated) return false;
    
    // Regular users are auto-approved and should have view access to these features
    const userType = user?.user_type || (user as any)?.user_type || '';
    const isRegularUser = userType === 'regular' || userType === 'regular_user';
    
    switch (feature) {
      case 'leaderboard':
        // Regular users, approved users, and admins can view leaderboard
        return isRegularUser || user?.is_approved || user?.is_admin;
      case 'order':
        // Regular users, approved users, and admins can place orders
        return isRegularUser || user?.is_approved || user?.is_admin;
      case 'research':
        // Regular users, approved users, and admins can view research papers
        return isRegularUser || user?.is_approved || user?.is_admin;
      case 'admin':
        return user?.is_admin;
      default:
        return false;
    }
  };

  const getFeatureTitle = (feature: string) => {
    if (!isAuthenticated) {
      return `Sign in to access ${feature}`;
    }
    
    if (!canAccessFeature(feature)) {
      return 'Access pending approval';
    }
    
    return `Access ${feature}`;
  };

  return (
    <div className="flex items-center space-x-6">
      {/* Leaderboard - Available to approved users and admins */}
      <button
        onClick={() => handleNavigation('/leaderboard')}
        className={`flex items-center space-x-2 transition-colors group ${
          canAccessFeature('leaderboard')
            ? 'text-gray-700 hover:text-blue-600' 
            : 'text-gray-400 cursor-pointer'
        }`}
        title={getFeatureTitle('Leaderboard')}
        disabled={!canAccessFeature('leaderboard')}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform shadow-sm ${
          canAccessFeature('leaderboard')
            ? 'bg-white border-2 border-gray-300 group-hover:scale-110' 
            : 'bg-gray-100 border-2 border-gray-200'
        }`}>
          <span className={`font-bold text-sm ${
            canAccessFeature('leaderboard') ? 'text-gray-700' : 'text-gray-400'
          }`}>🏆</span>
        </div>
        <span className={`font-medium ${
          canAccessFeature('leaderboard') ? 'text-gray-700' : 'text-gray-400'
        }`}>Leaderboard</span>
      </button>
      
      {/* Order Products - Available to approved users and admins (not employees) */}
      {user?.user_type !== 'employee' && (
        <button
          onClick={() => handleNavigation('/order')}
          className={`flex items-center space-x-2 transition-colors group ${
            canAccessFeature('order')
              ? 'text-gray-700 hover:text-blue-600' 
              : 'text-gray-400 cursor-pointer'
          }`}
          title={getFeatureTitle('Order Products')}
          disabled={!canAccessFeature('order')}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform shadow-sm ${
            canAccessFeature('order')
              ? 'bg-white border-2 border-gray-300 group-hover:scale-110' 
              : 'bg-gray-100 border-2 border-gray-200'
          }`}>
            <span className={`font-bold text-sm ${
              canAccessFeature('order') ? 'text-gray-700' : 'text-gray-400'
            }`}>🛒</span>
          </div>
          <span className={`font-medium ${
            canAccessFeature('order') ? 'text-gray-700' : 'text-gray-400'
          }`}>Order Products</span>
        </button>
      )}
      
      {/* Research Papers - Available to approved users and admins */}
      <button
        onClick={() => handleNavigation('/research')}
        className={`flex items-center space-x-2 transition-colors group ${
          canAccessFeature('research')
            ? 'text-gray-700 hover:text-blue-600' 
            : 'text-gray-400 cursor-pointer'
        }`}
        title={getFeatureTitle('Research Papers')}
        disabled={!canAccessFeature('research')}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform shadow-sm ${
          canAccessFeature('research')
            ? 'bg-white border-2 border-gray-300 group-hover:scale-110' 
            : 'bg-gray-100 border-2 border-gray-200'
        }`}>
          <span className={`font-bold text-sm ${
            canAccessFeature('research') ? 'text-gray-700' : 'text-gray-400'
          }`}>📚</span>
        </div>
        <span className={`font-medium ${
          canAccessFeature('research') ? 'text-gray-700' : 'text-gray-400'
        }`}>Research Papers</span>
      </button>
      
      {/* Hall of Pride - Available to all authenticated users */}
      <button
        onClick={() => handleNavigation('/hall-of-pride')}
        className={`flex items-center space-x-2 transition-colors group ${
          isAuthenticated
            ? 'text-gray-700 hover:text-blue-600' 
            : 'text-gray-400 cursor-pointer'
        }`}
        title={isAuthenticated ? 'View Hall of Pride' : 'Sign in to view Hall of Pride'}
        disabled={!isAuthenticated}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform shadow-sm ${
          isAuthenticated
            ? 'bg-white border-2 border-gray-300 group-hover:scale-110' 
            : 'bg-gray-100 border-2 border-gray-200'
        }`}>
          <span className={`text-lg ${
            isAuthenticated ? 'text-gray-700' : 'text-gray-400'
          }`}>🏆</span>
        </div>
        <span className={`font-medium ${
          isAuthenticated ? 'text-gray-700' : 'text-gray-400'
        }`}>Hall of Pride</span>
      </button>

      {/* Admin Dashboard - Available to admins or users with admin permissions */}
      <AdminDashboardButton user={user} isAuthenticated={isAuthenticated} onNavigate={handleNavigation} />
    </div>
  );
}

export default function Home() {
  const [videoAdvertisementModalOpen, setVideoAdvertisementModalOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [activeBackground, setActiveBackground] = useState<any>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  
  const performSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setIsSearching(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Please login to search');
        return;
      }

      // Use centralized API instance
      const response = await api.get('/search', {
        params: { q: searchQuery.trim() }
      });

      if (response.data.success) {
        setSearchResults(response.data.results || []);
      } else {
        toast.error('Search failed');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error performing search:', error);
      toast.error('Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const fetchActiveBackground = async () => {
      try {
        // Use centralized API instance
        const response = await api.get('/backgrounds/active');
        if (response.data.success) {
          setActiveBackground(response.data.background);
        } else {
          // If API fails, just use default background (no error needed)
          setActiveBackground(null);
        }
      } catch (error) {
        // Silently handle error - use default background
        console.log('Using default background due to API unavailability');
        setActiveBackground(null);
      }
    };

    fetchActiveBackground();
  }, []);

  // Redirect unapproved employees to waiting dashboard
  useEffect(() => {
    if (isAuthenticated && user?.user_type === 'employee' && !user?.is_approved && !user?.is_admin) {
      router.push('/waiting-approval');
    }
  }, [isAuthenticated, user, router]);

  const getBackgroundStyle = () => {
    if (!activeBackground) {
      return {
        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
      };
    }

    switch (activeBackground.background_type) {
      case 'image':
        // Use Next.js API proxy route for images
        const imageUrl = activeBackground.background_value.startsWith('/')
          ? `/api/images${activeBackground.background_value}`
          : `/api/images/${activeBackground.background_value}`;
        return {
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed' // Keep background fixed while scrolling
        };
      case 'gradient':
        return {
          background: activeBackground.background_value,
          backgroundAttachment: 'fixed'
        };
      case 'color':
        return {
          backgroundColor: activeBackground.background_value
        };
      default:
        return {
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
        };
    }
  };

  // Show simplified employee view with just company logo
  // Only show if employee is approved, otherwise redirect to waiting dashboard
  if (isAuthenticated && user?.user_type === 'employee') {
    // Show loading while redirecting unapproved employees
    if (!user?.is_approved && !user?.is_admin) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Redirecting...</p>
          </div>
        </div>
      );
    }

    // Only show dashboard button if employee is approved
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header 
          onLoginClick={() => {
            router.push('/login');
          }}
          onRegisterClick={() => {
            router.push('/signup/select-type');
          }}
          isAuthenticated={isAuthenticated}
          user={user}
        />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <img src="/logo.png" alt="AestheticRx Network" className="w-60 h-60 sm:w-72 sm:h-72 object-contain" />
              <span className="text-4xl font-bold"><span style={{ color: '#1E66FF' }}>Aesthetic</span><span style={{ color: '#F5C24C' }}>RX</span><span style={{ color: '#7AAC52' }}> Network</span></span>
            </div>
            <p className="text-gray-600 text-lg mb-8">
              Professional B2B platform for clinics
            </p>
            {user?.is_approved && (
              <button
                onClick={() => router.push('/employee/dashboard')}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium shadow-lg"
              >
                Go to Employee Dashboard
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={getBackgroundStyle()}>
      <Header 
        onLoginClick={() => {
          router.push('/login');
        }}
        onRegisterClick={() => {
          router.push('/signup/select-type');
        }}
        isAuthenticated={isAuthenticated}
        user={user}
        onSearchClick={() => setShowSearchModal(true)}
      />
      
      <main>
        {/* Header Advertisement Banner - Responsive */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="container mx-auto px-4 py-2">
            {/* Mobile Header Banner */}
            <div className="block md:hidden">
              <VideoAdvertisementDisplay 
                areaName="mobile-header-banner" 
                deviceType="mobile"
                className="mobile-header-banner mx-auto"
              />
            </div>
            {/* Desktop Header Banner */}
            <div className="hidden md:block">
              <VideoAdvertisementDisplay 
                areaName="desktop-header-banner" 
                deviceType="desktop"
                className="header-banner mx-auto"
              />
            </div>
                      </div>
                    </div>

        <section className="relative py-20 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              {/* Left Sidebar - Top 3 Performers */}
            <div className="w-full lg:w-80 flex-shrink-0 order-2 lg:order-1">
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-1 text-center">🏆 Top 3</h3>
                <p className="text-xs text-gray-600 mb-3 text-center">Top Performer from last month</p>
                
                {/* Mobile Top 3 Section Ad */}
                <div className="block md:hidden mb-4">
                  <VideoAdvertisementDisplay 
                    areaName="mobile-top3-section" 
                    deviceType="mobile"
                    className="mobile-top3-section-ad w-full"
                  />
                </div>
                  {isAuthenticated ? (
                    <Top3Sidebar />
                  ) : (
                    <BlurredTop3Sidebar />
                  )}
                </div>
                
                {/* Sidebar Advertisement - Top */}
                <div className="mt-4">
                  <VideoAdvertisementDisplay 
                    areaName="hero_section_main" 
                    deviceType="desktop"
                    className="hero-section-ad w-full"
                  />
                </div>
                
                {/* Sidebar Advertisement - Bottom */}
                <div className="mt-4">
                  <VideoAdvertisementDisplay 
                    areaName="hero_section_main" 
                    deviceType="desktop"
                    className="hero-section-ad w-full"
                  />
                </div>
              </div>
              
              {/* Main Hero Content */}
              <div className="flex-1 order-1 lg:order-2">
                <div className="max-w-5xl mx-auto">
                  {/* Two Big CTA Cards with Product/Doctor Previews */}
                  <HeroCards />

                  <div className="text-center">
                    <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">
                    Professional <span className="text-blue-600">B2B Platform</span><br/>
                    for Clinics
                  </h1>
                    <p className="text-base text-gray-600 mb-6 max-w-2xl mx-auto">
                    Connect with fellow doctors, order medical supplies, share research, and track your clinic's performance on our exclusive platform.
                  </p>
                  
                  {/* Dynamic Video Advertisement - Content Top */}
                    <div className="mb-6">
                    {/* Mobile Hero Section Ad */}
                    <div className="block md:hidden">
                      <VideoAdvertisementDisplay 
                        areaName="mobile-hero-section" 
                        deviceType="mobile"
                        className="mobile-hero-section-ad mx-auto"
                      />
                    </div>
                    {/* Desktop Hero Section Ad */}
                    <div className="hidden md:block">
                      <VideoAdvertisementDisplay 
                        areaName="hero_section_main" 
                        deviceType="desktop"
                        className="hero-section-ad mx-auto max-w-4xl"
                      />
                    </div>
                  </div>
                    
                  {!isAuthenticated && (
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                      <a href="/signup/select-type" className="bg-blue-600 text-white px-8 py-4 text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                        Get Started
                      </a>
                      <a href="/login" className="border-2 border-blue-600 text-blue-600 px-8 py-4 text-lg font-semibold rounded-lg hover:bg-blue-50 transition-colors">
                        Sign In
                      </a>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Top Research Papers - Show blurred for non-authenticated, full for authenticated */}
        <section className="py-8 bg-gradient-to-br from-purple-50 to-pink-100">
          <div className="container mx-auto px-4">
            <FoldableResearchSection isAuthenticated={isAuthenticated} />
          </div>
          
          {/* Dynamic Video Advertisement - Content Middle */}
          <div className="container mx-auto px-4 mt-8">
            {/* Mobile Research Papers Ad */}
            <div className="block md:hidden">
              <VideoAdvertisementDisplay 
                areaName="mobile-research-papers" 
                deviceType="mobile"
                className="mobile-research-papers-ad mx-auto"
              />
            </div>
            {/* Desktop Research Papers Ad */}
            <div className="hidden md:block">
              <VideoAdvertisementDisplay 
                areaName="research_papers_section" 
                deviceType="desktop"
                className="research-papers-ad mx-auto max-w-4xl"
              />
            </div>
          </div>
        </section>
        
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <FoldableFeaturesSection />
            
            {/* Dynamic Video Advertisement - Content Bottom */}
            <div className="mt-8">
              <VideoAdvertisementDisplay 
                areaName="research_papers_section" 
                deviceType="desktop"
                className="research-papers-ad mx-auto max-w-4xl"
              />
            </div>
          </div>
        </section>

        {/* Contact Us Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <FoldableContactSection />
          </div>
        </section>
      </main>
      
      {/* Footer Advertisement Banner - Responsive */}
      <div className="bg-white border-t border-gray-200">
        <div className="container mx-auto px-4 py-4">
          {/* Mobile Contact Section Ad */}
          <div className="block md:hidden">
            <VideoAdvertisementDisplay 
              areaName="mobile-contact-section" 
              deviceType="mobile"
              className="mobile-contact-section-ad mx-auto"
            />
          </div>
          {/* Desktop Footer Ad */}
          <div className="hidden md:block">
            <VideoAdvertisementDisplay 
              areaName="research_papers_section" 
              deviceType="desktop"
              className="research-papers-ad mx-auto"
            />
          </div>
        </div>
      </div>
      
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img src="/logo.png" alt="AestheticRx Network" className="w-12 h-12 object-contain shadow-md rounded-lg" />
              <span className="text-xl font-bold"><span style={{ color: '#1E66FF' }}>Aesthetic</span><span style={{ color: '#F5C24C' }}>RX</span><span style={{ color: '#7AAC52' }}> Network</span></span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Professional B2B platform for clinics. Connect, order, research, and grow together.
            </p>
            <div className="flex items-center justify-center space-x-4 mb-4">
              <a href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors underline">Privacy Policy</a>
              <span className="text-gray-600">|</span>
              <a href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors underline">Terms of Service</a>
            </div>
            <p className="text-gray-400 text-sm">
              © 2025 AestheticRx Network. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      
      {/* Video Advertisement Modal */}
      <VideoAdvertisementModal 
        isOpen={videoAdvertisementModalOpen} 
        onClose={() => setVideoAdvertisementModalOpen(false)} 
      />

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Search</h2>
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctors, clinics, teams..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      performSearch();
                    }
                  }}
                />
                <button
                  onClick={performSearch}
                  disabled={isSearching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <MagnifyingGlassIcon className="w-4 h-4" />
                  )}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <h3 className="text-sm font-medium text-gray-700">Search Results</h3>
                  {searchResults.map((result, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{result.name}</h4>
                          <p className="text-sm text-gray-600">{result.type} • {result.details}</p>
                          {result.tier && (
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                              result.tier === 'Elite Lead' ? 'bg-red-100 text-red-800' :
                              result.tier === 'Grand Lead' ? 'bg-purple-100 text-purple-800' :
                              result.tier === 'Lead Expert' ? 'bg-blue-100 text-blue-800' :
                              result.tier === 'Lead Contributor' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {result.tier}
                            </span>
                          )}
                        </div>
                        {result.email && (
                          <button
                            onClick={() => {
                              window.location.href = '/leaderboard';
                            }}
                            className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg hover:bg-blue-200"
                          >
                            View Profile
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-8 text-gray-500">
                  <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No results found for "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
