// Hall of Pride page loading skeleton
export default function HallOfPrideLoading() {
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
        {/* Back button skeleton */}
        <div className="mb-6">
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Title skeleton */}
        <div className="text-center mb-12">
          <div className="h-12 bg-gray-200 rounded animate-pulse w-64 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-96 mx-auto"></div>
        </div>

        {/* Achievement cards grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6">
                {/* Trophy and badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-16 h-16 rounded-full bg-yellow-100 animate-pulse"></div>
                  <div className="w-12 h-12 bg-yellow-200 rounded animate-pulse"></div>
                </div>

                {/* Title */}
                <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4 mb-4"></div>

                {/* Doctor info */}
                <div className="mb-3">
                  <div className="h-5 bg-gray-200 rounded animate-pulse w-2/3 mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                </div>

                {/* Reason badge */}
                <div className="h-7 w-32 bg-gray-100 rounded-full animate-pulse mb-3"></div>

                {/* Description */}
                <div className="space-y-2 mb-4">
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-4/6"></div>
                </div>

                {/* Achievement type */}
                <div className="border-t border-gray-200 pt-3">
                  <div className="h-4 w-40 bg-blue-100 rounded animate-pulse mx-auto"></div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-3">
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse mx-auto"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

