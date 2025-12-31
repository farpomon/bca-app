import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as companyRolesDb from "./companyRolesDb";

/**
 * Company-specific roles router
 * Handles multi-company role management and access control
 */
export const companyRolesRouter = router({
  /**
   * Get all companies the current user belongs to
   */
  myCompanies: protectedProcedure.query(async ({ ctx }) => {
    const companies = await companyRolesDb.getUserCompanies(ctx.user.id);
    return companies.map(({ companyUser, company }) => ({
      ...company,
      role: companyUser.companyRole,
      joinedAt: companyUser.invitedAt,
    }));
  }),

  /**
   * Get user's role in a specific company
   */
  myRoleInCompany: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const role = await companyRolesDb.getUserRoleInCompany(ctx.user.id, input.companyId);
      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You are not a member of this company",
        });
      }
      return role;
    }),

  /**
   * Get all users in a company (requires company_admin or project_manager role)
   */
  getCompanyUsers: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Check if user has permission to view company users
      const hasPermission = await companyRolesDb.hasCompanyRole(
        ctx.user.id,
        input.companyId,
        "project_manager"
      );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view company users",
        });
      }

      const users = await companyRolesDb.getCompanyUsers(input.companyId);
      return users.map(({ companyUser, user }) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: companyUser.companyRole,
        status: companyUser.status,
        joinedAt: companyUser.invitedAt,
        acceptedAt: companyUser.acceptedAt,
      }));
    }),

  /**
   * Add a user to a company (requires company_admin role)
   */
  addUserToCompany: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
        userId: z.number(),
        role: z.enum(["company_admin", "project_manager", "editor", "viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if current user is company admin
      const isAdmin = await companyRolesDb.hasCompanyRole(
        ctx.user.id,
        input.companyId,
        "company_admin"
      );

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only company admins can add users",
        });
      }

      await companyRolesDb.addUserToCompany({
        companyId: input.companyId,
        userId: input.userId,
        companyRole: input.role,
        invitedBy: ctx.user.id,
        status: "active",
      });

      return { success: true };
    }),

  /**
   * Remove a user from a company (requires company_admin role)
   */
  removeUserFromCompany: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if current user is company admin
      const isAdmin = await companyRolesDb.hasCompanyRole(
        ctx.user.id,
        input.companyId,
        "company_admin"
      );

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only company admins can remove users",
        });
      }

      // Prevent removing yourself if you're the only admin
      if (input.userId === ctx.user.id) {
        const companyUsers = await companyRolesDb.getCompanyUsers(input.companyId);
        const activeAdmins = companyUsers.filter(
          ({ companyUser }) =>
            companyUser.companyRole === "company_admin" &&
            companyUser.status === "active"
        );

        if (activeAdmins.length === 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove the only admin from the company",
          });
        }
      }

      await companyRolesDb.removeUserFromCompany(input.userId, input.companyId);
      return { success: true };
    }),

  /**
   * Update user's role in a company (requires company_admin role)
   */
  updateUserRole: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
        userId: z.number(),
        newRole: z.enum(["company_admin", "project_manager", "editor", "viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if current user is company admin
      const isAdmin = await companyRolesDb.hasCompanyRole(
        ctx.user.id,
        input.companyId,
        "company_admin"
      );

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only company admins can update user roles",
        });
      }

      // Prevent demoting yourself if you're the only admin
      if (input.userId === ctx.user.id && input.newRole !== "company_admin") {
        const companyUsers = await companyRolesDb.getCompanyUsers(input.companyId);
        const activeAdmins = companyUsers.filter(
          ({ companyUser }) =>
            companyUser.companyRole === "company_admin" &&
            companyUser.status === "active"
        );

        if (activeAdmins.length === 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot demote the only admin in the company",
          });
        }
      }

      await companyRolesDb.updateUserRoleInCompany(
        input.userId,
        input.companyId,
        input.newRole
      );

      return { success: true };
    }),

  /**
   * Get all companies (super admin only)
   */
  getAllCompanies: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is super admin
    if (!ctx.user.isSuperAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only super admins can view all companies",
      });
    }

    return await companyRolesDb.getAllCompanies();
  }),

  /**
   * Create a new company (super admin only)
   * Creator is automatically assigned as company_admin
   */
  createCompany: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Company name is required"),
        city: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is super admin
      if (!ctx.user.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can create companies",
        });
      }

      const companyId = await companyRolesDb.createCompany(input, ctx.user.id);
      return { id: companyId, success: true };
    }),

  /**
   * Update company details (requires company_admin role)
   */
  updateCompany: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
        name: z.string().min(1).optional(),
        city: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyId, ...data } = input;

      // Check if user is company admin or super admin
      const isCompanyAdmin = await companyRolesDb.hasCompanyRole(
        ctx.user.id,
        companyId,
        "company_admin"
      );

      if (!isCompanyAdmin && !ctx.user.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only company admins can update company details",
        });
      }

      await companyRolesDb.updateCompany(companyId, data);
      return { success: true };
    }),

  /**
   * Invite a user to a company by email (requires company_admin role)
   */
  inviteUserByEmail: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
        email: z.string().email("Invalid email address"),
        role: z.enum(["company_admin", "project_manager", "editor", "viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is company admin
      const isAdmin = await companyRolesDb.hasCompanyRole(
        ctx.user.id,
        input.companyId,
        "company_admin"
      );

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only company admins can invite users",
        });
      }

      const result = await companyRolesDb.createPendingInvitation({
        companyId: input.companyId,
        email: input.email,
        role: input.role,
        invitedBy: ctx.user.id,
      });

      if (result.isNewUser) {
        // User doesn't exist in the system yet
        // In a real implementation, you would send an email invitation here
        return {
          success: true,
          isNewUser: true,
          message: `Invitation will be sent to ${input.email}. They will be added when they sign up.`,
        };
      }

      return {
        success: true,
        isNewUser: false,
        message: "User has been invited to the company",
      };
    }),

  /**
   * Get pending invitations for the current user
   */
  myPendingInvitations: protectedProcedure.query(async ({ ctx }) => {
    const invitations = await companyRolesDb.getPendingInvitations(ctx.user.id);
    return invitations.map(({ companyUser, company }) => ({
      id: companyUser.id,
      companyId: company.id,
      companyName: company.name,
      role: companyUser.companyRole,
      invitedAt: companyUser.invitedAt,
    }));
  }),

  /**
   * Accept a pending invitation
   */
  acceptInvitation: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await companyRolesDb.acceptInvitation(ctx.user.id, input.companyId);
      return { success: true };
    }),

  /**
   * Decline a pending invitation
   */
  declineInvitation: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await companyRolesDb.removeUserFromCompany(ctx.user.id, input.companyId);
      return { success: true };
    }),

  /**
   * Get company details (requires membership)
   */
  getCompany: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Check if user belongs to the company or is super admin
      const userRole = await companyRolesDb.getUserRoleInCompany(ctx.user.id, input.companyId);
      
      if (!userRole && !ctx.user.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this company",
        });
      }

      const company = await companyRolesDb.getCompanyById(input.companyId);
      if (!company) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Company not found",
        });
      }

      return company;
    }),
});
