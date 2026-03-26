'use client';

interface OnlineStatusDotProps {
  isOnline: boolean;
  availabilityStatus?: string;
  lastActiveAt?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function OnlineStatusDot({
  isOnline,
  availabilityStatus = 'available',
  lastActiveAt,
  showLabel = false,
  size = 'md',
}: OnlineStatusDotProps) {
  const getStatusColor = () => {
    if (!isOnline) return 'bg-gray-400';
    
    switch (availabilityStatus) {
      case 'available':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-green-500';
    }
  };

  const getStatusLabel = () => {
    if (!isOnline) {
      if (lastActiveAt) {
        const lastActive = new Date(lastActiveAt);
        const now = new Date();
        const diffMs = now.getTime() - lastActive.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
      }
      return 'Offline';
    }

    switch (availabilityStatus) {
      case 'available':
        return 'Online';
      case 'away':
        return 'Away';
      case 'busy':
        return 'Busy';
      default:
        return 'Online';
    }
  };

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div className="flex items-center space-x-1.5">
      <span
        className={`${sizeClasses[size]} ${getStatusColor()} rounded-full ${
          isOnline && availabilityStatus === 'available' ? 'animate-pulse' : ''
        }`}
      />
      {showLabel && (
        <span className="text-xs text-gray-500">{getStatusLabel()}</span>
      )}
    </div>
  );
}

