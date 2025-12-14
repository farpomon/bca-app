/**
 * Offline Sync Provider
 * 
 * Initializes offline storage and starts automatic sync service.
 * Should be placed at the root of the app to enable offline-first functionality.
 */

import { useEffect, ReactNode } from "react";
import { initOfflineDB, cleanupCompletedSyncItems } from "@/lib/offlineStorage";
import { startAutoSync } from "@/lib/syncEngine";

interface OfflineSyncProviderProps {
  children: ReactNode;
}

export function OfflineSyncProvider({ children }: OfflineSyncProviderProps) {
  useEffect(() => {
    let initialized = false;

    async function initialize() {
      if (initialized) return;
      initialized = true;

      try {
        console.log("[OfflineSync] Initializing offline storage...");
        
        // Initialize IndexedDB
        await initOfflineDB();
        console.log("[OfflineSync] IndexedDB initialized");

        // Cleanup old completed sync items
        await cleanupCompletedSyncItems();
        console.log("[OfflineSync] Cleanup completed");

        // Start automatic sync service
        startAutoSync();
        console.log("[OfflineSync] Auto-sync started");

        console.log("[OfflineSync] Initialization complete");
      } catch (error) {
        console.error("[OfflineSync] Initialization failed:", error);
      }
    }

    initialize();
  }, []);

  return <>{children}</>;
}
