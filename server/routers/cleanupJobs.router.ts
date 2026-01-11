import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { runCleanupJob, sendCleanupReportNotification, type CleanupMode } from "../cleanupJobs";
import { getDb } from "../db";
import { cleanupReports } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";

/**
 * Admin-only procedure
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
 * Cleanup Jobs Router
 * Provides endpoints for running and managing cleanup jobs
 */
export const cleanupJobsRouter = router({
  /**
   * Run cleanup job manually
   */
  runJob: adminProcedure
    .input(
      z.object({
        mode: z.enum(['read_only', 'auto_fix']).default('read_only'),
      })
    )
    .mutation(async ({ input }) => {
      const result = await runCleanupJob(input.mode as CleanupMode);
      return result;
    }),

  /**
   * Get all cleanup reports
   */
  listReports: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const { page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const reports = await db.select()
        .from(cleanupReports)
        .orderBy(desc(cleanupReports.runTimestamp))
        .limit(pageSize)
        .offset(offset);

      // Get total count
      const countResult = await db.select()
        .from(cleanupReports);

      return {
        reports,
        totalCount: countResult.length,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.length / pageSize),
      };
    }),

  /**
   * Get a single cleanup report by ID
   */
  getReport: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const reports = await db.select()
        .from(cleanupReports)
        .where(eq(cleanupReports.id, input.id))
        .limit(1);

      if (reports.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cleanup report not found',
        });
      }

      return reports[0];
    }),

  /**
   * Get the latest cleanup report
   */
  getLatest: adminProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const reports = await db.select()
        .from(cleanupReports)
        .orderBy(desc(cleanupReports.runTimestamp))
        .limit(1);

      return reports[0] ?? null;
    }),

  /**
   * Send notification for a cleanup report
   */
  sendNotification: adminProcedure
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ input }) => {
      await sendCleanupReportNotification(input.reportId);
      return { success: true };
    }),
});
