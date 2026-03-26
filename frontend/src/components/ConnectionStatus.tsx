'use client';

import { useConnectionWarning } from '@/hooks/useNetworkStatus';
import { XMarkIcon, WifiIcon, ExclamationTriangleIcon, SignalIcon } from '@heroicons/react/24/outline';
import { formatTimeAgo } from '@/lib/networkUtils';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function ConnectionStatusBanner() {
  const { showWarning, status, dismiss } = useConnectionWarning();
  const { lastOnline } = useNetworkStatus();

  if (!showWarning) return null;

  const isOffline = status === 'offline';
  const isSlow = status === 'slow';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 ${
        isOffline 
          ? 'bg-red-500' 
          : isSlow 
            ? 'bg-amber-500' 
            : 'bg-green-500'
      }`}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white">
            {isOffline ? (
              <>
                <WifiIcon className="w-5 h-5" />
                <span className="text-sm font-medium">
                  You&apos;re offline. Some features may not work.
                  {lastOnline && (
                    <span className="opacity-80 ml-1">
                      Last online: {formatTimeAgo(lastOnline)}
                    </span>
                  )}
                </span>
              </>
            ) : isSlow ? (
              <>
                <SignalIcon className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Slow connection detected. Loading may take longer.
                </span>
              </>
            ) : (
              <>
                <WifiIcon className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Connection restored!
                </span>
              </>
            )}
          </div>
          <button
            onClick={dismiss}
            className="text-white hover:bg-white/20 rounded p-1 transition-colors"
            aria-label="Dismiss"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact connection indicator for headers
export function ConnectionIndicator() {
  const { isOnline, connectionQuality } = useNetworkStatus();

  if (isOnline && connectionQuality === 'fast') return null;

  return (
    <div
      className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
        !isOnline
          ? 'bg-red-100 text-red-700'
          : connectionQuality === 'slow'
            ? 'bg-amber-100 text-amber-700'
            : ''
      }`}
    >
      {!isOnline ? (
        <>
          <WifiIcon className="w-3 h-3" />
          <span>Offline</span>
        </>
      ) : (
        <>
          <SignalIcon className="w-3 h-3" />
          <span>Slow</span>
        </>
      )}
    </div>
  );
}

// Loading skeleton components
export function SkeletonText({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  
  return (
    <div className={`animate-pulse bg-gray-200 rounded-full ${sizeClasses[size]}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow p-4 animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <SkeletonText className="h-4 w-3/4" />
          <SkeletonText className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonText className="h-3 w-full" />
        <SkeletonText className="h-3 w-5/6" />
        <SkeletonText className="h-3 w-4/6" />
      </div>
    </div>
  );
}

export function SkeletonProductCard() {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-4 space-y-2">
        <SkeletonText className="h-4 w-3/4" />
        <SkeletonText className="h-3 w-full" />
        <div className="flex justify-between items-center pt-2">
          <SkeletonText className="h-5 w-20" />
          <SkeletonText className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonDoctorCard() {
  return (
    <div className="bg-white rounded-lg shadow p-4 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonText className="h-4 w-3/4" />
          <SkeletonText className="h-3 w-1/2" />
          <div className="flex space-x-1">
            <SkeletonText className="h-5 w-16 rounded-full" />
            <SkeletonText className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-100 h-10 rounded-t-lg mb-1" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-gray-50 h-12 mb-1 rounded flex items-center px-4 space-x-4">
          <SkeletonText className="h-4 w-1/4" />
          <SkeletonText className="h-4 w-1/4" />
          <SkeletonText className="h-4 w-1/4" />
          <SkeletonText className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}

// Error state with retry
interface ErrorWithRetryProps {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ErrorWithRetry({ 
  message = 'Something went wrong', 
  onRetry, 
  isRetrying = false 
}: ErrorWithRetryProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {message}
      </h3>
      <p className="text-sm text-gray-500 mb-4 max-w-sm">
        This might be due to a slow internet connection. Please check your connection and try again.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isRetrying ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Retrying...</span>
            </>
          ) : (
            <span>Try Again</span>
          )}
        </button>
      )}
    </div>
  );
}

// Empty state
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

