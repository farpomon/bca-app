/**
 * Prediction Cache Service
 * 
 * Simple in-memory cache for prediction results to avoid expensive recalculations.
 * Cache entries expire after a configurable TTL (default: 5 minutes).
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class PredictionCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Generate cache key from project ID and method
   */
  private getCacheKey(projectId: number, method: string): string {
    return `predictions:${projectId}:${method}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Get cached predictions if available and not expired
   */
  get<T>(projectId: number, method: string): T | null {
    const key = this.getCacheKey(projectId, method);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (!this.isValid(entry)) {
      // Entry expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store predictions in cache
   */
  set<T>(projectId: number, method: string, data: T, ttl?: number): void {
    const key = this.getCacheKey(projectId, method);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    });
  }

  /**
   * Invalidate cache for a specific project
   */
  invalidate(projectId: number): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`predictions:${projectId}:`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) >= entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const predictionCache = new PredictionCache();

// Run cleanup every 10 minutes
setInterval(() => {
  predictionCache.cleanup();
}, 10 * 60 * 1000);
