import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import * as criteriaAuditDb from "../db/criteriaAudit.db";

/**
 * Criteria Audit Router
 * Endpoints for viewing criteria change history and audit logs
 */

export const criteriaAuditRouter = router({
  /**
   * Get audit history for a specific criteria
   */
  getCriteriaHistory: protectedProcedure
    .input(z.object({ criteriaId: z.number() }))
    .query(async ({ input }) => {
      return await criteriaAuditDb.getCriteriaAuditHistory(input.criteriaId);
    }),

  /**
   * Get recent audit history for all criteria
   */
  getRecentHistory: adminProcedure
    .input(z.object({ limit: z.number().optional().default(100) }))
    .query(async ({ input }) => {
      return await criteriaAuditDb.getRecentCriteriaAuditHistory(input.limit);
    }),

  /**
   * Get audit statistics
   */
  getAuditStats: adminProcedure.query(async () => {
    return await criteriaAuditDb.getCriteriaAuditStats();
  }),
});
