/**
 * MFA Recovery Router
 * Handles API endpoints for MFA recovery with admin approval
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createRecoveryRequest,
  getRecoveryRequest,
  getUserPendingRecoveryRequest,
  getAllPendingRecoveryRequests,
  approveRecoveryRequest,
  rejectRecoveryRequest,
  verifyRecoveryCodeAndDisableMFA,
  expireOldRecoveryCodes,
  getPendingRecoveryRequestCount,
} from "./mfaRecovery";
import { getMfaSettings } from "./mfaDb";
import { logMfaAudit } from "./mfa";
import { notifyOwner } from "./_core/notification";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

export const mfaRecoveryRouter = router({
  /**
   * Submit a recovery request (user)
   */
  submitRequest: protectedProcedure
    .input(
      z.object({
        reason: z.string().min(10, "Please provide a detailed reason"),
        identityVerification: z.object({
          email: z.string().email().optional(),
          lastLoginDate: z.string().optional(),
          recentActivity: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has MFA enabled
      const settings = await getMfaSettings(ctx.user.id);
      if (!settings || settings.enabled !== 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MFA is not enabled on your account",
        });
      }

      // Check for existing pending request
      const existing = await getUserPendingRecoveryRequest(ctx.user.id);
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already have a pending recovery request",
        });
      }

      // Expire old codes
      await expireOldRecoveryCodes();

      // Create recovery request
      const requestId = await createRecoveryRequest(
        ctx.user.id,
        input.reason,
        input.identityVerification,
        ctx.req.ip,
        ctx.req.headers["user-agent"]
      );

      // Notify admin
      await notifyOwner({
        title: "MFA Recovery Request",
        content: `User ${ctx.user.name || ctx.user.email} has requested MFA recovery. Reason: ${input.reason}`,
      });

      // Log audit event
      await logMfaAudit({
        userId: ctx.user.id,
        action: "setup",
        success: true,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return {
        success: true,
        requestId,
        message: "Recovery request submitted. An admin will review it within 24-48 hours.",
      };
    }),

  /**
   * Get user's pending recovery request
   */
  getMyRequest: protectedProcedure.query(async ({ ctx }) => {
    const request = await getUserPendingRecoveryRequest(ctx.user.id);
    if (!request) return null;

    return {
      id: request.id,
      reason: request.reason,
      status: request.status,
      submittedAt: request.submittedAt,
      reviewedAt: request.reviewedAt,
      rejectionReason: request.rejectionReason,
    };
  }),

  /**
   * Get all pending recovery requests (admin)
   */
  getPendingRequests: adminProcedure.query(async () => {
    const requests = await getAllPendingRecoveryRequests();
    return requests.map((req) => ({
      id: req.id,
      userId: req.userId,
      reason: req.reason,
      identityVerification: req.identityVerification ? JSON.parse(req.identityVerification) : null,
      submittedAt: req.submittedAt,
      ipAddress: req.ipAddress,
      userAgent: req.userAgent,
    }));
  }),

  /**
   * Get pending request count (admin)
   */
  getPendingCount: adminProcedure.query(async () => {
    return await getPendingRecoveryRequestCount();
  }),

  /**
   * Approve recovery request (admin)
   */
  approveRequest: adminProcedure
    .input(
      z.object({
        requestId: z.number(),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const request = await getRecoveryRequest(input.requestId);
      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recovery request not found",
        });
      }

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request has already been reviewed",
        });
      }

      // Approve and generate recovery code
      const recoveryCode = await approveRecoveryRequest(
        input.requestId,
        ctx.user.id,
        input.adminNotes
      );

      // In production, send recovery code via email
      // For now, return it in the response
      await notifyOwner({
        title: "MFA Recovery Approved",
        content: `Recovery code for user ID ${request.userId}: ${recoveryCode}\n\nThis code expires in 24 hours.`,
      });

      // Log audit event
      await logMfaAudit({
        userId: request.userId,
        action: "mfa_reset_by_admin",
        success: true,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return {
        success: true,
        recoveryCode, // In production, don't return this - send via email
        message: "Recovery request approved. Recovery code generated.",
      };
    }),

  /**
   * Reject recovery request (admin)
   */
  rejectRequest: adminProcedure
    .input(
      z.object({
        requestId: z.number(),
        rejectionReason: z.string().min(10),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const request = await getRecoveryRequest(input.requestId);
      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recovery request not found",
        });
      }

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request has already been reviewed",
        });
      }

      await rejectRecoveryRequest(
        input.requestId,
        ctx.user.id,
        input.rejectionReason,
        input.adminNotes
      );

      // Notify user (in production, send email)
      await notifyOwner({
        title: "MFA Recovery Rejected",
        content: `Recovery request for user ID ${request.userId} was rejected. Reason: ${input.rejectionReason}`,
      });

      return {
        success: true,
        message: "Recovery request rejected",
      };
    }),

  /**
   * Use recovery code to disable MFA (user)
   */
  useRecoveryCode: protectedProcedure
    .input(
      z.object({
        recoveryCode: z.string().length(32),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const success = await verifyRecoveryCodeAndDisableMFA(ctx.user.id, input.recoveryCode);

      if (!success) {
        await logMfaAudit({
          userId: ctx.user.id,
          action: "verify_fail",
          success: false,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
          failureReason: "Invalid or expired recovery code",
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired recovery code",
        });
      }

      // Log audit event
      await logMfaAudit({
        userId: ctx.user.id,
        action: "disable",
        success: true,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return {
        success: true,
        message: "MFA has been disabled. You can now set up MFA again.",
      };
    }),
});
