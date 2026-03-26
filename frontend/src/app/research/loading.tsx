// Research page loading skeleton
export default function ResearchLoading() {
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
          <div className="h-10 bg-gray-200 rounded animate-pulse w-64 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-96 mx-auto"></div>
        </div>

        {/* Search and filter skeleton */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-12 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>

        {/* Research papers grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Paper thumbnail */}
              <div className="h-48 bg-gray-200 animate-pulse"></div>
              
              {/* Paper content */}
              <div className="p-6">
                {/* Title */}
                <div className="h-6 bg-gray-200 rounded animate-pulse w-full mb-2"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-2/3 mb-4"></div>
                
                {/* Author */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                </div>

                {/* Description */}
                <div className="space-y-2 mb-4">
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-4/6"></div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {[1, 2].map((j) => (
                    <div key={j} className="h-6 w-20 bg-purple-100 rounded-full animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

