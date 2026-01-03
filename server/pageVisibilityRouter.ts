import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as pageVisibilityDb from "./pageVisibilityDb";
import { DASHBOARD_PAGES } from "./pageVisibilityDb";

/**
 * Page Visibility Router
 * Handles superadmin controls for toggling dashboard pages per company
 */
export const pageVisibilityRouter = router({
  /**
   * Get all available dashboard pages
   */
  getAvailablePages: protectedProcedure.query(async () => {
    return Object.entries(DASHBOARD_PAGES).map(([key, value]) => ({
      key,
      ...value,
    }));
  }),

  /**
   * Get page visibility settings for a specific company
   * Superadmin only
   */
  getCompanyPageVisibility: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Only superadmins can view page visibility settings
      if (!ctx.user.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can view page visibility settings",
        });
      }

      const settings = await pageVisibilityDb.getCompanyPageVisibility(input.companyId);
      return settings;
    }),

  /**
   * Get page visibility for current user's company
   * Used by frontend to filter navigation
   */
  getMyCompanyPageVisibility: protectedProcedure
    .input(z.object({ companyId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      // Use provided companyId or fall back to user's default company
      const companyId = input?.companyId ?? ctx.user.companyId;
      
      if (!companyId) {
        // No company - return all pages visible (default behavior)
        const defaultSettings: Record<string, boolean> = {};
        for (const key of Object.keys(DASHBOARD_PAGES)) {
          defaultSettings[key] = true;
        }
        return defaultSettings;
      }

      const settings = await pageVisibilityDb.getCompanyPageVisibility(companyId);
      return settings;
    }),

  /**
   * Set visibility for a single page in a company
   * Superadmin only
   */
  setPageVisibility: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
        pageKey: z.string(),
        isVisible: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only superadmins can modify page visibility
      if (!ctx.user.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can modify page visibility settings",
        });
      }

      // Validate pageKey
      if (!(input.pageKey in DASHBOARD_PAGES)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid page key: ${input.pageKey}`,
        });
      }

      await pageVisibilityDb.setPageVisibility(
        input.companyId,
        input.pageKey,
        input.isVisible,
        ctx.user.id
      );

      return { success: true };
    }),

  /**
   * Bulk update page visibility for a company
   * Superadmin only
   */
  bulkSetPageVisibility: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
        settings: z.record(z.string(), z.boolean()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only superadmins can modify page visibility
      if (!ctx.user.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can modify page visibility settings",
        });
      }

      // Validate all pageKeys
      for (const pageKey of Object.keys(input.settings)) {
        if (!(pageKey in DASHBOARD_PAGES)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid page key: ${pageKey}`,
          });
        }
      }

      await pageVisibilityDb.bulkSetPageVisibility(
        input.companyId,
        input.settings,
        ctx.user.id
      );

      return { success: true };
    }),

  /**
   * Get page visibility overview for all companies
   * Superadmin only
   */
  getAllCompaniesPageVisibility: protectedProcedure.query(async ({ ctx }) => {
    // Only superadmins can view all companies' settings
    if (!ctx.user.isSuperAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only super admins can view all companies' page visibility",
      });
    }

    return await pageVisibilityDb.getAllCompaniesPageVisibility();
  }),

  /**
   * Initialize default page visibility for a company
   * Superadmin only - typically called when creating a new company
   */
  initializeCompanyPages: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Only superadmins can initialize page visibility
      if (!ctx.user.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can initialize page visibility",
        });
      }

      await pageVisibilityDb.initializeCompanyPageVisibility(
        input.companyId,
        ctx.user.id
      );

      return { success: true };
    }),
});
