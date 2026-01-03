import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as vocabularyDb from "../db-vocabulary";
import { TRPCError } from "@trpc/server";

export const vocabularyRouter = router({
  /**
   * Get all vocabulary terms for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await vocabularyDb.getUserVocabulary(ctx.user.id);
  }),

  /**
   * Add a new vocabulary term
   */
  create: protectedProcedure
    .input(
      z.object({
        term: z.string().min(1).max(255),
        pronunciation: z.string().max(255).optional(),
        category: z.string().max(100).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await vocabularyDb.addVocabularyTerm({
        userId: ctx.user.id,
        ...input,
      });
      return { id };
    }),

  /**
   * Update a vocabulary term
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        term: z.string().min(1).max(255).optional(),
        pronunciation: z.string().max(255).optional(),
        category: z.string().max(100).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await vocabularyDb.updateVocabularyTerm(id, ctx.user.id, data);
      return { success: true };
    }),

  /**
   * Delete a vocabulary term
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await vocabularyDb.deleteVocabularyTerm(input.id, ctx.user.id);
      return { success: true };
    }),

  /**
   * Get vocabulary as a formatted prompt for transcription
   */
  getPrompt: protectedProcedure.query(async ({ ctx }) => {
    return await vocabularyDb.getVocabularyPrompt(ctx.user.id);
  }),
});
