import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import * as db from "./db";
import * as dashboardData from "./dashboardData";
import { generateBCAReport } from "./reportGenerator";
import { generateDeficienciesCSV, generateAssessmentsCSV, generateCostEstimatesCSV } from "./exportUtils";
import { assessPhotoWithAI } from "./photoAssessment";

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

  components: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number().optional() }))
      .query(async ({ input }) => {
        const components = await db.getAllBuildingComponents();
        
        // If projectId provided, filter by hierarchy config
        if (input.projectId) {
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
            
            return filtered;
          }
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
        conditionPercentage: z.string().optional(),
        observations: z.string().optional(),
        recommendations: z.string().optional(),
        remainingUsefulLife: z.number().optional(),
        expectedUsefulLife: z.number().optional(),
        reviewYear: z.number().optional(),
        lastTimeAction: z.number().optional(),
        estimatedRepairCost: z.number().optional(),
        replacementValue: z.number().optional(),
        actionYear: z.number().optional(),
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
          componentCode: input.componentCode,
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
});

export type AppRouter = typeof appRouter;
