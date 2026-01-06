/**
 * Sync Engine
 * 
 * Handles automatic background synchronization of offline data
 * when connection is restored. Implements retry logic with
 * exponential backoff and conflict resolution.
 */

import { trpc } from "@/lib/trpc";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../server/routers";
import superjson from "superjson";

// Create vanilla client for use outside React components
const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      transformer: superjson,
    }),
  ],
});
import {
  getPendingSyncItems,
  getItemsReadyForRetry,
  updateSyncQueueItem,
  getItem,
  updateAssessmentSyncStatus,
  updatePhotoSyncStatus,
  deleteItem,
  initOfflineDB,
  STORES,
  type SyncQueueItem,
  type OfflineAssessment,
  type OfflinePhoto,
  type OfflineDeficiency,
} from "./offlineStorage";
// Storage import will be added when implementing photo sync
// import { storagePut } from "@/lib/storage";

// ============================================================================
// Types
// ============================================================================

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  current: string | null; // Current item being synced
  percentage: number;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ itemId: string; error: string }>;
}

export type SyncEventType = "start" | "progress" | "complete" | "error" | "item_synced" | "item_failed";

export interface SyncEvent {
  type: SyncEventType;
  progress?: SyncProgress;
  result?: SyncResult;
  error?: string;
  itemId?: string;
}

// ============================================================================
// Sync Engine Class
// ============================================================================

export class SyncEngine {
  private isRunning = false;
  private listeners: Array<(event: SyncEvent) => void> = [];
  private abortController: AbortController | null = null;
  
  // Map offline IDs to real database IDs after syncing
  private assessmentIdMap: Map<string, number> = new Map();

  // Exponential backoff configuration
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRY_DELAY = 60000; // 1 minute
  private readonly MAX_RETRIES = 5;

  /**
   * Subscribe to sync events
   */
  on(listener: (event: SyncEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Emit sync event to all listeners
   */
  private emit(event: SyncEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Check if sync is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Start sync process
   */
  async start(): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error("Sync already in progress");
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      this.emit({ type: "start" });

      // Get all pending items
      const pendingItems = await getPendingSyncItems();
      const retryItems = await getItemsReadyForRetry();
      const allItems = [...pendingItems, ...retryItems];

      if (allItems.length === 0) {
        this.emit({ type: "complete", result });
        return result;
      }

      // Process items in order of priority
      for (let i = 0; i < allItems.length; i++) {
        if (this.abortController.signal.aborted) {
          break;
        }

        const item = allItems[i];
        
        // Emit progress
        this.emit({
          type: "progress",
          progress: {
            total: allItems.length,
            completed: i,
            failed: result.failed,
            current: item.itemId,
            percentage: Math.round((i / allItems.length) * 100),
          },
        });

        try {
          await this.syncItem(item);
          result.synced++;
          this.emit({ type: "item_synced", itemId: item.itemId });
        } catch (error: any) {
          result.failed++;
          result.errors.push({
            itemId: item.itemId,
            error: error.message || "Unknown error",
          });
          this.emit({ type: "item_failed", itemId: item.itemId, error: error.message });
          
          // Update retry schedule
          await this.scheduleRetry(item);
        }
      }

      result.success = result.failed === 0;
      this.emit({ type: "complete", result });
      
      return result;
    } catch (error: any) {
      this.emit({ type: "error", error: error.message });
      throw error;
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }
  }

  /**
   * Stop sync process
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Sync a single item
   */
  private async syncItem(queueItem: SyncQueueItem): Promise<void> {
    // Update queue item status
    queueItem.status = "processing";
    queueItem.attempts++;
    queueItem.lastAttemptAt = Date.now();
    await updateSyncQueueItem(queueItem);

    try {
      switch (queueItem.type) {
        case "assessment":
          await this.syncAssessment(queueItem.itemId);
          break;
        case "photo":
          await this.syncPhoto(queueItem.itemId);
          break;
        case "deficiency":
          await this.syncDeficiency(queueItem.itemId);
          break;
      }

      // Mark as completed
      queueItem.status = "completed";
      await updateSyncQueueItem(queueItem);
    } catch (error) {
      // Mark as failed
      queueItem.status = "failed";
      queueItem.error = error instanceof Error ? error.message : "Unknown error";
      await updateSyncQueueItem(queueItem);
      throw error;
    }
  }

  /**
   * Sync an assessment
   */
  private async syncAssessment(assessmentId: string): Promise<void> {
    const assessment = await getItem<OfflineAssessment>(STORES.ASSESSMENTS, assessmentId);
    if (!assessment) throw new Error("Assessment not found");

    // Update status
    await updateAssessmentSyncStatus(assessmentId, "syncing");

    try {
      // Sync assessment via tRPC
      const result = await trpcClient.offlineSync.syncAssessment.mutate({
        offlineId: assessmentId,
        createdAt: new Date(assessment.createdAt).toISOString(),
        projectId: assessment.projectId,
        assetId: assessment.assetId || undefined,
        componentCode: assessment.componentCode || undefined,
        componentName: assessment.componentName || undefined,
        componentLocation: assessment.componentLocation || undefined,
        condition: assessment.condition as any,
        status: assessment.status as any,
        observations: assessment.observations || undefined,
        recommendations: assessment.recommendations || undefined,
        remainingUsefulLife: assessment.estimatedServiceLife || undefined,
        reviewYear: assessment.reviewYear || undefined,
        lastTimeAction: assessment.lastTimeAction || undefined,
        estimatedRepairCost: assessment.estimatedRepairCost || undefined,
        replacementValue: assessment.replacementValue || undefined,
        actionYear: assessment.actionYear || undefined,
      });

      console.log("[SyncEngine] Assessment synced:", result);
      
      // Store mapping from offline ID to real database ID
      this.assessmentIdMap.set(assessmentId, result.assessmentId);
      
      // Update all photos that reference this offline assessment ID
      await this.updatePhotosWithRealAssessmentId(assessmentId, result.assessmentId);
      
      // If there was a conflict, log it
      if (result.conflict) {
        console.warn("[SyncEngine] Conflict detected:", result.resolution);
      }

      // Mark as synced
      await updateAssessmentSyncStatus(assessmentId, "synced");
      
      // Delete from offline storage after successful sync
      await deleteItem(STORES.ASSESSMENTS, assessmentId);
    } catch (error) {
      await updateAssessmentSyncStatus(
        assessmentId,
        "failed",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  }

  /**
   * Update photos that reference an offline assessment ID with the real database ID
   */
  private async updatePhotosWithRealAssessmentId(offlineAssessmentId: string, realAssessmentId: number): Promise<void> {
    try {
      const database = await initOfflineDB();
      const transaction = database.transaction([STORES.PHOTOS], "readwrite");
      const store = transaction.objectStore(STORES.PHOTOS);
      const request = store.getAll();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = async () => {
          const photos = request.result as OfflinePhoto[];
          const photosToUpdate = photos.filter(p => p.assessmentId === offlineAssessmentId);
          
          console.log(`[SyncEngine] Updating ${photosToUpdate.length} photos with real assessment ID ${realAssessmentId}`);
          
          for (const photo of photosToUpdate) {
            photo.assessmentId = realAssessmentId.toString();
            const updateTx = database.transaction([STORES.PHOTOS], "readwrite");
            const updateStore = updateTx.objectStore(STORES.PHOTOS);
            await new Promise((res, rej) => {
              const updateReq = updateStore.put(photo);
              updateReq.onsuccess = () => res(undefined);
              updateReq.onerror = () => rej(updateReq.error);
            });
          }
          
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[SyncEngine] Failed to update photos with real assessment ID:", error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Sync a photo
   */
  private async syncPhoto(photoId: string): Promise<void> {
    const photo = await getItem<OfflinePhoto>(STORES.PHOTOS, photoId);
    if (!photo) throw new Error("Photo not found");

    // Update status
    await updatePhotoSyncStatus(photoId, "syncing", 0);

    try {
      // Convert blob to base64 for transmission (browser-native approach)
      const arrayBuffer = await photo.blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      // Update progress
      await updatePhotoSyncStatus(photoId, "syncing", 30);

      // Parse assessment ID - it might be a string number or offline ID
      let assessmentId: number | undefined = undefined;
      if (photo.assessmentId) {
        const parsed = parseInt(photo.assessmentId);
        // Only use if it's a valid number (not NaN)
        if (!isNaN(parsed)) {
          assessmentId = parsed;
        } else {
          console.warn(`[SyncEngine] Photo ${photoId} has non-numeric assessmentId: ${photo.assessmentId}`);
        }
      }

      // Sync photo via tRPC (backend will upload to S3)
      const result = await trpcClient.offlineSync.syncPhoto.mutate({
        offlineId: photoId,
        createdAt: new Date(photo.createdAt).toISOString(),
        assessmentId,
        assetId: photo.assetId || undefined,
        projectId: photo.projectId,
        fileName: photo.fileName,
        caption: photo.caption || undefined,
        photoBlob: base64,
        mimeType: photo.mimeType,
        latitude: photo.latitude || undefined,
        longitude: photo.longitude || undefined,
        altitude: photo.altitude || undefined,
        locationAccuracy: photo.locationAccuracy || undefined,
      });

      console.log("[SyncEngine] Photo synced:", result);

      // Mark as synced
      await updatePhotoSyncStatus(photoId, "synced", 100);
      
      // Delete from offline storage
      await deleteItem(STORES.PHOTOS, photoId);
    } catch (error) {
      await updatePhotoSyncStatus(
        photoId,
        "failed",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  }

  /**
   * Sync a deficiency
   */
  private async syncDeficiency(deficiencyId: string): Promise<void> {
    const deficiency = await getItem<OfflineDeficiency>(STORES.DEFICIENCIES, deficiencyId);
    if (!deficiency) throw new Error("Deficiency not found");

    // Implementation similar to syncAssessment
    // You'll need to add the appropriate tRPC mutation
    throw new Error("Deficiency sync not yet implemented");
  }

  /**
   * Schedule retry with exponential backoff
   */
  private async scheduleRetry(item: SyncQueueItem): Promise<void> {
    if (item.attempts >= this.MAX_RETRIES) {
      // Max retries reached, mark as permanently failed
      item.status = "failed";
      item.nextRetryAt = null;
      await updateSyncQueueItem(item);
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.INITIAL_RETRY_DELAY * Math.pow(2, item.attempts - 1),
      this.MAX_RETRY_DELAY
    );

    item.nextRetryAt = Date.now() + delay;
    await updateSyncQueueItem(item);
  }
}

// ============================================================================
// Global Sync Engine Instance
// ============================================================================

let syncEngineInstance: SyncEngine | null = null;

/**
 * Get global sync engine instance
 */
export function getSyncEngine(): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine();
  }
  return syncEngineInstance;
}

/**
 * Start automatic sync when online
 */
export function startAutoSync(): void {
  const syncEngine = getSyncEngine();

  // Listen for online event
  window.addEventListener("online", () => {
    console.log("[SyncEngine] Connection restored, starting sync...");
    syncEngine.start().catch(error => {
      console.error("[SyncEngine] Auto-sync failed:", error);
    });
  });

  // Check if already online and has pending items
  if (navigator.onLine) {
    setTimeout(() => {
      syncEngine.start().catch(error => {
        console.error("[SyncEngine] Initial sync failed:", error);
      });
    }, 1000); // Wait 1 second before starting initial sync
  }
}
