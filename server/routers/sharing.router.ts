import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { projectPermissions, projects, users } from "../../drizzle/schema";
import { hasPermission } from "../permissions";
import { TRPCError } from "@trpc/server";

/**
 * Project sharing router - manage project-level permissions
 */
export const sharingRouter = router({
  /**
   * Share a project with another user
   */
  shareProject: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        userId: z.number(),
        permission: z.enum(["view", "edit"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if user has permission to share projects
      if (!hasPermission(ctx.user.role, "project.share")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to share projects" });
      }

      // Check if user owns the project
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      if (project.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only share your own projects" });
      }

      // Check if permission already exists
      const [existing] = await db
        .select()
        .from(projectPermissions)
        .where(
          and(
            eq(projectPermissions.projectId, input.projectId),
            eq(projectPermissions.userId, input.userId)
          )
        )
        .limit(1);

      if (existing) {
        // Update existing permission
        await db
          .update(projectPermissions)
          .set({
            permission: input.permission,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(projectPermissions.id, existing.id));
      } else {
        // Create new permission
        await db.insert(projectPermissions).values({
          projectId: input.projectId,
          userId: input.userId,
          permission: input.permission,
          grantedBy: ctx.user.id,
        });
      }

      return { success: true };
    }),

  /**
   * Remove project sharing
   */
  removeShare: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if user owns the project
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only manage sharing for your own projects" });
      }

      await db
        .delete(projectPermissions)
        .where(
          and(
            eq(projectPermissions.projectId, input.projectId),
            eq(projectPermissions.userId, input.userId)
          )
        );

      return { success: true };
    }),

  /**
   * Get all users who have access to a project
   */
  getProjectShares: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if user owns the project
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only view sharing for your own projects" });
      }

      const shares = await db
        .select({
          id: projectPermissions.id,
          userId: projectPermissions.userId,
          userName: users.name,
          userEmail: users.email,
          permission: projectPermissions.permission,
          grantedAt: projectPermissions.createdAt,
        })
        .from(projectPermissions)
        .leftJoin(users, eq(projectPermissions.userId, users.id))
        .where(eq(projectPermissions.projectId, input.projectId));

      return shares;
    }),

  /**
   * Get all projects shared with the current user
   */
  getSharedWithMe: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const sharedProjects = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        projectAddress: projects.address,
        projectStatus: projects.status,
        permission: projectPermissions.permission,
        ownerName: users.name,
        sharedAt: projectPermissions.createdAt,
      })
      .from(projectPermissions)
      .leftJoin(projects, eq(projectPermissions.projectId, projects.id))
      .leftJoin(users, eq(projects.userId, users.id))
      .where(eq(projectPermissions.userId, ctx.user.id));

    return sharedProjects;
  }),

  /**
   * Check if user has permission to access a project
   */
  checkProjectAccess: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { hasAccess: false, permission: null };

      // Check if user owns the project
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (project?.userId === ctx.user.id) {
        return { hasAccess: true, permission: "owner" as const, isOwner: true };
      }

      // Check if project is shared with user
      const [share] = await db
        .select()
        .from(projectPermissions)
        .where(
          and(
            eq(projectPermissions.projectId, input.projectId),
            eq(projectPermissions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (share) {
        return { hasAccess: true, permission: share.permission, isOwner: false };
      }

      return { hasAccess: false, permission: null, isOwner: false };
    }),
});
