import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, gte, lte, count, sql } from "drizzle-orm";
import { emailDeliveryLog } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const emailDeliveryLogsRouter = router({
  /**
   * List email delivery logs with filtering (admin only)
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["sent", "delivered", "failed", "pending", "all"]).optional().default("all"),
        emailType: z.enum(["admin_notification", "user_confirmation", "user_approved", "user_rejected", "mfa_code", "password_reset", "other", "all"]).optional().default("all"),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Build query with filters
      const conditions = [];

      if (input.status !== "all") {
        conditions.push(eq(emailDeliveryLog.status, input.status));
      }

      if (input.emailType !== "all") {
        conditions.push(eq(emailDeliveryLog.emailType, input.emailType));
      }

      if (input.startDate) {
        conditions.push(gte(emailDeliveryLog.createdAt, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(emailDeliveryLog.createdAt, input.endDate));
      }

      let query = db.select().from(emailDeliveryLog);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const logs = await query
        .orderBy(desc(emailDeliveryLog.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count for pagination
      let countQuery = db.select({ count: count() }).from(emailDeliveryLog);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as any;
      }
      const totalResult = await countQuery;
      const total = totalResult[0]?.count || 0;

      return {
        logs,
        total,
        hasMore: input.offset + logs.length < total,
      };
    }),

  /**
   * Get email delivery statistics (admin only)
   */
  getStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Build date filter
      const conditions = [];
      if (input.startDate) {
        conditions.push(gte(emailDeliveryLog.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(emailDeliveryLog.createdAt, input.endDate));
      }

      let query = db.select().from(emailDeliveryLog);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const allLogs = await query;

      // Calculate statistics
      const stats = {
        total: allLogs.length,
        sent: allLogs.filter((log) => log.status === "sent").length,
        delivered: allLogs.filter((log) => log.status === "delivered").length,
        failed: allLogs.filter((log) => log.status === "failed").length,
        pending: allLogs.filter((log) => log.status === "pending").length,
        byType: {
          admin_notification: allLogs.filter((log) => log.emailType === "admin_notification").length,
          user_confirmation: allLogs.filter((log) => log.emailType === "user_confirmation").length,
          user_approved: allLogs.filter((log) => log.emailType === "user_approved").length,
          user_rejected: allLogs.filter((log) => log.emailType === "user_rejected").length,
          mfa_code: allLogs.filter((log) => log.emailType === "mfa_code").length,
          password_reset: allLogs.filter((log) => log.emailType === "password_reset").length,
          other: allLogs.filter((log) => log.emailType === "other").length,
        },
      };

      return stats;
    }),

  /**
   * Get a single email delivery log by ID (admin only)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const log = await db
        .select()
        .from(emailDeliveryLog)
        .where(eq(emailDeliveryLog.id, input.id))
        .limit(1);

      if (log.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email log not found" });
      }

      return log[0];
    }),
});
