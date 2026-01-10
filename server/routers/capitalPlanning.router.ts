import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as capitalPlanningDb from "../db/capitalPlanning.db";

/**
 * Capital Planning Router
 * Handles cycle management, assessment integration, and analytics
 */

export const capitalPlanningRouter = router({
  // ============================================================================
  // CYCLE MANAGEMENT
  // ============================================================================

  getAllCycles: protectedProcedure.query(async () => {
    return await capitalPlanningDb.getAllCycles();
  }),

  getCycleById: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const cycle = await capitalPlanningDb.getCycleById(input.cycleId);
      if (!cycle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cycle not found",
        });
      }
      return cycle;
    }),

  getCycleWithDetails: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const cycle = await capitalPlanningDb.getCycleById(input.cycleId);
      if (!cycle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cycle not found",
        });
      }

      const allocations = await capitalPlanningDb.getAllocationsForCycle(input.cycleId);
      const analytics = await capitalPlanningDb.getCycleAnalytics(input.cycleId);

      return {
        cycle,
        allocations,
        analytics,
      };
    }),

  deleteCycle: protectedProcedure
    .input(
      z.object({
        cycleId: z.number(),
        confirmText: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify confirmation text
      if (input.confirmText !== "DELETE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: 'Please type "DELETE" to confirm',
        });
      }

      // Check if this is the active cycle
      const cycle = await capitalPlanningDb.getCycleById(input.cycleId);
      if (!cycle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cycle not found",
        });
      }

      if (cycle.status === "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete active cycle. Please select a replacement active cycle first.",
        });
      }

      // Delete the cycle and all dependent data
      await capitalPlanningDb.deleteCycleWithDependencies(input.cycleId);

      return { success: true };
    }),

  deleteCyclesBulk: protectedProcedure
    .input(
      z.object({
        cycleIds: z.array(z.number()),
        confirmText: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify confirmation text
      if (input.confirmText !== "DELETE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: 'Please type "DELETE" to confirm',
        });
      }

      // Check if any of the cycles is active
      const cycles = await Promise.all(
        input.cycleIds.map((id) => capitalPlanningDb.getCycleById(id))
      );

      const activeCycle = cycles.find((c) => c && c.status === "active");
      if (activeCycle) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete active cycle. Please select a replacement active cycle first.",
        });
      }

      // Delete all cycles
      await Promise.all(
        input.cycleIds.map((id) => capitalPlanningDb.deleteCycleWithDependencies(id))
      );

      return { success: true, deletedCount: input.cycleIds.length };
    }),

  archiveCycle: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input }) => {
      await capitalPlanningDb.archiveCycle(input.cycleId);
      return { success: true };
    }),

  archiveCyclesBulk: protectedProcedure
    .input(z.object({ cycleIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      await Promise.all(input.cycleIds.map((id) => capitalPlanningDb.archiveCycle(id)));
      return { success: true, archivedCount: input.cycleIds.length };
    }),

  setActiveCycle: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input }) => {
      await capitalPlanningDb.setActiveCycle(input.cycleId);
      return { success: true };
    }),

  // ============================================================================
  // ASSESSMENT INTEGRATION & ANALYTICS
  // ============================================================================

  getBacklogSummary: protectedProcedure
    .input(
      z.object({
        cycleId: z.number(),
        filters: z
          .object({
            facilityId: z.number().optional(),
            assetCategory: z.string().optional(),
            severityLevel: z.enum(["critical", "high", "medium", "low"]).optional(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      return await capitalPlanningDb.calculateBacklogSummary(input.cycleId, input.filters);
    }),

  getBacklogReductionTrend: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      return await capitalPlanningDb.calculateBacklogReductionTrend(input.cycleId);
    }),

  getRiskAnalysis: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      return await capitalPlanningDb.calculateRiskAnalysis(input.cycleId);
    }),

  getUnfundedCriticalRisks: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      return await capitalPlanningDb.calculateUnfundedCriticalRisks(input.cycleId);
    }),

  // ============================================================================
  // PROJECT-DEFICIENCY MAPPING
  // ============================================================================

  linkProjectToDeficiencies: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        deficiencyIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      await capitalPlanningDb.linkProjectToDeficiencies(
        input.projectId,
        input.deficiencyIds
      );
      return { success: true };
    }),

  unlinkProjectFromDeficiencies: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        deficiencyIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      await capitalPlanningDb.unlinkProjectFromDeficiencies(
        input.projectId,
        input.deficiencyIds
      );
      return { success: true };
    }),

  getProjectDeficiencies: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await capitalPlanningDb.getProjectDeficiencies(input.projectId);
    }),

  // ============================================================================
  // ANALYTICS REFRESH
  // ============================================================================

  refreshCycleAnalytics: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input }) => {
      await capitalPlanningDb.invalidateCycleAnalytics(input.cycleId);
      const analytics = await capitalPlanningDb.getCycleAnalytics(input.cycleId);
      return { success: true, analytics };
    }),
});
