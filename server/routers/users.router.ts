import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const usersRouter = router({
  /**
   * List all users (admin only)
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

    return allUsers;
  }),

  /**
   * Update user role (admin only)
   */
  updateRole: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["viewer", "editor", "project_manager", "admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Prevent admin from removing their own admin role
      if (input.userId === ctx.user.id && input.role !== "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove your own admin privileges",
        });
      }

      // Update the user's role
      await db
        .update(users)
        .set({
          role: input.role,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, input.userId));

      return { success: true, message: "User role updated successfully" };
    }),

  /**
   * Update user account status (admin only)
   */
  updateAccountStatus: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        accountStatus: z.enum(["pending", "active", "trial", "suspended"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(users)
        .set({
          accountStatus: input.accountStatus,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, input.userId));

      return { success: true, message: "Account status updated successfully" };
    }),
});
