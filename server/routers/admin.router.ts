/**
 * Admin Router
 * Provides administrative functions for system management
 * Only accessible to users with admin role
 */

import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, projects, companies } from "../../drizzle/schema";
import { sql } from "drizzle-orm";
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
   * Enforce MFA for specific roles with 7-day grace period
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

      // Calculate grace period end (7 days from now)
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

      // Set mfaRequired=1 for all users with this role
      await database
        .update(users)
        .set({ 
          mfaRequired: 1,
          mfaEnforcedAt: new Date().toISOString(),
          mfaGracePeriodEnd: gracePeriodEnd.toISOString(),
        })
        .where(eq(users.role, input.role));

      return { success: true, message: `MFA enforced for all ${input.role} users with 7-day grace period` };
    }),

  /**
   * Require MFA for specific user with 7-day grace period
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

      // Calculate grace period end (7 days from now) if enforcing
      const gracePeriodEnd = input.required ? new Date() : null;
      if (gracePeriodEnd) {
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
      }

      await database
        .update(users)
        .set({ 
          mfaRequired: input.required ? 1 : 0,
          mfaEnforcedAt: input.required ? new Date().toISOString() : null,
          mfaGracePeriodEnd: gracePeriodEnd ? gracePeriodEnd.toISOString() : null,
        })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * Reset user's MFA (admin emergency access) with audit logging
   */
  resetUserMfa: adminProcedure
    .input(z.object({ 
      userId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const { disableMfa } = await import("../mfaDb");
      const { logMfaAuditEvent } = await import("../mfaDb");

      // Get target user info
      const targetUser = await database.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (targetUser.length === 0) {
        throw new Error("User not found");
      }

      // Disable MFA
      await disableMfa(input.userId);

      // Log audit event
      const auditDetails = `Reset by admin ${ctx.user.name} (${ctx.user.email}). Target: ${targetUser[0]?.name} (${targetUser[0]?.email}). Reason: ${input.reason || "No reason provided"}`;
      await logMfaAuditEvent({
        userId: input.userId,
        action: "mfa_reset_by_admin",
        success: true,
        ipAddress: ctx.req.ip || "unknown",
        userAgent: ctx.req.headers["user-agent"] || "unknown",
        failureReason: auditDetails,
      });

      return { success: true, message: "User MFA has been reset and audit log created" };
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

  /**
   * Get MFA compliance report with detailed breakdown by role and time period
   */
  // ============ Company Management ============
  
  /**
   * Get all companies with user counts
   */
  getCompanies: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    const allCompanies = await database.select().from(companies);
    const allUsers = await database.select().from(users);

    // Calculate user counts per company
    return allCompanies.map(company => {
      const companyUsers = allUsers.filter(u => u.company === company.name);
      const roleBreakdown = {
        admin: companyUsers.filter(u => u.role === "admin").length,
        project_manager: companyUsers.filter(u => u.role === "project_manager").length,
        editor: companyUsers.filter(u => u.role === "editor").length,
        viewer: companyUsers.filter(u => u.role === "viewer").length,
      };
      const statusBreakdown = {
        active: companyUsers.filter(u => u.accountStatus === "active").length,
        trial: companyUsers.filter(u => u.accountStatus === "trial").length,
        suspended: companyUsers.filter(u => u.accountStatus === "suspended").length,
        pending: companyUsers.filter(u => u.accountStatus === "pending").length,
      };
      
      return {
        ...company,
        userCount: companyUsers.length,
        roleBreakdown,
        statusBreakdown,
      };
    });
  }),

  /**
   * Get company by ID with full details
   */
  getCompanyById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const result = await database.select().from(companies).where(eq(companies.id, input.id)).limit(1);
      if (result.length === 0) return null;

      const company = result[0];
      const companyUsers = await database.select().from(users).where(eq(users.company, company.name));

      return {
        ...company,
        users: companyUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          accountStatus: u.accountStatus,
          trialEndsAt: u.trialEndsAt,
          lastSignedIn: u.lastSignedIn,
        })),
      };
    }),

  /**
   * Create a new company
   */
  createCompany: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      city: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const result = await database.insert(companies).values(input);
      return { success: true, id: Number(result[0].insertId) };
    }),

  /**
   * Update company details
   */
  updateCompany: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      city: z.string().optional(),
      status: z.enum(["active", "suspended", "inactive"]).optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const { id, ...data } = input;
      
      // If company status is being suspended, also suspend all users
      if (data.status === "suspended") {
        const company = await database.select().from(companies).where(eq(companies.id, id)).limit(1);
        if (company.length > 0) {
          await database
            .update(users)
            .set({ accountStatus: "suspended" })
            .where(eq(users.company, company[0].name));
        }
      }

      await database.update(companies).set(data).where(eq(companies.id, id));
      return { success: true };
    }),

  /**
   * Delete company (only if no users)
   */
  deleteCompany: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Check if company has users
      const company = await database.select().from(companies).where(eq(companies.id, input.id)).limit(1);
      if (company.length === 0) {
        throw new Error("Company not found");
      }

      const companyUsers = await database.select().from(users).where(eq(users.company, company[0].name));
      if (companyUsers.length > 0) {
        throw new Error("Cannot delete company with existing users. Remove or reassign users first.");
      }

      await database.delete(companies).where(eq(companies.id, input.id));
      return { success: true };
    }),

  /**
   * Get users by company
   */
  getUsersByCompany: adminProcedure
    .input(z.object({ companyName: z.string() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const companyUsers = await database.select().from(users).where(eq(users.company, input.companyName));
      return companyUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        accountStatus: u.accountStatus,
        trialEndsAt: u.trialEndsAt,
        createdAt: u.createdAt,
        lastSignedIn: u.lastSignedIn,
      }));
    }),

  /**
   * Update user's trial end date
   */
  extendUserTrial: adminProcedure
    .input(z.object({
      userId: z.number(),
      trialEndsAt: z.string(), // ISO date string
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      await database
        .update(users)
        .set({ 
          trialEndsAt: input.trialEndsAt,
          accountStatus: "trial",
        })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * Suspend user account
   */
  suspendUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      await database
        .update(users)
        .set({ accountStatus: "suspended" })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * Activate user account
   */
  activateUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      await database
        .update(users)
        .set({ accountStatus: "active", trialEndsAt: null })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * Get trial expiration stats
   */
  getTrialStats: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    const allUsers = await database.select().from(users);
    const trialUsers = allUsers.filter(u => u.accountStatus === "trial");
    
    const now = new Date();
    const expiringSoon = trialUsers.filter(u => {
      if (!u.trialEndsAt) return false;
      const trialEnd = new Date(u.trialEndsAt);
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysRemaining <= 7 && daysRemaining > 0;
    });
    
    const expired = trialUsers.filter(u => {
      if (!u.trialEndsAt) return false;
      return new Date(u.trialEndsAt) < now;
    });

    return {
      totalTrialUsers: trialUsers.length,
      expiringSoon: expiringSoon.length,
      expired: expired.length,
      expiringSoonUsers: expiringSoon.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        company: u.company,
        trialEndsAt: u.trialEndsAt,
      })),
      expiredUsers: expired.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        company: u.company,
        trialEndsAt: u.trialEndsAt,
      })),
    };
  }),

  getMfaComplianceReport: adminProcedure
    .input(
      z.object({
        timePeriod: z.enum(["7days", "30days", "90days", "all"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const { isMfaEnabled } = await import("../mfaDb");
      const allUsers = await database.select().from(users);

      // Filter users by time period based on when they were created
      let filteredUsers = allUsers;
      if (input.timePeriod !== "all") {
        const now = new Date();
        const daysMap = { "7days": 7, "30days": 30, "90days": 90 };
        const days = daysMap[input.timePeriod];
        const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        filteredUsers = allUsers.filter(u => {
          const createdAt = new Date(u.createdAt);
          return createdAt >= cutoffDate;
        });
      }

      // Calculate adoption by role
      const roles = ["admin", "project_manager", "editor", "viewer"] as const;
      const adoptionByRole: Record<string, { total: number; enabled: number; required: number; adoptionRate: number }> = {};

      for (const role of roles) {
        const roleUsers = filteredUsers.filter(u => u.role === role);
        let enabledCount = 0;
        
        for (const user of roleUsers) {
          const enabled = await isMfaEnabled(user.id);
          if (enabled) enabledCount++;
        }

        const requiredCount = roleUsers.filter(u => u.mfaRequired === 1).length;
        
        adoptionByRole[role] = {
          total: roleUsers.length,
          enabled: enabledCount,
          required: requiredCount,
          adoptionRate: roleUsers.length > 0 ? (enabledCount / roleUsers.length) * 100 : 0,
        };
      }

      // Calculate overall stats
      let totalEnabled = 0;
      for (const user of filteredUsers) {
        const enabled = await isMfaEnabled(user.id);
        if (enabled) totalEnabled++;
      }

      const totalRequired = filteredUsers.filter(u => u.mfaRequired === 1).length;

      // Generate user details for CSV export
      const userDetails = [];
      for (const user of filteredUsers) {
        const enabled = await isMfaEnabled(user.id);
        userDetails.push({
          id: user.id,
          name: user.name || "N/A",
          email: user.email || "N/A",
          role: user.role,
          company: user.company || "N/A",
          mfaEnabled: enabled,
          mfaRequired: user.mfaRequired === 1,
          mfaEnforcedAt: user.mfaEnforcedAt || null,
          gracePeriodEnd: user.mfaGracePeriodEnd || null,
          createdAt: user.createdAt,
        });
      }

      return {
        timePeriod: input.timePeriod,
        totalUsers: filteredUsers.length,
        totalEnabled,
        totalRequired,
        overallAdoptionRate: filteredUsers.length > 0 ? (totalEnabled / filteredUsers.length) * 100 : 0,
        adoptionByRole,
        userDetails,
      };
    }),
});
