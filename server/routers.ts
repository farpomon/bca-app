import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserProjects(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getProjectById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        clientName: z.string().optional(),
        propertyType: z.string().optional(),
        constructionType: z.string().optional(),
        yearBuilt: z.number().optional(),
        numberOfUnits: z.number().optional(),
        numberOfStories: z.number().optional(),
        buildingCode: z.string().optional(),
        assessmentDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const projectId = await db.createProject({
          ...input,
          userId: ctx.user.id,
          status: "draft",
        });
        return { id: projectId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        address: z.string().optional(),
        clientName: z.string().optional(),
        propertyType: z.string().optional(),
        constructionType: z.string().optional(),
        yearBuilt: z.number().optional(),
        numberOfUnits: z.number().optional(),
        numberOfStories: z.number().optional(),
        buildingCode: z.string().optional(),
        assessmentDate: z.date().optional(),
        status: z.enum(["draft", "in_progress", "completed", "archived"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateProject(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteProject(input.id, ctx.user.id);
        return { success: true };
      }),

    stats: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getProjectStats(input.projectId);
      }),
  }),

  components: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllBuildingComponents();
    }),

    byLevel: protectedProcedure
      .input(z.object({ level: z.number().min(1).max(3) }))
      .query(async ({ input }) => {
        return await db.getBuildingComponentsByLevel(input.level);
      }),

    get: protectedProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        return await db.getBuildingComponentByCode(input.code);
      }),
  }),

  assessments: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getProjectAssessments(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ 
        projectId: z.number(),
        componentCode: z.string() 
      }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getAssessmentByComponent(input.projectId, input.componentCode);
      }),

    upsert: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        componentCode: z.string(),
        condition: z.enum(["good", "fair", "poor", "not_assessed"]),
        observations: z.string().optional(),
        remainingUsefulLife: z.number().optional(),
        expectedUsefulLife: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        
        const assessmentId = await db.upsertAssessment({
          ...input,
          assessedAt: new Date(),
        });
        return { id: assessmentId };
      }),
  }),

  deficiencies: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getProjectDeficiencies(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getDeficiencyById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        assessmentId: z.number(),
        componentCode: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        location: z.string().optional(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        priority: z.enum(["immediate", "short_term", "medium_term", "long_term"]),
        recommendedAction: z.string().optional(),
        estimatedCost: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        
        const deficiencyId = await db.createDeficiency({
          ...input,
          status: "open",
        });
        return { id: deficiencyId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        priority: z.enum(["immediate", "short_term", "medium_term", "long_term"]).optional(),
        recommendedAction: z.string().optional(),
        estimatedCost: z.number().optional(),
        status: z.enum(["open", "in_progress", "resolved", "deferred"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDeficiency(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDeficiency(input.id);
        return { success: true };
      }),
  }),

  photos: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getProjectPhotos(input.projectId);
      }),

    byDeficiency: protectedProcedure
      .input(z.object({ deficiencyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDeficiencyPhotos(input.deficiencyId);
      }),

    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        assessmentId: z.number().optional(),
        deficiencyId: z.number().optional(),
        fileData: z.string(), // base64 encoded
        fileName: z.string(),
        mimeType: z.string(),
        caption: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        
        // Decode base64 and upload to S3
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `projects/${input.projectId}/photos/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        const photoId = await db.createPhoto({
          projectId: input.projectId,
          assessmentId: input.assessmentId,
          deficiencyId: input.deficiencyId,
          fileKey,
          url,
          caption: input.caption,
          mimeType: input.mimeType,
          fileSize: buffer.length,
        });
        
        return { id: photoId, url };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePhoto(input.id);
        return { success: true };
      }),
  }),

  costEstimates: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getProjectCostEstimates(input.projectId);
      }),

    byDeficiency: protectedProcedure
      .input(z.object({ deficiencyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDeficiencyCostEstimates(input.deficiencyId);
      }),

    create: protectedProcedure
      .input(z.object({
        deficiencyId: z.number(),
        projectId: z.number(),
        componentCode: z.string(),
        description: z.string().optional(),
        quantity: z.number().optional(),
        unit: z.string().optional(),
        unitCost: z.number().optional(),
        totalCost: z.number().optional(),
        timeline: z.enum(["immediate", "1_5_years", "5_10_years", "10_plus_years"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        
        const costEstimateId = await db.createCostEstimate(input);
        return { id: costEstimateId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().optional(),
        quantity: z.number().optional(),
        unit: z.string().optional(),
        unitCost: z.number().optional(),
        totalCost: z.number().optional(),
        timeline: z.enum(["immediate", "1_5_years", "5_10_years", "10_plus_years"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCostEstimate(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCostEstimate(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
