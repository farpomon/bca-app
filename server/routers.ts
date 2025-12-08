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
        componentCode: z.string(),
        condition: z.enum(["good", "fair", "poor", "not_assessed"]),
        status: z.enum(["initial", "active", "completed"]).optional(),
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
        hasValidationOverrides: z.number().optional(),
        validationWarnings: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        
        // Get existing assessment to detect changes
        const existing = await db.getAssessmentByComponent(input.projectId, input.componentCode);
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

  audit: router({
    // Get audit logs for an entity
    logs: protectedProcedure
      .input(z.object({ entityType: z.string(), entityId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAuditLogs(input.entityType, input.entityId);
      }),

    // Get all recent audit logs (admin only)
    allLogs: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return await db.getAllAuditLogs(input.limit);
      }),

    // Get version history for an assessment
    assessmentVersions: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAssessmentVersions(input.assessmentId);
      }),

    // Get version history for a deficiency
    deficiencyVersions: protectedProcedure
      .input(z.object({ deficiencyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDeficiencyVersions(input.deficiencyId);
      }),

    // Get version history for a project
    projectVersions: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        return await db.getProjectVersions(input.projectId);
      }),

    // Create manual audit log entry
    createLog: protectedProcedure
      .input(z.object({
        entityType: z.string(),
        entityId: z.number(),
        action: z.enum(["create", "update", "delete"]),
        changes: z.string(), // JSON string
        changeDescription: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createAuditLog({
          userId: ctx.user.id,
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          changes: input.changes,
          metadata: JSON.stringify({
            timestamp: new Date().toISOString(),
            changeDescription: input.changeDescription,
          }),
        });
        return { success: true };
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
      .input(z.object({ sectionId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getSectionFCI(input.sectionId);
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
});

export type AppRouter = typeof appRouter;
