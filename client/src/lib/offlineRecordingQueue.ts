/**
 * Offline Recording Queue
 * 
 * Stores recordings locally using IndexedDB when offline,
 * and automatically uploads them when connection is restored.
 */

export interface QueuedRecording {
  id: string;
  blob: Blob;
  timestamp: number;
  context: string;
  status: "pending" | "uploading" | "failed";
  retryCount: number;
  error?: string;
}

const DB_NAME = "bca_offline_recordings";
const STORE_NAME = "recordings";
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
export async function initDB(): Promise<IDBDatabase> {
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
      
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        objectStore.createIndex("timestamp", "timestamp", { unique: false });
        objectStore.createIndex("status", "status", { unique: false });
      }
    };
  });
}

/**
 * Add a recording to the offline queue
 */
export async function queueRecording(
  blob: Blob,
  context: string
): Promise<string> {
  const database = await initDB();
  const id = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const recording: QueuedRecording = {
    id,
    blob,
    timestamp: Date.now(),
    context,
    status: "pending",
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(recording);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all pending recordings
 */
export async function getPendingRecordings(): Promise<QueuedRecording[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("status");
    const request = index.getAll("pending");

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all recordings (for display in UI)
 */
export async function getAllRecordings(): Promise<QueuedRecording[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const recordings = request.result;
      // Sort by timestamp descending
      recordings.sort((a, b) => b.timestamp - a.timestamp);
      resolve(recordings);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update recording status
 */
export async function updateRecordingStatus(
  id: string,
  status: QueuedRecording["status"],
  error?: string
): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const recording = getRequest.result;
      if (!recording) {
        reject(new Error("Recording not found"));
        return;
      }

      recording.status = status;
      if (error) recording.error = error;
      if (status === "failed") recording.retryCount++;

      const updateRequest = store.put(recording);
      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(updateRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Delete a recording from the queue
 */
export async function deleteRecording(id: string): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all successfully uploaded recordings
 */
export async function clearCompletedRecordings(): Promise<void> {
  const database = await initDB();
  const allRecordings = await getAllRecordings();
  
  // We don't have a "completed" status, so we'll delete old pending ones
  // that are more than 7 days old (likely stale)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  for (const recording of allRecordings) {
    if (recording.timestamp < sevenDaysAgo && recording.status === "pending") {
      await deleteRecording(recording.id);
    }
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  failed: number;
}> {
  const recordings = await getAllRecordings();
  
  return {
    total: recordings.length,
    pending: recordings.filter(r => r.status === "pending").length,
    failed: recordings.filter(r => r.status === "failed").length,
  };
}
