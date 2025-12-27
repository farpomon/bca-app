import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import {
  getAllEconomicIndicators,
  getLatestEconomicIndicator,
  getEconomicIndicatorById,
  createEconomicIndicator,
  updateEconomicIndicator,
  deleteEconomicIndicator,
  getEconomicIndicatorsForPeriod,
  getEconomicIndicatorRegions,
} from "./economicIndicatorsDb";

export const economicIndicatorsRouter = router({
  /**
   * Get all economic indicators with optional filtering
   */
  list: protectedProcedure
    .input(
      z.object({
        region: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await getAllEconomicIndicators(input);
    }),

  /**
   * Get the latest economic indicator for a region
   */
  getLatest: protectedProcedure
    .input(
      z.object({
        region: z.string().default('Canada'),
      }).optional()
    )
    .query(async ({ input }) => {
      return await getLatestEconomicIndicator(input?.region);
    }),

  /**
   * Get economic indicator by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getEconomicIndicatorById(input.id);
    }),

  /**
   * Get economic indicators for a specific period
   */
  getForPeriod: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        region: z.string().default('Canada'),
      })
    )
    .query(async ({ input }) => {
      return await getEconomicIndicatorsForPeriod(
        input.startDate,
        input.endDate,
        input.region
      );
    }),

  /**
   * Get all unique regions
   */
  getRegions: protectedProcedure.query(async () => {
    return await getEconomicIndicatorRegions();
  }),

  /**
   * Create a new economic indicator (admin only)
   */
  create: adminProcedure
    .input(
      z.object({
        indicatorDate: z.string(),
        region: z.string().default('Canada'),
        cpiInflationRate: z.string().optional(),
        constructionInflationRate: z.string().optional(),
        materialInflationRate: z.string().optional(),
        laborInflationRate: z.string().optional(),
        primeRate: z.string().optional(),
        bondYield10Year: z.string().optional(),
        recommendedDiscountRate: z.string().optional(),
        riskFreeRate: z.string().optional(),
        gdpGrowthRate: z.string().optional(),
        unemploymentRate: z.string().optional(),
        exchangeRateUSD: z.string().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createEconomicIndicator(input);
      return { id, success: true };
    }),

  /**
   * Update an existing economic indicator (admin only)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        indicatorDate: z.string().optional(),
        region: z.string().optional(),
        cpiInflationRate: z.string().optional(),
        constructionInflationRate: z.string().optional(),
        materialInflationRate: z.string().optional(),
        laborInflationRate: z.string().optional(),
        primeRate: z.string().optional(),
        bondYield10Year: z.string().optional(),
        recommendedDiscountRate: z.string().optional(),
        riskFreeRate: z.string().optional(),
        gdpGrowthRate: z.string().optional(),
        unemploymentRate: z.string().optional(),
        exchangeRateUSD: z.string().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateEconomicIndicator(id, data);
      return { success: true };
    }),

  /**
   * Delete an economic indicator (admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteEconomicIndicator(input.id);
      return { success: true };
    }),
});
