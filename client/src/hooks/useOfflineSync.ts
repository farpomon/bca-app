/**
 * useOfflineSync Hook
 * 
 * React hook for managing offline synchronization state and operations.
 * Provides sync status, progress tracking, and manual sync triggers.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getSyncEngine, type SyncProgress, type SyncResult, type SyncEvent } from "@/lib/syncEngine";
import { getStorageStats, type StorageStats } from "@/lib/offlineStorage";
import { toast } from "sonner";

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  progress: SyncProgress | null;
  lastSyncResult: SyncResult | null;
  lastSyncTime: number | null;
  stats: StorageStats | null;
  pendingCount: number;
}

export interface OfflineSyncActions {
  startSync: () => Promise<void>;
  stopSync: () => void;
  refreshStats: () => Promise<void>;
}

/**
 * Hook for managing offline sync
 */
export function useOfflineSync(): OfflineSyncState & OfflineSyncActions {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const syncEngine = useRef(getSyncEngine());
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Refresh storage statistics
   */
  const refreshStats = useCallback(async () => {
    try {
      const newStats = await getStorageStats();
      setStats(newStats);
      
      // Calculate total pending items
      const pending = 
        newStats.assessments.pending +
        newStats.photos.pending +
        newStats.deficiencies.pending;
      
      setPendingCount(pending);
    } catch (error) {
      console.error("Failed to refresh stats:", error);
    }
  }, []);

  /**
   * Start manual sync
   */
  const startSync = useCallback(async () => {
    if (isSyncing) {
      toast.info("Sync already in progress");
      return;
    }

    if (!isOnline) {
      toast.error("Cannot sync while offline");
      return;
    }

    try {
      setIsSyncing(true);
      toast.info("Starting sync...");
      
      const result = await syncEngine.current.start();
      
      setLastSyncResult(result);
      setLastSyncTime(Date.now());
      
      if (result.success) {
        toast.success(`Sync complete! ${result.synced} items synced.`);
      } else {
        toast.warning(
          `Sync completed with errors. ${result.synced} synced, ${result.failed} failed.`
        );
      }
      
      await refreshStats();
    } catch (error: any) {
      console.error("Sync failed:", error);
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
      setProgress(null);
    }
  }, [isSyncing, isOnline, refreshStats]);

  /**
   * Stop sync
   */
  const stopSync = useCallback(() => {
    syncEngine.current.stop();
    setIsSyncing(false);
    setProgress(null);
    toast.info("Sync stopped");
  }, []);

  /**
   * Handle sync events
   */
  useEffect(() => {
    const handleSyncEvent = (event: SyncEvent) => {
      switch (event.type) {
        case "start":
          setIsSyncing(true);
          break;
        
        case "progress":
          if (event.progress) {
            setProgress(event.progress);
          }
          break;
        
        case "complete":
          setIsSyncing(false);
          setProgress(null);
          if (event.result) {
            setLastSyncResult(event.result);
            setLastSyncTime(Date.now());
          }
          break;
        
        case "error":
          setIsSyncing(false);
          setProgress(null);
          break;
      }
    };

    const unsubscribe = syncEngine.current.on(handleSyncEvent);
    return unsubscribe;
  }, []);

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connection restored");
      
      // Auto-start sync after a short delay
      setTimeout(() => {
        if (pendingCount > 0) {
          startSync();
        }
      }, 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are offline. Changes will be saved locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pendingCount, startSync]);

  /**
   * Refresh stats periodically
   */
  useEffect(() => {
    // Initial load
    refreshStats();

    // Refresh every 10 seconds
    statsIntervalRef.current = setInterval(refreshStats, 10000);

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [refreshStats]);

  return {
    isOnline,
    isSyncing,
    progress,
    lastSyncResult,
    lastSyncTime,
    stats,
    pendingCount,
    startSync,
    stopSync,
    refreshStats,
  };
}

/**
 * Format time ago (e.g., "2 minutes ago")
 */
export function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return "Never";
  
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
