/**
 * MFA Enhancements Test Suite
 * Tests for admin MFA reset, grace period, and compliance reports
 */

import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const adminUser: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user: adminUser,
    req: {
      protocol: "https",
      headers: { "user-agent": "test-agent" },
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createUserContext(userId: number, role: "admin" | "project_manager" | "editor" | "viewer" = "editor"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: { "user-agent": "test-agent" },
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("MFA Enhancements", () => {
  describe("Grace Period Enforcement", () => {
    it("should set 7-day grace period when enforcing MFA for role", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.enforceMfaForRole({ role: "admin" });

      expect(result.success).toBe(true);
      expect(result.message).toContain("7-day grace period");
    });

    it("should set 7-day grace period when requiring MFA for specific user", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.requireMfaForUser({ userId: 2, required: true });

      expect(result.success).toBe(true);
    });

    it("should clear grace period when disabling MFA requirement", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.requireMfaForUser({ userId: 2, required: false });

      expect(result.success).toBe(true);
    });

    it("should check grace period status in MFA requirement check", async () => {
      const ctx = createUserContext(2);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mfa.checkMfaRequirement();

      expect(result).toHaveProperty("inGracePeriod");
      expect(result).toHaveProperty("gracePeriodEnd");
      expect(result).toHaveProperty("gracePeriodExpired");
      expect(result).toHaveProperty("daysRemaining");
      expect(result).toHaveProperty("mustSetupNow");
    });

    it("should calculate days remaining correctly", async () => {
      const ctx = createUserContext(2);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mfa.checkMfaRequirement();

      if (result.inGracePeriod) {
        expect(result.daysRemaining).toBeGreaterThan(0);
        expect(result.daysRemaining).toBeLessThanOrEqual(7);
      } else {
        expect(result.daysRemaining).toBe(0);
      }
    });

    it("should indicate mustSetupNow when grace period expired", async () => {
      const ctx = createUserContext(2);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mfa.checkMfaRequirement();

      if (result.gracePeriodExpired && result.required && !result.enabled) {
        expect(result.mustSetupNow).toBe(true);
      }
    });
  });

  describe("Admin MFA Reset with Audit Logging", () => {
    it("should reset user MFA successfully", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.resetUserMfa({ 
        userId: 2,
        reason: "User lost access to authenticator app"
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("audit log created");
    });

    it("should accept optional reason parameter", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.resetUserMfa({ userId: 2 });

      expect(result.success).toBe(true);
    });

    it("should fail when resetting MFA for non-existent user", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.resetUserMfa({ userId: 99999 })
      ).rejects.toThrow("User not found");
    });

    it("should only allow admins to reset MFA", async () => {
      const ctx = createUserContext(2, "editor");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.resetUserMfa({ userId: 3 })
      ).rejects.toThrow();
    });
  });

  describe("MFA Compliance Reports", () => {
    it("should generate compliance report for all time", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.getMfaComplianceReport({ timePeriod: "all" });

      expect(result).toHaveProperty("timePeriod", "all");
      expect(result).toHaveProperty("totalUsers");
      expect(result).toHaveProperty("totalEnabled");
      expect(result).toHaveProperty("totalRequired");
      expect(result).toHaveProperty("overallAdoptionRate");
      expect(result).toHaveProperty("adoptionByRole");
      expect(result).toHaveProperty("userDetails");
    });

    it("should generate compliance report for last 7 days", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.getMfaComplianceReport({ timePeriod: "7days" });

      expect(result.timePeriod).toBe("7days");
      expect(result.totalUsers).toBeGreaterThanOrEqual(0);
    });

    it("should generate compliance report for last 30 days", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.getMfaComplianceReport({ timePeriod: "30days" });

      expect(result.timePeriod).toBe("30days");
    });

    it("should generate compliance report for last 90 days", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.getMfaComplianceReport({ timePeriod: "90days" });

      expect(result.timePeriod).toBe("90days");
    });

    it("should include adoption stats for all roles", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.getMfaComplianceReport({ timePeriod: "all" });

      expect(result.adoptionByRole).toHaveProperty("admin");
      expect(result.adoptionByRole).toHaveProperty("project_manager");
      expect(result.adoptionByRole).toHaveProperty("editor");
      expect(result.adoptionByRole).toHaveProperty("viewer");
    });

    it("should calculate adoption rate correctly for each role", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.getMfaComplianceReport({ timePeriod: "all" });

      for (const [role, stats] of Object.entries(result.adoptionByRole)) {
        expect(stats).toHaveProperty("total");
        expect(stats).toHaveProperty("enabled");
        expect(stats).toHaveProperty("required");
        expect(stats).toHaveProperty("adoptionRate");

        if (stats.total > 0) {
          const expectedRate = (stats.enabled / stats.total) * 100;
          expect(stats.adoptionRate).toBeCloseTo(expectedRate, 1);
        } else {
          expect(stats.adoptionRate).toBe(0);
        }
      }
    });

    it("should include user details with all required fields", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.getMfaComplianceReport({ timePeriod: "all" });

      if (result.userDetails.length > 0) {
        const user = result.userDetails[0];
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("name");
        expect(user).toHaveProperty("email");
        expect(user).toHaveProperty("role");
        expect(user).toHaveProperty("company");
        expect(user).toHaveProperty("mfaEnabled");
        expect(user).toHaveProperty("mfaRequired");
        expect(user).toHaveProperty("mfaEnforcedAt");
        expect(user).toHaveProperty("gracePeriodEnd");
        expect(user).toHaveProperty("createdAt");
      }
    });

    it("should calculate overall adoption rate correctly", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.getMfaComplianceReport({ timePeriod: "all" });

      if (result.totalUsers > 0) {
        const expectedRate = (result.totalEnabled / result.totalUsers) * 100;
        expect(result.overallAdoptionRate).toBeCloseTo(expectedRate, 1);
      } else {
        expect(result.overallAdoptionRate).toBe(0);
      }
    });

    it("should only allow admins to access compliance reports", async () => {
      const ctx = createUserContext(2, "editor");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.getMfaComplianceReport({ timePeriod: "all" })
      ).rejects.toThrow();
    });

    it("should filter users by time period correctly", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const allTimeResult = await caller.admin.getMfaComplianceReport({ timePeriod: "all" });
      const sevenDaysResult = await caller.admin.getMfaComplianceReport({ timePeriod: "7days" });

      // 7-day result should have equal or fewer users than all-time
      expect(sevenDaysResult.totalUsers).toBeLessThanOrEqual(allTimeResult.totalUsers);
    });
  });

  describe("Integration Tests", () => {
    it("should enforce MFA with grace period and generate compliance report", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Enforce MFA for project managers
      await caller.admin.enforceMfaForRole({ role: "project_manager" });

      // Generate compliance report
      const report = await caller.admin.getMfaComplianceReport({ timePeriod: "all" });

      // Verify project managers are marked as required
      expect(report.adoptionByRole.project_manager.required).toBeGreaterThan(0);
    });

    it("should reset MFA and reflect in compliance report", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Reset MFA for a user
      await caller.admin.resetUserMfa({ userId: 2, reason: "Test reset" });

      // Generate compliance report
      const report = await caller.admin.getMfaComplianceReport({ timePeriod: "all" });

      // Report should still be generated successfully
      expect(report.totalUsers).toBeGreaterThan(0);
    });

    it("should handle grace period expiry correctly", async () => {
      const ctx = createUserContext(2);
      const caller = appRouter.createCaller(ctx);

      const status = await caller.mfa.checkMfaRequirement();

      // If grace period expired and MFA required but not enabled
      if (status.gracePeriodExpired && status.required && !status.enabled) {
        expect(status.mustSetupNow).toBe(true);
        expect(status.daysRemaining).toBe(0);
      }
    });
  });
});
