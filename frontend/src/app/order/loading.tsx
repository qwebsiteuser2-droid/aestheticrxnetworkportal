// Order page loading skeleton
export default function OrderLoading() {
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
          <div className="h-10 bg-gray-200 rounded animate-pulse w-56 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-80 mx-auto"></div>
        </div>

        {/* Category filter skeleton */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-28 bg-gray-200 rounded-full animate-pulse"></div>
          ))}
        </div>

        {/* Search skeleton */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>

        {/* Products grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Product image */}
              <div className="h-48 bg-gray-200 animate-pulse"></div>
              
              {/* Product info */}
              <div className="p-4">
                {/* Name */}
                <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4 mb-2"></div>
                
                {/* Category badge */}
                <div className="h-5 w-20 bg-blue-100 rounded-full animate-pulse mb-3"></div>
                
                {/* Description */}
                <div className="space-y-1 mb-4">
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6"></div>
                </div>

                {/* Price and cart */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-10 w-24 bg-blue-200 rounded-lg animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

