import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import * as templatesDb from "../db/buildingTemplates.db";

// ============================================
// Building Type Templates Router
// ============================================

export const buildingTemplatesRouter = router({
  // ============================================
  // Building Type Templates
  // ============================================
  
  templates: router({
    list: protectedProcedure
      .input(z.object({
        companyId: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const companyId = input?.companyId ?? ctx.user.companyId;
        return templatesDb.getBuildingTypeTemplates(companyId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const template = await templatesDb.getTemplateWithSystems(input.id);
        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }
        return template;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        buildingClass: z.enum(['class_a', 'class_b', 'class_c']).default('class_b'),
        propertyType: z.string().min(1),
        constructionType: z.string().optional(),
        typicalYearBuiltRange: z.string().optional(),
        typicalGrossFloorArea: z.number().optional(),
        typicalNumberOfStories: z.number().optional(),
        isDefault: z.number().default(0),
        companyId: z.number().optional(),
        systems: z.array(z.object({
          componentCode: z.string().min(1),
          componentName: z.string().min(1),
          defaultServiceLife: z.number().min(1),
          defaultReplacementCost: z.string().optional(),
          defaultCostUnit: z.string().optional(),
          defaultQuantityFormula: z.string().optional(),
          typicalCondition: z.enum(['good', 'fair', 'poor']).optional(),
          priority: z.number().optional(),
          isRequired: z.number().default(0),
          notes: z.string().optional(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { systems, ...templateData } = input;
        
        // Create the template
        const templateId = await templatesDb.createBuildingTypeTemplate({
          ...templateData,
          createdBy: ctx.user.id,
        });

        // Create systems if provided
        if (systems && systems.length > 0) {
          const systemsWithTemplateId = systems.map((s) => ({
            ...s,
            templateId,
          }));
          await templatesDb.createTemplateSystemsBatch(systemsWithTemplateId);
        }

        return { id: templateId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        buildingClass: z.enum(['class_a', 'class_b', 'class_c']).optional(),
        propertyType: z.string().optional(),
        constructionType: z.string().optional(),
        typicalYearBuiltRange: z.string().optional(),
        typicalGrossFloorArea: z.number().optional(),
        typicalNumberOfStories: z.number().optional(),
        isDefault: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await templatesDb.updateBuildingTypeTemplate(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await templatesDb.deleteBuildingTypeTemplate(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // Template Systems
  // ============================================
  
  systems: router({
    list: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ input }) => {
        return templatesDb.getTemplateSystems(input.templateId);
      }),

    create: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        componentCode: z.string().min(1),
        componentName: z.string().min(1),
        defaultServiceLife: z.number().min(1),
        defaultReplacementCost: z.string().optional(),
        defaultCostUnit: z.string().optional(),
        defaultQuantityFormula: z.string().optional(),
        typicalCondition: z.enum(['good', 'fair', 'poor']).optional(),
        priority: z.number().optional(),
        isRequired: z.number().default(0),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await templatesDb.createTemplateSystem(input);
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        componentCode: z.string().optional(),
        componentName: z.string().optional(),
        defaultServiceLife: z.number().optional(),
        defaultReplacementCost: z.string().optional(),
        defaultCostUnit: z.string().optional(),
        defaultQuantityFormula: z.string().optional(),
        typicalCondition: z.enum(['good', 'fair', 'poor']).optional(),
        priority: z.number().optional(),
        isRequired: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await templatesDb.updateTemplateSystem(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await templatesDb.deleteTemplateSystem(input.id);
        return { success: true };
      }),

    bulkCreate: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        systems: z.array(z.object({
          componentCode: z.string().min(1),
          componentName: z.string().min(1),
          defaultServiceLife: z.number().min(1),
          defaultReplacementCost: z.string().optional(),
          defaultCostUnit: z.string().optional(),
          defaultQuantityFormula: z.string().optional(),
          typicalCondition: z.enum(['good', 'fair', 'poor']).optional(),
          priority: z.number().optional(),
          isRequired: z.number().default(0),
          notes: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const systemsWithTemplateId = input.systems.map((s) => ({
          ...s,
          templateId: input.templateId,
        }));
        await templatesDb.createTemplateSystemsBatch(systemsWithTemplateId);
        return { success: true, count: input.systems.length };
      }),
  }),

  // ============================================
  // Design Service Life Values
  // ============================================
  
  serviceLifeValues: router({
    list: protectedProcedure
      .input(z.object({
        companyId: z.number().optional(),
        componentCode: z.string().optional(),
        buildingClass: z.enum(['class_a', 'class_b', 'class_c', 'all']).optional(),
        propertyType: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const companyId = input?.companyId ?? ctx.user.companyId;
        return templatesDb.getDesignServiceLifeValues(companyId, {
          componentCode: input?.componentCode,
          buildingClass: input?.buildingClass,
          propertyType: input?.propertyType,
        });
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const value = await templatesDb.getDesignServiceLifeValueById(input.id);
        if (!value) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Service life value not found",
          });
        }
        return value;
      }),

    getForComponent: protectedProcedure
      .input(z.object({
        componentCode: z.string(),
        buildingClass: z.enum(['class_a', 'class_b', 'class_c']).optional(),
        propertyType: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return templatesDb.getServiceLifeForComponent(
          input.componentCode,
          input.buildingClass,
          input.propertyType,
          ctx.user.companyId
        );
      }),

    create: protectedProcedure
      .input(z.object({
        componentCode: z.string().min(1),
        componentName: z.string().min(1),
        buildingClass: z.enum(['class_a', 'class_b', 'class_c', 'all']).default('all'),
        propertyType: z.string().optional(),
        designServiceLife: z.number().min(1),
        minServiceLife: z.number().optional(),
        maxServiceLife: z.number().optional(),
        bestCaseServiceLife: z.number().optional(),
        worstCaseServiceLife: z.number().optional(),
        dataSource: z.string().optional(),
        notes: z.string().optional(),
        companyId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await templatesDb.createDesignServiceLifeValue({
          ...input,
          createdBy: ctx.user.id,
        });
        return { id };
      }),

    bulkCreate: protectedProcedure
      .input(z.object({
        values: z.array(z.object({
          componentCode: z.string().min(1),
          componentName: z.string().min(1),
          buildingClass: z.enum(['class_a', 'class_b', 'class_c', 'all']).default('all'),
          propertyType: z.string().optional(),
          designServiceLife: z.number().min(1),
          minServiceLife: z.number().optional(),
          maxServiceLife: z.number().optional(),
          bestCaseServiceLife: z.number().optional(),
          worstCaseServiceLife: z.number().optional(),
          dataSource: z.string().optional(),
          notes: z.string().optional(),
        })),
        companyId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const valuesWithCreator = input.values.map((v) => ({
          ...v,
          companyId: input.companyId,
          createdBy: ctx.user.id,
        }));
        await templatesDb.createDesignServiceLifeValuesBatch(valuesWithCreator);
        return { success: true, count: input.values.length };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        componentCode: z.string().optional(),
        componentName: z.string().optional(),
        buildingClass: z.enum(['class_a', 'class_b', 'class_c', 'all']).optional(),
        propertyType: z.string().optional(),
        designServiceLife: z.number().optional(),
        minServiceLife: z.number().optional(),
        maxServiceLife: z.number().optional(),
        bestCaseServiceLife: z.number().optional(),
        worstCaseServiceLife: z.number().optional(),
        dataSource: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await templatesDb.updateDesignServiceLifeValue(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await templatesDb.deleteDesignServiceLifeValue(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // Bulk Service Life Updates
  // ============================================
  
  bulkUpdates: router({
    list: protectedProcedure
      .input(z.object({
        companyId: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const companyId = input?.companyId ?? ctx.user.companyId;
        return templatesDb.getBulkServiceLifeUpdates(companyId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const update = await templatesDb.getBulkServiceLifeUpdateById(input.id);
        if (!update) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Bulk update not found",
          });
        }
        return update;
      }),

    getAffectedItems: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return templatesDb.getBulkUpdateAffectedItems(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        updateType: z.enum(['component', 'building_class', 'property_type', 'all']),
        componentCode: z.string().optional(),
        buildingClass: z.enum(['class_a', 'class_b', 'class_c', 'all']).optional(),
        propertyType: z.string().optional(),
        previousServiceLife: z.number().optional(),
        newServiceLife: z.number().min(1),
        percentageChange: z.string().optional(),
        reason: z.string().optional(),
        companyId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await templatesDb.createBulkServiceLifeUpdate(input);
        return { id };
      }),

    execute: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return templatesDb.executeBulkServiceLifeUpdate(
          input.id,
          ctx.user.id,
          ctx.user.companyId
        );
      }),

    rollback: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return templatesDb.rollbackBulkServiceLifeUpdate(input.id, ctx.user.id);
      }),

    preview: protectedProcedure
      .input(z.object({
        updateType: z.enum(['component', 'building_class', 'property_type', 'all']),
        componentCode: z.string().optional(),
        buildingClass: z.enum(['class_a', 'class_b', 'class_c', 'all']).optional(),
        propertyType: z.string().optional(),
        newServiceLife: z.number().min(1),
      }))
      .query(async ({ ctx, input }) => {
        // This would return a preview of what would be affected
        // For now, return a placeholder - actual implementation would query assessments
        return {
          estimatedAffectedAssessments: 0,
          estimatedAffectedProjects: 0,
          componentCode: input.componentCode,
          newServiceLife: input.newServiceLife,
        };
      }),
  }),
});
