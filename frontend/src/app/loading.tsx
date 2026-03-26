// Root loading state - Shows during initial page load and navigation
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          {/* Animated spinner */}
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          {/* Pulse effect */}
          <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-blue-600 opacity-20 animate-ping mx-auto"></div>
        </div>
        <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        <p className="mt-1 text-sm text-gray-400">AestheticRxNetwork</p>
      </div>
    </div>
  );
}

