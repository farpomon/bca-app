import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { optimizationRouter } from "./routers/optimization.router";
import { prioritizationRouter } from "./routers/prioritization.router";
import { riskRouter } from "./routers/risk.router";
import { facilityRouter } from "./routers/facility.router";
import { maintenanceRouter } from "./routers/maintenance.router";
import { modelsRouter } from "./routers/models.router";
import { dashboardsRouter } from "./routers/dashboards.router";
import { esgRouter } from "./routers/esg.router";
import { mediaRouter } from "./routers/media.router";
import { audioRouter } from "./routers/audio.router";
import { adminRouter } from "./routers/admin.router";
import { vocabularyRouter } from "./routers/vocabulary.router";
import { sharingRouter } from "./routers/sharing.router";
import { auditRouter } from "./routers/audit.router";
import { usersRouter } from "./routers/users.router";
import { accessRequestsRouter } from "./routers/accessRequests.router";
import { assessmentDocumentsRouter } from "./routers/assessmentDocuments.router";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import * as db from "./db";
import { getDb } from "./db";
import { assessments } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as assetsDb from "./db-assets";
import * as customComponentsDb from "./db-custom-components";
import * as dashboardData from "./dashboardData";
import { generateBCAReport } from "./reportGenerator";
import { generateDeficienciesCSV, generateAssessmentsCSV, generateCostEstimatesCSV } from "./exportUtils";
import { assessPhotoWithAI } from "./photoAssessment";

export const appRouter = router({
  system: systemRouter,
  audio: audioRouter,
  admin: adminRouter,
  vocabulary: vocabularyRouter,
  sharing: sharingRouter,
  audit: auditRouter,
  users: usersRouter,
  accessRequests: accessRequestsRouter,
  assessmentDocuments: assessmentDocumentsRouter,
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
      const isAdmin = ctx.user.role === "admin";
      console.log("[Projects List] User:", ctx.user.id, "Role:", ctx.user.role, "Company:", ctx.user.company, "IsAdmin:", isAdmin);
      const projects = await db.getUserProjects(ctx.user.id, false, ctx.user.company, isAdmin);
      console.log("[Projects List] Returned projects count:", projects?.length || 0);
      return projects;
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.id, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
          });
        }
        return project;
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

    bulkDelete: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        // Delete all projects that belong to the user
        for (const id of input.ids) {
          await db.deleteProject(id, ctx.user.id);
        }
        return { success: true, count: input.ids.length };
      }),

    restore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.restoreProject(input.id, ctx.user.id);
        return { success: true };
      }),

    listDeleted: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getDeletedProjects(ctx.user.id);
      }),

    archive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateProject(input.id, ctx.user.id, { status: "archived" });
        return { success: true };
      }),

    unarchive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateProject(input.id, ctx.user.id, { status: "draft" });
        return { success: true };
      }),

    export: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.id, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
        }
        
        // Get all related data
        const assessments = await db.getProjectAssessments(input.id);
        const deficiencies = await db.getProjectDeficiencies(input.id);
        const photos = await db.getProjectPhotos(input.id);
        const assets = await assetsDb.getProjectAssets(input.id);
        const sections = await db.getBuildingSections(input.id);
        
        return {
          version: "1.0",
          exportedAt: new Date().toISOString(),
          project,
          assessments,
          deficiencies,
          photos,
          assets,
          sections,
        };
      }),

    exportCSV: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        type: z.enum(["assessments", "deficiencies"]),
      }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.id, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
        }

        const { assessmentsToCSV, deficienciesToCSV } = await import('./export-utils');
        
        if (input.type === "assessments") {
          const assessments = await db.getProjectAssessments(input.id);
          const csv = assessmentsToCSV(assessments);
          return { csv, filename: `${project.name}-assessments.csv` };
        } else {
          const deficiencies = await db.getProjectDeficiencies(input.id);
          const csv = deficienciesToCSV(deficiencies);
          return { csv, filename: `${project.name}-deficiencies.csv` };
        }
      }),

    exportExcel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.id, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
        }

        const assessments = await db.getProjectAssessments(input.id);
        const deficiencies = await db.getProjectDeficiencies(input.id);
        
        const { dataToExcel } = await import('./export-utils');
        const buffer = dataToExcel({
          projectName: project.name,
          assessments,
          deficiencies,
        });
        
        // Convert buffer to base64 for transmission
        const base64 = buffer.toString('base64');
        return { 
          data: base64, 
          filename: `${project.name}-data.xlsx`,
        };
      }),

    bulkExportExcel: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .query(async ({ ctx, input }) => {
        if (input.ids.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No projects selected' });
        }

        // Fetch all projects and their data
        const projectsData = await Promise.all(
          input.ids.map(async (id) => {
            const project = await db.getProjectById(id, ctx.user.id);
            if (!project) {
              return null; // Skip projects user doesn't have access to
            }

            const assessments = await db.getProjectAssessments(id);
            const deficiencies = await db.getProjectDeficiencies(id);

            return {
              project,
              assessments,
              deficiencies,
            };
          })
        );

        // Filter out null entries (projects user doesn't have access to)
        const validProjects = projectsData.filter(p => p !== null);

        if (validProjects.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No accessible projects found' });
        }

        const { bulkProjectsToExcel } = await import('./export-utils');
        const buffer = bulkProjectsToExcel(validProjects);
        
        // Convert buffer to base64 for transmission
        const base64 = buffer.toString('base64');
        const timestamp = new Date().toISOString().split('T')[0];
        return { 
          data: base64, 
          filename: `bulk-export-${validProjects.length}-projects-${timestamp}.xlsx`,
        };
      }),

    import: protectedProcedure
      .input(z.object({
        data: z.object({
          version: z.string(),
          project: z.any(),
          assessments: z.array(z.any()).optional(),
          deficiencies: z.array(z.any()).optional(),
          photos: z.array(z.any()).optional(),
          assets: z.array(z.any()).optional(),
          sections: z.array(z.any()).optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const { data } = input;
        
        // Create project with new userId
        const projectData = {
          ...data.project,
          userId: ctx.user.id,
          id: undefined, // Remove old ID
          createdAt: undefined,
          updatedAt: undefined,
        };
        
        const newProjectId = await db.createProject(projectData);
        
        // Import assets first (if any)
        const assetIdMap = new Map<number, number>();
        if (data.assets && data.assets.length > 0) {
          for (const asset of data.assets) {
            const oldAssetId = asset.id;
            const newAssetId = await assetsDb.createAsset({
              ...asset,
              projectId: newProjectId,
              id: undefined,
              createdAt: undefined,
              updatedAt: undefined,
            });
            assetIdMap.set(oldAssetId, newAssetId);
          }
        }
        
        // Import sections (if any)
        const sectionIdMap = new Map<number, number>();
        if (data.sections && data.sections.length > 0) {
          for (const section of data.sections) {
            const oldSectionId = section.id;
            const newSectionId = await db.createBuildingSection({
              ...section,
              projectId: newProjectId,
              id: undefined,
              createdAt: undefined,
              updatedAt: undefined,
            });
            sectionIdMap.set(oldSectionId, newSectionId);
          }
        }
        
        // Import assessments
        const assessmentIdMap = new Map<number, number>();
        if (data.assessments && data.assessments.length > 0) {
          for (const assessment of data.assessments) {
            const oldAssessmentId = assessment.id;
            const oldAssetId = assessment.assetId;
            const oldSectionId = assessment.sectionId;
            
            const newAssessmentId = await db.upsertAssessment({
              ...assessment,
              projectId: newProjectId,
              assetId: oldAssetId ? assetIdMap.get(oldAssetId) : undefined,
              sectionId: oldSectionId ? sectionIdMap.get(oldSectionId) : undefined,
              id: undefined,
              createdAt: undefined,
              updatedAt: undefined,
              assessedAt: undefined,
            });
            assessmentIdMap.set(oldAssessmentId, newAssessmentId);
          }
        }
        
        // Import deficiencies
        if (data.deficiencies && data.deficiencies.length > 0) {
          for (const deficiency of data.deficiencies) {
            const oldAssessmentId = deficiency.assessmentId;
            await db.createDeficiency({
              ...deficiency,
              projectId: newProjectId,
              assessmentId: oldAssessmentId ? assessmentIdMap.get(oldAssessmentId) : undefined,
              id: undefined,
              createdAt: undefined,
              updatedAt: undefined,
            });
          }
        }
        
        // Import photos (note: S3 URLs remain the same)
        if (data.photos && data.photos.length > 0) {
          for (const photo of data.photos) {
            const oldAssessmentId = photo.assessmentId;
            await db.createPhoto({
              ...photo,
              projectId: newProjectId,
              assessmentId: oldAssessmentId ? assessmentIdMap.get(oldAssessmentId) : undefined,
              id: undefined,
              createdAt: undefined,
            });
          }
        }
        
        return { success: true, projectId: newProjectId };
      }),

    stats: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getProjectStats(input.projectId);
      }),

    fci: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getProjectFCI(input.projectId);
      }),

    financialPlanning: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const { getFinancialPlanningData } = await import("./dashboardData");
        return await getFinancialPlanningData(input.projectId);
      }),

    conditionMatrix: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const { getConditionMatrixData } = await import("./dashboardData");
        return await getConditionMatrixData(input.projectId);
      }),

    annualCostBreakdown: protectedProcedure
      .input(z.object({ projectId: z.number(), years: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const { getAnnualCostBreakdown } = await import("./dashboardData");
        return await getAnnualCostBreakdown(input.projectId, input.years);
      }),

    overallCondition: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.calculateOverallBuildingCondition(input.projectId);
      }),
  }),

  assets: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        return await assetsDb.getProjectAssets(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number(), projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        const asset = await assetsDb.getAssetById(input.id, input.projectId);
        if (!asset) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
        }
        return asset;
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        assetType: z.string().optional(),
        address: z.string().optional(),
        yearBuilt: z.number().optional(),
        grossFloorArea: z.number().optional(),
        numberOfStories: z.number().optional(),
        constructionType: z.string().optional(),
        currentReplacementValue: z.string().optional(),
        status: z.enum(["active", "inactive", "demolished"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        const assetId = await assetsDb.createAsset(input);
        return { id: assetId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        assetType: z.string().optional(),
        address: z.string().optional(),
        yearBuilt: z.number().optional(),
        grossFloorArea: z.number().optional(),
        numberOfStories: z.number().optional(),
        constructionType: z.string().optional(),
        currentReplacementValue: z.string().optional(),
        status: z.enum(["active", "inactive", "demolished"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        const { id, projectId, ...data } = input;
        await assetsDb.updateAsset(id, projectId, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        await assetsDb.deleteAsset(input.id, input.projectId);
        return { success: true };
      }),
  }),

  components: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number().optional() }))
      .query(async ({ input }) => {
        const components = await db.getAllBuildingComponents();
        
        // If projectId provided, filter by hierarchy config and merge custom components
        if (input.projectId) {
          const customComps = await customComponentsDb.getCustomComponentsByProject(input.projectId);
          const config = await db.getProjectHierarchyConfig(input.projectId);
          
          if (config) {
            // Filter by max depth
            const maxDepth = config.maxDepth || 3;
            let filtered = components.filter((c: any) => c.level <= maxDepth);
            
            // Filter by enabled components
            if (config.enabledComponents) {
              const enabled = JSON.parse(config.enabledComponents);
              filtered = filtered.filter((c: any) => {
                const majorGroup = (c as any).code.charAt(0);
                return enabled.includes(majorGroup);
              });
            }
            
            // Merge custom components
            return [...filtered, ...customComps.map((c: any) => ({
              ...c,
              isCustom: true
            }))];
          }
          
          // No config, just merge custom components
          return [...components, ...customComps.map((c: any) => ({
            ...c,
            isCustom: true
          }))];
        }
        
        return components;
      }),

    byLevel: publicProcedure
      .input(z.object({ 
        level: z.number(),
        projectId: z.number().optional()
      }))
      .query(async ({ input }) => {
        const components = await db.getBuildingComponentsByLevel(input.level);
        
        // If projectId provided, filter by hierarchy config
        if (input.projectId) {
          const config = await db.getProjectHierarchyConfig(input.projectId);
          
          if (config) {
            // Filter by max depth
            const maxDepth = config.maxDepth || 3;
            if (input.level > maxDepth) return [];
            
            // Filter by enabled components
            if (config.enabledComponents) {
              const enabled = JSON.parse(config.enabledComponents);
              return components.filter(c => {
                const majorGroup = (c as any).code.charAt(0);
                return enabled.includes(majorGroup);
              });
            }
          }
        }
        
        return components;
      }),
    get: protectedProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        return await db.getBuildingComponentByCode(input.code);
      }),
  }),

  assessments: router({
    list: protectedProcedure
      .input(z.object({ 
        projectId: z.number(),
        status: z.enum(["initial", "active", "completed"]).optional()
      }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getProjectAssessmentsByStatus(input.projectId, input.status);
      }),

    statusCounts: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getAssessmentStatusCounts(input.projectId);
      }),

    bulkUpdateStatus: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        assessmentIds: z.array(z.number()),
        status: z.enum(["initial", "active", "completed"])
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.bulkUpdateAssessmentStatus(input.assessmentIds, input.status);
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
        assetId: z.number().optional(),
        componentCode: z.string().optional(),
        condition: z.enum(["good", "fair", "poor", "not_assessed"]).optional(),
        status: z.enum(["initial", "active", "completed"]).optional(),
        conditionPercentage: z.string().optional(),
        componentName: z.string().optional(),
        componentLocation: z.string().optional(),
        observations: z.string().optional(),
        recommendations: z.string().optional(),
        remainingUsefulLife: z.number().optional(),
        expectedUsefulLife: z.number().optional(),
        reviewYear: z.number().optional(),
        lastTimeAction: z.number().optional(),
        estimatedRepairCost: z.number().optional(),
        replacementValue: z.number().optional(),
        actionYear: z.number().optional(),
        hasValidationOverrides: z.number().optional(),
        validationWarnings: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        
        // Get existing assessment to detect changes
        const existing = input.componentCode ? await db.getAssessmentByComponent(input.projectId, input.componentCode) : null;
        const isNew = !existing;
        
        const assessmentId = await db.upsertAssessment({
          ...input,
          assessedAt: new Date(),
        });
        
        // Log to component history
        const { logAssessmentChange, detectChanges } = await import("./componentHistoryService");
        
        const changes = isNew ? undefined : detectChanges(
          {
            condition: existing.condition,
            observations: existing.observations,
            recommendations: existing.recommendations,
            remainingUsefulLife: existing.remainingUsefulLife,
            expectedUsefulLife: existing.expectedUsefulLife,
            estimatedRepairCost: existing.estimatedRepairCost,
            replacementValue: existing.replacementValue,
            status: existing.status,
          },
          {
            condition: input.condition,
            observations: input.observations,
            recommendations: input.recommendations,
            remainingUsefulLife: input.remainingUsefulLife,
            expectedUsefulLife: input.expectedUsefulLife,
            estimatedRepairCost: input.estimatedRepairCost,
            replacementValue: input.replacementValue,
            status: input.status,
          }
        );
        
        if (input.componentCode) {
          await logAssessmentChange({
            projectId: input.projectId,
            componentCode: input.componentCode,
            assessmentId,
            userId: ctx.user.id,
            userName: ctx.user.name || undefined,
            isNew,
            changes,
            richTextFields: {
              ...(input.observations && { observations: input.observations }),
              ...(input.recommendations && { recommendations: input.recommendations }),
            },
          });
        }
        
        // Log status change to audit log if it occurred
        if (existing && input.status && existing.status !== input.status) {
          await db.createAuditLog({
            entityType: "assessment",
            entityId: existing.id,
            action: "update",
            userId: ctx.user.id,
            changes: JSON.stringify({
              field: "status",
              oldValue: existing.status,
              newValue: input.status
            })
          });
        }
        
        // Trigger CI/FCI recalculation
        const { calculateBuildingCI } = await import("./ciCalculationService");
        const { calculateFCI } = await import("./fciCalculationService");
        
        try {
          const ciResult = await calculateBuildingCI(input.projectId);
          const fciResult = await calculateFCI(input.projectId);
          
          // Update project with new CI/FCI values
          await db.updateProject(input.projectId, ctx.user.id, {
            ci: ciResult.ci.toString(),
            fci: fciResult.fci.toString(),
            deferredMaintenanceCost: fciResult.deferredMaintenanceCost.toString(),
            currentReplacementValue: fciResult.currentReplacementValue.toString(),
            lastCalculatedAt: new Date(),
          });
          
          // Save snapshot for historical tracking
          await db.saveCiFciSnapshot({
            projectId: input.projectId,
            level: "building",
            entityId: input.projectId.toString(),
            ci: ciResult.ci.toString(),
            fci: fciResult.fci.toString(),
            deferredMaintenanceCost: fciResult.deferredMaintenanceCost.toString(),
            currentReplacementValue: fciResult.currentReplacementValue.toString(),
            calculationMethod: ciResult.calculationMethod,
          });
        } catch (error) {
          console.error("CI/FCI calculation failed:", error);
          // Don't fail the mutation if calculation fails
        }
        
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
        assessmentId: z.number().optional(),
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
        componentCode: z.string().optional(),
        fileData: z.string(), // base64 encoded
        fileName: z.string(),
        mimeType: z.string(),
        caption: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        altitude: z.number().optional(),
        locationAccuracy: z.number().optional(),
        performOCR: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        
        // Decode base64 and upload to S3
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `projects/${input.projectId}/photos/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Perform OCR if requested
        let ocrText: string | undefined;
        let ocrConfidence: number | undefined;
        if (input.performOCR && input.mimeType.startsWith('image/')) {
          const { extractTextFromImage } = await import("./_core/ocr");
          const ocrResult = await extractTextFromImage(url);
          ocrText = ocrResult.text || undefined;
          ocrConfidence = ocrResult.confidence || undefined;
        }
        
        const photoId = await db.createPhoto({
          projectId: input.projectId,
          assessmentId: input.assessmentId,
          deficiencyId: input.deficiencyId,
          componentCode: input.componentCode,
          fileKey,
          url,
          caption: input.caption,
          mimeType: input.mimeType,
          fileSize: buffer.length,
          latitude: input.latitude?.toString(),
          longitude: input.longitude?.toString(),
          altitude: input.altitude?.toString(),
          locationAccuracy: input.locationAccuracy?.toString(),
          ocrText,
          ocrConfidence: ocrConfidence?.toString(),
        });
        
        return { id: photoId, url, ocrText, ocrConfidence };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePhoto(input.id);
        return { success: true };
      }),

    assessWithAI: protectedProcedure
      .input(z.object({ photoId: z.number() }))
      .mutation(async ({ input }) => {
        // Get photo details
        const photos = await db.getProjectPhotos(0); // This will be filtered below
        const photo = photos.find(p => p.id === input.photoId);
        if (!photo) throw new Error("Photo not found");

        // Assess photo with AI
        const assessment = await assessPhotoWithAI(photo.url);
        
        return assessment;
      }),

    analyzeWithGemini: protectedProcedure
      .input(z.object({
        fileData: z.string(), // base64 encoded image
        componentCode: z.string(),
        componentName: z.string(),
        userNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { analyzeComponentImage } = await import("./geminiService");
        
        const analysis = await analyzeComponentImage(
          input.fileData,
          input.componentCode,
          input.componentName,
          input.userNotes
        );
        
        return analysis;
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

    // Estimate costs for assessments without cost data
    estimateForProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { estimateBatchCosts } = await import('./costEstimationService');
        
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        
        // Get all assessments for the project
        const assessments = await db.getProjectAssessments(input.projectId);
        
        // Filter assessments without cost data
        const assessmentsNeedingEstimates = assessments.filter(
          a => !a.estimatedRepairCost || !a.replacementValue
        );
        
        if (assessmentsNeedingEstimates.length === 0) {
          return { 
            message: 'All assessments already have cost data',
            estimatedCount: 0,
            estimates: []
          };
        }
        
        // Estimate costs
        const estimates = estimateBatchCosts(
          assessmentsNeedingEstimates.map(a => ({
            componentCode: a.componentCode || 'B20',
            componentName: a.componentName || 'Component',
            condition: a.condition || 'fair',
            quantity: 1000, // Default 1000 SF
            usefulLife: 25, // Default 25 years
          }))
        );
        
        // Update assessments with estimated costs
        let updatedCount = 0;
        for (let i = 0; i < assessmentsNeedingEstimates.length; i++) {
          const assessment = assessmentsNeedingEstimates[i];
          const estimate = estimates[i];
          
          if (assessment && estimate) {
            await db.upsertAssessment({
              ...assessment,
              estimatedRepairCost: estimate.estimatedRepairCost,
              replacementValue: estimate.replacementValue,
              remainingUsefulLife: estimate.remainingUsefulLife,
            });
            updatedCount++;
          }
        }
        
        return {
          message: `Estimated costs for ${updatedCount} assessments`,
          estimatedCount: updatedCount,
          estimates: estimates.map((est, i) => ({
            ...est,
            assessmentId: assessmentsNeedingEstimates[i]?.id,
          })),
        };
      }),

    // Estimate cost for a single assessment
    estimateForAssessment: protectedProcedure
      .input(z.object({
        assessmentId: z.number(),
        componentCode: z.string(),
        componentName: z.string(),
        condition: z.string(),
        quantity: z.number().optional(),
        usefulLife: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { estimateComponentCost } = await import('./costEstimationService');
        
        const estimate = estimateComponentCost(
          input.componentCode,
          input.componentName,
          input.condition,
          input.quantity,
          input.usefulLife
        );
        
        // Update the assessment costs directly
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        await dbInstance
          .update(assessments)
          .set({
            estimatedRepairCost: estimate.estimatedRepairCost,
            replacementValue: estimate.replacementValue,
            remainingUsefulLife: estimate.remainingUsefulLife,
            updatedAt: new Date(),
          })
          .where(eq(assessments.id, input.assessmentId));
        
        return estimate;
      }),
  }),

  reports: router({
    generate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        const assessments = await db.getProjectAssessments(input.projectId);
        
        // Fetch photos for each assessment
        const assessmentsWithPhotos = await Promise.all(
          assessments.map(async (assessment) => {
            const photos = await db.getAssessmentPhotos(assessment.id);
            return { ...assessment, photos };
          })
        );
        
        const fciData = await db.getProjectFCI(input.projectId);
        const financialData = await dashboardData.getFinancialPlanningData(input.projectId);
        const conditionData = await dashboardData.getConditionMatrixData(input.projectId);

        // Transform data for report format
        const financialPlanning = financialData.periods.map((period, idx) => ({
          period: period.label,
          structure: financialData.groups.find((g: any) => g.code === 'A')?.periods[idx] || 0,
          enclosure: financialData.groups.find((g: any) => g.code === 'B')?.periods[idx] || 0,
          interior: financialData.groups.find((g: any) => g.code === 'C')?.periods[idx] || 0,
          mep: financialData.groups.find((g: any) => g.code === 'D')?.periods[idx] || 0,
          site: financialData.groups.find((g: any) => g.code === 'G')?.periods[idx] || 0,
        }));

        const conditionMatrix = conditionData.systems.map((s: any) => ({
          system: s.name,
          condition: s.condition.charAt(0).toUpperCase() + s.condition.slice(1),
        }));

        const pdfBuffer = await generateBCAReport({
          project,
          assessments: assessmentsWithPhotos,
          fciData: fciData || { fci: 0, rating: 'N/A', totalRepairCost: 0, totalReplacementValue: 0 },
          financialPlanning,
          conditionMatrix,
        });

        // Upload to S3
        const fileKey = `projects/${input.projectId}/reports/BCA-Report-${Date.now()}.pdf`;
        const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");

        return { url, fileKey };
      }),
  }),

  hierarchy: router({
    // Global templates (admin only)
    templates: router({
      list: protectedProcedure.query(async () => {
        return await db.getHierarchyTemplates();
      }),

      create: protectedProcedure
        .input(z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          isDefault: z.boolean().optional(),
          config: z.object({
            maxDepth: z.number().min(1).max(4),
            componentWeights: z.record(z.string(), z.number()).optional(),
            componentPriorities: z.record(z.string(), z.enum(["low", "medium", "high", "critical"])).optional(),
          }),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
          }

          return await db.createHierarchyTemplate({
            name: input.name,
            description: input.description,
            isDefault: input.isDefault || false,
            config: JSON.stringify(input.config),
            createdBy: ctx.user.id,
          });
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          isDefault: z.boolean().optional(),
          config: z.object({
            maxDepth: z.number().min(1).max(4),
            componentWeights: z.record(z.string(), z.number()).optional(),
            componentPriorities: z.record(z.string(), z.enum(["low", "medium", "high", "critical"])).optional(),
          }).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
          }

          const updates: any = {};
          if (input.name) updates.name = input.name;
          if (input.description !== undefined) updates.description = input.description;
          if (input.isDefault !== undefined) updates.isDefault = input.isDefault;
          if (input.config) updates.config = JSON.stringify(input.config);

          await db.updateHierarchyTemplate(input.id, updates);
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
          }

          await db.deleteHierarchyTemplate(input.id);
          return { success: true };
        }),

      getDefault: publicProcedure.query(async () => {
        return await db.getDefaultHierarchyTemplate();
      }),
    }),

    // Per-project configuration
    project: router({
      get: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ ctx, input }) => {
          const project = await db.getProjectById(input.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
          }

          return await db.getProjectHierarchyConfig(input.projectId);
        }),

      upsert: protectedProcedure
        .input(z.object({
          projectId: z.number(),
          templateId: z.number().optional(),
          maxDepth: z.number().min(1).max(4).optional(),
          componentWeights: z.record(z.string(), z.number()).optional(),
          componentPriorities: z.record(z.string(), z.enum(["low", "medium", "high", "critical"])).optional(),
          enabledComponents: z.array(z.string()).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const project = await db.getProjectById(input.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
          }

          await db.upsertProjectHierarchyConfig({
            projectId: input.projectId,
            templateId: input.templateId,
            maxDepth: input.maxDepth,
            componentWeights: input.componentWeights ? JSON.stringify(input.componentWeights) : undefined,
            componentPriorities: input.componentPriorities ? JSON.stringify(input.componentPriorities) : undefined,
            enabledComponents: input.enabledComponents ? JSON.stringify(input.enabledComponents) : undefined,
          });

          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const project = await db.getProjectById(input.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
          }

          await db.deleteProjectHierarchyConfig(input.projectId);
          return { success: true };
        }),
    }),
  }),

  ratings: router({
    // Rating scales management (admin only)
    scales: router({
      list: protectedProcedure.query(async () => {
        return await db.getAllRatingScales();
      }),

      byType: protectedProcedure
        .input(z.object({ type: z.enum(["fci", "ci", "condition", "priority", "custom"]) }))
        .query(async ({ input }) => {
          return await db.getRatingScalesByType(input.type);
        }),

      getDefault: protectedProcedure
        .input(z.object({ type: z.enum(["fci", "ci", "condition", "priority", "custom"]) }))
        .query(async ({ input }) => {
          return await db.getDefaultRatingScale(input.type);
        }),

      create: protectedProcedure
        .input(z.object({
          name: z.string(),
          description: z.string().optional(),
          type: z.enum(["fci", "ci", "condition", "priority", "custom"]),
          isDefault: z.boolean().optional(),
          minValue: z.number(),
          maxValue: z.number(),
          scaleItems: z.array(z.object({
            value: z.number(),
            label: z.string(),
            description: z.string().optional(),
            color: z.string().optional(),
          })),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
          }

          const scaleId = await db.createRatingScale({
            ...input,
            scaleItems: JSON.stringify(input.scaleItems),
            createdBy: ctx.user.id,
          });

          return { id: scaleId };
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          isDefault: z.boolean().optional(),
          scaleItems: z.array(z.object({
            value: z.number(),
            label: z.string(),
            description: z.string().optional(),
            color: z.string().optional(),
          })).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
          }

          const { id, ...updates } = input;
          await db.updateRatingScale(id, {
            ...updates,
            scaleItems: updates.scaleItems ? JSON.stringify(updates.scaleItems) : undefined,
          });

          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
          }

          await db.deleteRatingScale(input.id);
          return { success: true };
        }),
    }),

    // Project rating configuration
    project: router({
      get: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ ctx, input }) => {
          const project = await db.getProjectById(input.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
          }

          return await db.getProjectRatingConfig(input.projectId);
        }),

      upsert: protectedProcedure
        .input(z.object({
          projectId: z.number(),
          conditionScaleId: z.number().optional(),
          priorityScaleId: z.number().optional(),
          fciScaleId: z.number().optional(),
          useWeightedAverage: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const project = await db.getProjectById(input.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
          }

          await db.upsertProjectRatingConfig(input);
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const project = await db.getProjectById(input.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
          }

          await db.deleteProjectRatingConfig(input.projectId);
          return { success: true };
        }),
    }),
  }),

  buildingSections: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getBuildingSections(input.projectId);
      }),

    byId: protectedProcedure
      .input(z.object({ sectionId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getBuildingSectionById(input.sectionId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        sectionType: z.enum(["original", "extension", "addition", "renovation"]),
        installDate: z.string().optional(),
        expectedLifespan: z.number().optional(),
        grossFloorArea: z.number().optional(),
        numberOfStories: z.number().optional(),
        constructionType: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const sectionId = await db.createBuildingSection(input);
        const section = await db.getBuildingSectionById(sectionId);
        if (!section) throw new Error("Failed to create section");
        return section;
      }),

    update: protectedProcedure
      .input(z.object({
        sectionId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        sectionType: z.enum(["original", "extension", "addition", "renovation"]).optional(),
        installDate: z.string().optional(),
        expectedLifespan: z.number().optional(),
        grossFloorArea: z.number().optional(),
        numberOfStories: z.number().optional(),
        constructionType: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { sectionId, ...data } = input;
        await db.updateBuildingSection(sectionId, data);
        const section = await db.getBuildingSectionById(sectionId);
        if (!section) throw new Error("Section not found");
        return section;
      }),

    delete: protectedProcedure
      .input(z.object({ sectionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteBuildingSection(input.sectionId);
        return { success: true };
      }),

    stats: protectedProcedure
      .input(z.object({ sectionId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getSectionAssessmentStats(input.sectionId);
      }),

    fci: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.calculateOverallBuildingCondition(input.projectId);
      }),

    // AI Document Import - Temporarily disabled due to deployment issues
    // TODO: Re-implement using cloud-based PDF processing
    parseDocument: protectedProcedure
      .input(z.object({
        fileUrl: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: 'AI document import is temporarily unavailable due to technical limitations. Please use manual data entry.'
        });
        /* Disabled - requires cloud PDF processing
        try {
          console.log('[AI Import] Starting document parse:', { mimeType: input.mimeType, fileUrl: input.fileUrl.substring(0, 100) });
          
          const { parseDocument } = await import('./ai-document-parser');
          
          // Fetch the file from storage
          const response = await fetch(input.fileUrl);
          if (!response.ok) {
            console.error('[AI Import] Failed to fetch document:', response.status, response.statusText);
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Failed to fetch document from storage' });
          }
          
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          console.log('[AI Import] Document fetched, size:', buffer.length, 'bytes');
          
          // Parse and extract data
          const extracted = await parseDocument(buffer, input.mimeType);
          console.log('[AI Import] Parse successful:', {
            assessments: extracted.assessments.length,
            deficiencies: extracted.deficiencies.length,
            photos: extracted.photos?.length || 0,
          });
          
          return extracted;
        } catch (error) {
          console.error('[AI Import] Parse failed:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to parse document',
          });
        }
        */
      }),

    // AI Document Import - Commit extracted data to database
    commitAIImport: protectedProcedure
      .input(z.object({
        project: z.object({
          name: z.string(),
          address: z.string().nullable().optional(),
          clientName: z.string().nullable().optional(),
          propertyType: z.string().nullable().optional(),
          constructionType: z.string().nullable().optional(),
          yearBuilt: z.number().nullable().optional(),
          numberOfUnits: z.number().nullable().optional(),
          numberOfStories: z.number().nullable().optional(),
          observations: z.string().nullable().optional(),
        }),
        assessments: z.array(z.object({
          componentCode: z.string(),
          componentName: z.string(),
          componentLocation: z.string().nullable().optional(),
          condition: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']),
          conditionPercentage: z.number().nullable().optional(),
          observations: z.string().nullable().optional(),
          recommendations: z.string().nullable().optional(),
          remainingUsefulLife: z.number().nullable().optional(),
          expectedUsefulLife: z.number().nullable().optional(),
          estimatedRepairCost: z.number().nullable().optional(),
          replacementValue: z.number().nullable().optional(),
        })),
        deficiencies: z.array(z.object({
          componentCode: z.string(),
          title: z.string(),
          description: z.string(),
          location: z.string().nullable().optional(),
          severity: z.enum(['low', 'medium', 'high', 'critical']),
          priority: z.enum(['immediate', 'short_term', 'medium_term', 'long_term']),
          estimatedCost: z.number().nullable().optional(),
          recommendedAction: z.string().nullable().optional(),
        })),
        photos: z.array(z.object({
          url: z.string(),
          fileKey: z.string(),
          caption: z.string().nullable().optional(),
          context: z.string().nullable().optional(),
          componentCode: z.string().nullable().optional(), // Which component this photo relates to
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Create project
        const projectData = {
          ...input.project,
          userId: ctx.user.id,
          status: 'draft' as const,
        };
        
        const projectId = await db.createProject(projectData);
        
        // Create a default asset for the project
        const assetId = await assetsDb.createAsset({
          projectId,
          name: input.project.name || 'Main Building',
          assetType: 'Building',
          status: 'active',
        });
        
        // Create assessments and track their IDs by component code
        const assessmentIdMap = new Map<string, number>();
        
        for (const assessment of input.assessments) {
          // Map AI condition values to database enum
          const conditionMap: Record<string, 'good' | 'fair' | 'poor' | 'not_assessed'> = {
            'excellent': 'good',
            'good': 'good',
            'fair': 'fair',
            'poor': 'poor',
            'critical': 'poor',
          };
          
          const assessmentId = await db.upsertAssessment({
            projectId,
            assetId,
            componentCode: assessment.componentCode,
            componentName: assessment.componentName,
            componentLocation: assessment.componentLocation || null,
            condition: conditionMap[assessment.condition] || 'not_assessed',
            conditionPercentage: assessment.conditionPercentage?.toString() || null,
            observations: assessment.observations || null,
            recommendations: assessment.recommendations || null,
            remainingUsefulLife: assessment.remainingUsefulLife || null,
            expectedUsefulLife: assessment.expectedUsefulLife || null,
            estimatedRepairCost: assessment.estimatedRepairCost || null,
            replacementValue: assessment.replacementValue || null,
            status: 'completed',
            assessedAt: new Date(),
          });
          
          assessmentIdMap.set(assessment.componentCode, assessmentId);
        }
        
        // Create deficiencies linked to assessments
        for (const deficiency of input.deficiencies) {
          const assessmentId = assessmentIdMap.get(deficiency.componentCode);
          
          await db.createDeficiency({
            projectId,
            assessmentId: assessmentId || null,
            ...deficiency,
          });
        }
        
        // Create photos linked to assessments
        let photoCount = 0;
        if (input.photos && input.photos.length > 0) {
          for (const photo of input.photos) {
            // Find the assessment this photo relates to
            const assessmentId = photo.componentCode 
              ? assessmentIdMap.get(photo.componentCode)
              : null;
            
            await db.createPhoto({
              projectId,
              assessmentId: assessmentId || null,
              url: photo.url,
              fileKey: photo.fileKey,
              caption: photo.caption || null,
            });
            
            photoCount++;
          }
        }
        
        return {
          projectId,
          assessmentCount: input.assessments.length,
          deficiencyCount: input.deficiencies.length,
          photoCount,
        };
      }),
  }),

  validation: router({
    // Check validation rules for assessment data
    check: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        assessmentData: z.object({
          componentCode: z.string(),
          condition: z.string().optional(),
          assessedAt: z.date().optional(),
          lastTimeAction: z.number().optional(),
          remainingUsefulLife: z.number().optional(),
          expectedUsefulLife: z.number().optional(),
          estimatedRepairCost: z.number().optional(),
          replacementValue: z.number().optional(),
          actionYear: z.number().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const { validateAssessment } = await import("./validationService");
        const results = await validateAssessment({
          projectId: input.projectId,
          assessmentData: input.assessmentData,
          userId: ctx.user.id,
        });
        return results;
      }),

    // Log validation override
    logOverride: protectedProcedure
      .input(z.object({
        ruleId: z.number(),
        assessmentId: z.number().optional(),
        deficiencyId: z.number().optional(),
        projectId: z.number(),
        fieldName: z.string(),
        originalValue: z.string(),
        overriddenValue: z.string(),
        justification: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { logValidationOverride } = await import("./validationService");
        const overrideId = await logValidationOverride({
          ...input,
          overriddenBy: ctx.user.id,
        });
        return { id: overrideId };
      }),

    // Get validation overrides for a project
    overrides: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getValidationOverrides(input.projectId);
      }),

    // Validation rules management (admin only)
    rules: router({
      list: protectedProcedure.query(async () => {
        return await db.getAllValidationRules();
      }),

      byProject: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ ctx, input }) => {
          const project = await db.getProjectById(input.projectId, ctx.user.id);
          if (!project) throw new Error("Project not found");
          return await db.getValidationRules(input.projectId);
        }),

      create: protectedProcedure
        .input(z.object({
          name: z.string(),
          description: z.string().optional(),
          ruleType: z.enum(["date_range", "numeric_range", "required_field", "custom_logic", "same_year_inspection"]),
          severity: z.enum(["error", "warning", "info"]),
          field: z.string(),
          condition: z.string(), // JSON string
          message: z.string(),
          isActive: z.boolean().optional(),
          projectId: z.number().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
          }
          const ruleId = await db.createValidationRule({
            ...input,
            isActive: input.isActive !== false ? 1 : 0,
            createdBy: ctx.user.id,
          });
          return { id: ruleId };
        }),

      update: protectedProcedure
        .input(z.object({
          ruleId: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          ruleType: z.enum(["date_range", "numeric_range", "required_field", "custom_logic", "same_year_inspection"]).optional(),
          severity: z.enum(["error", "warning", "info"]).optional(),
          field: z.string().optional(),
          condition: z.string().optional(),
          message: z.string().optional(),
          isActive: z.boolean().optional(),
          projectId: z.number().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
          }
          const { ruleId, ...updates } = input;
          await db.updateValidationRule(ruleId, {
            ...updates,
            isActive: updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : undefined,
          });
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ ruleId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
          }
          await db.deleteValidationRule(input.ruleId);
          return { success: true };
        }),

      toggle: protectedProcedure
        .input(z.object({ ruleId: z.number(), isActive: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
          }
          await db.updateValidationRule(input.ruleId, {
            isActive: input.isActive ? 1 : 0,
          });
          return { success: true };
        }),
    }),
  }),

  consultant: router({
    // Download assessment template
    downloadAssessmentTemplate: protectedProcedure.query(async () => {
      const { generateAssessmentTemplate } = await import("./spreadsheetTemplates");
      const buffer = generateAssessmentTemplate();
      return {
        data: buffer.toString("base64"),
        filename: "Assessment_Upload_Template.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

    // Download deficiency template
    downloadDeficiencyTemplate: protectedProcedure.query(async () => {
      const { generateDeficiencyTemplate } = await import("./spreadsheetTemplates");
      const buffer = generateDeficiencyTemplate();
      return {
        data: buffer.toString("base64"),
        filename: "Deficiency_Upload_Template.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

    // Upload and parse spreadsheet
    uploadSpreadsheet: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        dataType: z.enum(["assessments", "deficiencies"]),
        fileData: z.string(), // base64 encoded file
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        // Decode base64 file data
        const buffer = Buffer.from(input.fileData, "base64");

        // Parse spreadsheet
        const { parseAssessmentSpreadsheet, parseDeficiencySpreadsheet } = await import("./spreadsheetTemplates");
        
        let parseResult;
        if (input.dataType === "assessments") {
          parseResult = parseAssessmentSpreadsheet(buffer);
        } else {
          parseResult = parseDeficiencySpreadsheet(buffer);
        }

        // Generate unique submission ID
        const submissionId = `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create submission record
        const dbSubmissionId = await db.createConsultantSubmission({
          projectId: input.projectId,
          submissionId,
          submittedBy: ctx.user.id,
          consultantName: ctx.user.name || undefined,
          consultantEmail: ctx.user.email || undefined,
          dataType: input.dataType,
          fileName: input.fileName,
          totalItems: parseResult.data.length + parseResult.errors.length,
          validItems: parseResult.data.length,
          invalidItems: parseResult.errors.length,
        });

        // Create submission items
        for (let i = 0; i < parseResult.data.length; i++) {
          const item = parseResult.data[i];
          const rowWarnings = parseResult.warnings.filter(w => w.row === i + 2);
          
          await db.createSubmissionItem({
            submissionId: dbSubmissionId,
            projectId: input.projectId,
            itemType: input.dataType === "assessments" ? "assessment" : "deficiency",
            rowNumber: i + 2,
            data: JSON.stringify(item),
            validationStatus: rowWarnings.length > 0 ? "warning" : "valid",
            validationErrors: rowWarnings.length > 0 ? JSON.stringify(rowWarnings) : undefined,
          });
        }

        // Store parse errors as items with error status
        for (const error of parseResult.errors) {
          await db.createSubmissionItem({
            submissionId: dbSubmissionId,
            projectId: input.projectId,
            itemType: input.dataType === "assessments" ? "assessment" : "deficiency",
            rowNumber: error.row,
            data: JSON.stringify({ error: error.message }),
            validationStatus: "error",
            validationErrors: JSON.stringify([error]),
          });
        }

        return {
          submissionId: dbSubmissionId,
          trackingId: submissionId,
          totalItems: parseResult.data.length + parseResult.errors.length,
          validItems: parseResult.data.length,
          invalidItems: parseResult.errors.length,
          warnings: parseResult.warnings.length,
        };
      }),

    // Get my submissions
    mySubmissions: protectedProcedure.query(async ({ ctx }) => {
      return await db.getConsultantSubmissionsByUser(ctx.user.id);
    }),

    // Get submission details
    getSubmission: protectedProcedure
      .input(z.object({ submissionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const submission = await db.getConsultantSubmission(input.submissionId);
        if (!submission) throw new Error("Submission not found");

        // Check access: owner or admin
        if (submission.submittedBy !== ctx.user.id && ctx.user.role !== "admin") {
          throw new Error("Access denied");
        }

        const items = await db.getSubmissionItems(input.submissionId);
        const photos = await db.getSubmissionPhotos(input.submissionId);

        return {
          submission,
          items,
          photos,
        };
      }),

    // Get pending submissions (admin only)
    pendingSubmissions: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Access denied");
      }
      return await db.getPendingSubmissions();
    }),

    // Get submissions by project (admin only)
    projectSubmissions: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        
        return await db.getConsultantSubmissionsByProject(input.projectId);
      }),

    // Review submission item (admin only)
    reviewItem: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        itemStatus: z.enum(["approved", "rejected"]),
        reviewNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Access denied");
        }

        await db.updateSubmissionItemStatus(
          input.itemId,
          input.itemStatus,
          input.reviewNotes
        );

        return { success: true };
      }),

    // Approve submission (admin only)
    approveSubmission: protectedProcedure
      .input(z.object({
        submissionId: z.number(),
        reviewNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Access denied");
        }

        const submission = await db.getConsultantSubmission(input.submissionId);
        if (!submission) throw new Error("Submission not found");

        const items = await db.getSubmissionItems(input.submissionId);

        // Finalize approved items by creating actual assessment/deficiency records
        for (const item of items) {
          // Process all valid items (not errors)
          if (item.validationStatus !== "error") {
            const data = JSON.parse(item.data);

            if (item.itemType === "assessment") {
              const assessmentId = await db.upsertAssessment({
                projectId: submission.projectId,
                assetId: 1, // TODO: Get actual assetId from submission data
                componentCode: data.componentCode,
                condition: data.condition,
                status: data.status || "initial",
                conditionPercentage: data.conditionPercentage,
                observations: data.observations,
                recommendations: data.recommendations,
                remainingUsefulLife: data.remainingUsefulLife,
                expectedUsefulLife: data.expectedUsefulLife,
                reviewYear: data.reviewYear,
                lastTimeAction: data.lastTimeAction,
                estimatedRepairCost: data.estimatedRepairCost,
                replacementValue: data.replacementValue,
                actionYear: data.actionYear,
                assessedAt: new Date(),
              });

              await db.linkSubmissionItemToFinalizedRecord(item.id, "assessment", assessmentId);
            } else if (item.itemType === "deficiency") {
              const deficiencyId = await db.createDeficiency({
                projectId: submission.projectId,
                componentCode: data.componentCode,
                title: data.title,
                description: data.description,
                priority: data.priority === "critical" ? "immediate" : data.priority === "high" ? "short_term" : data.priority === "medium" ? "medium_term" : "long_term",
                status: data.status || "open",
                location: data.location,
                estimatedCost: data.estimatedCost ? data.estimatedCost * 100 : undefined, // Convert to cents
                recommendedAction: data.recommendedAction,
              });

              await db.linkSubmissionItemToFinalizedRecord(item.id, "deficiency", deficiencyId);
            }
          }
        }

        // Update submission status
        await db.updateSubmissionStatus(
          input.submissionId,
          "approved",
          ctx.user.id,
          input.reviewNotes
        );

        await db.finalizeSubmission(input.submissionId, ctx.user.id);

        return { success: true };
      }),

    // Reject submission (admin only)
    rejectSubmission: protectedProcedure
      .input(z.object({
        submissionId: z.number(),
        reviewNotes: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Access denied");
        }

        await db.updateSubmissionStatus(
          input.submissionId,
          "rejected",
          ctx.user.id,
          input.reviewNotes
        );

        return { success: true };
      }),
  }),

  history: router({
    // Get component history timeline
    component: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        componentCode: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getComponentHistory(input.projectId, input.componentCode);
      }),

    // Get project-wide history
    project: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        limit: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getProjectHistory(input.projectId, input.limit);
      }),

    // Search history with filters
    search: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        searchTerm: z.string().optional(),
        changeType: z.string().optional(),
        userId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.searchComponentHistory(input);
      }),

    // Get history for specific assessment
    assessment: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getHistoryByAssessment(input.assessmentId);
      }),

    // Get history for specific deficiency
    deficiency: protectedProcedure
      .input(z.object({ deficiencyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getHistoryByDeficiency(input.deficiencyId);
      }),
  }),

  predictions: router({
    // Get component prediction using curves or ML
    component: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        componentCode: z.string(),
        method: z.enum(["curve", "ml", "hybrid"]).default("curve"),
      }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        const { predictDeteriorationML } = await import("./mlPredictionService");
        const { predictFailureYear, calculateRemainingLife, generateCurveData, calculateConfidenceScore, DEFAULT_CURVES } = await import("./deteriorationCurveService");

        // Get component assessments for historical data
        const assessments = await db.getAssessmentsByComponent(input.projectId, input.componentCode);
        
        if (input.method === "ml" || input.method === "hybrid") {
          // Use ML prediction
          const historicalData = assessments.map((a: any) => ({
            assessmentDate: a.assessedAt,
            condition: a.conditionPercentage ? parseInt(a.conditionPercentage) : 70,
            age: new Date().getFullYear() - (a.reviewYear || new Date().getFullYear()),
            observations: a.observations || undefined,
          }));

          const component = await db.getComponentByCode(input.componentCode);
          const installYear = project.yearBuilt || new Date().getFullYear() - 20;

          const mlPrediction = await predictDeteriorationML(
            input.componentCode,
            installYear,
            historicalData
          );

          // Save prediction to history
          await db.savePredictionHistory({
            projectId: input.projectId,
            componentCode: input.componentCode,
            predictedFailureYear: mlPrediction.predictedFailureYear,
            predictedRemainingLife: mlPrediction.predictedRemainingLife,
            predictedCondition: mlPrediction.currentConditionEstimate,
            confidenceScore: mlPrediction.confidenceScore,
            predictionMethod: "ml_model",
            modelVersion: "v1.0",
          });

          return mlPrediction;
        } else {
          // Use curve-based prediction
          const config = await db.getComponentDeteriorationConfig(input.projectId, input.componentCode);
          const componentType = input.componentCode.substring(0, 3); // e.g., "B30" from "B3010"
          const curves = DEFAULT_CURVES[componentType] || DEFAULT_CURVES.default;
          const activeCurve = config?.activeCurve || "design";
          const params = curves[activeCurve];

          const installYear = project.yearBuilt || new Date().getFullYear() - 20;
          const failureYear = predictFailureYear(params, installYear);
          const remainingLife = calculateRemainingLife(params, installYear, 70);
          const curveData = generateCurveData(params, installYear, 30);

          const confidence = calculateConfidenceScore(
            assessments.length,
            assessments.length > 0 ? 5 : 0,
            assessments.length > 0 ? 1 : 10
          );

          // Save prediction to history
          await db.savePredictionHistory({
            projectId: input.projectId,
            componentCode: input.componentCode,
            predictedFailureYear: failureYear,
            predictedRemainingLife: remainingLife,
            predictedCondition: 70,
            confidenceScore: confidence,
            predictionMethod: "curve_based",
            curveUsed: activeCurve,
          });

          return {
            predictedFailureYear: failureYear,
            predictedRemainingLife: remainingLife,
            currentConditionEstimate: 70,
            confidenceScore: confidence,
            curveUsed: activeCurve,
            dataPoints: curveData,
          };
        }
      }),

    // Get all project predictions
    project: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        method: z.enum(["curve", "ml", "hybrid"]).default("hybrid"),
      }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        const { predictDeteriorationML, determineRiskLevel } = await import("./mlPredictionService");
        const components = await db.getProjectComponents(input.projectId);
        const predictions = [];

        for (const component of components) {
          const assessments = await db.getAssessmentsByComponent(input.projectId, component.componentCode);
          if (assessments.length > 0) {
            const historicalData = assessments.map((a: any) => ({
              assessmentDate: a.assessedAt,
              condition: a.conditionPercentage ? parseInt(a.conditionPercentage) : 70,
              age: new Date().getFullYear() - (a.reviewYear || new Date().getFullYear()),
              observations: a.observations || undefined,
            }));

            const installYear = project.yearBuilt || new Date().getFullYear() - 20;
            const mlPrediction = await predictDeteriorationML(
              component.componentCode,
              installYear,
              historicalData
            );

            const riskLevel = determineRiskLevel(
              mlPrediction.predictedRemainingLife,
              mlPrediction.currentConditionEstimate
            );

            predictions.push({
              componentCode: component.componentCode,
              componentName: component.name,
              lastAssessment: assessments[0].assessedAt,
              condition: assessments[0].conditionPercentage,
              predictedFailureYear: mlPrediction.predictedFailureYear,
              remainingLife: mlPrediction.predictedRemainingLife,
              confidenceScore: mlPrediction.confidenceScore,
              riskLevel,
              aiInsights: mlPrediction.insights,
            });
          }
        }

        return predictions;
      }),

    // Get/create deterioration curves
    curves: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        componentType: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getDeteriorationCurves(input.projectId, input.componentType);
      }),

    // Create custom curve
    createCurve: protectedProcedure
      .input(z.object({
        name: z.string(),
        curveType: z.enum(["best", "design", "worst"]),
        componentType: z.string().optional(),
        param1: z.number(),
        param2: z.number(),
        param3: z.number(),
        param4: z.number(),
        param5: z.number(),
        param6: z.number(),
        description: z.string().optional(),
        projectId: z.number().optional(),
        interpolationType: z.enum(["linear", "polynomial", "exponential"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const curveId = await db.createDeteriorationCurve({
          ...input,
          createdBy: ctx.user.id,
        });
        return { curveId };
      }),

    // Update curve parameters
    updateCurve: protectedProcedure
      .input(z.object({
        curveId: z.number(),
        param1: z.number().optional(),
        param2: z.number().optional(),
        param3: z.number().optional(),
        param4: z.number().optional(),
        param5: z.number().optional(),
        param6: z.number().optional(),
        description: z.string().optional(),
        interpolationType: z.enum(["linear", "polynomial", "exponential"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { curveId, ...updateData } = input;
        await db.updateDeteriorationCurve(curveId, updateData);
        return { success: true };
      }),

    // Get prediction history
    history: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        componentCode: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return await db.getPredictionHistory(input.projectId, input.componentCode);
      }),
  }),

  exports: router({
    deficiencies: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        const deficiencies = await db.getProjectDeficiencies(input.projectId);
        const csv = generateDeficienciesCSV(deficiencies);
        
        return { csv, filename: `deficiencies-${input.projectId}-${Date.now()}.csv` };
      }),

    assessments: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        const assessments = await db.getProjectAssessments(input.projectId);
        const csv = generateAssessmentsCSV(assessments);
        
        return { csv, filename: `assessments-${input.projectId}-${Date.now()}.csv` };
      }),

    costs: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        const deficiencies = await db.getProjectDeficiencies(input.projectId);
        const csv = generateCostEstimatesCSV(deficiencies);
        
        return { csv, filename: `cost-estimates-${input.projectId}-${Date.now()}.csv` };
      }),
  }),

  cifci: router({
    getSnapshots: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        
        return await db.getCiFciSnapshots(input.projectId);
      }),

    recalculate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        
        const { calculateBuildingCI } = await import("./ciCalculationService");
        const { calculateFCI } = await import("./fciCalculationService");
        
        const ciResult = await calculateBuildingCI(input.projectId);
        const fciResult = await calculateFCI(input.projectId);
        
        await db.updateProject(input.projectId, ctx.user.id, {
          ci: ciResult.ci.toString(),
          fci: fciResult.fci.toString(),
          deferredMaintenanceCost: fciResult.deferredMaintenanceCost.toString(),
          currentReplacementValue: fciResult.currentReplacementValue.toString(),
          lastCalculatedAt: new Date(),
        });
        
        await db.saveCiFciSnapshot({
          projectId: input.projectId,
          level: "building",
          entityId: input.projectId.toString(),
          ci: ciResult.ci.toString(),
          fci: fciResult.fci.toString(),
          deferredMaintenanceCost: fciResult.deferredMaintenanceCost.toString(),
          currentReplacementValue: fciResult.currentReplacementValue.toString(),
          calculationMethod: ciResult.calculationMethod,
        });
        
        return { ci: ciResult.ci, fci: fciResult.fci };
      }),
  }),

  // Optimization and scenario modeling
  optimization: optimizationRouter,

  // Multi-criteria prioritization and capital budget planning
  prioritization: prioritizationRouter,

  // Risk assessment (PoF × CoF methodology)
  risk: riskRouter,

  // Facility summary and lifecycle management
  facility: facilityRouter,

  // Multiple maintenance entries tracking
  maintenance: maintenanceRouter,

  // 3D digital twin models and annotations
  models: modelsRouter,

  // Advanced BI dashboards and portfolio analytics
  dashboards: dashboardsRouter,
  esg: esgRouter,
  media: mediaRouter,

  // Custom components management
  customComponents: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await customComponentsDb.getCustomComponentsByProject(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        code: z.string().min(1).max(20),
        level: z.number().min(2).max(3),
        parentCode: z.string().min(1).max(20),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if code already exists
        const exists = await customComponentsDb.customComponentCodeExists(input.projectId, input.code);
        if (exists) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Component code already exists for this project",
          });
        }

        await customComponentsDb.createCustomComponent({
          ...input,
          createdBy: ctx.user.id,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await customComponentsDb.deleteCustomComponent(input.id, input.projectId, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
