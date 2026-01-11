import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  runAllIntegrityChecks,
  getIntegrityMetricsSummary,
  checkOrphanedAssessments,
  checkOrphanedDeficiencies,
  checkOrphanedPhotos,
  checkDuplicateProjects,
  checkDuplicateAssets,
  checkBrokenAssetReferences,
  checkMissingComponentReferences,
} from "../dataIntegrity";

/**
 * Admin-only procedure
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  return next({ ctx });
});

/**
 * Data Integrity Router
 * Provides endpoints for monitoring and checking data integrity
 */
export const dataIntegrityRouter = router({
  /**
   * Get integrity metrics summary
   */
  getSummary: adminProcedure
    .query(async () => {
      return await getIntegrityMetricsSummary();
    }),

  /**
   * Run all integrity checks
   */
  runAllChecks: adminProcedure
    .mutation(async () => {
      const results = await runAllIntegrityChecks();
      
      return {
        success: true,
        checksRun: results.length,
        results,
      };
    }),

  /**
   * Run specific integrity check
   */
  runCheck: adminProcedure
    .input(
      z.object({
        checkType: z.enum([
          'orphaned_assessments',
          'orphaned_deficiencies',
          'orphaned_photos',
          'duplicate_projects',
          'duplicate_assets',
          'broken_asset_references',
          'missing_component_references',
        ]),
      })
    )
    .mutation(async ({ input }) => {
      let result;

      switch (input.checkType) {
        case 'orphaned_assessments':
          result = await checkOrphanedAssessments();
          break;
        case 'orphaned_deficiencies':
          result = await checkOrphanedDeficiencies();
          break;
        case 'orphaned_photos':
          result = await checkOrphanedPhotos();
          break;
        case 'duplicate_projects':
          result = await checkDuplicateProjects();
          break;
        case 'duplicate_assets':
          result = await checkDuplicateAssets();
          break;
        case 'broken_asset_references':
          result = await checkBrokenAssetReferences();
          break;
        case 'missing_component_references':
          result = await checkMissingComponentReferences();
          break;
        default:
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid check type',
          });
      }

      return {
        success: true,
        result,
      };
    }),
});
