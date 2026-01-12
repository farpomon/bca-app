/**
 * Portfolio Report Router
 * 
 * Provides endpoints for generating portfolio-level reports with
 * industry-standard financial metrics across all assets in a project.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { generatePortfolioReportData, getProjectAssetsWithMetrics } from "../db-portfolioReport";
import { 
  aggregatePortfolioMetrics, 
  generateCapitalRenewalForecast,
  formatCurrency,
  formatPercentage
} from "../portfolioReportCalculations";
import { getProjectById } from "../db";
import { 
  getComponentAssessmentsForReport, 
  getProjectFacilities,
  getProjectSystemCategories,
  estimateComponentReportPages
} from "../db-componentReport";

export const portfolioReportRouter = router({
  /**
   * Generate a complete portfolio report for a project
   * Includes all assets, financial metrics, and forecasts
   */
  generate: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      options: z.object({
        includeAssetDetails: z.boolean().default(true),
        includeCategoryBreakdown: z.boolean().default(true),
        includePriorityMatrix: z.boolean().default(true),
        includeCapitalForecast: z.boolean().default(true),
        forecastYears: z.number().min(1).max(10).default(5)
      }).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { projectId, options = {} } = input;
      const isAdmin = ctx.user.role === 'admin';
      
      // Verify project access
      const project = await getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or access denied'
        });
      }
      
      // Generate the report data
      const reportData = await generatePortfolioReportData(projectId);
      
      if (!reportData) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate portfolio report'
        });
      }
      
      // Apply default options
      const opts = {
        includeAssetDetails: true,
        includeCategoryBreakdown: true,
        includePriorityMatrix: true,
        includeCapitalForecast: true,
        forecastYears: 5,
        ...options
      };
      
      // Filter based on options
      const result = {
        ...reportData,
        assetMetrics: opts.includeAssetDetails ? reportData.assetMetrics : [],
        categoryBreakdown: opts.includeCategoryBreakdown ? reportData.categoryBreakdown : [],
        priorityMatrix: opts.includePriorityMatrix ? reportData.priorityMatrix : [],
        capitalForecast: opts.includeCapitalForecast ? reportData.capitalForecast : []
      };
      
      return result;
    }),

  /**
   * Get portfolio summary metrics only (lightweight)
   */
  getSummary: protectedProcedure
    .input(z.object({
      projectId: z.number()
    }))
    .query(async ({ ctx, input }) => {
      const { projectId } = input;
      const isAdmin = ctx.user.role === 'admin';
      
      // Verify project access
      const project = await getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or access denied'
        });
      }
      
      const assetMetrics = await getProjectAssetsWithMetrics(projectId);
      const summary = aggregatePortfolioMetrics(assetMetrics);
      
      return {
        projectId,
        projectName: project.name,
        summary,
        generatedAt: new Date().toISOString()
      };
    }),

  /**
   * Get asset comparison data for the portfolio
   */
  getAssetComparison: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sortBy: z.enum(['fci', 'priorityScore', 'deferredMaintenanceCost', 'conditionScore', 'name']).default('priorityScore'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      limit: z.number().min(1).max(100).default(50)
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, sortBy, sortOrder, limit } = input;
      const isAdmin = ctx.user.role === 'admin';
      
      // Verify project access
      const project = await getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or access denied'
        });
      }
      
      const assetMetrics = await getProjectAssetsWithMetrics(projectId);
      
      // Sort assets
      const sorted = [...assetMetrics].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'fci':
            comparison = a.fci - b.fci;
            break;
          case 'priorityScore':
            comparison = a.priorityScore - b.priorityScore;
            break;
          case 'deferredMaintenanceCost':
            comparison = a.deferredMaintenanceCost - b.deferredMaintenanceCost;
            break;
          case 'conditionScore':
            comparison = a.conditionScore - b.conditionScore;
            break;
          case 'name':
            comparison = a.assetName.localeCompare(b.assetName);
            break;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });
      
      return {
        assets: sorted.slice(0, limit),
        total: assetMetrics.length
      };
    }),

  /**
   * Get capital renewal forecast
   */
  getCapitalForecast: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      years: z.number().min(1).max(10).default(5)
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, years } = input;
      const isAdmin = ctx.user.role === 'admin';
      
      // Verify project access
      const project = await getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or access denied'
        });
      }
      
      const assetMetrics = await getProjectAssetsWithMetrics(projectId);
      
      // Calculate total needs
      const totalImmediateNeeds = assetMetrics.reduce((sum, a) => sum + a.immediateNeeds, 0);
      const totalShortTermNeeds = assetMetrics.reduce((sum, a) => sum + a.shortTermNeeds, 0);
      const totalMediumTermNeeds = assetMetrics.reduce((sum, a) => sum + a.mediumTermNeeds, 0);
      const totalLongTermNeeds = assetMetrics.reduce((sum, a) => sum + a.longTermNeeds, 0);
      
      const forecast = generateCapitalRenewalForecast(
        totalImmediateNeeds,
        totalShortTermNeeds,
        totalMediumTermNeeds,
        totalLongTermNeeds
      );
      
      // Extend or trim to requested years
      const result = forecast.slice(0, years);
      
      return {
        forecast: result,
        totalNeeds: {
          immediate: totalImmediateNeeds,
          shortTerm: totalShortTermNeeds,
          mediumTerm: totalMediumTermNeeds,
          longTerm: totalLongTermNeeds,
          total: totalImmediateNeeds + totalShortTermNeeds + totalMediumTermNeeds + totalLongTermNeeds
        }
      };
    }),

  /**
   * Get formatted metrics for display
   */
  getFormattedMetrics: protectedProcedure
    .input(z.object({
      projectId: z.number()
    }))
    .query(async ({ ctx, input }) => {
      const { projectId } = input;
      const isAdmin = ctx.user.role === 'admin';
      
      // Verify project access
      const project = await getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or access denied'
        });
      }
      
      const assetMetrics = await getProjectAssetsWithMetrics(projectId);
      const summary = aggregatePortfolioMetrics(assetMetrics);
      
      return {
        totalAssets: summary.totalAssets,
        totalCRV: formatCurrency(summary.totalCurrentReplacementValue),
        totalDeferredMaintenance: formatCurrency(summary.totalDeferredMaintenanceCost),
        portfolioFCI: formatPercentage(summary.portfolioFCI, 2),
        portfolioFCIRating: summary.portfolioFCIRating,
        averageConditionScore: summary.averageConditionScore,
        averageConditionRating: summary.averageConditionRating,
        totalDeficiencies: summary.totalDeficiencies,
        totalAssessments: summary.totalAssessments,
        fundingGap: formatCurrency(summary.fundingGap),
        averageAssetAge: `${summary.averageAssetAge} years`,
        // Additional formatted values for display
        fciGaugeValue: Math.min(summary.portfolioFCI, 100),
        fciColor: summary.portfolioFCI <= 5 ? 'green' 
          : summary.portfolioFCI <= 10 ? 'yellow' 
          : summary.portfolioFCI <= 30 ? 'orange' 
        : 'red'
      }
    }),

  /**
   * Get component assessment data for report generation
   */
  getComponentAssessments: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      scope: z.enum(['all', 'selected']).default('all'),
      selectedAssetIds: z.array(z.number()).optional(),
      filters: z.object({
        facilities: z.array(z.number()).optional(),
        categories: z.array(z.string()).optional(),
        conditions: z.array(z.enum(['good', 'fair', 'poor', 'critical', 'not_assessed'])).optional(),
        riskLevels: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
        onlyWithDeficiencies: z.boolean().optional(),
      }).optional(),
      sortBy: z.enum(['risk', 'condition', 'cost', 'name']).default('risk'),
      maxAssets: z.number().min(1).max(100).default(25),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, scope, selectedAssetIds, filters, sortBy, maxAssets } = input;
      const isAdmin = ctx.user.role === 'admin';
      
      // Verify project access
      const project = await getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or access denied'
        });
      }
      
      const componentData = await getComponentAssessmentsForReport(projectId, {
        scope,
        selectedAssetIds,
        filters,
        sortBy,
        maxAssets,
      });
      
      return {
        projectId,
        projectName: project.name,
        componentAssessments: componentData,
        totalAssets: componentData.length,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * Get filter options for component assessment report
   */
  getComponentFilterOptions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId } = input;
      const isAdmin = ctx.user.role === 'admin';
      
      // Verify project access
      const project = await getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or access denied'
        });
      }
      
      const facilities = await getProjectFacilities(projectId);
      const categories = await getProjectSystemCategories(projectId);
      
      return {
        facilities,
        categories,
        conditionOptions: ['good', 'fair', 'poor', 'critical', 'not_assessed'],
        riskOptions: ['low', 'medium', 'high', 'critical'],
      };
    }),

  /**
   * Estimate page count for component assessment report
   */
  estimateComponentReportSize: protectedProcedure
    .input(z.object({
      assetCount: z.number(),
      detailLevel: z.enum(['minimal', 'standard', 'full']).default('standard'),
    }))
    .query(async ({ input }) => {
      const { assetCount, detailLevel } = input;
      const estimatedPages = estimateComponentReportPages(assetCount, detailLevel);
      
      return {
        estimatedPages,
        warning: estimatedPages > 50 ? 'This report may be very large. Consider applying filters or reducing the maximum asset count.' : null,
      };
    }),
});
