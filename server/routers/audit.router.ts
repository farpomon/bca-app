import { z } from "zod";
import { eq, and, gte, lte, like, or, desc } from "drizzle-orm";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { auditLog, users } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

/**
 * Audit log router - admin-only access to system audit logs
 */
export const auditRouter = router({
  /**
   * Get audit logs with filtering
   */
  list: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(50),
        userId: z.number().optional(),
        entityType: z.string().optional(),
        action: z.enum(["create", "update", "delete"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const offset = (input.page - 1) * input.pageSize;

      // Build where conditions
      const conditions = [];
      
      if (input.userId) {
        conditions.push(eq(auditLog.userId, input.userId));
      }
      
      if (input.entityType) {
        conditions.push(eq(auditLog.entityType, input.entityType));
      }
      
      if (input.action) {
        conditions.push(eq(auditLog.action, input.action));
      }
      
      if (input.startDate) {
        conditions.push(gte(auditLog.createdAt, input.startDate));
      }
      
      if (input.endDate) {
        conditions.push(lte(auditLog.createdAt, input.endDate));
      }

      // Get logs with user information
      let query = db
        .select({
          id: auditLog.id,
          userId: auditLog.userId,
          userName: users.name,
          userEmail: users.email,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          action: auditLog.action,
          changes: auditLog.changes,
          metadata: auditLog.metadata,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.userId, users.id))
        .orderBy(desc(auditLog.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const logs = await query;

      // Get total count for pagination
      const countQuery = conditions.length > 0
        ? db.select().from(auditLog).where(and(...conditions))
        : db.select().from(auditLog);
      
      const totalLogs = await countQuery;
      const totalCount = totalLogs.length;

      return {
        logs: logs.map(log => ({
          ...log,
          changes: log.changes ? JSON.parse(log.changes) : null,
          metadata: log.metadata ? JSON.parse(log.metadata) : null,
        })),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / input.pageSize),
        },
      };
    }),

  /**
   * Get audit log statistics
   */
  getStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const allLogs = await db.select().from(auditLog);

    const stats = {
      totalLogs: allLogs.length,
      byAction: {
        create: allLogs.filter(log => log.action === "create").length,
        update: allLogs.filter(log => log.action === "update").length,
        delete: allLogs.filter(log => log.action === "delete").length,
      },
      byEntityType: allLogs.reduce((acc, log) => {
        acc[log.entityType] = (acc[log.entityType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentActivity: allLogs.slice(0, 10),
    };

    return stats;
  }),

  /**
   * Get all unique entity types for filtering
   */
  getEntityTypes: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const logs = await db.select({ entityType: auditLog.entityType }).from(auditLog);
    const uniqueTypes = Array.from(new Set(logs.map(log => log.entityType)));
    
    return uniqueTypes;
  }),
});
