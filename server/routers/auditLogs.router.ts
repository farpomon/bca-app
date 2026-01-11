import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAuditLogs,
  getAuditLogById,
  getAuditLogsForEntity,
  getRecentAuditLogsForUser,
  getAuditLogStats,
  exportAuditLogsToCSV,
  type AuditLogFilters,
} from "../auditLogDb";

/**
 * Admin-only procedure
 * Ensures only users with admin role can access audit logs
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  return next({ ctx });
});

/**
 * Audit Logs Router
 * Provides endpoints for querying and exporting audit logs
 */
export const auditLogsRouter = router({
  /**
   * Get paginated audit logs with filters
   */
  list: adminProcedure
    .input(
      z.object({
        // Filters
        userId: z.number().optional(),
        companyId: z.number().optional(),
        actionType: z.enum(['create', 'update', 'delete', 'recalculate', 'import', 'export', 'bulk_delete', 'bulk_update']).optional(),
        entityType: z.enum([
          'project',
          'asset',
          'assessment',
          'deficiency',
          'photo',
          'criteria',
          'cycle',
          'allocation',
          'analytics',
          'ranking',
          'esg_rating',
          'report',
          'user',
          'company',
          'building_code',
          'maintenance_schedule',
          'capital_plan',
          'risk_assessment',
          'timeline_event',
        ]).optional(),
        module: z.string().optional(),
        status: z.enum(['success', 'failed', 'partial']).optional(),
        startDate: z.string().optional(), // ISO date string
        endDate: z.string().optional(), // ISO date string
        searchTerm: z.string().optional(),
        
        // Pagination
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, ...filters } = input;
      
      return await getAuditLogs(filters as AuditLogFilters, { page, pageSize });
    }),

  /**
   * Get a single audit log by ID
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const log = await getAuditLogById(input.id);
      
      if (!log) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Audit log not found',
        });
      }

      return log;
    }),

  /**
   * Get audit logs for a specific entity
   */
  getForEntity: adminProcedure
    .input(
      z.object({
        entityType: z.enum([
          'project',
          'asset',
          'assessment',
          'deficiency',
          'photo',
          'criteria',
          'cycle',
          'allocation',
          'analytics',
          'ranking',
          'esg_rating',
          'report',
          'user',
          'company',
          'building_code',
          'maintenance_schedule',
          'capital_plan',
          'risk_assessment',
          'timeline_event',
        ]),
        entityId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await getAuditLogsForEntity(input.entityType, input.entityId);
    }),

  /**
   * Get recent audit logs for the current user
   */
  getMyRecent: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return await getRecentAuditLogsForUser(ctx.user.id, input.limit);
    }),

  /**
   * Get audit log statistics
   */
  getStats: adminProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        companyId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getAuditLogStats(input as AuditLogFilters);
    }),

  /**
   * Export audit logs to CSV
   */
  exportCSV: adminProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        companyId: z.number().optional(),
        actionType: z.enum(['create', 'update', 'delete', 'recalculate', 'import', 'export', 'bulk_delete', 'bulk_update']).optional(),
        entityType: z.enum([
          'project',
          'asset',
          'assessment',
          'deficiency',
          'photo',
          'criteria',
          'cycle',
          'allocation',
          'analytics',
          'ranking',
          'esg_rating',
          'report',
          'user',
          'company',
          'building_code',
          'maintenance_schedule',
          'capital_plan',
          'risk_assessment',
          'timeline_event',
        ]).optional(),
        module: z.string().optional(),
        status: z.enum(['success', 'failed', 'partial']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        searchTerm: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const csv = await exportAuditLogsToCSV(input as AuditLogFilters);
      
      return {
        csv,
        filename: `audit-logs-${new Date().toISOString().split('T')[0]}.csv`,
      };
    }),
});
