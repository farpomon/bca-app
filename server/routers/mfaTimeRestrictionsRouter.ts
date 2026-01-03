import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getUserTimeRestrictions,
  createTimeRestriction,
  updateTimeRestriction,
  deleteTimeRestriction,
  checkMfaTimeRestriction,
} from "../services/mfaTimeRestrictions";

/**
 * Admin-only procedure that checks if user is an admin
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const mfaTimeRestrictionsRouter = router({
  /**
   * Get all time restrictions for a user (admin only)
   */
  getUserRestrictions: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const restrictions = await getUserTimeRestrictions(input.userId);
      return restrictions.map(r => ({
        ...r,
        daysOfWeek: r.daysOfWeek ? JSON.parse(r.daysOfWeek) : [],
      }));
    }),

  /**
   * Create a new time restriction (admin only)
   */
  createRestriction: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        restrictionType: z.enum(['always', 'business_hours', 'after_hours', 'custom_schedule', 'never']),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        daysOfWeek: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
        timezone: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const restriction = await createTimeRestriction({
        ...input,
        createdBy: ctx.user.id,
      });

      return {
        ...restriction,
        daysOfWeek: restriction.daysOfWeek ? JSON.parse(restriction.daysOfWeek) : [],
      };
    }),

  /**
   * Update an existing time restriction (admin only)
   */
  updateRestriction: adminProcedure
    .input(
      z.object({
        restrictionId: z.number(),
        restrictionType: z.enum(['always', 'business_hours', 'after_hours', 'custom_schedule', 'never']).optional(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
        daysOfWeek: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
        timezone: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { restrictionId, ...updateData } = input;
      const restriction = await updateTimeRestriction(restrictionId, updateData);

      return {
        ...restriction,
        daysOfWeek: restriction.daysOfWeek ? JSON.parse(restriction.daysOfWeek) : [],
      };
    }),

  /**
   * Delete a time restriction (admin only)
   */
  deleteRestriction: adminProcedure
    .input(z.object({ restrictionId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTimeRestriction(input.restrictionId);
      return { success: true };
    }),

  /**
   * Check if MFA is currently required for a user based on time restrictions
   */
  checkMfaRequired: protectedProcedure
    .input(z.object({ userId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const userId = input.userId || ctx.user.id;
      
      // Non-admins can only check their own status
      if (ctx.user.role !== 'admin' && userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot check other users' });
      }

      const isRequired = await checkMfaTimeRestriction(userId);
      return { isRequired };
    }),

  /**
   * Get current user's active time restrictions
   */
  getMyRestrictions: protectedProcedure.query(async ({ ctx }) => {
    const restrictions = await getUserTimeRestrictions(ctx.user.id);
    return restrictions.map(r => ({
      ...r,
      daysOfWeek: r.daysOfWeek ? JSON.parse(r.daysOfWeek) : [],
    }));
  }),
});
