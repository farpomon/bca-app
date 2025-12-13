/**
 * Admin Router
 * Provides administrative functions for system management
 * Only accessible to users with admin role
 */

import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, projects } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const adminRouter = router({
  /**
   * Get system statistics
   */
  getSystemStats: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Get total users
    const allUsers = await database.select().from(users);
    const totalUsers = allUsers.length;
    const adminUsers = allUsers.filter(u => u.role === "admin").length;

    // Get total projects across all users
    const allProjects = await database.select().from(projects);
    const totalProjects = allProjects.length;

    // Get projects by status
    const projectsByStatus = {
      draft: allProjects.filter(p => p.status === "draft").length,
      in_progress: allProjects.filter(p => p.status === "in_progress").length,
      completed: allProjects.filter(p => p.status === "completed").length,
      archived: allProjects.filter(p => p.status === "archived").length,
    };

    return {
      totalUsers,
      adminUsers,
      totalProjects,
      projectsByStatus,
    };
  }),

  /**
   * Get all users (admin only)
   */
  getAllUsers: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    const allUsers = await database.select().from(users);
    
    return allUsers.map(user => ({
      id: user.id,
      openId: user.openId,
      name: user.name,
      email: user.email,
      role: user.role,
      loginMethod: user.loginMethod,
      createdAt: user.createdAt,
      lastSignedIn: user.lastSignedIn,
    }));
  }),

  /**
   * Update user role (promote/demote admin)
   */
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["viewer", "editor", "project_manager", "admin"]),
      })
    )
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      await database
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * Get all projects across all users
   */
  getAllProjects: adminProcedure
    .input(
      z.object({
        status: z.enum(["draft", "in_progress", "completed", "archived"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const allProjects = await database.select().from(projects);
      
      // Filter by status if provided
      const filtered = input.status
        ? allProjects.filter(p => p.status === input.status)
        : allProjects;
      
      // Apply pagination
      const paginated = filtered.slice(input.offset, input.offset + input.limit);

      return paginated;
    }),

  /**
   * Get project details by ID (admin can access any project)
   */
  getProjectById: adminProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const result = await database
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);
      
      return result[0] || null;
    }),

  /**
   * Delete user (admin only, cannot delete self)
   */
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId) {
        throw new Error("Cannot delete your own account");
      }

      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Delete user (cascade will handle related data)
      await database.delete(users).where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * Enforce MFA for specific roles
   */
  enforceMfaForRole: adminProcedure
    .input(
      z.object({
        role: z.enum(["admin", "project_manager"]),
      })
    )
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Set mfaRequired=1 for all users with this role
      await database
        .update(users)
        .set({ 
          mfaRequired: 1,
          mfaEnforcedAt: new Date().toISOString(),
        })
        .where(eq(users.role, input.role));

      return { success: true, message: `MFA enforced for all ${input.role} users` };
    }),

  /**
   * Require MFA for specific user
   */
  requireMfaForUser: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        required: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      await database
        .update(users)
        .set({ 
          mfaRequired: input.required ? 1 : 0,
          mfaEnforcedAt: input.required ? new Date().toISOString() : null,
        })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * Reset user's MFA (admin emergency access)
   */
  resetUserMfa: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const { disableMfa } = await import("../mfaDb");
      await disableMfa(input.userId);

      return { success: true, message: "User MFA has been reset" };
    }),

  /**
   * Get MFA statistics
   */
  getMfaStats: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    const { isMfaEnabled } = await import("../mfaDb");
    const allUsers = await database.select().from(users);

    // Count users with MFA enabled
    let mfaEnabledCount = 0;
    for (const user of allUsers) {
      const enabled = await isMfaEnabled(user.id);
      if (enabled) mfaEnabledCount++;
    }

    const mfaRequiredCount = allUsers.filter(u => u.mfaRequired === 1).length;
    const adminsWithMfa = allUsers.filter(u => u.role === "admin" && u.mfaRequired === 1).length;

    return {
      totalUsers: allUsers.length,
      mfaEnabledCount,
      mfaRequiredCount,
      adminsWithMfa,
      complianceRate: allUsers.length > 0 ? (mfaEnabledCount / allUsers.length) * 100 : 0,
    };
  }),
});
