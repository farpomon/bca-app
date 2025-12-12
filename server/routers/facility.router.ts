import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getFacilitySummary } from "../services/facilitySummary.service";
import {
  createRenovationCost,
  getRenovationCostsByProjectId,
  updateRenovationCost,
  deleteRenovationCost,
} from "../db/renovationCosts.db";
import { getDb } from "../db";
import { projects } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const facilityRouter = router({
  /**
   * Get facility summary
   */
  getSummary: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getFacilitySummary(input.projectId);
    }),

  /**
   * Update facility lifecycle information
   */
  updateLifecycle: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        designLife: z.number().optional(),
        endOfLifeDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(projects)
        .set({
          designLife: input.designLife,
          endOfLifeDate: input.endOfLifeDate?.toISOString(),
        })
        .where(eq(projects.id, input.projectId));

      return { success: true };
    }),

  /**
   * Update administrative information
   */
  updateAdministrative: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        holdingDepartment: z.string().optional(),
        propertyManager: z.string().optional(),
        managerEmail: z.string().email().optional(),
        managerPhone: z.string().optional(),
        facilityType: z.string().optional(),
        occupancyStatus: z.enum(["occupied", "vacant", "partial"]).optional(),
        criticalityLevel: z.enum(["critical", "important", "standard"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { projectId, ...updateData } = input;

      await db
        .update(projects)
        .set(updateData)
        .where(eq(projects.id, projectId));

      return { success: true };
    }),

  /**
   * Add renovation cost
   */
  addRenovationCost: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        costType: z.enum(["identified", "planned", "executed"]),
        amount: z.number(),
        status: z.enum(["pending", "approved", "in_progress", "completed", "cancelled"]).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        fiscalYear: z.number().optional(),
        dateCompleted: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createRenovationCost({
        projectId: input.projectId,
        costType: input.costType,
        amount: input.amount.toString(),
        status: input.status || "pending",
        description: input.description,
        category: input.category,
        fiscalYear: input.fiscalYear,
        dateCompleted: input.dateCompleted,
        notes: input.notes,
      });

      return { id };
    }),

  /**
   * Get renovation costs
   */
  getRenovationCosts: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        costType: z.enum(["identified", "planned", "executed"]).optional(),
      })
    )
    .query(async ({ input }) => {
      return await getRenovationCostsByProjectId(input.projectId, input.costType);
    }),

  /**
   * Update renovation cost
   */
  updateRenovationCost: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "approved", "in_progress", "completed", "cancelled"]).optional(),
        dateCompleted: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      await updateRenovationCost(id, updateData);
      return { success: true };
    }),

  /**
   * Delete renovation cost
   */
  deleteRenovationCost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteRenovationCost(input.id);
      return { success: true };
    }),
});
