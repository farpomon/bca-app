import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  dataRetentionPolicies, 
  dataDisposalRequests, 
  encryptionKeyMetadata 
} from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const dataSecurityRouter = router({
  // Get all retention policies
  getRetentionPolicies: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    
    return await db.select().from(dataRetentionPolicies).orderBy(desc(dataRetentionPolicies.createdAt));
  }),

  // Get active retention policies
  getActiveRetentionPolicies: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    
    return await db
      .select()
      .from(dataRetentionPolicies)
      .where(eq(dataRetentionPolicies.isActive, 1))
      .orderBy(dataRetentionPolicies.dataType);
  }),

  // Update retention policy
  updateRetentionPolicy: adminProcedure
    .input(z.object({
      id: z.number(),
      retentionPeriodYears: z.number().min(1).max(50),
      description: z.string().optional(),
      isActive: z.number().min(0).max(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(dataRetentionPolicies)
        .set({
          retentionPeriodYears: input.retentionPeriodYears,
          description: input.description,
          isActive: input.isActive,
        })
        .where(eq(dataRetentionPolicies.id, input.id));

      return { success: true };
    }),

  // Get encryption key metadata
  getEncryptionKeys: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    
    return await db.select().from(encryptionKeyMetadata).orderBy(desc(encryptionKeyMetadata.createdAt));
  }),

  // Request data disposal
  requestDataDisposal: adminProcedure
    .input(z.object({
      requestType: z.enum(["project", "user_data", "audit_logs", "backups", "full_account"]),
      targetId: z.number().optional(),
      targetType: z.string().optional(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.insert(dataDisposalRequests).values({
        requestType: input.requestType,
        targetId: input.targetId,
        targetType: input.targetType,
        requestedBy: ctx.user.id,
        reason: input.reason,
        status: "pending",
      });

      return { success: true, requestId: Number((result as any).insertId) };
    }),

  // Get disposal requests
  getDisposalRequests: adminProcedure
    .input(z.object({
      status: z.enum(["pending", "approved", "in_progress", "completed", "rejected"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      let query = db.select().from(dataDisposalRequests);
      
      if (input?.status) {
        query = query.where(eq(dataDisposalRequests.status, input.status)) as any;
      }

      return await query.orderBy(desc(dataDisposalRequests.requestedAt));
    }),

  // Approve disposal request
  approveDisposalRequest: adminProcedure
    .input(z.object({
      requestId: z.number(),
      disposalMethod: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(dataDisposalRequests)
        .set({
          status: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date().toISOString(),
          disposalMethod: input.disposalMethod,
        })
        .where(eq(dataDisposalRequests.id, input.requestId));

      return { success: true };
    }),

  // Reject disposal request
  rejectDisposalRequest: adminProcedure
    .input(z.object({
      requestId: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(dataDisposalRequests)
        .set({
          status: "rejected",
          approvedBy: ctx.user.id,
          approvedAt: new Date().toISOString(),
          notes: input.reason,
        })
        .where(eq(dataDisposalRequests.id, input.requestId));

      return { success: true };
    }),

  // Complete disposal request
  completeDisposalRequest: adminProcedure
    .input(z.object({
      requestId: z.number(),
      verificationHash: z.string(),
      backupPurgeCompleted: z.boolean(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(dataDisposalRequests)
        .set({
          status: "completed",
          completedAt: new Date().toISOString(),
          verificationHash: input.verificationHash,
          backupPurgeStatus: input.backupPurgeCompleted ? "completed" : "failed",
          backupPurgeCompletedAt: input.backupPurgeCompleted ? new Date().toISOString() : null,
          notes: input.notes,
        })
        .where(eq(dataDisposalRequests.id, input.requestId));

      return { success: true };
    }),

  // Get data security summary
  getSecuritySummary: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [policies, disposalRequests, encryptionKeys] = await Promise.all([
      db.select().from(dataRetentionPolicies).where(eq(dataRetentionPolicies.isActive, 1)),
      db.select().from(dataDisposalRequests).where(eq(dataDisposalRequests.status, "pending")),
      db.select().from(encryptionKeyMetadata).where(eq(encryptionKeyMetadata.keyStatus, "active")),
    ]);

    return {
      activePolicies: policies.length,
      pendingDisposals: disposalRequests.length,
      activeEncryptionKeys: encryptionKeys.length,
      defaultRetentionYears: 7,
    };
  }),
});
