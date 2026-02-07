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
  getComponentAssessmentsForPDF,
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
      months: z.number().min(1).max(60).default(12),
      granularity: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { effectiveCompany, effectiveIsAdmin } = getAnalyticsContext(ctx);
      const months = input?.months || 12;
      const granularity = input?.granularity || 'monthly';
      return await getDeficiencyTrends(ctx.user.id, effectiveCompany, effectiveIsAdmin, months, granularity);
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
      getDeficiencyTrends(userId, effectiveCompany, effectiveIsAdmin, 12, 'monthly'),
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

  /**
   * Get component assessments for PDF report generation
   * Returns detailed component data with observations, recommendations, and costs
   */
  getComponentAssessments: protectedProcedure
    .input(z.object({
      assetIds: z.array(z.number()).optional(),
      includePhotos: z.boolean().default(true),
      maxPhotosPerComponent: z.number().min(0).max(10).default(4),
      sortBy: z.enum(['uniformat', 'asset', 'condition', 'cost']).default('uniformat'),
    }).optional())
    .query(async ({ ctx, input }) => {
      // Direct SQL implementation to bypass tsx watch caching issue
      const { getDb } = await import('../db');
      const { sql } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) {
        console.log('[getComponentAssessments] No database connection');
        return [];
      }
      
      const assetIds = input?.assetIds;
      console.log('[getComponentAssessments] Running direct SQL query...', assetIds ? `filtering by ${assetIds.length} asset(s)` : 'all assets');
      
      // Build the asset filter condition
      const assetFilter = assetIds && assetIds.length > 0
        ? sql`AND a.id IN (${sql.raw(assetIds.join(','))})`
        : sql``;
      
      // Execute the main query
      // FIXED: Use conditionRating (1-5 scale) instead of condition (mostly NULL)
      // FIXED: Use estimatedRepairCost instead of repairCost/renewCost (both NULL)
      // FIXED: Derive conditionPercentage from conditionRating when conditionPercentage is NULL
      // FIXED: Filter by assetIds when provided (for single asset reports)
      const result = await db.execute(sql`
        SELECT 
          ass.id,
          ass.assetId,
          a.name as assetName,
          COALESCE(a.address, p.address, '') as assetAddress,
          COALESCE(ass.componentCode, '') as uniformatCode,
          COALESCE(SUBSTRING(ass.componentCode, 1, 1), 'Z') as uniformatLevel1,
          CASE 
            WHEN LENGTH(ass.componentCode) >= 3 THEN SUBSTRING(ass.componentCode, 1, 3)
            ELSE NULL 
          END as uniformatLevel2,
          CASE 
            WHEN LENGTH(ass.componentCode) >= 5 THEN SUBSTRING(ass.componentCode, 1, 5)
            ELSE NULL 
          END as uniformatLevel3,
          COALESCE(ass.uniformatGroup, '') as uniformatGroup,
          COALESCE(ass.componentName, 'Unknown Component') as componentName,
          ass.componentLocation,
          COALESCE(
            ass.condition,
            CASE ass.conditionRating
              WHEN '1' THEN 'good'
              WHEN '2' THEN 'good'
              WHEN '3' THEN 'fair'
              WHEN '4' THEN 'poor'
              WHEN '5' THEN 'poor'
              ELSE 'not_assessed'
            END
          ) as conditionLabel,
          ass.conditionRating as conditionRatingRaw,
          CAST(
            COALESCE(
              ass.conditionPercentage,
              CASE ass.conditionRating
                WHEN '1' THEN 95
                WHEN '2' THEN 80
                WHEN '3' THEN 60
                WHEN '4' THEN 35
                WHEN '5' THEN 15
                ELSE NULL
              END
            ) AS DECIMAL(5,2)
          ) as conditionPercentage,
          ass.estimatedServiceLife,
          ass.remainingUsefulLife,
          ass.reviewYear,
          ass.lastTimeAction,
          CAST(COALESCE(ass.repairCost, ass.estimatedRepairCost) AS DECIMAL(15,2)) as repairCost,
          CAST(ass.renewCost AS DECIMAL(15,2)) as replacementCost,
          CAST(
            COALESCE(ass.repairCost, ass.estimatedRepairCost, 0) + COALESCE(ass.renewCost, 0)
          AS DECIMAL(15,2)) as totalCost,
          COALESCE(ass.recommendedAction, 'monitor') as actionType,
          ass.actionYear,
          ass.actionDescription,
          COALESCE(
            CASE ass.priorityLevel
              WHEN '1' THEN 'immediate'
              WHEN '2' THEN 'short_term'
              WHEN '3' THEN 'medium_term'
              WHEN '4' THEN 'long_term'
              WHEN '5' THEN 'long_term'
              ELSE 'medium_term'
            END,
            'medium_term'
          ) as priority,
          COALESCE(ass.assessmentDate, ass.createdAt) as assessmentDate,
          u.name as assessorName,
          ass.observations,
          ass.recommendations
        FROM assessments ass
        INNER JOIN assets a ON ass.assetId = a.id
        INNER JOIN projects p ON a.projectId = p.id
        LEFT JOIN users u ON ass.assessorId = u.id
        WHERE p.deletedAt IS NULL
          AND ass.deletedAt IS NULL
          AND (ass.hidden = 0 OR ass.hidden IS NULL)
          ${assetFilter}
        ORDER BY ass.componentCode ASC, a.name ASC
      `);
      
      // Extract rows from drizzle result
      let rows: any[];
      if (Array.isArray(result) && Array.isArray(result[0])) {
        rows = result[0];
      } else {
        rows = result as any[];
      }
      
      console.log('[getComponentAssessments] Query returned', rows.length, 'rows');
      
      if (rows.length === 0) {
        return [];
      }
      
      // Transform rows to expected format
      // FIXED: Use conditionLabel (derived from conditionRating) for condition field
      // FIXED: Use derived conditionPercentage from conditionRating when null
      const components = rows.map((row: any) => ({
        id: row.id,
        assetId: row.assetId,
        assetName: row.assetName || 'Unknown Asset',
        assetAddress: row.assetAddress || '',
        uniformatCode: row.uniformatCode || '',
        uniformatLevel1: row.uniformatLevel1 || 'Z',
        uniformatLevel2: row.uniformatLevel2 || null,
        uniformatLevel3: row.uniformatLevel3 || null,
        uniformatGroup: row.uniformatGroup || '',
        componentName: row.componentName || 'Unknown Component',
        componentLocation: row.componentLocation || null,
        condition: row.conditionLabel || 'not_assessed',
        conditionRating: row.conditionRatingRaw || null,
        conditionPercentage: row.conditionPercentage ? Number(row.conditionPercentage) : null,
        estimatedServiceLife: row.estimatedServiceLife || null,
        remainingUsefulLife: row.remainingUsefulLife || null,
        reviewYear: row.reviewYear || null,
        lastTimeAction: row.lastTimeAction || null,
        repairCost: row.repairCost ? Number(row.repairCost) : null,
        replacementCost: row.replacementCost ? Number(row.replacementCost) : null,
        totalCost: row.totalCost ? Number(row.totalCost) : 0,
        actionType: row.actionType || 'monitor',
        actionYear: row.actionYear || null,
        actionDescription: row.actionDescription || null,
        priority: row.priority || 'medium_term',
        assessmentDate: row.assessmentDate || null,
        assessorName: row.assessorName || null,
        observations: row.observations || null,
        recommendations: row.recommendations || null,
        photos: [],
      }));
      
      console.log('[getComponentAssessments] Returning', components.length, 'components');
      return components;
    }),

  /**
   * Test endpoint to directly query component assessments
   * This bypasses the complex function to debug the issue
   */
  testComponentQuery: protectedProcedure.query(async ({ ctx }) => {
    const { getDb } = await import('../db');
    const { sql } = await import('drizzle-orm');
    const db = await getDb();
    if (!db) return { error: 'No database connection' };
    
    console.log('[testComponentQuery] Running direct SQL query...');
    const result = await db.execute(sql`
      SELECT 
        ass.id,
        ass.assetId,
        a.name as assetName,
        COALESCE(ass.componentCode, '') as uniformatCode,
        COALESCE(ass.componentName, 'Unknown Component') as componentName,
        ass.observations,
        ass.recommendations,
        CAST(ass.repairCost AS DECIMAL(15,2)) as repairCost,
        CAST(ass.renewCost AS DECIMAL(15,2)) as replacementCost
      FROM assessments ass
      INNER JOIN assets a ON ass.assetId = a.id
      INNER JOIN projects p ON a.projectId = p.id
      WHERE p.deletedAt IS NULL
        AND ass.deletedAt IS NULL
        AND (ass.hidden = 0 OR ass.hidden IS NULL)
      ORDER BY ass.componentCode ASC
      LIMIT 10
    `);
    
    console.log('[testComponentQuery] Raw result type:', typeof result, Array.isArray(result));
    
    // Extract rows
    let rows: any[];
    if (Array.isArray(result) && Array.isArray(result[0])) {
      rows = result[0];
    } else {
      rows = result as any[];
    }
    
    console.log('[testComponentQuery] Extracted rows count:', rows.length);
    return { count: rows.length, rows: rows.slice(0, 3) };
  }),
});
