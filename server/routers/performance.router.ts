/**
 * Performance Monitoring Router
 * 
 * Provides endpoints for recording and querying performance metrics
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  recordPerformanceMetric,
  getCacheHitRate,
  getAverageLoadTime,
  getPerformanceSummary,
} from "../services/performanceMonitoring.service";

export const performanceRouter = router({
  /**
   * Record a performance metric
   */
  record: protectedProcedure
    .input(
      z.object({
        metricType: z.enum(["page_load", "api_call", "cache_hit", "cache_miss", "db_query"]),
        metricName: z.string(),
        duration: z.number().optional(),
        metadata: z.record(z.any()).optional(),
        projectId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await recordPerformanceMetric({
        ...input,
        userId: ctx.user.id,
      });
      return { success: true };
    }),

  /**
   * Get cache hit rate for a time period
   */
  cacheHitRate: protectedProcedure
    .input(
      z.object({
        days: z.number().default(7),
        projectId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      return await getCacheHitRate(startDate, endDate, input.projectId);
    }),

  /**
   * Get average load time for a metric
   */
  averageLoadTime: protectedProcedure
    .input(
      z.object({
        metricName: z.string(),
        days: z.number().default(7),
        projectId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      return await getAverageLoadTime(input.metricName, startDate, endDate, input.projectId);
    }),

  /**
   * Get performance summary for a project
   */
  summary: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        days: z.number().default(7),
      })
    )
    .query(async ({ input }) => {
      return await getPerformanceSummary(input.projectId, input.days);
    }),
});
