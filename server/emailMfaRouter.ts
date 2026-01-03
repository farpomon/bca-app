import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createVerificationCode,
  verifyEmailCode,
} from "./emailMfa";
import {
  getMfaSettings,
  createMfaSettings,
  enableMfa,
  disableMfa,
  updateMfaMethod,
} from "./mfaDb";
import { logMfaAudit } from "./mfa";

/**
 * Email MFA Router
 * Handles email-based Multi-Factor Authentication operations
 */

export const emailMfaRouter = router({
  /**
   * Setup Email MFA - Send verification code to user's email
   */
  setupEmail: protectedProcedure.mutation(async ({ ctx }) => {
    const userEmail = ctx.user.email;

    if (!userEmail) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No email address associated with your account",
      });
    }

    // Check if user already has MFA enabled
    const existing = await getMfaSettings(ctx.user.id);
    if (existing && existing.enabled === 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "MFA is already enabled. Disable it first to change methods.",
      });
    }

    // Create verification code and send email
    const result = await createVerificationCode(
      ctx.user.id,
      userEmail,
      "mfa_setup"
    );

    if (!result.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send verification code. Please try again.",
      });
    }

    // Log audit event
    await logMfaAudit({
      userId: ctx.user.id,
      action: "email_sent",
      success: true,
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers["user-agent"],
    });

    return {
      success: true,
      message: `Verification code sent to ${userEmail}`,
      email: userEmail,
    };
  }),

  /**
   * Enable Email MFA - Verify code and activate
   */
  enableEmail: protectedProcedure
    .input(
      z.object({
        code: z.string().length(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userEmail = ctx.user.email;

      if (!userEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No email address associated with your account",
        });
      }

      // Verify the code
      const verification = await verifyEmailCode(
        ctx.user.id,
        userEmail,
        input.code,
        "mfa_setup"
      );

      if (!verification.valid) {
        await logMfaAudit({
          userId: ctx.user.id,
          action: "email_verified",
          success: false,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
          failureReason: verification.error || "Invalid code",
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: verification.error || "Invalid verification code",
        });
      }

      // Check if MFA settings exist
      const existing = await getMfaSettings(ctx.user.id);

      if (!existing) {
        // Create new MFA settings with email method
        await createMfaSettings(ctx.user.id, "", [], "email");
      } else {
        // Update existing settings to email method
        await updateMfaMethod(ctx.user.id, "email");
      }

      // Enable MFA
      await enableMfa(ctx.user.id);

      // Log success
      await logMfaAudit({
        userId: ctx.user.id,
        action: "email_verified",
        success: true,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      await logMfaAudit({
        userId: ctx.user.id,
        action: "enable",
        success: true,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return {
        success: true,
        message: "Email MFA enabled successfully",
      };
    }),

  /**
   * Send login verification code
   */
  sendLoginCode: protectedProcedure.mutation(async ({ ctx }) => {
    const userEmail = ctx.user.email;

    if (!userEmail) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No email address associated with your account",
      });
    }

    // Check if email MFA is enabled
    const settings = await getMfaSettings(ctx.user.id);
    if (!settings || settings.enabled === 0 || settings.mfaMethod !== "email") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Email MFA is not enabled for this account",
      });
    }

    // Create and send verification code
    const result = await createVerificationCode(
      ctx.user.id,
      userEmail,
      "mfa_login"
    );

    if (!result.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send verification code. Please try again.",
      });
    }

    // Log audit event
    await logMfaAudit({
      userId: ctx.user.id,
      action: "email_sent",
      success: true,
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers["user-agent"],
    });

    return {
      success: true,
      message: `Verification code sent to ${userEmail}`,
    };
  }),

  /**
   * Verify login code
   */
  verifyLoginCode: protectedProcedure
    .input(
      z.object({
        code: z.string().length(6),
        trustDevice: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userEmail = ctx.user.email;

      if (!userEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No email address associated with your account",
        });
      }

      // Verify the code
      const verification = await verifyEmailCode(
        ctx.user.id,
        userEmail,
        input.code,
        "mfa_login"
      );

      if (!verification.valid) {
        await logMfaAudit({
          userId: ctx.user.id,
          action: "verify_fail",
          success: false,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
          failureReason: verification.error || "Invalid code",
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: verification.error || "Invalid verification code",
        });
      }

      // Log success
      await logMfaAudit({
        userId: ctx.user.id,
        action: "verify_success",
        success: true,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      // TODO: Handle device trust if requested
      // This would require importing and using the trustDevice function from mfa.ts

      return {
        success: true,
        message: "Verification successful",
      };
    }),

  /**
   * Disable Email MFA - Requires verification
   */
  disableEmail: protectedProcedure
    .input(
      z.object({
        code: z.string().length(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userEmail = ctx.user.email;

      if (!userEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No email address associated with your account",
        });
      }

      const settings = await getMfaSettings(ctx.user.id);

      if (!settings || settings.enabled === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MFA is not enabled",
        });
      }

      // Send verification code first if not already sent
      // (In practice, UI should call sendLoginCode first)

      // Verify the code
      const verification = await verifyEmailCode(
        ctx.user.id,
        userEmail,
        input.code,
        "mfa_login"
      );

      if (!verification.valid) {
        await logMfaAudit({
          userId: ctx.user.id,
          action: "disable",
          success: false,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
          failureReason: verification.error || "Invalid code",
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: verification.error || "Invalid verification code",
        });
      }

      // Disable MFA
      await disableMfa(ctx.user.id);

      // Log success
      await logMfaAudit({
        userId: ctx.user.id,
        action: "disable",
        success: true,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return {
        success: true,
        message: "Email MFA disabled successfully",
      };
    }),

  /**
   * Get email MFA status
   */
  getEmailStatus: protectedProcedure.query(async ({ ctx }) => {
    const settings = await getMfaSettings(ctx.user.id);

    return {
      enabled: settings ? settings.enabled === 1 && settings.mfaMethod === "email" : false,
      email: ctx.user.email || null,
    };
  }),
});
