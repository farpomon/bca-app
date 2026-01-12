import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as prioritizationDb from "../db/prioritization.db";
import * as prioritizationEnhancedDb from "../db/prioritizationEnhanced.db";
import * as prioritizationService from "../services/prioritization.service";
import * as criteriaManagementService from "../services/criteriaManagement.service";
import * as scoringFinalizationService from "../services/scoringFinalization.service";

/**
 * Multi-Criteria Prioritization Router
 * Handles criteria management, project scoring, and capital budget planning
 */

export const prioritizationRouter = router({
  // ============================================================================
  // CRITERIA MANAGEMENT
  // ============================================================================

  getCriteria: protectedProcedure.query(async () => {
    return await prioritizationDb.getAllCriteria();
  }),

  createCriteria: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        category: z.enum(["risk", "strategic", "compliance", "financial", "operational", "environmental"]),
        weight: z.number().min(0).max(100).default(10),
        scoringGuideline: z.string().optional(),
        displayOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const criteriaId = await prioritizationDb.createCriteria({
        name: input.name,
        description: input.description,
        category: input.category,
        weight: String(input.weight),
        scoringGuideline: input.scoringGuideline,
        displayOrder: input.displayOrder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Normalize weights after adding new criteria
      await prioritizationService.normalizeCriteriaWeights();

      return { criteriaId };
    }),

  updateCriteria: protectedProcedure
    .input(
      z.object({
        criteriaId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(["risk", "strategic", "compliance", "financial", "operational", "environmental"]).optional(),
        weight: z.number().min(0).max(100).optional(),
        scoringGuideline: z.string().optional(),
        displayOrder: z.number().optional(),
        isActive: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { criteriaId, weight, ...rest } = input;
      const updates = {
        ...rest,
        ...(weight !== undefined && { weight: String(weight) }),
      };
      await prioritizationDb.updateCriteria(criteriaId, updates);

      // Normalize weights if weight was changed
      if (weight !== undefined) {
        await prioritizationService.normalizeCriteriaWeights();
      }

      return { success: true };
    }),

  deleteCriteria: protectedProcedure
    .input(z.object({ criteriaId: z.number() }))
    .mutation(async ({ input }) => {
      await prioritizationDb.deleteCriteria(input.criteriaId);

      // Normalize remaining weights
      await prioritizationService.normalizeCriteriaWeights();

      return { success: true };
    }),

  normalizeWeights: protectedProcedure.mutation(async () => {
    await prioritizationService.normalizeCriteriaWeights();
    return { success: true };
  }),

  // ============================================================================
  // PROJECT SCORING
  // ============================================================================

  getProjectScores: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await prioritizationDb.getProjectScores(input.projectId);
    }),

  scoreProject: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        scores: z.array(
          z.object({
            criteriaId: z.number(),
            score: z.number().min(0).max(10),
            justification: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Save individual project scores
      await prioritizationDb.saveMultipleProjectScores(
        input.projectId,
        input.scores,
        ctx.user.id
      );

      // Recalculate composite score for this project
      const compositeScore = await prioritizationService.calculateCompositeScore(input.projectId);

      // Recalculate all rankings to ensure consistent ordering
      // This updates the project_priority_scores cache table
      await prioritizationService.calculateAllProjectScores();

      return { success: true, compositeScore };
    }),

  getCompositeScore: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await prioritizationService.calculateCompositeScore(input.projectId);
    }),

  // ============================================================================
  // PROJECT RANKING
  // ============================================================================

  getRankedProjects: protectedProcedure
    .input(
      z.object({
        minScore: z.number().optional(),
        maxScore: z.number().optional(),
        limit: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await prioritizationService.getRankedProjects(input);
    }),

  getScoringStatus: protectedProcedure.query(async () => {
    return await prioritizationService.getScoringStatus();
  }),

  calculateAllScores: protectedProcedure.mutation(async () => {
    const rankedProjects = await prioritizationService.calculateAllProjectScores();
    return { success: true, projectCount: rankedProjects.length };
  }),

  compareScenarios: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        scenarios: z.array(
          z.object({
            name: z.string(),
            weights: z.record(z.string(), z.number()),
          })
        ),
      })
    )
    .query(async ({ input }) => {
      return await prioritizationService.compareWeightingScenarios(
        input.projectId,
        input.scenarios
      );
    }),

  // ============================================================================
  // CAPITAL BUDGET CYCLES
  // ============================================================================

  getBudgetCycles: protectedProcedure.query(async () => {
    return await prioritizationDb.getAllBudgetCycles();
  }),

  getBudgetCycle: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const cycle = await prioritizationDb.getBudgetCycleById(input.cycleId);
      if (!cycle) throw new Error("Budget cycle not found");

      const allocations = await prioritizationDb.getAllocationsForCycle(input.cycleId);
      const summary = await prioritizationDb.getBudgetSummaryByYear(input.cycleId);

      return {
        cycle,
        allocations,
        summary,
      };
    }),

  createBudgetCycle: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        startYear: z.number(),
        duration: z.number().min(1).max(30).default(4), // 1-30 years
        totalBudget: z.number().optional(),
        inflationRate: z.number().min(0).max(20).default(2.0), // 0-20%
        escalationRate: z.number().min(0).max(20).default(0.0), // 0-20%
        fundingConstraints: z.record(z.string(), z.number()).optional(), // { "2024": 1000000, "2025": 1200000 }
      })
    )
    .mutation(async ({ input, ctx }) => {
      const endYear = input.startYear + input.duration - 1;
      const cycleId = await prioritizationDb.createBudgetCycle({
        name: input.name,
        description: input.description,
        startYear: input.startYear,
        endYear: endYear,
        duration: input.duration,
        totalBudget: input.totalBudget !== undefined ? String(input.totalBudget) : undefined,
        inflationRate: String(input.inflationRate),
        escalationRate: String(input.escalationRate),
        fundingConstraints: input.fundingConstraints ? JSON.stringify(input.fundingConstraints) : undefined,
        status: "planning",
        createdBy: ctx.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { cycleId };
    }),

  updateBudgetCycle: protectedProcedure
    .input(
      z.object({
        cycleId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        startYear: z.number().optional(),
        duration: z.number().min(1).max(30).optional(),
        totalBudget: z.number().optional(),
        inflationRate: z.number().min(0).max(20).optional(),
        escalationRate: z.number().min(0).max(20).optional(),
        fundingConstraints: z.record(z.string(), z.number()).optional(),
        status: z.enum(["planning", "approved", "active", "completed", "archived"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { cycleId, totalBudget, inflationRate, escalationRate, fundingConstraints, duration, startYear, ...rest } = input;
      
      // Calculate endYear if duration or startYear changed
      let endYear: number | undefined;
      if (duration !== undefined || startYear !== undefined) {
        const cycle = await prioritizationDb.getBudgetCycle(cycleId);
        const newStartYear = startYear ?? cycle.startYear;
        const newDuration = duration ?? cycle.duration ?? (cycle.endYear - cycle.startYear + 1);
        endYear = newStartYear + newDuration - 1;
      }
      
      const updates = {
        ...rest,
        ...(startYear !== undefined && { startYear }),
        ...(duration !== undefined && { duration }),
        ...(endYear !== undefined && { endYear }),
        ...(totalBudget !== undefined && { totalBudget: String(totalBudget) }),
        ...(inflationRate !== undefined && { inflationRate: String(inflationRate) }),
        ...(escalationRate !== undefined && { escalationRate: String(escalationRate) }),
        ...(fundingConstraints !== undefined && { fundingConstraints: JSON.stringify(fundingConstraints) }),
      };
      await prioritizationDb.updateBudgetCycle(cycleId, updates);
      return { success: true };
    }),

  deleteBudgetCycle: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input }) => {
      await prioritizationDb.deleteBudgetCycle(input.cycleId);
      return { success: true };
    }),

  // ============================================================================
  // BUDGET ALLOCATIONS
  // ============================================================================

  allocateProject: protectedProcedure
    .input(
      z.object({
        cycleId: z.number(),
        projectId: z.number(),
        year: z.number(),
        allocatedAmount: z.number(),
        priority: z.number(),
        justification: z.string().optional(),
        strategicAlignment: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const allocationId = await prioritizationDb.createBudgetAllocation({
        cycleId: input.cycleId,
        projectId: input.projectId,
        year: input.year,
        allocatedAmount: String(input.allocatedAmount),
        priority: input.priority,
        justification: input.justification,
        strategicAlignment: input.strategicAlignment,
        status: "proposed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { allocationId };
    }),

  updateAllocation: protectedProcedure
    .input(
      z.object({
        allocationId: z.number(),
        year: z.number().optional(),
        allocatedAmount: z.number().optional(),
        priority: z.number().optional(),
        status: z.enum(["proposed", "approved", "funded", "completed"]).optional(),
        justification: z.string().optional(),
        strategicAlignment: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { allocationId, allocatedAmount, ...rest } = input;
      const updates = {
        ...rest,
        ...(allocatedAmount !== undefined && { allocatedAmount: String(allocatedAmount) }),
      };
      await prioritizationDb.updateBudgetAllocation(allocationId, updates);
      return { success: true };
    }),

  deleteAllocation: protectedProcedure
    .input(z.object({ allocationId: z.number() }))
    .mutation(async ({ input }) => {
      await prioritizationDb.deleteBudgetAllocation(input.allocationId);
      return { success: true };
    }),

  getAllocationsForCycle: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      return await prioritizationDb.getAllocationsForCycle(input.cycleId);
    }),

  getBudgetSummary: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      return await prioritizationDb.getBudgetSummaryByYear(input.cycleId);
    }),

  // ============================================================================
  // ENVIRONMENTAL IMPACT SCORING
  // ============================================================================

  getProjectEnvironmentalImpact: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await prioritizationDb.getProjectEnvironmentalImpact(input.projectId);
    }),

  getProjectsWithEnvironmentalImpact: protectedProcedure.query(async () => {
    return await prioritizationDb.getProjectsWithEnvironmentalImpact();
  }),

  autoScoreEnvironmental: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await prioritizationDb.autoScoreProjectEnvironmental(input.projectId, ctx.user.id);
      return { success: true };
    }),

  ensureEnvironmentalCriteria: protectedProcedure.mutation(async () => {
    const criteriaId = await prioritizationDb.ensureEnvironmentalCriteria();
    return { criteriaId };
  }),

  // ============================================================================
  // MODEL VERSIONING
  // ============================================================================

  getActiveModelVersion: protectedProcedure.query(async () => {
    return await prioritizationEnhancedDb.getActiveModelVersion();
  }),

  getAllModelVersions: protectedProcedure.query(async () => {
    return await prioritizationEnhancedDb.getAllModelVersions();
  }),

  createModelVersion: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const versionId = await prioritizationEnhancedDb.createModelVersion({
        name: input.name,
        description: input.description,
        createdBy: ctx.user.id,
      });
      return { versionId };
    }),

  getCriteriaByModelVersion: protectedProcedure
    .input(z.object({ versionId: z.number() }))
    .query(async ({ input }) => {
      return await prioritizationEnhancedDb.getCriteriaByModelVersion(input.versionId);
    }),

  // ============================================================================
  // ENHANCED SCORING WITH STATUS
  // ============================================================================

  getProjectScoresWithStatus: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await prioritizationEnhancedDb.getProjectScoresWithStatus(input.projectId);
    }),

  updateScoreStatus: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        criteriaId: z.number(),
        status: z.enum(['draft', 'submitted', 'locked']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await prioritizationEnhancedDb.updateProjectScoreStatus(
        input.projectId,
        input.criteriaId,
        input.status,
        ctx.user.id
      );
      return { success: true };
    }),

  submitAllScores: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const count = await prioritizationEnhancedDb.submitAllProjectScores(
        input.projectId,
        ctx.user.id
      );
      
      // Recalculate composite score after submission
      await prioritizationService.calculateAllProjectScores();
      
      return { success: true, count };
    }),

  getScoringProgress: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await prioritizationEnhancedDb.getProjectScoringProgress(input.projectId);
    }),

  // ============================================================================
  // AUDIT LOG
  // ============================================================================

  getProjectAuditHistory: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await prioritizationEnhancedDb.getProjectAuditHistory(input.projectId);
    }),

  getCriterionAuditHistory: protectedProcedure
    .input(z.object({ criteriaId: z.number() }))
    .query(async ({ input }) => {
      return await prioritizationEnhancedDb.getCriterionAuditHistory(input.criteriaId);
    }),

  getRecentAuditActivity: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(50) }))
    .query(async ({ input }) => {
      return await prioritizationEnhancedDb.getRecentAuditActivity(input.limit);
    }),

  // ============================================================================
  // CRITERIA MANAGEMENT (NEW)
  // ============================================================================

  removeCriterionFromModel: protectedProcedure
    .input(
      z.object({
        criteriaId: z.number(),
        portfolioId: z.number().optional().nullable(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await criteriaManagementService.removeCriterionFromModel(
        input.criteriaId,
        input.portfolioId || null,
        ctx.user.id,
        input.reason
      );
    }),

  disableCriterion: protectedProcedure
    .input(
      z.object({
        criteriaId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await criteriaManagementService.disableCriterion(
        input.criteriaId,
        ctx.user.id,
        input.reason
      );
    }),

  deleteCriterionPermanent: protectedProcedure
    .input(
      z.object({
        criteriaId: z.number(),
        confirmation: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user is admin
      if (ctx.user.role !== 'admin') {
        return {
          success: false,
          message: 'Only administrators can permanently delete criteria.',
        };
      }

      return await criteriaManagementService.deleteCriterion(
        input.criteriaId,
        ctx.user.id,
        input.confirmation,
        input.reason
      );
    }),

  enableCriterion: protectedProcedure
    .input(
      z.object({
        criteriaId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await criteriaManagementService.enableCriterion(
        input.criteriaId,
        ctx.user.id,
        input.reason
      );
    }),

  // ============================================================================
  // SCORING FINALIZATION (NEW)
  // ============================================================================

  finalizeScores: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        modelVersionId: z.number().optional(),
        companyId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await scoringFinalizationService.finalizeProjectScores({
        projectId: input.projectId,
        modelVersionId: input.modelVersionId,
        userId: ctx.user.id,
        companyId: input.companyId,
      });
    }),

  saveDraftScores: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        scores: z.array(
          z.object({
            criteriaId: z.number(),
            score: z.number().min(0).max(10),
            justification: z.string().optional(),
          })
        ),
        companyId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await scoringFinalizationService.saveDraftScores(
        input.projectId,
        input.scores,
        ctx.user.id,
        input.companyId
      );
    }),

  getFinalizationStatus: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        companyId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await scoringFinalizationService.getFinalizationStatus(
        input.projectId,
        input.companyId
      );
    }),

  // ============================================================================
  // BULK CYCLE OPERATIONS (NEW)
  // ============================================================================

  bulkArchiveCycles: protectedProcedure
    .input(
      z.object({
        cycleIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const results = [];
      for (const cycleId of input.cycleIds) {
        await prioritizationDb.updateBudgetCycle(cycleId, {
          status: 'archived',
          archivedAt: new Date().toISOString(),
          archivedBy: ctx.user.id,
        });
        results.push({ cycleId, success: true });
      }
      return { success: true, results };
    }),

  bulkDeleteCycles: protectedProcedure
    .input(
      z.object({
        cycleIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];
      for (const cycleId of input.cycleIds) {
        await prioritizationDb.deleteBudgetCycle(cycleId);
        results.push({ cycleId, success: true });
      }
      return { success: true, results };
    }),

  bulkDeleteAllocations: protectedProcedure
    .input(
      z.object({
        allocationIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];
      for (const allocationId of input.allocationIds) {
        await prioritizationDb.deleteBudgetAllocation(allocationId);
        results.push({ allocationId, success: true });
      }
      return { success: true, results };
    }),

  // ============================================================================
  // CAPITAL PLANNING ANALYTICS (NEW)
  // ============================================================================

  getBacklogReductionAnalysis: protectedProcedure
    .input(
      z.object({
        cycleId: z.number(),
      })
    )
    .query(async ({ input }) => {
      // TODO: Implement backlog reduction calculation
      // This will compute how much deferred maintenance is reduced over time
      return {
        cycleId: input.cycleId,
        backlogByYear: [],
        totalReduction: 0,
        percentReduction: 0,
      };
    }),

  getRiskAnalysisTrends: protectedProcedure
    .input(
      z.object({
        cycleId: z.number(),
      })
    )
    .query(async ({ input }) => {
      // TODO: Implement risk analysis trends
      // This will show risk exposure over time, by building, by UNIFORMAT group
      return {
        cycleId: input.cycleId,
        riskByYear: [],
        riskByBuilding: [],
        riskByUniformat: [],
      };
    }),

  getUnfundedCriticalRisks: protectedProcedure
    .input(
      z.object({
        cycleId: z.number(),
      })
    )
    .query(async ({ input }) => {
      // TODO: Implement unfunded critical risks
      // This will list critical items not covered by funding with consequences
      return {
        cycleId: input.cycleId,
        unfundedItems: [],
        totalRiskExposure: 0,
        criticalCount: 0,
      };
    }),
});
