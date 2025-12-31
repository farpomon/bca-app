/**
 * Admin Router
 * Provides administrative functions for system management
 * Only accessible to users with admin role
 */

import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, projects, companies, companyAccessCodes } from "../../drizzle/schema";
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
   * Respects privacy lock - filters out projects from locked companies unless owner has valid access
   */
  getAllProjects: adminProcedure
    .input(
      z.object({
        status: z.enum(["draft", "in_progress", "completed", "archived"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const allProjects = await database.select().from(projects);
      const allCompanies = await database.select().from(companies);
      const allUsers = await database.select().from(users);
      
      // Get companies with privacy lock enabled
      const lockedCompanyNames = new Set(
        allCompanies
          .filter(c => c.privacyLockEnabled === 1)
          .map(c => c.name)
      );
      
      // Check if current user has valid access to locked companies
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const validAccessCodes = await database
        .select()
        .from(companyAccessCodes)
        .where(
          sql`${companyAccessCodes.usedBy} = ${ctx.user.id} AND ${companyAccessCodes.usedAt} > ${oneHourAgo}`
        );
      
      const accessibleCompanyIds = new Set(validAccessCodes.map(c => c.companyId));
      const accessibleCompanyNames = new Set(
        allCompanies
          .filter(c => accessibleCompanyIds.has(c.id))
          .map(c => c.name)
      );
      
      // Filter projects based on privacy lock
      const accessibleProjects = allProjects.filter(project => {
        // Find the user who owns this project
        const projectOwner = allUsers.find(u => u.id === project.userId);
        if (!projectOwner) return true; // No owner, allow access
        
        const ownerCompany = projectOwner.company;
        if (!ownerCompany) return true; // No company, allow access
        
        // If company is not locked, allow access
        if (!lockedCompanyNames.has(ownerCompany)) return true;
        
        // If admin's own company, allow access
        if (ctx.user.company === ownerCompany) return true;
        
        // If admin has valid access code for this company, allow access
        if (accessibleCompanyNames.has(ownerCompany)) return true;
        
        // Otherwise, filter out
        return false;
      });
      
      // Filter by status if provided
      const filtered = input.status
        ? accessibleProjects.filter(p => p.status === input.status)
        : accessibleProjects;
      
      // Apply pagination
      const paginated = filtered.slice(input.offset, input.offset + input.limit);

      return paginated;
    }),

  /**
   * Get project details by ID (admin can access any project)
   * Respects privacy lock
   */
  getProjectById: adminProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const result = await database
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);
      
      const project = result[0];
      if (!project) return null;
      
      // Check privacy lock
      const projectOwner = await database
        .select()
        .from(users)
        .where(eq(users.id, project.userId))
        .limit(1);
      
      if (projectOwner[0]?.company && projectOwner[0].company !== ctx.user.company) {
        const [ownerCompany] = await database
          .select()
          .from(companies)
          .where(eq(companies.name, projectOwner[0].company))
          .limit(1);
        
        if (ownerCompany?.privacyLockEnabled === 1) {
          // Check for valid access code
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const [validAccess] = await database
            .select()
            .from(companyAccessCodes)
            .where(
              sql`${companyAccessCodes.companyId} = ${ownerCompany.id} AND ${companyAccessCodes.usedBy} = ${ctx.user.id} AND ${companyAccessCodes.usedAt} > ${oneHourAgo}`
            )
            .limit(1);
          
          if (!validAccess) {
            throw new Error("Access denied: This company has privacy lock enabled. Request an access code from the company.");
          }
        }
      }
      
      return project;
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
        privacyLockEnabled: company.privacyLockEnabled === 1,
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

  /**
   * Get company settings
   */
  getCompanySettings: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const result = await database.select().from(companies).where(eq(companies.id, input.id)).limit(1);
      if (result.length === 0) throw new Error("Company not found");

      const company = result[0];
      return {
        id: company.id,
        name: company.name,
        defaultTrialDuration: company.defaultTrialDuration ?? 14,
        mfaRequired: company.mfaRequired === 1,
        maxUsers: company.maxUsers ?? 100,
        featureAccess: company.featureAccess ? JSON.parse(company.featureAccess) : {
          aiImport: true,
          offlineMode: true,
          advancedReports: true,
          bulkOperations: true,
        },
      };
    }),

  /**
   * Update company settings
   */
  updateCompanySettings: adminProcedure
    .input(z.object({
      id: z.number(),
      defaultTrialDuration: z.number().min(1).max(365).optional(),
      mfaRequired: z.boolean().optional(),
      maxUsers: z.number().min(1).max(10000).optional(),
      featureAccess: z.object({
        aiImport: z.boolean().optional(),
        offlineMode: z.boolean().optional(),
        advancedReports: z.boolean().optional(),
        bulkOperations: z.boolean().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const { id, featureAccess, mfaRequired, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      
      if (mfaRequired !== undefined) {
        updateData.mfaRequired = mfaRequired ? 1 : 0;
      }
      
      if (featureAccess) {
        const existing = await database.select().from(companies).where(eq(companies.id, id)).limit(1);
        const existingFeatures = existing[0]?.featureAccess ? JSON.parse(existing[0].featureAccess) : {};
        updateData.featureAccess = JSON.stringify({ ...existingFeatures, ...featureAccess });
      }

      await database.update(companies).set(updateData).where(eq(companies.id, id));
      return { success: true };
    }),

  /**
   * Bulk extend trial for multiple users
   */
  bulkExtendTrial: adminProcedure
    .input(z.object({
      userIds: z.array(z.number()).min(1).max(1000),
      days: z.number().min(1).max(365),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      let successCount = 0;
      const errors: { userId: number; error: string }[] = [];

      for (const userId of input.userIds) {
        try {
          const user = await database.select().from(users).where(eq(users.id, userId)).limit(1);
          if (user.length === 0) {
            errors.push({ userId, error: "User not found" });
            continue;
          }

          const currentTrialEnd = user[0].trialEndsAt ? new Date(user[0].trialEndsAt) : new Date();
          const newTrialEnd = new Date(Math.max(currentTrialEnd.getTime(), Date.now()));
          newTrialEnd.setDate(newTrialEnd.getDate() + input.days);

          await database.update(users).set({
            trialEndsAt: newTrialEnd.toISOString().slice(0, 19).replace('T', ' '),
            accountStatus: "trial",
          }).where(eq(users.id, userId));
          successCount++;
        } catch (e) {
          errors.push({ userId, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      return { success: true, successCount, totalRequested: input.userIds.length, errors };
    }),

  /**
   * Bulk suspend users
   */
  bulkSuspendUsers: adminProcedure
    .input(z.object({
      userIds: z.array(z.number()).min(1).max(1000),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const { captureSnapshot } = await import("../services/undo.service");
      const operationId = await captureSnapshot({
        operationType: "suspend_users",
        performedBy: ctx.user.id,
        recordType: "user",
        recordIds: input.userIds,
      });

      let successCount = 0;
      const errors: { userId: number; error: string }[] = [];

      for (const userId of input.userIds) {
        try {
          await database.update(users).set({ accountStatus: "suspended" }).where(eq(users.id, userId));
          successCount++;
        } catch (e) {
          errors.push({ userId, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      return { success: true, successCount, totalRequested: input.userIds.length, errors, operationId };
    }),

  /**
   * Bulk activate users
   */
  bulkActivateUsers: adminProcedure
    .input(z.object({
      userIds: z.array(z.number()).min(1).max(1000),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const { captureSnapshot } = await import("../services/undo.service");
      const operationId = await captureSnapshot({
        operationType: "activate_users",
        performedBy: ctx.user.id,
        recordType: "user",
        recordIds: input.userIds,
      });

      let successCount = 0;
      const errors: { userId: number; error: string }[] = [];

      for (const userId of input.userIds) {
        try {
          await database.update(users).set({ accountStatus: "active" }).where(eq(users.id, userId));
          successCount++;
        } catch (e) {
          errors.push({ userId, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      return { success: true, successCount, totalRequested: input.userIds.length, errors, operationId };
    }),

  /**
   * Bulk change user roles
   */
  bulkChangeRole: adminProcedure
    .input(z.object({
      userIds: z.array(z.number()).min(1).max(1000),
      newRole: z.enum(["admin", "project_manager", "editor", "viewer"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const { captureSnapshot } = await import("../services/undo.service");
      const operationId = await captureSnapshot({
        operationType: "change_role",
        performedBy: ctx.user.id,
        recordType: "user",
        recordIds: input.userIds,
      });

      let successCount = 0;
      const errors: { userId: number; error: string }[] = [];

      for (const userId of input.userIds) {
        try {
          await database.update(users).set({ role: input.newRole }).where(eq(users.id, userId));
          successCount++;
        } catch (e) {
          errors.push({ userId, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      return { success: true, successCount, totalRequested: input.userIds.length, errors, operationId };
    }),

  /**
   * Bulk delete users
   */
  bulkDeleteUsers: adminProcedure
    .input(z.object({
      userIds: z.array(z.number()).min(1).max(1000),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Import undo service at top of file if not already imported
      const { captureSnapshot } = await import("../services/undo.service");

      // Capture snapshot before deletion for undo capability
      const operationId = await captureSnapshot({
        operationType: "delete_users",
        performedBy: ctx.user.id,
        recordType: "user",
        recordIds: input.userIds,
      });

      let successCount = 0;
      const errors: { userId: number; error: string }[] = [];

      for (const userId of input.userIds) {
        try {
          await database.delete(users).where(eq(users.id, userId));
          successCount++;
        } catch (e) {
          errors.push({ userId, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      return { success: true, successCount, totalRequested: input.userIds.length, errors, operationId };
    }),

  /**
   * Assign a user to a company and optionally set their role
   */
  assignUserToCompany: adminProcedure
    .input(z.object({
      userId: z.number(),
      companyName: z.string(),
      role: z.enum(["viewer", "editor", "project_manager", "admin"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Verify company exists
      const company = await database.select().from(companies).where(eq(companies.name, input.companyName)).limit(1);
      if (company.length === 0) {
        throw new Error("Company not found");
      }

      const updateData: Record<string, unknown> = {
        company: input.companyName,
      };

      if (input.role) {
        updateData.role = input.role;
      }

      await database.update(users).set(updateData).where(eq(users.id, input.userId));
      return { success: true };
    }),

  /**
   * Search users for admin assignment (returns users not yet assigned to a company or all users)
   */
  searchUsersForAssignment: adminProcedure
    .input(z.object({
      query: z.string().optional(),
      excludeCompany: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      let allUsers = await database.select().from(users);

      // Filter by search query
      if (input.query) {
        const query = input.query.toLowerCase();
        allUsers = allUsers.filter(u => 
          u.name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query)
        );
      }

      // Optionally exclude users already in a specific company
      if (input.excludeCompany) {
        allUsers = allUsers.filter(u => u.company !== input.excludeCompany);
      }

      return allUsers.slice(0, input.limit).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        company: u.company,
        accountStatus: u.accountStatus,
      }));
    }),

  /**
   * Create company with initial admin user
   */
  createCompanyWithAdmin: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      city: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
      adminUserId: z.number().optional(), // Optional: assign an existing user as admin
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Create the company
      const { adminUserId, ...companyData } = input;
      const result = await database.insert(companies).values(companyData);
      const companyId = Number(result[0].insertId);

      // If admin user is specified, assign them to the company with admin role
      if (adminUserId) {
        await database.update(users).set({
          company: input.name,
          role: "admin",
          accountStatus: "active",
        }).where(eq(users.id, adminUserId));
      }

      return { success: true, id: companyId };
    }),

  /**
   * Get all users that can be assigned as company admins
   */
  getAvailableAdmins: adminProcedure
    .input(z.object({
      companyName: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      let allUsers = await database.select().from(users);

      // If company name is provided, show users not in that company or already in it
      // This allows reassigning or viewing current admins
      return allUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        company: u.company,
        accountStatus: u.accountStatus,
        isInCompany: input.companyName ? u.company === input.companyName : false,
      }));
    }),

  /**
   * Create a new user directly under a company
   * This creates a placeholder user that will be activated when they first log in
   */
  createUserForCompany: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      companyName: z.string().min(1),
      role: z.enum(["viewer", "editor", "project_manager", "admin"]).default("viewer"),
      accountStatus: z.enum(["pending", "active", "trial"]).default("pending"),
      trialDays: z.number().min(1).max(365).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Verify company exists
      const company = await database.select().from(companies).where(eq(companies.name, input.companyName)).limit(1);
      if (company.length === 0) {
        throw new Error("Company not found");
      }

      // Check if user with this email already exists
      const existingUser = await database.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existingUser.length > 0) {
        throw new Error("A user with this email already exists");
      }

      // Check company max users limit
      const companyUsers = await database.select().from(users).where(eq(users.company, input.companyName));
      const maxUsers = company[0].maxUsers ?? 100;
      if (companyUsers.length >= maxUsers) {
        throw new Error(`Company has reached its maximum user limit of ${maxUsers}`);
      }

      // Calculate trial end date if trial status and days provided
      let trialEndsAt: string | null = null;
      if (input.accountStatus === "trial" && input.trialDays) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + input.trialDays);
        trialEndsAt = trialEnd.toISOString();
      } else if (input.accountStatus === "trial") {
        // Use company default trial duration
        const defaultDays = company[0].defaultTrialDuration ?? 14;
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + defaultDays);
        trialEndsAt = trialEnd.toISOString();
      }

      // Generate a temporary openId (will be replaced when user actually logs in)
      const tempOpenId = `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create the user
      const result = await database.insert(users).values({
        openId: tempOpenId,
        name: input.name,
        email: input.email,
        company: input.companyName,
        role: input.role,
        accountStatus: input.accountStatus,
        trialEndsAt: trialEndsAt,
        city: company[0].city || null,
      });

      return { 
        success: true, 
        id: Number(result[0].insertId),
        message: `User ${input.name} created and assigned to ${input.companyName}` 
      };
    }),

  /**
   * Remove user from company (unassign)
   */
  removeUserFromCompany: adminProcedure
    .input(z.object({
      userId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      await database.update(users).set({
        company: null,
      }).where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * Toggle privacy lock for a company
   */
  togglePrivacyLock: adminProcedure
    .input(z.object({
      companyId: z.number(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      await database.update(companies).set({
        privacyLockEnabled: input.enabled ? 1 : 0,
      }).where(eq(companies.id, input.companyId));

      return { success: true };
    }),
});
