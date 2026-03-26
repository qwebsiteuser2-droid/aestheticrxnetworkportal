// Leaderboard page loading skeleton
export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation skeleton */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title skeleton */}
        <div className="text-center mb-8">
          <div className="h-12 bg-gray-200 rounded animate-pulse w-48 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-72 mx-auto"></div>
        </div>

        {/* Top 3 podium skeleton */}
        <div className="flex justify-center items-end gap-4 mb-12">
          {/* 2nd place */}
          <div className="w-32">
            <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-1"></div>
            <div className="h-24 bg-gray-300 rounded-t-lg animate-pulse"></div>
          </div>
          {/* 1st place */}
          <div className="w-36">
            <div className="w-24 h-24 rounded-full bg-amber-200 animate-pulse mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-1"></div>
            <div className="h-32 bg-amber-300 rounded-t-lg animate-pulse"></div>
          </div>
          {/* 3rd place */}
          <div className="w-32">
            <div className="w-18 h-18 rounded-full bg-gray-200 animate-pulse mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-1"></div>
            <div className="h-20 bg-orange-200 rounded-t-lg animate-pulse"></div>
          </div>
        </div>

        {/* Leaderboard table skeleton */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-48"></div>
          </div>
          
          {/* Table rows */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center p-4 border-b border-gray-100 last:border-0">
              {/* Rank */}
              <div className="w-12 h-8 bg-gray-200 rounded animate-pulse"></div>
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse ml-4"></div>
              {/* Info */}
              <div className="flex-1 ml-4">
                <div className="h-5 bg-gray-200 rounded animate-pulse w-48 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
              </div>
              {/* Score */}
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

