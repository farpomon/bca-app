/**
 * Performance Monitoring Service
 * 
 * Tracks load times, cache hit rates, and other performance metrics
 */

import { getDb } from "../db";
import { performanceMetrics } from "../../drizzle/schema";
import { desc, and, gte, eq } from "drizzle-orm";

export interface PerformanceMetric {
  metricType: "page_load" | "api_call" | "cache_hit" | "cache_miss" | "db_query";
  metricName: string;
  duration?: number;
  metadata?: Record<string, any>;
  userId?: number;
  projectId?: number;
}

/**
 * Record a performance metric
 */
export async function recordPerformanceMetric(metric: PerformanceMetric): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(performanceMetrics).values({
      metricType: metric.metricType,
      metricName: metric.metricName,
      duration: metric.duration || null,
      metadata: metric.metadata ? JSON.stringify(metric.metadata) : null,
      userId: metric.userId || null,
      projectId: metric.projectId || null,
      recordedAt: new Date(),
    });
  } catch (error) {
    console.error("[PerformanceMonitoring] Failed to record metric:", error);
    // Don't throw - monitoring failures shouldn't break the app
  }
}

/**
 * Get cache hit rate for a time period
 */
export async function getCacheHitRate(
  startDate: Date,
  endDate: Date,
  projectId?: number
): Promise<{ hitRate: number; totalHits: number; totalMisses: number }> {
  try {
    const db = await getDb();
    if (!db) return { hitRate: 0, totalHits: 0, totalMisses: 0 };

    const conditions = [
      gte(performanceMetrics.recordedAt, startDate),
      ...(projectId ? [eq(performanceMetrics.projectId, projectId)] : []),
    ];

    const hits = await db
      .select()
      .from(performanceMetrics)
      .where(and(eq(performanceMetrics.metricType, "cache_hit"), ...conditions));

    const misses = await db
      .select()
      .from(performanceMetrics)
      .where(and(eq(performanceMetrics.metricType, "cache_miss"), ...conditions));

    const totalHits = hits.length;
    const totalMisses = misses.length;
    const total = totalHits + totalMisses;
    const hitRate = total > 0 ? (totalHits / total) * 100 : 0;

    return { hitRate, totalHits, totalMisses };
  } catch (error) {
    console.error("[PerformanceMonitoring] Failed to get cache hit rate:", error);
    return { hitRate: 0, totalHits: 0, totalMisses: 0 };
  }
}

/**
 * Get average load time for a metric
 */
export async function getAverageLoadTime(
  metricName: string,
  startDate: Date,
  endDate: Date,
  projectId?: number
): Promise<{ averageMs: number; count: number; p50: number; p95: number; p99: number }> {
  try {
    const db = await getDb();
    if (!db) return { averageMs: 0, count: 0, p50: 0, p95: 0, p99: 0 };

    const conditions = [
      eq(performanceMetrics.metricName, metricName),
      gte(performanceMetrics.recordedAt, startDate),
      ...(projectId ? [eq(performanceMetrics.projectId, projectId)] : []),
    ];

    const metrics = await db
      .select()
      .from(performanceMetrics)
      .where(and(...conditions))
      .orderBy(performanceMetrics.duration);

    const durations = metrics
      .map((m) => m.duration)
      .filter((d): d is number => d !== null);

    if (durations.length === 0) {
      return { averageMs: 0, count: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sum = durations.reduce((acc, d) => acc + d, 0);
    const averageMs = sum / durations.length;

    // Calculate percentiles
    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    return {
      averageMs: Math.round(averageMs),
      count: durations.length,
      p50: durations[p50Index] || 0,
      p95: durations[p95Index] || 0,
      p99: durations[p99Index] || 0,
    };
  } catch (error) {
    console.error("[PerformanceMonitoring] Failed to get average load time:", error);
    return { averageMs: 0, count: 0, p50: 0, p95: 0, p99: 0 };
  }
}

/**
 * Get performance summary for a project
 */
export async function getPerformanceSummary(
  projectId: number,
  days: number = 7
): Promise<{
  cacheHitRate: number;
  avgApiResponseTime: number;
  avgPageLoadTime: number;
  slowestQueries: Array<{ name: string; avgDuration: number; count: number }>;
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    const cacheStats = await getCacheHitRate(startDate, endDate, projectId);
    const apiStats = await getAverageLoadTime("api_call", startDate, endDate, projectId);
    const pageStats = await getAverageLoadTime("page_load", startDate, endDate, projectId);

    // Get slowest queries
    const db = await getDb();
    const slowestQueries: Array<{ name: string; avgDuration: number; count: number }> = [];

    if (db) {
      const dbQueries = await db
        .select()
        .from(performanceMetrics)
        .where(
          and(
            eq(performanceMetrics.metricType, "db_query"),
            eq(performanceMetrics.projectId, projectId),
            gte(performanceMetrics.recordedAt, startDate)
          )
        )
        .orderBy(desc(performanceMetrics.duration))
        .limit(10);

      // Group by query name and calculate averages
      const queryMap = new Map<string, { total: number; count: number }>();
      for (const query of dbQueries) {
        if (!query.metricName || !query.duration) continue;
        const existing = queryMap.get(query.metricName) || { total: 0, count: 0 };
        queryMap.set(query.metricName, {
          total: existing.total + query.duration,
          count: existing.count + 1,
        });
      }

      for (const [name, stats] of queryMap.entries()) {
        slowestQueries.push({
          name,
          avgDuration: Math.round(stats.total / stats.count),
          count: stats.count,
        });
      }

      slowestQueries.sort((a, b) => b.avgDuration - a.avgDuration);
    }

    return {
      cacheHitRate: Math.round(cacheStats.hitRate),
      avgApiResponseTime: apiStats.averageMs,
      avgPageLoadTime: pageStats.averageMs,
      slowestQueries: slowestQueries.slice(0, 5),
    };
  } catch (error) {
    console.error("[PerformanceMonitoring] Failed to get performance summary:", error);
    return {
      cacheHitRate: 0,
      avgApiResponseTime: 0,
      avgPageLoadTime: 0,
      slowestQueries: [],
    };
  }
}

/**
 * Clean up old performance metrics (retention policy)
 */
export async function cleanupOldMetrics(retentionDays: number = 30): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await db
      .delete(performanceMetrics)
      .where(gte(performanceMetrics.recordedAt, cutoffDate));

    return result.rowsAffected || 0;
  } catch (error) {
    console.error("[PerformanceMonitoring] Failed to cleanup old metrics:", error);
    return 0;
  }
}
