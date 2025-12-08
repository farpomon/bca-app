import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as maintenanceDb from "../db/maintenanceEntries.db";

export const maintenanceRouter = router({
  /**
   * Get maintenance entries with optional filtering
   */
  getEntries: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        assessmentId: z.number().optional(),
        componentName: z.string().optional(),
        entryType: z.enum(["identified", "executed"]).optional(),
        status: z.string().optional(),
        isRecurring: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return await maintenanceDb.getMaintenanceEntries(input);
    }),

  /**
   * Get single maintenance entry
   */
  getEntry: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await maintenanceDb.getMaintenanceEntry(input.id);
    }),

  /**
   * Create maintenance entry
   */
  createEntry: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        assessmentId: z.number().optional(),
        componentName: z.string(),
        location: z.string().optional(),
        entryType: z.enum(["identified", "executed"]),
        actionType: z.enum([
          "repair",
          "rehabilitation",
          "replacement",
          "preventive_maintenance",
          "emergency_repair",
          "inspection",
          "upgrade",
        ]),
        lifecycleStage: z
          .enum(["installation", "routine_maintenance", "major_repair", "replacement", "decommission"])
          .optional(),
        description: z.string(),
        workPerformed: z.string().optional(),
        findings: z.string().optional(),
        estimatedCost: z.number().optional(),
        actualCost: z.number().optional(),
        status: z
          .enum(["planned", "approved", "in_progress", "completed", "deferred", "cancelled"])
          .default("planned"),
        priority: z.enum(["immediate", "high", "medium", "low"]).default("medium"),
        dateIdentified: z.date().optional(),
        dateScheduled: z.date().optional(),
        dateStarted: z.date().optional(),
        dateCompleted: z.date().optional(),
        isRecurring: z.boolean().default(false),
        recurringFrequency: z
          .enum(["weekly", "monthly", "quarterly", "semi_annual", "annual", "biennial"])
          .optional(),
        nextDueDate: z.date().optional(),
        lastCompletedDate: z.date().optional(),
        contractor: z.string().optional(),
        contractorContact: z.string().optional(),
        warrantyExpiry: z.date().optional(),
        componentAge: z.number().optional(),
        notes: z.string().optional(),
        attachments: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await maintenanceDb.createMaintenanceEntry({
        ...input,
        estimatedCost: input.estimatedCost?.toString(),
        actualCost: input.actualCost?.toString(),
        attachments: input.attachments ? JSON.stringify(input.attachments) : undefined,
        createdBy: ctx.user.id,
      });

      // Update cumulative cost if this is a completed entry
      if (input.status === "completed" && input.actualCost) {
        await maintenanceDb.updateCumulativeCost(input.projectId, input.componentName);
      }

      return { id };
    }),

  /**
   * Update maintenance entry
   */
  updateEntry: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        assessmentId: z.number().optional(),
        componentName: z.string().optional(),
        location: z.string().optional(),
        entryType: z.enum(["identified", "executed"]).optional(),
        actionType: z
          .enum([
            "repair",
            "rehabilitation",
            "replacement",
            "preventive_maintenance",
            "emergency_repair",
            "inspection",
            "upgrade",
          ])
          .optional(),
        lifecycleStage: z
          .enum(["installation", "routine_maintenance", "major_repair", "replacement", "decommission"])
          .optional(),
        description: z.string().optional(),
        workPerformed: z.string().optional(),
        findings: z.string().optional(),
        estimatedCost: z.number().optional(),
        actualCost: z.number().optional(),
        status: z.enum(["planned", "approved", "in_progress", "completed", "deferred", "cancelled"]).optional(),
        priority: z.enum(["immediate", "high", "medium", "low"]).optional(),
        dateIdentified: z.date().optional(),
        dateScheduled: z.date().optional(),
        dateStarted: z.date().optional(),
        dateCompleted: z.date().optional(),
        isRecurring: z.boolean().optional(),
        recurringFrequency: z
          .enum(["weekly", "monthly", "quarterly", "semi_annual", "annual", "biennial"])
          .optional(),
        nextDueDate: z.date().optional(),
        lastCompletedDate: z.date().optional(),
        contractor: z.string().optional(),
        contractorContact: z.string().optional(),
        warrantyExpiry: z.date().optional(),
        componentAge: z.number().optional(),
        notes: z.string().optional(),
        attachments: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      // Get existing entry to check for component name
      const existing = await maintenanceDb.getMaintenanceEntry(id);
      if (!existing) {
        throw new Error("Maintenance entry not found");
      }

      await maintenanceDb.updateMaintenanceEntry(id, {
        ...data,
        estimatedCost: data.estimatedCost?.toString(),
        actualCost: data.actualCost?.toString(),
        attachments: data.attachments ? JSON.stringify(data.attachments) : undefined,
      });

      // Update cumulative cost if status changed to completed
      if (data.status === "completed" && data.actualCost) {
        await maintenanceDb.updateCumulativeCost(
          existing.projectId,
          data.componentName || existing.componentName
        );
      }

      return { success: true };
    }),

  /**
   * Delete maintenance entry
   */
  deleteEntry: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await maintenanceDb.deleteMaintenanceEntry(input.id);
      return { success: true };
    }),

  /**
   * Get maintenance history for a component
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        componentName: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await maintenanceDb.getMaintenanceHistory(input.projectId, input.componentName);
    }),

  /**
   * Get maintenance cost summary
   */
  getCostSummary: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        componentName: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await maintenanceDb.getMaintenanceCostSummary(input.projectId, input.componentName);
    }),

  /**
   * Get recurring maintenance entries
   */
  getRecurring: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        dueSoon: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return await maintenanceDb.getRecurringMaintenance(input.projectId, input.dueSoon);
    }),

  /**
   * Get maintenance entries grouped by component
   */
  getByComponent: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await maintenanceDb.getMaintenanceByComponent(input.projectId);
    }),
});
