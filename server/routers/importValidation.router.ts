import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  validateBulkImport,
  executeValidatedImport,
  type ImportType,
  type ImportBehavior,
} from "../importValidation";

/**
 * Import Validation Router
 * Provides endpoints for validating and executing bulk imports
 */
export const importValidationRouter = router({
  /**
   * Validate bulk import data
   */
  validate: protectedProcedure
    .input(
      z.object({
        rows: z.array(z.record(z.any())),
        importType: z.enum(['criteria', 'assets', 'assessments', 'deficiencies', 'projects']),
        projectId: z.number().optional(),
        fileName: z.string().optional(),
        fileSize: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { rows, importType, projectId, fileName, fileSize } = input;

      const result = await validateBulkImport(
        rows,
        importType as ImportType,
        ctx.user,
        { projectId, fileName, fileSize }
      );

      return result;
    }),

  /**
   * Execute validated import
   */
  execute: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        behavior: z.enum(['skip_duplicates', 'update_existing', 'import_all']),
        rows: z.array(z.record(z.any())),
        importType: z.enum(['criteria', 'assets', 'assessments', 'deficiencies', 'projects']),
        projectId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sessionId, behavior, rows, importType, projectId } = input;

      const result = await executeValidatedImport(
        sessionId,
        behavior as ImportBehavior,
        rows,
        importType as ImportType,
        ctx.user,
        { projectId }
      );

      return result;
    }),
});
