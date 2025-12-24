/**
 * Optimized Offline Storage Infrastructure
 * 
 * Enhanced IndexedDB-based storage with:
 * - Lazy loading with cursor-based pagination
 * - Database versioning with migration support
 * - Storage quota management
 * - Compound indexes for complex queries
 * - Transaction batching for bulk operations
 * - LRU cache eviction for photos
 */

import type {
  OfflineAssessment,
  OfflinePhoto,
  OfflineDeficiency,
  SyncQueueItem,
  CachedProject,
  CachedBuildingComponent,
  StorageStats,
} from "./offlineStorage";

// ============================================================================
// Configuration
// ============================================================================

const DB_NAME = "bca_offline_storage";
const DB_VERSION = 2; // Bumped for new indexes and stores

// Storage limits
export const STORAGE_LIMITS = {
  MAX_TOTAL_SIZE_MB: 500, // 500MB total storage limit
  MAX_PHOTO_SIZE_MB: 10, // 10MB per photo
  MAX_PHOTOS_COUNT: 1000, // Maximum photos to keep
  PHOTO_CACHE_TTL_DAYS: 30, // Keep synced photos for 30 days
  PROJECT_CACHE_TTL_HOURS: 24, // Keep project cache for 24 hours
  SYNC_QUEUE_MAX_AGE_DAYS: 7, // Remove failed sync items after 7 days
};

// Store names
export const STORES = {
  ASSESSMENTS: "offline_assessments",
  PHOTOS: "offline_photos",
  DEFICIENCIES: "offline_deficiencies",
  SYNC_QUEUE: "sync_queue",
  CACHED_PROJECTS: "cached_projects",
  CACHED_COMPONENTS: "cached_components",
  CACHED_ASSETS: "cached_assets",
  METADATA: "storage_metadata",
} as const;

// ============================================================================
// Database Connection Management
// ============================================================================

let db: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Migration handlers for each version upgrade
 */
const migrations: Record<number, (db: IDBDatabase, transaction: IDBTransaction) => void> = {
  1: (database) => {
    // Initial schema - create all stores
    if (!database.objectStoreNames.contains(STORES.ASSESSMENTS)) {
      const assessmentStore = database.createObjectStore(STORES.ASSESSMENTS, { keyPath: "id" });
      assessmentStore.createIndex("projectId", "projectId", { unique: false });
      assessmentStore.createIndex("assetId", "assetId", { unique: false });
      assessmentStore.createIndex("syncStatus", "syncStatus", { unique: false });
      assessmentStore.createIndex("createdAt", "createdAt", { unique: false });
    }

    if (!database.objectStoreNames.contains(STORES.PHOTOS)) {
      const photoStore = database.createObjectStore(STORES.PHOTOS, { keyPath: "id" });
      photoStore.createIndex("assessmentId", "assessmentId", { unique: false });
      photoStore.createIndex("projectId", "projectId", { unique: false });
      photoStore.createIndex("syncStatus", "syncStatus", { unique: false });
      photoStore.createIndex("createdAt", "createdAt", { unique: false });
    }

    if (!database.objectStoreNames.contains(STORES.DEFICIENCIES)) {
      const deficiencyStore = database.createObjectStore(STORES.DEFICIENCIES, { keyPath: "id" });
      deficiencyStore.createIndex("projectId", "projectId", { unique: false });
      deficiencyStore.createIndex("assessmentId", "assessmentId", { unique: false });
      deficiencyStore.createIndex("syncStatus", "syncStatus", { unique: false });
    }

    if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
      const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: "id" });
      syncStore.createIndex("type", "type", { unique: false });
      syncStore.createIndex("priority", "priority", { unique: false });
      syncStore.createIndex("status", "status", { unique: false });
      syncStore.createIndex("nextRetryAt", "nextRetryAt", { unique: false });
    }

    if (!database.objectStoreNames.contains(STORES.CACHED_PROJECTS)) {
      const projectStore = database.createObjectStore(STORES.CACHED_PROJECTS, { keyPath: "id" });
      projectStore.createIndex("cachedAt", "cachedAt", { unique: false });
    }

    if (!database.objectStoreNames.contains(STORES.CACHED_COMPONENTS)) {
      const componentStore = database.createObjectStore(STORES.CACHED_COMPONENTS, { keyPath: "id" });
      componentStore.createIndex("code", "code", { unique: false });
      componentStore.createIndex("level", "level", { unique: false });
    }
  },
  2: (database, transaction) => {
    // Version 2: Add compound indexes and new stores
    
    // Add compound indexes to assessments
    if (database.objectStoreNames.contains(STORES.ASSESSMENTS)) {
      const assessmentStore = transaction.objectStore(STORES.ASSESSMENTS);
      if (!assessmentStore.indexNames.contains("projectId_syncStatus")) {
        assessmentStore.createIndex("projectId_syncStatus", ["projectId", "syncStatus"], { unique: false });
      }
      if (!assessmentStore.indexNames.contains("projectId_createdAt")) {
        assessmentStore.createIndex("projectId_createdAt", ["projectId", "createdAt"], { unique: false });
      }
    }

    // Add compound indexes to photos
    if (database.objectStoreNames.contains(STORES.PHOTOS)) {
      const photoStore = transaction.objectStore(STORES.PHOTOS);
      if (!photoStore.indexNames.contains("projectId_syncStatus")) {
        photoStore.createIndex("projectId_syncStatus", ["projectId", "syncStatus"], { unique: false });
      }
      if (!photoStore.indexNames.contains("assessmentId_createdAt")) {
        photoStore.createIndex("assessmentId_createdAt", ["assessmentId", "createdAt"], { unique: false });
      }
    }

    // Add compound indexes to sync queue
    if (database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
      const syncStore = transaction.objectStore(STORES.SYNC_QUEUE);
      if (!syncStore.indexNames.contains("status_priority")) {
        syncStore.createIndex("status_priority", ["status", "priority"], { unique: false });
      }
      if (!syncStore.indexNames.contains("type_status")) {
        syncStore.createIndex("type_status", ["type", "status"], { unique: false });
      }
    }

    // Add cached assets store
    if (!database.objectStoreNames.contains(STORES.CACHED_ASSETS)) {
      const assetStore = database.createObjectStore(STORES.CACHED_ASSETS, { keyPath: "id" });
      assetStore.createIndex("projectId", "projectId", { unique: false });
      assetStore.createIndex("cachedAt", "cachedAt", { unique: false });
    }

    // Add metadata store for storage tracking
    if (!database.objectStoreNames.contains(STORES.METADATA)) {
      database.createObjectStore(STORES.METADATA, { keyPath: "key" });
    }
  },
};

/**
 * Initialize IndexedDB with migration support
 */
export async function initOfflineDB(): Promise<IDBDatabase> {
  if (db) return db;
  
  // Prevent multiple simultaneous initialization
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbInitPromise = null;
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      
      // Handle connection errors
      db.onerror = (event) => {
        console.error("[OfflineStorage] Database error:", event);
      };
      
      db.onclose = () => {
        console.warn("[OfflineStorage] Database connection closed unexpectedly");
        db = null;
        dbInitPromise = null;
      };
      
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      const transaction = (event.target as IDBOpenDBRequest).transaction!;
      const oldVersion = event.oldVersion;
      const newVersion = event.newVersion || DB_VERSION;

      console.log(`[OfflineStorage] Upgrading database from v${oldVersion} to v${newVersion}`);

      // Run migrations for each version
      for (let version = oldVersion + 1; version <= newVersion; version++) {
        if (migrations[version]) {
          console.log(`[OfflineStorage] Running migration for v${version}`);
          migrations[version](database, transaction);
        }
      }
    };

    request.onblocked = () => {
      console.warn("[OfflineStorage] Database upgrade blocked - close other tabs");
    };
  });

  return dbInitPromise;
}

/**
 * Close database connection
 */
export function closeOfflineDB(): void {
  if (db) {
    db.close();
    db = null;
    dbInitPromise = null;
  }
}

// ============================================================================
// Lazy Loading with Cursor-Based Pagination
// ============================================================================

export interface PaginationOptions {
  limit: number;
  cursor?: string | number; // Last item ID for cursor-based pagination
  direction?: "next" | "prev";
}

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | number | null;
  totalCount?: number;
}

/**
 * Get items with cursor-based pagination
 */
export async function getItemsPaginated<T extends { id: string | number }>(
  storeName: string,
  options: PaginationOptions
): Promise<PaginatedResult<T>> {
  const database = await initOfflineDB();
  const { limit, cursor, direction = "next" } = options;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    
    const items: T[] = [];
    let hasMore = false;
    let nextCursor: string | number | null = null;
    let skipped = false;

    const cursorDirection: IDBCursorDirection = direction === "prev" ? "prev" : "next";
    const request = store.openCursor(null, cursorDirection);

    request.onsuccess = (event) => {
      const cursorResult = (event.target as IDBRequest<IDBCursorWithValue>).result;
      
      if (cursorResult) {
        // Skip until we reach the cursor position
        if (cursor && !skipped) {
          if (cursorResult.key === cursor) {
            skipped = true;
            cursorResult.continue();
            return;
          }
          cursorResult.continue();
          return;
        }

        if (items.length < limit) {
          items.push(cursorResult.value);
          cursorResult.continue();
        } else {
          // We have one more item, so there are more
          hasMore = true;
          nextCursor = items[items.length - 1]?.id ?? null;
        }
      } else {
        // No more items
        resolve({ items, hasMore, nextCursor });
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get items by index with pagination
 */
export async function getItemsByIndexPaginated<T extends { id: string | number }>(
  storeName: string,
  indexName: string,
  value: IDBValidKey | IDBKeyRange,
  options: PaginationOptions
): Promise<PaginatedResult<T>> {
  const database = await initOfflineDB();
  const { limit, cursor, direction = "next" } = options;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    
    const items: T[] = [];
    let hasMore = false;
    let nextCursor: string | number | null = null;
    let skipped = !cursor; // If no cursor, don't skip

    const cursorDirection: IDBCursorDirection = direction === "prev" ? "prev" : "next";
    const request = index.openCursor(value, cursorDirection);

    request.onsuccess = (event) => {
      const cursorResult = (event.target as IDBRequest<IDBCursorWithValue>).result;
      
      if (cursorResult) {
        if (!skipped) {
          if (cursorResult.value.id === cursor) {
            skipped = true;
          }
          cursorResult.continue();
          return;
        }

        if (items.length < limit) {
          items.push(cursorResult.value);
          cursorResult.continue();
        } else {
          hasMore = true;
          nextCursor = items[items.length - 1]?.id ?? null;
        }
      } else {
        resolve({ items, hasMore, nextCursor });
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Transaction Batching
// ============================================================================

export interface BatchOperation<T> {
  type: "add" | "put" | "delete";
  storeName: string;
  data?: T;
  key?: IDBValidKey;
}

/**
 * Execute multiple operations in a single transaction
 */
export async function executeBatch<T>(operations: BatchOperation<T>[]): Promise<void> {
  if (operations.length === 0) return;

  const database = await initOfflineDB();
  
  // Get unique store names
  const storeNames = Array.from(new Set(operations.map(op => op.storeName)));

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, "readwrite");
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(new Error("Transaction aborted"));

    for (const operation of operations) {
      const store = transaction.objectStore(operation.storeName);
      
      switch (operation.type) {
        case "add":
          if (operation.data) store.add(operation.data);
          break;
        case "put":
          if (operation.data) store.put(operation.data);
          break;
        case "delete":
          if (operation.key) store.delete(operation.key);
          break;
      }
    }
  });
}

/**
 * Batch add multiple items to a store
 */
export async function batchAddItems<T>(storeName: string, items: T[]): Promise<void> {
  const operations: BatchOperation<T>[] = items.map(item => ({
    type: "add",
    storeName,
    data: item,
  }));
  
  await executeBatch(operations);
}

/**
 * Batch update multiple items in a store
 */
export async function batchUpdateItems<T>(storeName: string, items: T[]): Promise<void> {
  const operations: BatchOperation<T>[] = items.map(item => ({
    type: "put",
    storeName,
    data: item,
  }));
  
  await executeBatch(operations);
}

/**
 * Batch delete multiple items from a store
 */
export async function batchDeleteItems(storeName: string, keys: IDBValidKey[]): Promise<void> {
  const operations: BatchOperation<unknown>[] = keys.map(key => ({
    type: "delete",
    storeName,
    key,
  }));
  
  await executeBatch(operations);
}

// ============================================================================
// Storage Quota Management
// ============================================================================

export interface StorageUsage {
  totalBytes: number;
  assessmentsBytes: number;
  photosBytes: number;
  deficienciesBytes: number;
  cacheBytes: number;
  percentUsed: number;
  isNearLimit: boolean;
}

/**
 * Estimate storage usage
 */
export async function getStorageUsage(): Promise<StorageUsage> {
  const database = await initOfflineDB();
  
  const calculateStoreSize = async (storeName: string): Promise<number> => {
    return new Promise((resolve) => {
      const transaction = database.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const items = request.result;
        // Rough estimate: JSON stringify each item
        const size = items.reduce((total, item) => {
          // For photos, use the blob size
          if (item.blob instanceof Blob) {
            return total + item.blob.size;
          }
          return total + new Blob([JSON.stringify(item)]).size;
        }, 0);
        resolve(size);
      };
      
      request.onerror = () => resolve(0);
    });
  };

  const [assessmentsBytes, photosBytes, deficienciesBytes, projectsBytes, componentsBytes, assetsBytes] = 
    await Promise.all([
      calculateStoreSize(STORES.ASSESSMENTS),
      calculateStoreSize(STORES.PHOTOS),
      calculateStoreSize(STORES.DEFICIENCIES),
      calculateStoreSize(STORES.CACHED_PROJECTS),
      calculateStoreSize(STORES.CACHED_COMPONENTS),
      calculateStoreSize(STORES.CACHED_ASSETS),
    ]);

  const cacheBytes = projectsBytes + componentsBytes + assetsBytes;
  const totalBytes = assessmentsBytes + photosBytes + deficienciesBytes + cacheBytes;
  const maxBytes = STORAGE_LIMITS.MAX_TOTAL_SIZE_MB * 1024 * 1024;
  const percentUsed = (totalBytes / maxBytes) * 100;

  return {
    totalBytes,
    assessmentsBytes,
    photosBytes,
    deficienciesBytes,
    cacheBytes,
    percentUsed,
    isNearLimit: percentUsed > 80,
  };
}

/**
 * Check if storage is available
 */
export async function checkStorageQuota(): Promise<{ available: boolean; reason?: string }> {
  try {
    const usage = await getStorageUsage();
    
    if (usage.percentUsed >= 95) {
      return { 
        available: false, 
        reason: "Storage is almost full. Please sync or clear old data." 
      };
    }
    
    return { available: true };
  } catch (error) {
    return { 
      available: false, 
      reason: "Unable to check storage quota" 
    };
  }
}

// ============================================================================
// LRU Cache Eviction for Photos
// ============================================================================

interface PhotoAccessRecord {
  id: string;
  lastAccessedAt: number;
  accessCount: number;
}

/**
 * Track photo access for LRU eviction
 */
export async function trackPhotoAccess(photoId: string): Promise<void> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.METADATA], "readwrite");
    const store = transaction.objectStore(STORES.METADATA);
    
    const key = `photo_access_${photoId}`;
    const getRequest = store.get(key);
    
    getRequest.onsuccess = () => {
      const existing = getRequest.result as PhotoAccessRecord | undefined;
      const record: PhotoAccessRecord = {
        id: photoId,
        lastAccessedAt: Date.now(),
        accessCount: (existing?.accessCount || 0) + 1,
      };
      
      const putRequest = store.put({ key, ...record });
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Get least recently used photos for eviction
 */
export async function getLRUPhotos(count: number): Promise<string[]> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PHOTOS], "readonly");
    const store = transaction.objectStore(STORES.PHOTOS);
    const index = store.index("syncStatus");
    
    // Only consider synced photos for eviction
    const request = index.getAll("synced");
    
    request.onsuccess = () => {
      const photos = request.result as OfflinePhoto[];
      
      // Sort by createdAt (oldest first)
      photos.sort((a, b) => a.createdAt - b.createdAt);
      
      // Return IDs of oldest photos
      resolve(photos.slice(0, count).map(p => p.id));
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Evict photos to free up space
 */
export async function evictPhotosIfNeeded(targetFreeBytes: number): Promise<number> {
  const usage = await getStorageUsage();
  const maxBytes = STORAGE_LIMITS.MAX_TOTAL_SIZE_MB * 1024 * 1024;
  const currentFreeBytes = maxBytes - usage.totalBytes;
  
  if (currentFreeBytes >= targetFreeBytes) {
    return 0; // No eviction needed
  }
  
  const bytesToFree = targetFreeBytes - currentFreeBytes;
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PHOTOS], "readwrite");
    const store = transaction.objectStore(STORES.PHOTOS);
    const index = store.index("syncStatus");
    
    const request = index.getAll("synced");
    
    request.onsuccess = () => {
      const photos = request.result as OfflinePhoto[];
      
      // Sort by createdAt (oldest first)
      photos.sort((a, b) => a.createdAt - b.createdAt);
      
      let freedBytes = 0;
      const toDelete: string[] = [];
      
      for (const photo of photos) {
        if (freedBytes >= bytesToFree) break;
        toDelete.push(photo.id);
        freedBytes += photo.fileSize;
      }
      
      // Delete photos
      for (const id of toDelete) {
        store.delete(id);
      }
      
      transaction.oncomplete = () => resolve(freedBytes);
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Automatic Cleanup
// ============================================================================

/**
 * Clean up old synced data
 */
export async function cleanupOldData(): Promise<{
  deletedAssessments: number;
  deletedPhotos: number;
  deletedSyncItems: number;
  freedBytes: number;
}> {
  const database = await initOfflineDB();
  const now = Date.now();
  
  const results = {
    deletedAssessments: 0,
    deletedPhotos: 0,
    deletedSyncItems: 0,
    freedBytes: 0,
  };

  // Clean up old synced assessments (keep for 30 days)
  const assessmentTTL = 30 * 24 * 60 * 60 * 1000;
  const assessments = await new Promise<OfflineAssessment[]>((resolve, reject) => {
    const transaction = database.transaction([STORES.ASSESSMENTS], "readonly");
    const store = transaction.objectStore(STORES.ASSESSMENTS);
    const index = store.index("syncStatus");
    const request = index.getAll("synced");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const oldAssessments = assessments.filter(a => now - a.updatedAt > assessmentTTL);
  if (oldAssessments.length > 0) {
    await batchDeleteItems(STORES.ASSESSMENTS, oldAssessments.map(a => a.id));
    results.deletedAssessments = oldAssessments.length;
  }

  // Clean up old synced photos (keep for 30 days)
  const photoTTL = STORAGE_LIMITS.PHOTO_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  const photos = await new Promise<OfflinePhoto[]>((resolve, reject) => {
    const transaction = database.transaction([STORES.PHOTOS], "readonly");
    const store = transaction.objectStore(STORES.PHOTOS);
    const index = store.index("syncStatus");
    const request = index.getAll("synced");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const oldPhotos = photos.filter(p => now - p.createdAt > photoTTL);
  if (oldPhotos.length > 0) {
    results.freedBytes = oldPhotos.reduce((sum, p) => sum + p.fileSize, 0);
    await batchDeleteItems(STORES.PHOTOS, oldPhotos.map(p => p.id));
    results.deletedPhotos = oldPhotos.length;
  }

  // Clean up old failed sync items
  const syncTTL = STORAGE_LIMITS.SYNC_QUEUE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const syncItems = await new Promise<SyncQueueItem[]>((resolve, reject) => {
    const transaction = database.transaction([STORES.SYNC_QUEUE], "readonly");
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const oldSyncItems = syncItems.filter(
    s => (s.status === "failed" || s.status === "completed") && now - s.createdAt > syncTTL
  );
  if (oldSyncItems.length > 0) {
    await batchDeleteItems(STORES.SYNC_QUEUE, oldSyncItems.map(s => s.id));
    results.deletedSyncItems = oldSyncItems.length;
  }

  // Clean up expired project cache
  const projectTTL = STORAGE_LIMITS.PROJECT_CACHE_TTL_HOURS * 60 * 60 * 1000;
  const projects = await new Promise<CachedProject[]>((resolve, reject) => {
    const transaction = database.transaction([STORES.CACHED_PROJECTS], "readonly");
    const store = transaction.objectStore(STORES.CACHED_PROJECTS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const expiredProjects = projects.filter(p => now - p.cachedAt > projectTTL);
  if (expiredProjects.length > 0) {
    await batchDeleteItems(STORES.CACHED_PROJECTS, expiredProjects.map(p => p.id));
  }

  console.log("[OfflineStorage] Cleanup completed:", results);
  return results;
}

/**
 * Schedule automatic cleanup
 */
let cleanupInterval: NodeJS.Timeout | null = null;

export function startAutomaticCleanup(intervalMs: number = 60 * 60 * 1000): void {
  if (cleanupInterval) return;
  
  // Run cleanup immediately
  cleanupOldData().catch(console.error);
  
  // Schedule periodic cleanup
  cleanupInterval = setInterval(() => {
    cleanupOldData().catch(console.error);
  }, intervalMs);
}

export function stopAutomaticCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// ============================================================================
// Enhanced Stats with Detailed Breakdown
// ============================================================================

export interface EnhancedStorageStats extends StorageStats {
  usage: StorageUsage;
  oldestPendingItem: Date | null;
  newestPendingItem: Date | null;
  averageSyncTime: number | null;
}

/**
 * Get enhanced storage statistics
 */
export async function getEnhancedStorageStats(): Promise<EnhancedStorageStats> {
  const database = await initOfflineDB();
  
  // Get basic stats
  const [assessments, photos, deficiencies, syncQueue] = await Promise.all([
    new Promise<OfflineAssessment[]>((resolve, reject) => {
      const tx = database.transaction([STORES.ASSESSMENTS], "readonly");
      const request = tx.objectStore(STORES.ASSESSMENTS).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
    new Promise<OfflinePhoto[]>((resolve, reject) => {
      const tx = database.transaction([STORES.PHOTOS], "readonly");
      const request = tx.objectStore(STORES.PHOTOS).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
    new Promise<OfflineDeficiency[]>((resolve, reject) => {
      const tx = database.transaction([STORES.DEFICIENCIES], "readonly");
      const request = tx.objectStore(STORES.DEFICIENCIES).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
    new Promise<SyncQueueItem[]>((resolve, reject) => {
      const tx = database.transaction([STORES.SYNC_QUEUE], "readonly");
      const request = tx.objectStore(STORES.SYNC_QUEUE).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
  ]);

  const usage = await getStorageUsage();

  // Calculate pending item timestamps
  const pendingItems = syncQueue.filter(s => s.status === "pending");
  const timestamps = pendingItems.map(s => s.createdAt);
  const oldestPendingItem = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
  const newestPendingItem = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;

  // Calculate average sync time from completed items
  const completedItems = syncQueue.filter(s => s.status === "completed" && s.lastAttemptAt);
  const syncTimes = completedItems.map(s => (s.lastAttemptAt || 0) - s.createdAt);
  const averageSyncTime = syncTimes.length > 0 
    ? syncTimes.reduce((a, b) => a + b, 0) / syncTimes.length 
    : null;

  return {
    assessments: {
      total: assessments.length,
      pending: assessments.filter(a => a.syncStatus === "pending").length,
      synced: assessments.filter(a => a.syncStatus === "synced").length,
      failed: assessments.filter(a => a.syncStatus === "failed").length,
    },
    photos: {
      total: photos.length,
      pending: photos.filter(p => p.syncStatus === "pending").length,
      synced: photos.filter(p => p.syncStatus === "synced").length,
      failed: photos.filter(p => p.syncStatus === "failed").length,
      totalSize: photos.reduce((sum, p) => sum + p.fileSize, 0),
    },
    deficiencies: {
      total: deficiencies.length,
      pending: deficiencies.filter(d => d.syncStatus === "pending").length,
      synced: deficiencies.filter(d => d.syncStatus === "synced").length,
      failed: deficiencies.filter(d => d.syncStatus === "failed").length,
    },
    syncQueue: {
      total: syncQueue.length,
      pending: syncQueue.filter(s => s.status === "pending").length,
      processing: syncQueue.filter(s => s.status === "processing").length,
      failed: syncQueue.filter(s => s.status === "failed").length,
    },
    usage,
    oldestPendingItem,
    newestPendingItem,
    averageSyncTime,
  };
}

// ============================================================================
// Cached Asset Store (New)
// ============================================================================

export interface CachedAsset {
  id: number;
  projectId: number;
  uniqueId: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  yearBuilt: number | null;
  buildingType: string | null;
  numberOfFloors: number | null;
  grossFloorArea: number | null;
  cachedAt: number;
}

/**
 * Cache assets for a project
 */
export async function cacheAssets(assets: Omit<CachedAsset, "cachedAt">[]): Promise<void> {
  const now = Date.now();
  const cachedAssets = assets.map(asset => ({ ...asset, cachedAt: now }));
  await batchUpdateItems(STORES.CACHED_ASSETS, cachedAssets);
}

/**
 * Get cached assets for a project
 */
export async function getCachedAssets(projectId: number): Promise<CachedAsset[]> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.CACHED_ASSETS], "readonly");
    const store = transaction.objectStore(STORES.CACHED_ASSETS);
    const index = store.index("projectId");
    const request = index.getAll(projectId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Export all original functions with optimizations
// ============================================================================

export {
  type OfflineAssessment,
  type OfflinePhoto,
  type OfflineDeficiency,
  type SyncQueueItem,
  type CachedProject,
  type CachedBuildingComponent,
  type StorageStats,
} from "./offlineStorage";
