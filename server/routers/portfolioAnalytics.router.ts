/**
 * Portfolio Analytics Router
 * 
 * Provides comprehensive portfolio-wide analytics endpoints including:
 * - Portfolio overview metrics
 * - Condition distribution
 * - Cost breakdown by category
 * - Building comparisons
 * - Geographic distribution
 * - Property type analysis
 * - Deficiency trends
 * - Capital planning forecast
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getPortfolioOverview,
  getConditionDistribution,
  getCategoryCostBreakdown,
  getBuildingComparison,
  getGeographicDistribution,
  getPropertyTypeDistribution,
  getPriorityBreakdown,
  getDeficiencyTrends,
  getCapitalPlanningForecast,
} from "../db-portfolioAnalytics";

// Helper to get effective admin status and company for analytics queries
function getAnalyticsContext(ctx: any) {
  const isAdmin = ctx.user.role === 'admin';
  const isSuperAdmin = ctx.user.isSuperAdmin === 1;
  // For super admins, pass null company to see all projects
  const effectiveCompany = isSuperAdmin ? null : ctx.user.company;
  const effectiveIsAdmin = isAdmin || isSuperAdmin;
  return { effectiveCompany, effectiveIsAdmin };
}

export const portfolioAnalyticsRouter = router({
  /**
   * Get comprehensive portfolio overview metrics
   */
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const { effectiveCompany, effectiveIsAdmin } = getAnalyticsContext(ctx);
    return await getPortfolioOverview(ctx.user.id, effectiveCompany, effectiveIsAdmin);
  }),

  /**
   * Get condition distribution across all assessments
   */
  getConditionDistribution: protectedProcedure.query(async ({ ctx }) => {
    const { effectiveCompany, effectiveIsAdmin } = getAnalyticsContext(ctx);
    return await getConditionDistribution(ctx.user.id, effectiveCompany, effectiveIsAdmin);
  }),

  /**
   * Get cost breakdown by UNIFORMAT category
   */
  getCategoryCostBreakdown: protectedProcedure.query(async ({ ctx }) => {
    const { effectiveCompany, effectiveIsAdmin } = getAnalyticsContext(ctx);
    return await getCategoryCostBreakdown(ctx.user.id, effectiveCompany, effectiveIsAdmin);
  }),

  /**
   * Get building comparison data with sorting options
   */
  getBuildingComparison: protectedProcedure
    .input(z.object({
      sortBy: z.enum(['fci', 'conditionScore', 'deferredMaintenanceCost', 'priorityScore', 'name', 'buildingAge']).default('priorityScore'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { effectiveCompany, effectiveIsAdmin } = getAnalyticsContext(ctx);
      const { sortBy = 'priorityScore', sortOrder = 'desc', limit = 50 } = input || {};
      return await getBuildingComparison(ctx.user.id, effectiveCompany, effectiveIsAdmin, sortBy, sortOrder, limit);
    }),

  /**
   * Get geographic distribution of buildings
   */
  getGeographicDistribution: protectedProcedure.query(async ({ ctx }) => {
    const { effectiveCompany, effectiveIsAdmin } = getAnalyticsContext(ctx);
    return await getGeographicDistribution(ctx.user.id, effectiveCompany, effectiveIsAdmin);
  }),

  /**
   * Get property type distribution
   */
  getPropertyTypeDistribution: protectedProcedure.query(async ({ ctx }) => {
    const { effectiveCompany, effectiveIsAdmin } = getAnalyticsContext(ctx);
    return await getPropertyTypeDistribution(ctx.user.id, effectiveCompany, effectiveIsAdmin);
  }),

  /**
   * Get priority breakdown of deficiencies
   */
  getPriorityBreakdown: protectedProcedure.query(async ({ ctx }) => {
    const { effectiveCompany, effectiveIsAdmin } = getAnalyticsContext(ctx);
    return await getPriorityBreakdown(ctx.user.id, effectiveCompany, effectiveIsAdmin);
  }),

  /**
   * Get deficiency trends over time
   */
  getDeficiencyTrends: protectedProcedure
    .input(z.object({
      months: z.number().min(1).max(24).default(12),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { effectiveCompany, effectiveIsAdmin } = getAnalyticsContext(ctx);
      const months = input?.months || 12;
      return await getDeficiencyTrends(ctx.user.id, effectiveCompany, effectiveIsAdmin, months);
    }),

  /**
   * Get capital planning forecast
   */
  getCapitalForecast: protectedProcedure
    .input(z.object({
      years: z.number().min(1).max(10).default(5),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { effectiveCompany, effectiveIsAdmin } = getAnalyticsContext(ctx);
      const years = input?.years || 5;
      return await getCapitalPlanningForecast(ctx.user.id, effectiveCompany, effectiveIsAdmin, years);
    }),

  /**
   * Get all analytics data in a single request (for dashboard)
   */
  getDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const { effectiveCompany, effectiveIsAdmin } = getAnalyticsContext(ctx);
    const userId = ctx.user.id;

    // Use Promise.allSettled to prevent one failing query from breaking the entire dashboard
    const results = await Promise.allSettled([
      getPortfolioOverview(userId, effectiveCompany, effectiveIsAdmin),
      getConditionDistribution(userId, effectiveCompany, effectiveIsAdmin),
      getCategoryCostBreakdown(userId, effectiveCompany, effectiveIsAdmin),
      getBuildingComparison(userId, effectiveCompany, effectiveIsAdmin, 'priorityScore', 'desc', 10),
      getGeographicDistribution(userId, effectiveCompany, effectiveIsAdmin),
      getPropertyTypeDistribution(userId, effectiveCompany, effectiveIsAdmin),
      getPriorityBreakdown(userId, effectiveCompany, effectiveIsAdmin),
      getDeficiencyTrends(userId, effectiveCompany, effectiveIsAdmin, 12),
      getCapitalPlanningForecast(userId, effectiveCompany, effectiveIsAdmin, 5),
    ]);

    // Extract values, using defaults for failed queries
    const getValue = <T>(result: PromiseSettledResult<T>, defaultValue: T): T => {
      if (result.status === 'fulfilled') return result.value;
      console.error('[PortfolioAnalytics] Query failed:', result.reason);
      return defaultValue;
    };

    const overview = getValue(results[0], {
      totalBuildings: 0, totalAssets: 0, totalAssessments: 0, totalDeficiencies: 0,
      portfolioFCI: 0, totalCRV: 0, totalDMC: 0, avgBuildingAge: 0,
      avgConditionScore: 0, immediateNeeds: 0, shortTermNeeds: 0
    });
    const conditionDistribution = getValue(results[1], []);
    const categoryCostBreakdown = getValue(results[2], []);
    const buildingComparison = getValue(results[3], []);
    const geographicDistribution = getValue(results[4], []);
    const propertyTypeDistribution = getValue(results[5], []);
    const priorityBreakdown = getValue(results[6], []);
    const deficiencyTrends = getValue(results[7], []);
    const capitalForecast = getValue(results[8], []);

    return {
      overview,
      conditionDistribution,
      categoryCostBreakdown,
      buildingComparison,
      geographicDistribution,
      propertyTypeDistribution,
      priorityBreakdown,
      deficiencyTrends,
      capitalForecast,
      generatedAt: new Date().toISOString(),
    };
  }),
});
