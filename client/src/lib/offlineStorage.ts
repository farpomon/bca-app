/**
 * Offline Storage Infrastructure
 * 
 * Comprehensive IndexedDB-based storage for offline-first functionality.
 * Stores assessments, photos, deficiencies, and sync queue locally.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface OfflineAssessment {
  id: string; // Temporary ID (e.g., "offline_assessment_123")
  projectId: number;
  assetId: number;
  componentCode: string | null;
  componentName: string | null;
  componentLocation: string | null;
  condition: string | null;
  status: string | null;
  observations: string | null;
  recommendations: string | null;
  estimatedServiceLife: number | null;
  reviewYear: number | null;
  lastTimeAction: number | null;
  estimatedRepairCost: number | null;
  replacementValue: number | null;
  actionYear: number | null;
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  syncError?: string;
  retryCount: number;
}

export interface OfflinePhoto {
  id: string; // Temporary ID (e.g., "offline_photo_123")
  assessmentId: string; // Links to OfflineAssessment.id or real assessment ID
  projectId: number;
  blob: Blob; // Compressed image data
  originalBlob: Blob; // Original uncompressed image
  fileName: string;
  fileSize: number; // In bytes
  mimeType: string;
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  locationAccuracy: number | null;
  createdAt: number; // Timestamp
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  syncError?: string;
  retryCount: number;
  uploadProgress?: number; // 0-100
}

export interface OfflineDeficiency {
  id: string; // Temporary ID
  projectId: number;
  assessmentId: string; // Links to OfflineAssessment.id or real assessment ID
  componentCode: string | null;
  description: string;
  severity: string;
  priority: string;
  estimatedCost: number | null;
  createdAt: number;
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  syncError?: string;
  retryCount: number;
}

export interface SyncQueueItem {
  id: string;
  type: "assessment" | "photo" | "deficiency";
  itemId: string; // ID of the offline item
  priority: number; // 1 = highest, 5 = lowest
  createdAt: number;
  attempts: number;
  lastAttemptAt: number | null;
  nextRetryAt: number | null;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

export interface CachedProject {
  id: number;
  name: string;
  address: string | null;
  clientName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  cachedAt: number; // Timestamp when cached
}

export interface CachedBuildingComponent {
  id: number;
  code: string;
  name: string;
  level: number;
  parentId: number | null;
  description: string | null;
}

// ============================================================================
// IndexedDB Configuration
// ============================================================================

const DB_NAME = "bca_offline_storage";
const DB_VERSION = 1;

// Store names
export const STORES = {
  ASSESSMENTS: "offline_assessments",
  PHOTOS: "offline_photos",
  DEFICIENCIES: "offline_deficiencies",
  SYNC_QUEUE: "sync_queue",
  CACHED_PROJECTS: "cached_projects",
  CACHED_COMPONENTS: "cached_components",
} as const;

let db: IDBDatabase | null = null;

// ============================================================================
// Database Initialization
// ============================================================================

/**
 * Initialize IndexedDB with all required object stores
 */
export async function initOfflineDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create offline_assessments store
      if (!database.objectStoreNames.contains(STORES.ASSESSMENTS)) {
        const assessmentStore = database.createObjectStore(STORES.ASSESSMENTS, { keyPath: "id" });
        assessmentStore.createIndex("projectId", "projectId", { unique: false });
        assessmentStore.createIndex("assetId", "assetId", { unique: false });
        assessmentStore.createIndex("syncStatus", "syncStatus", { unique: false });
        assessmentStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Create offline_photos store
      if (!database.objectStoreNames.contains(STORES.PHOTOS)) {
        const photoStore = database.createObjectStore(STORES.PHOTOS, { keyPath: "id" });
        photoStore.createIndex("assessmentId", "assessmentId", { unique: false });
        photoStore.createIndex("projectId", "projectId", { unique: false });
        photoStore.createIndex("syncStatus", "syncStatus", { unique: false });
        photoStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Create offline_deficiencies store
      if (!database.objectStoreNames.contains(STORES.DEFICIENCIES)) {
        const deficiencyStore = database.createObjectStore(STORES.DEFICIENCIES, { keyPath: "id" });
        deficiencyStore.createIndex("projectId", "projectId", { unique: false });
        deficiencyStore.createIndex("assessmentId", "assessmentId", { unique: false });
        deficiencyStore.createIndex("syncStatus", "syncStatus", { unique: false });
      }

      // Create sync_queue store
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: "id" });
        syncStore.createIndex("type", "type", { unique: false });
        syncStore.createIndex("priority", "priority", { unique: false });
        syncStore.createIndex("status", "status", { unique: false });
        syncStore.createIndex("nextRetryAt", "nextRetryAt", { unique: false });
      }

      // Create cached_projects store
      if (!database.objectStoreNames.contains(STORES.CACHED_PROJECTS)) {
        const projectStore = database.createObjectStore(STORES.CACHED_PROJECTS, { keyPath: "id" });
        projectStore.createIndex("cachedAt", "cachedAt", { unique: false });
      }

      // Create cached_components store (UNIFORMAT II)
      if (!database.objectStoreNames.contains(STORES.CACHED_COMPONENTS)) {
        const componentStore = database.createObjectStore(STORES.CACHED_COMPONENTS, { keyPath: "id" });
        componentStore.createIndex("code", "code", { unique: false });
        componentStore.createIndex("level", "level", { unique: false });
      }
    };
  });
}

// ============================================================================
// Generic CRUD Operations
// ============================================================================

/**
 * Add an item to a store
 */
export async function addItem<T>(storeName: string, item: T): Promise<string> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.add(item);

    request.onsuccess = () => resolve(request.result as string);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get an item by ID
 */
export async function getItem<T>(storeName: string, id: string | number): Promise<T | undefined> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all items from a store
 */
export async function getAllItems<T>(storeName: string): Promise<T[]> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update an item in a store
 */
export async function updateItem<T>(storeName: string, item: T): Promise<void> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete an item from a store
 */
export async function deleteItem(storeName: string, id: string | number): Promise<void> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get items by index
 */
export async function getItemsByIndex<T>(
  storeName: string,
  indexName: string,
  value: any
): Promise<T[]> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all items from a store
 */
export async function clearStore(storeName: string): Promise<void> {
  const database = await initOfflineDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Assessment Operations
// ============================================================================

/**
 * Save assessment offline
 */
export async function saveOfflineAssessment(assessment: Omit<OfflineAssessment, "id" | "createdAt" | "updatedAt" | "syncStatus" | "retryCount">): Promise<string> {
  const id = `offline_assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  
  const offlineAssessment: OfflineAssessment = {
    ...assessment,
    id,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
    retryCount: 0,
  };

  await addItem(STORES.ASSESSMENTS, offlineAssessment);
  
  // Add to sync queue
  await addToSyncQueue({
    id: `sync_${id}`,
    type: "assessment",
    itemId: id,
    priority: 1, // Assessments have highest priority
    createdAt: now,
    attempts: 0,
    lastAttemptAt: null,
    nextRetryAt: now, // Ready to sync immediately
    status: "pending",
  });

  return id;
}

/**
 * Get all pending assessments
 */
export async function getPendingAssessments(): Promise<OfflineAssessment[]> {
  return getItemsByIndex<OfflineAssessment>(STORES.ASSESSMENTS, "syncStatus", "pending");
}

/**
 * Get assessments by project
 */
export async function getAssessmentsByProject(projectId: number): Promise<OfflineAssessment[]> {
  return getItemsByIndex<OfflineAssessment>(STORES.ASSESSMENTS, "projectId", projectId);
}

/**
 * Update assessment sync status
 */
export async function updateAssessmentSyncStatus(
  id: string,
  status: OfflineAssessment["syncStatus"],
  error?: string
): Promise<void> {
  const assessment = await getItem<OfflineAssessment>(STORES.ASSESSMENTS, id);
  if (!assessment) throw new Error("Assessment not found");

  assessment.syncStatus = status;
  assessment.updatedAt = Date.now();
  if (error) assessment.syncError = error;
  if (status === "failed") assessment.retryCount++;

  await updateItem(STORES.ASSESSMENTS, assessment);
}

// ============================================================================
// Photo Operations
// ============================================================================

/**
 * Save photo offline
 */
export async function saveOfflinePhoto(photo: Omit<OfflinePhoto, "id" | "createdAt" | "syncStatus" | "retryCount">): Promise<string> {
  const id = `offline_photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  
  const offlinePhoto: OfflinePhoto = {
    ...photo,
    id,
    createdAt: now,
    syncStatus: "pending",
    retryCount: 0,
  };

  await addItem(STORES.PHOTOS, offlinePhoto);
  
  // Add to sync queue with lower priority than assessments
  await addToSyncQueue({
    id: `sync_${id}`,
    type: "photo",
    itemId: id,
    priority: 2,
    createdAt: now,
    attempts: 0,
    lastAttemptAt: null,
    nextRetryAt: now,
    status: "pending",
  });

  return id;
}

/**
 * Get pending photos
 */
export async function getPendingPhotos(): Promise<OfflinePhoto[]> {
  return getItemsByIndex<OfflinePhoto>(STORES.PHOTOS, "syncStatus", "pending");
}

/**
 * Get photos by assessment
 */
export async function getPhotosByAssessment(assessmentId: string): Promise<OfflinePhoto[]> {
  return getItemsByIndex<OfflinePhoto>(STORES.PHOTOS, "assessmentId", assessmentId);
}

/**
 * Update photo sync status
 */
export async function updatePhotoSyncStatus(
  id: string,
  status: OfflinePhoto["syncStatus"],
  progress?: number,
  error?: string
): Promise<void> {
  const photo = await getItem<OfflinePhoto>(STORES.PHOTOS, id);
  if (!photo) throw new Error("Photo not found");

  photo.syncStatus = status;
  if (progress !== undefined) photo.uploadProgress = progress;
  if (error) photo.syncError = error;
  if (status === "failed") photo.retryCount++;

  await updateItem(STORES.PHOTOS, photo);
}

// ============================================================================
// Sync Queue Operations
// ============================================================================

/**
 * Add item to sync queue
 */
export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  await addItem(STORES.SYNC_QUEUE, item);
}

/**
 * Get pending sync items (sorted by priority)
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const items = await getItemsByIndex<SyncQueueItem>(STORES.SYNC_QUEUE, "status", "pending");
  
  // Sort by priority (1 = highest) then by createdAt
  return items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.createdAt - b.createdAt;
  });
}

/**
 * Get items ready for retry
 */
export async function getItemsReadyForRetry(): Promise<SyncQueueItem[]> {
  const allItems = await getAllItems<SyncQueueItem>(STORES.SYNC_QUEUE);
  const now = Date.now();
  
  return allItems.filter(
    item => item.status === "failed" && item.nextRetryAt && item.nextRetryAt <= now
  );
}

/**
 * Update sync queue item
 */
export async function updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
  await updateItem(STORES.SYNC_QUEUE, item);
}

/**
 * Remove completed sync items
 */
export async function cleanupCompletedSyncItems(): Promise<void> {
  const allItems = await getAllItems<SyncQueueItem>(STORES.SYNC_QUEUE);
  const completed = allItems.filter(item => item.status === "completed");
  
  for (const item of completed) {
    await deleteItem(STORES.SYNC_QUEUE, item.id);
  }
}

// ============================================================================
// Storage Statistics
// ============================================================================

export interface StorageStats {
  assessments: {
    total: number;
    pending: number;
    synced: number;
    failed: number;
  };
  photos: {
    total: number;
    pending: number;
    synced: number;
    failed: number;
    totalSize: number; // In bytes
  };
  deficiencies: {
    total: number;
    pending: number;
    synced: number;
    failed: number;
  };
  syncQueue: {
    total: number;
    pending: number;
    processing: number;
    failed: number;
  };
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<StorageStats> {
  const assessments = await getAllItems<OfflineAssessment>(STORES.ASSESSMENTS);
  const photos = await getAllItems<OfflinePhoto>(STORES.PHOTOS);
  const deficiencies = await getAllItems<OfflineDeficiency>(STORES.DEFICIENCIES);
  const syncQueue = await getAllItems<SyncQueueItem>(STORES.SYNC_QUEUE);

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
  };
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}
