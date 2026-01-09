import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as prioritizationDb from "../db/prioritization.db";
import * as prioritizationService from "../services/prioritization.service";

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
        endYear: z.number(),
        totalBudget: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const cycleId = await prioritizationDb.createBudgetCycle({
        name: input.name,
        description: input.description,
        startYear: input.startYear,
        endYear: input.endYear,
        totalBudget: input.totalBudget !== undefined ? String(input.totalBudget) : undefined,
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
        endYear: z.number().optional(),
        totalBudget: z.number().optional(),
        status: z.enum(["planning", "approved", "active", "completed"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { cycleId, totalBudget, ...rest } = input;
      const updates = {
        ...rest,
        ...(totalBudget !== undefined && { totalBudget: String(totalBudget) }),
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
});
