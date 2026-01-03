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

export const portfolioAnalyticsRouter = router({
  /**
   * Get comprehensive portfolio overview metrics
   */
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.user.role === 'admin';
    return await getPortfolioOverview(ctx.user.id, ctx.user.company, isAdmin);
  }),

  /**
   * Get condition distribution across all assessments
   */
  getConditionDistribution: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.user.role === 'admin';
    return await getConditionDistribution(ctx.user.id, ctx.user.company, isAdmin);
  }),

  /**
   * Get cost breakdown by UNIFORMAT category
   */
  getCategoryCostBreakdown: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.user.role === 'admin';
    return await getCategoryCostBreakdown(ctx.user.id, ctx.user.company, isAdmin);
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
      const isAdmin = ctx.user.role === 'admin';
      const { sortBy = 'priorityScore', sortOrder = 'desc', limit = 50 } = input || {};
      return await getBuildingComparison(ctx.user.id, ctx.user.company, isAdmin, sortBy, sortOrder, limit);
    }),

  /**
   * Get geographic distribution of buildings
   */
  getGeographicDistribution: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.user.role === 'admin';
    return await getGeographicDistribution(ctx.user.id, ctx.user.company, isAdmin);
  }),

  /**
   * Get property type distribution
   */
  getPropertyTypeDistribution: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.user.role === 'admin';
    return await getPropertyTypeDistribution(ctx.user.id, ctx.user.company, isAdmin);
  }),

  /**
   * Get priority breakdown of deficiencies
   */
  getPriorityBreakdown: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.user.role === 'admin';
    return await getPriorityBreakdown(ctx.user.id, ctx.user.company, isAdmin);
  }),

  /**
   * Get deficiency trends over time
   */
  getDeficiencyTrends: protectedProcedure
    .input(z.object({
      months: z.number().min(1).max(24).default(12),
    }).optional())
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === 'admin';
      const months = input?.months || 12;
      return await getDeficiencyTrends(ctx.user.id, ctx.user.company, isAdmin, months);
    }),

  /**
   * Get capital planning forecast
   */
  getCapitalForecast: protectedProcedure
    .input(z.object({
      years: z.number().min(1).max(10).default(5),
    }).optional())
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === 'admin';
      const years = input?.years || 5;
      return await getCapitalPlanningForecast(ctx.user.id, ctx.user.company, isAdmin, years);
    }),

  /**
   * Get all analytics data in a single request (for dashboard)
   */
  getDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.user.role === 'admin';
    const userId = ctx.user.id;
    const company = ctx.user.company;

    const [
      overview,
      conditionDistribution,
      categoryCostBreakdown,
      buildingComparison,
      geographicDistribution,
      propertyTypeDistribution,
      priorityBreakdown,
      deficiencyTrends,
      capitalForecast,
    ] = await Promise.all([
      getPortfolioOverview(userId, company, isAdmin),
      getConditionDistribution(userId, company, isAdmin),
      getCategoryCostBreakdown(userId, company, isAdmin),
      getBuildingComparison(userId, company, isAdmin, 'priorityScore', 'desc', 10),
      getGeographicDistribution(userId, company, isAdmin),
      getPropertyTypeDistribution(userId, company, isAdmin),
      getPriorityBreakdown(userId, company, isAdmin),
      getDeficiencyTrends(userId, company, isAdmin, 12),
      getCapitalPlanningForecast(userId, company, isAdmin, 5),
    ]);

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
