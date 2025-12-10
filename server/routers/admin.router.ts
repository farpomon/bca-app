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
});
