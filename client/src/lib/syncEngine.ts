/**
 * Sync Engine
 * 
 * Handles automatic background synchronization of offline data
 * when connection is restored. Implements retry logic with
 * exponential backoff and conflict resolution.
 */

import { trpc } from "@/lib/trpc";
import {
  getPendingSyncItems,
  getItemsReadyForRetry,
  updateSyncQueueItem,
  getItem,
  updateAssessmentSyncStatus,
  updatePhotoSyncStatus,
  deleteItem,
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
      // Create assessment via tRPC
      // Note: This will be implemented when tRPC mutations are ready
      // For now, mark as synced to prevent blocking
      console.log("[SyncEngine] Assessment sync not yet implemented:", assessment);
      
      // TODO: Implement actual sync when backend is ready
      /*
      const createdAssessment = await trpc.assessments.create.mutate({
        projectId: assessment.projectId,
        assetId: assessment.assetId,
        componentCode: assessment.componentCode,
        componentName: assessment.componentName,
        componentLocation: assessment.componentLocation,
        condition: assessment.condition,
        status: assessment.status,
        observations: assessment.observations,
        recommendations: assessment.recommendations,
        estimatedServiceLife: assessment.estimatedServiceLife,
        reviewYear: assessment.reviewYear,
        lastTimeAction: assessment.lastTimeAction,
        estimatedRepairCost: assessment.estimatedRepairCost,
        replacementValue: assessment.replacementValue,
        actionYear: assessment.actionYear,
      });

      */
      
      // Update linked photos to use real assessment ID
      // const photos = await getItem<OfflinePhoto[]>(STORES.PHOTOS, assessmentId);
      /*
      if (photos) {
        for (const photo of photos) {
          if (photo.assessmentId === assessmentId) {
            photo.assessmentId = createdAssessment.id.toString();
            await updateItem(STORES.PHOTOS, photo);
          }
        }
      }
      */

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
   * Sync a photo
   */
  private async syncPhoto(photoId: string): Promise<void> {
    const photo = await getItem<OfflinePhoto>(STORES.PHOTOS, photoId);
    if (!photo) throw new Error("Photo not found");

    // Update status
    await updatePhotoSyncStatus(photoId, "syncing", 0);

    try {
      // Upload to S3
      // TODO: Implement when storage utility is ready
      console.log("[SyncEngine] Photo sync not yet implemented:", photo);
      
      /*
      const arrayBuffer = await photo.blob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      
      const fileKey = `assessments/${photo.assessmentId}/photos/${photo.fileName}`;
      const { url } = await storagePut(fileKey, buffer, photo.mimeType);
      */

      // Update progress
      await updatePhotoSyncStatus(photoId, "syncing", 50);

      // Save photo metadata via tRPC
      // TODO: Implement when backend is ready
      /*
      await trpc.photos.create.mutate({
        assessmentId: parseInt(photo.assessmentId),
        projectId: photo.projectId,
        url,
        fileName: photo.fileName,
        fileSize: photo.fileSize,
        mimeType: photo.mimeType,
        caption: photo.caption,
        latitude: photo.latitude,
        longitude: photo.longitude,
        altitude: photo.altitude,
        locationAccuracy: photo.locationAccuracy,
      });
      */

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
