import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Dashboard
  dashboard: router({
    stats: publicProcedure.query(async () => {
      return db.getDashboardStats();
    }),
  }),

  // Municipalities
  municipalities: router({
    list: publicProcedure.query(async () => {
      return db.getMunicipalities();
    }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getMunicipalityById(input.id);
      }),
  }),

  // Projects
  projects: router({
    list: publicProcedure
      .input(z.object({ municipalityId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getProjects(input?.municipalityId);
      }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectById(input.id);
      }),
    
    getWithMunicipality: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectWithMunicipality(input.id);
      }),
  }),

  // Assets
  assets: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getAssets(input?.projectId);
      }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getAssetById(input.id);
      }),
  }),

  // Assessments
  assessments: router({
    listByAsset: publicProcedure
      .input(z.object({ assetId: z.number() }))
      .query(async ({ input }) => {
        return db.getAssessmentsByAssetId(input.assetId);
      }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getAssessmentById(input.id);
      }),
  }),

  // Asset Categories
  assetCategories: router({
    list: publicProcedure.query(async () => {
      return db.getAssetCategories();
    }),
  }),

  // Assessment Components
  assessmentComponents: router({
    list: publicProcedure.query(async () => {
      return db.getAssessmentComponents();
    }),
  }),
});

export type AppRouter = typeof appRouter;
