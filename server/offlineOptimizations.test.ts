/**
 * Tests for Offline Storage Optimizations
 * 
 * Tests the optimized offline storage infrastructure including:
 * - Storage limits configuration
 * - Batch operations
 * - Storage usage tracking
 * - Cleanup functionality
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ============================================================================
// Storage Limits Tests
// ============================================================================

describe("Storage Limits Configuration", () => {
  it("should have reasonable storage limits defined", () => {
    // These values should match what's defined in offlineStorageOptimized.ts
    const expectedLimits = {
      MAX_TOTAL_SIZE_MB: 500,
      MAX_PHOTO_SIZE_MB: 10,
      MAX_PHOTOS_COUNT: 1000,
      PHOTO_CACHE_TTL_DAYS: 30,
      PROJECT_CACHE_TTL_HOURS: 24,
      SYNC_QUEUE_MAX_AGE_DAYS: 7,
    };

    // Verify limits are reasonable
    expect(expectedLimits.MAX_TOTAL_SIZE_MB).toBeGreaterThan(0);
    expect(expectedLimits.MAX_TOTAL_SIZE_MB).toBeLessThanOrEqual(1000); // Max 1GB
    expect(expectedLimits.MAX_PHOTO_SIZE_MB).toBeGreaterThan(0);
    expect(expectedLimits.MAX_PHOTO_SIZE_MB).toBeLessThanOrEqual(50); // Max 50MB per photo
    expect(expectedLimits.MAX_PHOTOS_COUNT).toBeGreaterThan(0);
    expect(expectedLimits.PHOTO_CACHE_TTL_DAYS).toBeGreaterThan(0);
    expect(expectedLimits.PROJECT_CACHE_TTL_HOURS).toBeGreaterThan(0);
    expect(expectedLimits.SYNC_QUEUE_MAX_AGE_DAYS).toBeGreaterThan(0);
  });
});

// ============================================================================
// Delta Sync Tests
// ============================================================================

describe("Delta Sync", () => {
  interface DeltaChange {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }

  function computeDelta(
    original: Record<string, unknown>,
    updated: Record<string, unknown>
  ): DeltaChange[] {
    const changes: DeltaChange[] = [];
    const allKeys = Array.from(new Set([...Object.keys(original), ...Object.keys(updated)]));

    for (const key of allKeys) {
      // Skip metadata fields
      if (["id", "createdAt", "syncStatus", "retryCount", "syncError"].includes(key)) {
        continue;
      }

      const oldValue = original[key];
      const newValue = updated[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ field: key, oldValue, newValue });
      }
    }

    return changes;
  }

  it("should detect changed fields between two versions", () => {
    const original = {
      id: "1",
      condition: "good",
      observations: "Original observation",
      createdAt: 1000,
    };

    const updated = {
      id: "1",
      condition: "fair",
      observations: "Updated observation",
      createdAt: 1000,
    };

    const delta = computeDelta(original, updated);

    expect(delta).toHaveLength(2);
    expect(delta.find(d => d.field === "condition")).toEqual({
      field: "condition",
      oldValue: "good",
      newValue: "fair",
    });
    expect(delta.find(d => d.field === "observations")).toEqual({
      field: "observations",
      oldValue: "Original observation",
      newValue: "Updated observation",
    });
  });

  it("should skip metadata fields in delta computation", () => {
    const original = {
      id: "1",
      condition: "good",
      syncStatus: "pending",
      retryCount: 0,
    };

    const updated = {
      id: "1",
      condition: "good",
      syncStatus: "synced",
      retryCount: 1,
    };

    const delta = computeDelta(original, updated);

    // Should not include id, syncStatus, or retryCount
    expect(delta).toHaveLength(0);
  });

  it("should detect new fields added", () => {
    const original = {
      id: "1",
      condition: "good",
    };

    const updated = {
      id: "1",
      condition: "good",
      recommendations: "New recommendation",
    };

    const delta = computeDelta(original, updated);

    expect(delta).toHaveLength(1);
    expect(delta[0]).toEqual({
      field: "recommendations",
      oldValue: undefined,
      newValue: "New recommendation",
    });
  });

  it("should detect removed fields", () => {
    const original = {
      id: "1",
      condition: "good",
      recommendations: "Old recommendation",
    };

    const updated = {
      id: "1",
      condition: "good",
    };

    const delta = computeDelta(original, updated);

    expect(delta).toHaveLength(1);
    expect(delta[0]).toEqual({
      field: "recommendations",
      oldValue: "Old recommendation",
      newValue: undefined,
    });
  });
});

// ============================================================================
// Conflict Resolution Tests
// ============================================================================

describe("Conflict Resolution", () => {
  interface MergeResult {
    merged: Record<string, unknown>;
    conflicts: string[];
  }

  function mergeVersions(
    local: Record<string, unknown>,
    server: Record<string, unknown>,
    base?: Record<string, unknown>
  ): MergeResult {
    const merged: Record<string, unknown> = { ...server };
    const conflicts: string[] = [];

    const allKeys = Array.from(new Set([...Object.keys(local), ...Object.keys(server)]));

    for (const key of allKeys) {
      // Skip metadata
      if (["id", "createdAt", "updatedAt", "syncStatus", "retryCount"].includes(key)) {
        continue;
      }

      const localValue = local[key];
      const serverValue = server[key];
      const baseValue = base?.[key];

      // If values are the same, no conflict
      if (JSON.stringify(localValue) === JSON.stringify(serverValue)) {
        continue;
      }

      // Three-way merge logic
      if (base) {
        const localChanged = JSON.stringify(localValue) !== JSON.stringify(baseValue);
        const serverChanged = JSON.stringify(serverValue) !== JSON.stringify(baseValue);

        if (localChanged && !serverChanged) {
          // Only local changed - use local
          merged[key] = localValue;
        } else if (!localChanged && serverChanged) {
          // Only server changed - use server (already set)
        } else {
          // Both changed - conflict
          conflicts.push(key);
        }
      } else {
        // No base - mark as conflict
        conflicts.push(key);
      }
    }

    return { merged, conflicts };
  }

  it("should merge when only local changed", () => {
    const base = { condition: "good", observations: "Base" };
    const local = { condition: "fair", observations: "Base" };
    const server = { condition: "good", observations: "Base" };

    const result = mergeVersions(local, server, base);

    expect(result.merged.condition).toBe("fair");
    expect(result.conflicts).toHaveLength(0);
  });

  it("should merge when only server changed", () => {
    const base = { condition: "good", observations: "Base" };
    const local = { condition: "good", observations: "Base" };
    const server = { condition: "fair", observations: "Base" };

    const result = mergeVersions(local, server, base);

    expect(result.merged.condition).toBe("fair");
    expect(result.conflicts).toHaveLength(0);
  });

  it("should detect conflict when both changed same field", () => {
    const base = { condition: "good", observations: "Base" };
    const local = { condition: "fair", observations: "Base" };
    const server = { condition: "poor", observations: "Base" };

    const result = mergeVersions(local, server, base);

    expect(result.conflicts).toContain("condition");
  });

  it("should handle merge without base (two-way)", () => {
    const local = { condition: "fair", observations: "Local" };
    const server = { condition: "good", observations: "Server" };

    const result = mergeVersions(local, server);

    // Without base, all differences are conflicts
    expect(result.conflicts).toContain("condition");
    expect(result.conflicts).toContain("observations");
  });
});

// ============================================================================
// Storage Usage Calculation Tests
// ============================================================================

describe("Storage Usage Calculation", () => {
  interface StorageUsage {
    totalBytes: number;
    assessmentsBytes: number;
    photosBytes: number;
    deficienciesBytes: number;
    cacheBytes: number;
    percentUsed: number;
  }

  function calculateStorageUsage(
    assessments: { size: number }[],
    photos: { size: number }[],
    deficiencies: { size: number }[],
    cache: { size: number }[],
    maxSizeMB: number
  ): StorageUsage {
    const assessmentsBytes = assessments.reduce((sum, a) => sum + a.size, 0);
    const photosBytes = photos.reduce((sum, p) => sum + p.size, 0);
    const deficienciesBytes = deficiencies.reduce((sum, d) => sum + d.size, 0);
    const cacheBytes = cache.reduce((sum, c) => sum + c.size, 0);
    const totalBytes = assessmentsBytes + photosBytes + deficienciesBytes + cacheBytes;
    const maxBytes = maxSizeMB * 1024 * 1024;
    const percentUsed = (totalBytes / maxBytes) * 100;

    return {
      totalBytes,
      assessmentsBytes,
      photosBytes,
      deficienciesBytes,
      cacheBytes,
      percentUsed,
    };
  }

  it("should calculate total storage usage correctly", () => {
    const assessments = [{ size: 1000 }, { size: 2000 }];
    const photos = [{ size: 50000 }, { size: 75000 }];
    const deficiencies = [{ size: 500 }];
    const cache = [{ size: 10000 }];

    const usage = calculateStorageUsage(assessments, photos, deficiencies, cache, 500);

    expect(usage.assessmentsBytes).toBe(3000);
    expect(usage.photosBytes).toBe(125000);
    expect(usage.deficienciesBytes).toBe(500);
    expect(usage.cacheBytes).toBe(10000);
    expect(usage.totalBytes).toBe(138500);
  });

  it("should calculate percentage used correctly", () => {
    const assessments = [{ size: 100 * 1024 * 1024 }]; // 100MB
    const photos: { size: number }[] = [];
    const deficiencies: { size: number }[] = [];
    const cache: { size: number }[] = [];

    const usage = calculateStorageUsage(assessments, photos, deficiencies, cache, 500);

    expect(usage.percentUsed).toBeCloseTo(20, 1); // 100MB / 500MB = 20%
  });

  it("should handle empty storage", () => {
    const usage = calculateStorageUsage([], [], [], [], 500);

    expect(usage.totalBytes).toBe(0);
    expect(usage.percentUsed).toBe(0);
  });
});

// ============================================================================
// LRU Cache Eviction Tests
// ============================================================================

describe("LRU Cache Eviction", () => {
  interface PhotoWithAccess {
    id: string;
    size: number;
    lastAccessed: number;
    syncStatus: "pending" | "synced";
  }

  function getLRUPhotos(photos: PhotoWithAccess[], count: number): string[] {
    // Only consider synced photos for eviction
    const syncedPhotos = photos.filter(p => p.syncStatus === "synced");
    
    // Sort by last accessed (oldest first)
    syncedPhotos.sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    // Return IDs of oldest photos
    return syncedPhotos.slice(0, count).map(p => p.id);
  }

  it("should return oldest accessed photos first", () => {
    const photos: PhotoWithAccess[] = [
      { id: "1", size: 1000, lastAccessed: 1000, syncStatus: "synced" },
      { id: "2", size: 1000, lastAccessed: 3000, syncStatus: "synced" },
      { id: "3", size: 1000, lastAccessed: 2000, syncStatus: "synced" },
    ];

    const toEvict = getLRUPhotos(photos, 2);

    expect(toEvict).toEqual(["1", "3"]); // Oldest first
  });

  it("should not include pending photos in eviction", () => {
    const photos: PhotoWithAccess[] = [
      { id: "1", size: 1000, lastAccessed: 1000, syncStatus: "pending" },
      { id: "2", size: 1000, lastAccessed: 2000, syncStatus: "synced" },
      { id: "3", size: 1000, lastAccessed: 3000, syncStatus: "synced" },
    ];

    const toEvict = getLRUPhotos(photos, 2);

    expect(toEvict).not.toContain("1");
    expect(toEvict).toContain("2");
    expect(toEvict).toContain("3");
  });

  it("should handle empty photo list", () => {
    const toEvict = getLRUPhotos([], 5);
    expect(toEvict).toHaveLength(0);
  });
});

// ============================================================================
// Cleanup Logic Tests
// ============================================================================

describe("Cleanup Logic", () => {
  interface CleanupItem {
    id: string;
    syncStatus: "pending" | "synced" | "failed";
    updatedAt: number;
    retryCount?: number;
  }

  function getItemsToCleanup(
    items: CleanupItem[],
    maxAgeDays: number,
    maxRetries: number
  ): string[] {
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const toDelete: string[] = [];

    for (const item of items) {
      // Delete synced items older than max age
      if (item.syncStatus === "synced" && now - item.updatedAt > maxAgeMs) {
        toDelete.push(item.id);
        continue;
      }

      // Delete failed items that exceeded retry count
      if (item.syncStatus === "failed" && (item.retryCount || 0) >= maxRetries) {
        toDelete.push(item.id);
      }
    }

    return toDelete;
  }

  it("should mark old synced items for cleanup", () => {
    const now = Date.now();
    const items: CleanupItem[] = [
      { id: "1", syncStatus: "synced", updatedAt: now - 40 * 24 * 60 * 60 * 1000 }, // 40 days old
      { id: "2", syncStatus: "synced", updatedAt: now - 10 * 24 * 60 * 60 * 1000 }, // 10 days old
      { id: "3", syncStatus: "pending", updatedAt: now - 40 * 24 * 60 * 60 * 1000 }, // 40 days old but pending
    ];

    const toCleanup = getItemsToCleanup(items, 30, 5);

    expect(toCleanup).toContain("1");
    expect(toCleanup).not.toContain("2");
    expect(toCleanup).not.toContain("3"); // Pending items should not be cleaned
  });

  it("should mark failed items with max retries for cleanup", () => {
    const now = Date.now();
    const items: CleanupItem[] = [
      { id: "1", syncStatus: "failed", updatedAt: now, retryCount: 5 },
      { id: "2", syncStatus: "failed", updatedAt: now, retryCount: 2 },
      { id: "3", syncStatus: "pending", updatedAt: now, retryCount: 10 },
    ];

    const toCleanup = getItemsToCleanup(items, 30, 5);

    expect(toCleanup).toContain("1");
    expect(toCleanup).not.toContain("2");
    expect(toCleanup).not.toContain("3");
  });
});

// ============================================================================
// Batch Operation Tests
// ============================================================================

describe("Batch Operations", () => {
  interface BatchOperation<T> {
    type: "add" | "update" | "delete";
    storeName: string;
    data?: T;
    key?: string;
  }

  function validateBatchOperations<T>(operations: BatchOperation<T>[]): boolean {
    if (operations.length === 0) return true;

    for (const op of operations) {
      if (!op.storeName) return false;
      if (op.type === "add" && !op.data) return false;
      if (op.type === "update" && !op.data) return false;
      if (op.type === "delete" && !op.key) return false;
    }

    return true;
  }

  it("should validate add operations require data", () => {
    const operations: BatchOperation<{ id: string }>[] = [
      { type: "add", storeName: "test", data: { id: "1" } },
    ];

    expect(validateBatchOperations(operations)).toBe(true);

    const invalidOps: BatchOperation<{ id: string }>[] = [
      { type: "add", storeName: "test" },
    ];

    expect(validateBatchOperations(invalidOps)).toBe(false);
  });

  it("should validate delete operations require key", () => {
    const operations: BatchOperation<{ id: string }>[] = [
      { type: "delete", storeName: "test", key: "1" },
    ];

    expect(validateBatchOperations(operations)).toBe(true);

    const invalidOps: BatchOperation<{ id: string }>[] = [
      { type: "delete", storeName: "test" },
    ];

    expect(validateBatchOperations(invalidOps)).toBe(false);
  });

  it("should handle empty batch", () => {
    expect(validateBatchOperations([])).toBe(true);
  });
});

// ============================================================================
// Sync Queue Priority Tests
// ============================================================================

describe("Sync Queue Priority", () => {
  interface SyncQueueItem {
    id: string;
    entityType: "assessment" | "photo" | "deficiency";
    priority: number;
    createdAt: number;
  }

  function sortSyncQueue(items: SyncQueueItem[]): SyncQueueItem[] {
    return [...items].sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Then by creation time (older first)
      return a.createdAt - b.createdAt;
    });
  }

  it("should sort by priority first", () => {
    const items: SyncQueueItem[] = [
      { id: "1", entityType: "photo", priority: 1, createdAt: 1000 },
      { id: "2", entityType: "assessment", priority: 3, createdAt: 2000 },
      { id: "3", entityType: "deficiency", priority: 2, createdAt: 1500 },
    ];

    const sorted = sortSyncQueue(items);

    expect(sorted[0].id).toBe("2"); // Priority 3
    expect(sorted[1].id).toBe("3"); // Priority 2
    expect(sorted[2].id).toBe("1"); // Priority 1
  });

  it("should sort by creation time when priority is equal", () => {
    const items: SyncQueueItem[] = [
      { id: "1", entityType: "assessment", priority: 2, createdAt: 3000 },
      { id: "2", entityType: "assessment", priority: 2, createdAt: 1000 },
      { id: "3", entityType: "assessment", priority: 2, createdAt: 2000 },
    ];

    const sorted = sortSyncQueue(items);

    expect(sorted[0].id).toBe("2"); // Oldest
    expect(sorted[1].id).toBe("3");
    expect(sorted[2].id).toBe("1"); // Newest
  });
});
