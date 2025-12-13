import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTPToken,
  generateBackupCodes,
  verifyBackupCode,
  generateDeviceFingerprint,
  isDeviceTrusted,
  trustDevice,
  logMfaAudit,
} from "./mfa";
import {
  getMfaSettings,
  createMfaSettings,
  enableMfa,
  disableMfa,
  updateBackupCodes,
  regenerateBackupCodes,
  getUserTrustedDevices,
  removeTrustedDevice,
  getMfaAuditLogs,
  isMfaEnabled,
} from "./mfaDb";
import { TRPCError } from "@trpc/server";

/**
 * MFA Router
 * Handles all Multi-Factor Authentication operations
 */

export const mfaRouter = router({
  /**
   * Get MFA status for current user
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const settings = await getMfaSettings(ctx.user.id);

    return {
      enabled: settings ? settings.enabled === 1 : false,
      hasSettings: settings !== null,
    };
  }),

  /**
   * Setup MFA - Generate secret and QR code
   */
  setup: protectedProcedure.mutation(async ({ ctx }) => {
    const userEmail = ctx.user.email || "user@bcasystem.com";

    // Check if user already has MFA settings
    const existing = await getMfaSettings(ctx.user.id);
    if (existing && existing.enabled === 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "MFA is already enabled. Disable it first to re-setup.",
      });
    }

    // Generate new secret
    const { secret, otpauth_url } = generateTOTPSecret(userEmail);

    // Generate QR code
    const qrCode = await generateQRCode(otpauth_url);

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Store settings in database (not enabled yet)
    if (existing) {
      // Update existing settings
      await disableMfa(ctx.user.id);
    }

    await createMfaSettings(ctx.user.id, secret, backupCodes);

    // Log audit event
    await logMfaAudit({
      userId: ctx.user.id,
      action: "setup",
      success: true,
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers["user-agent"],
    });

    return {
      secret,
      qrCode,
      backupCodes, // Show these only once during setup
    };
  }),

  /**
   * Enable MFA - Verify token and activate
   */
  enable: protectedProcedure
    .input(
      z.object({
        token: z.string().length(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await getMfaSettings(ctx.user.id);

      if (!settings) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MFA not set up. Call setup first.",
        });
      }

      if (settings.enabled === 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MFA is already enabled.",
        });
      }

      // Verify the token
      const valid = verifyTOTPToken(settings.secret, input.token);

      if (!valid) {
        await logMfaAudit({
          userId: ctx.user.id,
          action: "enable",
          success: false,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
          failureReason: "Invalid token",
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid verification code. Please try again.",
        });
      }

      // Enable MFA
      await enableMfa(ctx.user.id);

      // Log success
      await logMfaAudit({
        userId: ctx.user.id,
        action: "enable",
        success: true,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return {
        success: true,
        message: "MFA enabled successfully",
      };
    }),

  /**
   * Disable MFA - Requires verification
   */
  disable: protectedProcedure
    .input(
      z.object({
        token: z.string().min(6).max(8), // Can be TOTP or backup code
      })
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await getMfaSettings(ctx.user.id);

      if (!settings || settings.enabled === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MFA is not enabled.",
        });
      }

      let valid = false;

      // Try TOTP first
      if (input.token.length === 6) {
        valid = verifyTOTPToken(settings.secret, input.token);
      }

      // Try backup code if TOTP failed
      if (!valid && input.token.length === 8) {
        const result = verifyBackupCode(input.token, settings.backupCodes);
        valid = result.valid;
      }

      if (!valid) {
        await logMfaAudit({
          userId: ctx.user.id,
          action: "disable",
          success: false,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
          failureReason: "Invalid token",
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid verification code. Please try again.",
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
        message: "MFA disabled successfully",
      };
    }),

  /**
   * Verify MFA token (used during login)
   */
  verify: protectedProcedure
    .input(
      z.object({
        token: z.string().min(6).max(8),
        trustDevice: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await getMfaSettings(ctx.user.id);

      if (!settings || settings.enabled === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MFA is not enabled for this user.",
        });
      }

      let valid = false;
      let usedBackupCode = false;

      // Try TOTP first
      if (input.token.length === 6) {
        valid = verifyTOTPToken(settings.secret, input.token);
      }

      // Try backup code if TOTP failed
      if (!valid && input.token.length === 8) {
        const result = verifyBackupCode(input.token, settings.backupCodes);
        valid = result.valid;
        usedBackupCode = valid;

        if (valid) {
          // Update backup codes (remove used one)
          await updateBackupCodes(ctx.user.id, result.remainingCodes);

          await logMfaAudit({
            userId: ctx.user.id,
            action: "backup_code_used",
            success: true,
            ipAddress: ctx.req.ip,
            userAgent: ctx.req.headers["user-agent"],
          });
        }
      }

      if (!valid) {
        await logMfaAudit({
          userId: ctx.user.id,
          action: "verify_fail",
          success: false,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
          failureReason: "Invalid token",
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid verification code. Please try again.",
        });
      }

      // Trust device if requested
      if (input.trustDevice && ctx.req.headers["user-agent"] && ctx.req.ip) {
        const deviceFingerprint = generateDeviceFingerprint(
          ctx.req.headers["user-agent"],
          ctx.req.ip
        );

        await trustDevice(
          ctx.user.id,
          deviceFingerprint,
          "Browser", // Could parse user-agent for better name
          ctx.req.headers["user-agent"],
          ctx.req.ip
        );

        await logMfaAudit({
          userId: ctx.user.id,
          action: "device_trusted",
          success: true,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
          deviceFingerprint,
        });
      }

      // Log successful verification
      await logMfaAudit({
        userId: ctx.user.id,
        action: "verify_success",
        success: true,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return {
        success: true,
        usedBackupCode,
        remainingBackupCodes: usedBackupCode
          ? settings.backupCodes.length - 1
          : settings.backupCodes.length,
      };
    }),

  /**
   * Regenerate backup codes
   */
  regenerateBackupCodes: protectedProcedure
    .input(
      z.object({
        token: z.string().length(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await getMfaSettings(ctx.user.id);

      if (!settings || settings.enabled === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MFA is not enabled.",
        });
      }

      // Verify token before regenerating
      const valid = verifyTOTPToken(settings.secret, input.token);

      if (!valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid verification code.",
        });
      }

      // Generate new backup codes
      const newCodes = generateBackupCodes();
      await regenerateBackupCodes(ctx.user.id, newCodes);

      return {
        backupCodes: newCodes,
      };
    }),

  /**
   * Get trusted devices
   */
  getTrustedDevices: protectedProcedure.query(async ({ ctx }) => {
    const devices = await getUserTrustedDevices(ctx.user.id);

    return devices.map((device) => ({
      id: device.id,
      deviceName: device.deviceName || "Unknown Device",
      lastUsed: device.lastUsed,
      expiresAt: device.expiresAt,
      createdAt: device.createdAt,
    }));
  }),

  /**
   * Remove trusted device
   */
  removeTrustedDevice: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await removeTrustedDevice(input.deviceId, ctx.user.id);

      await logMfaAudit({
        userId: ctx.user.id,
        action: "device_removed",
        success: true,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return {
        success: true,
      };
    }),

  /**
   * Check if current device is trusted
   */
  checkDeviceTrust: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.req.headers["user-agent"] || !ctx.req.ip) {
      return { trusted: false };
    }

    const deviceFingerprint = generateDeviceFingerprint(
      ctx.req.headers["user-agent"],
      ctx.req.ip
    );

    const trusted = await isDeviceTrusted(ctx.user.id, deviceFingerprint);

    return { trusted };
  }),

  /**
   * Get MFA audit logs
   */
  getAuditLogs: protectedProcedure.query(async ({ ctx }) => {
    const logs = await getMfaAuditLogs(ctx.user.id);

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      success: log.success === 1,
      ipAddress: log.ipAddress,
      failureReason: log.failureReason,
      createdAt: log.createdAt,
    }));
  }),

  /**
   * Check if user is required to have MFA enabled
   */
  checkMfaRequirement: protectedProcedure.query(async ({ ctx }) => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const { users } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    const mfaEnabled = await isMfaEnabled(ctx.user.id);

    return {
      required: user.mfaRequired === 1,
      enabled: mfaEnabled,
      enforcedAt: user.mfaEnforcedAt,
      needsSetup: user.mfaRequired === 1 && !mfaEnabled,
    };
  }),
});
