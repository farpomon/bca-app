import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import {
  reportTemplates,
  reportTemplateSections,
  generatedReports,
  generatedReportSections,
  reportConfigurations,
  reportHistory,
  projects,
  assessments,
  deficiencies,
  assets,
  photos,
} from "../../drizzle/schema";
import { ReportGeneratorService } from "../services/reportGenerator.service";
import { storagePut } from "../storage";
import * as db from "../db";
import * as dashboardData from "../dashboardData";

// Section types available for templates
const sectionTypeEnum = z.enum([
  'narrative',
  'data_table',
  'chart',
  'photo_gallery',
  'cost_summary',
  'executive_summary',
  'condition_summary',
  'deficiencies_list',
  'component_details',
  'risk_assessment',
  'recommendations',
  'appendix',
]);

// Report type enum
const reportTypeEnum = z.enum([
  'executive_summary',
  'detailed_assessment',
  'financial_analysis',
  'compliance',
  'risk_assessment',
  'optimization_results',
  'custom',
]);

export const customReportsRouter = router({
  // ============================================
  // TEMPLATE MANAGEMENT
  // ============================================

  /**
   * List all available templates for the user
   * Includes global templates, company templates, and user's own templates
   */
  templates: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        type: reportTypeEnum.optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        const conditions = [
          eq(reportTemplates.isGlobal, 1),
          eq(reportTemplates.createdBy, ctx.user.id),
        ];

        if (ctx.user.companyId) {
          conditions.push(eq(reportTemplates.companyId, ctx.user.companyId));
        }

        if (input?.projectId) {
          conditions.push(eq(reportTemplates.projectId, input.projectId));
        }

        let query = database
          .select()
          .from(reportTemplates)
          .where(or(...conditions))
          .orderBy(desc(reportTemplates.isDefault), desc(reportTemplates.createdAt));

        const templates = await query;

        // Filter by type if specified
        if (input?.type) {
          return templates.filter(t => t.type === input.type);
        }

        return templates;
      }),

    /**
     * Get a single template with its sections
     */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        const [template] = await database
          .select()
          .from(reportTemplates)
          .where(eq(reportTemplates.id, input.id))
          .limit(1);

        if (!template) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
        }

        // Check access
        const hasAccess = 
          template.isGlobal === 1 ||
          template.createdBy === ctx.user.id ||
          (template.companyId && template.companyId === ctx.user.companyId);

        if (!hasAccess) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied to this template' });
        }

        // Get sections
        const sections = await database
          .select()
          .from(reportTemplateSections)
          .where(eq(reportTemplateSections.templateId, input.id))
          .orderBy(reportTemplateSections.displayOrder);

        // Get configuration
        const [config] = await database
          .select()
          .from(reportConfigurations)
          .where(eq(reportConfigurations.templateId, input.id))
          .limit(1);

        return {
          ...template,
          sections,
          configuration: config || null,
        };
      }),

    /**
     * Create a new report template
     */
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        type: reportTypeEnum,
        stakeholder: z.string().max(100).optional(),
        isGlobal: z.boolean().default(false),
        projectId: z.number().optional(),
        sections: z.array(z.object({
          sectionName: z.string().min(1).max(255),
          sectionType: sectionTypeEnum,
          displayOrder: z.number(),
          defaultContent: z.string().optional(),
          isRequired: z.boolean().default(true),
        })).optional(),
        configuration: z.object({
          logoUrl: z.string().optional(),
          headerText: z.string().optional(),
          footerText: z.string().optional(),
          colorScheme: z.any().optional(),
          fontOptions: z.any().optional(),
          pageOptions: z.any().optional(),
          coverPageOptions: z.any().optional(),
          tableOfContents: z.boolean().default(true),
          disclaimerText: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        // Only admins can create global templates
        if (input.isGlobal && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can create global templates' });
        }

        // Create template
        const [result] = await database
          .insert(reportTemplates)
          .values({
            name: input.name,
            description: input.description,
            type: input.type,
            stakeholder: input.stakeholder,
            isGlobal: input.isGlobal ? 1 : 0,
            isDefault: 0,
            userId: ctx.user.id,
            projectId: input.projectId,
            createdBy: ctx.user.id,
            companyId: ctx.user.companyId,
          });

        const templateId = result.insertId;

        // Create sections if provided
        if (input.sections && input.sections.length > 0) {
          await database.insert(reportTemplateSections).values(
            input.sections.map(section => ({
              templateId,
              sectionName: section.sectionName,
              sectionType: section.sectionType,
              displayOrder: section.displayOrder,
              defaultContent: section.defaultContent,
              isRequired: section.isRequired ? 1 : 0,
            }))
          );
        }

        // Create configuration if provided
        if (input.configuration) {
          await database.insert(reportConfigurations).values({
            templateId,
            logoUrl: input.configuration.logoUrl,
            headerText: input.configuration.headerText,
            footerText: input.configuration.footerText,
            colorScheme: input.configuration.colorScheme,
            fontOptions: input.configuration.fontOptions,
            pageOptions: input.configuration.pageOptions,
            coverPageOptions: input.configuration.coverPageOptions,
            tableOfContents: input.configuration.tableOfContents ? 1 : 0,
            disclaimerText: input.configuration.disclaimerText,
          });
        }

        return { id: templateId };
      }),

    /**
     * Update an existing template
     */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        type: reportTypeEnum.optional(),
        stakeholder: z.string().max(100).optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        // Check ownership
        const [template] = await database
          .select()
          .from(reportTemplates)
          .where(eq(reportTemplates.id, input.id))
          .limit(1);

        if (!template) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
        }

        const canEdit = 
          template.createdBy === ctx.user.id ||
          (template.isGlobal === 1 && ctx.user.role === 'admin');

        if (!canEdit) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot edit this template' });
        }

        const { id, ...updates } = input;
        
        await database
          .update(reportTemplates)
          .set({
            ...updates,
            isDefault: updates.isDefault !== undefined ? (updates.isDefault ? 1 : 0) : undefined,
          })
          .where(eq(reportTemplates.id, id));

        return { success: true };
      }),

    /**
     * Delete a template
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        // Check ownership
        const [template] = await database
          .select()
          .from(reportTemplates)
          .where(eq(reportTemplates.id, input.id))
          .limit(1);

        if (!template) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
        }

        const canDelete = 
          template.createdBy === ctx.user.id ||
          (template.isGlobal === 1 && ctx.user.role === 'admin');

        if (!canDelete) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot delete this template' });
        }

        // Delete sections first (cascade should handle this, but be explicit)
        await database.delete(reportTemplateSections).where(eq(reportTemplateSections.templateId, input.id));
        await database.delete(reportConfigurations).where(eq(reportConfigurations.templateId, input.id));
        await database.delete(reportTemplates).where(eq(reportTemplates.id, input.id));

        return { success: true };
      }),

    /**
     * Duplicate a template
     */
    duplicate: protectedProcedure
      .input(z.object({
        id: z.number(),
        newName: z.string().min(1).max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        // Get original template
        const [original] = await database
          .select()
          .from(reportTemplates)
          .where(eq(reportTemplates.id, input.id))
          .limit(1);

        if (!original) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
        }

        // Create new template
        const [result] = await database
          .insert(reportTemplates)
          .values({
            name: input.newName,
            description: original.description,
            type: original.type,
            stakeholder: original.stakeholder,
            isGlobal: 0,
            isDefault: 0,
            userId: ctx.user.id,
            projectId: null,
            createdBy: ctx.user.id,
            companyId: ctx.user.companyId,
          });

        const newTemplateId = result.insertId;

        // Copy sections
        const sections = await database
          .select()
          .from(reportTemplateSections)
          .where(eq(reportTemplateSections.templateId, input.id));

        if (sections.length > 0) {
          await database.insert(reportTemplateSections).values(
            sections.map(s => ({
              templateId: newTemplateId,
              sectionName: s.sectionName,
              sectionType: s.sectionType,
              displayOrder: s.displayOrder,
              defaultContent: s.defaultContent,
              isRequired: s.isRequired,
            }))
          );
        }

        // Copy configuration
        const [config] = await database
          .select()
          .from(reportConfigurations)
          .where(eq(reportConfigurations.templateId, input.id))
          .limit(1);

        if (config) {
          await database.insert(reportConfigurations).values({
            templateId: newTemplateId,
            logoUrl: config.logoUrl,
            headerText: config.headerText,
            footerText: config.footerText,
            colorScheme: config.colorScheme,
            fontOptions: config.fontOptions,
            pageOptions: config.pageOptions,
            coverPageOptions: config.coverPageOptions,
            tableOfContents: config.tableOfContents,
            disclaimerText: config.disclaimerText,
          });
        }

        return { id: newTemplateId };
      }),
  }),

  // ============================================
  // SECTION MANAGEMENT
  // ============================================

  sections: router({
    /**
     * Add a section to a template
     */
    add: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        sectionName: z.string().min(1).max(255),
        sectionType: sectionTypeEnum,
        displayOrder: z.number(),
        defaultContent: z.string().optional(),
        isRequired: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        // Check template ownership
        const [template] = await database
          .select()
          .from(reportTemplates)
          .where(eq(reportTemplates.id, input.templateId))
          .limit(1);

        if (!template || (template.createdBy !== ctx.user.id && !(template.isGlobal === 1 && ctx.user.role === 'admin'))) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot modify this template' });
        }

        const [result] = await database
          .insert(reportTemplateSections)
          .values({
            templateId: input.templateId,
            sectionName: input.sectionName,
            sectionType: input.sectionType,
            displayOrder: input.displayOrder,
            defaultContent: input.defaultContent,
            isRequired: input.isRequired ? 1 : 0,
          });

        return { id: result.insertId };
      }),

    /**
     * Update a section
     */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        sectionName: z.string().min(1).max(255).optional(),
        sectionType: sectionTypeEnum.optional(),
        displayOrder: z.number().optional(),
        defaultContent: z.string().optional(),
        isRequired: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        const { id, ...updates } = input;

        await database
          .update(reportTemplateSections)
          .set({
            ...updates,
            isRequired: updates.isRequired !== undefined ? (updates.isRequired ? 1 : 0) : undefined,
          })
          .where(eq(reportTemplateSections.id, id));

        return { success: true };
      }),

    /**
     * Delete a section
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        await database.delete(reportTemplateSections).where(eq(reportTemplateSections.id, input.id));
        return { success: true };
      }),

    /**
     * Reorder sections
     */
    reorder: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        sectionOrders: z.array(z.object({
          id: z.number(),
          displayOrder: z.number(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        for (const section of input.sectionOrders) {
          await database
            .update(reportTemplateSections)
            .set({ displayOrder: section.displayOrder })
            .where(eq(reportTemplateSections.id, section.id));
        }

        return { success: true };
      }),
  }),

  // ============================================
  // REPORT GENERATION
  // ============================================

  /**
   * Generate a report from a template
   */
  generate: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      templateId: z.number().optional(),
      reportName: z.string().min(1).max(255),
      format: z.enum(['pdf', 'excel', 'word', 'html']).default('pdf'),
      sectionContent: z.array(z.object({
        sectionId: z.number().optional(),
        sectionName: z.string(),
        sectionType: sectionTypeEnum,
        content: z.string().optional(),
        displayOrder: z.number(),
      })).optional(),
      options: z.object({
        includePhotos: z.boolean().default(true),
        includeCharts: z.boolean().default(true),
        dateRange: z.object({
          start: z.string().optional(),
          end: z.string().optional(),
        }).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const isAdmin = ctx.user.role === 'admin';
      const isSuperAdmin = ctx.user.isSuperAdmin === 1;

      // Verify project access
      const project = await db.getProjectById(input.projectId, ctx.user.id, ctx.user.company, isAdmin, ctx.user.companyId, isSuperAdmin);
      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
      }

      // Get template if specified
      let template = null;
      let templateSections: any[] = [];
      let configuration = null;

      if (input.templateId) {
        [template] = await database
          .select()
          .from(reportTemplates)
          .where(eq(reportTemplates.id, input.templateId))
          .limit(1);

        if (template) {
          templateSections = await database
            .select()
            .from(reportTemplateSections)
            .where(eq(reportTemplateSections.templateId, input.templateId))
            .orderBy(reportTemplateSections.displayOrder);

          [configuration] = await database
            .select()
            .from(reportConfigurations)
            .where(eq(reportConfigurations.templateId, input.templateId))
            .limit(1);
        }
      }

      // Gather report data
      const projectAssessments = await db.getProjectAssessments(input.projectId);
      const projectDeficiencies = await db.getProjectDeficiencies(input.projectId);
      const projectAssets = await db.getProjectAssets(input.projectId);
      
      // Get photos if needed
      let projectPhotos: any[] = [];
      if (input.options?.includePhotos) {
        for (const assessment of projectAssessments) {
          const assessmentPhotos = await db.getAssessmentPhotos(assessment.id);
          projectPhotos.push(...assessmentPhotos);
        }
      }

      // Get financial data
      const fciData = await db.getProjectFCI(input.projectId);
      const financialData = await dashboardData.getFinancialPlanningData(input.projectId);
      const conditionData = await dashboardData.getConditionMatrixData(input.projectId);

      // Prepare report data
      const reportData = {
        project,
        assessments: projectAssessments,
        deficiencies: projectDeficiencies,
        photos: projectPhotos,
        assets: projectAssets,
        facilitySummary: {
          condition: {
            overallRating: fciData?.rating || 'N/A',
            healthScore: fciData ? Math.round((1 - fciData.fci / 100) * 100) : 0,
            fci: fciData?.fci || 0,
          },
          financial: {
            identifiedCosts: fciData?.totalRepairCost || 0,
            plannedCosts: 0,
            executedCosts: 0,
            totalCosts: fciData?.totalRepairCost || 0,
            replacementValue: fciData?.totalReplacementValue || 0,
          },
        },
      };

      // Generate report using service
      const reportService = new ReportGeneratorService();
      
      // Convert template sections to the format expected by the service
      const sectionsForReport = (input.sectionContent || templateSections).map((s: any) => ({
        id: s.id || s.sectionId || 0,
        templateId: input.templateId || 0,
        sectionType: s.sectionType,
        title: s.sectionName,
        orderIndex: s.displayOrder,
        isEnabled: 1,
        layoutOptions: null,
        contentOptions: s.content ? { customText: s.content } : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const generatedReport = await reportService.generateReport(
        template || {
          id: 0,
          name: input.reportName,
          description: null,
          type: 'custom',
          stakeholder: null,
          isGlobal: 0,
          isDefault: 0,
          userId: ctx.user.id,
          projectId: input.projectId,
          createdBy: ctx.user.id,
          companyId: ctx.user.companyId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        sectionsForReport,
        configuration,
        reportData,
        input.format
      );

      // Upload to S3
      const timestamp = Date.now();
      const fileKey = `projects/${input.projectId}/custom-reports/${input.reportName.replace(/\s+/g, '-')}-${timestamp}.${input.format === 'excel' ? 'xlsx' : input.format === 'word' ? 'docx' : input.format}`;
      const { url } = await storagePut(fileKey, generatedReport.buffer, generatedReport.mimeType);

      // Save to generated reports table
      const [reportResult] = await database
        .insert(generatedReports)
        .values({
          projectId: input.projectId,
          templateId: input.templateId,
          reportName: input.reportName,
          reportType: template?.type || 'custom',
          status: 'finalized',
          generatedBy: ctx.user.id,
          pdfUrl: input.format === 'pdf' ? url : null,
          docxUrl: input.format === 'word' ? url : null,
          xlsxUrl: input.format === 'excel' ? url : null,
          metadata: {
            format: input.format,
            options: input.options,
            generatedAt: new Date().toISOString(),
          },
        });

      // Save sections content
      if (input.sectionContent && input.sectionContent.length > 0) {
        await database.insert(generatedReportSections).values(
          input.sectionContent.map(s => ({
            reportId: reportResult.insertId,
            templateSectionId: s.sectionId,
            sectionName: s.sectionName,
            sectionType: s.sectionType,
            displayOrder: s.displayOrder,
            content: s.content,
          }))
        );
      }

      // Add to report history
      await database.insert(reportHistory).values({
        projectId: input.projectId,
        templateId: input.templateId || 0,
        userId: ctx.user.id,
        format: input.format,
        fileName: generatedReport.fileName,
        fileUrl: url,
        fileSize: generatedReport.fileSize,
        status: 'completed',
      });

      return {
        id: reportResult.insertId,
        url,
        fileName: generatedReport.fileName,
        fileSize: generatedReport.fileSize,
        mimeType: generatedReport.mimeType,
      };
    }),

  // ============================================
  // GENERATED REPORTS MANAGEMENT
  // ============================================

  generated: router({
    /**
     * List generated reports for a project
     */
    list: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        limit: z.number().default(50),
      }))
      .query(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        const reports = await database
          .select()
          .from(generatedReports)
          .where(eq(generatedReports.projectId, input.projectId))
          .orderBy(desc(generatedReports.createdAt))
          .limit(input.limit);

        return reports;
      }),

    /**
     * Get a generated report with its sections
     */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        const [report] = await database
          .select()
          .from(generatedReports)
          .where(eq(generatedReports.id, input.id))
          .limit(1);

        if (!report) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' });
        }

        const sections = await database
          .select()
          .from(generatedReportSections)
          .where(eq(generatedReportSections.reportId, input.id))
          .orderBy(generatedReportSections.displayOrder);

        return { ...report, sections };
      }),

    /**
     * Delete a generated report
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        const [report] = await database
          .select()
          .from(generatedReports)
          .where(eq(generatedReports.id, input.id))
          .limit(1);

        if (!report) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' });
        }

        if (report.generatedBy !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot delete this report' });
        }

        await database.delete(generatedReportSections).where(eq(generatedReportSections.reportId, input.id));
        await database.delete(generatedReports).where(eq(generatedReports.id, input.id));

        return { success: true };
      }),
  }),

  // ============================================
  // REPORT HISTORY
  // ============================================

  history: router({
    /**
     * Get report generation history for a project
     */
    list: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        limit: z.number().default(50),
      }))
      .query(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        const history = await database
          .select()
          .from(reportHistory)
          .where(eq(reportHistory.projectId, input.projectId))
          .orderBy(desc(reportHistory.generatedAt))
          .limit(input.limit);

        return history;
      }),
  }),

  // ============================================
  // CONFIGURATION MANAGEMENT
  // ============================================

  configuration: router({
    /**
     * Get configuration for a template
     */
    get: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        const [config] = await database
          .select()
          .from(reportConfigurations)
          .where(eq(reportConfigurations.templateId, input.templateId))
          .limit(1);

        return config || null;
      }),

    /**
     * Update configuration for a template
     */
    update: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        logoUrl: z.string().optional(),
        headerText: z.string().optional(),
        footerText: z.string().optional(),
        colorScheme: z.any().optional(),
        fontOptions: z.any().optional(),
        pageOptions: z.any().optional(),
        coverPageOptions: z.any().optional(),
        tableOfContents: z.boolean().optional(),
        disclaimerText: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        const { templateId, ...updates } = input;

        // Check if config exists
        const [existing] = await database
          .select()
          .from(reportConfigurations)
          .where(eq(reportConfigurations.templateId, templateId))
          .limit(1);

        if (existing) {
          await database
            .update(reportConfigurations)
            .set({
              ...updates,
              tableOfContents: updates.tableOfContents !== undefined ? (updates.tableOfContents ? 1 : 0) : undefined,
            })
            .where(eq(reportConfigurations.templateId, templateId));
        } else {
          await database.insert(reportConfigurations).values({
            templateId,
            ...updates,
            tableOfContents: updates.tableOfContents ? 1 : 0,
          });
        }

        return { success: true };
      }),
  }),

  // ============================================
  // DEFAULT TEMPLATES
  // ============================================

  /**
   * Get default templates for quick start
   */
  getDefaultTemplates: protectedProcedure.query(async ({ ctx }) => {
    return [
      {
        id: 'executive-summary',
        name: 'Executive Summary',
        description: 'High-level overview for stakeholders and decision makers',
        type: 'executive_summary',
        sections: [
          { sectionName: 'Executive Summary', sectionType: 'narrative', displayOrder: 1 },
          { sectionName: 'Key Findings', sectionType: 'narrative', displayOrder: 2 },
          { sectionName: 'Condition Overview', sectionType: 'chart', displayOrder: 3 },
          { sectionName: 'Financial Summary', sectionType: 'cost_summary', displayOrder: 4 },
          { sectionName: 'Recommendations', sectionType: 'narrative', displayOrder: 5 },
        ],
      },
      {
        id: 'detailed-assessment',
        name: 'Detailed Assessment Report',
        description: 'Comprehensive building condition assessment with all components',
        type: 'detailed_assessment',
        sections: [
          { sectionName: 'Executive Summary', sectionType: 'narrative', displayOrder: 1 },
          { sectionName: 'Building Overview', sectionType: 'narrative', displayOrder: 2 },
          { sectionName: 'Condition Summary', sectionType: 'data_table', displayOrder: 3 },
          { sectionName: 'Component Details', sectionType: 'data_table', displayOrder: 4 },
          { sectionName: 'Deficiencies', sectionType: 'data_table', displayOrder: 5 },
          { sectionName: 'Photo Documentation', sectionType: 'photo_gallery', displayOrder: 6 },
          { sectionName: 'Cost Analysis', sectionType: 'cost_summary', displayOrder: 7 },
          { sectionName: 'Recommendations', sectionType: 'narrative', displayOrder: 8 },
          { sectionName: 'Appendix', sectionType: 'appendix', displayOrder: 9 },
        ],
      },
      {
        id: 'financial-analysis',
        name: 'Financial Analysis Report',
        description: 'Focus on costs, FCI, and capital planning',
        type: 'financial_analysis',
        sections: [
          { sectionName: 'Financial Overview', sectionType: 'narrative', displayOrder: 1 },
          { sectionName: 'FCI Analysis', sectionType: 'chart', displayOrder: 2 },
          { sectionName: 'Cost Breakdown', sectionType: 'cost_summary', displayOrder: 3 },
          { sectionName: 'Capital Planning', sectionType: 'data_table', displayOrder: 4 },
          { sectionName: 'Priority Recommendations', sectionType: 'narrative', displayOrder: 5 },
        ],
      },
    ];
  }),
});
