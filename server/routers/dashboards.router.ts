import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as portfolioKPI from "../services/portfolioKPI.service";
import { getDb } from "../db";
import { dashboardConfigs } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const filterSchema = z.object({
  buildingClass: z.array(z.string()).optional(),
  systemType: z.array(z.string()).optional(),
  facilityType: z.array(z.string()).optional(),
  department: z.array(z.string()).optional(),
  priorityLevel: z.array(z.string()).optional(),
  dateFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
  dateTo: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

export const dashboardsRouter = router({
  // Get portfolio-wide KPIs
  getPortfolioKPIs: protectedProcedure
    .input(z.object({ filters: filterSchema.optional() }))
    .query(async ({ ctx, input }) => {
      return await portfolioKPI.calculatePortfolioKPIs(ctx.user.id, input.filters);
    }),

  // Get trend data
  getTrends: protectedProcedure
    .input(
      z.object({
        periodType: z.enum(["month", "quarter", "year"]),
        periods: z.number().default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      return await portfolioKPI.calculateTrends(
        ctx.user.id,
        input.periodType,
        input.periods
      );
    }),

  // Get facility comparisons
  getFacilityComparisons: protectedProcedure
    .input(z.object({ filters: filterSchema.optional() }))
    .query(async ({ ctx, input }) => {
      return await portfolioKPI.getFacilityComparisons(ctx.user.id, input.filters);
    }),

  // Save dashboard configuration
  saveConfig: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        layout: z.any(),
        filters: z.any().optional(),
        isDefault: z.boolean().optional(),
        isShared: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // If setting as default, unset other defaults first
      if (input.isDefault) {
        await db
          .update(dashboardConfigs)
          .set({ isDefault: 0 })
          .where(eq(dashboardConfigs.userId, ctx.user.id));
      }

      await db.insert(dashboardConfigs).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        layout: input.layout,
        filters: input.filters,
        isDefault: input.isDefault ? 1 : 0,
        isShared: input.isShared ? 1 : 0,
      });

      return { success: true };
    }),

  // Get user's dashboard configurations
  getConfigs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const configs = await db
      .select()
      .from(dashboardConfigs)
      .where(
        and(
          eq(dashboardConfigs.userId, ctx.user.id)
        )
      );

    return configs;
  }),

  // Get default dashboard configuration
  getDefaultConfig: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const configs = await db
      .select()
      .from(dashboardConfigs)
      .where(
        and(
          eq(dashboardConfigs.userId, ctx.user.id),
          eq(dashboardConfigs.isDefault, 1)
        )
      )
      .limit(1);

    return configs[0] || null;
  }),

  // Delete dashboard configuration
  deleteConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(dashboardConfigs)
        .where(
          and(
            eq(dashboardConfigs.id, input.id),
            eq(dashboardConfigs.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // Get filter options (unique values for dropdowns)
  getFilterOptions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { buildingClasses: [], facilityTypes: [], departments: [] };

    const projects = await db.execute(`
      SELECT DISTINCT 
        buildingClass,
        facilityType,
        holdingDepartment
      FROM projects
      WHERE userId = ${ctx.user.id}
        AND buildingClass IS NOT NULL
        AND facilityType IS NOT NULL
        AND holdingDepartment IS NOT NULL
    `);

    const buildingClasses = new Set<string>();
    const facilityTypes = new Set<string>();
    const departments = new Set<string>();

    (projects as any[]).forEach(row => {
      if (row.buildingClass) buildingClasses.add(row.buildingClass);
      if (row.facilityType) facilityTypes.add(row.facilityType);
      if (row.holdingDepartment) departments.add(row.holdingDepartment);
    });

    return {
      buildingClasses: Array.from(buildingClasses),
      facilityTypes: Array.from(facilityTypes),
      departments: Array.from(departments),
      systemTypes: [
        "Substructure",
        "Shell",
        "Interiors",
        "Services",
        "Equipment & Furnishings",
        "Special Construction",
        "Building Sitework",
      ],
      priorityLevels: ["immediate", "high", "medium", "low"],
    };
  }),
});
