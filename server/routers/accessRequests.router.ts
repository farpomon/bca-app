import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { accessRequests, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
// import { logAuditEvent } from "../db/audit"; // TODO: Add audit logging

export const accessRequestsRouter = router({
  /**
   * Submit a new access request (public - for new users)
   */
  submit: publicProcedure
    .input(
      z.object({
        openId: z.string(),
        fullName: z.string().min(1),
        email: z.string().email(),
        companyName: z.string().min(1),
        city: z.string().min(1),
        phoneNumber: z.string().optional(),
        useCase: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if user already has a pending or approved request
      const existing = await db
        .select()
        .from(accessRequests)
        .where(eq(accessRequests.openId, input.openId))
        .limit(1);

      if (existing.length > 0) {
        const status = existing[0]!.status;
        if (status === "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You already have a pending access request. Please wait for admin approval.",
          });
        }
        if (status === "approved") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Your access has already been approved. Please try logging in again.",
          });
        }
      }

      // Create new access request
      await db.insert(accessRequests).values({
        openId: input.openId,
        fullName: input.fullName,
        email: input.email,
        companyName: input.companyName,
        city: input.city,
        phoneNumber: input.phoneNumber || null,
        useCase: input.useCase || null,
        status: "pending",
      });

      return { success: true, message: "Access request submitted successfully" };
    }),

  /**
   * Get current user's access request status
   */
  getMyRequest: publicProcedure.input(z.object({ openId: z.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const request = await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.openId, input.openId))
      .orderBy(desc(accessRequests.submittedAt))
      .limit(1);

    return request.length > 0 ? request[0] : null;
  }),

  /**
   * List all access requests (admin only)
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected", "all"]).optional().default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let query = db.select().from(accessRequests);

      if (input.status !== "all") {
        query = query.where(eq(accessRequests.status, input.status)) as any;
      }

      const requests = await query.orderBy(desc(accessRequests.submittedAt));

      return requests;
    }),

  /**
   * Approve an access request and set up user profile (admin only)
   */
  approve: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        company: z.string().min(1),
        city: z.string().min(1),
        role: z.enum(["viewer", "editor", "project_manager", "admin"]),
        accountStatus: z.enum(["active", "trial"]),
        trialDays: z.number().optional(),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get the access request
      const request = await db.select().from(accessRequests).where(eq(accessRequests.id, input.requestId)).limit(1);

      if (request.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Access request not found" });
      }

      const accessRequest = request[0]!;

      // Calculate trial end date if applicable
      let trialEndsAt = null;
      if (input.accountStatus === "trial" && input.trialDays) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + input.trialDays);
        trialEndsAt = trialEnd;
      }

      // Update or create user record
      const existingUser = await db.select().from(users).where(eq(users.openId, accessRequest.openId)).limit(1);

      if (existingUser.length > 0) {
        // Update existing user
        await db
          .update(users)
          .set({
            company: input.company,
            city: input.city,
            role: input.role,
            accountStatus: input.accountStatus,
            trialEndsAt: trialEndsAt?.toISOString() || null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.openId, accessRequest.openId));
      } else {
        // Create new user
        await db.insert(users).values({
          openId: accessRequest.openId,
          name: accessRequest.fullName,
          email: accessRequest.email,
          company: input.company,
          city: input.city,
          role: input.role,
          accountStatus: input.accountStatus,
          trialEndsAt: trialEndsAt?.toISOString() || null,
        });
      }

      // Update access request status
      await db
        .update(accessRequests)
        .set({
          status: "approved",
          reviewedAt: new Date().toISOString(),
          reviewedBy: ctx.user.id,
          adminNotes: input.adminNotes || null,
        })
        .where(eq(accessRequests.id, input.requestId));

      // TODO: Log audit event
      // await logAuditEvent({
      //   userId: ctx.user.id,
      //   action: "approve_access_request",
      //   entityType: "access_request",
      //   entityId: input.requestId,
      //   changes: {
      //     company: input.company,
      //     city: input.city,
      //     role: input.role,
      //     accountStatus: input.accountStatus,
      //   },
      // });

      return { success: true, message: "Access request approved successfully" };
    }),

  /**
   * Reject an access request (admin only)
   */
  reject: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        rejectionReason: z.string().min(1),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Update access request status
      await db
        .update(accessRequests)
        .set({
          status: "rejected",
          reviewedAt: new Date().toISOString(),
          reviewedBy: ctx.user.id,
          rejectionReason: input.rejectionReason,
          adminNotes: input.adminNotes || null,
        })
        .where(eq(accessRequests.id, input.requestId));

      // TODO: Log audit event
      // await logAuditEvent({
      //   userId: ctx.user.id,
      //   action: "reject_access_request",
      //   entityType: "access_request",
      //   entityId: input.requestId,
      //   changes: {
      //     rejectionReason: input.rejectionReason,
      //   },
      // });

      return { success: true, message: "Access request rejected" };
    }),

  /**
   * Get pending request count (admin only)
   */
  getPendingCount: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const pending = await db.select().from(accessRequests).where(eq(accessRequests.status, "pending"));

    return { count: pending.length };
  }),
});
