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
import {
  getComponentsForReport,
  getActionListForReport,
  getUniformatGroupSummaries,
  estimateReportPageCount,
  UNIFORMAT_GROUPS,
  PRIORITY_BUCKETS,
  ACTION_TYPES,
  CONDITION_RATINGS,
} from "../db-reportEnhanced";

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
      grouping: z.enum(['building_uniformat', 'uniformat_building', 'building_only', 'uniformat_only']).default('building_uniformat'),
      filters: z.object({
        facilities: z.array(z.number()).optional(),
        categories: z.array(z.string()).optional(),
        conditions: z.array(z.enum(['good', 'fair', 'poor', 'critical', 'not_assessed'])).optional(),
        riskLevels: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
        priorities: z.array(z.enum(['critical', 'necessary', 'recommended', 'no_action'])).optional(),
        actionTypes: z.array(z.enum(['renewal', 'repair', 'replace', 'monitor', 'immediate_action'])).optional(),
        yearRange: z.object({ min: z.number(), max: z.number() }).optional(),
        onlyWithDeficiencies: z.boolean().optional(),
      }).optional(),
      sortBy: z.enum(['risk', 'condition', 'cost', 'name']).default('risk'),
      maxAssets: z.number().min(1).max(100).default(25),
      includeRollups: z.boolean().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, scope, selectedAssetIds, grouping, filters, sortBy, maxAssets, includeRollups } = input;
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
        grouping,
        filters,
        sortBy,
        maxAssets,
        includeRollups,
      });
      
      return {
        projectId,
        projectName: project.name,
        componentAssessments: componentData,
        totalAssets: componentData.length,
        grouping,
        includeRollups,
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

  // ==========================================
  // ENHANCED REPORT GENERATION ENDPOINTS
  // ==========================================

  /**
   * Get enhanced component data with UNIFORMAT grouping for professional reports
   * Supports grouping by building → UNIFORMAT or UNIFORMAT → building
   */
  getEnhancedComponents: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      scope: z.enum(['all', 'selected']).default('all'),
      selectedAssetIds: z.array(z.number()).optional(),
      grouping: z.enum(['building_uniformat', 'uniformat_building', 'building_only', 'uniformat_only']).default('building_uniformat'),
      displayLevel: z.enum(['L2', 'L3', 'both']).default('L3'),
      includePhotos: z.boolean().default(true),
      maxPhotosPerComponent: z.number().min(1).max(6).default(4),
      conditions: z.array(z.string()).optional(),
      priorities: z.array(z.string()).optional(),
      actionTypes: z.array(z.string()).optional(),
      yearHorizon: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, ...options } = input;
      const isAdmin = ctx.user.role === 'admin';
      
      // Verify project access
      const project = await getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or access denied'
        });
      }
      
      const components = await getComponentsForReport(projectId, options);
      
      // Group components based on grouping option
      let groupedData: Record<string, Record<string, typeof components>> = {};
      
      if (options.grouping === 'building_uniformat') {
        // Group by building first, then by UNIFORMAT Level 1
        for (const comp of components) {
          if (!groupedData[comp.assetName]) {
            groupedData[comp.assetName] = {};
          }
          const uniformatGroup = comp.uniformatLevel1;
          if (!groupedData[comp.assetName][uniformatGroup]) {
            groupedData[comp.assetName][uniformatGroup] = [];
          }
          groupedData[comp.assetName][uniformatGroup].push(comp);
        }
      } else if (options.grouping === 'uniformat_building') {
        // Group by UNIFORMAT Level 1 first, then by building
        for (const comp of components) {
          const uniformatGroup = comp.uniformatLevel1;
          if (!groupedData[uniformatGroup]) {
            groupedData[uniformatGroup] = {};
          }
          if (!groupedData[uniformatGroup][comp.assetName]) {
            groupedData[uniformatGroup][comp.assetName] = [];
          }
          groupedData[uniformatGroup][comp.assetName].push(comp);
        }
      } else if (options.grouping === 'building_only') {
        // Group by building only
        for (const comp of components) {
          if (!groupedData[comp.assetName]) {
            groupedData[comp.assetName] = { 'all': [] };
          }
          groupedData[comp.assetName]['all'].push(comp);
        }
      } else {
        // Group by UNIFORMAT only
        for (const comp of components) {
          const uniformatGroup = comp.uniformatLevel1;
          if (!groupedData[uniformatGroup]) {
            groupedData[uniformatGroup] = { 'all': [] };
          }
          groupedData[uniformatGroup]['all'].push(comp);
        }
      }
      
      // Calculate summary statistics
      const totalComponents = components.length;
      const totalPhotos = components.reduce((sum, c) => sum + c.photos.length, 0);
      const totalRepairCost = components.reduce((sum, c) => sum + (c.repairCost || 0), 0);
      const totalReplacementCost = components.reduce((sum, c) => sum + (c.replacementCost || 0), 0);
      
      // Count by condition
      const conditionCounts = {
        good: components.filter(c => c.condition?.toLowerCase().includes('good')).length,
        fair: components.filter(c => c.condition?.toLowerCase().includes('fair')).length,
        poor: components.filter(c => c.condition?.toLowerCase().includes('poor')).length,
        failed: components.filter(c => c.condition?.toLowerCase().includes('fail') || c.condition?.toLowerCase().includes('critical')).length,
      };
      
      // Count by priority
      const priorityCounts = {
        critical: components.filter(c => c.priority === 'critical').length,
        necessary: components.filter(c => c.priority === 'necessary').length,
        recommended: components.filter(c => c.priority === 'recommended').length,
        no_action: components.filter(c => c.priority === 'no_action').length,
      };
      
      return {
        projectId,
        projectName: project.name,
        components,
        groupedData,
        summary: {
          totalComponents,
          totalPhotos,
          totalRepairCost,
          totalReplacementCost,
          totalCost: totalRepairCost + totalReplacementCost,
          conditionCounts,
          priorityCounts,
        },
        uniformatGroups: UNIFORMAT_GROUPS,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * Get action list for report generation
   * Returns tabular data for the Action List section
   */
  getActionList: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      scope: z.enum(['all', 'selected']).default('all'),
      selectedAssetIds: z.array(z.number()).optional(),
      yearHorizon: z.number().min(1).max(50).default(20),
      includePriorities: z.array(z.enum(['critical', 'necessary', 'recommended', 'no_action'])).default(['critical', 'necessary', 'recommended']),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, ...options } = input;
      const isAdmin = ctx.user.role === 'admin';
      
      // Verify project access
      const project = await getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or access denied'
        });
      }
      
      const actionList = await getActionListForReport(projectId, options);
      
      // Calculate totals by priority
      const totalsByPriority = {
        critical: { count: 0, cost: 0 },
        necessary: { count: 0, cost: 0 },
        recommended: { count: 0, cost: 0 },
        no_action: { count: 0, cost: 0 },
      };
      
      for (const action of actionList) {
        const priority = action.priority as keyof typeof totalsByPriority;
        if (totalsByPriority[priority]) {
          totalsByPriority[priority].count++;
          totalsByPriority[priority].cost += action.actionCost || 0;
        }
      }
      
      // Calculate totals by UNIFORMAT group
      const totalsByUniformat: Record<string, { count: number; cost: number }> = {};
      for (const action of actionList) {
        const group = action.uniformatCode.charAt(0);
        if (!totalsByUniformat[group]) {
          totalsByUniformat[group] = { count: 0, cost: 0 };
        }
        totalsByUniformat[group].count++;
        totalsByUniformat[group].cost += action.actionCost || 0;
      }
      
      return {
        projectId,
        projectName: project.name,
        actions: actionList,
        totalActions: actionList.length,
        totalCost: actionList.reduce((sum, a) => sum + (a.actionCost || 0), 0),
        totalsByPriority,
        totalsByUniformat,
        priorityBuckets: PRIORITY_BUCKETS,
        actionTypes: ACTION_TYPES,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * Get UNIFORMAT group summaries for dashboard section
   */
  getUniformatSummaries: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      assetIds: z.array(z.number()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, assetIds } = input;
      const isAdmin = ctx.user.role === 'admin';
      
      // Verify project access
      const project = await getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or access denied'
        });
      }
      
      const summaries = await getUniformatGroupSummaries(projectId, assetIds);
      
      // Calculate overall totals
      const totalComponents = summaries.reduce((sum, s) => sum + s.componentCount, 0);
      const totalRepairCost = summaries.reduce((sum, s) => sum + s.totalRepairCost, 0);
      const totalReplacementCost = summaries.reduce((sum, s) => sum + s.totalReplacementCost, 0);
      
      return {
        projectId,
        projectName: project.name,
        summaries,
        totals: {
          components: totalComponents,
          repairCost: totalRepairCost,
          replacementCost: totalReplacementCost,
          totalCost: totalRepairCost + totalReplacementCost,
        },
        uniformatGroups: UNIFORMAT_GROUPS,
        conditionRatings: CONDITION_RATINGS,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * Estimate report page count based on configuration
   */
  estimateEnhancedReportSize: protectedProcedure
    .input(z.object({
      componentCount: z.number(),
      photoCount: z.number(),
      includePhotos: z.boolean().default(true),
      displayLevel: z.enum(['L2', 'L3', 'both']).default('L3'),
      includeDashboard: z.boolean().default(true),
      includeActionList: z.boolean().default(true),
      includeIntroduction: z.boolean().default(true),
    }))
    .query(async ({ input }) => {
      const estimatedPages = estimateReportPageCount(input);
      
      let warning = null;
      if (estimatedPages > 100) {
        warning = 'This report will be very large (100+ pages). Consider applying filters or reducing scope.';
      } else if (estimatedPages > 50) {
        warning = 'This report may be large. Generation may take several minutes.';
      }
      
      return {
        estimatedPages,
        estimatedGenerationTime: Math.ceil(estimatedPages * 0.5), // ~0.5 seconds per page
        warning,
      };
    }),

  /**
   * Get report configuration presets
   */
  getReportPresets: protectedProcedure
    .query(async () => {
      return {
        presets: [
          {
            id: 'recommended',
            label: 'Recommended',
            description: 'Standard report with executive summary, dashboard, component details, and action list',
            icon: 'star',
            sections: {
              includeExecutiveSummary: true,
              includePortfolioMetrics: true,
              includeBuildingBreakdown: true,
              includeCategoryAnalysis: true,
              includeCapitalForecast: true,
              includePriorityRecommendations: true,
              includeComponentAssessments: true,
              includeAssumptions: true,
              includeGlossary: true,
              includeMethodology: true,
            },
            componentOptions: {
              displayLevel: 'L3',
              includePhotos: true,
              maxPhotosPerComponent: 4,
              grouping: 'building_uniformat',
            },
          },
          {
            id: 'minimal_executive',
            label: 'Minimal Executive',
            description: 'Brief executive summary with key metrics and priority recommendations only',
            icon: 'briefcase',
            sections: {
              includeExecutiveSummary: true,
              includePortfolioMetrics: true,
              includeBuildingBreakdown: false,
              includeCategoryAnalysis: false,
              includeCapitalForecast: true,
              includePriorityRecommendations: true,
              includeComponentAssessments: false,
              includeAssumptions: false,
              includeGlossary: false,
              includeMethodology: false,
            },
            componentOptions: {
              displayLevel: 'L2',
              includePhotos: false,
              maxPhotosPerComponent: 0,
              grouping: 'uniformat_only',
            },
          },
          {
            id: 'full_technical',
            label: 'Full Technical',
            description: 'Comprehensive report with all sections, detailed component assessments, and full photo documentation',
            icon: 'file-text',
            sections: {
              includeExecutiveSummary: true,
              includePortfolioMetrics: true,
              includeBuildingBreakdown: true,
              includeCategoryAnalysis: true,
              includeCapitalForecast: true,
              includePriorityRecommendations: true,
              includeComponentAssessments: true,
              includeAssumptions: true,
              includeGlossary: true,
              includeMethodology: true,
            },
            componentOptions: {
              displayLevel: 'both',
              includePhotos: true,
              maxPhotosPerComponent: 6,
              grouping: 'building_uniformat',
            },
          },
        ],
        uniformatGroups: UNIFORMAT_GROUPS,
        priorityBuckets: PRIORITY_BUCKETS,
        actionTypes: ACTION_TYPES,
        conditionRatings: CONDITION_RATINGS,
      };
    }),
});
