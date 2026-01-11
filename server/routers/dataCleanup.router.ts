import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import * as dataCleanupDb from "../db/dataCleanup.db";

/**
 * Data Cleanup Router
 * Admin-only endpoints for identifying and removing orphaned data
 */

export const dataCleanupRouter = router({
  /**
   * Get a report of orphaned scoring data from deleted projects
   * Does not delete anything - just returns counts
   */
  getOrphanedScoringDataReport: adminProcedure.query(async () => {
    return await dataCleanupDb.identifyOrphanedScoringData();
  }),

  /**
   * Clean up orphaned scoring data from deleted projects
   * DESTRUCTIVE: Permanently deletes orphaned records
   */
  cleanupOrphanedScoringData: adminProcedure.mutation(async () => {
    return await dataCleanupDb.cleanupOrphanedScoringData();
  }),

  /**
   * Get a report of orphaned data from inactive criteria
   * Does not delete anything - just returns counts
   */
  getOrphanedCriteriaDataReport: adminProcedure.query(async () => {
    return await dataCleanupDb.identifyOrphanedCriteriaData();
  }),

  /**
   * Clean up orphaned data from inactive criteria
   * DESTRUCTIVE: Permanently deletes orphaned records
   * Use with caution - consider archiving instead if historical records are needed
   */
  cleanupOrphanedCriteriaData: adminProcedure.mutation(async () => {
    return await dataCleanupDb.cleanupOrphanedCriteriaData();
  }),
});
