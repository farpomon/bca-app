import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  captureSnapshot,
  undoOperation,
  getUndoableOperations,
  cleanupExpiredOperations,
} from "../services/undo.service";

export const undoRouter = router({
  /**
   * Get list of undoable operations for current admin user
   */
  listUndoable: adminProcedure.query(async ({ ctx }) => {
    const operations = await getUndoableOperations(ctx.user.id);
    return operations;
  }),

  /**
   * Undo a bulk operation
   */
  undo: adminProcedure
    .input(
      z.object({
        operationId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await undoOperation(input.operationId, ctx.user.id);
      return result;
    }),

  /**
   * Manually trigger cleanup of expired operations
   */
  cleanup: adminProcedure.mutation(async () => {
    await cleanupExpiredOperations();
    return { success: true, message: "Cleanup completed" };
  }),
});
