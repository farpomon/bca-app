import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  getConditionDistribution,
  getAssessmentTrends,
  getDeficiencyPriorityBreakdown,
  getCostAnalysis,
  getComponentAnalysis,
  getProjectAnalytics,
  getCompanyAnalytics,
  getComponentsByCondition,
} from "./analyticsDb";

const analyticsFiltersSchema = z.object({
  projectId: z.number().optional(),
  companyId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const trendFiltersSchema = z.object({
  projectId: z.number().optional(),
  companyId: z.number().optional(),
  months: z.number().min(1).max(36).optional(),
});

export const analyticsRouter = router({
  /**
   * Get condition distribution across assessments
   */
  getConditionDistribution: protectedProcedure
    .input(analyticsFiltersSchema)
    .query(async ({ input }) => {
      return await getConditionDistribution(input);
    }),

  /**
   * Get assessment trends over time
   */
  getAssessmentTrends: protectedProcedure
    .input(trendFiltersSchema)
    .query(async ({ input }) => {
      return await getAssessmentTrends(input);
    }),

  /**
   * Get deficiency priority breakdown
   */
  getDeficiencyPriorityBreakdown: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        companyId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getDeficiencyPriorityBreakdown(input);
    }),

  /**
   * Get cost analysis summary
   */
  getCostAnalysis: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        companyId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getCostAnalysis(input);
    }),

  /**
   * Get component-level analytics (UNIFORMAT II breakdown)
   */
  getComponentAnalysis: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        companyId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getComponentAnalysis(input);
    }),

  /**
   * Get project-level analytics
   */
  getProjectAnalytics: protectedProcedure
    .input(
      z.object({
        companyId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getProjectAnalytics(input);
    }),

  /**
   * Get company-level analytics
   */
  getCompanyAnalytics: protectedProcedure.query(async () => {
    return await getCompanyAnalytics();
  }),

  /**
   * Get components filtered by condition for interactive chart
   */
  getComponentsByCondition: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        condition: z.enum(['good', 'fair', 'poor', 'not_assessed']).optional(),
      })
    )
    .query(async ({ input }) => {
      return await getComponentsByCondition(input);
    }),

  /**
   * Get dashboard overview (combines multiple metrics)
   */
  getDashboardOverview: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        companyId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const [
        conditionDist,
        costAnalysis,
        deficiencyBreakdown,
        trends,
      ] = await Promise.all([
        getConditionDistribution(input),
        getCostAnalysis(input),
        getDeficiencyPriorityBreakdown(input),
        getAssessmentTrends({ ...input, months: 6 }),
      ]);

      return {
        conditionDistribution: conditionDist,
        costAnalysis,
        deficiencyBreakdown,
        recentTrends: trends,
      };
    }),
});
