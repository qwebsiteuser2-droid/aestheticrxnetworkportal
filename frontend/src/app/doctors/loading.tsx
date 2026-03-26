// Doctors page loading skeleton
export default function DoctorsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse w-48 mx-auto"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search bar skeleton */}
        <div className="mb-8">
          <div className="h-12 bg-gray-200 rounded-lg animate-pulse max-w-2xl mx-auto"></div>
        </div>

        {/* Filter buttons skeleton */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 rounded-full animate-pulse"></div>
          ))}
        </div>

        {/* Doctor cards grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Card header */}
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="flex-1">
                    {/* Name */}
                    <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4 mb-2"></div>
                    {/* Clinic */}
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                  {/* Status indicator */}
                  <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse"></div>
                </div>
                
                {/* Tags */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                  ))}
                </div>

                {/* Bio */}
                <div className="mt-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6"></div>
                </div>
              </div>

              {/* Card footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 w-32 bg-blue-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

