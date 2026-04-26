import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isHybridDataMode } from '@/lib/dataRuntime';
import { getPendingSyncCount, syncPendingMutations } from '@/lib/syncClient';

interface HybridSyncStatus {
  enabled: boolean;
  pendingCount: number;
  syncing: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  isOnline: boolean;
  syncNow: () => Promise<void>;
}

export function useHybridSyncStatus(): HybridSyncStatus {
  const { user } = useAuth();
  const username = user?.username;
  const enabled = isHybridDataMode();
  const [pendingCount, setPendingCount] = useState(() => getPendingSyncCount(username));
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const inFlightRef = useRef(false);

  const refreshPendingCount = () => {
    setPendingCount(getPendingSyncCount(username));
  };

  const syncNow = async () => {
    if (!enabled || inFlightRef.current) {
      refreshPendingCount();
      return;
    }

    inFlightRef.current = true;
    setSyncing(true);
    setLastError(null);

    try {
      const result = await syncPendingMutations(username);
      if (result.ok) {
        setLastSyncAt(new Date().toISOString());
      } else {
        setLastError(result.error || 'Error de sincronización');
      }
    } finally {
      inFlightRef.current = false;
      setSyncing(false);
      refreshPendingCount();
    }
  };

  useEffect(() => {
    refreshPendingCount();
    if (!enabled) return;

    const onOnline = () => {
      setIsOnline(true);
      void syncNow();
    };
    const onOffline = () => setIsOnline(false);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshPendingCount();
      }
    };

    const interval = window.setInterval(refreshPendingCount, 3000);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, username]);

  return {
    enabled,
    pendingCount,
    syncing,
    lastSyncAt,
    lastError,
    isOnline,
    syncNow,
  };
}
