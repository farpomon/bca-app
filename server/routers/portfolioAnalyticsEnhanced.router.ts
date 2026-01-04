/**
 * Enhanced Portfolio Analytics Router
 * 
 * Provides advanced financial analysis, predictive modeling, and risk assessment endpoints
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { sql } from "drizzle-orm";
import {
  capturePortfolioMetricsSnapshot,
  getPortfolioMetricsTrend,
  createInvestmentAnalysis,
  generateFinancialForecast,
  getBenchmarkComparison,
  calculateTCO,
  updatePortfolioTargetsProgress,
  calculateNPV,
  calculateROI,
  calculatePaybackPeriod,
  calculateIRR,
} from "../db-advancedAnalytics";
import { getDb } from "../db";
import { 
  portfolioTargets, 
  investmentAnalysis, 
  financialForecasts,
  economicIndicators,
  benchmarkData 
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export const portfolioAnalyticsEnhancedRouter = router({
  /**
   * Capture current portfolio metrics snapshot
   */
  captureSnapshot: protectedProcedure.mutation(async ({ ctx }) => {
    const companyId = ctx.user.company ? parseInt(ctx.user.company) : undefined;
    return await capturePortfolioMetricsSnapshot(companyId);
  }),

  /**
   * Get portfolio metrics trend over time
   */
  getMetricsTrend: protectedProcedure
    .input(z.object({
      months: z.number().min(1).max(36).default(12),
    }).optional())
    .query(async ({ ctx, input }) => {
      const companyId = ctx.user.company ? parseInt(ctx.user.company) : undefined;
      const months = input?.months || 12;
      return await getPortfolioMetricsTrend(companyId, months);
    }),

  /**
   * Create investment analysis for a project
   */
  createInvestmentAnalysis: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      assetId: z.number().optional(),
      analysisType: z.enum(['roi', 'npv', 'payback', 'tco', 'lcca', 'benefit_cost']),
      initialInvestment: z.number().positive(),
      annualOperatingCost: z.number().optional(),
      annualMaintenanceCost: z.number().optional(),
      annualEnergySavings: z.number().optional(),
      annualCostAvoidance: z.number().optional(),
      discountRate: z.number().min(0).max(20),
      analysisHorizonYears: z.number().min(1).max(50),
      inflationRate: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await createInvestmentAnalysis(input);
    }),

  /**
   * Get investment analyses for a project
   */
  getProjectInvestmentAnalyses: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      return await db
        .select()
        .from(investmentAnalysis)
        .where(eq(investmentAnalysis.projectId, input.projectId))
        .orderBy(desc(investmentAnalysis.analysisDate));
    }),

  /**
   * Generate financial forecast
   */
  generateForecast: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      assetId: z.number().optional(),
      forecastYears: z.number().min(1).max(10).default(5),
      scenarioType: z.enum(['best_case', 'most_likely', 'worst_case']).default('most_likely'),
    }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.user.company ? parseInt(ctx.user.company) : undefined;
      return await generateFinancialForecast(
        input.projectId,
        input.assetId,
        companyId,
        input.forecastYears,
        input.scenarioType
      );
    }),

  /**
   * Get financial forecasts
   */
  getForecasts: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      assetId: z.number().optional(),
      scenarioType: z.enum(['best_case', 'most_likely', 'worst_case']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const companyId = ctx.user.company ? parseInt(ctx.user.company) : undefined;

      const conditions: any[] = [];
      
      if (companyId !== undefined) {
        conditions.push(eq(financialForecasts.companyId, companyId));
      }

      if (input?.projectId) {
        conditions.push(eq(financialForecasts.projectId, input.projectId));
      }

      if (input?.assetId) {
        conditions.push(eq(financialForecasts.assetId, input.assetId));
      }

      if (input?.scenarioType) {
        conditions.push(eq(financialForecasts.scenarioType, input.scenarioType));
      }

      if (conditions.length > 0) {
        return await db
          .select()
          .from(financialForecasts)
          .where(and(...conditions))
          .orderBy(desc(financialForecasts.forecastYear));
      } else {
        return await db
          .select()
          .from(financialForecasts)
          .orderBy(desc(financialForecasts.forecastYear));
      }
    }),

  /**
   * Calculate Total Cost of Ownership for an asset
   */
  calculateTCO: protectedProcedure
    .input(z.object({
      assetId: z.number(),
      analysisHorizonYears: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      return await calculateTCO(input.assetId, input.analysisHorizonYears);
    }),

  /**
   * Get benchmark comparison
   */
  getBenchmarkComparison: protectedProcedure
    .input(z.object({
      portfolioFci: z.number(),
      portfolioCi: z.number(),
      assetType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await getBenchmarkComparison(
        input.portfolioFci,
        input.portfolioCi,
        input.assetType
      );
    }),

  /**
   * Get all benchmarks
   */
  getBenchmarks: protectedProcedure
    .input(z.object({
      benchmarkType: z.enum(['industry', 'sector', 'region', 'asset_type', 'custom']).optional(),
      category: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const conditions = [eq(benchmarkData.isActive, 1)];

      if (input?.benchmarkType) {
        conditions.push(eq(benchmarkData.benchmarkType, input.benchmarkType));
      }

      if (input?.category) {
        conditions.push(eq(benchmarkData.category, input.category));
      }

      return await db
        .select()
        .from(benchmarkData)
        .where(and(...conditions));
    }),

  /**
   * Get portfolio targets
   */
  getPortfolioTargets: protectedProcedure
    .input(z.object({
      targetYear: z.number().optional(),
      targetType: z.enum(['fci', 'ci', 'budget', 'deficiency_reduction', 'condition_improvement', 'custom']).optional(),
      status: z.enum(['on_track', 'at_risk', 'off_track', 'achieved']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const companyId = ctx.user.company ? parseInt(ctx.user.company) : undefined;

      const conditions: any[] = [];
      
      if (companyId !== undefined) {
        conditions.push(eq(portfolioTargets.companyId, companyId));
      }

      if (input?.targetYear) {
        conditions.push(eq(portfolioTargets.targetYear, input.targetYear));
      }

      if (input?.targetType) {
        conditions.push(eq(portfolioTargets.targetType, input.targetType));
      }

      if (input?.status) {
        conditions.push(eq(portfolioTargets.status, input.status));
      }

      if (conditions.length > 0) {
        return await db
          .select()
          .from(portfolioTargets)
          .where(and(...conditions))
          .orderBy(desc(portfolioTargets.targetYear));
      } else {
        return await db
          .select()
          .from(portfolioTargets)
          .orderBy(desc(portfolioTargets.targetYear));
      }
    }),

  /**
   * Create portfolio target
   */
  createPortfolioTarget: protectedProcedure
    .input(z.object({
      targetYear: z.number(),
      targetType: z.enum(['fci', 'ci', 'budget', 'deficiency_reduction', 'condition_improvement', 'custom']),
      metricName: z.string(),
      targetValue: z.number(),
      baselineValue: z.number().optional(),
      baselineYear: z.number().optional(),
      description: z.string().optional(),
      strategicAlignment: z.string().optional(),
      accountableParty: z.string().optional(),
      reviewFrequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).default('quarterly'),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const companyId = ctx.user.company ? parseInt(ctx.user.company) : null;

      await db.insert(portfolioTargets).values({
        companyId,
        targetYear: input.targetYear,
        targetType: input.targetType,
        metricName: input.metricName,
        targetValue: input.targetValue.toString(),
        baselineValue: input.baselineValue?.toString() || null,
        baselineYear: input.baselineYear || null,
        description: input.description || null,
        strategicAlignment: input.strategicAlignment || null,
        accountableParty: input.accountableParty || null,
        reviewFrequency: input.reviewFrequency,
      });

      return { success: true };
    }),

  /**
   * Update portfolio targets progress
   */
  updateTargetsProgress: protectedProcedure.mutation(async ({ ctx }) => {
    const companyId = ctx.user.company ? parseInt(ctx.user.company) : undefined;
    return await updatePortfolioTargetsProgress(companyId);
  }),

  /**
   * Get economic indicators
   */
  getEconomicIndicators: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      region: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const conditions: any[] = [];

      if (input?.startDate) {
        conditions.push(sql`${economicIndicators.indicatorDate} >= ${input.startDate}`);
      }

      if (input?.endDate) {
        conditions.push(sql`${economicIndicators.indicatorDate} <= ${input.endDate}`);
      }

      if (input?.region) {
        conditions.push(eq(economicIndicators.region, input.region));
      }

      if (conditions.length > 0) {
        return await db
          .select()
          .from(economicIndicators)
          .where(and(...conditions))
          .orderBy(desc(economicIndicators.indicatorDate));
      } else {
        return await db
          .select()
          .from(economicIndicators)
          .orderBy(desc(economicIndicators.indicatorDate));
      }
    }),

  /**
   * Calculate financial metrics (utility endpoint)
   */
  calculateFinancialMetrics: protectedProcedure
    .input(z.object({
      metricType: z.enum(['npv', 'roi', 'payback', 'irr']),
      initialInvestment: z.number(),
      annualCashFlows: z.array(z.number()).optional(),
      annualCashFlow: z.number().optional(),
      totalBenefit: z.number().optional(),
      totalCost: z.number().optional(),
      discountRate: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { metricType, initialInvestment, annualCashFlows, annualCashFlow, totalBenefit, totalCost, discountRate } = input;

      switch (metricType) {
        case 'npv':
          if (!annualCashFlows || !discountRate) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'NPV requires annualCashFlows and discountRate' });
          }
          return { value: calculateNPV(initialInvestment, annualCashFlows, discountRate), metric: 'NPV' };

        case 'roi':
          if (totalBenefit === undefined || totalCost === undefined) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'ROI requires totalBenefit and totalCost' });
          }
          return { value: calculateROI(totalBenefit, totalCost), metric: 'ROI (%)' };

        case 'payback':
          if (!annualCashFlow) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payback period requires annualCashFlow' });
          }
          return { value: calculatePaybackPeriod(initialInvestment, annualCashFlow), metric: 'Payback Period (years)' };

        case 'irr':
          if (!annualCashFlows) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'IRR requires annualCashFlows' });
          }
          return { value: calculateIRR(initialInvestment, annualCashFlows), metric: 'IRR (%)' };

        default:
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid metric type' });
      }
    }),

  /**
   * Get comprehensive analytics dashboard data
   */
  getAdvancedDashboardData: protectedProcedure.query(async ({ ctx }) => {
    // Use companyId from user table, not the company string field
    const companyId = ctx.user.companyId ?? undefined;

    const [
      metricsTrend,
      targets,
      latestForecasts,
      latestIndicators,
    ] = await Promise.all([
      getPortfolioMetricsTrend(companyId, 12),
      (async () => {
        const db = await getDb();
        if (!db) return [];
        return await db
          .select()
          .from(portfolioTargets)
          .where(companyId !== undefined ? eq(portfolioTargets.companyId, companyId) : sql`1=1`)
          .orderBy(desc(portfolioTargets.targetYear))
          .limit(10);
      })(),
      (async () => {
        const db = await getDb();
        if (!db) return [];
        const forecastConditions: any[] = [eq(financialForecasts.scenarioType, 'most_likely')];
        if (companyId !== undefined) {
          forecastConditions.push(eq(financialForecasts.companyId, companyId));
        }
        return await db
          .select()
          .from(financialForecasts)
          .where(and(...forecastConditions))
          .orderBy(desc(financialForecasts.forecastYear))
          .limit(5);
      })(),
      (async () => {
        const db = await getDb();
        if (!db) return [];
        return await db
          .select()
          .from(economicIndicators)
          .orderBy(desc(economicIndicators.indicatorDate))
          .limit(1);
      })(),
    ]);

    return {
      metricsTrend,
      targets,
      forecasts: latestForecasts,
      economicIndicators: latestIndicators[0] || null,
      generatedAt: new Date().toISOString(),
    };
  }),
});
