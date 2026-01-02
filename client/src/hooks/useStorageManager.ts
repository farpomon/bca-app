/**
 * useStorageManager Hook
 * 
 * Manages offline storage with:
 * - Storage quota tracking and warnings
 * - Automatic cleanup of old data
 * - LRU cache eviction for photos
 * - Storage usage visualization
 * - Export/import of offline data
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  getStorageUsage,
  cleanupOldData,
  evictPhotosIfNeeded,
  startAutomaticCleanup,
  stopAutomaticCleanup,
  getEnhancedStorageStats,
  STORAGE_LIMITS,
  type StorageUsage,
  type EnhancedStorageStats,
} from "@/lib/offlineStorageOptimized";
import {
  getAllItems,
  clearStore,
  deleteItem,
  updateItem,
  STORES,
  type OfflineAssessment,
  type OfflinePhoto,
  type OfflineDeficiency,
} from "@/lib/offlineStorage";

// ============================================================================
// Types
// ============================================================================

export interface StorageManagerState {
  usage: StorageUsage | null;
  stats: EnhancedStorageStats | null;
  isLoading: boolean;
  isCleaningUp: boolean;
  lastCleanupTime: number | null;
  warnings: StorageWarning[];
}

export interface StorageWarning {
  id: string;
  type: "quota_high" | "quota_critical" | "sync_stale" | "cleanup_needed";
  message: string;
  severity: "info" | "warning" | "error";
  timestamp: number;
}

export interface CleanupResult {
  deletedAssessments: number;
  deletedPhotos: number;
  deletedSyncItems: number;
  freedBytes: number;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  assessments: OfflineAssessment[];
  photos: Array<Omit<OfflinePhoto, "blob" | "originalBlob"> & { blobBase64?: string }>;
  deficiencies: OfflineDeficiency[];
}

// ============================================================================
// Hook
// ============================================================================

export function useStorageManager() {
  const [state, setState] = useState<StorageManagerState>({
    usage: null,
    stats: null,
    isLoading: true,
    isCleaningUp: false,
    lastCleanupTime: null,
    warnings: [],
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupStartedRef = useRef(false);

  /**
   * Refresh storage statistics
   */
  const refreshStats = useCallback(async () => {
    try {
      const [usage, stats] = await Promise.all([
        getStorageUsage(),
        getEnhancedStorageStats(),
      ]);

      // Generate warnings based on usage
      const warnings: StorageWarning[] = [];

      if (usage.percentUsed >= 95) {
        warnings.push({
          id: "quota_critical",
          type: "quota_critical",
          message: "Storage is almost full! Please sync your data or clear old items.",
          severity: "error",
          timestamp: Date.now(),
        });
      } else if (usage.percentUsed >= 80) {
        warnings.push({
          id: "quota_high",
          type: "quota_high",
          message: "Storage is getting full. Consider syncing or cleaning up old data.",
          severity: "warning",
          timestamp: Date.now(),
        });
      }

      // Check for stale pending items
      if (stats.oldestPendingItem) {
        const ageMs = Date.now() - stats.oldestPendingItem.getTime();
        const ageDays = ageMs / (24 * 60 * 60 * 1000);
        
        if (ageDays > 7) {
          warnings.push({
            id: "sync_stale",
            type: "sync_stale",
            message: `You have items pending sync for over ${Math.floor(ageDays)} days. Please connect to sync.`,
            severity: "warning",
            timestamp: Date.now(),
          });
        }
      }

      setState(prev => ({
        ...prev,
        usage,
        stats,
        warnings,
        isLoading: false,
      }));
    } catch (error) {
      console.error("[StorageManager] Failed to refresh stats:", error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  /**
   * Run cleanup manually
   */
  const runCleanup = useCallback(async (): Promise<CleanupResult> => {
    setState(prev => ({ ...prev, isCleaningUp: true }));

    try {
      const result = await cleanupOldData();
      
      setState(prev => ({
        ...prev,
        isCleaningUp: false,
        lastCleanupTime: Date.now(),
      }));

      // Refresh stats after cleanup
      await refreshStats();

      // Show toast with results
      if (result.deletedAssessments > 0 || result.deletedPhotos > 0 || result.deletedSyncItems > 0) {
        toast.success(
          `Cleanup complete: ${result.deletedAssessments} assessments, ${result.deletedPhotos} photos, ${result.deletedSyncItems} sync items removed. Freed ${formatBytes(result.freedBytes)}.`
        );
      } else {
        toast.info("No old data to clean up.");
      }

      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isCleaningUp: false }));
      toast.error("Cleanup failed. Please try again.");
      throw error;
    }
  }, [refreshStats]);

  /**
   * Free up space by evicting old photos
   */
  const freeUpSpace = useCallback(async (targetMB: number): Promise<number> => {
    const targetBytes = targetMB * 1024 * 1024;
    
    try {
      const freedBytes = await evictPhotosIfNeeded(targetBytes);
      
      if (freedBytes > 0) {
        toast.success(`Freed ${formatBytes(freedBytes)} by removing old synced photos.`);
        await refreshStats();
      } else {
        toast.info("No photos available for eviction.");
      }

      return freedBytes;
    } catch (error) {
      toast.error("Failed to free up space.");
      throw error;
    }
  }, [refreshStats]);

  /**
   * Clear all offline data (with confirmation)
   */
  const clearAllData = useCallback(async (): Promise<void> => {
    try {
      await Promise.all([
        clearStore(STORES.ASSESSMENTS),
        clearStore(STORES.PHOTOS),
        clearStore(STORES.DEFICIENCIES),
        clearStore(STORES.SYNC_QUEUE),
      ]);

      await refreshStats();
      toast.success("All offline data cleared.");
    } catch (error) {
      toast.error("Failed to clear data.");
      throw error;
    }
  }, [refreshStats]);

  /**
   * Clear only synced data (keep pending)
   */
  const clearSyncedData = useCallback(async (): Promise<void> => {
    try {
      // Get all items and filter synced ones
      const assessments = await getAllItems<OfflineAssessment>(STORES.ASSESSMENTS);
      const photos = await getAllItems<OfflinePhoto>(STORES.PHOTOS);
      const deficiencies = await getAllItems<OfflineDeficiency>(STORES.DEFICIENCIES);

      const syncedAssessments = assessments.filter(a => a.syncStatus === "synced");
      const syncedPhotos = photos.filter(p => p.syncStatus === "synced");
      const syncedDeficiencies = deficiencies.filter(d => d.syncStatus === "synced");

      // Delete synced items
      for (const item of syncedAssessments) {
        await deleteItem(STORES.ASSESSMENTS, item.id);
      }
      for (const item of syncedPhotos) {
        await deleteItem(STORES.PHOTOS, item.id);
      }
      for (const item of syncedDeficiencies) {
        await deleteItem(STORES.DEFICIENCIES, item.id);
      }

      await refreshStats();
      toast.success(`Cleared ${syncedAssessments.length + syncedPhotos.length + syncedDeficiencies.length} synced items.`);
    } catch (error) {
      toast.error("Failed to clear synced data.");
      throw error;
    }
  }, [refreshStats]);

  /**
   * Export offline data for backup
   */
  const exportData = useCallback(async (): Promise<ExportData> => {
    const assessments = await getAllItems<OfflineAssessment>(STORES.ASSESSMENTS);
    const photos = await getAllItems<OfflinePhoto>(STORES.PHOTOS);
    const deficiencies = await getAllItems<OfflineDeficiency>(STORES.DEFICIENCIES);

    // Convert photo blobs to base64 for export (only for small photos)
    const photosForExport = await Promise.all(
      photos.map(async (photo) => {
        const { blob, originalBlob, ...rest } = photo;
        
        // Only include blob if it's small enough (< 1MB)
        if (blob.size < 1024 * 1024) {
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          return { ...rest, blobBase64: base64 };
        }
        
        return rest;
      })
    );

    const exportData: ExportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      assessments,
      photos: photosForExport,
      deficiencies,
    };

    return exportData;
  }, []);

  /**
   * Download export as JSON file
   */
  const downloadExport = useCallback(async (): Promise<void> => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `bca-offline-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Backup downloaded successfully.");
    } catch (error) {
      toast.error("Failed to export data.");
      throw error;
    }
  }, [exportData]);

  /**
   * Import data from backup file
   */
  const importData = useCallback(async (file: File): Promise<void> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;

      if (!data.version || !data.assessments) {
        throw new Error("Invalid backup file format");
      }

      // Import assessments
      for (const assessment of data.assessments) {
        await updateItem(STORES.ASSESSMENTS, assessment);
      }

      // Import deficiencies
      for (const deficiency of data.deficiencies) {
        await updateItem(STORES.DEFICIENCIES, deficiency);
      }

      // Import photos (without blobs for now)
      for (const photo of data.photos) {
        if (photo.blobBase64) {
          // Convert base64 back to blob
          const binaryString = atob(photo.blobBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: photo.mimeType });
          
          const { blobBase64, ...rest } = photo;
          await updateItem(STORES.PHOTOS, { ...rest, blob, originalBlob: blob } as OfflinePhoto);
        }
      }

      await refreshStats();
      toast.success(`Imported ${data.assessments.length} assessments, ${data.photos.length} photos, ${data.deficiencies.length} deficiencies.`);
    } catch (error) {
      toast.error("Failed to import data. Please check the file format.");
      throw error;
    }
  }, [refreshStats]);

  /**
   * Get storage breakdown by project
   */
  const getStorageByProject = useCallback(async (): Promise<Map<number, { assessments: number; photos: number; bytes: number }>> => {
    const assessments = await getAllItems<OfflineAssessment>(STORES.ASSESSMENTS);
    const photos = await getAllItems<OfflinePhoto>(STORES.PHOTOS);

    const byProject = new Map<number, { assessments: number; photos: number; bytes: number }>();

    for (const assessment of assessments) {
      const current = byProject.get(assessment.projectId) || { assessments: 0, photos: 0, bytes: 0 };
      current.assessments++;
      current.bytes += new Blob([JSON.stringify(assessment)]).size;
      byProject.set(assessment.projectId, current);
    }

    for (const photo of photos) {
      const current = byProject.get(photo.projectId) || { assessments: 0, photos: 0, bytes: 0 };
      current.photos++;
      current.bytes += photo.fileSize;
      byProject.set(photo.projectId, current);
    }

    return byProject;
  }, []);

  /**
   * Dismiss a warning
   */
  const dismissWarning = useCallback((warningId: string) => {
    setState(prev => ({
      ...prev,
      warnings: prev.warnings.filter(w => w.id !== warningId),
    }));
  }, []);

  // Start automatic cleanup and refresh on mount
  useEffect(() => {
    if (!cleanupStartedRef.current) {
      cleanupStartedRef.current = true;
      startAutomaticCleanup(60 * 60 * 1000); // Every hour
    }

    // Initial refresh
    refreshStats();

    // Refresh every 30 seconds
    refreshIntervalRef.current = setInterval(refreshStats, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      stopAutomaticCleanup();
    };
  }, [refreshStats]);

  return {
    ...state,
    refreshStats,
    runCleanup,
    freeUpSpace,
    clearAllData,
    clearSyncedData,
    exportData,
    downloadExport,
    importData,
    getStorageByProject,
    dismissWarning,
    limits: STORAGE_LIMITS,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

/**
 * Get color for storage usage
 */
export function getUsageColor(percentUsed: number): string {
  if (percentUsed >= 95) return "text-red-500";
  if (percentUsed >= 80) return "text-yellow-500";
  if (percentUsed >= 60) return "text-orange-500";
  return "text-green-500";
}

/**
 * Get background color for storage usage bar
 */
export function getUsageBarColor(percentUsed: number): string {
  if (percentUsed >= 95) return "bg-red-500";
  if (percentUsed >= 80) return "bg-yellow-500";
  if (percentUsed >= 60) return "bg-orange-500";
  return "bg-green-500";
}
