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
import {
  fetchEconomicIndicatorsWithAI,
  fetchConstructionInflationData,
  getRecommendedDiscountRate,
  getRegionalComparison,
} from "./economicDataAI";

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

  // ============================================
  // AI-Powered Economic Data Fetching
  // ============================================

  /**
   * Fetch current economic indicators using AI with source citations
   */
  fetchWithAI: adminProcedure
    .input(
      z.object({
        region: z.string().default('Canada'),
      })
    )
    .mutation(async ({ input }) => {
      const data = await fetchEconomicIndicatorsWithAI(input.region);
      return data;
    }),

  /**
   * Fetch construction-specific inflation data using AI
   */
  fetchConstructionInflation: adminProcedure
    .input(
      z.object({
        region: z.string().default('Canada'),
      })
    )
    .mutation(async ({ input }) => {
      const data = await fetchConstructionInflationData(input.region);
      return data;
    }),

  /**
   * Get AI-recommended discount rate for NPV calculations
   */
  getAIDiscountRate: adminProcedure
    .input(
      z.object({
        region: z.string().default('Canada'),
        projectType: z.string().default('commercial building'),
      })
    )
    .mutation(async ({ input }) => {
      const data = await getRecommendedDiscountRate(input.region, input.projectType);
      return data;
    }),

  /**
   * Get regional economic comparison
   */
  getRegionalComparison: protectedProcedure
    .input(
      z.object({
        regions: z.array(z.string()).default(['Canada', 'Ontario', 'British Columbia', 'Alberta']),
      })
    )
    .query(async ({ input }) => {
      const data = await getRegionalComparison(input.regions);
      return data;
    }),

  /**
   * Fetch AI data and save to database
   */
  fetchAndSave: adminProcedure
    .input(
      z.object({
        region: z.string().default('Canada'),
      })
    )
    .mutation(async ({ input }) => {
      // Fetch data from AI
      const aiData = await fetchEconomicIndicatorsWithAI(input.region);
      
      // Prepare data for database insertion
      const indicatorData = {
        indicatorDate: aiData.indicatorDate,
        region: aiData.region,
        cpiInflationRate: aiData.cpiInflationRate?.value,
        constructionInflationRate: aiData.constructionInflationRate?.value,
        materialInflationRate: aiData.materialInflationRate?.value,
        laborInflationRate: aiData.laborInflationRate?.value,
        primeRate: aiData.primeRate?.value,
        bondYield10Year: aiData.bondYield10Year?.value,
        recommendedDiscountRate: aiData.recommendedDiscountRate?.value,
        riskFreeRate: aiData.riskFreeRate?.value,
        gdpGrowthRate: aiData.gdpGrowthRate?.value,
        unemploymentRate: aiData.unemploymentRate?.value,
        exchangeRateUSD: aiData.exchangeRateUSD?.value,
        metadata: {
          fetchedAt: aiData.fetchedAt,
          sources: aiData.dataSources,
          summary: aiData.summary,
          sourceDetails: {
            cpiInflationRate: aiData.cpiInflationRate?.source,
            constructionInflationRate: aiData.constructionInflationRate?.source,
            materialInflationRate: aiData.materialInflationRate?.source,
            laborInflationRate: aiData.laborInflationRate?.source,
            primeRate: aiData.primeRate?.source,
            bondYield10Year: aiData.bondYield10Year?.source,
            recommendedDiscountRate: aiData.recommendedDiscountRate?.source,
            riskFreeRate: aiData.riskFreeRate?.source,
            gdpGrowthRate: aiData.gdpGrowthRate?.source,
            unemploymentRate: aiData.unemploymentRate?.source,
            exchangeRateUSD: aiData.exchangeRateUSD?.source,
          },
        },
      };

      // Save to database
      const id = await createEconomicIndicator(indicatorData);
      
      return {
        id,
        success: true,
        data: aiData,
      };
    }),
});
