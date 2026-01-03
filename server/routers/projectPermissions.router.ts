/**
 * Project Permissions Router
 * Manages company-level project access permissions
 * Allows company admins to grant/revoke access to specific projects
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { projectPermissions, projects, users, companies } from "../../drizzle/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export const projectPermissionsRouter = router({
  /**
   * Get all project permissions for a company
   * Only company admins can view permissions for their company
   */
  listByCompany: protectedProcedure
    .input(z.object({
      companyName: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Use provided company name or user's company
      const companyName = input.companyName || ctx.user.company;
      if (!companyName) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Company name is required" });
      }

      // Only admins can view permissions
      if (ctx.user.role !== "admin" && ctx.user.role !== "project_manager") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins and project managers can view permissions" });
      }

      // Get company ID
      const [company] = await db.select().from(companies).where(eq(companies.name, companyName)).limit(1);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      // Get all permissions for this company
      const permissions = await db
        .select({
          id: projectPermissions.id,
          projectId: projectPermissions.projectId,
          userId: projectPermissions.userId,
          companyId: projectPermissions.companyId,
          permission: projectPermissions.permission,
          grantedBy: projectPermissions.grantedBy,
          createdAt: projectPermissions.createdAt,
          updatedAt: projectPermissions.updatedAt,
        })
        .from(projectPermissions)
        .where(eq(projectPermissions.companyId, company.id));

      // Enrich with user and project details
      const enrichedPermissions = await Promise.all(
        permissions.map(async (perm) => {
          const [user] = await db.select({ id: users.id, name: users.name, email: users.email })
            .from(users).where(eq(users.id, perm.userId)).limit(1);
          const [project] = await db.select({ id: projects.id, name: projects.name })
            .from(projects).where(eq(projects.id, perm.projectId)).limit(1);
          const [granter] = perm.grantedBy 
            ? await db.select({ id: users.id, name: users.name })
                .from(users).where(eq(users.id, perm.grantedBy)).limit(1)
            : [null];

          return {
            ...perm,
            user: user || null,
            project: project || null,
            grantedByUser: granter,
          };
        })
      );

      return enrichedPermissions;
    }),

  /**
   * Get permissions for a specific project
   */
  listByProject: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify user has access to this project
      const isAdmin = ctx.user.role === "admin";
      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
      
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Check if user owns the project or is admin
      if (project.userId !== ctx.user.id && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to view this project's permissions" });
      }

      // Get all permissions for this project
      const permissions = await db
        .select()
        .from(projectPermissions)
        .where(eq(projectPermissions.projectId, input.projectId));

      // Enrich with user details
      const enrichedPermissions = await Promise.all(
        permissions.map(async (perm) => {
          const [user] = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
            .from(users).where(eq(users.id, perm.userId)).limit(1);
          return {
            ...perm,
            user: user || null,
          };
        })
      );

      return enrichedPermissions;
    }),

  /**
   * Get permissions for a specific user
   */
  listByUser: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const targetUserId = input.userId || ctx.user.id;

      // Only admins can view other users' permissions
      if (targetUserId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own permissions" });
      }

      const permissions = await db
        .select()
        .from(projectPermissions)
        .where(eq(projectPermissions.userId, targetUserId));

      // Enrich with project details
      const enrichedPermissions = await Promise.all(
        permissions.map(async (perm) => {
          const [project] = await db.select({ id: projects.id, name: projects.name, status: projects.status })
            .from(projects).where(eq(projects.id, perm.projectId)).limit(1);
          return {
            ...perm,
            project: project || null,
          };
        })
      );

      return enrichedPermissions;
    }),

  /**
   * Grant project permission to a user
   */
  grant: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      userId: z.number(),
      permission: z.enum(["view", "edit"]).default("view"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Only admins and project managers can grant permissions
      if (ctx.user.role !== "admin" && ctx.user.role !== "project_manager") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins and project managers can grant permissions" });
      }

      // Verify project exists
      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Verify target user exists and belongs to same company
      const [targetUser] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Get company ID
      let companyId: number | null = null;
      if (ctx.user.company) {
        const [company] = await db.select().from(companies).where(eq(companies.name, ctx.user.company)).limit(1);
        companyId = company?.id || null;
      }

      // Check if permission already exists
      const [existingPerm] = await db
        .select()
        .from(projectPermissions)
        .where(and(
          eq(projectPermissions.projectId, input.projectId),
          eq(projectPermissions.userId, input.userId)
        ))
        .limit(1);

      if (existingPerm) {
        // Update existing permission
        await db
          .update(projectPermissions)
          .set({
            permission: input.permission,
            grantedBy: ctx.user.id,
          })
          .where(eq(projectPermissions.id, existingPerm.id));

        return { success: true, message: "Permission updated", id: existingPerm.id };
      }

      // Create new permission
      const result = await db.insert(projectPermissions).values({
        projectId: input.projectId,
        userId: input.userId,
        companyId,
        permission: input.permission,
        grantedBy: ctx.user.id,
      });

      return { success: true, message: "Permission granted", id: Number(result[0].insertId) };
    }),

  /**
   * Revoke project permission from a user
   */
  revoke: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Only admins and project managers can revoke permissions
      if (ctx.user.role !== "admin" && ctx.user.role !== "project_manager") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins and project managers can revoke permissions" });
      }

      // Delete the permission
      await db
        .delete(projectPermissions)
        .where(and(
          eq(projectPermissions.projectId, input.projectId),
          eq(projectPermissions.userId, input.userId)
        ));

      return { success: true, message: "Permission revoked" };
    }),

  /**
   * Bulk grant permissions to multiple users for a project
   */
  bulkGrant: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      userIds: z.array(z.number()),
      permission: z.enum(["view", "edit"]).default("view"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Only admins can bulk grant
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can bulk grant permissions" });
      }

      // Get company ID
      let companyId: number | null = null;
      if (ctx.user.company) {
        const [company] = await db.select().from(companies).where(eq(companies.name, ctx.user.company)).limit(1);
        companyId = company?.id || null;
      }

      let granted = 0;
      let updated = 0;

      for (const userId of input.userIds) {
        // Check if permission already exists
        const [existingPerm] = await db
          .select()
          .from(projectPermissions)
          .where(and(
            eq(projectPermissions.projectId, input.projectId),
            eq(projectPermissions.userId, userId)
          ))
          .limit(1);

        if (existingPerm) {
          await db
            .update(projectPermissions)
            .set({
              permission: input.permission,
              grantedBy: ctx.user.id,
            })
            .where(eq(projectPermissions.id, existingPerm.id));
          updated++;
        } else {
          await db.insert(projectPermissions).values({
            projectId: input.projectId,
            userId,
            companyId,
            permission: input.permission,
            grantedBy: ctx.user.id,
          });
          granted++;
        }
      }

      return { success: true, granted, updated, total: input.userIds.length };
    }),

  /**
   * Bulk revoke permissions from multiple users for a project
   */
  bulkRevoke: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      userIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Only admins can bulk revoke
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can bulk revoke permissions" });
      }

      await db
        .delete(projectPermissions)
        .where(and(
          eq(projectPermissions.projectId, input.projectId),
          inArray(projectPermissions.userId, input.userIds)
        ));

      return { success: true, revoked: input.userIds.length };
    }),

  /**
   * Get company users who can be granted permissions
   */
  getCompanyUsers: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      if (!ctx.user.company) {
        return [];
      }

      // Get all users in the same company
      const companyUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          accountStatus: users.accountStatus,
        })
        .from(users)
        .where(eq(users.company, ctx.user.company));

      // If projectId provided, include permission status
      if (input.projectId) {
        const permissions = await db
          .select()
          .from(projectPermissions)
          .where(eq(projectPermissions.projectId, input.projectId));

        const permissionMap = new Map(permissions.map(p => [p.userId, p.permission]));

        return companyUsers.map(user => ({
          ...user,
          hasAccess: permissionMap.has(user.id),
          permission: permissionMap.get(user.id) || null,
        }));
      }

      return companyUsers.map(user => ({
        ...user,
        hasAccess: false,
        permission: null,
      }));
    }),

  /**
   * Get projects that can have permissions managed
   * Returns projects owned by the company
   */
  getCompanyProjects: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      if (!ctx.user.company) {
        return [];
      }

      // Get all projects owned by users in the same company
      const companyUserIds = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.company, ctx.user.company));

      const userIds = companyUserIds.map(u => u.id);

      if (userIds.length === 0) {
        return [];
      }

      const companyProjects = await db
        .select({
          id: projects.id,
          name: projects.name,
          status: projects.status,
          userId: projects.userId,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(inArray(projects.userId, userIds));

      // Get permission counts for each project
      const projectsWithCounts = await Promise.all(
        companyProjects.map(async (project) => {
          const [countResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(projectPermissions)
            .where(eq(projectPermissions.projectId, project.id));

          return {
            ...project,
            permissionCount: Number(countResult?.count || 0),
          };
        })
      );

      return projectsWithCounts;
    }),
});
