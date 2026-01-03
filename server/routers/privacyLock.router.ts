import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { companies, companyAccessCodes, users } from "../../drizzle/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import crypto from "crypto";
import { ENV } from "../_core/env";

// Generate a secure random access code
function generateAccessCode(): string {
  return crypto.randomBytes(16).toString("hex").toUpperCase().slice(0, 12);
}

export const privacyLockRouter = router({
  // Get privacy lock status for a company
  getStatus: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [company] = await db
        .select({ privacyLockEnabled: companies.privacyLockEnabled, name: companies.name })
        .from(companies)
        .where(eq(companies.id, input.companyId))
        .limit(1);

      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      return {
        companyId: input.companyId,
        companyName: company.name,
        privacyLockEnabled: company.privacyLockEnabled === 1,
      };
    }),

  // Toggle privacy lock for a company (company admin only)
  togglePrivacyLock: protectedProcedure
    .input(z.object({ companyId: z.number(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if user is admin of this company or site owner
      const isOwner = ctx.user.openId === ENV.ownerOpenId;
      const userCompany = ctx.user.company;
      
      // Get company info
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, input.companyId))
        .limit(1);

      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      // Only company admins can toggle their own company's privacy lock
      // Site owner cannot disable privacy lock for other companies
      if (!isOwner && userCompany !== company.name) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only manage your own company's privacy settings" });
      }

      // If site owner is trying to disable another company's privacy lock, deny
      if (isOwner && userCompany !== company.name && !input.enabled) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Site owner cannot disable privacy lock for other companies" });
      }

      await db
        .update(companies)
        .set({ privacyLockEnabled: input.enabled ? 1 : 0 })
        .where(eq(companies.id, input.companyId));

      return { success: true, privacyLockEnabled: input.enabled };
    }),

  // Generate access code for site owner (company admin only)
  generateAccessCode: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if user belongs to this company
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, input.companyId))
        .limit(1);

      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      // User must be from this company (not site owner)
      const isOwner = ctx.user.openId === ENV.ownerOpenId;
      if (isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Site owner cannot generate access codes for themselves" });
      }

      if (ctx.user.company !== company.name) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only generate access codes for your own company" });
      }

      // Generate code with 1-hour expiration
      const code = generateAccessCode();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.insert(companyAccessCodes).values({
        companyId: input.companyId,
        code,
        createdBy: ctx.user.id,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

      return {
        code,
        expiresAt: expiresAt.toISOString(),
        expiresIn: "1 hour",
      };
    }),

  // Verify access code (site owner only)
  verifyAccessCode: protectedProcedure
    .input(z.object({ companyId: z.number(), code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Only site owner can verify access codes
      const isOwner = ctx.user.openId === ENV.ownerOpenId;
      if (!isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only site owner can use access codes" });
      }

      // Find valid access code
      const now = new Date().toISOString();
      const [accessCode] = await db
        .select()
        .from(companyAccessCodes)
        .where(
          and(
            eq(companyAccessCodes.companyId, input.companyId),
            eq(companyAccessCodes.code, input.code.toUpperCase()),
            gt(companyAccessCodes.expiresAt, now),
            isNull(companyAccessCodes.usedBy)
          )
        )
        .limit(1);

      if (!accessCode) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired access code" });
      }

      // Mark code as used
      await db
        .update(companyAccessCodes)
        .set({
          usedBy: ctx.user.id,
          usedAt: now,
        })
        .where(eq(companyAccessCodes.id, accessCode.id));

      // Store access grant in session (valid for 1 hour from now)
      const accessGrantExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      return {
        success: true,
        companyId: input.companyId,
        accessGrantedUntil: accessGrantExpiry,
      };
    }),

  // Check if owner has valid access to a company
  checkOwnerAccess: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const isOwner = ctx.user.openId === ENV.ownerOpenId;
      
      // Non-owners don't need access codes for their own company
      if (!isOwner) {
        return { needsAccessCode: false, hasAccess: true };
      }

      // Check if company has privacy lock enabled
      const [company] = await db
        .select({ privacyLockEnabled: companies.privacyLockEnabled, name: companies.name })
        .from(companies)
        .where(eq(companies.id, input.companyId))
        .limit(1);

      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      // If privacy lock is disabled, owner has access
      if (company.privacyLockEnabled !== 1) {
        return { needsAccessCode: false, hasAccess: true };
      }

      // If owner's company, they have access
      if (ctx.user.company === company.name) {
        return { needsAccessCode: false, hasAccess: true };
      }

      // Check for recent valid access code usage (within last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const [recentAccess] = await db
        .select()
        .from(companyAccessCodes)
        .where(
          and(
            eq(companyAccessCodes.companyId, input.companyId),
            eq(companyAccessCodes.usedBy, ctx.user.id),
            gt(companyAccessCodes.usedAt, oneHourAgo)
          )
        )
        .limit(1);

      if (recentAccess) {
        return { 
          needsAccessCode: false, 
          hasAccess: true,
          accessExpiresAt: new Date(new Date(recentAccess.usedAt!).getTime() + 60 * 60 * 1000).toISOString()
        };
      }

      // Owner needs access code
      return { 
        needsAccessCode: true, 
        hasAccess: false,
        companyName: company.name
      };
    }),

  // Get active access codes for a company (company admin only)
  getActiveAccessCodes: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if user belongs to this company
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, input.companyId))
        .limit(1);

      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      if (ctx.user.company !== company.name) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only view access codes for your own company" });
      }

      const now = new Date().toISOString();
      const codes = await db
        .select({
          id: companyAccessCodes.id,
          code: companyAccessCodes.code,
          createdAt: companyAccessCodes.createdAt,
          expiresAt: companyAccessCodes.expiresAt,
          usedAt: companyAccessCodes.usedAt,
        })
        .from(companyAccessCodes)
        .where(
          and(
            eq(companyAccessCodes.companyId, input.companyId),
            gt(companyAccessCodes.expiresAt, now)
          )
        )
        .orderBy(companyAccessCodes.createdAt);

      return codes.map(c => ({
        ...c,
        isUsed: c.usedAt !== null,
        // Mask the code for display
        maskedCode: c.code.slice(0, 4) + "****" + c.code.slice(-4),
      }));
    }),
});
