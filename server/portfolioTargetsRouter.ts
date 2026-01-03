import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import {
  getAllPortfolioTargets,
  getActivePortfolioTargets,
  getPortfolioTargetById,
  createPortfolioTarget,
  updatePortfolioTarget,
  deletePortfolioTarget,
  getPortfolioTargetsForYearRange,
  updatePortfolioTargetProgress,
  getFCITargets,
} from "./portfolioTargetsDb";

export const portfolioTargetsRouter = router({
  /**
   * Get all portfolio targets with optional filtering
   */
  list: protectedProcedure
    .input(
      z.object({
        companyId: z.number().optional(),
        targetYear: z.number().optional(),
        targetType: z.string().optional(),
        status: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await getAllPortfolioTargets(input);
    }),

  /**
   * Get active portfolio targets
   */
  getActive: protectedProcedure
    .input(
      z.object({
        companyId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await getActivePortfolioTargets(input?.companyId);
    }),

  /**
   * Get portfolio target by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getPortfolioTargetById(input.id);
    }),

  /**
   * Get portfolio targets for a year range
   */
  getForYearRange: protectedProcedure
    .input(
      z.object({
        startYear: z.number(),
        endYear: z.number(),
        companyId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getPortfolioTargetsForYearRange(
        input.startYear,
        input.endYear,
        input.companyId
      );
    }),

  /**
   * Get FCI targets specifically
   */
  getFCITargets: protectedProcedure
    .input(
      z.object({
        companyId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await getFCITargets(input?.companyId);
    }),

  /**
   * Create a new portfolio target (admin only)
   */
  create: adminProcedure
    .input(
      z.object({
        companyId: z.number().optional(),
        targetYear: z.number(),
        targetType: z.enum(['fci', 'ci', 'budget', 'deficiency_reduction', 'condition_improvement', 'custom']),
        metricName: z.string(),
        targetValue: z.string(),
        currentValue: z.string().optional(),
        baselineValue: z.string().optional(),
        baselineYear: z.number().optional(),
        progressPercentage: z.string().optional(),
        status: z.enum(['on_track', 'at_risk', 'off_track', 'achieved']).default('on_track'),
        description: z.string().optional(),
        strategicAlignment: z.string().optional(),
        accountableParty: z.string().optional(),
        reviewFrequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).default('quarterly'),
        lastReviewDate: z.string().optional(),
        nextReviewDate: z.string().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createPortfolioTarget(input);
      return { id, success: true };
    }),

  /**
   * Update an existing portfolio target (admin only)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        companyId: z.number().optional(),
        targetYear: z.number().optional(),
        targetType: z.enum(['fci', 'ci', 'budget', 'deficiency_reduction', 'condition_improvement', 'custom']).optional(),
        metricName: z.string().optional(),
        targetValue: z.string().optional(),
        currentValue: z.string().optional(),
        baselineValue: z.string().optional(),
        baselineYear: z.number().optional(),
        progressPercentage: z.string().optional(),
        status: z.enum(['on_track', 'at_risk', 'off_track', 'achieved']).optional(),
        description: z.string().optional(),
        strategicAlignment: z.string().optional(),
        accountableParty: z.string().optional(),
        reviewFrequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).optional(),
        lastReviewDate: z.string().optional(),
        nextReviewDate: z.string().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updatePortfolioTarget(id, data);
      return { success: true };
    }),

  /**
   * Update progress for a portfolio target
   */
  updateProgress: adminProcedure
    .input(
      z.object({
        id: z.number(),
        currentValue: z.number(),
        progressPercentage: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await updatePortfolioTargetProgress(
        input.id,
        input.currentValue,
        input.progressPercentage
      );
      return { success: true };
    }),

  /**
   * Delete a portfolio target (admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deletePortfolioTarget(input.id);
      return { success: true };
    }),
});
