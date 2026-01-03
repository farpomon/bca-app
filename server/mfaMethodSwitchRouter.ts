/**
 * MFA Method Switching Router
 * Handles API endpoints for switching between TOTP and email MFA
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createMethodSwitchRequest,
  getPendingSwitchRequest,
  markNewMethodVerified,
  completeMethodSwitch,
  cancelSwitchRequest,
  expireOldSwitchRequests,
} from "./mfaMethodSwitch";
import { getMfaSettings } from "./mfaDb";
import { generateTOTPSecret, verifyTOTPToken } from "./mfa";
import { logMfaAudit } from "./mfa";
import crypto from "crypto";

export const mfaMethodSwitchRouter = router({
  /**
   * Initiate a method switch request
   */
  initiateSwitch: protectedProcedure
    .input(
      z.object({
        newMethod: z.enum(["totp", "email"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get current MFA settings
      const settings = await getMfaSettings(ctx.user.id);
      if (!settings || settings.enabled !== 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MFA must be enabled before switching methods",
        });
      }

      const currentMethod = settings.mfaMethod || "totp";
      if (currentMethod === input.newMethod) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already using this MFA method",
        });
      }

      // Expire old requests
      await expireOldSwitchRequests();

      // Generate secret for new TOTP method if needed
      let newMethodSecret: string | undefined;
      let qrCode: string | undefined;

      if (input.newMethod === "totp") {
        const userEmail = ctx.user.email || "user@bcasystem.com";
        const totpData = generateTOTPSecret(userEmail);
        newMethodSecret = totpData.secret;
        
        // Generate QR code
        const QRCode = require("qrcode");
        qrCode = await QRCode.toDataURL(totpData.otpauth_url);
      }

      // Create switch request
      const requestId = await createMethodSwitchRequest(
        ctx.user.id,
        currentMethod,
        input.newMethod,
        newMethodSecret
      );

      // Log audit event
      await logMfaAudit({
        userId: ctx.user.id,
        action: "setup",
        success: true,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return {
        requestId,
        currentMethod,
        newMethod: input.newMethod,
        qrCode, // Only present for TOTP
        expiresInMinutes: 30,
      };
    }),

  /**
   * Get current pending switch request
   */
  getPendingSwitch: protectedProcedure.query(async ({ ctx }) => {
    const request = await getPendingSwitchRequest(ctx.user.id);
    if (!request) return null;

    return {
      id: request.id,
      currentMethod: request.currentMethod,
      newMethod: request.newMethod,
      newMethodVerified: request.newMethodVerified === 1,
      expiresAt: request.expiresAt,
    };
  }),

  /**
   * Verify new method (TOTP code or email code)
   */
  verifyNewMethod: protectedProcedure
    .input(
      z.object({
        code: z.string().length(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const request = await getPendingSwitchRequest(ctx.user.id);
      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No pending switch request found",
        });
      }

      let verified = false;

      if (request.newMethod === "totp") {
        // Verify TOTP code
        if (!request.newMethodSecret) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "TOTP secret not found",
          });
        }
        verified = verifyTOTPToken(request.newMethodSecret, input.code);
      } else if (request.newMethod === "email") {
        // For email, we would verify against a code sent to user's email
        // For now, we'll implement a simple verification
        // In production, this should verify against a code stored in smsVerificationCodes table
        throw new TRPCError({
          code: "NOT_IMPLEMENTED",
          message: "Email MFA verification not yet implemented",
        });
      }

      if (!verified) {
        await logMfaAudit({
          userId: ctx.user.id,
          action: "verify_fail",
          success: false,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
          failureReason: "Invalid verification code for new MFA method",
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid verification code",
        });
      }

      // Mark as verified
      await markNewMethodVerified(request.id);

      await logMfaAudit({
        userId: ctx.user.id,
        action: "verify_success",
        success: true,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return {
        success: true,
        message: "New method verified successfully",
      };
    }),

  /**
   * Complete the method switch
   */
  completeSwitch: protectedProcedure.mutation(async ({ ctx }) => {
    const request = await getPendingSwitchRequest(ctx.user.id);
    if (!request) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No pending switch request found",
      });
    }

    if (request.newMethodVerified !== 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "New method must be verified before completing switch",
      });
    }

    // Complete the switch
    await completeMethodSwitch(
      request.id,
      ctx.user.id,
      request.newMethod,
      request.newMethodSecret || undefined
    );

    await logMfaAudit({
      userId: ctx.user.id,
      action: "enable",
      success: true,
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers["user-agent"],
    });

    return {
      success: true,
      newMethod: request.newMethod,
      message: `Successfully switched to ${request.newMethod.toUpperCase()} MFA`,
    };
  }),

  /**
   * Cancel a pending switch request
   */
  cancelSwitch: protectedProcedure.mutation(async ({ ctx }) => {
    const request = await getPendingSwitchRequest(ctx.user.id);
    if (!request) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No pending switch request found",
      });
    }

    await cancelSwitchRequest(request.id);

    return {
      success: true,
      message: "Switch request cancelled",
    };
  }),
});
