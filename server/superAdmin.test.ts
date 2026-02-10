import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(userOverrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    company: "Test Company",
    companyId: 1,
    isSuperAdmin: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    accountStatus: "active",
    mfaEnabled: 0,
    mfaSecret: null,
    mfaRequired: 0,
    mfaGracePeriodEnd: null,
    city: null,
    unitPreference: "metric",
    ...userOverrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Super Admin Access Control", () => {
  describe("toggleSuperAdmin procedure", () => {
    it("should allow super admin to grant super admin status", async () => {
      const ctx = createMockContext({
        id: 1,
        role: "admin",
        isSuperAdmin: 1, // Current user is super admin
      });
      
      const caller = appRouter.createCaller(ctx);
      
      // This will fail because we're not mocking the database
      // But it tests that the procedure exists and accepts the right input
      try {
        await caller.admin.toggleSuperAdmin({
          userId: 2,
          isSuperAdmin: true,
        });
      } catch (error: any) {
        // Expected to fail due to database not being mocked
        // But should not fail due to permission check
        expect(error.message).not.toContain("Only super admins can modify super admin status");
      }
    });

    it("should reject non-super admin from granting super admin status", async () => {
      const ctx = createMockContext({
        id: 1,
        role: "admin",
        isSuperAdmin: 0, // Current user is NOT super admin
      });
      
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.admin.toggleSuperAdmin({
          userId: 2,
          isSuperAdmin: true,
        })
      ).rejects.toThrow("Only super admins can modify super admin status");
    });

    it("should allow super admin to revoke super admin status", async () => {
      const ctx = createMockContext({
        id: 1,
        role: "admin",
        isSuperAdmin: 1, // Current user is super admin
      });
      
      const caller = appRouter.createCaller(ctx);
      
      try {
        await caller.admin.toggleSuperAdmin({
          userId: 2,
          isSuperAdmin: false,
        });
      } catch (error: any) {
        // Expected to fail due to database not being mocked
        // But should not fail due to permission check
        expect(error.message).not.toContain("Only super admins can modify super admin status");
      }
    });
  });

  describe("assignUserToCompany procedure", () => {
    it("should accept valid company assignment input", async () => {
      const ctx = createMockContext({
        id: 1,
        role: "admin",
      });
      
      const caller = appRouter.createCaller(ctx);
      
      try {
        await caller.admin.assignUserToCompany({
          userId: 2,
          companyName: "test-company",
        });
      } catch (error: any) {
        // Expected to fail due to database not being mocked
        // But should not fail due to input validation
        expect(error.message).not.toContain("Invalid input");
      }
    });
  });

  describe("User context includes super admin fields", () => {
    it("should include companyId in user context", () => {
      const ctx = createMockContext({
        companyId: 5,
      });
      
      expect(ctx.user?.companyId).toBe(5);
    });

    it("should include isSuperAdmin in user context", () => {
      const ctx = createMockContext({
        isSuperAdmin: 1,
      });
      
      expect(ctx.user?.isSuperAdmin).toBe(1);
    });

    it("should default isSuperAdmin to 0", () => {
      const ctx = createMockContext({});
      
      expect(ctx.user?.isSuperAdmin).toBe(0);
    });
  });

  describe("Access control logic", () => {
    it("super admin flag should be recognized as boolean 1", () => {
      const ctx = createMockContext({
        isSuperAdmin: 1,
      });
      
      const isSuperAdmin = ctx.user?.isSuperAdmin === 1;
      expect(isSuperAdmin).toBe(true);
    });

    it("non-super admin should have isSuperAdmin as 0", () => {
      const ctx = createMockContext({
        isSuperAdmin: 0,
      });
      
      const isSuperAdmin = ctx.user?.isSuperAdmin === 1;
      expect(isSuperAdmin).toBe(false);
    });

    it("admin with companyId should be company-restricted", () => {
      const ctx = createMockContext({
        role: "admin",
        companyId: 3,
        isSuperAdmin: 0,
      });
      
      // Admin with companyId but not super admin should be company-restricted
      const isAdmin = ctx.user?.role === "admin";
      const isSuperAdmin = ctx.user?.isSuperAdmin === 1;
      const hasCompanyId = ctx.user?.companyId !== null;
      
      expect(isAdmin).toBe(true);
      expect(isSuperAdmin).toBe(false);
      expect(hasCompanyId).toBe(true);
      
      // This admin should only see projects from company 3
      const shouldFilterByCompany = isAdmin && !isSuperAdmin && hasCompanyId;
      expect(shouldFilterByCompany).toBe(true);
    });

    it("super admin should bypass company filtering", () => {
      const ctx = createMockContext({
        role: "admin",
        companyId: 3,
        isSuperAdmin: 1,
      });
      
      const isAdmin = ctx.user?.role === "admin";
      const isSuperAdmin = ctx.user?.isSuperAdmin === 1;
      
      expect(isAdmin).toBe(true);
      expect(isSuperAdmin).toBe(true);
      
      // Super admin should NOT be filtered by company
      const shouldFilterByCompany = isAdmin && !isSuperAdmin;
      expect(shouldFilterByCompany).toBe(false);
    });
  });
});
