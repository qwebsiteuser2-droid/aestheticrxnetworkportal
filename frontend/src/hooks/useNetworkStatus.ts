'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  isOnline, 
  getConnectionQuality, 
  createConnectionListener,
  ConnectionStatus 
} from '@/lib/networkUtils';

interface NetworkStatus {
  isOnline: boolean;
  connectionQuality: 'fast' | 'slow' | 'offline';
  status: ConnectionStatus;
  lastOnline: Date | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true,
    connectionQuality: 'fast',
    status: 'online',
    lastOnline: null,
  });

  const updateStatus = useCallback(() => {
    const online = isOnline();
    const quality = getConnectionQuality();
    
    setStatus(prev => ({
      isOnline: online,
      connectionQuality: quality,
      status: !online ? 'offline' : quality === 'slow' ? 'slow' : 'online',
      lastOnline: online ? new Date() : prev.lastOnline,
    }));
  }, []);

  useEffect(() => {
    // Initial check
    updateStatus();

    // Set up listeners
    const cleanup = createConnectionListener(
      updateStatus, // onOnline
      updateStatus, // onOffline
      updateStatus  // onSlow
    );

    // Also check periodically for slow connection detection
    const interval = setInterval(updateStatus, 10000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, [updateStatus]);

  return status;
}

// Hook for showing connection warnings
export function useConnectionWarning() {
  const { status, isOnline, connectionQuality } = useNetworkStatus();
  const [showWarning, setShowWarning] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (status === 'offline' || status === 'slow') {
      setShowWarning(true);
      setDismissed(false);
    } else if (status === 'online' && !dismissed) {
      // Auto-hide after coming back online
      const timeout = setTimeout(() => setShowWarning(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [status, dismissed]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setShowWarning(false);
  }, []);

  return {
    showWarning: showWarning && !dismissed,
    status,
    isOnline,
    connectionQuality,
    dismiss,
  };
}

