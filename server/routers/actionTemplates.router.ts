import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const actionTemplatesRouter = router({
  /**
   * Get all action templates
   */
  getAll: publicProcedure.query(async () => {
    return db.getAllActionTemplates();
  }),

  /**
   * Get action templates by category
   */
  getByCategory: publicProcedure
    .input(z.object({
      category: z.string(),
    }))
    .query(async ({ input }) => {
      return db.getActionTemplatesByCategory(input.category);
    }),

  /**
   * Get action templates by UNIFORMAT code
   */
  getByUniformatCode: publicProcedure
    .input(z.object({
      uniformatCode: z.string(),
    }))
    .query(async ({ input }) => {
      return db.getActionTemplatesByUniformatCode(input.uniformatCode);
    }),

  /**
   * Get action template by ID
   */
  getById: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      return db.getActionTemplateById(input.id);
    }),

  /**
   * Get template categories (distinct list)
   */
  getCategories: publicProcedure.query(async () => {
    const templates = await db.getAllActionTemplates();
    const categories = [...new Set(templates.map(t => t.category))];
    return categories.sort();
  }),
});
